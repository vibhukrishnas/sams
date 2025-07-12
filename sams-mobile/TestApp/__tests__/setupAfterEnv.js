/**
 * Jest Setup After Environment
 * Additional setup after the test environment is initialized
 */

import { configure } from '@testing-library/react-native';

// Configure React Native Testing Library
configure({
  testIdAttribute: 'testID',
  defaultHidden: true,
});

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithObjectContaining(received, expected) {
    const pass = received.mock.calls.some(call =>
      call.some(arg => 
        typeof arg === 'object' && 
        Object.keys(expected).every(key => arg[key] === expected[key])
      )
    );
    
    if (pass) {
      return {
        message: () =>
          `expected function not to have been called with object containing ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected function to have been called with object containing ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
  
  toHaveValidTestId(received) {
    const testId = received.props?.testID;
    const pass = typeof testId === 'string' && testId.length > 0;
    
    if (pass) {
      return {
        message: () => `expected element not to have valid testID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have valid testID, but got: ${testId}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.testUtils = {
  // Wait for next tick
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Wait for specific time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock navigation
  createMockNavigation: (overrides = {}) => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    ...overrides,
  }),
  
  // Create mock route
  createMockRoute: (params = {}, name = 'TestScreen') => ({
    params,
    name,
    key: 'test-key',
  }),
  
  // Create mock Redux store
  createMockStore: (initialState = {}) => ({
    getState: jest.fn(() => initialState),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
  }),
  
  // Mock API response
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),
  
  // Mock AsyncStorage
  mockAsyncStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
  
  // Mock NetInfo
  mockNetInfo: {
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  },
  
  // Mock push notification
  mockPushNotification: (payload = {}) => ({
    title: 'Test Notification',
    body: 'Test notification body',
    data: {},
    ...payload,
  }),
  
  // Mock file
  mockFile: (name = 'test.txt', content = 'test content', type = 'text/plain') => ({
    name,
    size: content.length,
    type,
    uri: `file://mock/${name}`,
    lastModified: Date.now(),
  }),
  
  // Mock image
  mockImage: (width = 100, height = 100) => ({
    uri: 'file://mock/image.jpg',
    width,
    height,
    type: 'image/jpeg',
    fileSize: 1024,
  }),
  
  // Mock location
  mockLocation: (latitude = 37.7749, longitude = -122.4194) => ({
    coords: {
      latitude,
      longitude,
      altitude: 0,
      accuracy: 5,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  }),
  
  // Mock device info
  mockDeviceInfo: {
    uniqueId: 'mock-unique-id',
    deviceId: 'mock-device-id',
    systemName: 'iOS',
    systemVersion: '15.0',
    model: 'iPhone',
    brand: 'Apple',
    bundleId: 'com.sams.testapp',
    version: '1.0.0',
    buildNumber: '1',
    isEmulator: true,
  },
  
  // Mock biometric result
  mockBiometricResult: (success = true) => ({
    success,
    biometryType: 'TouchID',
    available: true,
  }),
  
  // Mock permissions result
  mockPermissionResult: (status = 'granted') => status,
  
  // Create test component wrapper
  createTestWrapper: (Component, props = {}) => {
    const TestWrapper = (additionalProps) => (
      <Component {...props} {...additionalProps} />
    );
    TestWrapper.displayName = `TestWrapper(${Component.displayName || Component.name})`;
    return TestWrapper;
  },
  
  // Simulate user interaction
  simulateUserInteraction: async (element, interaction = 'press') => {
    const { fireEvent } = require('@testing-library/react-native');
    
    switch (interaction) {
      case 'press':
        fireEvent.press(element);
        break;
      case 'changeText':
        fireEvent.changeText(element, 'test text');
        break;
      case 'scroll':
        fireEvent.scroll(element, { nativeEvent: { contentOffset: { y: 100 } } });
        break;
      default:
        fireEvent(element, interaction);
    }
    
    // Wait for any async updates
    await global.testUtils.waitForNextTick();
  },
  
  // Assert element accessibility
  assertAccessibility: (element) => {
    expect(element).toHaveValidTestId();
    
    // Check for accessibility label or text
    const hasAccessibilityLabel = element.props?.accessibilityLabel;
    const hasText = element.props?.children;
    
    expect(hasAccessibilityLabel || hasText).toBeTruthy();
  },
  
  // Performance measurement
  measurePerformance: (fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    return {
      result,
      duration: end - start,
    };
  },
  
  // Memory usage simulation
  simulateMemoryPressure: () => {
    // Simulate memory pressure by creating large objects
    const largeArray = new Array(1000000).fill('memory pressure test');
    setTimeout(() => {
      largeArray.length = 0;
    }, 100);
  },
};

// Global hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  global.fetch.mockClear();
  
  // Reset AsyncStorage mock
  require('@react-native-async-storage/async-storage').getItem.mockClear();
  require('@react-native-async-storage/async-storage').setItem.mockClear();
  require('@react-native-async-storage/async-storage').removeItem.mockClear();
  
  // Reset NetInfo mock
  require('@react-native-community/netinfo').fetch.mockResolvedValue(global.testUtils.mockNetInfo);
});

afterEach(() => {
  // Clean up any timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Error handling
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress known React Native warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: React.createElement') ||
       args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: componentWillMount') ||
       args[0].includes('Warning: componentWillReceiveProps'))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set default timeout for all tests
jest.setTimeout(30000);
