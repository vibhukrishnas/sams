// SAMS Server Management Service
// Phase 2 Week 4: Complete Server Management with Health Checks and Auto-Discovery

const express = require('express');
const crypto = require('crypto');
const ping = require('ping');
const ssh2 = require('ssh2');
const { body, param, query, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const PORT = process.env.SERVER_SERVICE_PORT || 8087;

class ServerManagementService {
  constructor() {
    this.servers = new Map();
    this.serverGroups = new Map();
    this.healthChecks = new Map();
    this.discoveryTasks = new Map();
    this.metricsHistory = new Map();
    
    this.config = {
      healthCheck: {
        defaultInterval: 60000, // 1 minute
        timeout: 10000, // 10 seconds
        retries: 3,
        methods: ['ping', 'tcp', 'http', 'ssh']
      },
      discovery: {
        enabled: true,
        scanInterval: 300000, // 5 minutes
        networkRanges: ['192.168.1.0/24', '10.0.0.0/24'],
        ports: [22, 80, 443, 3389, 8080]
      },
      metrics: {
        retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
        aggregationInterval: 300000 // 5 minutes
      }
    };
    
    this.serverStates = {
      ONLINE: 'online',
      OFFLINE: 'offline',
      WARNING: 'warning',
      CRITICAL: 'critical',
      UNKNOWN: 'unknown',
      MAINTENANCE: 'maintenance'
    };
    
    this.initializeDefaultGroups();
    this.startHealthCheckTasks();
    this.startDiscoveryTasks();
    
    console.log('🖥️ Server Management Service initialized');
  }

  initializeDefaultGroups() {
    // Create default server groups
    const defaultGroups = [
      {
        name: 'Production',
        description: 'Production servers',
        tags: ['production', 'critical'],
        healthCheckInterval: 30000 // 30 seconds
      },
      {
        name: 'Staging',
        description: 'Staging and testing servers',
        tags: ['staging', 'testing'],
        healthCheckInterval: 60000 // 1 minute
      },
      {
        name: 'Development',
        description: 'Development servers',
        tags: ['development', 'dev'],
        healthCheckInterval: 300000 // 5 minutes
      },
      {
        name: 'Database',
        description: 'Database servers',
        tags: ['database', 'db'],
        healthCheckInterval: 30000 // 30 seconds
      },
      {
        name: 'Web Servers',
        description: 'Web and application servers',
        tags: ['web', 'app'],
        healthCheckInterval: 60000 // 1 minute
      }
    ];
    
    defaultGroups.forEach(group => {
      const groupId = crypto.randomUUID();
      this.serverGroups.set(groupId, {
        id: groupId,
        ...group,
        servers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    
    console.log(`✅ ${this.serverGroups.size} default server groups created`);
  }

  startHealthCheckTasks() {
    // Start health check processor
    setInterval(() => {
      this.processHealthChecks();
    }, 10000); // Check every 10 seconds
    
    // Start metrics aggregation
    setInterval(() => {
      this.aggregateMetrics();
    }, this.config.metrics.aggregationInterval);
    
    // Cleanup old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Every hour
    
    console.log('💓 Health check tasks started');
  }

  startDiscoveryTasks() {
    if (!this.config.discovery.enabled) return;
    
    // Start network discovery
    setInterval(() => {
      this.performNetworkDiscovery();
    }, this.config.discovery.scanInterval);
    
    console.log('🔍 Server discovery tasks started');
  }

  // =============================================================================
  // SERVER MANAGEMENT
  // =============================================================================

  addServer(serverData) {
    const serverId = crypto.randomUUID();
    const server = {
      id: serverId,
      name: serverData.name,
      hostname: serverData.hostname || serverData.ip,
      ip: serverData.ip,
      port: serverData.port || 22,
      description: serverData.description || '',
      environment: serverData.environment || 'production',
      os: serverData.os || 'unknown',
      tags: serverData.tags || [],
      groupIds: serverData.groupIds || [],
      credentials: serverData.credentials || {},
      healthCheck: {
        enabled: serverData.healthCheck?.enabled !== false,
        interval: serverData.healthCheck?.interval || this.config.healthCheck.defaultInterval,
        method: serverData.healthCheck?.method || 'ping',
        endpoint: serverData.healthCheck?.endpoint || '',
        expectedResponse: serverData.healthCheck?.expectedResponse || ''
      },
      state: this.serverStates.UNKNOWN,
      lastCheck: null,
      lastOnline: null,
      uptime: 0,
      downtime: 0,
      responseTime: null,
      metrics: {},
      alerts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      discoveredBy: serverData.discoveredBy || 'manual'
    };
    
    this.servers.set(serverId, server);
    
    // Add to groups
    if (server.groupIds.length > 0) {
      server.groupIds.forEach(groupId => {
        const group = this.serverGroups.get(groupId);
        if (group && !group.servers.includes(serverId)) {
          group.servers.push(serverId);
        }
      });
    }
    
    // Start health check
    if (server.healthCheck.enabled) {
      this.scheduleHealthCheck(serverId);
    }
    
    console.log(`🖥️ Server added: ${server.name} (${server.ip})`);
    return serverId;
  }

  updateServer(serverId, updates) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    // Update allowed fields
    const allowedFields = [
      'name', 'hostname', 'ip', 'port', 'description', 'environment',
      'os', 'tags', 'groupIds', 'credentials', 'healthCheck'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        server[field] = updates[field];
      }
    });
    
    server.updatedAt = new Date().toISOString();
    
    // Update group memberships
    if (updates.groupIds) {
      // Remove from old groups
      this.serverGroups.forEach(group => {
        const index = group.servers.indexOf(serverId);
        if (index > -1) {
          group.servers.splice(index, 1);
        }
      });
      
      // Add to new groups
      updates.groupIds.forEach(groupId => {
        const group = this.serverGroups.get(groupId);
        if (group && !group.servers.includes(serverId)) {
          group.servers.push(serverId);
        }
      });
    }
    
    console.log(`🔄 Server updated: ${server.name}`);
    return server;
  }

  deleteServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    // Remove from groups
    this.serverGroups.forEach(group => {
      const index = group.servers.indexOf(serverId);
      if (index > -1) {
        group.servers.splice(index, 1);
      }
    });
    
    // Remove health check
    this.healthChecks.delete(serverId);
    
    // Remove metrics history
    this.metricsHistory.delete(serverId);
    
    // Remove server
    this.servers.delete(serverId);
    
    console.log(`🗑️ Server deleted: ${server.name}`);
  }

  // =============================================================================
  // HEALTH CHECKS
  // =============================================================================

  scheduleHealthCheck(serverId) {
    const server = this.servers.get(serverId);
    if (!server || !server.healthCheck.enabled) return;
    
    const checkData = {
      serverId,
      nextCheck: new Date(Date.now() + server.healthCheck.interval),
      interval: server.healthCheck.interval,
      method: server.healthCheck.method,
      retries: 0,
      lastResult: null
    };
    
    this.healthChecks.set(serverId, checkData);
  }

  async processHealthChecks() {
    const now = new Date();
    
    for (const [serverId, checkData] of this.healthChecks.entries()) {
      if (now >= checkData.nextCheck) {
        await this.performHealthCheck(serverId);
      }
    }
  }

  async performHealthCheck(serverId) {
    const server = this.servers.get(serverId);
    const checkData = this.healthChecks.get(serverId);
    
    if (!server || !checkData) return;
    
    const startTime = Date.now();
    let result = {
      success: false,
      responseTime: null,
      error: null,
      timestamp: new Date().toISOString()
    };
    
    try {
      switch (checkData.method) {
        case 'ping':
          result = await this.pingCheck(server);
          break;
        case 'tcp':
          result = await this.tcpCheck(server);
          break;
        case 'http':
          result = await this.httpCheck(server);
          break;
        case 'ssh':
          result = await this.sshCheck(server);
          break;
        default:
          result = await this.pingCheck(server);
      }
      
      result.responseTime = Date.now() - startTime;
      
    } catch (error) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
    }
    
    // Update server state
    this.updateServerState(server, result);
    
    // Schedule next check
    checkData.nextCheck = new Date(Date.now() + checkData.interval);
    checkData.lastResult = result;
    checkData.retries = result.success ? 0 : checkData.retries + 1;
    
    // Store metrics
    this.storeHealthMetrics(serverId, result);
  }

  async pingCheck(server) {
    const result = await ping.promise.probe(server.ip, {
      timeout: this.config.healthCheck.timeout / 1000
    });
    
    return {
      success: result.alive,
      responseTime: result.time,
      error: result.alive ? null : 'Ping failed',
      timestamp: new Date().toISOString()
    };
  }

  async tcpCheck(server) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      const startTime = Date.now();
      
      socket.setTimeout(this.config.healthCheck.timeout);
      
      socket.connect(server.port, server.ip, () => {
        socket.destroy();
        resolve({
          success: true,
          responseTime: Date.now() - startTime,
          error: null,
          timestamp: new Date().toISOString()
        });
      });
      
      socket.on('error', (error) => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: 'Connection timeout',
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async httpCheck(server) {
    const axios = require('axios');
    const url = server.healthCheck.endpoint || `http://${server.ip}:${server.port || 80}`;
    
    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: this.config.healthCheck.timeout,
        validateStatus: () => true // Don't throw on HTTP errors
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 400;
      
      // Check expected response if configured
      if (success && server.healthCheck.expectedResponse) {
        const bodyMatch = response.data.includes(server.healthCheck.expectedResponse);
        if (!bodyMatch) {
          return {
            success: false,
            responseTime,
            error: 'Expected response not found',
            timestamp: new Date().toISOString()
          };
        }
      }
      
      return {
        success,
        responseTime,
        error: success ? null : `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        responseTime: null,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sshCheck(server) {
    return new Promise((resolve) => {
      const conn = new ssh2.Client();
      const startTime = Date.now();
      
      conn.on('ready', () => {
        conn.end();
        resolve({
          success: true,
          responseTime: Date.now() - startTime,
          error: null,
          timestamp: new Date().toISOString()
        });
      });
      
      conn.on('error', (error) => {
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
      
      const credentials = server.credentials || {};
      conn.connect({
        host: server.ip,
        port: server.port || 22,
        username: credentials.username || 'root',
        password: credentials.password,
        privateKey: credentials.privateKey,
        readyTimeout: this.config.healthCheck.timeout
      });
    });
  }

  updateServerState(server, healthResult) {
    const previousState = server.state;
    
    if (healthResult.success) {
      server.state = this.serverStates.ONLINE;
      server.lastOnline = new Date().toISOString();
      server.responseTime = healthResult.responseTime;
      
      // Update uptime
      if (previousState === this.serverStates.OFFLINE) {
        console.log(`✅ Server back online: ${server.name}`);
      }
    } else {
      const checkData = this.healthChecks.get(server.id);
      
      if (checkData && checkData.retries >= this.config.healthCheck.retries) {
        server.state = this.serverStates.OFFLINE;
        
        if (previousState !== this.serverStates.OFFLINE) {
          console.log(`❌ Server went offline: ${server.name}`);
        }
      } else {
        server.state = this.serverStates.WARNING;
      }
    }
    
    server.lastCheck = healthResult.timestamp;
    server.updatedAt = new Date().toISOString();
  }

  storeHealthMetrics(serverId, result) {
    if (!this.metricsHistory.has(serverId)) {
      this.metricsHistory.set(serverId, []);
    }
    
    const metrics = this.metricsHistory.get(serverId);
    metrics.push({
      timestamp: result.timestamp,
      success: result.success,
      responseTime: result.responseTime,
      error: result.error
    });
    
    // Keep only recent metrics
    const cutoffTime = new Date(Date.now() - this.config.metrics.retentionPeriod);
    const filteredMetrics = metrics.filter(m => new Date(m.timestamp) > cutoffTime);
    this.metricsHistory.set(serverId, filteredMetrics);
  }

  // =============================================================================
  // NETWORK DISCOVERY
  // =============================================================================

  async performNetworkDiscovery() {
    console.log('🔍 Starting network discovery...');
    
    for (const range of this.config.discovery.networkRanges) {
      await this.scanNetworkRange(range);
    }
  }

  async scanNetworkRange(range) {
    // Simple implementation - in production, use proper network scanning
    const [network, cidr] = range.split('/');
    const [a, b, c, d] = network.split('.').map(Number);
    
    // Scan first 10 IPs for demo
    for (let i = 1; i <= 10; i++) {
      const ip = `${a}.${b}.${c}.${i}`;
      await this.scanHost(ip);
    }
  }

  async scanHost(ip) {
    try {
      // Check if server already exists
      const existingServer = Array.from(this.servers.values()).find(s => s.ip === ip);
      if (existingServer) return;
      
      // Ping check
      const pingResult = await ping.promise.probe(ip, { timeout: 2 });
      if (!pingResult.alive) return;
      
      // Port scan
      const openPorts = [];
      for (const port of this.config.discovery.ports) {
        const isOpen = await this.checkPort(ip, port);
        if (isOpen) {
          openPorts.push(port);
        }
      }
      
      if (openPorts.length > 0) {
        // Auto-register discovered server
        const serverData = {
          name: `Discovered-${ip}`,
          ip: ip,
          port: openPorts[0],
          description: `Auto-discovered server with open ports: ${openPorts.join(', ')}`,
          environment: 'unknown',
          tags: ['auto-discovered'],
          discoveredBy: 'network-scan'
        };
        
        this.addServer(serverData);
        console.log(`🔍 Discovered server: ${ip} (ports: ${openPorts.join(', ')})`);
      }
      
    } catch (error) {
      // Ignore discovery errors
    }
  }

  async checkPort(ip, port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(1000);
      
      socket.connect(port, ip, () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  // =============================================================================
  // METRICS AND STATISTICS
  // =============================================================================

  aggregateMetrics() {
    // Aggregate server metrics for reporting
    for (const [serverId, server] of this.servers.entries()) {
      const metrics = this.metricsHistory.get(serverId) || [];
      
      if (metrics.length === 0) continue;
      
      const recentMetrics = metrics.filter(m => 
        new Date(m.timestamp) > new Date(Date.now() - this.config.metrics.aggregationInterval)
      );
      
      if (recentMetrics.length === 0) continue;
      
      // Calculate aggregated metrics
      const successRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;
      const avgResponseTime = recentMetrics
        .filter(m => m.responseTime !== null)
        .reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
      
      server.metrics = {
        ...server.metrics,
        successRate: Math.round(successRate * 100),
        averageResponseTime: Math.round(avgResponseTime),
        lastAggregation: new Date().toISOString()
      };
    }
  }

  cleanupOldMetrics() {
    const cutoffTime = new Date(Date.now() - this.config.metrics.retentionPeriod);
    let cleaned = 0;
    
    for (const [serverId, metrics] of this.metricsHistory.entries()) {
      const filteredMetrics = metrics.filter(m => new Date(m.timestamp) > cutoffTime);
      
      if (filteredMetrics.length !== metrics.length) {
        this.metricsHistory.set(serverId, filteredMetrics);
        cleaned += metrics.length - filteredMetrics.length;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old health metrics`);
    }
  }

  getServerStats() {
    const stats = {
      total: this.servers.size,
      byState: {},
      byEnvironment: {},
      groups: this.serverGroups.size,
      healthChecksActive: this.healthChecks.size,
      discoveredServers: Array.from(this.servers.values()).filter(s => s.discoveredBy === 'network-scan').length
    };
    
    // Count by state
    for (const state of Object.values(this.serverStates)) {
      stats.byState[state] = 0;
    }
    
    for (const server of this.servers.values()) {
      stats.byState[server.state]++;
      stats.byEnvironment[server.environment] = (stats.byEnvironment[server.environment] || 0) + 1;
    }
    
    return stats;
  }
}

// Initialize the server management service
const serverService = new ServerManagementService();

// =============================================================================
// REST API ENDPOINTS
// =============================================================================

// Get all servers
app.get('/api/v1/servers', [
  query('environment').optional().isIn(['production', 'staging', 'development', 'unknown']),
  query('state').optional().isIn(Object.values(serverService.serverStates)),
  query('groupId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { environment, state, groupId, page = 1, limit = 20 } = req.query;

    let servers = Array.from(serverService.servers.values());

    // Apply filters
    if (environment) {
      servers = servers.filter(s => s.environment === environment);
    }

    if (state) {
      servers = servers.filter(s => s.state === state);
    }

    if (groupId) {
      servers = servers.filter(s => s.groupIds.includes(groupId));
    }

    // Sort by name
    servers.sort((a, b) => a.name.localeCompare(b.name));

    // Pagination
    const total = servers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedServers = servers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        servers: paginatedServers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve servers',
      code: 'SERVERS_GET_ERROR'
    });
  }
});

// Get server by ID
app.get('/api/v1/servers/:id', [
  param('id').isUUID()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const server = serverService.servers.get(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
        code: 'SERVER_NOT_FOUND'
      });
    }

    // Include health metrics
    const healthMetrics = serverService.metricsHistory.get(id) || [];
    const recentMetrics = healthMetrics.slice(-100); // Last 100 checks

    res.json({
      success: true,
      data: {
        ...server,
        healthMetrics: recentMetrics
      }
    });

  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server',
      code: 'SERVER_GET_ERROR'
    });
  }
});

// Create server
app.post('/api/v1/servers', [
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('ip').isIP(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('environment').optional().isIn(['production', 'staging', 'development', 'unknown']),
  body('os').optional().isLength({ max: 50 }).trim(),
  body('tags').optional().isArray(),
  body('groupIds').optional().isArray()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check for duplicate
    const existingServer = Array.from(serverService.servers.values()).find(
      s => s.name === req.body.name || (s.ip === req.body.ip && s.port === (req.body.port || 22))
    );

    if (existingServer) {
      return res.status(409).json({
        success: false,
        error: 'Server already exists',
        code: 'SERVER_EXISTS'
      });
    }

    const serverId = serverService.addServer(req.body);
    const server = serverService.servers.get(serverId);

    res.status(201).json({
      success: true,
      message: 'Server created successfully',
      data: server
    });

  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create server',
      code: 'SERVER_CREATE_ERROR'
    });
  }
});

// Update server
app.put('/api/v1/servers/:id', [
  param('id').isUUID(),
  body('name').optional().isLength({ min: 1, max: 100 }).trim(),
  body('ip').optional().isIP(),
  body('port').optional().isInt({ min: 1, max: 65535 }),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('environment').optional().isIn(['production', 'staging', 'development', 'unknown']),
  body('os').optional().isLength({ max: 50 }).trim(),
  body('tags').optional().isArray(),
  body('groupIds').optional().isArray()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const server = serverService.updateServer(id, req.body);

    res.json({
      success: true,
      message: 'Server updated successfully',
      data: server
    });

  } catch (error) {
    console.error('Update server error:', error);

    if (error.message === 'Server not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
        code: 'SERVER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update server',
      code: 'SERVER_UPDATE_ERROR'
    });
  }
});

// Delete server
app.delete('/api/v1/servers/:id', [
  param('id').isUUID()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    serverService.deleteServer(id);

    res.json({
      success: true,
      message: 'Server deleted successfully'
    });

  } catch (error) {
    console.error('Delete server error:', error);

    if (error.message === 'Server not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
        code: 'SERVER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete server',
      code: 'SERVER_DELETE_ERROR'
    });
  }
});

// Trigger health check
app.post('/api/v1/servers/:id/health-check', [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const server = serverService.servers.get(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found',
        code: 'SERVER_NOT_FOUND'
      });
    }

    // Perform immediate health check
    await serverService.performHealthCheck(id);

    const updatedServer = serverService.servers.get(id);

    res.json({
      success: true,
      message: 'Health check completed',
      data: {
        serverId: id,
        state: updatedServer.state,
        lastCheck: updatedServer.lastCheck,
        responseTime: updatedServer.responseTime
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

// Get server groups
app.get('/api/v1/server-groups', (req, res) => {
  try {
    const groups = Array.from(serverService.serverGroups.values());

    res.json({
      success: true,
      data: {
        groups,
        total: groups.length
      }
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server groups',
      code: 'GROUPS_GET_ERROR'
    });
  }
});

// Get server statistics
app.get('/api/v1/servers/stats', (req, res) => {
  try {
    const stats = serverService.getServerStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server statistics',
      code: 'STATS_GET_ERROR'
    });
  }
});

// Trigger network discovery
app.post('/api/v1/servers/discover', (req, res) => {
  try {
    // Trigger immediate discovery
    serverService.performNetworkDiscovery();

    res.json({
      success: true,
      message: 'Network discovery started',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start network discovery',
      code: 'DISCOVERY_ERROR'
    });
  }
});

// Health check endpoint
app.get('/api/v1/servers/health', (req, res) => {
  res.json({
    success: true,
    service: 'SAMS Server Management Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: serverService.getServerStats()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️ SAMS Server Management Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/servers/health`);
  console.log(`🔍 Network discovery: ${serverService.config.discovery.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`💓 Health checks: ${serverService.healthChecks.size} active`);
});

// Export for use in other modules
module.exports = {
  serverService,
  ServerManagementService
};
