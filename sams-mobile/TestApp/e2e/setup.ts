/**
 * Detox E2E Test Setup
 * Global setup for end-to-end testing
 */

import { device, cleanup, init } from 'detox';

const config = require('../.detoxrc.js');

// Global test timeout
jest.setTimeout(120000);

beforeAll(async () => {
  console.log('🚀 Starting E2E test setup...');
  
  try {
    // Initialize Detox
    await init(config, { initGlobals: false });
    console.log('✅ Detox initialized');
    
    // Launch the app
    await device.launchApp({
      permissions: {
        notifications: 'YES',
        camera: 'YES',
        microphone: 'YES',
        location: 'inuse',
      },
      newInstance: true,
    });
    console.log('✅ App launched');
    
    // Wait for app to be ready
    await device.waitUntilReady();
    console.log('✅ App ready');
    
  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  }
});

beforeEach(async () => {
  // Reset app state before each test
  await device.reloadReactNative();
  
  // Clear any existing data
  await device.clearKeychain();
  
  // Reset to initial screen
  await device.launchApp({ newInstance: false });
});

afterEach(async () => {
  // Take screenshot on test failure
  if (jasmine.currentSpec && jasmine.currentSpec.failedExpectations.length > 0) {
    const specName = jasmine.currentSpec.fullName.replace(/\s/g, '_');
    await device.takeScreenshot(`failed_${specName}`);
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E tests...');
  
  try {
    // Cleanup Detox
    await cleanup();
    console.log('✅ E2E cleanup completed');
  } catch (error) {
    console.error('❌ E2E cleanup failed:', error);
  }
});

// Global test helpers
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

global.waitForElement = async (element: any, timeout = 10000) => {
  await waitFor(element).toBeVisible().withTimeout(timeout);
};

global.tapElement = async (element: any) => {
  await element.tap();
  await sleep(500); // Wait for animation
};

global.typeText = async (element: any, text: string) => {
  await element.typeText(text);
  await sleep(300);
};

global.scrollToElement = async (scrollView: any, element: any) => {
  await waitFor(element).toBeVisible().whileElement(by.id(scrollView)).scroll(200, 'down');
};

// Custom matchers for Detox
expect.extend({
  async toBeVisibleOnScreen(element) {
    try {
      await waitFor(element).toBeVisible().withTimeout(5000);
      return {
        message: () => 'Element is visible on screen',
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Element is not visible on screen: ${error.message}`,
        pass: false,
      };
    }
  },
  
  async toHaveTextContent(element, expectedText) {
    try {
      await expect(element).toHaveText(expectedText);
      return {
        message: () => `Element has text content: ${expectedText}`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Element does not have expected text content: ${error.message}`,
        pass: false,
      };
    }
  },
});

// Declare global types
declare global {
  function sleep(ms: number): Promise<void>;
  function waitForElement(element: any, timeout?: number): Promise<void>;
  function tapElement(element: any): Promise<void>;
  function typeText(element: any, text: string): Promise<void>;
  function scrollToElement(scrollView: any, element: any): Promise<void>;
  
  namespace jest {
    interface Matchers<R> {
      toBeVisibleOnScreen(): Promise<R>;
      toHaveTextContent(expectedText: string): Promise<R>;
    }
  }
}

// Test data helpers
export const testData = {
  validCredentials: {
    username: 'testuser',
    password: 'testpass123',
    pin: '1234',
  },
  invalidCredentials: {
    username: 'invalid',
    password: 'wrong',
    pin: '0000',
  },
  mockServer: {
    name: 'Test Server',
    ip: '192.168.1.100',
    port: '8080',
  },
  mockAlert: {
    title: 'Test Alert',
    message: 'This is a test alert for E2E testing',
    severity: 'high',
  },
};

// Page object helpers
export const selectors = {
  // Login screen
  loginScreen: by.id('login-screen'),
  usernameInput: by.id('username-input'),
  passwordInput: by.id('password-input'),
  loginButton: by.id('login-button'),
  
  // PIN screen
  pinScreen: by.id('pin-screen'),
  pinInput: by.id('pin-input'),
  pinButton: by.id('pin-button'),
  
  // Dashboard
  dashboardScreen: by.id('dashboard-screen'),
  alertsTab: by.id('alerts-tab'),
  serversTab: by.id('servers-tab'),
  settingsTab: by.id('settings-tab'),
  
  // Alerts screen
  alertsScreen: by.id('alerts-screen'),
  alertsList: by.id('alerts-list'),
  alertCard: (id: string) => by.id(`alert-card-${id}`),
  acknowledgeButton: (id: string) => by.id(`acknowledge-button-${id}`),
  resolveButton: (id: string) => by.id(`resolve-button-${id}`),
  
  // Servers screen
  serversScreen: by.id('servers-screen'),
  serversList: by.id('servers-list'),
  serverCard: (id: string) => by.id(`server-card-${id}`),
  addServerButton: by.id('add-server-button'),
  
  // Common elements
  backButton: by.id('back-button'),
  menuButton: by.id('menu-button'),
  searchInput: by.id('search-input'),
  refreshButton: by.id('refresh-button'),
  loadingIndicator: by.id('loading-indicator'),
  errorMessage: by.id('error-message'),
  successMessage: by.id('success-message'),
};

// Network helpers
export const networkHelpers = {
  enableNetwork: async () => {
    await device.enableSynchronization();
  },
  
  disableNetwork: async () => {
    await device.disableSynchronization();
  },
  
  simulateSlowNetwork: async () => {
    // This would require additional setup with network conditioning tools
    console.log('Simulating slow network...');
  },
};

// Device helpers
export const deviceHelpers = {
  rotateToLandscape: async () => {
    await device.setOrientation('landscape');
    await sleep(1000);
  },
  
  rotateToPortrait: async () => {
    await device.setOrientation('portrait');
    await sleep(1000);
  },
  
  sendToBackground: async () => {
    await device.sendToHome();
    await sleep(2000);
    await device.launchApp({ newInstance: false });
  },
  
  shakeDevice: async () => {
    await device.shake();
    await sleep(500);
  },
};
