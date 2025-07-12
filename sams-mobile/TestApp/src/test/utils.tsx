/**
 * Test Utilities
 * Common utilities and helpers for testing React Native components
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureStore } from '@reduxjs/toolkit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import your store slices
import authSlice from '../store/slices/authSlice';
import alertsSlice from '../store/slices/alertsSlice';
import serversSlice from '../store/slices/serversSlice';
import { samsApi } from '../store/api/samsApi';

// Mock store configuration
export const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      alerts: alertsSlice,
      servers: serversSlice,
      [samsApi.reducerPath]: samsApi.reducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(samsApi.middleware),
  });
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  store?: any;
  navigationOptions?: any;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    initialState = {},
    store = createMockStore(initialState),
    navigationOptions = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <NavigationContainer {...navigationOptions}>
            {children}
          </NavigationContainer>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Mock navigation object
export const createMockNavigation = (overrides = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(() => 'mock-id'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({})),
  reset: jest.fn(),
  setParams: jest.fn(),
  ...overrides,
});

// Mock route object
export const createMockRoute = (overrides = {}) => ({
  key: 'mock-key',
  name: 'MockScreen',
  params: {},
  ...overrides,
});

// Mock alert data
export const createMockAlert = (overrides = {}) => ({
  id: 'alert-1',
  title: 'Test Alert',
  message: 'This is a test alert',
  severity: 'high' as const,
  status: 'unacknowledged' as const,
  timestamp: new Date().toISOString(),
  serverName: 'test-server',
  category: 'system',
  ...overrides,
});

// Mock server data
export const createMockServer = (overrides = {}) => ({
  id: 'server-1',
  name: 'Test Server',
  ip: '192.168.1.100',
  status: 'online' as const,
  cpu: 45,
  memory: 67,
  disk: 23,
  network: 12,
  uptime: '5 days',
  lastSeen: new Date().toISOString(),
  alerts: 2,
  ...overrides,
});

// Mock user data
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin' as const,
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  ...overrides,
});

// Mock API responses
export const createMockApiResponse = <T>(data: T, overrides = {}) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
  ...overrides,
});

// Mock fetch response
export const createMockFetchResponse = <T>(data: T, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response);
};

// Test data generators
export const generateMockAlerts = (count: number) => {
  return Array.from({ length: count }, (_, index) =>
    createMockAlert({
      id: `alert-${index + 1}`,
      title: `Alert ${index + 1}`,
      severity: ['critical', 'high', 'medium', 'low'][index % 4] as any,
    })
  );
};

export const generateMockServers = (count: number) => {
  return Array.from({ length: count }, (_, index) =>
    createMockServer({
      id: `server-${index + 1}`,
      name: `Server ${index + 1}`,
      ip: `192.168.1.${100 + index}`,
      status: ['online', 'offline', 'warning'][index % 3] as any,
    })
  );
};

// Async test helpers
export const waitForAsync = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const flushPromises = () => {
  return new Promise(resolve => setImmediate(resolve));
};

// Mock timers helpers
export const advanceTimersByTime = (ms: number) => {
  jest.advanceTimersByTime(ms);
};

export const runAllTimers = () => {
  jest.runAllTimers();
};

// Component test helpers
export const fireEvent = {
  press: (element: any) => {
    element.props.onPress?.();
  },
  changeText: (element: any, text: string) => {
    element.props.onChangeText?.(text);
  },
  longPress: (element: any) => {
    element.props.onLongPress?.();
  },
  swipe: (element: any, direction: 'left' | 'right' | 'up' | 'down') => {
    const swipeHandlers = {
      left: element.props.onSwipeLeft,
      right: element.props.onSwipeRight,
      up: element.props.onSwipeUp,
      down: element.props.onSwipeDown,
    };
    swipeHandlers[direction]?.();
  },
};

// Performance test helpers
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  await flushPromises();
  const end = performance.now();
  return end - start;
};

// Memory test helpers
export const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

// Accessibility test helpers
export const checkAccessibility = (element: any) => {
  const issues = [];
  
  if (!element.props.accessible && !element.props.accessibilityLabel) {
    issues.push('Missing accessibility label');
  }
  
  if (element.props.onPress && !element.props.accessibilityRole) {
    issues.push('Missing accessibility role for interactive element');
  }
  
  return issues;
};

// Network test helpers
export const mockNetworkResponse = (url: string, response: any, delay = 0) => {
  (global.fetch as jest.Mock).mockImplementation((requestUrl) => {
    if (requestUrl.includes(url)) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(createMockFetchResponse(response));
        }, delay);
      });
    }
    return Promise.reject(new Error('Network request not mocked'));
  });
};

export const mockNetworkError = (url: string, error = 'Network Error') => {
  (global.fetch as jest.Mock).mockImplementation((requestUrl) => {
    if (requestUrl.includes(url)) {
      return Promise.reject(new Error(error));
    }
    return Promise.reject(new Error('Network request not mocked'));
  });
};

// Export all utilities
export * from '@testing-library/react-native';
