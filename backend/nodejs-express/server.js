const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const si = require('systeminformation');
const axios = require('axios');
const ping = require('ping');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('dotenv').config();

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ 
            filename: process.env.LOG_FILE || './logs/sams.log',
            level: 'info'
        })
    ]
});

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE || './logs/sams.log');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()),
    credentials: true
}));
app.use(express.json());

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// In-memory storage for alerts
let alerts = [];

/**
 * System Monitoring Service
 */
class SystemMonitoringService {
    async getSystemInfo() {
        try {
            const [cpu, mem, osInfo, system, processes, networkInterfaces, disksInfo] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.osInfo(),
                si.system(),
                si.processes(),
                si.networkInterfaces(),
                si.fsSize()
            ]);

            const cpuLoad = await si.currentLoad();
            const networkStats = await si.networkStats();

            return {
                hostname: osInfo.hostname || system.model || 'unknown',
                os: `${osInfo.platform} ${osInfo.distro} ${osInfo.release}`,
                architecture: osInfo.arch,
                processors: cpu.cores,
                uptime: osInfo.uptime,
                timestamp: new Date().toISOString(),
                cpu: {
                    usage_percent: Math.round(cpuLoad.currentLoad * 100) / 100,
                    load_average: cpuLoad.avgLoad ? [cpuLoad.avgLoad] : [0],
                    cores: cpu.cores,
                    model: cpu.manufacturer + ' ' + cpu.brand,
                    frequency: cpu.speed * 1000000 // Convert to Hz
                },
                memory: {
                    total: mem.total,
                    available: mem.available,
                    used: mem.used,
                    usage_percent: Math.round((mem.used / mem.total) * 10000) / 100,
                    swap_total: mem.swaptotal || 0,
                    swap_used: mem.swapused || 0
                },
                disk: this.processDiskInfo(disksInfo),
                network: this.processNetworkInfo(networkInterfaces, networkStats),
                processes: this.processTopProcesses(processes.list)
            };
        } catch (error) {
            logger.error('Error getting system info:', error);
            throw error;
        }
    }

    processDiskInfo(disksInfo) {
        const totalSize = disksInfo.reduce((total, disk) => total + disk.size, 0);
        const totalUsed = disksInfo.reduce((total, disk) => total + disk.used, 0);
        const totalFree = totalSize - totalUsed;

        const partitions = disksInfo.map(disk => ({
            name: disk.fs,
            mount: disk.mount,
            type: disk.type,
            total: disk.size,
            free: disk.size - disk.used,
            used: disk.used,
            usage_percent: Math.round((disk.used / disk.size) * 10000) / 100
        }));

        return {
            total: totalSize,
            free: totalFree,
            used: totalUsed,
            usage_percent: Math.round((totalUsed / totalSize) * 10000) / 100,
            partitions
        };
    }

    processNetworkInfo(interfaces, stats) {
        const totalBytesSent = stats.reduce((total, stat) => total + (stat.tx_bytes || 0), 0);
        const totalBytesReceived = stats.reduce((total, stat) => total + (stat.rx_bytes || 0), 0);
        const totalPacketsSent = stats.reduce((total, stat) => total + (stat.tx_packets || 0), 0);
        const totalPacketsReceived = stats.reduce((total, stat) => total + (stat.rx_packets || 0), 0);

        const networkInterfaces = interfaces.map(iface => ({
            name: iface.iface,
            displayName: iface.ifaceName || iface.iface,
            bytes_sent: 0, // Will be populated from stats if available
            bytes_recv: 0,
            up: !iface.dormant && iface.operstate === 'up',
            speed: iface.speed || 0
        }));

        return {
            bytes_sent: totalBytesSent,
            bytes_recv: totalBytesReceived,
            packets_sent: totalPacketsSent,
            packets_recv: totalPacketsReceived,
            interfaces: networkInterfaces
        };
    }

    processTopProcesses(processList) {
        return processList
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 10)
            .map(proc => ({
                pid: proc.pid,
                name: proc.name,
                cpu_percent: Math.round(proc.cpu * 100) / 100,
                memory_percent: Math.round(proc.pmem * 100) / 100,
                memory_rss: proc.memory,
                status: proc.state,
                user: proc.user
            }));
    }

    async getCpuMetrics() {
        try {
            const [cpu, cpuLoad] = await Promise.all([
                si.cpu(),
                si.currentLoad()
            ]);

            return {
                usage_percent: Math.round(cpuLoad.currentLoad * 100) / 100,
                load_average: cpuLoad.avgLoad ? [cpuLoad.avgLoad] : [0],
                cores: cpu.cores,
                model: cpu.manufacturer + ' ' + cpu.brand,
                frequency: cpu.speed * 1000000
            };
        } catch (error) {
            logger.error('Error getting CPU metrics:', error);
            throw error;
        }
    }

    async getMemoryMetrics() {
        try {
            const mem = await si.mem();
            return {
                total: mem.total,
                available: mem.available,
                used: mem.used,
                usage_percent: Math.round((mem.used / mem.total) * 10000) / 100,
                swap_total: mem.swaptotal || 0,
                swap_used: mem.swapused || 0
            };
        } catch (error) {
            logger.error('Error getting memory metrics:', error);
            throw error;
        }
    }

    async getDiskMetrics() {
        try {
            const disksInfo = await si.fsSize();
            return this.processDiskInfo(disksInfo);
        } catch (error) {
            logger.error('Error getting disk metrics:', error);
            throw error;
        }
    }

    async getNetworkMetrics() {
        try {
            const [interfaces, stats] = await Promise.all([
                si.networkInterfaces(),
                si.networkStats()
            ]);
            return this.processNetworkInfo(interfaces, stats);
        } catch (error) {
            logger.error('Error getting network metrics:', error);
            throw error;
        }
    }

    async getTopProcesses() {
        try {
            const processes = await si.processes();
            return this.processTopProcesses(processes.list);
        } catch (error) {
            logger.error('Error getting processes:', error);
            throw error;
        }
    }
}

/**
 * Database Monitoring Service
 */
class DatabaseMonitoringService {
    constructor() {
        this.dbType = process.env.DB_TYPE || 'sqlite';
        this.dbConfig = {
            sqlite: { path: process.env.DB_PATH || './sams.db' },
            mysql: {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 3306,
                database: process.env.DB_NAME || 'sams_db',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || ''
            },
            postgresql: {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 5432,
                database: process.env.DB_NAME || 'sams_db',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || ''
            }
        };
    }

    async getDatabaseMetrics() {
        const startTime = Date.now();
        
        try {
            let connectionResult;
            
            switch (this.dbType) {
                case 'sqlite':
                    connectionResult = await this.testSQLiteConnection();
                    break;
                case 'mysql':
                    connectionResult = await this.testMySQLConnection();
                    break;
                case 'postgresql':
                    connectionResult = await this.testPostgreSQLConnection();
                    break;
                default:
                    connectionResult = {
                        connected: false,
                        error: 'Unsupported database type: ' + this.dbType
                    };
            }

            const connectionTime = Date.now() - startTime;

            return {
                url: this.getDatabaseUrl(),
                driver: this.dbType.toUpperCase() + ' Driver',
                connected: connectionResult.connected,
                activeConnections: connectionResult.connected ? 1 : 0,
                maxConnections: 10, // Default value
                connectionTime,
                status: connectionResult.connected ? 'HEALTHY' : 'ERROR: ' + (connectionResult.error || 'Unknown error'),
                details: connectionResult.details || {},
                lastCheck: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error getting database metrics:', error);
            
            return {
                url: this.getDatabaseUrl(),
                driver: this.dbType.toUpperCase() + ' Driver',
                connected: false,
                activeConnections: 0,
                maxConnections: 0,
                connectionTime: Date.now() - startTime,
                status: 'ERROR: ' + error.message,
                details: { error: error.message },
                lastCheck: new Date().toISOString()
            };
        }
    }

    getDatabaseUrl() {
        switch (this.dbType) {
            case 'sqlite':
                return 'sqlite://' + (this.dbConfig.sqlite.path || './sams.db');
            case 'mysql':
                return `mysql://${this.dbConfig.mysql.host}:${this.dbConfig.mysql.port}/${this.dbConfig.mysql.database}`;
            case 'postgresql':
                return `postgresql://${this.dbConfig.postgresql.host}:${this.dbConfig.postgresql.port}/${this.dbConfig.postgresql.database}`;
            default:
                return 'unknown://unknown';
        }
    }

    async testSQLiteConnection() {
        return new Promise((resolve) => {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database(':memory:');
            
            db.serialize(() => {
                db.run("CREATE TABLE test (id INTEGER)", (err) => {
                    if (err) {
                        resolve({ 
                            connected: false, 
                            error: err.message,
                            details: { error: err.message }
                        });
                    } else {
                        resolve({ 
                            connected: true,
                            details: {
                                databaseProductName: 'SQLite',
                                databaseProductVersion: '3.x',
                                autoCommit: true,
                                readOnly: false
                            }
                        });
                    }
                    db.close();
                });
            });
        });
    }

    async testMySQLConnection() {
        const mysql = require('mysql2/promise');
        
        try {
            const connection = await mysql.createConnection(this.dbConfig.mysql);
            const [rows] = await connection.execute('SELECT VERSION() as version');
            await connection.end();
            
            return {
                connected: true,
                details: {
                    databaseProductName: 'MySQL',
                    databaseProductVersion: rows[0].version,
                    autoCommit: true,
                    readOnly: false
                }
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                details: { error: error.message }
            };
        }
    }

    async testPostgreSQLConnection() {
        const { Client } = require('pg');
        const client = new Client(this.dbConfig.postgresql);
        
        try {
            await client.connect();
            const result = await client.query('SELECT version()');
            await client.end();
            
            return {
                connected: true,
                details: {
                    databaseProductName: 'PostgreSQL',
                    databaseProductVersion: result.rows[0].version,
                    autoCommit: true,
                    readOnly: false
                }
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                details: { error: error.message }
            };
        }
    }

    async testDatabaseConnection() {
        const metrics = await this.getDatabaseMetrics();
        return metrics.connected;
    }

    async getDatabaseHealth() {
        const metrics = await this.getDatabaseMetrics();
        return {
            status: metrics.connected ? 'UP' : 'DOWN',
            database: this.dbType.toUpperCase(),
            connectionTime: metrics.connectionTime,
            details: metrics.details
        };
    }
}

/**
 * Remote Monitoring Service
 */
class RemoteMonitoringService {
    constructor() {
        this.remoteServers = this.loadRemoteServersConfig();
    }

    loadRemoteServersConfig() {
        const servers = [];
        
        // Load servers from environment variables
        for (let i = 1; i <= 10; i++) {
            const name = process.env[`REMOTE_SERVER_${i}_NAME`];
            const host = process.env[`REMOTE_SERVER_${i}_HOST`];
            const type = process.env[`REMOTE_SERVER_${i}_TYPE`];
            const url = process.env[`REMOTE_SERVER_${i}_URL`];
            
            if (name && host && type) {
                servers.push({ name, host, type, url });
            }
        }

        // Default servers if none configured
        if (servers.length === 0) {
            servers.push(
                { name: 'GitHub API', host: 'api.github.com', type: 'http', url: 'https://api.github.com' },
                { name: 'Google DNS', host: '8.8.8.8', type: 'ping' },
                { name: 'Local Server', host: 'localhost', type: 'http', url: 'http://localhost:5000' }
            );
        }

        return servers;
    }

    async monitorRemoteServers() {
        const results = await Promise.all(
            this.remoteServers.map(server => this.monitorSingleServer(server))
        );
        return results;
    }

    async monitorSingleServer(server) {
        const startTime = Date.now();
        
        try {
            switch (server.type.toLowerCase()) {
                case 'http':
                case 'https':
                    return await this.monitorHttpServer(server, startTime);
                case 'ssh':
                    return await this.monitorSshServer(server, startTime);
                case 'ping':
                    return await this.monitorPingServer(server, startTime);
                default:
                    return this.createErrorServerMetrics(server, 'Unknown server type: ' + server.type, startTime);
            }
        } catch (error) {
            logger.error(`Error monitoring server ${server.name}:`, error);
            return this.createErrorServerMetrics(server, error.message, startTime);
        }
    }

    async monitorHttpServer(server, startTime) {
        try {
            const response = await axios.get(server.url || `http://${server.host}`, {
                timeout: 10000,
                headers: { 'User-Agent': 'SAMS-Node-Monitor/1.0' }
            });
            
            const responseTime = Date.now() - startTime;
            const online = response.status >= 200 && response.status < 400;
            
            return {
                name: server.name,
                host: server.host,
                type: server.type,
                online,
                responseTime,
                status: online ? 'ONLINE' : `HTTP_ERROR_${response.status}`,
                details: {
                    statusCode: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    httpVersion: response.request.res?.httpVersion || 'unknown'
                },
                lastCheck: new Date().toISOString()
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            return this.createErrorServerMetrics(server, error.message, startTime, responseTime);
        }
    }

    async monitorSshServer(server, startTime) {
        return new Promise((resolve) => {
            const conn = new Client();
            
            conn.on('ready', () => {
                const responseTime = Date.now() - startTime;
                conn.end();
                
                resolve({
                    name: server.name,
                    host: server.host,
                    type: server.type,
                    online: true,
                    responseTime,
                    status: 'ONLINE',
                    details: {
                        serverVersion: 'SSH-2.0',
                        connected: true
                    },
                    lastCheck: new Date().toISOString()
                });
            });
            
            conn.on('error', (error) => {
                const responseTime = Date.now() - startTime;
                resolve(this.createErrorServerMetrics(server, error.message, startTime, responseTime));
            });
            
            conn.connect({
                host: server.host,
                port: server.port || 22,
                username: server.username || 'test',
                password: server.password || 'test',
                readyTimeout: 10000
            });
            
            // Timeout fallback
            setTimeout(() => {
                conn.end();
                const responseTime = Date.now() - startTime;
                resolve(this.createErrorServerMetrics(server, 'Connection timeout', startTime, responseTime));
            }, 10000);
        });
    }

    async monitorPingServer(server, startTime) {
        try {
            const result = await ping.promise.probe(server.host, {
                timeout: 10,
                extra: ['-c', '1']
            });
            
            const responseTime = Date.now() - startTime;
            
            return {
                name: server.name,
                host: server.host,
                type: server.type,
                online: result.alive,
                responseTime: result.time || responseTime,
                status: result.alive ? 'ONLINE' : 'UNREACHABLE',
                details: {
                    packetLoss: result.packetLoss || '0%',
                    avgTime: result.avg || result.time,
                    reachable: result.alive
                },
                lastCheck: new Date().toISOString()
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            return this.createErrorServerMetrics(server, error.message, startTime, responseTime);
        }
    }

    createErrorServerMetrics(server, error, startTime, responseTime = null) {
        return {
            name: server.name,
            host: server.host,
            type: server.type || 'unknown',
            online: false,
            responseTime: responseTime || (Date.now() - startTime),
            status: 'ERROR',
            details: { error },
            lastCheck: new Date().toISOString()
        };
    }
}

// Initialize services
const systemService = new SystemMonitoringService();
const databaseService = new DatabaseMonitoringService();
const remoteService = new RemoteMonitoringService();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'SAMS Node.js Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Comprehensive monitoring overview
app.get('/api/monitoring', async (req, res) => {
    try {
        logger.info('Getting monitoring overview');
        
        const [systemInfo, databaseMetrics, remoteServers] = await Promise.all([
            systemService.getSystemInfo().catch(err => {
                logger.error('System info error:', err);
                return null;
            }),
            databaseService.getDatabaseMetrics().catch(err => {
                logger.error('Database metrics error:', err);
                return null;
            }),
            remoteService.monitorRemoteServers().catch(err => {
                logger.error('Remote monitoring error:', err);
                return [];
            })
        ]);

        const overview = {
            system: systemInfo,
            databases: databaseMetrics ? [databaseMetrics] : [],
            remoteServers,
            alerts: alerts.slice(),
            timestamp: new Date().toISOString(),
            status: 'OPERATIONAL'
        };

        res.json(overview);
    } catch (error) {
        logger.error('Error getting monitoring overview:', error);
        res.status(500).json({
            system: null,
            databases: [],
            remoteServers: [],
            alerts: alerts.slice(),
            timestamp: new Date().toISOString(),
            status: 'ERROR: ' + error.message
        });
    }
});

// System endpoints
app.get('/api/system', async (req, res) => {
    try {
        const systemInfo = await systemService.getSystemInfo();
        res.json(systemInfo);
    } catch (error) {
        logger.error('Error getting system info:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system/cpu', async (req, res) => {
    try {
        const cpuMetrics = await systemService.getCpuMetrics();
        res.json(cpuMetrics);
    } catch (error) {
        logger.error('Error getting CPU metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system/memory', async (req, res) => {
    try {
        const memoryMetrics = await systemService.getMemoryMetrics();
        res.json(memoryMetrics);
    } catch (error) {
        logger.error('Error getting memory metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system/disk', async (req, res) => {
    try {
        const diskMetrics = await systemService.getDiskMetrics();
        res.json(diskMetrics);
    } catch (error) {
        logger.error('Error getting disk metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system/network', async (req, res) => {
    try {
        const networkMetrics = await systemService.getNetworkMetrics();
        res.json(networkMetrics);
    } catch (error) {
        logger.error('Error getting network metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system/processes', async (req, res) => {
    try {
        const processes = await systemService.getTopProcesses();
        res.json(processes);
    } catch (error) {
        logger.error('Error getting processes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Database endpoints
app.get('/api/database', async (req, res) => {
    try {
        const databaseMetrics = await databaseService.getDatabaseMetrics();
        res.json(databaseMetrics);
    } catch (error) {
        logger.error('Error getting database metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/database/test', async (req, res) => {
    try {
        const connected = await databaseService.testDatabaseConnection();
        res.json({
            connected,
            status: connected ? 'SUCCESS' : 'FAILED',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error testing database connection:', error);
        res.status(500).json({
            connected: false,
            status: 'ERROR',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/database/health', async (req, res) => {
    try {
        const health = await databaseService.getDatabaseHealth();
        res.json(health);
    } catch (error) {
        logger.error('Error getting database health:', error);
        res.status(500).json({
            status: 'DOWN',
            error: error.message
        });
    }
});

// Remote monitoring endpoints
app.get('/api/remote', async (req, res) => {
    try {
        const remoteServers = await remoteService.monitorRemoteServers();
        res.json(remoteServers);
    } catch (error) {
        logger.error('Error getting remote server metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alert endpoints
app.get('/api/alerts', (req, res) => {
    res.json(alerts.slice());
});

app.post('/api/alerts/:alertId/acknowledge', (req, res) => {
    const { alertId } = req.params;
    const alert = alerts.find(a => a.id === alertId);
    
    if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date().toISOString();
        alert.acknowledgedBy = 'API User';
        
        res.json({
            success: true,
            message: 'Alert acknowledged',
            alertId
        });
    } else {
        res.json({
            success: false,
            message: 'Alert not found',
            alertId
        });
    }
});

app.delete('/api/alerts', (req, res) => {
    const clearedCount = alerts.length;
    alerts = [];
    
    res.json({
        success: true,
        message: 'All alerts cleared',
        clearedCount
    });
});

// Server info
app.get('/api/info', (req, res) => {
    res.json({
        service: 'SAMS Node.js Backend',
        version: '1.0.0',
        description: 'Server & Alert Monitoring System - Node.js Express Backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/health', '/api/monitoring', '/api/system', '/api/database', 
            '/api/remote', '/api/alerts'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log('===============================================');
    console.log('🚀 SAMS Node.js Backend Starting...');
    console.log('🔧 Server & Alert Monitoring System');
    console.log('📊 Real-time monitoring with Node.js');
    console.log('===============================================');
    console.log(`✅ SAMS Node.js Backend Started Successfully!`);
    console.log(`🌐 API Server: http://localhost:${PORT}/api`);
    console.log(`📈 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️ Database Type: ${process.env.DB_TYPE || 'sqlite'}`);
    console.log('===============================================');
    
    logger.info(`SAMS Node.js Backend started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
