# SAMS API Documentation
## Server and Application Monitoring System - REST API Reference

### 📋 API Overview

The SAMS API provides comprehensive endpoints for managing infrastructure monitoring, alerts, and system administration. All APIs follow RESTful principles and return JSON responses.

**Base URL**: `https://api.sams.production.com`
**API Version**: v1
**Authentication**: JWT Bearer Token

---

## 🔐 Authentication

### **POST /api/v1/auth/login**
Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "username": "admin@sams.com",
  "password": "securePassword123",
  "mfaCode": "123456"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "username": "admin@sams.com",
    "role": "ADMIN",
    "permissions": ["READ_SERVERS", "WRITE_SERVERS", "MANAGE_ALERTS"]
  }
}
```

### **POST /api/v1/auth/refresh**
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **POST /api/v1/auth/logout**
Invalidate current session and tokens.

---

## 👥 User Management

### **GET /api/v1/users**
Get list of users with pagination and filtering.

**Query Parameters:**
- `page` (int): Page number (default: 0)
- `size` (int): Page size (default: 20)
- `role` (string): Filter by role
- `status` (string): Filter by status

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "username": "user@sams.com",
      "email": "user@sams.com",
      "role": "USER",
      "status": "ACTIVE",
      "lastLogin": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalElements": 100,
  "totalPages": 5,
  "size": 20,
  "number": 0
}
```

### **POST /api/v1/users**
Create new user account.

**Request Body:**
```json
{
  "username": "newuser@sams.com",
  "email": "newuser@sams.com",
  "password": "securePassword123",
  "role": "USER",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "department": "IT Operations"
  }
}
```

### **GET /api/v1/users/{userId}**
Get user details by ID.

### **PUT /api/v1/users/{userId}**
Update user information.

### **DELETE /api/v1/users/{userId}**
Deactivate user account.

---

## 🖥️ Server Management

### **GET /api/v1/servers**
Get list of monitored servers.

**Query Parameters:**
- `page` (int): Page number
- `size` (int): Page size
- `status` (string): Filter by status (ONLINE, OFFLINE, WARNING)
- `group` (string): Filter by server group
- `tags` (string): Filter by tags (comma-separated)

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "hostname": "web-server-01",
      "ipAddress": "192.168.1.100",
      "status": "ONLINE",
      "lastSeen": "2024-01-15T10:30:00Z",
      "operatingSystem": "Ubuntu 22.04",
      "group": "web-servers",
      "tags": ["production", "web", "nginx"],
      "metrics": {
        "cpuUsage": 45.2,
        "memoryUsage": 67.8,
        "diskUsage": 23.1,
        "networkIn": 1024000,
        "networkOut": 2048000
      },
      "alerts": {
        "critical": 0,
        "warning": 2,
        "info": 5
      }
    }
  ],
  "totalElements": 50,
  "totalPages": 3,
  "size": 20,
  "number": 0
}
```

### **POST /api/v1/servers**
Register new server for monitoring.

**Request Body:**
```json
{
  "hostname": "new-server-01",
  "ipAddress": "192.168.1.200",
  "operatingSystem": "CentOS 8",
  "group": "database-servers",
  "tags": ["production", "database", "mysql"],
  "configuration": {
    "monitoringInterval": 60,
    "alertThresholds": {
      "cpuWarning": 80,
      "cpuCritical": 95,
      "memoryWarning": 85,
      "memoryCritical": 95
    }
  }
}
```

### **GET /api/v1/servers/{serverId}**
Get detailed server information.

### **PUT /api/v1/servers/{serverId}**
Update server configuration.

### **DELETE /api/v1/servers/{serverId}**
Remove server from monitoring.

### **GET /api/v1/servers/{serverId}/metrics**
Get server metrics with time range.

**Query Parameters:**
- `from` (ISO datetime): Start time
- `to` (ISO datetime): End time
- `interval` (string): Aggregation interval (1m, 5m, 1h, 1d)
- `metrics` (string): Specific metrics (comma-separated)

**Response:**
```json
{
  "serverId": "uuid",
  "timeRange": {
    "from": "2024-01-15T09:00:00Z",
    "to": "2024-01-15T10:00:00Z"
  },
  "interval": "5m",
  "metrics": {
    "cpu": [
      {"timestamp": "2024-01-15T09:00:00Z", "value": 45.2},
      {"timestamp": "2024-01-15T09:05:00Z", "value": 47.1}
    ],
    "memory": [
      {"timestamp": "2024-01-15T09:00:00Z", "value": 67.8},
      {"timestamp": "2024-01-15T09:05:00Z", "value": 68.2}
    ]
  }
}
```

---

## 🚨 Alert Management

### **GET /api/v1/alerts**
Get list of alerts with filtering and pagination.

**Query Parameters:**
- `page` (int): Page number
- `size` (int): Page size
- `severity` (string): Filter by severity (CRITICAL, WARNING, INFO)
- `status` (string): Filter by status (OPEN, ACKNOWLEDGED, RESOLVED)
- `serverId` (string): Filter by server ID
- `from` (ISO datetime): Start time filter
- `to` (ISO datetime): End time filter

**Response:**
```json
{
  "content": [
    {
      "id": "uuid",
      "title": "High CPU Usage",
      "description": "CPU usage exceeded 90% threshold",
      "severity": "CRITICAL",
      "status": "OPEN",
      "serverId": "uuid",
      "serverName": "web-server-01",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "acknowledgedBy": null,
      "resolvedBy": null,
      "tags": ["cpu", "performance"],
      "metrics": {
        "currentValue": 92.5,
        "threshold": 90.0,
        "unit": "percent"
      }
    }
  ],
  "totalElements": 25,
  "totalPages": 2,
  "size": 20,
  "number": 0
}
```

### **GET /api/v1/alerts/{alertId}**
Get detailed alert information.

### **POST /api/v1/alerts/{alertId}/acknowledge**
Acknowledge an alert.

**Request Body:**
```json
{
  "comment": "Investigating the issue",
  "acknowledgedBy": "admin@sams.com"
}
```

### **POST /api/v1/alerts/{alertId}/resolve**
Resolve an alert.

**Request Body:**
```json
{
  "comment": "Issue resolved by restarting service",
  "resolvedBy": "admin@sams.com"
}
```

### **GET /api/v1/alerts/statistics**
Get alert statistics and trends.

**Response:**
```json
{
  "summary": {
    "total": 150,
    "open": 25,
    "acknowledged": 10,
    "resolved": 115
  },
  "bySeverity": {
    "critical": 5,
    "warning": 15,
    "info": 5
  },
  "trends": {
    "last24Hours": 12,
    "last7Days": 85,
    "last30Days": 320
  }
}
```

---

## 📊 Dashboard & Analytics

### **GET /api/v1/dashboards**
Get list of available dashboards.

### **GET /api/v1/dashboards/{dashboardId}**
Get dashboard configuration and widgets.

### **POST /api/v1/dashboards**
Create custom dashboard.

### **GET /api/v1/analytics/overview**
Get system overview analytics.

**Response:**
```json
{
  "servers": {
    "total": 50,
    "online": 48,
    "offline": 2,
    "warning": 5
  },
  "alerts": {
    "open": 25,
    "critical": 5,
    "warning": 15,
    "info": 5
  },
  "performance": {
    "avgCpuUsage": 45.2,
    "avgMemoryUsage": 67.8,
    "avgResponseTime": 250
  },
  "trends": {
    "serverGrowth": 5.2,
    "alertReduction": -12.5,
    "performanceImprovement": 8.3
  }
}
```

---

## 🔧 Configuration Management

### **GET /api/v1/config/alert-rules**
Get alert rule configurations.

### **POST /api/v1/config/alert-rules**
Create new alert rule.

**Request Body:**
```json
{
  "name": "High CPU Alert",
  "description": "Alert when CPU usage exceeds threshold",
  "condition": {
    "metric": "cpu_usage",
    "operator": "GREATER_THAN",
    "threshold": 90,
    "duration": "5m"
  },
  "severity": "CRITICAL",
  "enabled": true,
  "targets": {
    "serverGroups": ["web-servers"],
    "tags": ["production"]
  },
  "notifications": {
    "email": ["admin@sams.com"],
    "slack": ["#alerts"],
    "webhook": ["https://webhook.example.com"]
  }
}
```

### **GET /api/v1/config/integrations**
Get external integration configurations.

### **POST /api/v1/config/integrations**
Configure external integration.

---

## 📱 Mobile API Endpoints

### **GET /api/v1/mobile/alerts/summary**
Get mobile-optimized alert summary.

### **POST /api/v1/mobile/push-token**
Register mobile push notification token.

**Request Body:**
```json
{
  "token": "fcm-token-or-apns-token",
  "platform": "android",
  "userId": "uuid"
}
```

### **GET /api/v1/mobile/servers/status**
Get mobile-optimized server status.

---

## 🔍 Search & Filtering

### **GET /api/v1/search**
Global search across servers, alerts, and logs.

**Query Parameters:**
- `q` (string): Search query
- `type` (string): Search type (servers, alerts, logs)
- `limit` (int): Result limit

---

## 📈 Metrics & Monitoring

### **GET /api/v1/metrics/query**
Query time-series metrics.

**Query Parameters:**
- `query` (string): PromQL-style query
- `start` (ISO datetime): Start time
- `end` (ISO datetime): End time
- `step` (string): Query resolution step

### **GET /api/v1/health**
API health check endpoint.

**Response:**
```json
{
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "components": {
    "database": "UP",
    "cache": "UP",
    "messageQueue": "UP",
    "externalServices": "UP"
  }
}
```

---

## 🚫 Error Handling

### **Error Response Format**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/v1/users"
  }
}
```

### **HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## 📝 Rate Limiting

- **Default Limit**: 1000 requests per hour per user
- **Burst Limit**: 100 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## 🔗 WebSocket API

### **Connection**
```javascript
const ws = new WebSocket('wss://api.sams.production.com/ws');
```

### **Message Format**
```json
{
  "type": "ALERT_CREATED",
  "data": {
    "alertId": "uuid",
    "severity": "CRITICAL",
    "message": "High CPU usage detected"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

For complete API documentation with interactive examples, visit: `https://api.sams.production.com/swagger-ui`
