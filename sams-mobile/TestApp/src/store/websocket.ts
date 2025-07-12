/**
 * 🔌 Enhanced WebSocket Manager
 * Real-time communication with SAMS backend server
 */

import { store } from '.';
import { addAlert, updateAlert } from './slices/alertSlice';
import { updateServerStatus, updateServerMetrics } from './slices/serverSlice';
import { setOnlineStatus } from './slices/offlineSlice';
import { showToast } from './slices/uiSlice';
import AuthenticationService from '../services/AuthenticationService';
import { Platform } from 'react-native';

interface WebSocketMessage {
  type: 'alert' | 'server_status' | 'server_metrics' | 'system_health' | 'heartbeat';
  data: any;
  timestamp: number;
  serverId?: string;
}

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  enableCompression: boolean;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnecting = false;
  private isAuthenticated = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor() {
    this.config = {
      url: this.getWebSocketUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      enableCompression: true,
    };
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private getWebSocketUrl(): string {
    if (__DEV__) {
      return Platform.OS === 'android'
        ? 'ws://10.0.2.2:8081'
        : 'ws://localhost:8081';
    }
    return 'ws://192.168.1.10:8081';
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log('🔌 Connecting to WebSocket:', this.config.url);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.handleConnectionError();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.authenticate();
      this.startHeartbeat();
      this.processMessageQueue();

      store.dispatch(setOnlineStatus(true));
      store.dispatch(showToast({
        type: 'success',
        message: 'Real-time connection established',
        duration: 2000,
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.warn('🔌 WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      this.isAuthenticated = false;
      this.stopHeartbeat();

      store.dispatch(setOnlineStatus(false));

      if (event.code !== 1000) { // Not a normal closure
        this.handleReconnection();
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.handleConnectionError();
    };
  }

  private async authenticate(): Promise<void> {
    try {
      const tokens = await AuthenticationService.getStoredTokens();
      if (tokens?.accessToken) {
        this.send({
          type: 'auth',
          data: {
            token: tokens.accessToken,
            clientType: 'mobile',
            platform: Platform.OS,
            version: '2.1.0',
          },
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('❌ WebSocket authentication failed:', error);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('📨 WebSocket message received:', message.type);

    switch (message.type) {
      case 'alert':
        this.handleAlertMessage(message);
        break;
      case 'server_status':
        this.handleServerStatusMessage(message);
        break;
      case 'server_metrics':
        this.handleServerMetricsMessage(message);
        break;
      case 'system_health':
        this.handleSystemHealthMessage(message);
        break;
      case 'heartbeat':
        this.handleHeartbeatMessage(message);
        break;
      case 'auth_success':
        this.isAuthenticated = true;
        console.log('✅ WebSocket authenticated');
        break;
      case 'auth_failed':
        console.error('❌ WebSocket authentication failed');
        this.disconnect();
        break;
      default:
        console.warn('🤷 Unknown WebSocket message type:', message.type);
    }
  }

  private handleAlertMessage(message: WebSocketMessage): void {
    const alert = message.data;

    if (alert.action === 'new') {
      store.dispatch(addAlert(alert.alert));

      // Show toast for critical alerts
      if (alert.alert.severity === 'critical') {
        store.dispatch(showToast({
          type: 'error',
          message: `Critical Alert: ${alert.alert.title}`,
          duration: 5000,
        }));
      }
    } else if (alert.action === 'update') {
      store.dispatch(updateAlert(alert.alert));
    }
  }

  private handleServerStatusMessage(message: WebSocketMessage): void {
    const { serverId, status, metrics } = message.data;

    store.dispatch(updateServerStatus({
      serverId,
      status,
      lastChecked: message.timestamp,
    }));

    if (metrics) {
      store.dispatch(updateServerMetrics({
        serverId,
        metrics,
        timestamp: message.timestamp,
      }));
    }
  }

  private handleServerMetricsMessage(message: WebSocketMessage): void {
    const { serverId, metrics } = message.data;

    store.dispatch(updateServerMetrics({
      serverId,
      metrics,
      timestamp: message.timestamp,
    }));
  }

  private handleSystemHealthMessage(message: WebSocketMessage): void {
    // Update system health in store
    console.log('📊 System health update:', message.data);
  }

  private handleHeartbeatMessage(message: WebSocketMessage): void {
    // Respond to heartbeat
    this.send({
      type: 'heartbeat_response',
      data: { timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private handleConnectionError(): void {
    this.isConnecting = false;
    this.isAuthenticated = false;

    store.dispatch(setOnlineStatus(false));
    store.dispatch(showToast({
      type: 'error',
      message: 'Connection lost. Attempting to reconnect...',
      duration: 3000,
    }));

    this.handleReconnection();
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      store.dispatch(showToast({
        type: 'error',
        message: 'Unable to establish connection. Please check your network.',
        duration: 5000,
      }));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.config.reconnectInterval * this.reconnectAttempts, 30000);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(message: any): void {
    if (this.isConnected() && this.isAuthenticated) {
      this.ws!.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.log('📤 Message queued (not connected):', message.type);
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

      this.messageQueue.forEach(message => {
        this.send(message);
      });

      this.messageQueue = [];
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket');

    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnecting = false;
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];

    store.dispatch(setOnlineStatus(false));
  }

  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected(),
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }
}

// Export singleton instance
const webSocketManager = WebSocketManager.getInstance();

// Legacy exports for backward compatibility
export const connectWebSocket = (url?: string) => {
  if (url) {
    webSocketManager.updateConfig({ url });
  }
  webSocketManager.connect();
};

export const closeWebSocket = () => {
  webSocketManager.disconnect();
};

export default webSocketManager;
