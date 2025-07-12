#!/bin/bash

# SAMS Backup and Disaster Recovery Script
# Comprehensive backup and recovery operations for production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT="production"
BACKUP_BUCKET="sams-backups-production"
BACKUP_RETENTION_DAYS=30
DATABASE_BACKUP_RETENTION_DAYS=7

# Function to print colored output
print_header() {
    echo -e "${PURPLE}[BACKUP-DR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking backup prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        print_error "PostgreSQL client tools not installed"
        exit 1
    fi
    
    if ! command -v velero &> /dev/null; then
        print_warning "Velero not installed, cluster backups will be skipped"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to create database backup
backup_database() {
    print_info "Creating database backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="sams-db-backup-${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Get database endpoint from Terraform output or Kubernetes secret
    local db_endpoint=$(kubectl get secret sams-secrets -n production -o jsonpath='{.data.database-url}' | base64 --decode)
    local db_username=$(kubectl get secret sams-secrets -n production -o jsonpath='{.data.database-username}' | base64 --decode)
    local db_password=$(kubectl get secret sams-secrets -n production -o jsonpath='{.data.database-password}' | base64 --decode)
    
    # Create backup
    print_info "Dumping database to $backup_file..."
    PGPASSWORD="$db_password" pg_dump -h "$db_endpoint" -U "$db_username" -d sams \
        --verbose --no-owner --no-privileges --format=custom > "$backup_file"
    
    # Compress backup
    print_info "Compressing backup..."
    gzip "$backup_file"
    
    # Upload to S3
    print_info "Uploading backup to S3..."
    aws s3 cp "$compressed_file" "s3://$BACKUP_BUCKET/database/$compressed_file" \
        --storage-class STANDARD_IA \
        --metadata "environment=$ENVIRONMENT,type=database,timestamp=$timestamp"
    
    # Verify upload
    if aws s3 ls "s3://$BACKUP_BUCKET/database/$compressed_file" &> /dev/null; then
        print_success "Database backup uploaded successfully: $compressed_file"
        
        # Store backup metadata
        cat > "backup-metadata-${timestamp}.json" << EOF
{
  "backup_type": "database",
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "file_name": "$compressed_file",
  "s3_location": "s3://$BACKUP_BUCKET/database/$compressed_file",
  "database_endpoint": "$db_endpoint",
  "backup_size_bytes": $(stat -c%s "$compressed_file" 2>/dev/null || echo "0")
}
EOF
        
        aws s3 cp "backup-metadata-${timestamp}.json" "s3://$BACKUP_BUCKET/metadata/"
        
        # Clean up local files
        rm -f "$compressed_file" "backup-metadata-${timestamp}.json"
    else
        print_error "Failed to upload database backup"
        return 1
    fi
}

# Function to create cluster backup using Velero
backup_cluster() {
    print_info "Creating cluster backup with Velero..."
    
    if ! command -v velero &> /dev/null; then
        print_warning "Velero not available, skipping cluster backup"
        return 0
    fi
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="sams-cluster-backup-${timestamp}"
    
    # Create backup
    velero backup create "$backup_name" \
        --include-namespaces production,monitoring \
        --storage-location default \
        --ttl 720h0m0s \
        --wait
    
    # Check backup status
    local backup_status=$(velero backup get "$backup_name" -o json | jq -r '.status.phase')
    
    if [[ "$backup_status" == "Completed" ]]; then
        print_success "Cluster backup completed: $backup_name"
        
        # Store backup metadata
        cat > "cluster-backup-metadata-${timestamp}.json" << EOF
{
  "backup_type": "cluster",
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "backup_name": "$backup_name",
  "namespaces": ["production", "monitoring"],
  "status": "$backup_status"
}
EOF
        
        aws s3 cp "cluster-backup-metadata-${timestamp}.json" "s3://$BACKUP_BUCKET/metadata/"
        rm -f "cluster-backup-metadata-${timestamp}.json"
    else
        print_error "Cluster backup failed with status: $backup_status"
        return 1
    fi
}

# Function to backup application configurations
backup_configurations() {
    print_info "Backing up application configurations..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local config_dir="sams-configs-${timestamp}"
    
    mkdir -p "$config_dir"
    
    # Export Kubernetes configurations
    print_info "Exporting Kubernetes configurations..."
    kubectl get configmaps -n production -o yaml > "$config_dir/configmaps.yaml"
    kubectl get secrets -n production -o yaml > "$config_dir/secrets.yaml"
    kubectl get deployments -n production -o yaml > "$config_dir/deployments.yaml"
    kubectl get services -n production -o yaml > "$config_dir/services.yaml"
    kubectl get ingress -n production -o yaml > "$config_dir/ingress.yaml"
    kubectl get hpa -n production -o yaml > "$config_dir/hpa.yaml"
    kubectl get pdb -n production -o yaml > "$config_dir/pdb.yaml"
    
    # Export monitoring configurations
    kubectl get configmaps -n monitoring -o yaml > "$config_dir/monitoring-configmaps.yaml"
    kubectl get prometheusrules -n monitoring -o yaml > "$config_dir/prometheus-rules.yaml" 2>/dev/null || true
    
    # Create archive
    tar -czf "${config_dir}.tar.gz" "$config_dir"
    
    # Upload to S3
    aws s3 cp "${config_dir}.tar.gz" "s3://$BACKUP_BUCKET/configurations/${config_dir}.tar.gz" \
        --metadata "environment=$ENVIRONMENT,type=configuration,timestamp=$timestamp"
    
    # Verify upload and cleanup
    if aws s3 ls "s3://$BACKUP_BUCKET/configurations/${config_dir}.tar.gz" &> /dev/null; then
        print_success "Configuration backup uploaded: ${config_dir}.tar.gz"
        rm -rf "$config_dir" "${config_dir}.tar.gz"
    else
        print_error "Failed to upload configuration backup"
        return 1
    fi
}

# Function to backup monitoring data
backup_monitoring_data() {
    print_info "Backing up monitoring data..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    # Export Prometheus data (if accessible)
    if kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus &> /dev/null; then
        print_info "Creating Prometheus data snapshot..."
        
        # Create a snapshot via API
        local prometheus_pod=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')
        
        if [[ -n "$prometheus_pod" ]]; then
            kubectl exec -n monitoring "$prometheus_pod" -- promtool tsdb create-blocks-from snapshots /prometheus/snapshots/$(date +%Y%m%d_%H%M%S) || true
        fi
    fi
    
    # Export Grafana dashboards
    print_info "Exporting Grafana dashboards..."
    local grafana_pod=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -n "$grafana_pod" ]]; then
        kubectl exec -n monitoring "$grafana_pod" -- sqlite3 /var/lib/grafana/grafana.db .dump > "grafana-backup-${timestamp}.sql" || true
        
        if [[ -f "grafana-backup-${timestamp}.sql" ]]; then
            gzip "grafana-backup-${timestamp}.sql"
            aws s3 cp "grafana-backup-${timestamp}.sql.gz" "s3://$BACKUP_BUCKET/monitoring/" \
                --metadata "environment=$ENVIRONMENT,type=grafana,timestamp=$timestamp"
            rm -f "grafana-backup-${timestamp}.sql.gz"
            print_success "Grafana backup completed"
        fi
    fi
}

# Function to test backup integrity
test_backup_integrity() {
    print_info "Testing backup integrity..."
    
    # List recent backups
    local recent_db_backup=$(aws s3 ls "s3://$BACKUP_BUCKET/database/" --recursive | sort | tail -n 1 | awk '{print $4}')
    
    if [[ -n "$recent_db_backup" ]]; then
        print_info "Testing database backup: $recent_db_backup"
        
        # Download and test backup
        aws s3 cp "s3://$BACKUP_BUCKET/$recent_db_backup" ./test-backup.sql.gz
        
        if gunzip -t ./test-backup.sql.gz; then
            print_success "Database backup integrity test passed"
        else
            print_error "Database backup integrity test failed"
        fi
        
        rm -f ./test-backup.sql.gz
    fi
    
    # Test cluster backup
    if command -v velero &> /dev/null; then
        local recent_cluster_backup=$(velero backup get -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | .[-1].metadata.name')
        
        if [[ -n "$recent_cluster_backup" && "$recent_cluster_backup" != "null" ]]; then
            local backup_status=$(velero backup describe "$recent_cluster_backup" --details | grep "Phase:" | awk '{print $2}')
            
            if [[ "$backup_status" == "Completed" ]]; then
                print_success "Cluster backup integrity test passed"
            else
                print_error "Cluster backup integrity test failed: $backup_status"
            fi
        fi
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    print_info "Cleaning up old backups..."
    
    # Calculate cutoff date
    local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y-%m-%d)
    
    # Cleanup database backups
    print_info "Cleaning up database backups older than $cutoff_date..."
    aws s3 ls "s3://$BACKUP_BUCKET/database/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        local file_name=$(echo "$line" | awk '{print $4}')
        
        if [[ "$file_date" < "$cutoff_date" ]]; then
            print_info "Deleting old backup: $file_name"
            aws s3 rm "s3://$BACKUP_BUCKET/database/$file_name"
        fi
    done
    
    # Cleanup cluster backups
    if command -v velero &> /dev/null; then
        print_info "Cleaning up old cluster backups..."
        velero backup get -o json | jq -r --arg cutoff "$cutoff_date" '.items[] | select(.metadata.creationTimestamp < $cutoff) | .metadata.name' | while read -r backup_name; do
            if [[ -n "$backup_name" ]]; then
                print_info "Deleting old cluster backup: $backup_name"
                velero backup delete "$backup_name" --confirm
            fi
        done
    fi
    
    print_success "Backup cleanup completed"
}

# Function to restore database from backup
restore_database() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        print_error "Backup file not specified"
        return 1
    fi
    
    print_warning "⚠️  DANGER: This will restore the database from backup!"
    print_warning "⚠️  All current data will be replaced!"
    
    read -p "Are you sure you want to proceed? (type 'YES' to confirm): " confirm
    
    if [[ "$confirm" != "YES" ]]; then
        print_info "Database restore cancelled"
        return 0
    fi
    
    print_info "Restoring database from backup: $backup_file"
    
    # Download backup from S3
    aws s3 cp "s3://$BACKUP_BUCKET/database/$backup_file" ./restore-backup.sql.gz
    
    # Decompress backup
    gunzip ./restore-backup.sql.gz
    
    # Get database credentials
    local db_endpoint=$(kubectl get secret sams-secrets -n production -o jsonpath='{.data.database-url}' | base64 --decode)
    local db_username=$(kubectl get secret sams-secrets -n production -o jsonpath='{.data.database-username}' | base64 --decode)
    local db_password=$(kubectl get secret sams-secrets -n production -o jsonpath='{.data.database-password}' | base64 --decode)
    
    # Stop application to prevent data corruption
    print_info "Scaling down applications..."
    kubectl scale deployment sams-backend --replicas=0 -n production
    kubectl scale deployment sams-frontend --replicas=0 -n production
    
    # Restore database
    print_info "Restoring database..."
    PGPASSWORD="$db_password" pg_restore -h "$db_endpoint" -U "$db_username" -d sams \
        --verbose --clean --if-exists ./restore-backup.sql
    
    # Scale applications back up
    print_info "Scaling applications back up..."
    kubectl scale deployment sams-backend --replicas=3 -n production
    kubectl scale deployment sams-frontend --replicas=3 -n production
    
    # Wait for applications to be ready
    kubectl rollout status deployment/sams-backend -n production --timeout=300s
    kubectl rollout status deployment/sams-frontend -n production --timeout=300s
    
    # Cleanup
    rm -f ./restore-backup.sql
    
    print_success "Database restore completed"
}

# Function to restore cluster from backup
restore_cluster() {
    local backup_name=$1
    
    if [[ -z "$backup_name" ]]; then
        print_error "Backup name not specified"
        return 1
    fi
    
    if ! command -v velero &> /dev/null; then
        print_error "Velero not available for cluster restore"
        return 1
    fi
    
    print_warning "⚠️  DANGER: This will restore the cluster from backup!"
    print_warning "⚠️  Current cluster state will be modified!"
    
    read -p "Are you sure you want to proceed? (type 'YES' to confirm): " confirm
    
    if [[ "$confirm" != "YES" ]]; then
        print_info "Cluster restore cancelled"
        return 0
    fi
    
    print_info "Restoring cluster from backup: $backup_name"
    
    # Create restore
    local restore_name="restore-$(date +%Y%m%d_%H%M%S)"
    velero restore create "$restore_name" --from-backup "$backup_name" --wait
    
    # Check restore status
    local restore_status=$(velero restore get "$restore_name" -o json | jq -r '.status.phase')
    
    if [[ "$restore_status" == "Completed" ]]; then
        print_success "Cluster restore completed: $restore_name"
    else
        print_error "Cluster restore failed with status: $restore_status"
        return 1
    fi
}

# Function to perform disaster recovery test
disaster_recovery_test() {
    print_header "🧪 Disaster Recovery Test"
    
    print_info "This will perform a non-destructive DR test"
    
    # Test 1: Verify backup availability
    print_info "Test 1: Verifying backup availability..."
    local db_backups=$(aws s3 ls "s3://$BACKUP_BUCKET/database/" | wc -l)
    local config_backups=$(aws s3 ls "s3://$BACKUP_BUCKET/configurations/" | wc -l)
    
    print_info "Database backups available: $db_backups"
    print_info "Configuration backups available: $config_backups"
    
    if [[ $db_backups -gt 0 && $config_backups -gt 0 ]]; then
        print_success "✅ Backup availability test passed"
    else
        print_error "❌ Backup availability test failed"
    fi
    
    # Test 2: Test backup integrity
    print_info "Test 2: Testing backup integrity..."
    test_backup_integrity
    
    # Test 3: Test cluster connectivity
    print_info "Test 3: Testing cluster connectivity..."
    if kubectl cluster-info &> /dev/null; then
        print_success "✅ Cluster connectivity test passed"
    else
        print_error "❌ Cluster connectivity test failed"
    fi
    
    # Test 4: Test application health
    print_info "Test 4: Testing application health..."
    if ./scripts/health-check.sh production backend &> /dev/null; then
        print_success "✅ Application health test passed"
    else
        print_error "❌ Application health test failed"
    fi
    
    print_success "🎉 Disaster recovery test completed"
}

# Function to generate backup report
generate_backup_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Get backup statistics
    local db_backup_count=$(aws s3 ls "s3://$BACKUP_BUCKET/database/" | wc -l)
    local config_backup_count=$(aws s3 ls "s3://$BACKUP_BUCKET/configurations/" | wc -l)
    local monitoring_backup_count=$(aws s3 ls "s3://$BACKUP_BUCKET/monitoring/" | wc -l)
    
    # Get latest backup info
    local latest_db_backup=$(aws s3 ls "s3://$BACKUP_BUCKET/database/" --recursive | sort | tail -n 1 | awk '{print $4}')
    local latest_config_backup=$(aws s3 ls "s3://$BACKUP_BUCKET/configurations/" --recursive | sort | tail -n 1 | awk '{print $4}')
    
    cat > backup-report.json << EOF
{
  "backup_report": {
    "timestamp": "$timestamp",
    "environment": "$ENVIRONMENT",
    "backup_bucket": "$BACKUP_BUCKET",
    "statistics": {
      "database_backups": $db_backup_count,
      "configuration_backups": $config_backup_count,
      "monitoring_backups": $monitoring_backup_count
    },
    "latest_backups": {
      "database": "$latest_db_backup",
      "configuration": "$latest_config_backup"
    },
    "retention_policy": {
      "backup_retention_days": $BACKUP_RETENTION_DAYS,
      "database_retention_days": $DATABASE_BACKUP_RETENTION_DAYS
    },
    "backup_locations": {
      "database": "s3://$BACKUP_BUCKET/database/",
      "configurations": "s3://$BACKUP_BUCKET/configurations/",
      "monitoring": "s3://$BACKUP_BUCKET/monitoring/",
      "metadata": "s3://$BACKUP_BUCKET/metadata/"
    }
  }
}
EOF
    
    print_success "Backup report generated: backup-report.json"
}

# Main function
main() {
    local operation=${1:-"backup"}
    
    case "$operation" in
        "backup")
            print_header "🔄 SAMS Backup Operation"
            check_prerequisites
            backup_database
            backup_cluster
            backup_configurations
            backup_monitoring_data
            test_backup_integrity
            cleanup_old_backups
            generate_backup_report
            print_success "✅ Backup operation completed"
            ;;
        "restore-db")
            local backup_file=$2
            restore_database "$backup_file"
            ;;
        "restore-cluster")
            local backup_name=$2
            restore_cluster "$backup_name"
            ;;
        "test")
            disaster_recovery_test
            ;;
        "cleanup")
            check_prerequisites
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore-db|restore-cluster|test|cleanup}"
            echo "  backup           - Perform full backup"
            echo "  restore-db FILE  - Restore database from backup file"
            echo "  restore-cluster NAME - Restore cluster from backup"
            echo "  test             - Run disaster recovery test"
            echo "  cleanup          - Clean up old backups"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
