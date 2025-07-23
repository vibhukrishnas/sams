# 🚀 SAMS API Documentation Hub

## Interactive API Explorer & Documentation

Welcome to the SAMS (Security and Monitoring System) API documentation hub - your comprehensive resource for integrating with and extending the SAMS enterprise monitoring platform.

### 📋 Overview

The SAMS API provides programmatic access to all monitoring, alerting, security, and management features of the SAMS platform. This documentation includes:

- **Interactive API Explorer** with real-time testing capabilities
- **Comprehensive endpoint documentation** with examples
- **Authentication and security guidelines**
- **Custom threshold configuration guides**
- **Voice command integration tutorials**
- **Mobile app integration resources**

### 🌟 Features

#### ✅ **Interactive Documentation**
- **Real-time API testing** directly in the browser
- **Advanced search functionality** - find endpoints by name, method, or description
- **Live examples** with sample requests/responses
- **Copy-paste ready code snippets**

#### ✅ **Comprehensive Coverage**
- **Authentication & Security** - JWT tokens, MFA, logout handling
- **Server Management** - Add, monitor, and manage servers
- **Alert System** - Custom thresholds, notifications, escalation
- **Metrics Collection** - Real-time performance data
- **Voice Commands** - Voice integration settings and commands
- **User Management** - Roles, permissions, profiles

#### ✅ **Developer-Friendly**
- **OpenAPI 3.0 specification** for code generation
- **Multiple environment support** (dev, staging, production)
- **Request/response validation**
- **Error code documentation**

### 🚀 Quick Start

#### 1. **Access Interactive Documentation**
Open the interactive API explorer:
```bash
# Serve locally
cd /path/to/sams/docs
python -m http.server 8000
# Visit http://localhost:8000/api-interactive-documentation.html

# Or use with web server
nginx -s reload  # If integrated with existing web server
```

#### 2. **Authentication Setup**
```javascript
// Get authentication token
const response = await fetch('/v2/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your-username',
    password: 'your-password'
  })
});

const { data } = await response.json();
const token = data.token;

// Use token for subsequent requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

#### 3. **Basic Operations**
```javascript
// List all servers
const servers = await fetch('/v2/servers', { headers });

// Get server metrics
const metrics = await fetch('/v2/metrics/server-name', { headers });

// Create custom alert threshold
const threshold = await fetch('/v2/alerts/thresholds', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    metric_name: 'cpu_usage',
    warning_threshold: 75.0,
    critical_threshold: 90.0,
    comparison_operator: '>',
    enabled: true
  })
});
```

### 🔍 Search & Discovery

The interactive documentation includes powerful search capabilities:

#### **Search Features:**
- **Instant Search** - Real-time filtering as you type
- **Smart Ranking** - Results ranked by relevance
- **Multi-field Search** - Search across endpoints, descriptions, methods
- **Quick Navigation** - Click results to jump directly to endpoint

#### **Search Examples:**
```
"login"           → Find authentication endpoints
"server metrics"  → Discover monitoring endpoints  
"POST alerts"     → Find alert creation endpoints
"threshold"       → Locate threshold configuration
"voice commands"  → Find voice integration APIs
```

### 📚 API Categories

#### 🔐 **Authentication & Security**
- **JWT Authentication** - Secure token-based auth
- **Multi-Factor Authentication** - Enhanced security
- **Token Revocation** - Secure logout and session management
- **Permission Management** - Role-based access control

#### 🖥️ **Server Management**
- **Server Registration** - Add servers to monitoring
- **Status Monitoring** - Real-time server health
- **Bulk Operations** - Manage multiple servers efficiently
- **Performance Tracking** - Historical data and trends

#### 🚨 **Alert Management**
- **Custom Thresholds** - Configurable alert conditions
- **Notification Channels** - Email, Slack, webhook integration
- **Alert Correlation** - Intelligent alert grouping
- **Escalation Policies** - Automated escalation workflows

#### 📊 **Metrics & Analytics**
- **Real-time Metrics** - Live performance data
- **Historical Data** - Trend analysis and reporting
- **Custom Dashboards** - Personalized monitoring views
- **Data Export** - CSV, JSON, API integration

#### 🎙️ **Voice Integration**
- **Voice Commands** - Hands-free monitoring control
- **Command Configuration** - Custom voice workflows
- **Settings Management** - Voice recognition tuning
- **Mobile Integration** - Cross-platform voice support

### 🛠️ Integration Examples

#### **Python Integration**
```python
import requests
import json

class SAMSClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.session = requests.Session()
        self.authenticate(username, password)
    
    def authenticate(self, username, password):
        response = self.session.post(f'{self.base_url}/auth/login', 
                                   json={'username': username, 'password': password})
        token = response.json()['data']['token']
        self.session.headers.update({'Authorization': f'Bearer {token}'})
    
    def get_servers(self, status=None):
        params = {'status': status} if status else {}
        return self.session.get(f'{self.base_url}/servers', params=params).json()
    
    def create_threshold(self, metric_name, warning, critical):
        return self.session.post(f'{self.base_url}/alerts/thresholds', json={
            'metric_name': metric_name,
            'warning_threshold': warning,
            'critical_threshold': critical,
            'comparison_operator': '>'
        }).json()

# Usage
client = SAMSClient('https://api.sams.enterprise.com/v2', 'admin', 'password')
servers = client.get_servers(status='online')
```

#### **JavaScript/Node.js Integration**
```javascript
class SAMSApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.token = null;
    }
    
    async authenticate(username, password) {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        this.token = data.data.token;
    }
    
    async request(endpoint, options = {}) {
        return fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }
    
    async getServerMetrics(serverName) {
        const response = await this.request(`/metrics/${serverName}`);
        return response.json();
    }
    
    async createCustomThreshold(config) {
        const response = await this.request('/alerts/thresholds', {
            method: 'POST',
            body: JSON.stringify(config)
        });
        return response.json();
    }
}
```

### 🔧 Configuration

#### **Environment Variables**
```bash
# API Configuration
SAMS_API_BASE_URL=https://api.sams.enterprise.com/v2
SAMS_API_TIMEOUT=30000
SAMS_API_RETRY_ATTEMPTS=3

# Authentication
SAMS_JWT_SECRET=your-jwt-secret
SAMS_JWT_EXPIRATION=24h
SAMS_MFA_ENABLED=true

# Rate Limiting
SAMS_RATE_LIMIT_PER_HOUR=1000
SAMS_RATE_LIMIT_BURST=50
```

#### **Custom Threshold Configuration**
```json
{
  "cpu_usage": {
    "warning_threshold": 75.0,
    "critical_threshold": 90.0,
    "comparison_operator": ">",
    "hysteresis": 0.1,
    "minimum_duration_seconds": 60
  },
  "memory_usage": {
    "warning_threshold": 80.0,
    "critical_threshold": 95.0,
    "comparison_operator": ">",
    "title_template": "High Memory Usage on {server_name}",
    "message_template": "Memory usage is {value}% (threshold: {threshold}%)"
  },
  "response_time": {
    "warning_threshold": 1000.0,
    "critical_threshold": 5000.0,
    "comparison_operator": ">",
    "tags": ["performance", "latency"]
  }
}
```

### 📱 Mobile Integration

#### **React Native Voice Commands**
```typescript
// Voice command integration
import VoiceCommandService from './services/voice/VoiceCommandService';

// Configure voice settings
const voiceSettings = {
  enabled: true,
  continuous_listening: true,
  confirmation_enabled: false,
  language: 'en-US',
  confidence_threshold: 0.8
};

await VoiceCommandService.updateSettings(voiceSettings);

// Available voice commands
const commands = VoiceCommandService.getAvailableCommands();
```

#### **Dark Mode Theme Integration**
```typescript
// Theme context usage
import { useTheme } from './services/theme/ThemeContext';

const MyComponent = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Switch value={isDark} onValueChange={toggleTheme} />
    </View>
  );
};
```

### 🚀 Performance & Scaling

#### **API Rate Limits**
| Endpoint Category | Rate Limit | Burst Limit |
|------------------|------------|-------------|
| Authentication   | 10/min     | 20          |
| Server Management| 100/min    | 50          |
| Metrics         | 1000/min   | 200         |
| Alerts          | 50/min     | 30          |

#### **Best Practices**
- **Use connection pooling** for high-volume integrations
- **Implement exponential backoff** for retry logic
- **Cache frequently accessed data** with appropriate TTL
- **Use bulk operations** when available
- **Monitor API usage** with built-in metrics

### 📖 Additional Resources

#### **Links**
- [OpenAPI Specification](./openapi.json) - Machine-readable API spec
- [Postman Collection](./sams-api.postman_collection.json) - Ready-to-use Postman tests
- [SDK Downloads](./sdks/) - Official SDKs for multiple languages
- [Change Log](./CHANGELOG.md) - API version history
- [Support](mailto:api-support@sams.enterprise.com) - Technical support

#### **Community**
- [GitHub Issues](https://github.com/sams/api/issues) - Bug reports and feature requests
- [Developer Forum](https://forum.sams.enterprise.com/api) - Community discussions
- [Discord Channel](https://discord.gg/sams-dev) - Real-time developer chat

### 📋 Recent Enhancements

#### **v2.0 Features** ✨
- ✅ **JWT Token Revocation** - Enhanced security with logout support
- ✅ **Custom Alert Thresholds** - Configurable monitoring conditions  
- ✅ **Mobile Dark Mode** - Theme switching in React Native apps
- ✅ **K8s Resource Optimization** - Enhanced container resource management
- ✅ **Interactive API Documentation** - This searchable documentation hub

---

### 💡 **Need Help?**

- 📧 **Email Support**: [api-support@sams.enterprise.com](mailto:api-support@sams.enterprise.com)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/sams/api/issues)
- 💬 **Community**: [Developer Forum](https://forum.sams.enterprise.com)
- 📚 **Documentation**: [docs.sams.enterprise.com](https://docs.sams.enterprise.com)

**Happy Coding! 🚀**
