import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Keychain } from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import DeviceInfo from 'react-native-device-info';
import { store } from '../store/index';
import { loginStart, loginSuccess, loginFailure, logout } from '../store/slices/authSlice';
import { showToast } from '../store/slices/uiSlice';

export interface LoginCredentials {
  username: string;
  password: string;
  pin?: string;
  biometric?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  organizationId: string;
  lastLogin: string;
}

class EnhancedAuthService {
  private biometrics: ReactNativeBiometrics;
  private maxLoginAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.biometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: true,
    });
  }

  /**
   * Get API base URL
   */
  private getApiBaseUrl(): string {
    return __DEV__ ? 'http://10.0.2.2:8080' : 'http://192.168.1.10:8080';
  }

  /**
   * Get device information for security
   */
  private async getDeviceInfo() {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      deviceName: await DeviceInfo.getDeviceName(),
      systemVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      brand: DeviceInfo.getBrand(),
      model: DeviceInfo.getModel(),
    };
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const { available } = await this.biometrics.isSensorAvailable();
      return available;
    } catch (error) {
      console.error('❌ Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Check if account is locked due to failed attempts
   */
  private async isAccountLocked(): Promise<boolean> {
    try {
      const lockoutData = await AsyncStorage.getItem('account_lockout');
      if (!lockoutData) return false;

      const { attempts, lockedUntil } = JSON.parse(lockoutData);
      const now = Date.now();

      if (attempts >= this.maxLoginAttempts && now < lockedUntil) {
        return true;
      }

      // Reset if lockout period has passed
      if (now >= lockedUntil) {
        await AsyncStorage.removeItem('account_lockout');
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking account lockout:', error);
      return false;
    }
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(): Promise<void> {
    try {
      const lockoutData = await AsyncStorage.getItem('account_lockout');
      let attempts = 1;
      
      if (lockoutData) {
        const parsed = JSON.parse(lockoutData);
        attempts = parsed.attempts + 1;
      }

      const lockedUntil = Date.now() + this.lockoutDuration;
      
      await AsyncStorage.setItem('account_lockout', JSON.stringify({
        attempts,
        lockedUntil,
      }));

      if (attempts >= this.maxLoginAttempts) {
        store.dispatch(showToast({
          message: `Account locked for ${this.lockoutDuration / 60000} minutes due to too many failed attempts`,
          type: 'error',
          duration: 5000,
        }));
      } else {
        const remaining = this.maxLoginAttempts - attempts;
        store.dispatch(showToast({
          message: `Invalid credentials. ${remaining} attempts remaining.`,
          type: 'warning',
          duration: 3000,
        }));
      }
    } catch (error) {
      console.error('❌ Error handling failed login:', error);
    }
  }

  /**
   * Clear failed login attempts
   */
  private async clearFailedAttempts(): Promise<void> {
    try {
      await AsyncStorage.removeItem('account_lockout');
    } catch (error) {
      console.error('❌ Error clearing failed attempts:', error);
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if account is locked
      if (await this.isAccountLocked()) {
        return { success: false, error: 'Account is temporarily locked' };
      }

      store.dispatch(loginStart());

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
        await this.handleFailedLogin();
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Login failed';
        store.dispatch(loginFailure(errorMessage));
        return { success: false, error: errorMessage };
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
      
      // Clear failed attempts
      await this.clearFailedAttempts();

      // Update Redux state
      store.dispatch(loginSuccess({
        user: data.user,
        token: data.accessToken,
      }));

      store.dispatch(showToast({
        message: 'Login successful',
        type: 'success',
        duration: 2000,
      }));

      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = 'Network error or server unavailable';
      store.dispatch(loginFailure(errorMessage));
      store.dispatch(showToast({
        message: errorMessage,
        type: 'error',
        duration: 3000,
      }));
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
    try {
      const { available } = await this.biometrics.isSensorAvailable();
      if (!available) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      const { success, signature } = await this.biometrics.createSignature({
        promptMessage: 'Authenticate to access SAMS',
        payload: `sams_auth_${Date.now()}`,
      });

      if (success) {
        // Get stored user data
        const userData = await AsyncStorage.getItem('user_data');
        const tokens = await this.getStoredTokens();
        
        if (userData && tokens) {
          const user = JSON.parse(userData);
          store.dispatch(loginSuccess({ user, token: tokens.accessToken }));
          
          store.dispatch(showToast({
            message: 'Biometric authentication successful',
            type: 'success',
            duration: 2000,
          }));
          
          return { success: true };
        }
      }

      return { success: false, error: 'Biometric authentication failed' };
    } catch (error) {
      console.error('❌ Biometric authentication error:', error);
      return { success: false, error: 'Biometric authentication error' };
    }
  }

  /**
   * Validate PIN
   */
  async validatePin(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storedPin = await this.getStoredPin();
      if (!storedPin) {
        return { success: false, error: 'No PIN set' };
      }

      // In production, use proper hashing
      if (pin === storedPin) {
        // Get stored user data
        const userData = await AsyncStorage.getItem('user_data');
        const tokens = await this.getStoredTokens();
        
        if (userData && tokens) {
          const user = JSON.parse(userData);
          store.dispatch(loginSuccess({ user, token: tokens.accessToken }));
          
          store.dispatch(showToast({
            message: 'PIN authentication successful',
            type: 'success',
            duration: 2000,
          }));
          
          return { success: true };
        }
      }

      await this.handleFailedLogin();
      return { success: false, error: 'Invalid PIN' };
    } catch (error) {
      console.error('❌ PIN validation error:', error);
      return { success: false, error: 'PIN validation error' };
    }
  }

  /**
   * Set PIN
   */
  async setPin(pin: string): Promise<boolean> {
    try {
      // In production, hash the PIN before storing
      await EncryptedStorage.setItem('sams_pin', pin);
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
      return await EncryptedStorage.getItem('sams_pin');
    } catch (error) {
      console.error('❌ Error getting stored PIN:', error);
      return null;
    }
  }

  /**
   * Store tokens securely
   */
  private async storeTokens(tokens: AuthTokens): Promise<void> {
    await EncryptedStorage.setItem('sams_tokens', JSON.stringify(tokens));
  }

  /**
   * Get stored tokens
   */
  async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const tokensData = await EncryptedStorage.getItem('sams_tokens');
      return tokensData ? JSON.parse(tokensData) : null;
    } catch (error) {
      console.error('❌ Error getting stored tokens:', error);
      return null;
    }
  }

  /**
   * Check if token is valid
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return false;
      
      return Date.now() < tokens.expiresAt;
    } catch (error) {
      console.error('❌ Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<{ success: boolean; tokens?: AuthTokens }> {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens) return { success: false };

      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        return { success: false };
      }

      const data = await response.json();
      const newTokens: AuthTokens = {
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
      await EncryptedStorage.clear();
      await AsyncStorage.multiRemove([
        'user_data',
        'biometric_enabled',
        'pin_enabled',
        'fcm_token',
        'account_lockout',
      ]);

      // Update Redux state
      store.dispatch(logout());

      store.dispatch(showToast({
        message: 'Logged out successfully',
        type: 'info',
        duration: 2000,
      }));

      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }
}

export default new EnhancedAuthService();
