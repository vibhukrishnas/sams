/**
 * Platform-Specific Notification Styles and Handling
 * Provides native notification experiences for iOS and Android
 */

import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-push-notification-ios/push-notification-ios';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  serverName: string;
  timestamp: string;
  actionable?: boolean;
  category?: string;
}

interface NotificationAction {
  id: string;
  title: string;
  options?: {
    foreground?: boolean;
    destructive?: boolean;
    authenticationRequired?: boolean;
  };
}

class PlatformNotifications {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize platform-specific notification system
   */
  private initialize() {
    if (this.isInitialized) return;

    if (Platform.OS === 'ios') {
      this.initializeIOS();
    } else if (Platform.OS === 'android') {
      this.initializeAndroid();
    }

    this.isInitialized = true;
  }

  /**
   * Initialize iOS notifications with categories and actions
   */
  private initializeIOS() {
    console.log('🍎 Initializing iOS notifications...');

    // Configure notification categories with actions
    const categories = [
      {
        id: 'ALERT_CATEGORY',
        actions: [
          {
            id: 'ACKNOWLEDGE_ACTION',
            title: 'Acknowledge',
            options: { foreground: false },
          },
          {
            id: 'VIEW_ACTION',
            title: 'View Details',
            options: { foreground: true },
          },
          {
            id: 'SNOOZE_ACTION',
            title: 'Snooze',
            options: { foreground: false },
          },
        ],
      },
      {
        id: 'CRITICAL_ALERT_CATEGORY',
        actions: [
          {
            id: 'ACKNOWLEDGE_ACTION',
            title: 'Acknowledge',
            options: { foreground: false },
          },
          {
            id: 'ESCALATE_ACTION',
            title: 'Escalate',
            options: { foreground: true, destructive: false },
          },
          {
            id: 'VIEW_ACTION',
            title: 'View Details',
            options: { foreground: true },
          },
        ],
      },
    ];

    // Set notification categories
    PushNotificationIOS.setNotificationCategories(categories);

    // Handle notification actions
    PushNotificationIOS.addEventListener('localNotification', this.handleIOSNotification);
    PushNotificationIOS.addEventListener('remoteNotification', this.handleIOSNotification);

    console.log('✅ iOS notifications initialized');
  }

  /**
   * Initialize Android notifications with channels
   */
  private initializeAndroid() {
    console.log('🤖 Initializing Android notifications...');

    // Create notification channels
    PushNotification.createChannel(
      {
        channelId: 'sams-critical',
        channelName: 'Critical Alerts',
        channelDescription: 'Critical system alerts requiring immediate attention',
        importance: 5, // IMPORTANCE_HIGH
        vibrate: true,
        vibration: 1000,
        playSound: true,
        soundName: 'default',
        showBadge: true,
      },
      (created) => console.log(`Critical channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'sams-high',
        channelName: 'High Priority Alerts',
        channelDescription: 'High priority alerts',
        importance: 4, // IMPORTANCE_DEFAULT
        vibrate: true,
        vibration: 500,
        playSound: true,
        soundName: 'default',
        showBadge: true,
      },
      (created) => console.log(`High priority channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'sams-medium',
        channelName: 'Medium Priority Alerts',
        channelDescription: 'Medium priority alerts',
        importance: 3, // IMPORTANCE_LOW
        vibrate: false,
        playSound: false,
        showBadge: true,
      },
      (created) => console.log(`Medium priority channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'sams-low',
        channelName: 'Low Priority Alerts',
        channelDescription: 'Low priority alerts and information',
        importance: 2, // IMPORTANCE_MIN
        vibrate: false,
        playSound: false,
        showBadge: false,
      },
      (created) => console.log(`Low priority channel created: ${created}`)
    );

    // Configure push notifications
    PushNotification.configure({
      onNotification: this.handleAndroidNotification,
      requestPermissions: Platform.OS === 'ios',
    });

    console.log('✅ Android notifications initialized');
  }

  /**
   * Handle iOS notification interactions
   */
  private handleIOSNotification = (notification: any) => {
    console.log('📱 iOS notification received:', notification);

    if (notification.userInteraction) {
      // User tapped notification or action
      const action = notification.action;
      const alertId = notification.userInfo?.alertId;

      switch (action) {
        case 'ACKNOWLEDGE_ACTION':
          this.handleAcknowledgeAction(alertId);
          break;
        case 'VIEW_ACTION':
          this.handleViewAction(alertId);
          break;
        case 'SNOOZE_ACTION':
          this.handleSnoozeAction(alertId);
          break;
        case 'ESCALATE_ACTION':
          this.handleEscalateAction(alertId);
          break;
        default:
          this.handleViewAction(alertId);
          break;
      }
    }
  };

  /**
   * Handle Android notification interactions
   */
  private handleAndroidNotification = (notification: any) => {
    console.log('📱 Android notification received:', notification);

    if (notification.userInteraction) {
      const action = notification.action;
      const alertId = notification.data?.alertId;

      switch (action) {
        case 'Acknowledge':
          this.handleAcknowledgeAction(alertId);
          break;
        case 'View':
          this.handleViewAction(alertId);
          break;
        case 'Snooze':
          this.handleSnoozeAction(alertId);
          break;
        case 'Escalate':
          this.handleEscalateAction(alertId);
          break;
        default:
          this.handleViewAction(alertId);
          break;
      }
    }
  };

  /**
   * Send platform-specific notification
   */
  async sendNotification(data: NotificationData): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.sendIOSNotification(data);
    } else if (Platform.OS === 'android') {
      await this.sendAndroidNotification(data);
    }
  }

  /**
   * Send iOS notification with native styling
   */
  private async sendIOSNotification(data: NotificationData): Promise<void> {
    const category = data.severity === 'critical' ? 'CRITICAL_ALERT_CATEGORY' : 'ALERT_CATEGORY';
    
    const notification = {
      alertTitle: data.title,
      alertBody: `${data.serverName}: ${data.message}`,
      category: category,
      userInfo: {
        alertId: data.id,
        severity: data.severity,
        serverName: data.serverName,
        timestamp: data.timestamp,
      },
      isCritical: data.severity === 'critical',
      fireDate: new Date(),
    };

    PushNotificationIOS.scheduleLocalNotification(notification);
    console.log('📤 iOS notification sent:', data.title);
  }

  /**
   * Send Android notification with Material Design styling
   */
  private async sendAndroidNotification(data: NotificationData): Promise<void> {
    const channelId = `sams-${data.severity}`;
    const priority = this.getAndroidPriority(data.severity);
    
    const actions = data.actionable ? [
      { title: 'Acknowledge', pressAction: { id: 'acknowledge' } },
      { title: 'View', pressAction: { id: 'view' } },
    ] : [];

    if (data.severity === 'critical') {
      actions.push({ title: 'Escalate', pressAction: { id: 'escalate' } });
    } else {
      actions.push({ title: 'Snooze', pressAction: { id: 'snooze' } });
    }

    const notification = {
      channelId: channelId,
      title: data.title,
      message: `${data.serverName}: ${data.message}`,
      priority: priority,
      importance: priority,
      data: {
        alertId: data.id,
        severity: data.severity,
        serverName: data.serverName,
        timestamp: data.timestamp,
      },
      actions: actions,
      color: this.getSeverityColor(data.severity),
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: `Server: ${data.serverName}\nSeverity: ${data.severity.toUpperCase()}\nTime: ${new Date(data.timestamp).toLocaleString()}\n\n${data.message}`,
      subText: `SAMS Alert - ${data.severity.toUpperCase()}`,
      group: 'sams_alerts',
      groupSummary: false,
      ongoing: data.severity === 'critical',
      autoCancel: data.severity !== 'critical',
      when: new Date(data.timestamp).getTime(),
      usesChronometer: false,
      timeoutAfter: data.severity === 'critical' ? null : 30000,
    };

    PushNotification.localNotification(notification);
    console.log('📤 Android notification sent:', data.title);
  }

  /**
   * Get Android notification priority based on severity
   */
  private getAndroidPriority(severity: string): string {
    switch (severity) {
      case 'critical': return 'max';
      case 'high': return 'high';
      case 'medium': return 'default';
      case 'low': return 'low';
      case 'info': return 'min';
      default: return 'default';
    }
  }

  /**
   * Get notification color based on severity
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      case 'info': return '#2196F3';
      default: return '#2196F3';
    }
  }

  /**
   * Handle acknowledge action
   */
  private async handleAcknowledgeAction(alertId: string): Promise<void> {
    console.log('✅ Acknowledging alert:', alertId);
    // In real implementation, call API to acknowledge alert
  }

  /**
   * Handle view action
   */
  private async handleViewAction(alertId: string): Promise<void> {
    console.log('👁️ Viewing alert:', alertId);
    // In real implementation, navigate to alert details
  }

  /**
   * Handle snooze action
   */
  private async handleSnoozeAction(alertId: string): Promise<void> {
    console.log('⏰ Snoozing alert:', alertId);
    // In real implementation, snooze alert for specified duration
  }

  /**
   * Handle escalate action
   */
  private async handleEscalateAction(alertId: string): Promise<void> {
    console.log('🚨 Escalating alert:', alertId);
    // In real implementation, escalate alert to higher priority
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeAllDeliveredNotifications();
    } else if (Platform.OS === 'android') {
      PushNotification.cancelAllLocalNotifications();
    }
  }

  /**
   * Clear specific notification
   */
  clearNotification(notificationId: string): void {
    if (Platform.OS === 'android') {
      PushNotification.cancelLocalNotifications({ id: notificationId });
    }
    // iOS notifications are cleared automatically when tapped
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<any> {
    if (Platform.OS === 'ios') {
      return await PushNotificationIOS.checkPermissions();
    } else {
      // Android permissions are handled during channel creation
      return { alert: true, badge: true, sound: true };
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<any> {
    if (Platform.OS === 'ios') {
      return await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
        critical: true,
      });
    } else {
      // Android permissions are handled automatically
      return { alert: true, badge: true, sound: true };
    }
  }
}

// Export singleton instance
export const platformNotifications = new PlatformNotifications();

// Export types
export type { NotificationData, NotificationAction };

export default platformNotifications;
