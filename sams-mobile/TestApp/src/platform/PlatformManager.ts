import { Platform, Dimensions, PixelRatio } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface PlatformInfo {
  os: 'ios' | 'android';
  version: string;
  deviceType: 'phone' | 'tablet' | 'tv' | 'desktop' | 'unknown';
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  isTablet: boolean;
  hasNotch: boolean;
  supportsBiometrics: boolean;
  supportsHaptics: boolean;
  supportsWidgets: boolean;
  supportsWearables: boolean;
}

export interface PlatformCapabilities {
  notifications: {
    push: boolean;
    local: boolean;
    scheduled: boolean;
    actions: boolean;
    categories: boolean;
  };
  storage: {
    secure: boolean;
    biometric: boolean;
    cloud: boolean;
  };
  sensors: {
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
    proximity: boolean;
    ambient: boolean;
  };
  media: {
    camera: boolean;
    microphone: boolean;
    speaker: boolean;
    vibration: boolean;
  };
  connectivity: {
    wifi: boolean;
    cellular: boolean;
    bluetooth: boolean;
    nfc: boolean;
  };
}

class PlatformManager {
  private static instance: PlatformManager;
  private platformInfo: PlatformInfo | null = null;
  private capabilities: PlatformCapabilities | null = null;

  static getInstance(): PlatformManager {
    if (!PlatformManager.instance) {
      PlatformManager.instance = new PlatformManager();
    }
    return PlatformManager.instance;
  }

  /**
   * Initialize platform detection
   */
  async initialize(): Promise<void> {
    this.platformInfo = await this.detectPlatformInfo();
    this.capabilities = await this.detectCapabilities();
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): PlatformInfo | null {
    return this.platformInfo;
  }

  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if running on iOS
   */
  isIOS(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Check if running on Android
   */
  isAndroid(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Check if device is a tablet
   */
  isTablet(): boolean {
    const { width, height } = Dimensions.get('window');
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    const pixelDensity = PixelRatio.get();
    
    // iPad detection for iOS
    if (this.isIOS()) {
      return DeviceInfo.isTablet();
    }
    
    // Android tablet detection
    if (this.isAndroid()) {
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      
      // Check if it's likely a tablet based on screen size and density
      return (
        (minDimension >= 600 && pixelDensity >= 1.5) ||
        (maxDimension >= 960 && pixelDensity >= 1.5) ||
        aspectRatio < 1.6
      );
    }
    
    return false;
  }

  /**
   * Get screen size category
   */
  getScreenSize(): 'small' | 'medium' | 'large' | 'xlarge' {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    
    if (minDimension < 360) return 'small';
    if (minDimension < 600) return 'medium';
    if (minDimension < 900) return 'large';
    return 'xlarge';
  }

  /**
   * Check if device has a notch (iOS) or display cutout (Android)
   */
  hasNotch(): boolean {
    if (this.isIOS()) {
      // Check for iPhone X and newer models
      const model = DeviceInfo.getModel();
      return model.includes('iPhone X') || 
             model.includes('iPhone 11') || 
             model.includes('iPhone 12') || 
             model.includes('iPhone 13') || 
             model.includes('iPhone 14') || 
             model.includes('iPhone 15');
    }
    
    if (this.isAndroid()) {
      // Android devices with display cutouts
      const { width, height } = Dimensions.get('window');
      const screenData = Dimensions.get('screen');
      
      // Check if there's a difference between window and screen dimensions
      return screenData.height !== height || screenData.width !== width;
    }
    
    return false;
  }

  /**
   * Check platform-specific feature support
   */
  supportsFeature(feature: string): boolean {
    switch (feature) {
      case 'widgets':
        return this.isIOS() ? true : this.isAndroid(); // Both support widgets
      
      case 'wearables':
        return this.isIOS() || this.isAndroid(); // Apple Watch & Wear OS
      
      case 'biometrics':
        return this.isIOS() || this.isAndroid();
      
      case 'haptics':
        return this.isIOS() || this.isAndroid();
      
      case 'push_notifications':
        return this.isIOS() || this.isAndroid();
      
      case 'background_processing':
        return this.isIOS() || this.isAndroid();
      
      case 'deep_linking':
        return this.isIOS() || this.isAndroid();
      
      case 'app_shortcuts':
        return this.isIOS() || this.isAndroid();
      
      default:
        return false;
    }
  }

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig() {
    if (this.isIOS()) {
      return {
        statusBarStyle: 'dark-content',
        navigationBarStyle: 'default',
        hapticFeedback: 'ios',
        notificationStyle: 'ios',
        designSystem: 'ios',
        animations: {
          duration: 300,
          easing: 'ease-in-out',
        },
        gestures: {
          swipeBack: true,
          edgeSwipe: true,
        },
      };
    }
    
    if (this.isAndroid()) {
      return {
        statusBarStyle: 'dark-content',
        navigationBarStyle: 'material',
        hapticFeedback: 'android',
        notificationStyle: 'material',
        designSystem: 'material',
        animations: {
          duration: 250,
          easing: 'ease-out',
        },
        gestures: {
          swipeBack: false,
          edgeSwipe: false,
        },
      };
    }
    
    return {};
  }

  /**
   * Detect platform information
   */
  private async detectPlatformInfo(): Promise<PlatformInfo> {
    const deviceType = await DeviceInfo.getDeviceType();
    const version = Platform.Version.toString();
    
    return {
      os: Platform.OS as 'ios' | 'android',
      version,
      deviceType: deviceType as any,
      screenSize: this.getScreenSize(),
      isTablet: this.isTablet(),
      hasNotch: this.hasNotch(),
      supportsBiometrics: this.supportsFeature('biometrics'),
      supportsHaptics: this.supportsFeature('haptics'),
      supportsWidgets: this.supportsFeature('widgets'),
      supportsWearables: this.supportsFeature('wearables'),
    };
  }

  /**
   * Detect platform capabilities
   */
  private async detectCapabilities(): Promise<PlatformCapabilities> {
    return {
      notifications: {
        push: true,
        local: true,
        scheduled: true,
        actions: true,
        categories: this.isIOS(),
      },
      storage: {
        secure: true,
        biometric: this.supportsFeature('biometrics'),
        cloud: this.isIOS(), // iCloud Keychain
      },
      sensors: {
        accelerometer: true,
        gyroscope: true,
        magnetometer: true,
        proximity: true,
        ambient: this.isAndroid(),
      },
      media: {
        camera: true,
        microphone: true,
        speaker: true,
        vibration: true,
      },
      connectivity: {
        wifi: true,
        cellular: true,
        bluetooth: true,
        nfc: this.isAndroid(),
      },
    };
  }

  /**
   * Get platform-specific styling
   */
  getPlatformStyles() {
    const baseStyles = {
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
    };

    if (this.isIOS()) {
      return {
        ...baseStyles,
        shadowOffset: { width: 0, height: 2 },
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
      };
    }

    if (this.isAndroid()) {
      return {
        ...baseStyles,
        elevation: 4,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
      };
    }

    return baseStyles;
  }

  /**
   * Get platform-specific navigation options
   */
  getNavigationOptions() {
    if (this.isIOS()) {
      return {
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
        gestureEnabled: true,
        cardStyleInterpolator: 'forHorizontalIOS',
      };
    }

    if (this.isAndroid()) {
      return {
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 4,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '500',
        },
        gestureEnabled: false,
        cardStyleInterpolator: 'forFadeFromBottomAndroid',
      };
    }

    return {};
  }
}

// Export singleton instance
export const platformManager = new PlatformManager();

// Export utility functions
export const isIOS = () => Platform.OS === 'ios';
export const isAndroid = () => Platform.OS === 'android';
export const getScreenDimensions = () => Dimensions.get('window');
export const getPixelRatio = () => PixelRatio.get();

export default platformManager;
