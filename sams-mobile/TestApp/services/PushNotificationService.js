/**
 * 🔥 ENTERPRISE PUSH NOTIFICATION SERVICE
 * Handles FCM/APNs push notifications for critical alerts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';

class PushNotificationService {
  constructor() {
    this.fcmToken = null;
    this.isInitialized = false;
    this.notificationQueue = [];
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.badgeCount = 0;
  }

  /**
   * Initialize push notification service
   */
  async initialize() {
    try {
      console.log('🔥 PushNotificationService: Initializing...');
      
      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.error('PushNotificationService: Permission denied');
        return false;
      }

      // Configure local notifications
      this.configureLocalNotifications();
      
      // Configure Firebase messaging
      await this.configureFirebaseMessaging();
      
      // Get FCM token
      await this.getFCMToken();
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      this.isInitialized = true;
      console.log('🔥 PushNotificationService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('PushNotificationService initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
               authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      } else {
        // Android permissions are handled automatically
        return true;
      }
    } catch (error) {
      console.error('PushNotificationService: Permission request error', error);
      return false;
    }
  }

  /**
   * Configure local notifications
   */
  configureLocalNotifications() {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('PushNotificationService: Local token registered', token);
      },
      
      onNotification: (notification) => {
        console.log('PushNotificationService: Local notification received', notification);
        this.handleLocalNotification(notification);
      },
      
      onAction: (notification) => {
        console.log('PushNotificationService: Notification action', notification);
        this.handleNotificationAction(notification);
      },
      
      onRegistrationError: (error) => {
        console.error('PushNotificationService: Registration error', error);
      },
      
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }
  }

  /**
   * Create Android notification channels
   */
  createNotificationChannels() {
    const channels = [
      {
        channelId: 'critical-alerts',
        channelName: 'Critical Alerts',
        channelDescription: 'Critical system alerts requiring immediate attention',
        importance: 4,
        vibrate: true,
        sound: 'default',
      },
      {
        channelId: 'high-alerts',
        channelName: 'High Priority Alerts',
        channelDescription: 'High priority system alerts',
        importance: 3,
        vibrate: true,
        sound: 'default',
      },
      {
        channelId: 'medium-alerts',
        channelName: 'Medium Priority Alerts',
        channelDescription: 'Medium priority system alerts',
        importance: 2,
        vibrate: false,
        sound: 'default',
      },
      {
        channelId: 'low-alerts',
        channelName: 'Low Priority Alerts',
        channelDescription: 'Low priority system notifications',
        importance: 1,
        vibrate: false,
        sound: null,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(channel, (created) => {
        console.log(`PushNotificationService: Channel ${channel.channelId} created:`, created);
      });
    });
  }

  /**
   * Configure Firebase messaging
   */
  async configureFirebaseMessaging() {
    try {
      // Enable auto initialization
      await messaging().setAutoInitEnabled(true);
      
      // Set background message handler
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('PushNotificationService: Background message received', remoteMessage);
        await this.handleBackgroundMessage(remoteMessage);
      });
      
      console.log('PushNotificationService: Firebase messaging configured');
    } catch (error) {
      console.error('PushNotificationService: Firebase configuration error', error);
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      // Store token locally
      await AsyncStorage.setItem('fcmToken', token);
      
      // Send token to backend
      await this.registerTokenWithBackend(token);
      
      console.log('🔥 PushNotificationService: FCM Token obtained', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('PushNotificationService: FCM token error', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend
   */
  async registerTokenWithBackend(token) {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      
      const response = await fetch('http://192.168.1.10:8080/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          token,
          platform: Platform.OS,
          deviceInfo: {
            model: Platform.constants.Model || 'Unknown',
            version: Platform.Version,
          },
        }),
      });

      if (response.ok) {
        console.log('PushNotificationService: Token registered with backend');
      } else {
        console.error('PushNotificationService: Backend registration failed');
      }
    } catch (error) {
      console.error('PushNotificationService: Backend registration error', error);
    }
  }

  /**
   * Setup message handlers
   */
  setupMessageHandlers() {
    // Foreground message handler
    messaging().onMessage(async (remoteMessage) => {
      console.log('PushNotificationService: Foreground message received', remoteMessage);
      await this.handleForegroundMessage(remoteMessage);
    });

    // Token refresh handler
    messaging().onTokenRefresh(async (token) => {
      console.log('PushNotificationService: Token refreshed', token);
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      await this.registerTokenWithBackend(token);
    });

    // Notification opened handler
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('PushNotificationService: Notification opened app', remoteMessage);
      this.handleNotificationOpened(remoteMessage);
    });

    // Check if app was opened from notification
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('PushNotificationService: App opened from notification', remoteMessage);
        this.handleNotificationOpened(remoteMessage);
      }
    });
  }

  /**
   * Handle foreground messages
   */
  async handleForegroundMessage(remoteMessage) {
    const { notification, data } = remoteMessage;
    
    // Show local notification for foreground messages
    this.showLocalNotification({
      title: notification?.title || 'SAMS Alert',
      message: notification?.body || 'New system alert',
      data: data || {},
      priority: this.getPriorityFromData(data),
    });
  }

  /**
   * Handle background messages
   */
  async handleBackgroundMessage(remoteMessage) {
    const { notification, data } = remoteMessage;
    
    console.log('PushNotificationService: Processing background message');
    
    // Update badge count
    this.updateBadgeCount(1);
    
    // Store notification for when app opens
    await this.storeNotificationForLater(remoteMessage);
  }

  /**
   * Show local notification
   */
  showLocalNotification({ title, message, data = {}, priority = 'medium' }) {
    const channelId = `${priority}-alerts`;
    
    PushNotification.localNotification({
      channelId,
      title,
      message,
      playSound: this.soundEnabled,
      vibrate: this.vibrationEnabled,
      priority: this.getAndroidPriority(priority),
      importance: this.getAndroidImportance(priority),
      userInfo: data,
      actions: this.getNotificationActions(priority),
      category: 'SAMS_ALERT',
      id: Date.now(),
    });
  }

  /**
   * Get notification actions based on priority
   */
  getNotificationActions(priority) {
    const baseActions = ['View', 'Dismiss'];
    
    if (priority === 'critical' || priority === 'high') {
      return [...baseActions, 'Acknowledge'];
    }
    
    return baseActions;
  }

  /**
   * Handle local notification
   */
  handleLocalNotification(notification) {
    console.log('PushNotificationService: Handling local notification', notification);
    
    // Update app state or navigate to relevant screen
    this.notifyAppOfNotification(notification);
  }

  /**
   * Handle notification action
   */
  handleNotificationAction(notification) {
    const { action, userInfo } = notification;
    
    console.log('PushNotificationService: Handling action', action);
    
    switch (action) {
      case 'View':
        this.navigateToAlert(userInfo);
        break;
      case 'Acknowledge':
        this.acknowledgeAlert(userInfo);
        break;
      case 'Dismiss':
        this.dismissNotification(notification.id);
        break;
    }
  }

  /**
   * Handle notification opened
   */
  handleNotificationOpened(remoteMessage) {
    const { data } = remoteMessage;
    
    if (data?.alertId) {
      this.navigateToAlert(data);
    } else if (data?.serverId) {
      this.navigateToServer(data);
    }
  }

  /**
   * Navigate to alert
   */
  navigateToAlert(data) {
    // This will be handled by navigation service
    console.log('PushNotificationService: Navigate to alert', data.alertId);
  }

  /**
   * Navigate to server
   */
  navigateToServer(data) {
    // This will be handled by navigation service
    console.log('PushNotificationService: Navigate to server', data.serverId);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(data) {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`http://192.168.1.10:8080/api/alerts/${data.alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        console.log('PushNotificationService: Alert acknowledged');
        this.showLocalNotification({
          title: 'Alert Acknowledged',
          message: 'Alert has been acknowledged successfully',
          priority: 'low',
        });
      }
    } catch (error) {
      console.error('PushNotificationService: Acknowledge error', error);
    }
  }

  /**
   * Update badge count
   */
  updateBadgeCount(increment = 0) {
    this.badgeCount += increment;
    PushNotification.setApplicationIconBadgeNumber(this.badgeCount);
  }

  /**
   * Clear badge count
   */
  clearBadgeCount() {
    this.badgeCount = 0;
    PushNotification.setApplicationIconBadgeNumber(0);
  }

  /**
   * Get priority from data
   */
  getPriorityFromData(data) {
    return data?.priority || data?.severity || 'medium';
  }

  /**
   * Get Android priority
   */
  getAndroidPriority(priority) {
    const priorities = {
      critical: 'max',
      high: 'high',
      medium: 'default',
      low: 'low',
    };
    return priorities[priority] || 'default';
  }

  /**
   * Get Android importance
   */
  getAndroidImportance(priority) {
    const importance = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return importance[priority] || 2;
  }

  /**
   * Store notification for later
   */
  async storeNotificationForLater(notification) {
    try {
      const stored = await AsyncStorage.getItem('pendingNotifications') || '[]';
      const notifications = JSON.parse(stored);
      notifications.push({
        ...notification,
        receivedAt: new Date().toISOString(),
      });
      
      // Keep only last 50 notifications
      const recent = notifications.slice(-50);
      await AsyncStorage.setItem('pendingNotifications', JSON.stringify(recent));
    } catch (error) {
      console.error('PushNotificationService: Store notification error', error);
    }
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications() {
    try {
      const stored = await AsyncStorage.getItem('pendingNotifications') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      console.error('PushNotificationService: Get pending notifications error', error);
      return [];
    }
  }

  /**
   * Clear pending notifications
   */
  async clearPendingNotifications() {
    try {
      await AsyncStorage.removeItem('pendingNotifications');
      this.clearBadgeCount();
    } catch (error) {
      console.error('PushNotificationService: Clear pending notifications error', error);
    }
  }

  /**
   * Notify app of notification
   */
  notifyAppOfNotification(notification) {
    // This will be handled by app state management
    console.log('PushNotificationService: Notifying app of notification');
  }

  /**
   * Dismiss notification
   */
  dismissNotification(notificationId) {
    PushNotification.cancelLocalNotifications({ id: notificationId });
  }

  /**
   * Get FCM token
   */
  getFCMTokenSync() {
    return this.fcmToken;
  }

  /**
   * Check if initialized
   */
  isServiceInitialized() {
    return this.isInitialized;
  }
}

export default new PushNotificationService();
