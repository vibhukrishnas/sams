import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    // Connect to Java backend WebSocket
    this.socket = io('ws://localhost:8080/ws', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to SAMS Java Backend WebSocket');
      this.subscribe('/topic/metrics');
      this.subscribe('/topic/alerts');
      this.subscribe('/topic/servers');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from SAMS Java Backend WebSocket');
    });

    this.socket.on('error', (error) => {
      console.error('🔴 WebSocket Error:', error);
    });

    // Listen for real-time updates
    this.socket.on('/topic/metrics', (data) => {
      this.notifyCallbacks('metrics', data);
    });

    this.socket.on('/topic/alerts', (data) => {
      this.notifyCallbacks('alerts', data);
    });

    this.socket.on('/topic/servers', (data) => {
      this.notifyCallbacks('servers', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(destination) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe', destination);
      console.log(`📡 Subscribed to ${destination}`);
    }
  }

  // Register callback for real-time data
  onData(type, callback) {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, []);
    }
    this.callbacks.get(type).push(callback);
  }

  // Remove callback
  offData(type, callback) {
    if (this.callbacks.has(type)) {
      const callbacks = this.callbacks.get(type);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify all callbacks for a specific data type
  notifyCallbacks(type, data) {
    if (this.callbacks.has(type)) {
      this.callbacks.get(type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${type} callback:`, error);
        }
      });
    }
  }

  // Send data to server
  send(destination, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(destination, data);
    }
  }

  // Get connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;