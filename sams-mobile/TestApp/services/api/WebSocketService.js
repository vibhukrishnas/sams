/**
 * 🔥 ENTERPRISE WEBSOCKET SERVICE - REAL-TIME MONITORING
 * Handles all real-time communication with SAMS backend
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000;
    this.heartbeatInterval = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.messageQueue = [];
    this.serverUrl = 'ws://192.168.1.10:8080/ws';
    this.fallbackUrls = [
      'ws://192.168.1.10:8080/ws',
      'ws://localhost:3001/ws',
      'ws://10.0.2.2:3001/ws'
    ];
    this.currentUrlIndex = 0;
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('WebSocketService: No auth token found');
        return false;
      }

      const wsUrl = `${this.serverUrl}?token=${token}`;
      console.log('🔥 WebSocketService: Connecting to', wsUrl);

      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.onConnected();
          resolve(true);
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('WebSocketService connect error:', error);
      return false;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.ws.onopen = () => this.onConnected();
    this.ws.onmessage = (event) => this.onMessage(event);
    this.ws.onclose = (event) => this.onDisconnected(event);
    this.ws.onerror = (error) => this.onError(error);
  }

  /**
   * Handle connection established
   */
  onConnected() {
    console.log('🔥 WebSocketService: Connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.currentUrlIndex = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.processMessageQueue();
    
    // Notify subscribers
    this.notifySubscribers('connection', { status: 'connected' });
  }

  /**
   * Handle incoming messages
   */
  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('🔥 WebSocketService: Received message', data.type);
      
      switch (data.type) {
        case 'alert':
          this.handleAlert(data.payload);
          break;
        case 'server_update':
          this.handleServerUpdate(data.payload);
          break;
        case 'metric_update':
          this.handleMetricUpdate(data.payload);
          break;
        case 'system_notification':
          this.handleSystemNotification(data.payload);
          break;
        case 'heartbeat_response':
          this.handleHeartbeatResponse(data.payload);
          break;
        default:
          console.log('WebSocketService: Unknown message type', data.type);
      }
      
      // Notify subscribers
      this.notifySubscribers(data.type, data.payload);
    } catch (error) {
      console.error('WebSocketService: Error parsing message', error);
    }
  }

  /**
   * Handle connection closed
   */
  onDisconnected(event) {
    console.log('🔥 WebSocketService: Disconnected', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();
    
    // Notify subscribers
    this.notifySubscribers('connection', { status: 'disconnected', code: event.code });
    
    // Attempt reconnection
    if (event.code !== 1000) { // Not a normal closure
      this.attemptReconnection();
    }
  }

  /**
   * Handle WebSocket errors
   */
  onError(error) {
    console.error('🔥 WebSocketService: Error', error);
    this.notifySubscribers('error', { error: error.message });
  }

  /**
   * Attempt to reconnect
   */
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocketService: Max reconnection attempts reached');
      this.notifySubscribers('connection', { status: 'failed', reason: 'max_attempts' });
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔥 WebSocketService: Reconnection attempt ${this.reconnectAttempts}`);
    
    // Try next fallback URL if available
    if (this.reconnectAttempts % 3 === 0) {
      this.currentUrlIndex = (this.currentUrlIndex + 1) % this.fallbackUrls.length;
      this.serverUrl = this.fallbackUrls[this.currentUrlIndex];
    }
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.log('WebSocketService: Message queued (not connected)');
      return false;
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);
    
    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of events
   */
  notifySubscribers(eventType, data) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('WebSocketService: Subscriber callback error', error);
        }
      });
    }
  }

  /**
   * Handle alert messages
   */
  handleAlert(alert) {
    console.log('🚨 WebSocketService: New alert received', alert);
    // Trigger push notification if app is in background
    this.triggerPushNotification(alert);
  }

  /**
   * Handle server update messages
   */
  handleServerUpdate(serverData) {
    console.log('🔄 WebSocketService: Server update', serverData);
  }

  /**
   * Handle metric update messages
   */
  handleMetricUpdate(metrics) {
    console.log('📊 WebSocketService: Metrics update', metrics);
  }

  /**
   * Handle system notifications
   */
  handleSystemNotification(notification) {
    console.log('🔔 WebSocketService: System notification', notification);
  }

  /**
   * Handle heartbeat response
   */
  handleHeartbeatResponse(data) {
    console.log('💓 WebSocketService: Heartbeat response received');
  }

  /**
   * Trigger push notification
   */
  triggerPushNotification(alert) {
    // This will be handled by the push notification service
    console.log('🔔 WebSocketService: Triggering push notification for alert', alert.id);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      currentUrl: this.serverUrl,
      queuedMessages: this.messageQueue.length
    };
  }
}

export default new WebSocketService();
