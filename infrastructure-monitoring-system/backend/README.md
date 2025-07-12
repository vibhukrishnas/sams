# SAMS Backend Services - Phase 2 Implementation

## Overview

This directory contains the complete Phase 2 implementation of the SAMS (Server and Application Monitoring System) backend services. The implementation includes three core microservices with enterprise-grade features, comprehensive security, and production-ready architecture.

## Architecture

### Microservices Architecture

```
SAMS Backend
├── user-management-service/     # JWT-based authentication & RBAC
├── server-management-service/   # Server registration & health monitoring
└── alert-processing-service/    # Alert processing & correlation engine
```

### Technology Stack

- **Framework**: Spring Boot 3.2.x
- **Security**: Spring Security 6.x with JWT
- **Database**: PostgreSQL 15+ (Primary), H2 (Testing)
- **Cache**: Redis 7.x
- **Message Queue**: Apache Kafka (for alert processing)
- **Documentation**: OpenAPI 3.0 (Swagger)
- **Testing**: JUnit 5, Mockito, TestContainers
- **Build**: Maven 3.9+
- **Java**: OpenJDK 17+

## Services Overview

### 1. User Management Service (Port: 8081)

**Purpose**: Centralized authentication, authorization, and user management

**Key Features**:
- JWT-based authentication with access/refresh tokens
- Role-Based Access Control (RBAC) with fine-grained permissions
- LDAP integration support
- Password policy enforcement
- Account lockout protection
- Comprehensive audit logging
- User lifecycle management

**Endpoints**:
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/users` - List users (paginated)
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### 2. Server Management Service (Port: 8082)

**Purpose**: Server registration, health monitoring, and infrastructure management

**Key Features**:
- Server registration and auto-discovery
- Health check management with configurable intervals
- Metrics collection configuration
- Server grouping and tagging
- Environment-based organization
- Real-time status monitoring
- Agent deployment support

**Endpoints**:
- `POST /api/v1/servers` - Register server
- `GET /api/v1/servers` - List servers (paginated)
- `GET /api/v1/servers/{id}` - Get server details
- `PUT /api/v1/servers/{id}` - Update server
- `DELETE /api/v1/servers/{id}` - Remove server
- `POST /api/v1/servers/{id}/health-check` - Manual health check

### 3. Alert Processing Service (Port: 8083)

**Purpose**: Alert ingestion, processing, correlation, and lifecycle management

**Key Features**:
- Real-time alert processing and ingestion
- Rule-based correlation and deduplication
- Severity-based escalation
- Alert suppression and maintenance windows
- Notification management
- Alert lifecycle (open → acknowledged → resolved → closed)
- Comprehensive alert history

**Endpoints**:
- `POST /api/v1/alerts` - Process new alert
- `GET /api/v1/alerts` - List alerts (paginated)
- `GET /api/v1/alerts/{id}` - Get alert details
- `POST /api/v1/alerts/{id}/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/{id}/resolve` - Resolve alert
- `POST /api/v1/alerts/{id}/escalate` - Escalate alert

## Security Implementation

### Authentication & Authorization

1. **JWT Token-Based Authentication**:
   - Access tokens (15 minutes expiry)
   - Refresh tokens (7 days expiry)
   - Token blacklisting support
   - Secure token storage in Redis

2. **Role-Based Access Control (RBAC)**:
   - Predefined system roles: ADMIN, MANAGER, USER
   - Fine-grained permissions (e.g., USER_CREATE, SERVER_READ, ALERT_ACKNOWLEDGE)
   - Hierarchical role structure
   - Dynamic permission assignment

3. **Security Features**:
   - Password policy enforcement
   - Account lockout after failed attempts
   - LDAP integration support
   - Audit logging for all operations
   - CORS configuration
   - Input validation and sanitization

### Permission Matrix

| Role    | User Mgmt | Server Mgmt | Alert Mgmt | System Admin |
|---------|-----------|-------------|------------|--------------|
| ADMIN   | Full      | Full        | Full       | Full         |
| MANAGER | Read/Update| Full       | Full       | Limited      |
| USER    | Self Only | Read        | Read/Ack   | None         |

## Database Schema

### User Management
- `users` - User accounts and profiles
- `roles` - System and custom roles
- `permissions` - Fine-grained permissions
- `user_roles` - Many-to-many relationship
- `role_permissions` - Many-to-many relationship

### Server Management
- `servers` - Server registry and configuration
- `server_metrics` - Historical metrics data
- `server_tags` - Server tagging system
- `server_configuration` - Key-value configuration

### Alert Processing
- `alerts` - Alert records and lifecycle
- `alert_rules` - Processing and correlation rules
- `alert_history` - Alert state change history
- `alert_notifications` - Notification tracking

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=jdbc:postgresql://localhost:5432/sams_db
DATABASE_USERNAME=sams_user
DATABASE_PASSWORD=sams_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRATION=900
JWT_REFRESH_TOKEN_EXPIRATION=604800

# LDAP Configuration (Optional)
LDAP_ENABLED=false
LDAP_URL=ldap://localhost:389
LDAP_BASE_DN=dc=company,dc=com
```

### Application Profiles

- **dev**: Development with H2 database and debug logging
- **test**: Testing with in-memory database
- **prod**: Production with PostgreSQL and optimized settings

## Running the Services

### Prerequisites

1. **Java 17+**
2. **Maven 3.9+**
3. **PostgreSQL 15+** (for production)
4. **Redis 7.x**
5. **Docker** (optional, for containerized deployment)

### Local Development

1. **Start Infrastructure**:
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   ```

2. **Build Services**:
   ```bash
   # Build all services
   mvn clean install
   ```

3. **Run Services**:
   ```bash
   # Terminal 1: User Management Service
   cd user-management-service
   mvn spring-boot:run

   # Terminal 2: Server Management Service
   cd server-management-service
   mvn spring-boot:run

   # Terminal 3: Alert Processing Service
   cd alert-processing-service
   mvn spring-boot:run
   ```

### Docker Deployment

```bash
# Build and run all services
docker-compose up --build
```

## API Documentation

Each service provides comprehensive API documentation via Swagger UI:

- **User Management**: http://localhost:8081/swagger-ui.html
- **Server Management**: http://localhost:8082/swagger-ui.html
- **Alert Processing**: http://localhost:8083/swagger-ui.html

## Testing

### Unit Tests

```bash
# Run unit tests for all services
mvn test

# Run tests with coverage
mvn test jacoco:report
```

### Integration Tests

```bash
# Run integration tests
mvn verify -P integration-tests
```

### Test Coverage

- **Target**: >80% code coverage
- **Tools**: JUnit 5, Mockito, TestContainers
- **Reports**: Generated in `target/site/jacoco/`

## Monitoring & Observability

### Health Checks

- **Actuator endpoints**: `/actuator/health`
- **Custom health indicators** for database, Redis, external services
- **Readiness and liveness probes** for Kubernetes

### Metrics

- **Prometheus metrics**: `/actuator/prometheus`
- **Custom business metrics**: User logins, alert processing rates, server health
- **JVM metrics**: Memory, GC, thread pools

### Logging

- **Structured logging** with JSON format
- **Correlation IDs** for request tracing
- **Audit logging** for security events
- **Log levels**: Configurable per environment

## Performance Considerations

### Optimization Features

1. **Database**:
   - Connection pooling (HikariCP)
   - Query optimization with indexes
   - Pagination for large datasets

2. **Caching**:
   - Redis for session storage
   - Application-level caching for frequently accessed data

3. **Security**:
   - JWT token validation caching
   - Password hashing with BCrypt

4. **API**:
   - Response compression
   - HTTP/2 support
   - CORS optimization

## Production Deployment

### Infrastructure Requirements

- **CPU**: 2+ cores per service
- **Memory**: 2GB+ per service
- **Storage**: 50GB+ for database
- **Network**: Load balancer with SSL termination

### Deployment Checklist

- [ ] Environment-specific configuration
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Monitoring and alerting setup
- [ ] Backup strategy implemented
- [ ] Security scanning completed
- [ ] Performance testing passed

## Development Guidelines

### Code Standards

- **Java**: Follow Google Java Style Guide
- **Testing**: Minimum 80% code coverage
- **Documentation**: Comprehensive JavaDoc and API docs
- **Security**: OWASP guidelines compliance

### Git Workflow

- **Feature branches**: `feature/SAMS-XXX-description`
- **Pull requests**: Required for all changes
- **Code review**: Mandatory before merge
- **CI/CD**: Automated testing and deployment

## Support & Maintenance

### Troubleshooting

1. **Service won't start**: Check database connectivity and configuration
2. **Authentication fails**: Verify JWT secret and token expiry
3. **Performance issues**: Check database queries and connection pool
4. **Memory leaks**: Monitor JVM metrics and heap dumps

### Maintenance Tasks

- **Database cleanup**: Archive old alerts and audit logs
- **Token cleanup**: Remove expired tokens from Redis
- **Log rotation**: Configure log file rotation
- **Security updates**: Regular dependency updates

## Next Steps (Phase 3)

- **Mobile App Development**: React Native implementation
- **Advanced Analytics**: ML-based anomaly detection
- **Scalability**: Kubernetes deployment and auto-scaling
- **Integration**: Third-party monitoring tools integration

---

**Version**: 1.0.0  
**Last Updated**: 2024-12-19  
**Maintainer**: SAMS Development Team
