# SAMS Backend Server

🚀 **System Alert Management System (SAMS) Backend API Server**

A comprehensive Node.js Express server providing real-time system monitoring APIs with WebSocket support for live updates.

## 🔥 Features

- **Real-time WebSocket Updates** - Live server metrics and alerts
- **RESTful API Endpoints** - Complete CRUD operations
- **Server Monitoring** - CPU, Memory, Disk usage tracking
- **Alert Management** - Critical, Warning, Info alerts with acknowledgment
- **Report Generation** - PDF, Excel, CSV report creation
- **Health Metrics** - System performance analytics
- **CORS Enabled** - Ready for mobile app integration
- **Security Headers** - Helmet.js protection
- **Request Logging** - Morgan middleware
- **Compression** - Gzip response compression

## 🚀 Quick Start

### Installation

```bash
cd sams-mobile/sams-backend
npm install
```

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000`

## 📊 API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and uptime.

### Servers
```
GET /api/servers           # Get all servers
GET /api/servers/:id       # Get server by ID
```

### Alerts
```
GET /api/alerts                    # Get all alerts
GET /api/alerts?status=Active      # Filter by status
GET /api/alerts?severity=Critical  # Filter by severity
POST /api/alerts/:id/acknowledge   # Acknowledge alert
```

### System Metrics
```
GET /api/metrics
```
Returns comprehensive system statistics including:
- Server counts (online/offline)
- Alert summaries
- Performance averages

### Reports
```
GET /api/reports              # Get all reports
POST /api/reports/generate    # Generate new report
```

## 🔌 WebSocket Events

Connect to `ws://localhost:3000` for real-time updates:

### Incoming Events
- `initial_data` - Initial server and alert data
- `metrics_update` - Real-time server metrics (every 10s)
- `alert_updated` - Alert status changes
- `report_generated` - Report completion notifications

### Example WebSocket Usage
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data.type, data);
};
```

## 📱 Mobile App Integration

### Update React Native App

Replace the mock data in your mobile app with real API calls:

```javascript
// Example API integration
const API_BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator
// const API_BASE_URL = 'http://localhost:3000/api'; // iOS simulator

const fetchServers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/servers`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching servers:', error);
  }
};
```

## 🛠️ Configuration

### Environment Variables
```bash
PORT=3000                    # Server port
NODE_ENV=development         # Environment mode
```

### CORS Configuration
The server is configured to accept requests from all origins. In production, update the CORS settings in `server.js`:

```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'your-production-domain.com']
}));
```

## 📊 Sample Data

The server includes realistic sample data:
- **4 Servers** with different statuses (Online, Warning, Offline)
- **4 Alerts** with various severities
- **2 Sample Reports**
- **Real-time metric updates** every 10 seconds

## 🔧 Development

### Adding New Endpoints

1. Add route in `server.js`
2. Update this documentation
3. Test with your mobile app

### Database Integration

Currently uses in-memory storage. For production:
1. Install database driver (MongoDB, PostgreSQL, etc.)
2. Replace in-memory arrays with database queries
3. Add connection pooling and error handling

## 🚀 Deployment

### Local Network Testing
```bash
# Find your local IP
ipconfig getifaddr en0  # macOS
ipconfig               # Windows

# Update mobile app API_BASE_URL to your local IP
const API_BASE_URL = 'http://192.168.1.100:3000/api';
```

### Production Deployment
- Deploy to Heroku, AWS, or your preferred platform
- Update CORS settings
- Add environment variables
- Use a real database

## 🔥 Demo Features

Perfect for client demonstrations:
- **Live metrics** that update automatically
- **Interactive alerts** that can be acknowledged
- **Report generation** with realistic timing
- **WebSocket real-time updates**
- **Professional API responses**

## 📞 Support

For issues or questions about the SAMS backend server, check the logs and ensure all dependencies are installed correctly.
