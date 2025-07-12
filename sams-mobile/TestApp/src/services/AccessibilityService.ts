import { AccessibilityInfo, Platform, Dimensions } from 'react-native';
import { store } from '../store/index';
import { updateAccessibilitySettings } from '../store/slices/settingsSlice';

interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  preferredContentSizeCategory: string;
}

interface ColorBlindnessFilter {
  name: string;
  matrix: number[];
  description: string;
}

class AccessibilityService {
  private accessibilityState: AccessibilityState = {
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    preferredContentSizeCategory: 'medium',
  };

  private colorBlindnessFilters: Map<string, ColorBlindnessFilter> = new Map();
  private listeners: Array<() => void> = [];

  constructor() {
    this.initializeColorBlindnessFilters();
    this.setupAccessibilityListeners();
    this.loadInitialState();
  }

  /**
   * Initialize color blindness filters
   */
  private initializeColorBlindnessFilters(): void {
    const filters: ColorBlindnessFilter[] = [
      {
        name: 'protanopia',
        matrix: [
          0.567, 0.433, 0.000, 0, 0,
          0.558, 0.442, 0.000, 0, 0,
          0.000, 0.242, 0.758, 0, 0,
          0, 0, 0, 1, 0
        ],
        description: 'Red-blind (missing L-cones)',
      },
      {
        name: 'deuteranopia',
        matrix: [
          0.625, 0.375, 0.000, 0, 0,
          0.700, 0.300, 0.000, 0, 0,
          0.000, 0.300, 0.700, 0, 0,
          0, 0, 0, 1, 0
        ],
        description: 'Green-blind (missing M-cones)',
      },
      {
        name: 'tritanopia',
        matrix: [
          0.950, 0.050, 0.000, 0, 0,
          0.000, 0.433, 0.567, 0, 0,
          0.000, 0.475, 0.525, 0, 0,
          0, 0, 0, 1, 0
        ],
        description: 'Blue-blind (missing S-cones)',
      },
    ];

    filters.forEach(filter => {
      this.colorBlindnessFilters.set(filter.name, filter);
    });
  }

  /**
   * Setup accessibility listeners
   */
  private setupAccessibilityListeners(): void {
    // Screen reader state
    AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
      this.accessibilityState.isScreenReaderEnabled = isEnabled;
      this.updateStoreSettings({ screenReader: isEnabled });
      this.notifyListeners();
    });

    // Reduce motion
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
        this.accessibilityState.isReduceMotionEnabled = isEnabled;
        this.updateStoreSettings({ reduceMotion: isEnabled });
        this.notifyListeners();
      });
    }

    // Bold text (iOS)
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('boldTextChanged', (isEnabled) => {
        this.accessibilityState.isBoldTextEnabled = isEnabled;
        this.updateStoreSettings({ boldText: isEnabled });
        this.notifyListeners();
      });
    }

    // Reduce transparency (iOS)
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('reduceTransparencyChanged', (isEnabled) => {
        this.accessibilityState.isReduceTransparencyEnabled = isEnabled;
        this.updateStoreSettings({ reduceTransparency: isEnabled });
        this.notifyListeners();
      });
    }

    // Grayscale (iOS)
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('grayscaleChanged', (isEnabled) => {
        this.accessibilityState.isGrayscaleEnabled = isEnabled;
        this.notifyListeners();
      });
    }

    // Invert colors (iOS)
    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('invertColorsChanged', (isEnabled) => {
        this.accessibilityState.isInvertColorsEnabled = isEnabled;
        this.notifyListeners();
      });
    }
  }

  /**
   * Load initial accessibility state
   */
  private async loadInitialState(): Promise<void> {
    try {
      // Screen reader
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.accessibilityState.isScreenReaderEnabled = isScreenReaderEnabled;

      if (Platform.OS === 'ios') {
        // Reduce motion
        const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        this.accessibilityState.isReduceMotionEnabled = isReduceMotionEnabled;

        // Bold text
        const isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
        this.accessibilityState.isBoldTextEnabled = isBoldTextEnabled;

        // Reduce transparency
        const isReduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled();
        this.accessibilityState.isReduceTransparencyEnabled = isReduceTransparencyEnabled;

        // Grayscale
        const isGrayscaleEnabled = await AccessibilityInfo.isGrayscaleEnabled();
        this.accessibilityState.isGrayscaleEnabled = isGrayscaleEnabled;

        // Invert colors
        const isInvertColorsEnabled = await AccessibilityInfo.isInvertColorsEnabled();
        this.accessibilityState.isInvertColorsEnabled = isInvertColorsEnabled;
      }

      // Update store with initial state
      this.updateStoreSettings({
        screenReader: this.accessibilityState.isScreenReaderEnabled,
        reduceMotion: this.accessibilityState.isReduceMotionEnabled,
        boldText: this.accessibilityState.isBoldTextEnabled,
        reduceTransparency: this.accessibilityState.isReduceTransparencyEnabled,
      });

      this.notifyListeners();
    } catch (error) {
      console.error('Error loading accessibility state:', error);
    }
  }

  /**
   * Update store settings
   */
  private updateStoreSettings(settings: any): void {
    store.dispatch(updateAccessibilitySettings(settings));
  }

  /**
   * Notify listeners of accessibility changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Add accessibility change listener
   */
  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current accessibility state
   */
  getAccessibilityState(): AccessibilityState {
    return { ...this.accessibilityState };
  }

  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled(): boolean {
    return this.accessibilityState.isScreenReaderEnabled;
  }

  /**
   * Check if reduce motion is enabled
   */
  isReduceMotionEnabled(): boolean {
    return this.accessibilityState.isReduceMotionEnabled;
  }

  /**
   * Check if bold text is enabled
   */
  isBoldTextEnabled(): boolean {
    return this.accessibilityState.isBoldTextEnabled;
  }

  /**
   * Check if reduce transparency is enabled
   */
  isReduceTransparencyEnabled(): boolean {
    return this.accessibilityState.isReduceTransparencyEnabled;
  }

  /**
   * Announce message to screen reader
   */
  announceForAccessibility(message: string): void {
    if (this.isScreenReaderEnabled()) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  /**
   * Set accessibility focus to element
   */
  setAccessibilityFocus(reactTag: number): void {
    if (this.isScreenReaderEnabled()) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }

  /**
   * Get font scale based on accessibility settings
   */
  getFontScale(): number {
    const state = store.getState();
    const fontSize = state.settings.accessibility.fontSize;
    
    switch (fontSize) {
      case 'small': return 0.85;
      case 'normal': return 1.0;
      case 'large': return 1.15;
      case 'extraLarge': return 1.3;
      default: return 1.0;
    }
  }

  /**
   * Get scaled font size
   */
  getScaledFontSize(baseSize: number): number {
    return Math.round(baseSize * this.getFontScale());
  }

  /**
   * Get color blindness filter
   */
  getColorBlindnessFilter(type: string): ColorBlindnessFilter | null {
    return this.colorBlindnessFilters.get(type) || null;
  }

  /**
   * Apply color blindness filter to color
   */
  applyColorBlindnessFilter(color: string, filterType: string): string {
    const filter = this.getColorBlindnessFilter(filterType);
    if (!filter) return color;

    // This is a simplified implementation
    // In a real app, you'd use a proper color transformation library
    return color; // Return original color for now
  }

  /**
   * Get high contrast colors
   */
  getHighContrastColors() {
    const state = store.getState();
    const isHighContrast = state.settings.accessibility.highContrast;
    
    if (!isHighContrast) return null;
    
    return {
      background: '#000000',
      surface: '#1a1a1a',
      text: '#ffffff',
      primary: '#ffffff',
      border: '#ffffff',
      disabled: '#666666',
    };
  }

  /**
   * Get minimum touch target size
   */
  getMinimumTouchTargetSize(): { width: number; height: number } {
    const state = store.getState();
    const tapAssistance = state.settings.accessibility.tapAssistance;
    
    // iOS Human Interface Guidelines: 44x44 points
    // Android Material Design: 48x48 dp
    const baseSize = Platform.OS === 'ios' ? 44 : 48;
    const assistanceMultiplier = tapAssistance ? 1.2 : 1.0;
    
    const size = Math.round(baseSize * assistanceMultiplier);
    return { width: size, height: size };
  }

  /**
   * Get animation duration based on reduce motion setting
   */
  getAnimationDuration(baseDuration: number): number {
    if (this.isReduceMotionEnabled()) {
      return 0; // Disable animations
    }
    
    const state = store.getState();
    const animationsEnabled = state.settings.app.animations;
    
    return animationsEnabled ? baseDuration : 0;
  }

  /**
   * Get opacity based on reduce transparency setting
   */
  getOpacity(baseOpacity: number): number {
    if (this.isReduceTransparencyEnabled()) {
      return 1.0; // Remove transparency
    }
    
    return baseOpacity;
  }

  /**
   * Generate accessibility label for alert
   */
  generateAlertAccessibilityLabel(alert: any): string {
    const severity = alert.severity;
    const title = alert.title;
    const server = alert.server;
    const timestamp = new Date(alert.timestamp).toLocaleString();
    
    return `${severity} alert: ${title} on ${server} at ${timestamp}`;
  }

  /**
   * Generate accessibility hint for action
   */
  generateActionAccessibilityHint(action: string): string {
    const hints: Record<string, string> = {
      acknowledge: 'Double tap to acknowledge this alert',
      resolve: 'Double tap to resolve this alert',
      snooze: 'Double tap to snooze this alert',
      escalate: 'Double tap to escalate this alert',
      filter: 'Double tap to open filter options',
      sort: 'Double tap to open sort options',
      refresh: 'Double tap to refresh the list',
      search: 'Double tap to search alerts',
      voice: 'Double tap to start voice command',
    };
    
    return hints[action] || 'Double tap to activate';
  }

  /**
   * Check if voice commands should be enabled
   */
  shouldEnableVoiceCommands(): boolean {
    const state = store.getState();
    return state.settings.accessibility.voiceCommands || this.isScreenReaderEnabled();
  }

  /**
   * Get recommended timeout for user interactions
   */
  getInteractionTimeout(): number {
    const state = store.getState();
    const tapAssistance = state.settings.accessibility.tapAssistance;
    
    // Base timeout: 5 seconds
    // With tap assistance: 10 seconds
    return tapAssistance ? 10000 : 5000;
  }

  /**
   * Cleanup accessibility service
   */
  cleanup(): void {
    this.listeners = [];
    // Note: React Native doesn't provide removeEventListener for AccessibilityInfo
    // The listeners will be cleaned up when the app is destroyed
  }
}

export default new AccessibilityService();
