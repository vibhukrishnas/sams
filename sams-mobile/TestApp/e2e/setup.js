/**
 * Detox E2E Test Setup
 * Global setup for mobile end-to-end testing
 */

const { device, expect, element, by, waitFor } = require('detox');

// Extend Jest matchers with Detox matchers
expect.extend(require('detox/runners/jest/matchers'));

// Global test configuration
const TEST_CONFIG = {
  defaultTimeout: 30000,
  longTimeout: 60000,
  shortTimeout: 5000,
  retryAttempts: 3,
};

// Global test utilities
global.testUtils = {
  // Wait for element to appear
  waitForElement: async (elementMatcher, timeout = TEST_CONFIG.defaultTimeout) => {
    await waitFor(element(elementMatcher))
      .toBeVisible()
      .withTimeout(timeout);
  },

  // Wait for element to disappear
  waitForElementToDisappear: async (elementMatcher, timeout = TEST_CONFIG.defaultTimeout) => {
    await waitFor(element(elementMatcher))
      .not.toBeVisible()
      .withTimeout(timeout);
  },

  // Type text with retry
  typeTextWithRetry: async (elementMatcher, text, retries = TEST_CONFIG.retryAttempts) => {
    for (let i = 0; i < retries; i++) {
      try {
        await element(elementMatcher).typeText(text);
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await device.sleep(1000);
      }
    }
  },

  // Tap with retry
  tapWithRetry: async (elementMatcher, retries = TEST_CONFIG.retryAttempts) => {
    for (let i = 0; i < retries; i++) {
      try {
        await element(elementMatcher).tap();
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await device.sleep(1000);
      }
    }
  },

  // Scroll to element
  scrollToElement: async (scrollViewMatcher, elementMatcher, direction = 'down') => {
    await waitFor(element(elementMatcher))
      .toBeVisible()
      .whileElement(scrollViewMatcher)
      .scroll(200, direction);
  },

  // Take screenshot with timestamp
  takeScreenshot: async (name) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await device.takeScreenshot(`${name}-${timestamp}`);
  },

  // Login helper
  login: async (username = 'admin@sams.com', password = 'password123') => {
    await global.testUtils.waitForElement(by.id('login-screen'));
    await global.testUtils.typeTextWithRetry(by.id('username-input'), username);
    await global.testUtils.typeTextWithRetry(by.id('password-input'), password);
    await global.testUtils.tapWithRetry(by.id('login-button'));
    await global.testUtils.waitForElement(by.id('dashboard-screen'));
  },

  // Logout helper
  logout: async () => {
    await global.testUtils.tapWithRetry(by.id('profile-menu'));
    await global.testUtils.tapWithRetry(by.id('logout-button'));
    await global.testUtils.waitForElement(by.id('login-screen'));
  },

  // Reset app state
  resetApp: async () => {
    await device.reloadReactNative();
    await device.sleep(2000);
  },

  // Handle permissions
  allowPermissions: async () => {
    if (device.getPlatform() === 'ios') {
      await device.system.element.by.text('Allow').tap();
    } else {
      await device.system.element.by.text('ALLOW').tap();
    }
  },

  // Network helpers
  enableNetwork: async () => {
    await device.setNetworkConnection(true);
  },

  disableNetwork: async () => {
    await device.setNetworkConnection(false);
  },

  // Device orientation helpers
  setPortrait: async () => {
    await device.setOrientation('portrait');
  },

  setLandscape: async () => {
    await device.setOrientation('landscape');
  },

  // Biometric helpers
  enableBiometrics: async () => {
    if (device.getPlatform() === 'ios') {
      await device.setBiometricEnrollment(true);
    }
  },

  matchBiometric: async () => {
    if (device.getPlatform() === 'ios') {
      await device.matchBiometric();
    }
  },

  unmatchBiometric: async () => {
    if (device.getPlatform() === 'ios') {
      await device.unmatchBiometric();
    }
  },

  // Push notification helpers
  sendPushNotification: async (payload) => {
    await device.sendUserNotification({
      trigger: {
        type: 'push',
      },
      title: payload.title || 'Test Notification',
      body: payload.body || 'Test notification body',
      payload: payload.data || {},
    });
  },

  // App state helpers
  sendAppToBackground: async (duration = 2000) => {
    await device.sendToHome();
    await device.sleep(duration);
    await device.launchApp({ newInstance: false });
  },

  // Memory and performance helpers
  getMemoryUsage: async () => {
    // This would require native implementation
    return { used: 0, total: 0 };
  },

  // Wait for network request
  waitForNetworkIdle: async (timeout = 5000) => {
    await device.sleep(timeout);
  },

  // Custom assertions
  expectElementToExist: async (elementMatcher) => {
    await expect(element(elementMatcher)).toExist();
  },

  expectElementToBeVisible: async (elementMatcher) => {
    await expect(element(elementMatcher)).toBeVisible();
  },

  expectElementToHaveText: async (elementMatcher, text) => {
    await expect(element(elementMatcher)).toHaveText(text);
  },

  expectElementToHaveValue: async (elementMatcher, value) => {
    await expect(element(elementMatcher)).toHaveValue(value);
  },
};

// Global hooks
beforeAll(async () => {
  console.log('🚀 Starting SAMS Mobile E2E Test Suite');
  
  // Set default timeouts
  jest.setTimeout(TEST_CONFIG.longTimeout);
  
  // Initialize device
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES', camera: 'YES', location: 'inuse' },
  });
  
  // Wait for app to be ready
  await device.sleep(3000);
});

beforeEach(async () => {
  // Reset app state before each test
  await device.reloadReactNative();
  await device.sleep(2000);
});

afterEach(async () => {
  // Take screenshot on failure
  if (jasmine.currentTest && jasmine.currentTest.failedExpectations.length > 0) {
    const testName = jasmine.currentTest.fullName.replace(/\s+/g, '-');
    await global.testUtils.takeScreenshot(`failed-${testName}`);
  }
  
  // Reset network state
  await global.testUtils.enableNetwork();
  
  // Reset orientation
  await global.testUtils.setPortrait();
});

afterAll(async () => {
  console.log('✅ SAMS Mobile E2E Test Suite Completed');
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Export configuration for use in tests
module.exports = {
  TEST_CONFIG,
};
