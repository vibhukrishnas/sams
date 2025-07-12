// SAMS WebSocket Real-Time Communication Server
// Phase 2 Week 5: WebSocket Implementation with Connection Management

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Connection Management
class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.subscriptions = new Map();
    this.heartbeatInterval = 30000; // 30 seconds
    this.messageQueue = new Map(); // For offline users
    this.startHeartbeat();
  }

  addConnection(ws, userId, userRole = 'user') {
    const connectionId = uuidv4();
    const connection = {
      id: connectionId,
      ws: ws,
      userId: userId,
      userRole: userRole,
      isAlive: true,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set()
    };

    this.connections.set(connectionId, connection);
    console.log(`✅ User ${userId} connected (${connectionId}) - Total: ${this.connections.size}`);
    
    // Send queued messages if any
    this.sendQueuedMessages(userId);
    
    return connectionId;
  }

  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      console.log(`❌ User ${connection.userId} disconnected (${connectionId})`);
      this.connections.delete(connectionId);
      
      // Clean up subscriptions
      for (const [topic, subscribers] of this.subscriptions.entries()) {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    }
  }

  subscribe(connectionId, topic) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic).add(connectionId);
    
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.add(topic);
      console.log(`📡 User ${connection.userId} subscribed to ${topic}`);
    }
  }

  unsubscribe(connectionId, topic) {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic).delete(connectionId);
    }
    
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(topic);
      console.log(`📡 User ${connection.userId} unsubscribed from ${topic}`);
    }
  }

  broadcast(topic, message, excludeConnectionId = null) {
    const subscribers = this.subscriptions.get(topic);
    if (!subscribers) return;

    let sentCount = 0;
    let queuedCount = 0;

    for (const connectionId of subscribers) {
      if (connectionId === excludeConnectionId) continue;
      
      const connection = this.connections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify({
            type: 'broadcast',
            topic: topic,
            data: message,
            timestamp: new Date().toISOString()
          }));
          sentCount++;
        } catch (error) {
          console.error(`❌ Failed to send to ${connection.userId}:`, error);
          this.queueMessage(connection.userId, topic, message);
          queuedCount++;
        }
      } else if (connection) {
        // Queue message for offline user
        this.queueMessage(connection.userId, topic, message);
        queuedCount++;
      }
    }

    console.log(`📢 Broadcast to ${topic}: ${sentCount} sent, ${queuedCount} queued`);
  }

  sendToUser(userId, message) {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.userId === userId && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify({
            type: 'direct',
            data: message,
            timestamp: new Date().toISOString()
          }));
          return true;
        } catch (error) {
          console.error(`❌ Failed to send direct message to ${userId}:`, error);
        }
      }
    }
    
    // Queue message if user is offline
    this.queueMessage(userId, 'direct', message);
    return false;
  }

  queueMessage(userId, topic, message) {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    
    this.messageQueue.get(userId).push({
      topic: topic,
      message: message,
      timestamp: new Date().toISOString()
    });

    // Limit queue size to prevent memory issues
    const queue = this.messageQueue.get(userId);
    if (queue.length > 100) {
      queue.splice(0, queue.length - 100);
    }
  }

  sendQueuedMessages(userId) {
    const queue = this.messageQueue.get(userId);
    if (!queue || queue.length === 0) return;

    console.log(`📬 Sending ${queue.length} queued messages to ${userId}`);
    
    for (const queuedMessage of queue) {
      this.sendToUser(userId, {
        type: 'queued',
        topic: queuedMessage.topic,
        data: queuedMessage.message,
        originalTimestamp: queuedMessage.timestamp
      });
    }
    
    this.messageQueue.delete(userId);
  }

  startHeartbeat() {
    setInterval(() => {
      const now = new Date();
      const deadConnections = [];

      for (const [connectionId, connection] of this.connections.entries()) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          if (connection.isAlive === false) {
            deadConnections.push(connectionId);
          } else {
            connection.isAlive = false;
            connection.ws.ping();
          }
        } else {
          deadConnections.push(connectionId);
        }
      }

      // Remove dead connections
      deadConnections.forEach(connectionId => {
        this.removeConnection(connectionId);
      });

      if (deadConnections.length > 0) {
        console.log(`💔 Removed ${deadConnections.length} dead connections`);
      }

    }, this.heartbeatInterval);
  }

  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      totalSubscriptions: this.subscriptions.size,
      queuedMessages: 0,
      connectionsByRole: {},
      subscriptionsByTopic: {}
    };

    // Count queued messages
    for (const queue of this.messageQueue.values()) {
      stats.queuedMessages += queue.length;
    }

    // Count connections by role
    for (const connection of this.connections.values()) {
      stats.connectionsByRole[connection.userRole] = 
        (stats.connectionsByRole[connection.userRole] || 0) + 1;
    }

    // Count subscriptions by topic
    for (const [topic, subscribers] of this.subscriptions.entries()) {
      stats.subscriptionsByTopic[topic] = subscribers.size;
    }

    return stats;
  }
}

const connectionManager = new ConnectionManager();

// WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  let connectionId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'auth':
          connectionId = connectionManager.addConnection(
            ws, 
            message.userId || 'anonymous', 
            message.userRole || 'user'
          );
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            connectionId: connectionId,
            timestamp: new Date().toISOString()
          }));
          break;

        case 'subscribe':
          if (connectionId && message.topic) {
            connectionManager.subscribe(connectionId, message.topic);
            ws.send(JSON.stringify({
              type: 'subscribed',
              topic: message.topic,
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'unsubscribe':
          if (connectionId && message.topic) {
            connectionManager.unsubscribe(connectionId, message.topic);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              topic: message.topic,
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('pong', () => {
    if (connectionId) {
      const connection = connectionManager.connections.get(connectionId);
      if (connection) {
        connection.isAlive = true;
        connection.lastPing = new Date();
      }
    }
  });

  ws.on('close', () => {
    if (connectionId) {
      connectionManager.removeConnection(connectionId);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    if (connectionId) {
      connectionManager.removeConnection(connectionId);
    }
  });
});

// REST API for WebSocket Management
app.get('/api/websocket/stats', (req, res) => {
  res.json({
    success: true,
    data: connectionManager.getStats(),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/websocket/broadcast', (req, res) => {
  const { topic, message } = req.body;
  
  if (!topic || !message) {
    return res.status(400).json({
      success: false,
      error: 'Topic and message are required'
    });
  }

  connectionManager.broadcast(topic, message);
  
  res.json({
    success: true,
    message: 'Broadcast sent',
    topic: topic,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/websocket/send', (req, res) => {
  const { userId, message } = req.body;
  
  if (!userId || !message) {
    return res.status(400).json({
      success: false,
      error: 'UserId and message are required'
    });
  }

  const sent = connectionManager.sendToUser(userId, message);
  
  res.json({
    success: true,
    sent: sent,
    message: sent ? 'Message sent' : 'Message queued (user offline)',
    timestamp: new Date().toISOString()
  });
});

// Real-time Alert Broadcasting
function broadcastAlert(alert) {
  connectionManager.broadcast('alerts', {
    type: 'new_alert',
    alert: alert
  });
}

function broadcastServerStatus(serverId, status, metrics) {
  connectionManager.broadcast('server_status', {
    type: 'status_update',
    serverId: serverId,
    status: status,
    metrics: metrics
  });
}

function broadcastSystemMetrics(metrics) {
  connectionManager.broadcast('system_metrics', {
    type: 'metrics_update',
    metrics: metrics
  });
}

// Export functions for use in main server
module.exports = {
  connectionManager,
  broadcastAlert,
  broadcastServerStatus,
  broadcastSystemMetrics
};

// Start WebSocket Server
const WS_PORT = process.env.WS_PORT || 8081;
server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`🔌 SAMS WebSocket Server running on ws://0.0.0.0:${WS_PORT}`);
  console.log(`📊 WebSocket Stats: http://localhost:${WS_PORT}/api/websocket/stats`);
  console.log(`📡 Ready for real-time connections!`);
});
