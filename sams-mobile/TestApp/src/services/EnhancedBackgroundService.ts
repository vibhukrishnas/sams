import BackgroundJob from 'react-native-background-job';
import BackgroundTimer from 'react-native-background-timer';
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store/index';
import { setOnlineStatus, addToQueue } from '../store/slices/offlineSlice';
import { showToast } from '../store/slices/uiSlice';

interface BackgroundTask {
  id: string;
  type: 'sync' | 'health_check' | 'notification' | 'cleanup';
  interval: number; // milliseconds
  lastRun: number;
  enabled: boolean;
}

class EnhancedBackgroundService {
  private isRunning = false;
  private backgroundJobId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private tasks: BackgroundTask[] = [];

  constructor() {
    this.initializeTasks();
    this.setupPushNotifications();
    this.setupNetworkListener();
  }

  /**
   * Initialize background tasks
   */
  private initializeTasks() {
    this.tasks = [
      {
        id: 'data_sync',
        type: 'sync',
        interval: 30000, // 30 seconds
        lastRun: 0,
        enabled: true,
      },
      {
        id: 'health_check',
        type: 'health_check',
        interval: 60000, // 1 minute
        lastRun: 0,
        enabled: true,
      },
      {
        id: 'notification_check',
        type: 'notification',
        interval: 15000, // 15 seconds
        lastRun: 0,
        enabled: true,
      },
      {
        id: 'cache_cleanup',
        type: 'cleanup',
        interval: 300000, // 5 minutes
        lastRun: 0,
        enabled: true,
      },
    ];
  }

  /**
   * Setup push notifications
   */
  private setupPushNotifications() {
    // Configure push notifications
    PushNotification.configure({
      onRegister: (token) => {
        console.log('📱 Push notification token:', token);
        this.storeFCMToken(token.token);
      },
      onNotification: (notification) => {
        console.log('📱 Push notification received:', notification);
        this.handlePushNotification(notification);
      },
      onAction: (notification) => {
        console.log('📱 Push notification action:', notification);
      },
      onRegistrationError: (err) => {
        console.error('📱 Push notification registration error:', err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    // Firebase messaging setup
    this.setupFirebaseMessaging();
  }

  /**
   * Setup Firebase Cloud Messaging
   */
  private async setupFirebaseMessaging() {
    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('📱 FCM Authorization status:', authStatus);
        
        // Get FCM token
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          console.log('📱 FCM Token:', fcmToken);
          await this.storeFCMToken(fcmToken);
        }

        // Listen for token refresh
        messaging().onTokenRefresh(async (token) => {
          console.log('📱 FCM Token refreshed:', token);
          await this.storeFCMToken(token);
        });

        // Handle foreground messages
        messaging().onMessage(async (remoteMessage) => {
          console.log('📱 FCM message received in foreground:', remoteMessage);
          this.handleFCMMessage(remoteMessage);
        });

        // Handle background messages
        messaging().setBackgroundMessageHandler(async (remoteMessage) => {
          console.log('📱 FCM message received in background:', remoteMessage);
          this.handleFCMMessage(remoteMessage);
        });
      }
    } catch (error) {
      console.error('📱 Error setting up FCM:', error);
    }
  }

  /**
   * Store FCM token
   */
  private async storeFCMToken(token: string) {
    try {
      await AsyncStorage.setItem('fcm_token', token);
      
      // Send token to server
      const apiBaseUrl = __DEV__ ? 'http://10.0.2.2:8080' : 'http://192.168.1.10:8080';
      
      fetch(`${apiBaseUrl}/api/v1/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      }).catch(error => {
        console.error('📱 Error sending FCM token to server:', error);
      });
    } catch (error) {
      console.error('📱 Error storing FCM token:', error);
    }
  }

  /**
   * Handle push notification
   */
  private handlePushNotification(notification: any) {
    const { data, userInfo } = notification;
    
    if (data?.type === 'alert') {
      this.showAlertNotification(data);
    } else if (data?.type === 'server_down') {
      this.showServerDownNotification(data);
    } else if (data?.type === 'emergency') {
      this.showEmergencyNotification(data);
    }
  }

  /**
   * Handle FCM message
   */
  private handleFCMMessage(remoteMessage: any) {
    const { notification, data } = remoteMessage;
    
    // Show local notification
    PushNotification.localNotification({
      title: notification?.title || 'SAMS Alert',
      message: notification?.body || 'New alert received',
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });

    // Update app state if needed
    if (data?.type === 'alert') {
      store.dispatch(addToQueue({
        type: 'alerts/fetch',
        payload: {},
        maxRetries: 3,
        priority: 'high',
      }));
    }
  }

  /**
   * Show alert notification
   */
  private showAlertNotification(data: any) {
    PushNotification.localNotification({
      title: `🚨 ${data.severity?.toUpperCase()} Alert`,
      message: data.message || 'New alert received',
      playSound: true,
      soundName: data.severity === 'critical' ? 'emergency.mp3' : 'default',
      vibrate: true,
      vibration: data.severity === 'critical' ? 1000 : 300,
      priority: data.severity === 'critical' ? 'high' : 'default',
      userInfo: data,
    });
  }

  /**
   * Show server down notification
   */
  private showServerDownNotification(data: any) {
    PushNotification.localNotification({
      title: '🔴 Server Offline',
      message: `${data.serverName} is no longer responding`,
      playSound: true,
      soundName: 'alert.mp3',
      vibrate: true,
      priority: 'high',
      userInfo: data,
    });
  }

  /**
   * Show emergency notification
   */
  private showEmergencyNotification(data: any) {
    PushNotification.localNotification({
      title: '🆘 EMERGENCY ALERT',
      message: data.message || 'Emergency situation detected',
      playSound: true,
      soundName: 'emergency.mp3',
      vibrate: true,
      vibration: 2000,
      priority: 'max',
      ongoing: true,
      userInfo: data,
    });
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      store.dispatch(setOnlineStatus(isOnline));
      
      if (isOnline) {
        console.log('📡 Network connection restored');
        store.dispatch(showToast({
          message: 'Connection restored',
          type: 'success',
          duration: 2000,
        }));
      } else {
        console.log('📡 Network connection lost');
        store.dispatch(showToast({
          message: 'Working offline',
          type: 'warning',
          duration: 3000,
        }));
      }
    });
  }

  /**
   * Start background service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Background service already running');
      return;
    }

    try {
      console.log('🚀 Starting background service...');

      // Start background job for iOS
      BackgroundJob.start({
        jobKey: 'samsBackgroundJob',
        period: 15000, // 15 seconds
      });

      // Start periodic tasks
      this.startPeriodicTasks();

      this.isRunning = true;
      console.log('✅ Background service started successfully');
    } catch (error) {
      console.error('❌ Error starting background service:', error);
    }
  }

  /**
   * Stop background service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('🔄 Background service not running');
      return;
    }

    try {
      console.log('🛑 Stopping background service...');

      // Stop background job
      BackgroundJob.stop();

      // Clear intervals
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      this.isRunning = false;
      console.log('✅ Background service stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping background service:', error);
    }
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks() {
    // Data sync task
    this.syncInterval = setInterval(() => {
      this.executeTask('data_sync');
    }, 30000);

    // Health check task
    this.healthCheckInterval = setInterval(() => {
      this.executeTask('health_check');
    }, 60000);
  }

  /**
   * Execute background task
   */
  private async executeTask(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || !task.enabled) return;

    const now = Date.now();
    if (now - task.lastRun < task.interval) return;

    try {
      console.log(`🔄 Executing background task: ${taskId}`);

      switch (task.type) {
        case 'sync':
          await this.syncData();
          break;
        case 'health_check':
          await this.performHealthCheck();
          break;
        case 'notification':
          await this.checkNotifications();
          break;
        case 'cleanup':
          await this.performCleanup();
          break;
      }

      task.lastRun = now;
      console.log(`✅ Background task completed: ${taskId}`);
    } catch (error) {
      console.error(`❌ Error executing background task ${taskId}:`, error);
    }
  }

  /**
   * Sync data in background
   */
  private async syncData() {
    const state = store.getState();
    if (!state.offline.isOnline) return;

    // Sync queued actions
    const queuedActions = state.offline.queuedActions;
    if (queuedActions.length > 0) {
      console.log(`📡 Syncing ${queuedActions.length} queued actions...`);
      // Process queued actions
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck() {
    try {
      const apiBaseUrl = __DEV__ ? 'http://10.0.2.2:8080' : 'http://192.168.1.10:8080';
      const response = await fetch(`${apiBaseUrl}/api/v1/health`, {
        method: 'GET',
        timeout: 5000,
      });

      if (!response.ok) {
        console.warn('⚠️ Health check failed - server not responding');
      }
    } catch (error) {
      console.warn('⚠️ Health check failed:', error);
    }
  }

  /**
   * Check for new notifications
   */
  private async checkNotifications() {
    // Check for new alerts, server status changes, etc.
    console.log('🔔 Checking for new notifications...');
  }

  /**
   * Perform cleanup tasks
   */
  private async performCleanup() {
    try {
      // Clear expired cache
      console.log('🧹 Performing cleanup tasks...');
      
      // Clear old logs
      // Clear temporary files
      // Optimize storage
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: this.tasks,
    };
  }
}

export default new EnhancedBackgroundService();
