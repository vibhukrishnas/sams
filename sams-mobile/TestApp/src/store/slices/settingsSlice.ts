import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  criticalOnly: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockTimeout: number; // minutes
  requireAuthOnLaunch: boolean;
  sessionTimeout: number; // minutes
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  refreshInterval: number; // seconds
  maxRetries: number;
  timeout: number; // milliseconds
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  systemTheme: 'light' | 'dark';
  animations: boolean;
  hapticFeedback: boolean;
  gestureNavigation: boolean;
  compactMode: boolean;
  showTutorials: boolean;
}

export interface AccessibilitySettings {
  enabled: boolean;
  fontSize: 'small' | 'normal' | 'large' | 'extraLarge';
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  voiceOver: boolean;
  largeText: boolean;
  boldText: boolean;
  buttonShapes: boolean;
  reduceTransparency: boolean;
  colorBlindSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  focusIndicator: boolean;
  tapAssistance: boolean;
  voiceCommands: boolean;
}

export interface ServerSettings {
  defaultServer: string | null;
  autoConnect: boolean;
  connectionTimeout: number; // seconds
  retryInterval: number; // seconds
  maxConnectionRetries: number;
}

export interface SettingsState {
  notifications: NotificationSettings;
  security: SecuritySettings;
  app: AppSettings;
  server: ServerSettings;
  accessibility: AccessibilitySettings;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: SettingsState = {
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    criticalOnly: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
  security: {
    biometricEnabled: false,
    pinEnabled: false,
    autoLockTimeout: 5,
    requireAuthOnLaunch: true,
    sessionTimeout: 30,
  },
  app: {
    theme: 'system',
    language: 'en',
    refreshInterval: 30,
    maxRetries: 3,
    timeout: 10000,
    enableAnalytics: true,
    enableCrashReporting: true,
    systemTheme: 'light',
    animations: true,
    hapticFeedback: true,
    gestureNavigation: true,
    compactMode: false,
    showTutorials: true,
  },
  accessibility: {
    enabled: false,
    fontSize: 'normal',
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    voiceOver: false,
    largeText: false,
    boldText: false,
    buttonShapes: false,
    reduceTransparency: false,
    colorBlindSupport: 'none',
    focusIndicator: true,
    tapAssistance: false,
    voiceCommands: false,
  },
  server: {
    defaultServer: null,
    autoConnect: true,
    connectionTimeout: 10,
    retryInterval: 5,
    maxConnectionRetries: 3,
  },
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Notification settings
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    
    // Security settings
    updateSecuritySettings: (state, action: PayloadAction<Partial<SecuritySettings>>) => {
      state.security = { ...state.security, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    
    // App settings
    updateAppSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.app = { ...state.app, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    
    // Server settings
    updateServerSettings: (state, action: PayloadAction<Partial<ServerSettings>>) => {
      state.server = { ...state.server, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    
    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.app.theme = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // System theme
    setSystemTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.app.systemTheme = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Accessibility settings
    updateAccessibilitySettings: (state, action: PayloadAction<Partial<AccessibilitySettings>>) => {
      state.accessibility = { ...state.accessibility, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },

    // Haptic feedback
    setHapticFeedback: (state, action: PayloadAction<boolean>) => {
      state.app.hapticFeedback = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Animations
    setAnimations: (state, action: PayloadAction<boolean>) => {
      state.app.animations = action.payload;
      state.lastUpdated = new Date().toISOString();
    },

    // Gesture navigation
    setGestureNavigation: (state, action: PayloadAction<boolean>) => {
      state.app.gestureNavigation = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    // Language
    setLanguage: (state, action: PayloadAction<string>) => {
      state.app.language = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    // Biometric
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.security.biometricEnabled = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    // PIN
    setPinEnabled: (state, action: PayloadAction<boolean>) => {
      state.security.pinEnabled = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    // Reset settings
    resetSettings: () => initialState,
    
    // Bulk update
    updateAllSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload, lastUpdated: new Date().toISOString() };
    },
  },
});

export const {
  updateNotificationSettings,
  updateSecuritySettings,
  updateAppSettings,
  updateServerSettings,
  setTheme,
  setSystemTheme,
  updateAccessibilitySettings,
  setHapticFeedback,
  setAnimations,
  setGestureNavigation,
  setLanguage,
  setBiometricEnabled,
  setPinEnabled,
  setLoading,
  setError,
  resetSettings,
  updateAllSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
