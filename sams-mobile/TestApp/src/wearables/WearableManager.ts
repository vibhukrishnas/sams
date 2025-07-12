/**
 * ⌚ Wearable Manager - Apple Watch & Wear OS Support
 * Manages communication with smartwatches for SAMS monitoring
 */

import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WearableDevice {
  id: string;
  name: string;
  type: 'apple_watch' | 'wear_os' | 'unknown';
  isConnected: boolean;
  batteryLevel?: number;
  lastSeen: number;
  capabilities: string[];
}

interface WearableMessage {
  id: string;
  type: 'alert' | 'status' | 'command' | 'heartbeat';
  payload: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface WearableConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  maxAlerts: number;
  enableHapticFeedback: boolean;
  enableVoiceCommands: boolean;
  batteryOptimization: boolean;
}

class WearableManager {
  private static instance: WearableManager;
  private config: WearableConfig;
  private connectedDevices: Map<string, WearableDevice> = new Map();
  private messageQueue: WearableMessage[] = [];
  private syncTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor() {
    this.config = {
      enabled: true,
      autoSync: true,
      syncInterval: 60000, // 1 minute
      maxAlerts: 10,
      enableHapticFeedback: true,
      enableVoiceCommands: true,
      batteryOptimization: true,
    };
  }

  static getInstance(): WearableManager {
    if (!WearableManager.instance) {
      WearableManager.instance = new WearableManager();
    }
    return WearableManager.instance;
  }

  /**
   * Initialize wearable manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('⌚ Initializing Wearable Manager...');

    try {
      await this.loadConfiguration();
      this.setupEventListeners();
      await this.discoverDevices();
      
      if (this.config.enabled && this.config.autoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log('✅ Wearable Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Wearable Manager:', error);
    }
  }

  /**
   * Load configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('wearable_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load wearable config:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for wearable connection events
    DeviceEventEmitter.addListener('WearableConnected', this.handleDeviceConnected.bind(this));
    DeviceEventEmitter.addListener('WearableDisconnected', this.handleDeviceDisconnected.bind(this));
    DeviceEventEmitter.addListener('WearableMessage', this.handleWearableMessage.bind(this));
    DeviceEventEmitter.addListener('WearableCommand', this.handleWearableCommand.bind(this));
  }

  /**
   * Discover available wearable devices
   */
  private async discoverDevices(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await this.discoverAppleWatch();
      } else if (Platform.OS === 'android') {
        await this.discoverWearOS();
      }
    } catch (error) {
      console.warn('Failed to discover wearable devices:', error);
    }
  }

  /**
   * Discover Apple Watch
   */
  private async discoverAppleWatch(): Promise<void> {
    const { WatchConnectivity } = NativeModules;
    
    if (WatchConnectivity) {
      try {
        const isSupported = await WatchConnectivity.isSupported();
        const isPaired = await WatchConnectivity.isPaired();
        const isReachable = await WatchConnectivity.isReachable();

        if (isSupported && isPaired) {
          const device: WearableDevice = {
            id: 'apple_watch',
            name: 'Apple Watch',
            type: 'apple_watch',
            isConnected: isReachable,
            lastSeen: Date.now(),
            capabilities: ['alerts', 'commands', 'haptic', 'voice'],
          };

          this.connectedDevices.set(device.id, device);
          console.log('📱 Apple Watch discovered and connected');
        }
      } catch (error) {
        console.warn('Failed to connect to Apple Watch:', error);
      }
    }
  }

  /**
   * Discover Wear OS devices
   */
  private async discoverWearOS(): Promise<void> {
    const { WearableAPI } = NativeModules;
    
    if (WearableAPI) {
      try {
        const connectedNodes = await WearableAPI.getConnectedNodes();
        
        for (const node of connectedNodes) {
          const device: WearableDevice = {
            id: node.id,
            name: node.displayName || 'Wear OS Device',
            type: 'wear_os',
            isConnected: true,
            lastSeen: Date.now(),
            capabilities: node.capabilities || ['alerts', 'commands'],
          };

          this.connectedDevices.set(device.id, device);
          console.log(`📱 Wear OS device discovered: ${device.name}`);
        }
      } catch (error) {
        console.warn('Failed to connect to Wear OS devices:', error);
      }
    }
  }

  /**
   * Send alert to wearable devices
   */
  async sendAlert(alert: any): Promise<void> {
    if (!this.config.enabled || this.connectedDevices.size === 0) return;

    const message: WearableMessage = {
      id: `alert_${Date.now()}`,
      type: 'alert',
      payload: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        server: alert.server,
        timestamp: alert.timestamp,
        actions: ['acknowledge', 'resolve', 'snooze'],
      },
      timestamp: Date.now(),
      priority: this.getAlertPriority(alert.severity),
    };

    await this.sendMessageToAllDevices(message);
  }

  /**
   * Send status update to wearables
   */
  async sendStatusUpdate(status: any): Promise<void> {
    if (!this.config.enabled || this.connectedDevices.size === 0) return;

    const message: WearableMessage = {
      id: `status_${Date.now()}`,
      type: 'status',
      payload: {
        totalServers: status.totalServers,
        onlineServers: status.onlineServers,
        activeAlerts: status.activeAlerts,
        systemHealth: status.systemHealth,
        lastUpdate: Date.now(),
      },
      timestamp: Date.now(),
      priority: 'normal',
    };

    await this.sendMessageToAllDevices(message);
  }

  /**
   * Send message to all connected devices
   */
  private async sendMessageToAllDevices(message: WearableMessage): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [deviceId, device] of this.connectedDevices) {
      if (device.isConnected) {
        promises.push(this.sendMessageToDevice(deviceId, message));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Send message to specific device
   */
  private async sendMessageToDevice(deviceId: string, message: WearableMessage): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.isConnected) return;

    try {
      if (device.type === 'apple_watch') {
        await this.sendToAppleWatch(message);
      } else if (device.type === 'wear_os') {
        await this.sendToWearOS(deviceId, message);
      }

      console.log(`⌚ Message sent to ${device.name}: ${message.type}`);
    } catch (error) {
      console.warn(`Failed to send message to ${device.name}:`, error);
      
      // Mark device as disconnected if send fails
      device.isConnected = false;
    }
  }

  /**
   * Send message to Apple Watch
   */
  private async sendToAppleWatch(message: WearableMessage): Promise<void> {
    const { WatchConnectivity } = NativeModules;
    
    if (WatchConnectivity) {
      const payload = {
        messageType: message.type,
        messageId: message.id,
        priority: message.priority,
        timestamp: message.timestamp,
        data: message.payload,
      };

      if (message.priority === 'urgent') {
        // Use immediate message for urgent alerts
        await WatchConnectivity.sendMessage(payload);
      } else {
        // Use application context for normal updates
        await WatchConnectivity.updateApplicationContext(payload);
      }
    }
  }

  /**
   * Send message to Wear OS device
   */
  private async sendToWearOS(deviceId: string, message: WearableMessage): Promise<void> {
    const { WearableAPI } = NativeModules;
    
    if (WearableAPI) {
      const payload = JSON.stringify({
        messageType: message.type,
        messageId: message.id,
        priority: message.priority,
        timestamp: message.timestamp,
        data: message.payload,
      });

      await WearableAPI.sendMessage(deviceId, '/sams_message', payload);
    }
  }

  /**
   * Handle device connected event
   */
  private handleDeviceConnected(event: any): void {
    const device: WearableDevice = {
      id: event.deviceId,
      name: event.deviceName || 'Unknown Device',
      type: event.deviceType || 'unknown',
      isConnected: true,
      lastSeen: Date.now(),
      capabilities: event.capabilities || [],
    };

    this.connectedDevices.set(device.id, device);
    console.log(`⌚ Device connected: ${device.name}`);

    // Send initial status update
    this.sendInitialSync(device.id);
  }

  /**
   * Handle device disconnected event
   */
  private handleDeviceDisconnected(event: any): void {
    const device = this.connectedDevices.get(event.deviceId);
    if (device) {
      device.isConnected = false;
      console.log(`⌚ Device disconnected: ${device.name}`);
    }
  }

  /**
   * Handle message from wearable
   */
  private handleWearableMessage(event: any): void {
    console.log('⌚ Received message from wearable:', event);
    
    // Process wearable messages (commands, responses, etc.)
    if (event.messageType === 'command') {
      this.handleWearableCommand(event);
    }
  }

  /**
   * Handle command from wearable
   */
  private handleWearableCommand(event: any): void {
    const { command, alertId, data } = event;

    switch (command) {
      case 'acknowledge_alert':
        this.acknowledgeAlert(alertId);
        break;
      case 'resolve_alert':
        this.resolveAlert(alertId);
        break;
      case 'snooze_alert':
        this.snoozeAlert(alertId, data.duration);
        break;
      case 'get_status':
        this.sendStatusUpdate(data);
        break;
      default:
        console.warn('Unknown wearable command:', command);
    }
  }

  /**
   * Send initial sync to device
   */
  private async sendInitialSync(deviceId: string): Promise<void> {
    // Send current status and recent alerts
    const message: WearableMessage = {
      id: `sync_${Date.now()}`,
      type: 'status',
      payload: {
        syncType: 'initial',
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      priority: 'normal',
    };

    await this.sendMessageToDevice(deviceId, message);
  }

  /**
   * Get alert priority for wearable
   */
  private getAlertPriority(severity: string): WearableMessage['priority'] {
    switch (severity) {
      case 'critical':
        return 'urgent';
      case 'warning':
        return 'high';
      case 'info':
        return 'normal';
      default:
        return 'low';
    }
  }

  /**
   * Acknowledge alert from wearable
   */
  private acknowledgeAlert(alertId: string): void {
    DeviceEventEmitter.emit('AlertAction', {
      action: 'acknowledge',
      alertId,
      source: 'wearable',
    });
  }

  /**
   * Resolve alert from wearable
   */
  private resolveAlert(alertId: string): void {
    DeviceEventEmitter.emit('AlertAction', {
      action: 'resolve',
      alertId,
      source: 'wearable',
    });
  }

  /**
   * Snooze alert from wearable
   */
  private snoozeAlert(alertId: string, duration: number): void {
    DeviceEventEmitter.emit('AlertAction', {
      action: 'snooze',
      alertId,
      duration,
      source: 'wearable',
    });
  }

  /**
   * Start auto sync
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      this.syncWithWearables();
    }, this.config.syncInterval);

    console.log(`⌚ Wearable auto-sync started (${this.config.syncInterval}ms)`);
  }

  /**
   * Sync with all wearables
   */
  private async syncWithWearables(): Promise<void> {
    if (this.connectedDevices.size === 0) return;

    console.log('🔄 Syncing with wearables...');
    
    // Send heartbeat and status update
    const message: WearableMessage = {
      id: `heartbeat_${Date.now()}`,
      type: 'heartbeat',
      payload: {
        timestamp: Date.now(),
        connectedDevices: this.connectedDevices.size,
      },
      timestamp: Date.now(),
      priority: 'low',
    };

    await this.sendMessageToAllDevices(message);
  }

  /**
   * Get connected devices
   */
  getConnectedDevices(): WearableDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<WearableConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await AsyncStorage.setItem('wearable_config', JSON.stringify(this.config));

    // Restart sync if interval changed
    if (newConfig.syncInterval || newConfig.autoSync !== undefined) {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
      }
      
      if (this.config.enabled && this.config.autoSync) {
        this.startAutoSync();
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): WearableConfig {
    return { ...this.config };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // Remove event listeners
    DeviceEventEmitter.removeAllListeners('WearableConnected');
    DeviceEventEmitter.removeAllListeners('WearableDisconnected');
    DeviceEventEmitter.removeAllListeners('WearableMessage');
    DeviceEventEmitter.removeAllListeners('WearableCommand');

    this.isInitialized = false;
    console.log('🧹 Wearable Manager cleaned up');
  }
}

export default WearableManager;
export { WearableDevice, WearableMessage, WearableConfig };
