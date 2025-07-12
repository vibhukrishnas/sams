# 🌍 Environment Configuration Documentation

## Overview

This document describes the configuration for development, staging, and production environments for the Infrastructure Monitoring System.

## 🛠️ Development Environment

### **Purpose**
- Local development and testing
- Feature development and debugging
- Integration testing with external services

### **Configuration**
```yaml
# Development Environment Specifications
environment: development
domain: localhost
ssl_enabled: false

# Database Configuration
databases:
  postgresql:
    host: localhost
    port: 5432
    database: infrastructure_monitoring
    username: monitoring_user
    password: dev_password_123
    pool_size: 10
    
  influxdb:
    url: http://localhost:8086
    token: dev-token-12345678901234567890
    org: monitoring-org
    bucket: metrics
    
  redis:
    host: localhost
    port: 6379
    password: dev_password_123
    database: 0

# Message Queue
kafka:
  bootstrap_servers: localhost:9092
  topics:
    metrics: monitoring.metrics
    alerts: monitoring.alerts
    notifications: monitoring.notifications

# External Services
monitoring:
  prometheus:
    url: http://localhost:9090
  grafana:
    url: http://localhost:3000
    username: admin
    password: dev_password_123

# Security
security:
  jwt_secret: dev-jwt-secret-key-change-in-production
  jwt_expiration: 86400  # 24 hours
  bcrypt_rounds: 10

# Logging
logging:
  level: DEBUG
  format: console
  file_enabled: false
```

### **Services**
- **Backend API**: http://localhost:8090
- **Frontend**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)
- **Kafka UI**: http://localhost:8081
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000

### **Setup Commands**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Initialize databases
./scripts/init-dev-db.sh

# Start backend services
cd backend && mvn spring-boot:run

# Start frontend
cd frontend && npm start

# Start mobile app
cd mobile-app && npm start
```

## 🧪 Staging Environment

### **Purpose**
- Pre-production testing
- User acceptance testing
- Performance testing
- Integration testing with production-like data

### **Configuration**
```yaml
# Staging Environment Specifications
environment: staging
domain: staging.monitoring.company.com
ssl_enabled: true

# Database Configuration
databases:
  postgresql:
    host: staging-postgres.internal
    port: 5432
    database: infrastructure_monitoring_staging
    username: monitoring_staging
    password: ${POSTGRES_PASSWORD}
    pool_size: 20
    ssl_mode: require
    
  influxdb:
    url: https://staging-influxdb.internal:8086
    token: ${INFLUXDB_TOKEN}
    org: monitoring-org-staging
    bucket: metrics-staging
    
  redis:
    host: staging-redis.internal
    port: 6379
    password: ${REDIS_PASSWORD}
    database: 0
    ssl_enabled: true

# Message Queue
kafka:
  bootstrap_servers: staging-kafka.internal:9092
  security_protocol: SASL_SSL
  sasl_mechanism: PLAIN
  sasl_username: ${KAFKA_USERNAME}
  sasl_password: ${KAFKA_PASSWORD}

# External Services
monitoring:
  prometheus:
    url: https://staging-prometheus.internal:9090
  grafana:
    url: https://staging-grafana.internal:3000

# Security
security:
  jwt_secret: ${JWT_SECRET}
  jwt_expiration: 3600  # 1 hour
  bcrypt_rounds: 12

# Logging
logging:
  level: INFO
  format: json
  file_enabled: true
  file_path: /var/log/monitoring/app.log

# Performance
performance:
  connection_timeout: 30s
  read_timeout: 60s
  max_connections: 100
```

### **Infrastructure**
- **Kubernetes Cluster**: staging-k8s-cluster
- **Namespace**: monitoring-staging
- **Ingress**: NGINX Ingress Controller
- **TLS**: Let's Encrypt certificates
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

### **Deployment**
```bash
# Deploy to staging
kubectl apply -f k8s/staging/

# Update configuration
kubectl create configmap monitoring-config --from-file=config/staging/

# Check deployment status
kubectl get pods -n monitoring-staging
```

## 🚀 Production Environment

### **Purpose**
- Live production system
- Customer-facing services
- High availability and performance
- Security and compliance

### **Configuration**
```yaml
# Production Environment Specifications
environment: production
domain: monitoring.company.com
ssl_enabled: true

# Database Configuration (High Availability)
databases:
  postgresql:
    primary_host: prod-postgres-primary.internal
    replica_hosts:
      - prod-postgres-replica-1.internal
      - prod-postgres-replica-2.internal
    port: 5432
    database: infrastructure_monitoring
    username: monitoring_prod
    password: ${POSTGRES_PASSWORD}
    pool_size: 50
    ssl_mode: require
    connection_timeout: 30s
    
  influxdb:
    cluster_urls:
      - https://prod-influxdb-1.internal:8086
      - https://prod-influxdb-2.internal:8086
      - https://prod-influxdb-3.internal:8086
    token: ${INFLUXDB_TOKEN}
    org: monitoring-org-prod
    bucket: metrics-prod
    
  redis:
    cluster_nodes:
      - prod-redis-1.internal:6379
      - prod-redis-2.internal:6379
      - prod-redis-3.internal:6379
    password: ${REDIS_PASSWORD}
    ssl_enabled: true

# Message Queue (Cluster)
kafka:
  bootstrap_servers:
    - prod-kafka-1.internal:9092
    - prod-kafka-2.internal:9092
    - prod-kafka-3.internal:9092
  security_protocol: SASL_SSL
  sasl_mechanism: PLAIN
  sasl_username: ${KAFKA_USERNAME}
  sasl_password: ${KAFKA_PASSWORD}
  replication_factor: 3

# Security (Enhanced)
security:
  jwt_secret: ${JWT_SECRET}
  jwt_expiration: 1800  # 30 minutes
  jwt_refresh_expiration: 604800  # 7 days
  bcrypt_rounds: 14
  rate_limiting:
    enabled: true
    requests_per_minute: 100
  cors:
    allowed_origins:
      - https://monitoring.company.com
      - https://app.company.com

# Logging (Centralized)
logging:
  level: WARN
  format: json
  file_enabled: true
  file_path: /var/log/monitoring/app.log
  centralized:
    enabled: true
    endpoint: https://logs.company.com
    api_key: ${LOGGING_API_KEY}

# Performance (Optimized)
performance:
  connection_timeout: 10s
  read_timeout: 30s
  max_connections: 200
  cache_ttl: 300s
  
# Monitoring and Alerting
monitoring:
  prometheus:
    url: https://prometheus.company.com
  grafana:
    url: https://grafana.company.com
  alertmanager:
    url: https://alerts.company.com
  
# Backup and Recovery
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention_days: 30
  storage:
    type: s3
    bucket: monitoring-backups-prod
    region: us-east-1
```

### **Infrastructure**
- **Kubernetes Cluster**: Multi-zone production cluster
- **Namespace**: monitoring-production
- **Load Balancer**: AWS ALB / Azure Load Balancer
- **CDN**: CloudFlare / AWS CloudFront
- **TLS**: Extended Validation certificates
- **Monitoring**: Full observability stack
- **Backup**: Automated daily backups

### **Deployment**
```bash
# Production deployment (with approval)
kubectl apply -f k8s/production/

# Rolling update
kubectl rollout restart deployment/monitoring-api -n monitoring-production

# Health check
kubectl get pods -n monitoring-production
curl -f https://monitoring.company.com/health
```

## 🔧 Configuration Management

### **Environment Variables**
```bash
# Development
export SPRING_PROFILES_ACTIVE=development
export DATABASE_URL=jdbc:postgresql://localhost:5432/infrastructure_monitoring
export REDIS_URL=redis://localhost:6379

# Staging
export SPRING_PROFILES_ACTIVE=staging
export DATABASE_URL=${STAGING_DATABASE_URL}
export REDIS_URL=${STAGING_REDIS_URL}

# Production
export SPRING_PROFILES_ACTIVE=production
export DATABASE_URL=${PROD_DATABASE_URL}
export REDIS_URL=${PROD_REDIS_URL}
```

### **Secrets Management**
```yaml
# Kubernetes Secrets
apiVersion: v1
kind: Secret
metadata:
  name: monitoring-secrets
  namespace: monitoring-production
type: Opaque
data:
  database-password: <base64-encoded>
  jwt-secret: <base64-encoded>
  influxdb-token: <base64-encoded>
  redis-password: <base64-encoded>
```

### **Configuration Validation**
```bash
# Validate configuration
./scripts/validate-config.sh staging
./scripts/validate-config.sh production

# Test database connections
./scripts/test-connections.sh

# Verify SSL certificates
./scripts/check-ssl.sh
```

## 📊 Monitoring and Alerting

### **Health Checks**
- **Application Health**: `/actuator/health`
- **Database Health**: Connection pool status
- **Cache Health**: Redis connectivity
- **Message Queue Health**: Kafka connectivity

### **Key Metrics**
- **Response Time**: API response times
- **Throughput**: Requests per second
- **Error Rate**: 4xx/5xx error percentage
- **Resource Usage**: CPU, memory, disk
- **Database Performance**: Query times, connections

### **Alerts**
- **Critical**: Service down, database unavailable
- **Warning**: High response time, high error rate
- **Info**: Deployment completed, configuration changed

## 🔒 Security Configuration

### **Network Security**
- **Firewall Rules**: Restrict access to internal services
- **VPN Access**: Required for staging/production access
- **SSL/TLS**: End-to-end encryption
- **API Gateway**: Rate limiting and authentication

### **Data Security**
- **Encryption at Rest**: Database and file storage
- **Encryption in Transit**: All network communication
- **Access Control**: Role-based permissions
- **Audit Logging**: All administrative actions

### **Compliance**
- **SOC 2**: Security controls and monitoring
- **GDPR**: Data privacy and retention
- **HIPAA**: Healthcare data protection (if applicable)
- **PCI DSS**: Payment data security (if applicable)

---

*This environment configuration provides a comprehensive setup for all deployment stages, ensuring consistency, security, and scalability across the infrastructure monitoring platform.*
