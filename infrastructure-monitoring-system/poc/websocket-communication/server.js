/**
 * SAMS WebSocket Real-time Communication POC
 * 
 * This POC demonstrates real-time bidirectional communication using WebSockets.
 * It simulates a monitoring system that can:
 * - Accept multiple client connections
 * - Broadcast real-time data to all clients
 * - Handle client-specific requests
 * - Manage connection lifecycle
 * - Simulate alert notifications
 * 
 * @version 1.0.0
 * @author SAMS Development Team
 */

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configuration
const HTTP_PORT = 3001;
const WS_PORT = 3002;

// Express app for serving static files and REST endpoints
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// Client connection tracking
const clients = new Map();
let messageCounter = 0;

// Simulated system data
let systemData = {
    servers: [
        { id: 'server-1', name: 'Web Server 01', status: 'online', cpu: 45, memory: 67, alerts: 0 },
        { id: 'server-2', name: 'Database Server', status: 'online', cpu: 78, memory: 82, alerts: 1 },
        { id: 'server-3', name: 'API Gateway', status: 'warning', cpu: 92, memory: 76, alerts: 2 }
    ],
    alerts: [
        { id: 'alert-1', server: 'server-2', type: 'warning', message: 'High memory usage detected', timestamp: new Date() },
        { id: 'alert-2', server: 'server-3', type: 'critical', message: 'CPU usage above 90%', timestamp: new Date() }
    ],
    stats: {
        totalServers: 3,
        onlineServers: 2,
        warningServers: 1,
        criticalAlerts: 1,
        totalAlerts: 2
    }
};

console.log('=================================================');
console.log('  SAMS WebSocket Communication POC Starting');
console.log('=================================================');
console.log(`  HTTP Server: http://localhost:${HTTP_PORT}`);
console.log(`  WebSocket Server: ws://localhost:${WS_PORT}`);
console.log('=================================================');

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const clientInfo = {
        id: clientId,
        socket: ws,
        connectedAt: new Date(),
        lastPing: new Date(),
        subscriptions: new Set()
    };
    
    clients.set(clientId, clientInfo);
    
    console.log(`✅ Client connected: ${clientId} (Total: ${clients.size})`);
    
    // Send welcome message
    sendToClient(clientId, {
        type: 'welcome',
        clientId: clientId,
        message: 'Connected to SAMS WebSocket Communication POC',
        version: '1.0.0',
        serverTime: new Date().toISOString(),
        availableChannels: ['system-data', 'alerts', 'server-status', 'heartbeat']
    });
    
    // Send initial system data
    sendToClient(clientId, {
        type: 'system-data',
        data: systemData,
        timestamp: new Date().toISOString()
    });
    
    // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleClientMessage(clientId, message);
        } catch (error) {
            console.error(`❌ Error parsing message from ${clientId}:`, error.message);
            sendToClient(clientId, {
                type: 'error',
                message: 'Invalid JSON format',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle client disconnect
    ws.on('close', (code, reason) => {
        console.log(`🔌 Client disconnected: ${clientId} - Code: ${code}, Reason: ${reason}`);
        clients.delete(clientId);
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error.message);
        clients.delete(clientId);
    });
    
    // Update client's last ping
    ws.on('pong', () => {
        if (clients.has(clientId)) {
            clients.get(clientId).lastPing = new Date();
        }
    });
});

// Handle client messages
function handleClientMessage(clientId, message) {
    console.log(`📨 Message from ${clientId}:`, message.type);
    
    const client = clients.get(clientId);
    if (!client) return;
    
    switch (message.type) {
        case 'ping':
            sendToClient(clientId, {
                type: 'pong',
                timestamp: new Date().toISOString()
            });
            break;
            
        case 'subscribe':
            const channel = message.channel;
            if (channel) {
                client.subscriptions.add(channel);
                sendToClient(clientId, {
                    type: 'subscription-confirmed',
                    channel: channel,
                    message: `Subscribed to ${channel}`,
                    timestamp: new Date().toISOString()
                });
                console.log(`📡 Client ${clientId} subscribed to ${channel}`);
            }
            break;
            
        case 'unsubscribe':
            const unsubChannel = message.channel;
            if (unsubChannel) {
                client.subscriptions.delete(unsubChannel);
                sendToClient(clientId, {
                    type: 'subscription-cancelled',
                    channel: unsubChannel,
                    message: `Unsubscribed from ${unsubChannel}`,
                    timestamp: new Date().toISOString()
                });
                console.log(`📡 Client ${clientId} unsubscribed from ${unsubChannel}`);
            }
            break;
            
        case 'request-data':
            sendToClient(clientId, {
                type: 'system-data',
                data: systemData,
                timestamp: new Date().toISOString()
            });
            break;
            
        case 'simulate-alert':
            simulateAlert(message.serverId || 'server-1', message.alertType || 'warning');
            break;
            
        case 'client-info':
            sendToClient(clientId, {
                type: 'client-info-response',
                clientInfo: {
                    id: client.id,
                    connectedAt: client.connectedAt,
                    subscriptions: Array.from(client.subscriptions),
                    connectionDuration: Date.now() - client.connectedAt.getTime()
                },
                timestamp: new Date().toISOString()
            });
            break;
            
        default:
            sendToClient(clientId, {
                type: 'unknown-message',
                originalType: message.type,
                message: 'Unknown message type',
                timestamp: new Date().toISOString()
            });
    }
}

// Send message to specific client
function sendToClient(clientId, message) {
    const client = clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
        try {
            client.socket.send(JSON.stringify(message));
        } catch (error) {
            console.error(`❌ Error sending to client ${clientId}:`, error.message);
            clients.delete(clientId);
        }
    }
}

// Broadcast message to all clients
function broadcast(message, channel = null) {
    let sentCount = 0;
    
    clients.forEach((client, clientId) => {
        if (channel && !client.subscriptions.has(channel)) {
            return; // Skip clients not subscribed to this channel
        }
        
        if (client.socket.readyState === WebSocket.OPEN) {
            try {
                client.socket.send(JSON.stringify(message));
                sentCount++;
            } catch (error) {
                console.error(`❌ Error broadcasting to client ${clientId}:`, error.message);
                clients.delete(clientId);
            }
        }
    });
    
    return sentCount;
}

// Simulate system data updates
function simulateSystemUpdates() {
    // Update server metrics with random variations
    systemData.servers.forEach(server => {
        server.cpu = Math.max(0, Math.min(100, server.cpu + (Math.random() - 0.5) * 10));
        server.memory = Math.max(0, Math.min(100, server.memory + (Math.random() - 0.5) * 8));
        
        // Update status based on metrics
        if (server.cpu > 90 || server.memory > 90) {
            server.status = 'critical';
        } else if (server.cpu > 75 || server.memory > 80) {
            server.status = 'warning';
        } else {
            server.status = 'online';
        }
    });
    
    // Update stats
    systemData.stats.onlineServers = systemData.servers.filter(s => s.status === 'online').length;
    systemData.stats.warningServers = systemData.servers.filter(s => s.status === 'warning').length;
    systemData.stats.criticalServers = systemData.servers.filter(s => s.status === 'critical').length;
    
    // Broadcast updated data
    const updateMessage = {
        type: 'system-data-update',
        data: systemData,
        timestamp: new Date().toISOString(),
        updateId: ++messageCounter
    };
    
    const sentCount = broadcast(updateMessage, 'system-data');
    if (sentCount > 0) {
        console.log(`📊 System data update broadcasted to ${sentCount} clients`);
    }
}

// Simulate alert generation
function simulateAlert(serverId, alertType = 'warning') {
    const server = systemData.servers.find(s => s.id === serverId);
    if (!server) return;
    
    const alert = {
        id: `alert-${Date.now()}`,
        server: serverId,
        serverName: server.name,
        type: alertType,
        message: generateAlertMessage(alertType, server),
        timestamp: new Date().toISOString()
    };
    
    systemData.alerts.unshift(alert);
    systemData.alerts = systemData.alerts.slice(0, 10); // Keep only last 10 alerts
    
    server.alerts = (server.alerts || 0) + 1;
    systemData.stats.totalAlerts++;
    if (alertType === 'critical') {
        systemData.stats.criticalAlerts++;
    }
    
    // Broadcast alert
    const alertMessage = {
        type: 'new-alert',
        alert: alert,
        timestamp: new Date().toISOString()
    };
    
    const sentCount = broadcast(alertMessage, 'alerts');
    console.log(`🚨 Alert generated and sent to ${sentCount} clients: ${alert.message}`);
}

function generateAlertMessage(type, server) {
    const messages = {
        warning: [
            `High CPU usage on ${server.name}: ${server.cpu.toFixed(1)}%`,
            `Memory usage elevated on ${server.name}: ${server.memory.toFixed(1)}%`,
            `Response time increased on ${server.name}`,
            `Disk space running low on ${server.name}`
        ],
        critical: [
            `CRITICAL: CPU usage critical on ${server.name}: ${server.cpu.toFixed(1)}%`,
            `CRITICAL: Memory exhaustion on ${server.name}: ${server.memory.toFixed(1)}%`,
            `CRITICAL: Service unresponsive on ${server.name}`,
            `CRITICAL: System overload detected on ${server.name}`
        ]
    };
    
    const typeMessages = messages[type] || messages.warning;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
}

// Heartbeat to check client connections
function heartbeat() {
    const now = new Date();
    let disconnectedCount = 0;
    
    clients.forEach((client, clientId) => {
        if (client.socket.readyState === WebSocket.OPEN) {
            // Send ping
            client.socket.ping();
            
            // Check if client hasn't responded to ping in 30 seconds
            if (now - client.lastPing > 30000) {
                console.log(`⏰ Client ${clientId} timeout, disconnecting`);
                client.socket.terminate();
                clients.delete(clientId);
                disconnectedCount++;
            }
        } else {
            clients.delete(clientId);
            disconnectedCount++;
        }
    });
    
    if (disconnectedCount > 0) {
        console.log(`🧹 Cleaned up ${disconnectedCount} disconnected clients`);
    }
    
    // Broadcast heartbeat to subscribed clients
    if (clients.size > 0) {
        broadcast({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            connectedClients: clients.size,
            serverUptime: process.uptime()
        }, 'heartbeat');
    }
}

// REST API endpoints
app.get('/api/status', (req, res) => {
    res.json({
        service: 'SAMS WebSocket Communication POC',
        version: '1.0.0',
        status: 'running',
        connectedClients: clients.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/clients', (req, res) => {
    const clientList = Array.from(clients.entries()).map(([id, client]) => ({
        id,
        connectedAt: client.connectedAt,
        subscriptions: Array.from(client.subscriptions),
        connectionDuration: Date.now() - client.connectedAt.getTime()
    }));
    
    res.json({
        totalClients: clients.size,
        clients: clientList,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/broadcast', (req, res) => {
    const { message, channel } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    const broadcastMessage = {
        type: 'broadcast',
        message: message,
        channel: channel || 'general',
        timestamp: new Date().toISOString()
    };
    
    const sentCount = broadcast(broadcastMessage, channel);
    
    res.json({
        success: true,
        sentToClients: sentCount,
        message: broadcastMessage
    });
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP Server running on http://localhost:${HTTP_PORT}`);
});

// Start periodic updates
setInterval(simulateSystemUpdates, 5000); // Every 5 seconds
setInterval(heartbeat, 10000); // Every 10 seconds
setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance every 15 seconds
        const servers = systemData.servers;
        const randomServer = servers[Math.floor(Math.random() * servers.length)];
        const alertType = Math.random() < 0.7 ? 'warning' : 'critical';
        simulateAlert(randomServer.id, alertType);
    }
}, 15000);

console.log('🚀 SAMS WebSocket Communication POC is running!');
console.log('📡 WebSocket server ready for connections');
console.log('🔄 Automatic system updates every 5 seconds');
console.log('💓 Heartbeat every 10 seconds');
console.log('🚨 Random alerts every 15 seconds');
