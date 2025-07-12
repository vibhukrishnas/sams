import HapticFeedback, { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { Platform } from 'react-native';
import { store } from '../store/index';

interface HapticPattern {
  type: HapticFeedbackTypes;
  duration?: number;
  delay?: number;
}

interface CustomHapticPattern {
  name: string;
  pattern: HapticPattern[];
  description: string;
}

class HapticService {
  private isEnabled = true;
  private customPatterns: Map<string, CustomHapticPattern> = new Map();

  constructor() {
    this.initializeCustomPatterns();
    this.loadSettings();
  }

  /**
   * Initialize custom haptic patterns
   */
  private initializeCustomPatterns(): void {
    const patterns: CustomHapticPattern[] = [
      {
        name: 'alert_critical',
        pattern: [
          { type: 'impactHeavy', duration: 100 },
          { type: 'impactMedium', delay: 100, duration: 100 },
          { type: 'impactHeavy', delay: 100, duration: 100 },
        ],
        description: 'Critical alert pattern with heavy impact',
      },
      {
        name: 'alert_warning',
        pattern: [
          { type: 'impactMedium', duration: 100 },
          { type: 'impactLight', delay: 50, duration: 50 },
        ],
        description: 'Warning alert pattern with medium impact',
      },
      {
        name: 'alert_info',
        pattern: [
          { type: 'impactLight', duration: 50 },
        ],
        description: 'Info alert pattern with light impact',
      },
      {
        name: 'success',
        pattern: [
          { type: 'notificationSuccess', duration: 100 },
        ],
        description: 'Success action feedback',
      },
      {
        name: 'error',
        pattern: [
          { type: 'notificationError', duration: 100 },
        ],
        description: 'Error action feedback',
      },
      {
        name: 'button_press',
        pattern: [
          { type: 'selection', duration: 30 },
        ],
        description: 'Button press feedback',
      },
      {
        name: 'swipe',
        pattern: [
          { type: 'impactLight', duration: 20 },
        ],
        description: 'Swipe gesture feedback',
      },
      {
        name: 'long_press',
        pattern: [
          { type: 'impactMedium', duration: 150 },
        ],
        description: 'Long press feedback',
      },
      {
        name: 'refresh',
        pattern: [
          { type: 'impactLight', duration: 50 },
          { type: 'impactLight', delay: 100, duration: 50 },
        ],
        description: 'Pull to refresh feedback',
      },
      {
        name: 'navigation',
        pattern: [
          { type: 'selection', duration: 25 },
        ],
        description: 'Navigation transition feedback',
      },
    ];

    patterns.forEach(pattern => {
      this.customPatterns.set(pattern.name, pattern);
    });
  }

  /**
   * Load haptic settings from store
   */
  private loadSettings(): void {
    const state = store.getState();
    this.isEnabled = state.settings.app.hapticFeedback;
  }

  /**
   * Update haptic settings
   */
  updateSettings(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Trigger basic haptic feedback
   */
  trigger(type: HapticFeedbackTypes, options?: { enableVibrateFallback?: boolean }): void {
    if (!this.isEnabled) return;

    try {
      const hapticOptions = {
        enableVibrateFallback: options?.enableVibrateFallback ?? true,
        ignoreAndroidSystemSettings: false,
      };

      HapticFeedback.trigger(type, hapticOptions);
    } catch (error) {
      console.warn('Haptic feedback error:', error);
    }
  }

  /**
   * Trigger custom haptic pattern
   */
  async triggerPattern(patternName: string): Promise<void> {
    if (!this.isEnabled) return;

    const pattern = this.customPatterns.get(patternName);
    if (!pattern) {
      console.warn(`Haptic pattern '${patternName}' not found`);
      return;
    }

    try {
      for (const haptic of pattern.pattern) {
        if (haptic.delay) {
          await this.delay(haptic.delay);
        }

        this.trigger(haptic.type);

        if (haptic.duration) {
          await this.delay(haptic.duration);
        }
      }
    } catch (error) {
      console.warn('Custom haptic pattern error:', error);
    }
  }

  /**
   * Convenience methods for common interactions
   */

  // Button interactions
  buttonPress(): void {
    this.trigger('selection');
  }

  buttonLongPress(): void {
    this.trigger('impactMedium');
  }

  // Navigation
  navigationTransition(): void {
    this.trigger('selection');
  }

  tabSwitch(): void {
    this.trigger('impactLight');
  }

  // Gestures
  swipeGesture(): void {
    this.trigger('impactLight');
  }

  pullToRefresh(): void {
    this.triggerPattern('refresh');
  }

  // Alerts and notifications
  criticalAlert(): void {
    this.triggerPattern('alert_critical');
  }

  warningAlert(): void {
    this.triggerPattern('alert_warning');
  }

  infoAlert(): void {
    this.triggerPattern('alert_info');
  }

  // Actions
  successAction(): void {
    this.triggerPattern('success');
  }

  errorAction(): void {
    this.triggerPattern('error');
  }

  // Data operations
  dataLoaded(): void {
    this.trigger('notificationSuccess');
  }

  dataError(): void {
    this.trigger('notificationError');
  }

  // Form interactions
  textInputFocus(): void {
    this.trigger('selection');
  }

  textInputError(): void {
    this.trigger('notificationWarning');
  }

  formSubmit(): void {
    this.trigger('impactMedium');
  }

  // Selection and picking
  itemSelected(): void {
    this.trigger('selection');
  }

  itemDeselected(): void {
    this.trigger('impactLight');
  }

  multiSelectToggle(): void {
    this.trigger('selection');
  }

  // Scrolling and lists
  listItemPress(): void {
    this.trigger('selection');
  }

  listItemLongPress(): void {
    this.trigger('impactMedium');
  }

  scrollBoundary(): void {
    this.trigger('impactLight');
  }

  // Modals and overlays
  modalOpen(): void {
    this.trigger('impactLight');
  }

  modalClose(): void {
    this.trigger('impactLight');
  }

  // Voice and audio
  voiceRecordingStart(): void {
    this.trigger('impactMedium');
  }

  voiceRecordingStop(): void {
    this.trigger('impactLight');
  }

  voiceCommandRecognized(): void {
    this.trigger('notificationSuccess');
  }

  voiceCommandError(): void {
    this.trigger('notificationError');
  }

  // Biometric authentication
  biometricSuccess(): void {
    this.trigger('notificationSuccess');
  }

  biometricError(): void {
    this.trigger('notificationError');
  }

  // Camera and media
  cameraCapture(): void {
    this.trigger('impactMedium');
  }

  mediaPlayPause(): void {
    this.trigger('selection');
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if haptic feedback is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get available haptic types for current platform
   */
  getAvailableTypes(): HapticFeedbackTypes[] {
    if (Platform.OS === 'ios') {
      return [
        'selection',
        'impactLight',
        'impactMedium',
        'impactHeavy',
        'notificationSuccess',
        'notificationWarning',
        'notificationError',
      ];
    } else {
      return [
        'selection',
        'impactLight',
        'impactMedium',
        'impactHeavy',
      ];
    }
  }

  /**
   * Get all custom patterns
   */
  getCustomPatterns(): CustomHapticPattern[] {
    return Array.from(this.customPatterns.values());
  }

  /**
   * Add custom haptic pattern
   */
  addCustomPattern(pattern: CustomHapticPattern): void {
    this.customPatterns.set(pattern.name, pattern);
  }

  /**
   * Remove custom haptic pattern
   */
  removeCustomPattern(name: string): boolean {
    return this.customPatterns.delete(name);
  }

  /**
   * Test haptic pattern
   */
  async testPattern(pattern: HapticPattern[]): Promise<void> {
    if (!this.isEnabled) return;

    try {
      for (const haptic of pattern) {
        if (haptic.delay) {
          await this.delay(haptic.delay);
        }

        this.trigger(haptic.type);

        if (haptic.duration) {
          await this.delay(haptic.duration);
        }
      }
    } catch (error) {
      console.warn('Test haptic pattern error:', error);
    }
  }
}

export default new HapticService();
