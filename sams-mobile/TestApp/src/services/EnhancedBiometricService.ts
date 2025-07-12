import TouchID from 'react-native-touch-id';
import FingerprintScanner from 'react-native-fingerprint-scanner';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store/index';
import { setBiometricEnabled } from '../store/slices/settingsSlice';
import HapticService from './HapticService';

interface BiometricType {
  type: 'TouchID' | 'FaceID' | 'Fingerprint' | 'Iris' | 'Voice' | 'None';
  available: boolean;
  enrolled: boolean;
}

interface BiometricConfig {
  title: string;
  subtitle?: string;
  description?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
  passcodeFallback: boolean;
  showErrorDialogs: boolean;
  suppressEnterPassword: boolean;
}

interface BiometricResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  biometricType?: string;
  fallbackUsed?: boolean;
}

class EnhancedBiometricService {
  private isInitialized = false;
  private availableBiometrics: BiometricType[] = [];
  private defaultConfig: BiometricConfig = {
    title: 'Authenticate',
    subtitle: 'Use your biometric to access SAMS',
    description: 'Place your finger on the sensor or look at the camera',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    passcodeFallback: true,
    showErrorDialogs: true,
    suppressEnterPassword: false,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize biometric service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.detectAvailableBiometrics();
      await this.loadSettings();
      this.isInitialized = true;
      console.log('✅ Enhanced biometric service initialized');
    } catch (error) {
      console.error('❌ Error initializing biometric service:', error);
    }
  }

  /**
   * Detect available biometric authentication methods
   */
  private async detectAvailableBiometrics(): Promise<void> {
    this.availableBiometrics = [];

    if (Platform.OS === 'ios') {
      try {
        const biometryType = await TouchID.isSupported();
        
        if (biometryType) {
          const isEnrolled = await this.checkBiometricEnrollment();
          
          this.availableBiometrics.push({
            type: biometryType === 'FaceID' ? 'FaceID' : 'TouchID',
            available: true,
            enrolled: isEnrolled,
          });
        }
      } catch (error) {
        console.log('iOS biometrics not available:', error);
      }
    } else if (Platform.OS === 'android') {
      try {
        const isAvailable = await FingerprintScanner.isSensorAvailable();
        
        this.availableBiometrics.push({
          type: 'Fingerprint',
          available: true,
          enrolled: true, // Android scanner checks enrollment automatically
        });
      } catch (error) {
        console.log('Android fingerprint not available:', error);
      }
    }

    // Add fallback option
    this.availableBiometrics.push({
      type: 'None',
      available: true,
      enrolled: true,
    });
  }

  /**
   * Check if biometric is enrolled
   */
  private async checkBiometricEnrollment(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        await TouchID.authenticate('Check enrollment', {
          fallbackLabel: '',
          cancelLabel: 'Cancel',
          passcodeFallback: false,
        });
        return true;
      } else {
        // Android enrollment is checked by the scanner
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Load biometric settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const enabled = await AsyncStorage.getItem('biometric_enabled');
      if (enabled !== null) {
        store.dispatch(setBiometricEnabled(JSON.parse(enabled)));
      }
    } catch (error) {
      console.error('Error loading biometric settings:', error);
    }
  }

  /**
   * Save biometric settings
   */
  private async saveSettings(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('biometric_enabled', JSON.stringify(enabled));
      store.dispatch(setBiometricEnabled(enabled));
    } catch (error) {
      console.error('Error saving biometric settings:', error);
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.availableBiometrics.some(
      biometric => biometric.available && biometric.enrolled && biometric.type !== 'None'
    );
  }

  /**
   * Get available biometric types
   */
  getAvailableBiometrics(): BiometricType[] {
    return [...this.availableBiometrics];
  }

  /**
   * Get primary biometric type
   */
  getPrimaryBiometricType(): BiometricType | null {
    return this.availableBiometrics.find(
      biometric => biometric.available && biometric.enrolled && biometric.type !== 'None'
    ) || null;
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(config?: Partial<BiometricConfig>): Promise<BiometricResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const primaryBiometric = this.getPrimaryBiometricType();

    if (!primaryBiometric) {
      return {
        success: false,
        error: 'Biometric authentication not available',
        errorCode: 'NOT_AVAILABLE',
      };
    }

    try {
      if (Platform.OS === 'ios') {
        return await this.authenticateIOS(finalConfig, primaryBiometric);
      } else {
        return await this.authenticateAndroid(finalConfig, primaryBiometric);
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Authenticate on iOS
   */
  private async authenticateIOS(
    config: BiometricConfig,
    biometric: BiometricType
  ): Promise<BiometricResult> {
    try {
      const options = {
        title: config.title,
        subtitle: config.subtitle,
        fallbackLabel: config.fallbackLabel,
        cancelLabel: config.cancelLabel,
        passcodeFallback: config.passcodeFallback,
        showErrorDialogs: config.showErrorDialogs,
        suppressEnterPassword: config.suppressEnterPassword,
      };

      await TouchID.authenticate(config.description || config.title, options);
      
      HapticService.biometricSuccess();
      return {
        success: true,
        biometricType: biometric.type,
      };
    } catch (error: any) {
      HapticService.biometricError();
      
      return {
        success: false,
        error: this.getIOSErrorMessage(error),
        errorCode: error.name || error.code,
        fallbackUsed: error.name === 'LAErrorUserFallback',
      };
    }
  }

  /**
   * Authenticate on Android
   */
  private async authenticateAndroid(
    config: BiometricConfig,
    biometric: BiometricType
  ): Promise<BiometricResult> {
    try {
      await FingerprintScanner.authenticate({
        title: config.title,
        subtitle: config.subtitle || config.description,
        cancelButton: config.cancelLabel || 'Cancel',
      });

      HapticService.biometricSuccess();
      return {
        success: true,
        biometricType: biometric.type,
      };
    } catch (error: any) {
      HapticService.biometricError();
      
      return {
        success: false,
        error: this.getAndroidErrorMessage(error),
        errorCode: error.name || error.message,
      };
    } finally {
      // Always release the scanner on Android
      if (Platform.OS === 'android') {
        FingerprintScanner.release();
      }
    }
  }

  /**
   * Get iOS error message
   */
  private getIOSErrorMessage(error: any): string {
    switch (error.name) {
      case 'LAErrorAuthenticationFailed':
        return 'Authentication failed. Please try again.';
      case 'LAErrorUserCancel':
        return 'Authentication cancelled by user.';
      case 'LAErrorUserFallback':
        return 'User chose to use fallback authentication.';
      case 'LAErrorSystemCancel':
        return 'Authentication cancelled by system.';
      case 'LAErrorPasscodeNotSet':
        return 'Passcode not set on device.';
      case 'LAErrorBiometryNotAvailable':
        return 'Biometric authentication not available.';
      case 'LAErrorBiometryNotEnrolled':
        return 'No biometric data enrolled.';
      case 'LAErrorBiometryLockout':
        return 'Biometric authentication locked. Use passcode.';
      default:
        return error.message || 'Authentication failed.';
    }
  }

  /**
   * Get Android error message
   */
  private getAndroidErrorMessage(error: any): string {
    switch (error.name) {
      case 'FingerprintScannerNotSupported':
        return 'Fingerprint scanner not supported.';
      case 'FingerprintScannerNotEnrolled':
        return 'No fingerprints enrolled.';
      case 'FingerprintScannerNotAvailable':
        return 'Fingerprint scanner not available.';
      case 'FingerprintScannerUnknownError':
        return 'Unknown fingerprint error.';
      case 'UserCancel':
        return 'Authentication cancelled by user.';
      case 'UserFallback':
        return 'User chose fallback authentication.';
      case 'SystemCancel':
        return 'Authentication cancelled by system.';
      case 'DeviceLocked':
        return 'Device is locked.';
      default:
        return error.message || 'Authentication failed.';
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<BiometricResult> {
    const result = await this.authenticate({
      title: 'Enable Biometric Authentication',
      description: 'Authenticate to enable biometric login',
    });

    if (result.success) {
      await this.saveSettings(true);
    }

    return result;
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await this.saveSettings(false);
  }

  /**
   * Check if biometric is enabled in settings
   */
  isBiometricEnabled(): boolean {
    const state = store.getState();
    return state.settings.security.biometricEnabled;
  }

  /**
   * Prompt user to set up biometric authentication
   */
  async promptSetup(): Promise<void> {
    const isAvailable = await this.isAvailable();
    
    if (!isAvailable) {
      Alert.alert(
        'Biometric Authentication',
        'Biometric authentication is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    const primaryBiometric = this.getPrimaryBiometricType();
    const biometricName = this.getBiometricDisplayName(primaryBiometric?.type);

    Alert.alert(
      'Enable Biometric Authentication',
      `Would you like to use ${biometricName} to secure your SAMS app?`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            const result = await this.enableBiometric();
            if (!result.success) {
              Alert.alert('Setup Failed', result.error || 'Failed to enable biometric authentication');
            }
          },
        },
      ]
    );
  }

  /**
   * Get display name for biometric type
   */
  private getBiometricDisplayName(type?: string): string {
    switch (type) {
      case 'TouchID': return 'Touch ID';
      case 'FaceID': return 'Face ID';
      case 'Fingerprint': return 'Fingerprint';
      case 'Iris': return 'Iris';
      case 'Voice': return 'Voice';
      default: return 'Biometric';
    }
  }

  /**
   * Get biometric icon name
   */
  getBiometricIcon(type?: string): string {
    switch (type) {
      case 'TouchID': return 'fingerprint';
      case 'FaceID': return 'face';
      case 'Fingerprint': return 'fingerprint';
      case 'Iris': return 'visibility';
      case 'Voice': return 'mic';
      default: return 'security';
    }
  }

  /**
   * Cleanup biometric service
   */
  cleanup(): void {
    if (Platform.OS === 'android') {
      try {
        FingerprintScanner.release();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

export default new EnhancedBiometricService();
