# SAMS Production Deployment Guide
## Comprehensive Guide for Production Deployment and Operations

### 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Deployment](#infrastructure-deployment)
3. [Application Deployment](#application-deployment)
4. [Monitoring Setup](#monitoring-setup)
5. [Go-Live Procedures](#go-live-procedures)
6. [Post-Deployment Operations](#post-deployment-operations)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Tools
- **Terraform** >= 1.0
- **kubectl** >= 1.28
- **Helm** >= 3.10
- **AWS CLI** >= 2.0
- **Docker** >= 20.10
- **jq** >= 1.6

### Required Credentials
- **AWS Access Keys** with appropriate permissions
- **GitHub Token** for container registry access
- **Domain certificates** for SSL/TLS
- **Database passwords** for RDS instances

### Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"
export GITHUB_TOKEN="your-github-token"
export GITHUB_USERNAME="your-username"
export DB_PASSWORD="secure-database-password"
export REDIS_AUTH_TOKEN="secure-redis-token"
export SLACK_WEBHOOK_URL="your-slack-webhook"
export EMAIL_RECIPIENTS="admin@sams.com"
```

---

## 🏗️ Infrastructure Deployment

### Step 1: Initialize Terraform
```bash
cd terraform
terraform init
terraform workspace new production
terraform workspace select production
```

### Step 2: Plan Infrastructure
```bash
terraform plan -var="environment=production" -out=tfplan
```

### Step 3: Deploy Infrastructure
```bash
terraform apply tfplan
```

### Step 4: Verify Infrastructure
```bash
# Get cluster info
terraform output cluster_name
terraform output cluster_endpoint

# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name $(terraform output -raw cluster_name)

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Infrastructure Components
- **VPC** with public/private subnets across 3 AZs
- **EKS Cluster** with managed node groups
- **RDS PostgreSQL** with Multi-AZ and encryption
- **ElastiCache Redis** with clustering
- **Application Load Balancer** with SSL termination
- **S3 Buckets** for logs and backups
- **CloudWatch** for logging and monitoring
- **KMS Keys** for encryption at rest

---

## 🚀 Application Deployment

### Step 1: Deploy Monitoring Stack
```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install prometheus-operator prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=30d \
  --set grafana.adminPassword="$(openssl rand -base64 32)"

# Apply SAMS monitoring configuration
kubectl apply -f k8s/monitoring/prometheus-config.yaml
```

### Step 2: Deploy Applications
```bash
# Create production namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic sams-secrets \
  --from-literal=database-url="$(terraform output -raw rds_endpoint)" \
  --from-literal=database-username="sams_admin" \
  --from-literal=database-password="$DB_PASSWORD" \
  --from-literal=redis-url="$(terraform output -raw redis_endpoint)" \
  --from-literal=jwt-secret="$(openssl rand -base64 64)" \
  --namespace=production

# Deploy backend
export IMAGE_TAG="latest"
envsubst < k8s/production/backend-deployment.yaml | kubectl apply -f -

# Wait for backend to be ready
kubectl rollout status deployment/sams-backend -n production --timeout=600s

# Deploy frontend
envsubst < k8s/production/frontend-deployment.yaml | kubectl apply -f -

# Wait for frontend to be ready
kubectl rollout status deployment/sams-frontend -n production --timeout=600s
```

### Step 3: Configure Ingress
```bash
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install cert-manager for SSL
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@sams.production.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

---

## 📊 Monitoring Setup

### Grafana Dashboard Access
```bash
# Get Grafana admin password
kubectl get secret prometheus-operator-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward to access Grafana
kubectl port-forward svc/prometheus-operator-grafana 3000:80 -n monitoring
```

### Key Dashboards
- **SAMS Overview** - System health and performance
- **Kubernetes Cluster** - Node and pod metrics
- **Application Metrics** - Backend and frontend performance
- **Database Metrics** - RDS and Redis performance
- **Infrastructure Metrics** - AWS resource utilization

### Alert Configuration
Alerts are configured for:
- High CPU/Memory usage (>80%)
- High error rates (>5%)
- Slow response times (>2s)
- Service downtime
- Database connection issues
- Pod restart loops

---

## 🎯 Go-Live Procedures

### Pre-Go-Live Checklist
- [ ] Infrastructure deployed and verified
- [ ] Applications deployed and healthy
- [ ] Monitoring and alerting configured
- [ ] SSL certificates installed and valid
- [ ] DNS records configured
- [ ] Backup systems operational
- [ ] Runbooks and documentation updated
- [ ] Team notifications configured

### Go-Live Execution
```bash
# 1. Final health checks
./scripts/health-check.sh production backend
./scripts/health-check.sh production frontend

# 2. Start go-live monitoring
./scripts/go-live-monitoring.sh 3600 &

# 3. Execute soft launch (optional)
./scripts/soft-launch.sh backend

# 4. Start user feedback collection
./scripts/user-feedback-collector.sh 7200 &

# 5. Monitor for first 2 hours
# Watch dashboards and alerts closely
```

### Post-Go-Live Validation
```bash
# Verify all services are healthy
kubectl get pods -n production
kubectl get services -n production
kubectl get ingress -n production

# Check application endpoints
curl -f https://sams.production.com/health
curl -f https://api.sams.production.com/actuator/health

# Verify monitoring is working
curl -f https://prometheus.sams.production.com/-/healthy
```

---

## 🔄 Post-Deployment Operations

### Daily Operations
```bash
# Check system health
./scripts/health-check.sh production backend
./scripts/health-check.sh production frontend

# Review monitoring dashboards
# Check for any alerts or anomalies
# Verify backup completion
```

### Weekly Operations
```bash
# Review resource usage
kubectl top nodes
kubectl top pods -n production

# Check for security updates
# Review performance metrics
# Update documentation if needed
```

### Deployment Updates
```bash
# Deploy new version using blue-green strategy
export IMAGE_TAG="v1.2.3"
./scripts/blue-green-deploy.sh backend $IMAGE_TAG

# Monitor deployment
./scripts/health-check.sh production backend

# Rollback if needed
./scripts/rollback-deployment.sh auto production backend
```

---

## 🔧 Backup and Disaster Recovery

### Database Backups
```bash
# Manual backup
pg_dump -h $(terraform output -raw rds_endpoint) -U sams_admin -d sams > backup_$(date +%Y%m%d).sql

# Automated backups are configured with 7-day retention
aws rds describe-db-snapshots --db-instance-identifier sams-db-production
```

### Cluster Backups
```bash
# Install Velero for cluster backups
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm upgrade --install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=aws

# Create backup schedule
kubectl apply -f - <<EOF
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    - monitoring
EOF
```

### Disaster Recovery Testing
```bash
# Test database restore
# Test cluster restore from backup
# Test application deployment from scratch
# Verify monitoring and alerting
```

---

## 🔍 Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n production --previous
```

#### Database Connection Issues
```bash
# Test connectivity
kubectl exec -it deployment/sams-backend -n production -- nc -zv <rds-endpoint> 5432

# Check connection pool
kubectl exec -it deployment/sams-backend -n production -- curl localhost:8080/actuator/metrics/hikaricp.connections
```

#### High Resource Usage
```bash
# Check resource usage
kubectl top pods -n production
kubectl top nodes

# Check HPA status
kubectl get hpa -n production

# Scale if needed
kubectl scale deployment sams-backend --replicas=5 -n production
```

### Emergency Procedures
1. **Service Down**: Check recent deployments, review logs, rollback if needed
2. **High Error Rate**: Check application logs, database connectivity, scale if needed
3. **Performance Issues**: Check resource usage, database performance, cache status
4. **Security Incident**: Isolate affected components, review access logs, notify security team

---

## 📞 Support Contacts

### Escalation Matrix
- **Level 1**: DevOps Engineer (Initial response)
- **Level 2**: Senior Engineer (Advanced troubleshooting)
- **Level 3**: Technical Lead (Architectural decisions)
- **Level 4**: Management (Business decisions)

### Communication Channels
- **Slack**: #sams-production
- **Email**: sams-team@company.com
- **Phone**: Emergency hotline
- **Incident Management**: PagerDuty/Opsgenie

---

## 📚 Additional Resources
- [SAMS Production Runbook](./production-runbook.md)
- [SAMS Architecture Documentation](./architecture.md)
- [SAMS API Documentation](./api-documentation.md)
- [SAMS Security Guide](./security-guide.md)
- [SAMS Monitoring Guide](./monitoring-guide.md)
