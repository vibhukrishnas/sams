/**
 * 🔐 Authentication Service - Secure PIN Login & Background Processing
 * Enterprise-grade authentication with biometric fallback and JWT token management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
// import ReactNativeBiometrics from 'react-native-biometrics';
// import DeviceInfo from 'react-native-device-info';
// import BackgroundJob from 'react-native-background-job';
// import PushNotification from 'react-native-push-notification';
// import messaging from '@react-native-firebase/messaging';
import NetInfo from '@react-native-community/netinfo';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  lastLogin: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface LoginCredentials {
  username: string;
  password?: string;
  pin?: string;
  biometricSignature?: string;
}

interface BiometricConfig {
  enabled: boolean;
  type: 'TouchID' | 'FaceID' | 'Biometrics';
  fallbackToPin: boolean;
}

class AuthenticationService {
  private static instance: AuthenticationService;
  private biometrics: ReactNativeBiometrics;
  private backgroundJobStarted: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
    this.initializePushNotifications();
    this.setupNetworkListener();
  }

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Initialize push notifications
   */
  private async initializePushNotifications(): Promise<void> {
    try {
      // Request permission for iOS
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('📱 Push notification permission granted');
        
        // Get FCM token
        const fcmToken = await messaging().getToken();
        await AsyncStorage.setItem('fcm_token', fcmToken);
        
        // Configure push notifications
        PushNotification.configure({
          onRegister: (token) => {
            console.log('📱 Push notification token:', token);
          },
          onNotification: (notification) => {
            this.handlePushNotification(notification);
          },
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },
          popInitialNotification: true,
          requestPermissions: true,
        });

        // Handle background messages
        messaging().setBackgroundMessageHandler(async (remoteMessage) => {
          console.log('📱 Background message received:', remoteMessage);
          await this.handleBackgroundMessage(remoteMessage);
        });
      }
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.backgroundJobStarted) {
        this.startBackgroundSync();
      } else if (!state.isConnected) {
        this.stopBackgroundSync();
      }
    });
  }

  /**
   * Check biometric availability
   */
  async checkBiometricAvailability(): Promise<BiometricConfig> {
    try {
      const { available, biometryType } = await this.biometrics.isSensorAvailable();
      
      return {
        enabled: available,
        type: biometryType as 'TouchID' | 'FaceID' | 'Biometrics',
        fallbackToPin: true,
      };
    } catch (error) {
      console.error('❌ Error checking biometric availability:', error);
      return {
        enabled: false,
        type: 'Biometrics',
        fallbackToPin: true,
      };
    }
  }

  /**
   * Setup biometric authentication
   */
  async setupBiometricAuth(username: string): Promise<boolean> {
    try {
      const { available } = await this.biometrics.isSensorAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      const { success } = await this.biometrics.createKeys();
      if (!success) {
        throw new Error('Failed to create biometric keys');
      }

      // Store biometric preference
      await AsyncStorage.setItem('biometric_enabled', 'true');
      await AsyncStorage.setItem('biometric_username', username);

      return true;
    } catch (error) {
      console.error('❌ Error setting up biometric auth:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics(): Promise<{ success: boolean; signature?: string }> {
    try {
      const { available } = await this.biometrics.isSensorAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      const { success, signature } = await this.biometrics.createSignature({
        promptMessage: 'Authenticate to access SAMS',
        payload: `sams_auth_${Date.now()}`,
      });

      return { success, signature };
    } catch (error) {
      console.error('❌ Error with biometric authentication:', error);
      return { success: false };
    }
  }

  /**
   * Validate PIN
   */
  async validatePin(pin: string): Promise<boolean> {
    try {
      const storedPin = await this.getStoredPin();
      if (!storedPin) {
        return false;
      }

      // In production, use proper hashing
      return pin === storedPin;
    } catch (error) {
      console.error('❌ Error validating PIN:', error);
      return false;
    }
  }

  /**
   * Set PIN
   */
  async setPin(pin: string): Promise<boolean> {
    try {
      // In production, hash the PIN before storing
      await Keychain.setInternetCredentials('sams_pin', 'pin', pin);
      await AsyncStorage.setItem('pin_enabled', 'true');
      return true;
    } catch (error) {
      console.error('❌ Error setting PIN:', error);
      return false;
    }
  }

  /**
   * Get stored PIN
   */
  private async getStoredPin(): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('sams_pin');
      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('❌ Error getting stored PIN:', error);
      return null;
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; tokens?: AuthTokens; error?: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Info': JSON.stringify(deviceInfo),
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }

      const data = await response.json();
      
      // Store tokens securely
      await this.storeTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      });

      // Store user data
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
      
      // Start background services
      this.startBackgroundSync();

      return {
        success: true,
        user: data.user,
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: Date.now() + (data.expiresIn * 1000),
        },
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'Network error or server unavailable' };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<{ success: boolean; tokens?: AuthTokens }> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens?.refreshToken) {
        return { success: false };
      }

      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.refreshToken}`,
        },
      });

      if (!response.ok) {
        return { success: false };
      }

      const data = await response.json();
      
      const newTokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };

      await this.storeTokens(newTokens);
      
      return { success: true, tokens: newTokens };
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return { success: false };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Clear stored data
      await Keychain.resetInternetCredentials('sams_tokens');
      await AsyncStorage.multiRemove([
        'user_data',
        'biometric_enabled',
        'pin_enabled',
        'fcm_token',
      ]);

      // Stop background services
      this.stopBackgroundSync();

      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }

  /**
   * Store tokens securely
   */
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    await Keychain.setInternetCredentials(
      'sams_tokens',
      tokens.accessToken,
      JSON.stringify(tokens)
    );
  }

  /**
   * Get stored tokens
   */
  async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('sams_tokens');
      if (credentials) {
        return JSON.parse(credentials.password);
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting stored tokens:', error);
      return null;
    }
  }

  /**
   * Check if token is valid
   */
  async isTokenValid(): Promise<boolean> {
    const tokens = await this.getStoredTokens();
    if (!tokens) return false;
    
    return Date.now() < tokens.expiresAt;
  }

  /**
   * Start background sync
   */
  private startBackgroundSync(): void {
    if (this.backgroundJobStarted) return;

    BackgroundJob.start({
      jobKey: 'samsBackgroundSync',
      period: 30000, // 30 seconds
    });

    this.syncInterval = setInterval(async () => {
      await this.performBackgroundSync();
    }, 30000);

    this.backgroundJobStarted = true;
    console.log('🔄 Background sync started');
  }

  /**
   * Stop background sync
   */
  private stopBackgroundSync(): void {
    if (!this.backgroundJobStarted) return;

    BackgroundJob.stop();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.backgroundJobStarted = false;
    console.log('⏹️ Background sync stopped');
  }

  /**
   * Perform background sync
   */
  private async performBackgroundSync(): Promise<void> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens || !await this.isTokenValid()) {
        return;
      }

      // Sync critical data in background
      await this.syncAlerts();
      await this.syncServerStatus();
      
    } catch (error) {
      console.error('❌ Background sync error:', error);
    }
  }

  /**
   * Sync alerts in background
   */
  private async syncAlerts(): Promise<void> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return;

      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/alerts/recent`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      if (response.ok) {
        const alerts = await response.json();
        await AsyncStorage.setItem('cached_alerts', JSON.stringify(alerts));
      }
    } catch (error) {
      console.error('❌ Error syncing alerts:', error);
    }
  }

  /**
   * Sync server status in background
   */
  private async syncServerStatus(): Promise<void> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return;

      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/servers/status`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      if (response.ok) {
        const serverStatus = await response.json();
        await AsyncStorage.setItem('cached_server_status', JSON.stringify(serverStatus));
      }
    } catch (error) {
      console.error('❌ Error syncing server status:', error);
    }
  }

  /**
   * Handle push notification
   */
  private handlePushNotification(notification: any): void {
    console.log('📱 Push notification received:', notification);
    
    // Handle different notification types
    switch (notification.data?.type) {
      case 'alert':
        this.handleAlertNotification(notification);
        break;
      case 'server_down':
        this.handleServerDownNotification(notification);
        break;
      default:
        console.log('📱 Unknown notification type');
    }
  }

  /**
   * Handle background message
   */
  private async handleBackgroundMessage(remoteMessage: any): Promise<void> {
    console.log('📱 Background message:', remoteMessage);
    
    // Store message for later processing
    const messages = await AsyncStorage.getItem('background_messages') || '[]';
    const messageList = JSON.parse(messages);
    messageList.push({
      ...remoteMessage,
      receivedAt: Date.now(),
    });
    
    await AsyncStorage.setItem('background_messages', JSON.stringify(messageList));
  }

  /**
   * Handle alert notification
   */
  private handleAlertNotification(notification: any): void {
    PushNotification.localNotification({
      title: 'SAMS Alert',
      message: notification.data.message,
      playSound: true,
      soundName: 'default',
      actions: ['Acknowledge', 'View Details'],
    });
  }

  /**
   * Handle server down notification
   */
  private handleServerDownNotification(notification: any): void {
    PushNotification.localNotification({
      title: 'Server Down',
      message: `${notification.data.serverName} is not responding`,
      playSound: true,
      soundName: 'default',
      priority: 'high',
    });
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<object> {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      deviceName: await DeviceInfo.getDeviceName(),
      systemName: DeviceInfo.getSystemName(),
      systemVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
    };
  }

  /**
   * Get API base URL
   */
  private getApiBaseUrl(): string {
    return __DEV__ 
      ? 'http://192.168.1.10:8080' 
      : 'https://api.sams-monitoring.com';
  }
}

export default AuthenticationService.getInstance();
