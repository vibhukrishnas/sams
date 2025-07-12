const http = require('http');
const url = require('url');

// In-memory data storage
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
    lastCheck: new Date().toISOString(),
    location: 'Data Center A',
    type: 'Web Server',
    port: 80,
    ssl: true,
    responseTime: 120,
    throughput: '1.2 GB/s',
    connections: 1547,
    maxConnections: 5000,
    healthScore: 85,
    services: ['nginx', 'php-fpm', 'redis'],
    backupStatus: 'completed',
    lastBackup: new Date(Date.now() - 86400000).toISOString(),
    monitoring: {
      pingStatus: 'success',
      portCheck: 'open',
      sslExpiry: '2024-12-15',
      diskIOPS: 2400,
      networkLatency: 12
    }
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
    lastCheck: new Date().toISOString(),
    location: 'Data Center A',
    type: 'Database',
    port: 5432,
    ssl: true,
    responseTime: 45,
    throughput: '800 MB/s',
    connections: 234,
    maxConnections: 1000,
    healthScore: 72,
    services: ['postgresql', 'pgbouncer', 'redis'],
    backupStatus: 'completed',
    lastBackup: new Date(Date.now() - 3600000).toISOString(),
    monitoring: {
      pingStatus: 'success',
      portCheck: 'open',
      sslExpiry: '2024-11-20',
      diskIOPS: 4800,
      networkLatency: 8
    }
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
    lastCheck: new Date().toISOString(),
    location: 'Data Center B',
    type: 'Gateway',
    port: 443,
    ssl: true,
    responseTime: 250,
    throughput: '2.1 GB/s',
    connections: 3890,
    maxConnections: 4000,
    healthScore: 58,
    services: ['nginx', 'kong', 'consul'],
    backupStatus: 'running',
    lastBackup: new Date(Date.now() - 7200000).toISOString(),
    monitoring: {
      pingStatus: 'success',
      portCheck: 'open',
      sslExpiry: '2024-10-30',
      diskIOPS: 1200,
      networkLatency: 25
    }
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
    lastCheck: new Date().toISOString(),
    location: 'Data Center B',
    type: 'File Server',
    port: 22,
    ssl: false,
    responseTime: 0,
    throughput: '0 MB/s',
    connections: 0,
    maxConnections: 500,
    healthScore: 0,
    services: ['sshd', 'nfs', 'samba'],
    backupStatus: 'failed',
    lastBackup: new Date(Date.now() - 172800000).toISOString(),
    monitoring: {
      pingStatus: 'timeout',
      portCheck: 'closed',
      sslExpiry: 'N/A',
      diskIOPS: 0,
      networkLatency: 999
    }
  },
  {
    id: 5,
    name: 'Load Balancer',
    ip: '192.168.1.50',
    status: 'Online',
    cpu: 35,
    memory: 45,
    disk: 12,
    uptime: '45 days',
    lastCheck: new Date().toISOString(),
    location: 'Data Center A',
    type: 'Load Balancer',
    port: 80,
    ssl: true,
    responseTime: 15,
    throughput: '5.2 GB/s',
    connections: 8934,
    maxConnections: 50000,
    healthScore: 95,
    services: ['haproxy', 'keepalived', 'rsyslog'],
    backupStatus: 'completed',
    lastBackup: new Date(Date.now() - 43200000).toISOString(),
    monitoring: {
      pingStatus: 'success',
      portCheck: 'open',
      sslExpiry: '2025-03-15',
      diskIOPS: 800,
      networkLatency: 5
    }
  },
  {
    id: 6,
    name: 'Monitoring Server',
    ip: '192.168.1.60',
    status: 'Online',
    cpu: 55,
    memory: 72,
    disk: 38,
    uptime: '28 days',
    lastCheck: new Date().toISOString(),
    location: 'Data Center B',
    type: 'Monitoring',
    port: 3000,
    ssl: true,
    responseTime: 89,
    throughput: '450 MB/s',
    connections: 156,
    maxConnections: 2000,
    healthScore: 88,
    services: ['grafana', 'prometheus', 'alertmanager'],
    backupStatus: 'completed',
    lastBackup: new Date(Date.now() - 21600000).toISOString(),
    monitoring: {
      pingStatus: 'success',
      portCheck: 'open',
      sslExpiry: '2024-09-22',
      diskIOPS: 1800,
      networkLatency: 18
    }
  }
];

let alerts = [
  {
    id: 1,
    title: 'Critical: High CPU Usage',
    message: 'API Gateway CPU usage exceeded 90% for 15 minutes. Immediate attention required.',
    severity: 'Critical',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    serverId: 3,
    serverName: 'API Gateway',
    status: 'Active',
    category: 'Performance',
    priority: 'P1',
    impact: 'High',
    estimatedResolution: '30 minutes',
    affectedServices: ['API Endpoints', 'User Authentication', 'Data Processing'],
    recommendedAction: 'Scale up instance or restart services',
    escalationLevel: 2,
    assignedTo: 'DevOps Team',
    tags: ['performance', 'cpu', 'scaling']
  },
  {
    id: 2,
    title: 'Critical: Server Offline',
    message: 'File Server (192.168.1.40) is not responding to ping requests. All file operations are affected.',
    severity: 'Critical',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    serverId: 4,
    serverName: 'File Server',
    status: 'Active',
    category: 'Connectivity',
    priority: 'P1',
    impact: 'High',
    estimatedResolution: '45 minutes',
    affectedServices: ['File Storage', 'Backup Operations', 'Document Management'],
    recommendedAction: 'Check hardware status and network connectivity',
    escalationLevel: 3,
    assignedTo: 'Infrastructure Team',
    tags: ['connectivity', 'hardware', 'outage']
  },
  {
    id: 3,
    title: 'Warning: High Memory Usage',
    message: 'Database Server memory usage at 89%. Consider optimizing queries or adding more RAM.',
    severity: 'Warning',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    serverId: 2,
    serverName: 'Database Server',
    status: 'Active',
    category: 'Performance',
    priority: 'P2',
    impact: 'Medium',
    estimatedResolution: '2 hours',
    affectedServices: ['Database Queries', 'Application Performance'],
    recommendedAction: 'Optimize database queries and monitor memory usage',
    escalationLevel: 1,
    assignedTo: 'Database Team',
    tags: ['memory', 'database', 'optimization']
  },
  {
    id: 4,
    title: 'Warning: SSL Certificate Expiring',
    message: 'SSL certificate for Monitoring Server expires in 30 days. Renewal required.',
    severity: 'Warning',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    serverId: 6,
    serverName: 'Monitoring Server',
    status: 'Active',
    category: 'Security',
    priority: 'P3',
    impact: 'Low',
    estimatedResolution: '1 hour',
    affectedServices: ['HTTPS Access', 'Secure Monitoring'],
    recommendedAction: 'Renew SSL certificate before expiration',
    escalationLevel: 1,
    assignedTo: 'Security Team',
    tags: ['ssl', 'certificate', 'security']
  },
  {
    id: 5,
    title: 'Info: Backup Completed',
    message: 'Scheduled backup for Load Balancer completed successfully.',
    severity: 'Info',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    serverId: 5,
    serverName: 'Load Balancer',
    status: 'Resolved',
    category: 'Backup',
    priority: 'P4',
    impact: 'None',
    estimatedResolution: 'N/A',
    affectedServices: [],
    recommendedAction: 'No action required',
    escalationLevel: 0,
    assignedTo: 'Automated System',
    tags: ['backup', 'success', 'automated']
  },
  {
    id: 6,
    title: 'Warning: High Network Latency',
    message: 'API Gateway experiencing high network latency (25ms). Performance may be impacted.',
    severity: 'Warning',
    timestamp: new Date(Date.now() - 450000).toISOString(),
    serverId: 3,
    serverName: 'API Gateway',
    status: 'Active',
    category: 'Network',
    priority: 'P2',
    impact: 'Medium',
    estimatedResolution: '1 hour',
    affectedServices: ['API Response Times', 'User Experience'],
    recommendedAction: 'Check network configuration and routing',
    escalationLevel: 1,
    assignedTo: 'Network Team',
    tags: ['network', 'latency', 'performance']
  }
];

let reports = [
  {
    id: 1,
    name: 'System Performance Report',
    type: 'performance',
    format: 'PDF',
    status: 'completed',
    createdAt: new Date().toISOString(),
    size: '2.3 MB',
    downloadCount: 3
  },
  {
    id: 2,
    name: 'Security Audit Report',
    type: 'security',
    format: 'Excel',
    status: 'completed',
    createdAt: new Date().toISOString(),
    size: '1.8 MB',
    downloadCount: 1
  }
];

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper function to parse request body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(null, data);
    } catch (error) {
      callback(error, null);
    }
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  console.log(`${method} ${path}`);

  // Routes
  if (path === '/api/health' && method === 'GET') {
    sendJSON(res, 200, {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    });
  }
  else if (path === '/api/servers' && method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      data: servers,
      timestamp: new Date().toISOString()
    });
  }
  else if (path.startsWith('/api/servers/') && method === 'GET') {
    const serverId = parseInt(path.split('/')[3]);
    const server = servers.find(s => s.id === serverId);
    if (server) {
      sendJSON(res, 200, {
        success: true,
        data: server,
        timestamp: new Date().toISOString()
      });
    } else {
      sendJSON(res, 404, {
        success: false,
        message: 'Server not found'
      });
    }
  }
  else if (path === '/api/alerts' && method === 'GET') {
    const { status, severity } = parsedUrl.query;
    let filteredAlerts = alerts;
    
    if (status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === status);
    }
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
    }
    
    sendJSON(res, 200, {
      success: true,
      data: filteredAlerts,
      timestamp: new Date().toISOString()
    });
  }
  else if (path.startsWith('/api/alerts/') && path.endsWith('/acknowledge') && method === 'POST') {
    const alertId = parseInt(path.split('/')[3]);
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'Acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
      
      sendJSON(res, 200, {
        success: true,
        data: alert,
        message: 'Alert acknowledged successfully'
      });
    } else {
      sendJSON(res, 404, {
        success: false,
        message: 'Alert not found'
      });
    }
  }
  else if (path === '/api/metrics' && method === 'GET') {
    const onlineServers = servers.filter(s => s.status === 'Online').length;
    const totalServers = servers.length;
    const activeAlerts = alerts.filter(a => a.status === 'Active').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'Critical' && a.status === 'Active').length;
    
    const avgCpu = Math.round(servers.reduce((sum, s) => sum + s.cpu, 0) / servers.length);
    const avgMemory = Math.round(servers.reduce((sum, s) => sum + s.memory, 0) / servers.length);
    
    sendJSON(res, 200, {
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
      timestamp: new Date().toISOString()
    });
  }
  else if (path === '/api/reports' && method === 'GET') {
    sendJSON(res, 200, {
      success: true,
      data: reports,
      timestamp: new Date().toISOString()
    });
  }
  else if (path === '/api/reports/generate' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, 400, {
          success: false,
          message: 'Invalid JSON'
        });
        return;
      }

      const { name, type, format } = body;

      const newReport = {
        id: reports.length + 1,
        name: name || `${type} Report`,
        type: type || 'custom',
        format: format || 'PDF',
        status: 'generating',
        createdAt: new Date().toISOString(),
        size: '0 MB',
        downloadCount: 0
      };

      reports.push(newReport);

      // Simulate report generation
      setTimeout(() => {
        newReport.status = 'completed';
        newReport.size = `${(Math.random() * 3 + 1).toFixed(1)} MB`;
      }, 3000);

      sendJSON(res, 200, {
        success: true,
        data: newReport,
        message: 'Report generation started'
      });
    });
  }
  // ENHANCED SERVER MANAGEMENT ENDPOINTS
  else if (path.startsWith('/api/servers/') && path.endsWith('/restart') && method === 'POST') {
    const serverId = parseInt(path.split('/')[3]);
    const server = servers.find(s => s.id === serverId);
    if (server && server.status !== 'Offline') {
      server.status = 'Restarting';
      server.lastCheck = new Date().toISOString();

      // Simulate restart process
      setTimeout(() => {
        server.status = 'Online';
        server.cpu = Math.max(10, Math.min(50, Math.random() * 40 + 10));
        server.memory = Math.max(20, Math.min(70, Math.random() * 50 + 20));
        server.uptime = '0 minutes';
        server.lastCheck = new Date().toISOString();
        server.healthScore = Math.min(95, server.healthScore + 20);
      }, 5000);

      sendJSON(res, 200, {
        success: true,
        data: server,
        message: 'Server restart initiated'
      });
    } else {
      sendJSON(res, 400, {
        success: false,
        message: 'Cannot restart offline server'
      });
    }
  }
  else if (path.startsWith('/api/servers/') && path.endsWith('/backup') && method === 'POST') {
    const serverId = parseInt(path.split('/')[3]);
    const server = servers.find(s => s.id === serverId);
    if (server) {
      server.backupStatus = 'running';
      server.lastCheck = new Date().toISOString();

      // Simulate backup process
      setTimeout(() => {
        server.backupStatus = 'completed';
        server.lastBackup = new Date().toISOString();
      }, 8000);

      sendJSON(res, 200, {
        success: true,
        data: server,
        message: 'Backup process started'
      });
    } else {
      sendJSON(res, 404, {
        success: false,
        message: 'Server not found'
      });
    }
  }
  else if (path === '/api/servers/health-check' && method === 'POST') {
    // Perform health check on all servers
    servers.forEach(server => {
      if (server.status === 'Online') {
        // Simulate health check results
        const healthFactors = [
          server.cpu < 80 ? 20 : 10,
          server.memory < 85 ? 20 : 10,
          server.disk < 90 ? 20 : 10,
          server.monitoring.networkLatency < 50 ? 20 : 10,
          server.monitoring.pingStatus === 'success' ? 20 : 0
        ];
        server.healthScore = healthFactors.reduce((sum, factor) => sum + factor, 0);
        server.lastCheck = new Date().toISOString();
      }
    });

    sendJSON(res, 200, {
      success: true,
      data: servers,
      message: 'Health check completed for all servers'
    });
  }
  // ADD NEW SERVER ENDPOINT
  else if (path === '/api/servers/add' && method === 'POST') {
    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, 400, {
          success: false,
          message: 'Invalid JSON'
        });
        return;
      }

      const { name, ip, type, location, port, ssl } = body;

      // Validate required fields
      if (!name || !ip || !type || !location) {
        sendJSON(res, 400, {
          success: false,
          message: 'Missing required fields: name, ip, type, location'
        });
        return;
      }

      // Check if IP already exists
      if (servers.find(s => s.ip === ip)) {
        sendJSON(res, 400, {
          success: false,
          message: 'Server with this IP already exists'
        });
        return;
      }

      const newServer = {
        id: Math.max(...servers.map(s => s.id)) + 1,
        name,
        ip,
        type,
        location,
        port: port || (ssl ? 443 : 80),
        ssl: ssl || false,
        status: 'Online',
        cpu: Math.floor(Math.random() * 30 + 10), // 10-40%
        memory: Math.floor(Math.random() * 40 + 20), // 20-60%
        disk: Math.floor(Math.random() * 30 + 15), // 15-45%
        uptime: '0 minutes',
        lastCheck: new Date().toISOString(),
        responseTime: Math.floor(Math.random() * 100 + 20),
        throughput: `${(Math.random() * 2 + 0.5).toFixed(1)} GB/s`,
        connections: Math.floor(Math.random() * 1000 + 100),
        maxConnections: Math.floor(Math.random() * 4000 + 1000),
        healthScore: Math.floor(Math.random() * 20 + 80), // 80-100
        services: ['service1', 'service2'],
        backupStatus: 'completed',
        lastBackup: new Date().toISOString(),
        monitoring: {
          pingStatus: 'success',
          portCheck: 'open',
          sslExpiry: ssl ? '2024-12-31' : 'N/A',
          diskIOPS: Math.floor(Math.random() * 3000 + 1000),
          networkLatency: Math.floor(Math.random() * 20 + 5)
        }
      };

      servers.push(newServer);

      sendJSON(res, 201, {
        success: true,
        data: newServer,
        message: 'Server added successfully'
      });
    });
  }
  // DELETE SERVER ENDPOINT
  else if (path.startsWith('/api/servers/') && method === 'DELETE') {
    const serverId = parseInt(path.split('/')[3]);
    const serverIndex = servers.findIndex(s => s.id === serverId);

    if (serverIndex === -1) {
      sendJSON(res, 404, {
        success: false,
        message: 'Server not found'
      });
      return;
    }

    const deletedServer = servers.splice(serverIndex, 1)[0];

    // Remove related alerts
    alerts = alerts.filter(a => a.serverId !== serverId);

    sendJSON(res, 200, {
      success: true,
      data: deletedServer,
      message: 'Server deleted successfully'
    });
  }
  // UPDATE SERVER ENDPOINT
  else if (path.startsWith('/api/servers/') && method === 'PUT') {
    const serverId = parseInt(path.split('/')[3]);
    const server = servers.find(s => s.id === serverId);

    if (!server) {
      sendJSON(res, 404, {
        success: false,
        message: 'Server not found'
      });
      return;
    }

    parseBody(req, (err, body) => {
      if (err) {
        sendJSON(res, 400, {
          success: false,
          message: 'Invalid JSON'
        });
        return;
      }

      // Update server properties
      Object.keys(body).forEach(key => {
        if (key !== 'id' && server.hasOwnProperty(key)) {
          server[key] = body[key];
        }
      });

      server.lastCheck = new Date().toISOString();

      sendJSON(res, 200, {
        success: true,
        data: server,
        message: 'Server updated successfully'
      });
    });
  }
  else {
    sendJSON(res, 404, {
      success: false,
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    });
  }
});

// Simulate real-time data updates
setInterval(() => {
  // Update server metrics randomly
  servers.forEach(server => {
    if (server.status === 'Online') {
      server.cpu = Math.max(0, Math.min(100, server.cpu + (Math.random() - 0.5) * 10));
      server.memory = Math.max(0, Math.min(100, server.memory + (Math.random() - 0.5) * 5));
      server.disk = Math.max(0, Math.min(100, server.disk + (Math.random() - 0.5) * 2));
      server.lastCheck = new Date().toISOString();
    }
  });
}, 10000); // Update every 10 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 SAMS Backend Server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔌 Real-time updates every 10 seconds`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`  GET    /api/health`);
  console.log(`  GET    /api/servers`);
  console.log(`  GET    /api/servers/:id`);
  console.log(`  POST   /api/servers/add`);
  console.log(`  PUT    /api/servers/:id`);
  console.log(`  DELETE /api/servers/:id`);
  console.log(`  POST   /api/servers/:id/restart`);
  console.log(`  POST   /api/servers/:id/backup`);
  console.log(`  POST   /api/servers/health-check`);
  console.log(`  GET    /api/alerts`);
  console.log(`  POST   /api/alerts/:id/acknowledge`);
  console.log(`  GET    /api/metrics`);
  console.log(`  GET    /api/reports`);
  console.log(`  POST   /api/reports/generate`);
});
