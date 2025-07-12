import { jest } from '@jest/globals';

// Mock Redux Store
export const mockStore = {
  getState: jest.fn(() => ({
    alerts: {
      alerts: [],
      filteredAlerts: [],
      selectedAlert: null,
      isLoading: false,
      error: null,
    },
    settings: {
      app: {
        theme: 'light',
        language: 'en',
        hapticFeedback: true,
        animations: true,
        gestureNavigation: true,
      },
      accessibility: {
        enabled: false,
        fontSize: 'normal',
        highContrast: false,
        reduceMotion: false,
        voiceCommands: false,
      },
      security: {
        biometricEnabled: false,
        pinEnabled: false,
        autoLock: true,
      },
      notifications: {
        enabled: true,
        sound: true,
        vibration: true,
        critical: true,
        warning: true,
        info: false,
      },
    },
    ui: {
      toasts: [],
      modals: {},
      loading: {},
    },
  })),
  dispatch: jest.fn(),
  subscribe: jest.fn(),
};

// Mock Enhanced Alert
export const mockEnhancedAlert = {
  id: '1',
  title: 'Test Alert',
  description: 'Test alert description',
  severity: 'critical' as const,
  server: 'Test Server',
  serverId: 'srv-001',
  timestamp: '2024-01-01T00:00:00.000Z',
  acknowledged: false,
  resolved: false,
  category: 'Performance',
  tags: ['test', 'performance'],
  priority: 8,
  escalationLevel: 1,
};

// Mock Services
export const mockHapticService = {
  trigger: jest.fn(),
  buttonPress: jest.fn(),
  buttonLongPress: jest.fn(),
  criticalAlert: jest.fn(),
  warningAlert: jest.fn(),
  infoAlert: jest.fn(),
  successAction: jest.fn(),
  errorAction: jest.fn(),
  updateSettings: jest.fn(),
  isAvailable: jest.fn(() => true),
};

export const mockVoiceService = {
  initialize: jest.fn(() => Promise.resolve(true)),
  startListening: jest.fn(() => Promise.resolve(true)),
  stopListening: jest.fn(() => Promise.resolve()),
  cancelListening: jest.fn(() => Promise.resolve()),
  setLanguage: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  destroy: jest.fn(() => Promise.resolve()),
};

export const mockAccessibilityService = {
  getAccessibilityState: jest.fn(() => ({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    preferredContentSizeCategory: 'medium',
  })),
  isScreenReaderEnabled: jest.fn(() => false),
  isReduceMotionEnabled: jest.fn(() => false),
  announceForAccessibility: jest.fn(),
  setAccessibilityFocus: jest.fn(),
  getFontScale: jest.fn(() => 1.0),
  getScaledFontSize: jest.fn((size: number) => size),
  addListener: jest.fn(() => jest.fn()),
};

export const mockBiometricService = {
  initialize: jest.fn(() => Promise.resolve()),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  getAvailableBiometrics: jest.fn(() => [
    { type: 'TouchID', available: true, enrolled: true },
  ]),
  getPrimaryBiometricType: jest.fn(() => ({ type: 'TouchID', available: true, enrolled: true })),
  authenticate: jest.fn(() => Promise.resolve({ success: true, biometricType: 'TouchID' })),
  enableBiometric: jest.fn(() => Promise.resolve({ success: true })),
  disableBiometric: jest.fn(() => Promise.resolve()),
  isBiometricEnabled: jest.fn(() => false),
  getBiometricIcon: jest.fn(() => 'fingerprint'),
  cleanup: jest.fn(),
};

export const mockGestureService = {
  updateSettings: jest.fn(),
  createSwipeHandler: jest.fn(() => ({
    onGestureEvent: jest.fn(),
    onHandlerStateChange: jest.fn(),
  })),
  createPinchHandler: jest.fn(() => ({
    onGestureEvent: jest.fn(),
  })),
  createLongPressHandler: jest.fn(() => ({
    onGestureEvent: jest.fn(),
  })),
  createTapHandler: jest.fn(() => ({
    onGestureEvent: jest.fn(),
  })),
  isGestureEnabled: jest.fn(() => true),
  setGestureEnabled: jest.fn(),
};

export const mockAlertAnalyticsService = {
  generateAnalytics: jest.fn(() => ({
    totalAlerts: 100,
    criticalAlerts: 20,
    warningAlerts: 50,
    infoAlerts: 30,
    resolvedAlerts: 80,
    averageResponseTime: 300000,
    averageResolutionTime: 1800000,
    topServers: [],
    trendData: [],
    categoryBreakdown: [],
    hourlyDistribution: [],
    escalationStats: [],
  })),
  predictAlertFrequency: jest.fn(() => 50),
  calculateResolutionEfficiency: jest.fn(() => 80),
  identifyPatterns: jest.fn(() => []),
};

// Mock Navigation
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(() => 'test-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    index: 0,
    routes: [{ name: 'Test', key: 'test-key' }],
  })),
  reset: jest.fn(),
  setParams: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
};

export const mockRoute = {
  key: 'test-key',
  name: 'TestScreen',
  params: {},
  path: undefined,
};

// Mock Theme
export const mockTheme = {
  colors: {
    primary: '#1976D2',
    primaryDark: '#1565C0',
    primaryLight: '#42A5F5',
    secondary: '#03DAC6',
    accent: '#FF4081',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#BDBDBD',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    border: '#E0E0E0',
    divider: '#F0F0F0',
  },
  dark: false,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 },
    h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    body1: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
  },
};

// Mock API Responses
export const mockApiResponses = {
  alerts: {
    success: {
      data: [mockEnhancedAlert],
      total: 1,
      page: 1,
      limit: 10,
    },
    error: {
      error: 'Failed to fetch alerts',
      code: 'FETCH_ERROR',
    },
  },
  servers: {
    success: {
      data: [
        {
          id: 'srv-001',
          name: 'Test Server',
          ip: '192.168.1.10',
          status: 'online',
          lastSeen: '2024-01-01T00:00:00.000Z',
        },
      ],
    },
  },
  authentication: {
    success: {
      token: 'mock-jwt-token',
      user: {
        id: '1',
        username: 'testuser',
        role: 'admin',
      },
    },
    error: {
      error: 'Invalid credentials',
      code: 'AUTH_ERROR',
    },
  },
};

// Test Data Factories
export const createMockAlert = (overrides = {}) => ({
  ...mockEnhancedAlert,
  ...overrides,
});

export const createMockServer = (overrides = {}) => ({
  id: 'srv-001',
  name: 'Test Server',
  ip: '192.168.1.10',
  status: 'online',
  lastSeen: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  ...overrides,
});

// Performance Testing Helpers
export const mockPerformanceEntry = {
  name: 'test-metric',
  entryType: 'measure',
  startTime: 0,
  duration: 100,
  detail: null,
};

export const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
};

// Memory Testing Helpers
export const mockMemoryInfo = {
  usedJSHeapSize: 10000000,
  totalJSHeapSize: 20000000,
  jsHeapSizeLimit: 100000000,
};

// Network Testing Helpers
export const mockNetworkInfo = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    cellularGeneration: null,
    carrier: null,
  },
};

// Error Boundary Testing
export const mockErrorBoundary = {
  componentDidCatch: jest.fn(),
  render: jest.fn(),
};

// Crash Reporting Mock
export const mockCrashlytics = {
  recordError: jest.fn(),
  log: jest.fn(),
  setUserId: jest.fn(),
  setAttributes: jest.fn(),
  crash: jest.fn(),
};

export default {
  mockStore,
  mockEnhancedAlert,
  mockHapticService,
  mockVoiceService,
  mockAccessibilityService,
  mockBiometricService,
  mockGestureService,
  mockAlertAnalyticsService,
  mockNavigation,
  mockRoute,
  mockTheme,
  mockApiResponses,
  createMockAlert,
  createMockServer,
  createMockUser,
};
