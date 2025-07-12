# SAMS Production Runbook
## Operational Procedures and Troubleshooting Guide

### 🚨 Emergency Contacts
- **Primary On-Call:** SAMS DevOps Team
- **Secondary On-Call:** SAMS Development Team
- **Escalation:** SAMS Technical Lead
- **Business Contact:** SAMS Product Owner

### 📊 System Overview
- **Environment:** Production
- **Infrastructure:** AWS EKS, RDS PostgreSQL, ElastiCache Redis
- **Applications:** Backend (Java Spring Boot), Frontend (React), Mobile (React Native)
- **Monitoring:** Prometheus, Grafana, AlertManager

---

## 🔥 Emergency Procedures

### Service Down (P1 - Critical)
**Symptoms:** Service unavailable, 5xx errors, health checks failing

**Immediate Actions:**
1. Check service status: `kubectl get pods -n production`
2. Check recent deployments: `kubectl rollout history deployment/sams-backend -n production`
3. Check logs: `kubectl logs -f deployment/sams-backend -n production --tail=100`
4. If recent deployment, rollback: `./scripts/rollback-deployment.sh auto production backend`

**Investigation Steps:**
```bash
# Check pod status
kubectl describe pod <pod-name> -n production

# Check resource usage
kubectl top pods -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check ingress
kubectl describe ingress sams-backend-ingress -n production
```

### High Error Rate (P2 - High)
**Symptoms:** Error rate > 5%, increased 5xx responses

**Investigation:**
```bash
# Check application logs
kubectl logs -f deployment/sams-backend -n production | grep ERROR

# Check database connectivity
kubectl exec -it deployment/sams-backend -n production -- curl localhost:8080/actuator/health/db

# Check Redis connectivity
kubectl exec -it deployment/sams-backend -n production -- curl localhost:8080/actuator/health/redis

# Check metrics
curl -s http://prometheus.sams.production.com/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])
```

### High Response Time (P3 - Medium)
**Symptoms:** Response time > 2 seconds, slow user experience

**Investigation:**
```bash
# Check resource usage
kubectl top pods -n production

# Check HPA status
kubectl get hpa -n production

# Check database performance
# Connect to RDS and check slow queries
psql -h <rds-endpoint> -U sams_admin -d sams -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Redis performance
redis-cli -h <redis-endpoint> --latency-history
```

---

## 🔧 Common Operations

### Deployment Operations

#### Deploy New Version
```bash
# Set image tag
export IMAGE_TAG="v1.2.3"

# Deploy using blue-green strategy
./scripts/blue-green-deploy.sh backend $IMAGE_TAG

# Monitor deployment
./scripts/health-check.sh production backend
```

#### Rollback Deployment
```bash
# Automatic rollback to previous version
./scripts/rollback-deployment.sh auto production backend

# Interactive rollback (choose specific version)
./scripts/rollback-deployment.sh interactive production backend

# Emergency rollback (skip health checks)
./scripts/rollback-deployment.sh emergency production backend
```

#### Scale Services
```bash
# Scale backend
kubectl scale deployment sams-backend --replicas=5 -n production

# Scale frontend
kubectl scale deployment sams-frontend --replicas=3 -n production

# Check scaling status
kubectl get hpa -n production
```

### Database Operations

#### Database Backup
```bash
# Manual backup
pg_dump -h <rds-endpoint> -U sams_admin -d sams > backup_$(date +%Y%m%d_%H%M%S).sql

# Check automated backups
aws rds describe-db-snapshots --db-instance-identifier sams-db-production
```

#### Database Restore
```bash
# Restore from backup
psql -h <rds-endpoint> -U sams_admin -d sams < backup_file.sql

# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sams-db-restored \
  --db-snapshot-identifier <snapshot-id>
```

#### Database Maintenance
```bash
# Check database connections
psql -h <rds-endpoint> -U sams_admin -d sams -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -h <rds-endpoint> -U sams_admin -d sams -c "SELECT pg_size_pretty(pg_database_size('sams'));"

# Analyze slow queries
psql -h <rds-endpoint> -U sams_admin -d sams -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Cache Operations

#### Redis Operations
```bash
# Connect to Redis
redis-cli -h <redis-endpoint> -a <auth-token>

# Check Redis info
redis-cli -h <redis-endpoint> -a <auth-token> info

# Clear cache (use with caution)
redis-cli -h <redis-endpoint> -a <auth-token> flushall

# Monitor Redis
redis-cli -h <redis-endpoint> -a <auth-token> monitor
```

### Monitoring Operations

#### Check System Health
```bash
# Overall health check
./scripts/health-check.sh production backend
./scripts/health-check.sh production frontend

# Check all pods
kubectl get pods -n production

# Check services
kubectl get services -n production

# Check ingress
kubectl get ingress -n production
```

#### Access Monitoring Dashboards
- **Grafana:** https://grafana.sams.production.com
- **Prometheus:** https://prometheus.sams.production.com
- **AlertManager:** https://alertmanager.sams.production.com

#### Key Metrics to Monitor
- **Response Time:** < 2 seconds (95th percentile)
- **Error Rate:** < 1%
- **CPU Usage:** < 70%
- **Memory Usage:** < 80%
- **Database Connections:** < 80% of max
- **Disk Usage:** < 85%

---

## 🔍 Troubleshooting Guide

### Pod Stuck in Pending State
**Possible Causes:**
- Insufficient resources
- Node selector constraints
- PVC mounting issues

**Investigation:**
```bash
kubectl describe pod <pod-name> -n production
kubectl get nodes
kubectl describe node <node-name>
```

### Pod Crash Loop
**Possible Causes:**
- Application startup failure
- Configuration issues
- Resource limits

**Investigation:**
```bash
kubectl logs <pod-name> -n production --previous
kubectl describe pod <pod-name> -n production
kubectl get events -n production
```

### Database Connection Issues
**Possible Causes:**
- Network connectivity
- Authentication failure
- Connection pool exhaustion

**Investigation:**
```bash
# Test connectivity from pod
kubectl exec -it deployment/sams-backend -n production -- nc -zv <rds-endpoint> 5432

# Check connection pool
kubectl exec -it deployment/sams-backend -n production -- curl localhost:8080/actuator/metrics/hikaricp.connections.active
```

### High Memory Usage
**Possible Causes:**
- Memory leaks
- Insufficient garbage collection
- Large dataset processing

**Investigation:**
```bash
# Check memory usage
kubectl top pods -n production

# Get heap dump (Java applications)
kubectl exec -it <pod-name> -n production -- jcmd 1 GC.run_finalization
kubectl exec -it <pod-name> -n production -- jcmd 1 VM.gc
```

---

## 📋 Maintenance Procedures

### Weekly Maintenance
- [ ] Review monitoring alerts and trends
- [ ] Check database performance metrics
- [ ] Verify backup integrity
- [ ] Update security patches (if available)
- [ ] Review resource usage and scaling

### Monthly Maintenance
- [ ] Review and update runbooks
- [ ] Conduct disaster recovery testing
- [ ] Review security configurations
- [ ] Update dependencies and base images
- [ ] Performance optimization review

### Quarterly Maintenance
- [ ] Full disaster recovery drill
- [ ] Security audit and penetration testing
- [ ] Capacity planning review
- [ ] Update monitoring and alerting rules
- [ ] Review and update documentation

---

## 📞 Escalation Procedures

### Level 1: On-Call Engineer
- Initial response and basic troubleshooting
- Follow standard runbook procedures
- Escalate if issue persists > 30 minutes

### Level 2: Senior Engineer
- Advanced troubleshooting
- Code-level investigation
- Coordinate with development team
- Escalate if issue persists > 1 hour

### Level 3: Technical Lead
- Architectural decisions
- Major incident coordination
- External vendor coordination
- Business impact assessment

### Level 4: Management
- Business continuity decisions
- Customer communication
- Resource allocation
- Post-incident review coordination

---

## 📚 Additional Resources
- [SAMS Architecture Documentation](./architecture.md)
- [SAMS API Documentation](./api-documentation.md)
- [SAMS Deployment Guide](./deployment-guide.md)
- [SAMS Security Guide](./security-guide.md)
- [SAMS Monitoring Guide](./monitoring-guide.md)
