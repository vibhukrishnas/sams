const { device, expect, element, by, waitFor } = require('detox');

describe('SAMS Mobile App E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen on launch', async () => {
    await expect(element(by.text('SAMS Login'))).toBeVisible();
  });

  it('should navigate to dashboard after login', async () => {
    // This is a placeholder test - actual implementation would depend on your app structure
    await expect(element(by.id('loginScreen'))).toBeVisible();
  });
});
