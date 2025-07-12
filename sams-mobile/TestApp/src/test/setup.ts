/**
 * Test Setup Configuration
 * Global test setup for React Native testing
 */

import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      ...RN.Platform,
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    Vibration: {
      vibrate: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
    Share: {
      share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    },
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
    },
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      isFocused: jest.fn(() => true),
    }),
    useRoute: () => ({
      params: {},
      name: 'TestScreen',
      key: 'test-key',
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(() => true),
  };
});

// Mock Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock Haptic Feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock Voice Recognition
jest.mock('@react-native-voice/voice', () => ({
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  removeAllListeners: jest.fn(),
  onSpeechStart: null,
  onSpeechRecognized: null,
  onSpeechEnd: null,
  onSpeechError: null,
  onSpeechResults: null,
  onSpeechPartialResults: null,
}));

// Mock Biometric Authentication
jest.mock('react-native-touch-id', () => ({
  isSupported: jest.fn(() => Promise.resolve('TouchID')),
  authenticate: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'TouchID' })),
  createSignature: jest.fn(() => Promise.resolve({ success: true, signature: 'mock-signature' })),
}));

// Mock Push Notifications
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  cancelLocalNotifications: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  createChannel: jest.fn(),
}));

jest.mock('@react-native-push-notification-ios/push-notification-ios', () => ({
  scheduleLocalNotification: jest.fn(),
  removeAllDeliveredNotifications: jest.fn(),
  setNotificationCategories: jest.fn(),
  addEventListener: jest.fn(),
  checkPermissions: jest.fn(() => Promise.resolve({ alert: true, badge: true, sound: true })),
  requestPermissions: jest.fn(() => Promise.resolve({ alert: true, badge: true, sound: true })),
}));

// Mock Device Info
jest.mock('react-native-device-info', () => ({
  getModel: jest.fn(() => 'iPhone 14 Pro'),
  getDeviceType: jest.fn(() => Promise.resolve('Handset')),
  isTablet: jest.fn(() => false),
}));

// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Chart Kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
  ProgressChart: 'ProgressChart',
  ContributionGraph: 'ContributionGraph',
  StackedBarChart: 'StackedBarChart',
}));

// Mock Firebase Crashlytics
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
    setUserId: jest.fn(() => Promise.resolve()),
    setAttribute: jest.fn(),
    log: jest.fn(),
    recordError: jest.fn(),
    crash: jest.fn(),
  })),
}));

// Mock Date Time Picker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// Global test utilities
global.fetch = jest.fn();

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers
jest.useFakeTimers();

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers();
});

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}
