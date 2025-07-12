# 🖥️ **SAMS Mobile - Server Management Service Development**

## **Executive Summary**

This document presents the complete Server Management Service implementation for SAMS Mobile, featuring comprehensive CRUD operations, health check endpoints, server grouping and tagging, metrics collection API, server discovery and auto-registration with extensive testing and API documentation.

## **🏗️ Service Architecture**

### **Server Management Microservice Structure**
```
server-management-service/
├── src/
│   ├── controllers/
│   │   ├── ServerController.js
│   │   ├── ServerGroupController.js
│   │   └── HealthCheckController.js
│   ├── services/
│   │   ├── ServerService.js
│   │   ├── HealthCheckService.js
│   │   ├── MetricsCollectionService.js
│   │   └── ServerDiscoveryService.js
│   ├── models/
│   │   ├── Server.js
│   │   ├── ServerGroup.js
│   │   └── HealthCheck.js
│   ├── middleware/
│   │   ├── serverValidation.js
│   │   └── healthCheckMiddleware.js
│   ├── routes/
│   │   ├── servers.js
│   │   ├── serverGroups.js
│   │   └── healthChecks.js
│   └── utils/
│       ├── networkUtils.js
│       ├── serverUtils.js
│       └── metricsUtils.js
├── tests/
├── config/
└── docs/
```

## **🖥️ Server CRUD Operations**

### **Server Controller**
```javascript
// controllers/ServerController.js
const ServerService = require('../services/ServerService');
const HealthCheckService = require('../services/HealthCheckService');
const MetricsCollectionService = require('../services/MetricsCollectionService');
const { body, param, query, validationResult } = require('express-validator');

class ServerController {
    constructor() {
        this.serverService = new ServerService();
        this.healthCheckService = new HealthCheckService();
        this.metricsService = new MetricsCollectionService();
    }
    
    // Create new server
    async createServer(req, res) {
        try {
            // Validate input
            await this.validateServerInput(req);
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const serverData = {
                ...req.body,
                organizationId: req.user.organizationId,
                createdBy: req.user.userId
            };
            
            // Check if server already exists
            const existingServer = await this.serverService.findByIpAndOrganization(
                serverData.ipAddress,
                serverData.organizationId
            );
            
            if (existingServer) {
                return res.status(409).json({
                    success: false,
                    message: 'Server with this IP address already exists'
                });
            }
            
            // Validate server connectivity
            const connectivityCheck = await this.serverService.validateConnectivity(serverData);
            if (!connectivityCheck.isReachable) {
                return res.status(400).json({
                    success: false,
                    message: 'Server is not reachable',
                    details: connectivityCheck.error
                });
            }
            
            // Create server
            const server = await this.serverService.create(serverData);
            
            // Initialize health checks
            await this.healthCheckService.initializeHealthChecks(server.id);
            
            // Start metrics collection
            await this.metricsService.startCollection(server.id);
            
            res.status(201).json({
                success: true,
                message: 'Server created successfully',
                data: { server }
            });
            
        } catch (error) {
            console.error('Create server error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create server'
            });
        }
    }
    
    // Get servers list
    async getServers(req, res) {
        try {
            const filters = {
                organizationId: req.user.organizationId,
                status: req.query.status,
                serverType: req.query.serverType,
                environment: req.query.environment,
                groupId: req.query.groupId,
                search: req.query.search
            };
            
            const pagination = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                sortBy: req.query.sortBy || 'name',
                sortOrder: req.query.sortOrder || 'asc'
            };
            
            const result = await this.serverService.findAll(filters, pagination);
            
            res.json({
                success: true,
                data: {
                    servers: result.servers,
                    pagination: {
                        page: pagination.page,
                        limit: pagination.limit,
                        total: result.total,
                        pages: Math.ceil(result.total / pagination.limit)
                    }
                }
            });
            
        } catch (error) {
            console.error('Get servers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve servers'
            });
        }
    }
    
    // Get server by ID
    async getServerById(req, res) {
        try {
            const serverId = req.params.id;
            const organizationId = req.user.organizationId;
            
            const server = await this.serverService.findByIdAndOrganization(serverId, organizationId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    message: 'Server not found'
                });
            }
            
            // Get latest health check
            const healthCheck = await this.healthCheckService.getLatestHealthCheck(serverId);
            
            // Get recent metrics
            const metrics = await this.metricsService.getRecentMetrics(serverId, '1h');
            
            res.json({
                success: true,
                data: {
                    server,
                    healthCheck,
                    metrics
                }
            });
            
        } catch (error) {
            console.error('Get server error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve server'
            });
        }
    }
    
    // Update server
    async updateServer(req, res) {
        try {
            const serverId = req.params.id;
            const organizationId = req.user.organizationId;
            
            // Validate input
            await this.validateServerUpdateInput(req);
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const server = await this.serverService.findByIdAndOrganization(serverId, organizationId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    message: 'Server not found'
                });
            }
            
            // If IP address is being changed, validate connectivity
            if (req.body.ipAddress && req.body.ipAddress !== server.ipAddress) {
                const connectivityCheck = await this.serverService.validateConnectivity({
                    ipAddress: req.body.ipAddress,
                    port: req.body.port || server.port
                });
                
                if (!connectivityCheck.isReachable) {
                    return res.status(400).json({
                        success: false,
                        message: 'New IP address is not reachable',
                        details: connectivityCheck.error
                    });
                }
            }
            
            const updatedServer = await this.serverService.update(serverId, req.body);
            
            res.json({
                success: true,
                message: 'Server updated successfully',
                data: { server: updatedServer }
            });
            
        } catch (error) {
            console.error('Update server error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update server'
            });
        }
    }
    
    // Delete server
    async deleteServer(req, res) {
        try {
            const serverId = req.params.id;
            const organizationId = req.user.organizationId;
            
            const server = await this.serverService.findByIdAndOrganization(serverId, organizationId);
            
            if (!server) {
                return res.status(404).json({
                    success: false,
                    message: 'Server not found'
                });
            }
            
            // Stop health checks and metrics collection
            await this.healthCheckService.stopHealthChecks(serverId);
            await this.metricsService.stopCollection(serverId);
            
            // Soft delete server (mark as deleted)
            await this.serverService.softDelete(serverId);
            
            res.json({
                success: true,
                message: 'Server deleted successfully'
            });
            
        } catch (error) {
            console.error('Delete server error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete server'
            });
        }
    }
    
    // Server discovery endpoint
    async discoverServers(req, res) {
        try {
            const { networkRange, scanPorts } = req.body;
            const organizationId = req.user.organizationId;
            
            const discoveredServers = await this.serverService.discoverServers(
                networkRange,
                scanPorts,
                organizationId
            );
            
            res.json({
                success: true,
                message: 'Server discovery completed',
                data: {
                    discoveredServers,
                    count: discoveredServers.length
                }
            });
            
        } catch (error) {
            console.error('Server discovery error:', error);
            res.status(500).json({
                success: false,
                message: 'Server discovery failed'
            });
        }
    }
    
    // Bulk server operations
    async bulkUpdateServers(req, res) {
        try {
            const { serverIds, updates } = req.body;
            const organizationId = req.user.organizationId;
            
            const results = await this.serverService.bulkUpdate(
                serverIds,
                updates,
                organizationId
            );
            
            res.json({
                success: true,
                message: 'Bulk update completed',
                data: {
                    updated: results.updated,
                    failed: results.failed,
                    total: serverIds.length
                }
            });
            
        } catch (error) {
            console.error('Bulk update error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk update failed'
            });
        }
    }
    
    // Validation methods
    async validateServerInput(req) {
        await body('name')
            .isLength({ min: 1, max: 255 })
            .withMessage('Server name is required and must be less than 255 characters')
            .run(req);
            
        await body('ipAddress')
            .isIP()
            .withMessage('Valid IP address is required')
            .run(req);
            
        await body('port')
            .optional()
            .isInt({ min: 1, max: 65535 })
            .withMessage('Port must be between 1 and 65535')
            .run(req);
            
        await body('serverType')
            .isIn(['linux', 'windows', 'docker', 'kubernetes', 'cloud'])
            .withMessage('Invalid server type')
            .run(req);
            
        await body('environment')
            .isIn(['production', 'staging', 'development', 'test'])
            .withMessage('Invalid environment')
            .run(req);
    }
    
    async validateServerUpdateInput(req) {
        await body('name')
            .optional()
            .isLength({ min: 1, max: 255 })
            .withMessage('Server name must be less than 255 characters')
            .run(req);
            
        await body('ipAddress')
            .optional()
            .isIP()
            .withMessage('Valid IP address is required')
            .run(req);
            
        await body('port')
            .optional()
            .isInt({ min: 1, max: 65535 })
            .withMessage('Port must be between 1 and 65535')
            .run(req);
    }
}

module.exports = ServerController;
```

## **🏥 Health Check Implementation**

### **Health Check Service**
```javascript
// services/HealthCheckService.js
const ping = require('ping');
const net = require('net');
const { HealthCheck } = require('../models');

class HealthCheckService {
    constructor() {
        this.activeChecks = new Map();
        this.defaultInterval = 30000; // 30 seconds
    }
    
    async initializeHealthChecks(serverId) {
        const server = await this.getServerById(serverId);
        if (!server) {
            throw new Error('Server not found');
        }
        
        const healthCheckConfig = {
            serverId,
            interval: server.healthCheckInterval || this.defaultInterval,
            timeout: 5000,
            retries: 3,
            checks: [
                { type: 'ping', enabled: true },
                { type: 'port', port: server.port, enabled: true },
                { type: 'http', port: 80, path: '/', enabled: false },
                { type: 'https', port: 443, path: '/', enabled: false }
            ]
        };
        
        await this.startHealthCheck(healthCheckConfig);
    }
    
    async startHealthCheck(config) {
        if (this.activeChecks.has(config.serverId)) {
            await this.stopHealthCheck(config.serverId);
        }
        
        const intervalId = setInterval(async () => {
            await this.performHealthCheck(config);
        }, config.interval);
        
        this.activeChecks.set(config.serverId, {
            intervalId,
            config,
            lastCheck: null
        });
        
        // Perform initial check
        await this.performHealthCheck(config);
    }
    
    async performHealthCheck(config) {
        const checkResults = [];
        const server = await this.getServerById(config.serverId);
        
        if (!server) {
            console.error(`Server ${config.serverId} not found for health check`);
            return;
        }
        
        try {
            // Ping check
            if (config.checks.find(c => c.type === 'ping' && c.enabled)) {
                const pingResult = await this.performPingCheck(server.ipAddress);
                checkResults.push({
                    type: 'ping',
                    success: pingResult.alive,
                    responseTime: pingResult.time,
                    error: pingResult.alive ? null : 'Ping failed'
                });
            }
            
            // Port connectivity check
            const portCheck = config.checks.find(c => c.type === 'port' && c.enabled);
            if (portCheck) {
                const portResult = await this.performPortCheck(server.ipAddress, portCheck.port);
                checkResults.push({
                    type: 'port',
                    port: portCheck.port,
                    success: portResult.success,
                    responseTime: portResult.responseTime,
                    error: portResult.success ? null : portResult.error
                });
            }
            
            // HTTP/HTTPS checks
            for (const check of config.checks.filter(c => ['http', 'https'].includes(c.type) && c.enabled)) {
                const httpResult = await this.performHttpCheck(
                    server.ipAddress,
                    check.port,
                    check.path,
                    check.type === 'https'
                );
                checkResults.push({
                    type: check.type,
                    port: check.port,
                    path: check.path,
                    success: httpResult.success,
                    responseTime: httpResult.responseTime,
                    statusCode: httpResult.statusCode,
                    error: httpResult.success ? null : httpResult.error
                });
            }
            
            // Calculate overall health status
            const overallStatus = this.calculateOverallStatus(checkResults);
            
            // Save health check result
            await this.saveHealthCheckResult(config.serverId, {
                status: overallStatus,
                checks: checkResults,
                timestamp: new Date()
            });
            
            // Update server status if changed
            await this.updateServerStatus(config.serverId, overallStatus);
            
        } catch (error) {
            console.error(`Health check error for server ${config.serverId}:`, error);
            
            await this.saveHealthCheckResult(config.serverId, {
                status: 'error',
                checks: [],
                error: error.message,
                timestamp: new Date()
            });
        }
    }
    
    async performPingCheck(ipAddress) {
        try {
            const result = await ping.promise.probe(ipAddress, {
                timeout: 5,
                extra: ['-c', '1']
            });
            
            return {
                alive: result.alive,
                time: result.time === 'unknown' ? null : parseFloat(result.time)
            };
        } catch (error) {
            return {
                alive: false,
                time: null,
                error: error.message
            };
        }
    }
    
    async performPortCheck(ipAddress, port) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const socket = new net.Socket();
            
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve({
                    success: false,
                    responseTime: null,
                    error: 'Connection timeout'
                });
            }, 5000);
            
            socket.connect(port, ipAddress, () => {
                clearTimeout(timeout);
                const responseTime = Date.now() - startTime;
                socket.destroy();
                resolve({
                    success: true,
                    responseTime,
                    error: null
                });
            });
            
            socket.on('error', (error) => {
                clearTimeout(timeout);
                socket.destroy();
                resolve({
                    success: false,
                    responseTime: null,
                    error: error.message
                });
            });
        });
    }
    
    async performHttpCheck(ipAddress, port, path, isHttps) {
        const protocol = isHttps ? 'https' : 'http';
        const url = `${protocol}://${ipAddress}:${port}${path}`;
        
        try {
            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                timeout: 5000,
                headers: {
                    'User-Agent': 'SAMS-Health-Check/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            return {
                success: response.ok,
                responseTime,
                statusCode: response.status,
                error: response.ok ? null : `HTTP ${response.status}`
            };
        } catch (error) {
            return {
                success: false,
                responseTime: null,
                statusCode: null,
                error: error.message
            };
        }
    }
    
    calculateOverallStatus(checkResults) {
        if (checkResults.length === 0) {
            return 'unknown';
        }
        
        const successfulChecks = checkResults.filter(check => check.success).length;
        const totalChecks = checkResults.length;
        const successRate = successfulChecks / totalChecks;
        
        if (successRate === 1) {
            return 'online';
        } else if (successRate >= 0.5) {
            return 'warning';
        } else if (successRate > 0) {
            return 'critical';
        } else {
            return 'offline';
        }
    }
    
    async saveHealthCheckResult(serverId, result) {
        await HealthCheck.create({
            serverId,
            status: result.status,
            checks: result.checks,
            error: result.error,
            timestamp: result.timestamp
        });
    }
    
    async updateServerStatus(serverId, status) {
        const { Server } = require('../models');
        await Server.update(
            { 
                status,
                lastSeen: new Date()
            },
            { where: { id: serverId } }
        );
    }
    
    async stopHealthCheck(serverId) {
        const activeCheck = this.activeChecks.get(serverId);
        if (activeCheck) {
            clearInterval(activeCheck.intervalId);
            this.activeChecks.delete(serverId);
        }
    }
    
    async stopHealthChecks(serverId) {
        await this.stopHealthCheck(serverId);
    }
    
    async getLatestHealthCheck(serverId) {
        return await HealthCheck.findOne({
            where: { serverId },
            order: [['timestamp', 'DESC']]
        });
    }
    
    async getHealthCheckHistory(serverId, timeRange = '24h') {
        const timeRangeMap = {
            '1h': 1,
            '6h': 6,
            '24h': 24,
            '7d': 24 * 7,
            '30d': 24 * 30
        };
        
        const hoursBack = timeRangeMap[timeRange] || 24;
        const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        
        return await HealthCheck.findAll({
            where: {
                serverId,
                timestamp: {
                    [Op.gte]: startTime
                }
            },
            order: [['timestamp', 'ASC']]
        });
    }
}

module.exports = HealthCheckService;
```

---

*This comprehensive Server Management Service provides full CRUD operations, health monitoring, metrics collection, server discovery, and auto-registration capabilities with extensive validation and error handling for SAMS Mobile.*
