/**
 * 📱 Mobile Features Service
 * Handles offline functionality, push notifications, and quick actions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import PushNotification from 'react-native-push-notification';
import { Alert, Vibration } from 'react-native';

interface CachedData {
  alerts: any[];
  servers: any[];
  commands: any[];
  lastSync: Date;
  version: string;
}

interface NotificationConfig {
  enabled: boolean;
  grouping: boolean;
  doNotDisturb: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  channels: {
    critical: boolean;
    high: boolean;
    medium: boolean;
    low: boolean;
    info: boolean;
  };
}

interface QuickAction {
  id: string;
  title: string;
  type: 'acknowledge' | 'escalate' | 'resolve' | 'command' | 'contact';
  icon: string;
  data?: any;
}

class MobileFeatures {
  private static instance: MobileFeatures;
  private isOnline: boolean = true;
  private syncQueue: any[] = [];
  private notificationConfig: NotificationConfig;

  private constructor() {
    this.notificationConfig = {
      enabled: true,
      grouping: true,
      doNotDisturb: {
        enabled: false,
        startTime: '22:00',
        endTime: '06:00',
      },
      channels: {
        critical: true,
        high: true,
        medium: true,
        low: false,
        info: false,
      },
    };

    this.initializeNetworkMonitoring();
    this.initializePushNotifications();
  }

  public static getInstance(): MobileFeatures {
    if (!MobileFeatures.instance) {
      MobileFeatures.instance = new MobileFeatures();
    }
    return MobileFeatures.instance;
  }

  // ==================== OFFLINE FUNCTIONALITY ====================

  private initializeNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        this.handleReconnection();
      }
    });
  }

  async cacheData(type: 'alerts' | 'servers' | 'commands', data: any[]) {
    try {
      const cacheKey = `sams_cache_${type}`;
      const cacheData = {
        data,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Failed to cache ${type}:`, error);
    }
  }

  async getCachedData(type: 'alerts' | 'servers' | 'commands'): Promise<any[]> {
    try {
      const cacheKey = `sams_cache_${type}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        return cacheData.data || [];
      }
    } catch (error) {
      console.error(`Failed to get cached ${type}:`, error);
    }
    return [];
  }

  async getOfflineAlerts() {
    return this.getCachedData('alerts');
  }

  async getOfflineServers() {
    return this.getCachedData('servers');
  }

  async getOfflineCommands() {
    return this.getCachedData('commands');
  }

  async queueAction(action: any) {
    this.syncQueue.push({
      ...action,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
    await AsyncStorage.setItem('sams_sync_queue', JSON.stringify(this.syncQueue));
  }

  private async handleReconnection() {
    try {
      // Show reconnection notification
      this.showLocalNotification({
        title: 'SAMS Connected',
        message: 'Syncing offline changes...',
        type: 'info',
      });

      // Process sync queue
      const queueData = await AsyncStorage.getItem('sams_sync_queue');
      if (queueData) {
        const queue = JSON.parse(queueData);
        await this.processSyncQueue(queue);
        await AsyncStorage.removeItem('sams_sync_queue');
        this.syncQueue = [];
      }

      // Refresh cached data
      await this.refreshCachedData();

      this.showLocalNotification({
        title: 'SAMS Sync Complete',
        message: 'All offline changes have been synchronized.',
        type: 'info',
      });
    } catch (error) {
      console.error('Reconnection sync failed:', error);
    }
  }

  private async processSyncQueue(queue: any[]) {
    for (const action of queue) {
      try {
        // Process each queued action
        await this.processQueuedAction(action);
      } catch (error) {
        console.error('Failed to process queued action:', action, error);
      }
    }
  }

  private async processQueuedAction(action: any) {
    switch (action.type) {
      case 'acknowledge_alert':
        // API call to acknowledge alert
        break;
      case 'execute_command':
        // API call to execute command
        break;
      case 'update_server':
        // API call to update server
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  private async refreshCachedData() {
    // Refresh all cached data from server
    // This would typically make API calls to get fresh data
  }

  // ==================== PUSH NOTIFICATIONS ====================

  private initializePushNotifications() {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Push notification token:', token);
        this.registerDeviceToken(token.token);
      },

      onNotification: (notification) => {
        this.handleNotificationReceived(notification);
      },

      onAction: (notification) => {
        this.handleNotificationAction(notification);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

    this.createNotificationChannels();
  }

  private createNotificationChannels() {
    const channels = [
      {
        channelId: 'critical',
        channelName: 'Critical Alerts',
        channelDescription: 'Critical system alerts requiring immediate attention',
        importance: 4,
        vibrate: true,
        sound: 'critical_alert.mp3',
      },
      {
        channelId: 'high',
        channelName: 'High Priority',
        channelDescription: 'High priority alerts',
        importance: 3,
        vibrate: true,
      },
      {
        channelId: 'medium',
        channelName: 'Medium Priority',
        channelDescription: 'Medium priority alerts',
        importance: 2,
      },
      {
        channelId: 'low',
        channelName: 'Low Priority',
        channelDescription: 'Low priority alerts',
        importance: 1,
      },
      {
        channelId: 'info',
        channelName: 'Information',
        channelDescription: 'Informational notifications',
        importance: 1,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(channel, () => {});
    });
  }

  private async registerDeviceToken(token: string) {
    try {
      // Register device token with backend
      await AsyncStorage.setItem('sams_device_token', token);
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  private handleNotificationReceived(notification: any) {
    if (notification.userInteraction) {
      // User tapped the notification
      this.handleNotificationTap(notification);
    } else {
      // Notification received in background/foreground
      this.processIncomingNotification(notification);
    }
  }

  private handleNotificationAction(notification: any) {
    const { action, data } = notification;

    switch (action) {
      case 'acknowledge':
        this.quickAcknowledgeAlert(data.alertId);
        break;
      case 'escalate':
        this.quickEscalateAlert(data.alertId);
        break;
      case 'view_details':
        this.navigateToAlert(data.alertId);
        break;
      default:
        console.warn('Unknown notification action:', action);
    }
  }

  private handleNotificationTap(notification: any) {
    // Navigate to appropriate screen based on notification type
    const { type, data } = notification;

    switch (type) {
      case 'alert':
        this.navigateToAlert(data.alertId);
        break;
      case 'server_down':
        this.navigateToServer(data.serverId);
        break;
      case 'command_result':
        this.navigateToCommands();
        break;
      default:
        this.navigateToDashboard();
    }
  }

  private processIncomingNotification(notification: any) {
    // Group similar notifications
    if (this.notificationConfig.grouping) {
      this.groupNotification(notification);
    }

    // Check do not disturb
    if (this.isDoNotDisturbActive()) {
      if (notification.severity !== 'critical') {
        return; // Suppress non-critical notifications
      }
    }

    // Trigger haptic feedback for critical alerts
    if (notification.severity === 'critical') {
      Vibration.vibrate([0, 500, 200, 500]);
    }
  }

  showSmartNotification(alert: any) {
    if (!this.notificationConfig.enabled) return;
    if (!this.notificationConfig.channels[alert.severity]) return;

    const actions = this.getNotificationActions(alert);

    PushNotification.localNotification({
      channelId: alert.severity,
      title: alert.title,
      message: alert.message,
      bigText: alert.description,
      subText: `Server: ${alert.server}`,
      actions: actions,
      userInfo: {
        type: 'alert',
        data: { alertId: alert.id },
      },
      priority: this.getPriorityForSeverity(alert.severity),
      vibrate: alert.severity === 'critical',
      playSound: true,
      soundName: alert.severity === 'critical' ? 'critical_alert.mp3' : 'default',
    });
  }

  private getNotificationActions(alert: any) {
    const actions = ['View Details'];

    if (!alert.acknowledged) {
      actions.push('Acknowledge');
    }

    if (alert.severity === 'critical' || alert.severity === 'high') {
      actions.push('Escalate');
    }

    return actions;
  }

  private getPriorityForSeverity(severity: string): string {
    switch (severity) {
      case 'critical': return 'max';
      case 'high': return 'high';
      case 'medium': return 'default';
      case 'low': return 'low';
      case 'info': return 'min';
      default: return 'default';
    }
  }

  private groupNotification(notification: any) {
    // Implementation for grouping similar notifications
    // This would group notifications by type, server, or time window
  }

  private isDoNotDisturbActive(): boolean {
    if (!this.notificationConfig.doNotDisturb.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTime = this.parseTime(this.notificationConfig.doNotDisturb.startTime);
    const endTime = this.parseTime(this.notificationConfig.doNotDisturb.endTime);

    if (startTime > endTime) {
      // Overnight period (e.g., 22:00 to 06:00)
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Same day period
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  showLocalNotification(options: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }) {
    PushNotification.localNotification({
      channelId: 'info',
      title: options.title,
      message: options.message,
      playSound: false,
      vibrate: false,
    });
  }

  // ==================== QUICK ACTIONS ====================

  async quickAcknowledgeAlert(alertId: string) {
    try {
      if (this.isOnline) {
        // Make API call
        // await api.acknowledgeAlert(alertId);
      } else {
        // Queue for later sync
        await this.queueAction({
          type: 'acknowledge_alert',
          alertId,
        });
      }

      this.showLocalNotification({
        title: 'Alert Acknowledged',
        message: 'Alert has been acknowledged successfully.',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }

  async quickEscalateAlert(alertId: string) {
    try {
      if (this.isOnline) {
        // Make API call
        // await api.escalateAlert(alertId);
      } else {
        // Queue for later sync
        await this.queueAction({
          type: 'escalate_alert',
          alertId,
        });
      }

      this.showLocalNotification({
        title: 'Alert Escalated',
        message: 'Alert has been escalated to the next level.',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to escalate alert:', error);
    }
  }

  // Navigation helpers (these would integrate with your navigation system)
  private navigateToAlert(alertId: string) {
    // Navigate to alert details screen
  }

  private navigateToServer(serverId: string) {
    // Navigate to server details screen
  }

  private navigateToCommands() {
    // Navigate to commands screen
  }

  private navigateToDashboard() {
    // Navigate to dashboard
  }

  // Configuration methods
  updateNotificationConfig(config: Partial<NotificationConfig>) {
    this.notificationConfig = { ...this.notificationConfig, ...config };
    AsyncStorage.setItem('sams_notification_config', JSON.stringify(this.notificationConfig));
  }

  getNotificationConfig(): NotificationConfig {
    return this.notificationConfig;
  }

  isOnlineMode(): boolean {
    return this.isOnline;
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }
}

export default MobileFeatures;
