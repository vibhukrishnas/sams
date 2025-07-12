# 🌐 SAMS EXTERNAL SYSTEM CONNECTION GUIDE

## 🎯 CONNECT YOUR REAL SYSTEM TO SAMS

### **STEP 1: Configure Your Server Details**

In `EnhancedApp.tsx`, update these lines:

```javascript
// Replace this:
const API_BASE_URL = 'http://YOUR_SERVER_IP:PORT';

// With your actual server:
const API_BASE_URL = 'http://192.168.1.100:8080';  // Your server IP
// OR
const API_BASE_URL = 'https://yourserver.company.com';  // Your domain
```

### **STEP 2: What Type of System Do You Have?**

#### **🖥️ Windows Server with IIS/Apache**
```javascript
const API_BASE_URL = 'http://192.168.1.100:80';
// Endpoints: /api/servers, /api/alerts, /api/health
```

#### **🐧 Linux Server with REST API**
```javascript
const API_BASE_URL = 'http://192.168.1.100:3000';
// Common ports: 3000, 8080, 8000, 5000
```

#### **☁️ Cloud Server (AWS/Azure/GCP)**
```javascript
const API_BASE_URL = 'https://your-api.amazonaws.com';
// OR
const API_BASE_URL = 'https://your-app.azurewebsites.net';
```

#### **🐳 Docker Container**
```javascript
const API_BASE_URL = 'http://localhost:8080';  // If running locally
const API_BASE_URL = 'http://docker-host:8080';  // If remote
```

### **STEP 3: API Endpoints Your System Should Provide**

Create these endpoints on your server:

#### **📊 Server Information: `/api/v1/servers`**
```json
{
  "servers": [
    {
      "id": "srv-001",
      "name": "Production Web Server",
      "ip": "192.168.1.100",
      "status": "online",
      "cpu": 45,
      "memory": 67,
      "disk": 23,
      "uptime": "15 days",
      "location": "Data Center 1",
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### **🚨 Alerts Information: `/api/v1/alerts`**
```json
{
  "alerts": [
    {
      "id": "alert-001",
      "title": "High CPU Usage",
      "message": "Server CPU usage exceeded 80% threshold",
      "severity": "Critical",
      "time": "2024-01-15T10:25:00Z",
      "source": "Production Web Server",
      "acknowledged": false
    }
  ]
}
```

#### **💓 Health Check: `/api/v1/health`**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "online",
    "webserver": "online",
    "monitoring": "online"
  }
}
```

### **STEP 4: Quick Setup Options**

#### **🚀 Option A: Simple Python Flask Server**
```python
from flask import Flask, jsonify
import psutil
import datetime

app = Flask(__name__)

@app.route('/api/v1/servers')
def get_servers():
    return jsonify({
        "servers": [{
            "id": "srv-001",
            "name": "My Server",
            "ip": "192.168.1.100",
            "status": "online",
            "cpu": psutil.cpu_percent(),
            "memory": psutil.virtual_memory().percent,
            "disk": psutil.disk_usage('/').percent,
            "uptime": str(datetime.datetime.now()),
            "lastUpdated": datetime.datetime.now().isoformat()
        }]
    })

@app.route('/api/v1/alerts')
def get_alerts():
    alerts = []
    if psutil.cpu_percent() > 80:
        alerts.append({
            "id": "cpu-alert",
            "title": "High CPU Usage",
            "message": f"CPU usage is {psutil.cpu_percent()}%",
            "severity": "Warning",
            "time": datetime.datetime.now().isoformat(),
            "source": "System Monitor"
        })
    return jsonify({"alerts": alerts})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

#### **🚀 Option B: Node.js Express Server**
```javascript
const express = require('express');
const os = require('os');
const app = express();

app.get('/api/v1/servers', (req, res) => {
    res.json({
        servers: [{
            id: 'srv-001',
            name: 'My Node Server',
            ip: '192.168.1.100',
            status: 'online',
            cpu: Math.random() * 100,
            memory: (1 - os.freemem() / os.totalmem()) * 100,
            uptime: os.uptime(),
            lastUpdated: new Date().toISOString()
        }]
    });
});

app.listen(8080, '0.0.0.0', () => {
    console.log('SAMS API Server running on port 8080');
});
```

### **STEP 5: Test Your Connection**

1. **Start your server** on your chosen port
2. **Update the SAMS app** with your server details
3. **Run the SAMS app** and check the logs
4. **Look for**: "🌐 Connecting to your server..." and "✅ Successfully fetched..."

### **STEP 6: Authentication (If Needed)**

If your server requires authentication, add headers:

```javascript
headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'X-API-Key': 'YOUR_API_KEY',
    // OR Basic Auth:
    'Authorization': 'Basic ' + btoa('username:password')
}
```

### **🔧 TROUBLESHOOTING**

#### **Connection Issues:**
- Check if your server is running: `curl http://YOUR_IP:PORT/api/v1/servers`
- Verify firewall settings allow the port
- Ensure CORS is enabled if needed

#### **CORS Issues (Web/Browser):**
Add to your server:
```javascript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
```

### **📱 READY TO CONNECT!**

Once configured, your SAMS app will:
- ✅ Connect to YOUR real server
- ✅ Display YOUR actual system metrics  
- ✅ Show YOUR real alerts
- ✅ Monitor YOUR infrastructure

**Tell me your system details and I'll help you configure it perfectly!** 🚀
