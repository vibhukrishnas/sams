# SAMS Java Backend

## 🚀 Enterprise Spring Boot Backend

A comprehensive Java Spring Boot backend for the SAMS (Server Alert Management System) that provides real-time system monitoring, alerting, and distributed architecture capabilities.

## ✨ Features

### Core Functionality
- **Real-time System Monitoring** - CPU, memory, disk usage via OSHI library
- **Alert Management** - Intelligent threshold-based alerting
- **RESTful API** - Complete API for mobile and web clients
- **WebSocket Support** - Real-time push notifications
- **Health Checks** - Comprehensive system health monitoring

### Enterprise Features
- **Service Discovery** - Consul integration for distributed systems
- **Observability** - Prometheus metrics, distributed tracing
- **Security** - Spring Security with CORS support
- **Database Integration** - JPA with H2/PostgreSQL support
- **Async Processing** - Non-blocking operations

## 🛠️ Tech Stack

### Core Technologies
- **Java 17** - Modern Java with latest features
- **Spring Boot 3.2** - Enterprise application framework
- **Spring Security** - Authentication and authorization
- **Spring Data JPA** - Data persistence layer
- **Spring WebFlux** - Reactive programming support

### Monitoring & Observability
- **OSHI** - System and hardware information
- **Micrometer** - Application metrics
- **Prometheus** - Metrics collection
- **Spring Actuator** - Production-ready features

### Distributed Systems
- **Spring Cloud** - Microservices toolkit
- **Consul** - Service discovery and configuration
- **WebSocket** - Real-time communication

### Development Tools
- **Maven** - Build automation
- **Lombok** - Code generation
- **H2 Database** - In-memory database for development

## 🚀 Quick Start

### Prerequisites
- Java 17 or later
- Apache Maven 3.6+

### Launch the Backend

1. **Using the batch file (Windows):**
   ```batch
   launch_sams_java_backend.bat
   ```

2. **Using Maven directly:**
   ```bash
   cd sams-java-backend
   mvn spring-boot:run
   ```

3. **Using IDE:**
   - Import the Maven project
   - Run `SamsJavaBackendApplication.main()`

## 📡 API Endpoints

### Health & Status
```
GET /api/v1/health        - Service health check
GET /api/v1/status        - Overall system status
```

### System Metrics
```
GET /api/v1/metrics       - Complete system metrics
GET /api/v1/cpu          - CPU usage details
GET /api/v1/memory       - Memory usage details
GET /api/v1/disk         - Disk usage details
```

### Monitoring
```
GET /api/v1/servers      - Server information
GET /api/v1/alerts       - System alerts
```

### Development
```
GET /actuator/health     - Spring Boot health
GET /actuator/prometheus - Prometheus metrics
GET /h2-console         - Database console (dev only)
```

## 🔄 Real-time Features

### WebSocket Endpoints
- **Connect:** `ws://localhost:8080/ws`
- **Metrics Stream:** `/topic/metrics` (every 5 seconds)
- **Alerts Stream:** `/topic/alerts` (every 30 seconds)

### Usage Example (JavaScript)
```javascript
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, function() {
    stompClient.subscribe('/topic/metrics', function(metrics) {
        console.log('Real-time metrics:', JSON.parse(metrics.body));
    });
});
```

## 📊 Sample API Responses

### Health Check
```json
{
  "status": "UP",
  "service": "SAMS Java Backend",
  "version": "2.0.0",
  "timestamp": "2024-01-10T15:30:00",
  "message": "🚀 SAMS is running perfectly!"
}
```

### System Metrics
```json
{
  "cpuUsage": 45.2,
  "loadAverage1m": 1.2,
  "memoryUsagePercent": 68.5,
  "memoryTotal": 16777216000,
  "memoryUsed": 11490959360,
  "diskUsage": [
    {
      "mountPoint": "C:",
      "usagePercent": 75.3,
      "totalSpace": 500000000000
    }
  ],
  "hostname": "DESKTOP-SAMS",
  "uptime": 86400,
  "timestamp": "2024-01-10T15:30:00"
}
```

### System Alerts
```json
{
  "alerts": [
    {
      "id": "HIGH_CPU_USAGE",
      "title": "High CPU Usage",
      "message": "CPU usage is 85.2% (threshold: 80%)",
      "severity": "WARNING",
      "timestamp": "2024-01-10T15:30:00"
    }
  ],
  "count": 1,
  "status": "ALERTS_PRESENT"
}
```

## 🔧 Configuration

### Application Properties
```properties
# Server Configuration
server.port=8080

# Database (H2 for development)
spring.datasource.url=jdbc:h2:mem:samsdb
spring.h2.console.enabled=true

# Actuator Endpoints
management.endpoints.web.exposure.include=*

# Service Discovery
spring.cloud.consul.enabled=false
```

### Environment Profiles
- **dev** - Development with H2 database
- **prod** - Production with PostgreSQL
- **test** - Testing configuration

## 🌐 Integration

### Mobile App Integration
The backend is fully compatible with React Native mobile apps:

```javascript
// Mobile app configuration
const API_BASE_URL = 'http://localhost:8080/api/v1';

// Fetch system status
const response = await fetch(`${API_BASE_URL}/status`);
const status = await response.json();
```

### Web Dashboard Integration
```javascript
// Real-time dashboard connection
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onmessage = (event) => {
    const metrics = JSON.parse(event.data);
    updateDashboard(metrics);
};
```

## 🔍 Monitoring & Observability

### Prometheus Metrics
Access metrics at `/actuator/prometheus` for:
- JVM metrics
- HTTP request metrics
- Custom business metrics
- System resource metrics

### Health Checks
Comprehensive health checks include:
- Database connectivity
- External service dependencies
- System resource availability
- Custom health indicators

## 🚀 Deployment

### Local Development
```bash
mvn spring-boot:run
```

### Docker Deployment
```dockerfile
FROM openjdk:17-jre-slim
COPY target/sams-java-backend-2.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### Production Deployment
1. Package: `mvn clean package`
2. Deploy JAR to target environment
3. Configure external database
4. Enable service discovery
5. Set up monitoring and logging

## 🔒 Security

### Features
- CORS configuration for cross-origin requests
- Spring Security for endpoint protection
- Input validation and sanitization
- Secure headers configuration

### Development vs Production
- Development: Permissive CORS, H2 console enabled
- Production: Restricted CORS, database security, HTTPS

## 📈 Performance

### Optimizations
- Async processing for non-blocking operations
- Connection pooling for database access
- Caching for frequently accessed data
- Efficient system monitoring intervals

### Monitoring
- JVM metrics via Micrometer
- Custom application metrics
- Performance profiling support
- Resource usage tracking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is part of the SAMS enterprise monitoring system.

---

**🚀 Ready to monitor your systems with enterprise-grade Java backend!**
