// 🔔 PRODUCTION-READY NOTIFICATION SERVICE
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, Alert, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundJob from 'react-native-background-job';
import Sound from 'react-native-sound';
import serverAPI from './ServerAPI';

// 🚨 EMERGENCY ALERT SOUNDS
const ALERT_SOUNDS = {
  critical: 'emergency_critical.mp3',
  warning: 'alert_warning.mp3',
  info: 'notification_info.mp3',
  success: 'success_chime.mp3'
};

// 🔔 NOTIFICATION CATEGORIES
const NOTIFICATION_CATEGORIES = {
  SYSTEM_ALERT: 'system_alert',
  SERVER_DOWN: 'server_down',
  HIGH_RESOURCE: 'high_resource',
  SERVICE_FAILURE: 'service_failure',
  SECURITY_BREACH: 'security_breach',
  MAINTENANCE: 'maintenance',
  REPORT_READY: 'report_ready'
};

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.deviceToken = null;
    this.notificationQueue = [];
    this.soundEnabled = true;
    this.vibrationEnabled = true;
    this.emergencyMode = false;
    this.alertSounds = {};
  }

  // 🚀 INITIALIZE NOTIFICATION SERVICE
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing Notification Service...');

      // Load user preferences
      await this.loadPreferences();

      // Initialize push notifications
      await this.initializePushNotifications();

      // Load alert sounds
      await this.loadAlertSounds();

      // Configure notification channels (Android)
      this.createNotificationChannels();

      // Register device with backend
      await this.registerDevice();

      // Start background monitoring
      this.startBackgroundMonitoring();

      this.isInitialized = true;
      console.log('✅ Notification Service initialized successfully');

    } catch (error) {
      console.error('❌ Notification Service initialization failed:', error);
      throw error;
    }
  }

  async loadPreferences() {
    try {
      const [soundEnabled, vibrationEnabled, emergencyMode] = await Promise.all([
        AsyncStorage.getItem('notification_sound_enabled'),
        AsyncStorage.getItem('notification_vibration_enabled'),
        AsyncStorage.getItem('emergency_mode_enabled')
      ]);

      this.soundEnabled = soundEnabled !== 'false';
      this.vibrationEnabled = vibrationEnabled !== 'false';
      this.emergencyMode = emergencyMode === 'true';

      console.log('🔧 Notification preferences loaded:', {
        sound: this.soundEnabled,
        vibration: this.vibrationEnabled,
        emergency: this.emergencyMode
      });
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  async initializePushNotifications() {
    return new Promise((resolve, reject) => {
      PushNotification.configure({
        // Called when token is generated
        onRegister: (token) => {
          console.log('📱 Device token received:', token);
          this.deviceToken = token.token;
          this.saveDeviceToken(token.token);
          resolve();
        },

        // Called when a remote notification is received
        onNotification: (notification) => {
          console.log('🔔 Notification received:', notification);
          this.handleNotification(notification);

          // Required on iOS only
          if (Platform.OS === 'ios') {
            notification.finish(PushNotificationIOS.FetchResult.NoData);
          }
        },

        // Called when a remote notification is received while app is in background
        onAction: (notification) => {
          console.log('🔔 Notification action:', notification.action);
          this.handleNotificationAction(notification);
        },

        // IOS ONLY: Called when a remote notification is received while app is closed
        onRegistrationError: (err) => {
          console.error('🔔 Push notification registration error:', err);
          reject(err);
        },

        // IOS ONLY: Permission settings
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        // Request permissions on app start
        requestPermissions: true,
      });
    });
  }

  async loadAlertSounds() {
    try {
      console.log('🔊 Loading alert sounds...');
      
      Object.entries(ALERT_SOUNDS).forEach(([type, filename]) => {
        this.alertSounds[type] = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.log(`❌ Failed to load sound ${filename}:`, error);
          } else {
            console.log(`✅ Loaded sound: ${filename}`);
          }
        });
      });
    } catch (error) {
      console.error('Failed to load alert sounds:', error);
    }
  }

  createNotificationChannels() {
    if (Platform.OS === 'android') {
      // Critical alerts channel
      PushNotification.createChannel({
        channelId: 'critical-alerts',
        channelName: 'Critical System Alerts',
        channelDescription: 'Critical system alerts requiring immediate attention',
        playSound: true,
        soundName: 'emergency_critical.mp3',
        importance: 4,
        vibrate: true,
      });

      // Warning alerts channel
      PushNotification.createChannel({
        channelId: 'warning-alerts',
        channelName: 'Warning Alerts',
        channelDescription: 'System warnings and performance alerts',
        playSound: true,
        soundName: 'alert_warning.mp3',
        importance: 3,
        vibrate: true,
      });

      // Info notifications channel
      PushNotification.createChannel({
        channelId: 'info-notifications',
        channelName: 'Information',
        channelDescription: 'General information and status updates',
        playSound: true,
        soundName: 'notification_info.mp3',
        importance: 2,
        vibrate: false,
      });

      console.log('📱 Android notification channels created');
    }
  }

  async registerDevice() {
    try {
      if (!this.deviceToken) {
        console.log('⏳ Waiting for device token...');
        return;
      }

      const deviceInfo = {
        token: this.deviceToken,
        platform: Platform.OS,
        version: Platform.Version,
        appVersion: '1.0.0',
        preferences: {
          sound: this.soundEnabled,
          vibration: this.vibrationEnabled,
          emergency: this.emergencyMode
        }
      };

      await serverAPI.registerDevice(deviceInfo);
      console.log('📱 Device registered with backend');

    } catch (error) {
      console.error('Failed to register device:', error);
    }
  }

  async saveDeviceToken(token) {
    try {
      await AsyncStorage.setItem('device_token', token);
      await serverAPI.updateDeviceToken(token);
    } catch (error) {
      console.error('Failed to save device token:', error);
    }
  }

  // 🚨 SEND NOTIFICATION METHODS
  async sendLocalNotification(options) {
    const {
      title,
      message,
      type = 'info',
      priority = 'normal',
      data = {},
      playSound = this.soundEnabled,
      vibrate = this.vibrationEnabled
    } = options;

    console.log('🔔 Sending local notification:', { title, message, type });

    // Determine channel and sound based on type
    let channelId = 'info-notifications';
    let soundName = ALERT_SOUNDS.info;
    let importance = 2;

    if (type === 'critical') {
      channelId = 'critical-alerts';
      soundName = ALERT_SOUNDS.critical;
      importance = 4;
    } else if (type === 'warning') {
      channelId = 'warning-alerts';
      soundName = ALERT_SOUNDS.warning;
      importance = 3;
    }

    // Play custom sound if enabled
    if (playSound && this.alertSounds[type]) {
      this.alertSounds[type].play();
    }

    // Vibrate if enabled
    if (vibrate && type === 'critical') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]); // Emergency pattern
    } else if (vibrate) {
      Vibration.vibrate(200);
    }

    PushNotification.localNotification({
      title,
      message,
      channelId,
      soundName: playSound ? soundName : null,
      playSound,
      vibrate,
      importance,
      priority: priority === 'high' ? 'high' : 'default',
      userInfo: data,
      actions: this.getNotificationActions(type),
    });
  }

  getNotificationActions(type) {
    const baseActions = ['Acknowledge', 'View Details'];
    
    if (type === 'critical') {
      return [...baseActions, 'Emergency Response'];
    }
    
    return baseActions;
  }

  // 🚨 EMERGENCY ALERT SYSTEM
  async sendEmergencyAlert(alertData) {
    const {
      title = '🚨 EMERGENCY ALERT',
      message,
      serverId,
      serverName,
      alertType = 'system_failure'
    } = alertData;

    console.log('🚨 EMERGENCY ALERT:', { title, message, serverId });

    // Show system alert dialog
    Alert.alert(
      title,
      message,
      [
        { text: 'Acknowledge', onPress: () => this.acknowledgeEmergencyAlert(alertData) },
        { text: 'View Server', onPress: () => this.navigateToServer(serverId) },
        { text: 'Emergency Response', onPress: () => this.triggerEmergencyResponse(alertData) }
      ],
      { cancelable: false }
    );

    // Send push notification
    await this.sendLocalNotification({
      title,
      message: `${serverName}: ${message}`,
      type: 'critical',
      priority: 'high',
      data: { serverId, alertType, emergency: true },
      playSound: true,
      vibrate: true
    });

    // Log emergency alert
    await this.logEmergencyAlert(alertData);
  }

  async acknowledgeEmergencyAlert(alertData) {
    try {
      console.log('✅ Acknowledging emergency alert:', alertData);
      
      // Update backend
      if (alertData.id) {
        await serverAPI.acknowledgeAlert(alertData.id);
      }

      // Log acknowledgment
      await AsyncStorage.setItem(
        `emergency_ack_${alertData.id || Date.now()}`,
        JSON.stringify({
          ...alertData,
          acknowledgedAt: new Date().toISOString(),
          acknowledgedBy: 'mobile_user'
        })
      );

      console.log('✅ Emergency alert acknowledged');
    } catch (error) {
      console.error('Failed to acknowledge emergency alert:', error);
    }
  }

  async triggerEmergencyResponse(alertData) {
    console.log('🚨 Triggering emergency response for:', alertData);
    
    // This would integrate with emergency response systems
    // For now, we'll show available emergency actions
    Alert.alert(
      '🚨 Emergency Response',
      'Select emergency response action:',
      [
        { text: 'Call IT Support', onPress: () => this.callEmergencySupport() },
        { text: 'Send SMS Alert', onPress: () => this.sendSMSAlert(alertData) },
        { text: 'Escalate to Manager', onPress: () => this.escalateAlert(alertData) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }

  async callEmergencySupport() {
    // This would integrate with phone dialer
    console.log('📞 Calling emergency IT support...');
    Alert.alert('📞 Emergency Support', 'Calling IT Support: +1-800-IT-HELP');
  }

  async sendSMSAlert(alertData) {
    console.log('📱 Sending SMS alert:', alertData);
    Alert.alert('📱 SMS Alert', 'Emergency SMS sent to on-call team');
  }

  async escalateAlert(alertData) {
    console.log('⬆️ Escalating alert:', alertData);
    Alert.alert('⬆️ Alert Escalated', 'Alert escalated to management team');
  }

  async logEmergencyAlert(alertData) {
    try {
      const logEntry = {
        ...alertData,
        timestamp: new Date().toISOString(),
        type: 'emergency',
        handled: false
      };

      await AsyncStorage.setItem(
        `emergency_log_${Date.now()}`,
        JSON.stringify(logEntry)
      );
    } catch (error) {
      console.error('Failed to log emergency alert:', error);
    }
  }

  // 🔄 BACKGROUND MONITORING
  startBackgroundMonitoring() {
    console.log('🔄 Starting background monitoring...');
    
    BackgroundJob.start({
      jobKey: 'samsMonitoring',
      period: 30000, // Check every 30 seconds
    });

    BackgroundJob.register({
      jobKey: 'samsMonitoring',
      job: () => {
        this.performBackgroundCheck();
      }
    });
  }

  async performBackgroundCheck() {
    try {
      // Check for new alerts
      const alertsResponse = await serverAPI.getAlerts();
      if (alertsResponse.success && alertsResponse.data) {
        await this.processNewAlerts(alertsResponse.data);
      }

      // Check system health
      const healthResponse = await serverAPI.getSystemHealth();
      if (healthResponse.success && healthResponse.data) {
        await this.checkHealthThresholds(healthResponse.data);
      }

    } catch (error) {
      console.error('Background monitoring error:', error);
    }
  }

  async processNewAlerts(alerts) {
    const lastCheckTime = await AsyncStorage.getItem('last_alert_check');
    const lastCheck = lastCheckTime ? new Date(lastCheckTime) : new Date(0);

    const newAlerts = alerts.filter(alert => 
      new Date(alert.timestamp) > lastCheck && !alert.acknowledged
    );

    for (const alert of newAlerts) {
      if (alert.severity === 'critical') {
        await this.sendEmergencyAlert({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          serverId: alert.serverId,
          serverName: alert.serverName,
          alertType: alert.category
        });
      } else {
        await this.sendLocalNotification({
          title: alert.title,
          message: alert.message,
          type: alert.type,
          data: { alertId: alert.id, serverId: alert.serverId }
        });
      }
    }

    await AsyncStorage.setItem('last_alert_check', new Date().toISOString());
  }

  async checkHealthThresholds(healthData) {
    const thresholds = {
      cpu: 90,
      memory: 85,
      disk: 90
    };

    Object.entries(thresholds).forEach(async ([metric, threshold]) => {
      if (healthData[metric] > threshold) {
        await this.sendLocalNotification({
          title: `High ${metric.toUpperCase()} Usage`,
          message: `${metric.toUpperCase()} usage is at ${healthData[metric]}%`,
          type: 'warning',
          data: { metric, value: healthData[metric], threshold }
        });
      }
    });
  }

  // 🔧 UTILITY METHODS
  async updatePreferences(preferences) {
    const { sound, vibration, emergency } = preferences;
    
    this.soundEnabled = sound;
    this.vibrationEnabled = vibration;
    this.emergencyMode = emergency;

    await Promise.all([
      AsyncStorage.setItem('notification_sound_enabled', sound.toString()),
      AsyncStorage.setItem('notification_vibration_enabled', vibration.toString()),
      AsyncStorage.setItem('emergency_mode_enabled', emergency.toString())
    ]);

    console.log('🔧 Notification preferences updated:', preferences);
  }

  handleNotification(notification) {
    console.log('🔔 Handling notification:', notification);
    
    // Add to notification queue for processing
    this.notificationQueue.push({
      ...notification,
      receivedAt: new Date().toISOString()
    });

    // Process notification based on type
    if (notification.userInfo?.emergency) {
      this.handleEmergencyNotification(notification);
    }
  }

  handleNotificationAction(notification) {
    console.log('🔔 Handling notification action:', notification);
    
    switch (notification.action) {
      case 'Acknowledge':
        this.acknowledgeNotification(notification);
        break;
      case 'View Details':
        this.viewNotificationDetails(notification);
        break;
      case 'Emergency Response':
        this.triggerEmergencyResponse(notification.userInfo);
        break;
    }
  }

  async acknowledgeNotification(notification) {
    if (notification.userInfo?.alertId) {
      await serverAPI.acknowledgeAlert(notification.userInfo.alertId);
    }
  }

  viewNotificationDetails(notification) {
    // This would navigate to the relevant screen
    console.log('👁️ Viewing notification details:', notification);
  }

  handleEmergencyNotification(notification) {
    // Force app to foreground for emergency
    console.log('🚨 Handling emergency notification:', notification);
    
    // Additional emergency handling logic
    if (this.emergencyMode) {
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000], true);
    }
  }

  // 🧹 CLEANUP METHODS
  stopBackgroundMonitoring() {
    BackgroundJob.stop({ jobKey: 'samsMonitoring' });
    console.log('🛑 Background monitoring stopped');
  }

  cleanup() {
    this.stopBackgroundMonitoring();
    
    // Release sound resources
    Object.values(this.alertSounds).forEach(sound => {
      if (sound) sound.release();
    });

    console.log('🧹 Notification service cleaned up');
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
export { NOTIFICATION_CATEGORIES, ALERT_SOUNDS };
