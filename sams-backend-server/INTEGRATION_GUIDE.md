# 🚀 SAMS Mobile App + Backend Integration Guide

## 🎯 Quick Demo Setup

### 1. **Backend Server is Running**
✅ **Server Status:** Running on `http://localhost:3000`
✅ **API Endpoints:** All working and tested
✅ **Real-time Updates:** Server metrics update every 10 seconds
✅ **CORS Enabled:** Ready for mobile app integration

### 2. **Test the APIs**

Open your browser and test these endpoints:

```
🔍 Health Check:
http://localhost:3000/api/health

📊 Server List:
http://localhost:3000/api/servers

🚨 Alerts:
http://localhost:3000/api/alerts

📈 System Metrics:
http://localhost:3000/api/metrics

📋 Reports:
http://localhost:3000/api/reports
```

## 📱 Mobile App Integration

### **Step 1: Update API Base URL**

In your React Native app (`sams-mobile/TestApp/App.tsx`), add this at the top:

```javascript
// For Android Emulator (10.0.2.2 maps to localhost)
const API_BASE_URL = 'http://10.0.2.2:3000/api';

// For iOS Simulator (use localhost)
// const API_BASE_URL = 'http://localhost:3000/api';

// For Physical Device (use your computer's IP)
// const API_BASE_URL = 'http://192.168.1.100:3000/api';
```

### **Step 2: Replace Mock Data with Real API Calls**

Add these functions to your App.tsx:

```javascript
// Fetch real server data
const fetchServersFromAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/servers`);
    const data = await response.json();
    if (data.success) {
      setServers(data.data);
    }
  } catch (error) {
    console.error('Error fetching servers:', error);
  }
};

// Fetch real alerts
const fetchAlertsFromAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    const data = await response.json();
    if (data.success) {
      setAlerts(data.data);
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }
};

// Fetch system metrics
const fetchMetricsFromAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics`);
    const data = await response.json();
    if (data.success) {
      // Update your health scores with real data
      console.log('Real metrics:', data.data);
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
  }
};

// Acknowledge alert
const acknowledgeAlertAPI = async (alertId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (data.success) {
      // Update local alert status
      setAlerts(alerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'Acknowledged' }
          : alert
      ));
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
  }
};
```

### **Step 3: Add useEffect to Load Real Data**

```javascript
useEffect(() => {
  // Load real data when app starts
  fetchServersFromAPI();
  fetchAlertsFromAPI();
  fetchMetricsFromAPI();

  // Set up polling for real-time updates
  const interval = setInterval(() => {
    fetchServersFromAPI();
    fetchAlertsFromAPI();
    fetchMetricsFromAPI();
  }, 15000); // Update every 15 seconds

  return () => clearInterval(interval);
}, []);
```

## 🔥 Demo Features You Can Show

### **1. Real-time Server Monitoring**
- Server metrics update automatically every 10 seconds
- CPU, Memory, Disk usage changes dynamically
- Server status (Online/Warning/Offline) reflects real data

### **2. Live Alert System**
- Real alerts from the backend
- Acknowledge alerts and see status change
- Filter by severity (Critical/Warning)

### **3. System Metrics Dashboard**
- Real performance averages
- Server uptime calculations
- Alert summaries

### **4. Report Generation**
- Generate reports via API
- Track report status (generating → completed)
- Real file sizes and timestamps

## 🎯 Client Demo Script

**"Let me show you our real-time SAMS system in action..."**

1. **"Here's our live server dashboard"** - Show server list with real metrics
2. **"Watch the metrics update automatically"** - Wait 10 seconds, show changes
3. **"These are real alerts from our monitoring system"** - Show alerts list
4. **"I can acknowledge this critical alert"** - Tap acknowledge, show status change
5. **"Here are our system performance metrics"** - Show metrics dashboard
6. **"Let me generate a real report"** - Create custom report, show generation process

## 🛠️ Advanced Integration (Optional)

### **Add WebSocket for Real-time Updates**

```javascript
// WebSocket connection for instant updates
const connectWebSocket = () => {
  const ws = new WebSocket('ws://10.0.2.2:3000');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'metrics_update':
        setServers(data.servers);
        break;
      case 'alert_updated':
        // Update specific alert
        break;
      case 'report_generated':
        // Update report status
        break;
    }
  };
  
  return ws;
};
```

## 🚀 Production Deployment

### **Backend Deployment Options:**
- **Heroku:** `git push heroku main`
- **AWS EC2:** Deploy with PM2
- **DigitalOcean:** Docker container
- **Vercel:** Serverless functions

### **Mobile App Deployment:**
- Update API_BASE_URL to production server
- Build APK for Android testing
- Deploy to Google Play Store / Apple App Store

## 📞 Support

**Backend Server Status:** ✅ Running on port 3000
**API Endpoints:** ✅ All functional
**CORS:** ✅ Enabled for mobile apps
**Real-time Updates:** ✅ Every 10 seconds

**Ready for client demos and testing!** 🎉
