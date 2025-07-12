import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'selection' 
  | 'success' 
  | 'warning' 
  | 'error'
  | 'rigid'
  | 'soft'
  | 'clockTick';

interface HapticOptions {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
}

class HapticFeedbackManager {
  private isEnabled: boolean = true;
  private defaultOptions: HapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  /**
   * Enable or disable haptic feedback globally
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptic feedback is enabled
   */
  isHapticEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Trigger haptic feedback
   */
  trigger(type: HapticType, options?: HapticOptions): void {
    if (!this.isEnabled) return;

    const hapticOptions = { ...this.defaultOptions, ...options };

    try {
      if (Platform.OS === 'ios') {
        this.triggerIOS(type, hapticOptions);
      } else if (Platform.OS === 'android') {
        this.triggerAndroid(type, hapticOptions);
      }
    } catch (error) {
      console.warn('Haptic feedback error:', error);
      
      // Fallback to basic vibration if haptic feedback fails
      if (hapticOptions.enableVibrateFallback) {
        this.fallbackVibration(type);
      }
    }
  }

  /**
   * iOS-specific haptic feedback
   */
  private triggerIOS(type: HapticType, options: HapticOptions): void {
    const hapticType = this.mapToIOSHapticType(type);
    
    ReactNativeHapticFeedback.trigger(hapticType, {
      enableVibrateFallback: options.enableVibrateFallback,
    });
  }

  /**
   * Android-specific haptic feedback
   */
  private triggerAndroid(type: HapticType, options: HapticOptions): void {
    const hapticType = this.mapToAndroidHapticType(type);
    
    ReactNativeHapticFeedback.trigger(hapticType, {
      enableVibrateFallback: options.enableVibrateFallback,
      ignoreAndroidSystemSettings: options.ignoreAndroidSystemSettings,
    });
  }

  /**
   * Map custom haptic types to iOS haptic types
   */
  private mapToIOSHapticType(type: HapticType): string {
    switch (type) {
      case 'light':
        return 'impactLight';
      case 'medium':
        return 'impactMedium';
      case 'heavy':
        return 'impactHeavy';
      case 'selection':
        return 'selection';
      case 'success':
        return 'notificationSuccess';
      case 'warning':
        return 'notificationWarning';
      case 'error':
        return 'notificationError';
      case 'rigid':
        return 'rigid';
      case 'soft':
        return 'soft';
      case 'clockTick':
        return 'clockTick';
      default:
        return 'impactLight';
    }
  }

  /**
   * Map custom haptic types to Android haptic types
   */
  private mapToAndroidHapticType(type: HapticType): string {
    switch (type) {
      case 'light':
        return 'impactLight';
      case 'medium':
        return 'impactMedium';
      case 'heavy':
        return 'impactHeavy';
      case 'selection':
        return 'keyboardTap';
      case 'success':
        return 'notificationSuccess';
      case 'warning':
        return 'notificationWarning';
      case 'error':
        return 'notificationError';
      case 'rigid':
        return 'impactHeavy';
      case 'soft':
        return 'impactLight';
      case 'clockTick':
        return 'clockTick';
      default:
        return 'impactLight';
    }
  }

  /**
   * Fallback vibration patterns for different haptic types
   */
  private fallbackVibration(type: HapticType): void {
    const patterns: Record<HapticType, number | number[]> = {
      light: 50,
      medium: 100,
      heavy: 200,
      selection: 25,
      success: [100, 50, 100],
      warning: [150, 100, 150],
      error: [200, 100, 200, 100, 200],
      rigid: 150,
      soft: 75,
      clockTick: 30,
    };

    const pattern = patterns[type];
    
    if (Array.isArray(pattern)) {
      Vibration.vibrate(pattern);
    } else {
      Vibration.vibrate(pattern);
    }
  }

  /**
   * Predefined haptic patterns for common UI interactions
   */
  buttonPress(): void {
    this.trigger('light');
  }

  buttonLongPress(): void {
    this.trigger('medium');
  }

  switchToggle(): void {
    this.trigger('selection');
  }

  alertShow(): void {
    this.trigger('warning');
  }

  alertDismiss(): void {
    this.trigger('light');
  }

  errorOccurred(): void {
    this.trigger('error');
  }

  successAction(): void {
    this.trigger('success');
  }

  navigationTransition(): void {
    this.trigger('soft');
  }

  pullToRefresh(): void {
    this.trigger('medium');
  }

  swipeAction(): void {
    this.trigger('selection');
  }

  modalPresent(): void {
    this.trigger('light');
  }

  modalDismiss(): void {
    this.trigger('light');
  }

  tabSelection(): void {
    this.trigger('selection');
  }

  pickerSelection(): void {
    this.trigger('selection');
  }

  textSelection(): void {
    this.trigger('selection');
  }

  keyboardTap(): void {
    this.trigger('selection');
  }

  scrollBoundary(): void {
    this.trigger('light');
  }

  dragStart(): void {
    this.trigger('medium');
  }

  dragEnd(): void {
    this.trigger('light');
  }

  contextMenuOpen(): void {
    this.trigger('medium');
  }

  contextMenuClose(): void {
    this.trigger('light');
  }

  /**
   * Custom haptic sequences
   */
  playSequence(types: HapticType[], delays: number[]): void {
    if (types.length !== delays.length + 1) {
      console.warn('Haptic sequence: types and delays arrays must have compatible lengths');
      return;
    }

    let currentIndex = 0;
    
    const playNext = () => {
      if (currentIndex < types.length) {
        this.trigger(types[currentIndex]);
        currentIndex++;
        
        if (currentIndex < types.length) {
          setTimeout(playNext, delays[currentIndex - 1]);
        }
      }
    };

    playNext();
  }

  /**
   * Haptic feedback for alert severity levels
   */
  alertSeverity(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): void {
    switch (severity) {
      case 'critical':
        this.playSequence(['error', 'heavy', 'error'], [100, 100]);
        break;
      case 'high':
        this.playSequence(['warning', 'medium'], [100]);
        break;
      case 'medium':
        this.trigger('warning');
        break;
      case 'low':
        this.trigger('light');
        break;
      case 'info':
        this.trigger('selection');
        break;
    }
  }

  /**
   * Haptic feedback for connection status
   */
  connectionStatus(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    switch (status) {
      case 'connected':
        this.trigger('success');
        break;
      case 'disconnected':
        this.trigger('error');
        break;
      case 'reconnecting':
        this.playSequence(['light', 'light', 'light'], [200, 200]);
        break;
    }
  }
}

// Export singleton instance
export const HapticFeedback = new HapticFeedbackManager();

// Export React hook for haptic feedback
export const useHapticFeedback = () => {
  return {
    trigger: (type: HapticType, options?: HapticOptions) => HapticFeedback.trigger(type, options),
    setEnabled: (enabled: boolean) => HapticFeedback.setEnabled(enabled),
    isEnabled: () => HapticFeedback.isHapticEnabled(),
    buttonPress: () => HapticFeedback.buttonPress(),
    buttonLongPress: () => HapticFeedback.buttonLongPress(),
    switchToggle: () => HapticFeedback.switchToggle(),
    alertShow: () => HapticFeedback.alertShow(),
    alertDismiss: () => HapticFeedback.alertDismiss(),
    errorOccurred: () => HapticFeedback.errorOccurred(),
    successAction: () => HapticFeedback.successAction(),
    navigationTransition: () => HapticFeedback.navigationTransition(),
    alertSeverity: (severity: 'critical' | 'high' | 'medium' | 'low' | 'info') => 
      HapticFeedback.alertSeverity(severity),
    connectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => 
      HapticFeedback.connectionStatus(status),
  };
};
