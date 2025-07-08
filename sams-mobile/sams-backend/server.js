const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// In-memory data storage (in production, use a real database)
let servers = [
  {
    id: 1,
    name: 'Web Server 01',
    ip: '192.168.1.10',
    status: 'Online',
    cpu: 45,
    memory: 67,
    disk: 23,
    uptime: '15 days',
    lastCheck: moment().subtract(2, 'minutes').toISOString(),
    location: 'Data Center A',
    type: 'Web Server'
  },
  {
    id: 2,
    name: 'Database Server',
    ip: '192.168.1.20',
    status: 'Online',
    cpu: 78,
    memory: 89,
    disk: 45,
    uptime: '32 days',
    lastCheck: moment().subtract(1, 'minute').toISOString(),
    location: 'Data Center A',
    type: 'Database'
  },
  {
    id: 3,
    name: 'API Gateway',
    ip: '192.168.1.30',
    status: 'Warning',
    cpu: 92,
    memory: 76,
    disk: 67,
    uptime: '8 days',
    lastCheck: moment().subtract(30, 'seconds').toISOString(),
    location: 'Data Center B',
    type: 'Gateway'
  },
  {
    id: 4,
    name: 'File Server',
    ip: '192.168.1.40',
    status: 'Offline',
    cpu: 0,
    memory: 0,
    disk: 89,
    uptime: '0 days',
    lastCheck: moment().subtract(10, 'minutes').toISOString(),
    location: 'Data Center B',
    type: 'File Server'
  }
];

let alerts = [
  {
    id: 1,
    title: 'High CPU Usage',
    message: 'API Gateway CPU usage exceeded 90%',
    severity: 'Critical',
    timestamp: moment().subtract(5, 'minutes').toISOString(),
    serverId: 3,
    serverName: 'API Gateway',
    status: 'Active',
    category: 'Performance'
  },
  {
    id: 2,
    title: 'Server Offline',
    message: 'File Server is not responding',
    severity: 'Critical',
    timestamp: moment().subtract(10, 'minutes').toISOString(),
    serverId: 4,
    serverName: 'File Server',
    status: 'Active',
    category: 'Connectivity'
  },
  {
    id: 3,
    title: 'High Memory Usage',
    message: 'Database Server memory usage at 89%',
    severity: 'Warning',
    timestamp: moment().subtract(15, 'minutes').toISOString(),
    serverId: 2,
    serverName: 'Database Server',
    status: 'Active',
    category: 'Performance'
  },
  {
    id: 4,
    title: 'Disk Space Low',
    message: 'File Server disk usage at 89%',
    severity: 'Warning',
    timestamp: moment().subtract(20, 'minutes').toISOString(),
    serverId: 4,
    serverName: 'File Server',
    status: 'Resolved',
    category: 'Storage'
  }
];

let reports = [
  {
    id: 1,
    name: 'System Performance Report',
    type: 'performance',
    format: 'PDF',
    status: 'completed',
    createdAt: moment().subtract(2, 'hours').toISOString(),
    size: '2.3 MB',
    downloadCount: 3
  },
  {
    id: 2,
    name: 'Security Audit Report',
    type: 'security',
    format: 'Excel',
    status: 'completed',
    createdAt: moment().subtract(1, 'day').toISOString(),
    size: '1.8 MB',
    downloadCount: 1
  }
];

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  clients.add(ws);
  
  // Send initial data
  ws.send(JSON.stringify({
    type: 'initial_data',
    servers,
    alerts: alerts.filter(a => a.status === 'Active'),
    timestamp: moment().toISOString()
  }));

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: moment().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Get all servers
app.get('/api/servers', (req, res) => {
  res.json({
    success: true,
    data: servers,
    timestamp: moment().toISOString()
  });
});

// Get server by ID
app.get('/api/servers/:id', (req, res) => {
  const server = servers.find(s => s.id === parseInt(req.params.id));
  if (!server) {
    return res.status(404).json({
      success: false,
      message: 'Server not found'
    });
  }
  res.json({
    success: true,
    data: server,
    timestamp: moment().toISOString()
  });
});

// Get all alerts
app.get('/api/alerts', (req, res) => {
  const { status, severity } = req.query;
  let filteredAlerts = alerts;
  
  if (status) {
    filteredAlerts = filteredAlerts.filter(a => a.status === status);
  }
  
  if (severity) {
    filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
  }
  
  res.json({
    success: true,
    data: filteredAlerts,
    timestamp: moment().toISOString()
  });
});

// Acknowledge alert
app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.find(a => a.id === parseInt(req.params.id));
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }
  
  alert.status = 'Acknowledged';
  alert.acknowledgedAt = moment().toISOString();
  
  // Broadcast update
  broadcast({
    type: 'alert_updated',
    alert,
    timestamp: moment().toISOString()
  });
  
  res.json({
    success: true,
    data: alert,
    message: 'Alert acknowledged successfully'
  });
});

// Get system metrics
app.get('/api/metrics', (req, res) => {
  const onlineServers = servers.filter(s => s.status === 'Online').length;
  const totalServers = servers.length;
  const activeAlerts = alerts.filter(a => a.status === 'Active').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length;
  
  const avgCpu = Math.round(servers.reduce((sum, s) => sum + s.cpu, 0) / servers.length);
  const avgMemory = Math.round(servers.reduce((sum, s) => sum + s.memory, 0) / servers.length);
  
  res.json({
    success: true,
    data: {
      servers: {
        total: totalServers,
        online: onlineServers,
        offline: totalServers - onlineServers,
        uptime: Math.round((onlineServers / totalServers) * 100)
      },
      alerts: {
        total: alerts.length,
        active: activeAlerts,
        critical: criticalAlerts,
        warning: alerts.filter(a => a.severity === 'Warning' && a.status === 'Active').length
      },
      performance: {
        avgCpu,
        avgMemory,
        avgDisk: Math.round(servers.reduce((sum, s) => sum + s.disk, 0) / servers.length)
      }
    },
    timestamp: moment().toISOString()
  });
});

// Get reports
app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    data: reports,
    timestamp: moment().toISOString()
  });
});

// Generate report
app.post('/api/reports/generate', (req, res) => {
  const { name, type, format } = req.body;
  
  const newReport = {
    id: reports.length + 1,
    name: name || `${type} Report`,
    type: type || 'custom',
    format: format || 'PDF',
    status: 'generating',
    createdAt: moment().toISOString(),
    size: '0 MB',
    downloadCount: 0
  };
  
  reports.push(newReport);
  
  // Simulate report generation
  setTimeout(() => {
    newReport.status = 'completed';
    newReport.size = `${(Math.random() * 3 + 1).toFixed(1)} MB`;
    
    broadcast({
      type: 'report_generated',
      report: newReport,
      timestamp: moment().toISOString()
    });
  }, 3000);
  
  res.json({
    success: true,
    data: newReport,
    message: 'Report generation started'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    timestamp: moment().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    timestamp: moment().toISOString()
  });
});

// Simulate real-time data updates
setInterval(() => {
  // Update server metrics randomly
  servers.forEach(server => {
    if (server.status === 'Online') {
      server.cpu = Math.max(0, Math.min(100, server.cpu + (Math.random() - 0.5) * 10));
      server.memory = Math.max(0, Math.min(100, server.memory + (Math.random() - 0.5) * 5));
      server.disk = Math.max(0, Math.min(100, server.disk + (Math.random() - 0.5) * 2));
      server.lastCheck = moment().toISOString();
    }
  });
  
  // Broadcast updates
  broadcast({
    type: 'metrics_update',
    servers,
    timestamp: moment().toISOString()
  });
}, 10000); // Update every 10 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 SAMS Backend Server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server running for real-time updates`);
});
