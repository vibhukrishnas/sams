import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { jest } from '@jest/globals';

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
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
    PermissionsAndroid: {
      request: jest.fn(() => Promise.resolve('granted')),
      check: jest.fn(() => Promise.resolve(true)),
      PERMISSIONS: {
        RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
        CAMERA: 'android.permission.CAMERA',
        ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      },
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
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: {},
      name: 'TestScreen',
      key: 'test-key',
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

// Mock Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');

// Mock Haptic Feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    selection: 'selection',
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
  },
}));

// Mock Voice Recognition
jest.mock('@react-native-voice/voice', () => ({
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  cancel: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  getSpeechRecognitionServices: jest.fn(() => Promise.resolve(['en-US'])),
  onSpeechStart: null,
  onSpeechEnd: null,
  onSpeechResults: null,
  onSpeechError: null,
  onSpeechPartialResults: null,
  onSpeechRecognized: null,
}));

// Mock Biometric Authentication
jest.mock('react-native-touch-id', () => ({
  isSupported: jest.fn(() => Promise.resolve('TouchID')),
  authenticate: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-fingerprint-scanner', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve(true)),
  authenticate: jest.fn(() => Promise.resolve()),
  release: jest.fn(),
}));

// Mock Linear Gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 44, right: 0, bottom: 34, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

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
    gestureHandlerRootHOC: jest.fn((component) => component),
    Directions: {},
  };
});

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'wifi' })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Date/Time Picker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock Slider
jest.mock('@react-native-community/slider', () => 'Slider');

// Mock Clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.warn and console.error in tests unless explicitly needed
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

// Global test helpers
global.flushPromises = () => new Promise(setImmediate);

global.waitFor = (callback: () => void, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      try {
        callback();
        resolve(true);
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(check, 100);
        }
      }
    };
    check();
  });
};

// Performance monitoring mock
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
} as any;

// Accessibility testing helpers
global.axe = {
  run: jest.fn(() => Promise.resolve({ violations: [] })),
  configure: jest.fn(),
};

export {};
