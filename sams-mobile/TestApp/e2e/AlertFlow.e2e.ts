import { device, element, by, expect, waitFor } from 'detox';

describe('SAMS Alert Flow E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {
        notifications: 'YES',
        microphone: 'YES',
        camera: 'YES',
        location: 'inuse',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    
    // Wait for app to load
    await waitFor(element(by.id('main-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Authentication Flow', () => {
    it('should authenticate with PIN', async () => {
      // Check if login screen is visible
      await expect(element(by.id('login-screen'))).toBeVisible();
      
      // Enter PIN
      await element(by.id('pin-input')).typeText('1234');
      await element(by.id('login-button')).tap();
      
      // Should navigate to main screen
      await waitFor(element(by.id('alert-list-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle biometric authentication', async () => {
      // Enable biometric in settings first
      await element(by.id('settings-tab')).tap();
      await element(by.id('security-section')).tap();
      await element(by.id('biometric-toggle')).tap();
      
      // Logout and try biometric login
      await element(by.id('logout-button')).tap();
      await element(by.id('biometric-login-button')).tap();
      
      // Simulate biometric success
      await device.setBiometricEnrollment(true);
      await device.matchBiometric();
      
      await waitFor(element(by.id('alert-list-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Alert List Operations', () => {
    beforeEach(async () => {
      // Ensure we're on the alerts screen
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display list of alerts', async () => {
      await expect(element(by.id('alert-list'))).toBeVisible();
      
      // Check if alerts are loaded
      await waitFor(element(by.id('alert-item-0')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should navigate to alert details', async () => {
      await element(by.id('alert-item-0')).tap();
      
      await waitFor(element(by.id('alert-details-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('alert-title'))).toBeVisible();
      await expect(element(by.id('alert-description'))).toBeVisible();
    });

    it('should acknowledge alert with quick action', async () => {
      await element(by.id('alert-quick-acknowledge-0')).tap();
      
      // Should show success toast
      await waitFor(element(by.text('Alert acknowledged')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Alert should show acknowledged status
      await expect(element(by.id('alert-status-acknowledged-0'))).toBeVisible();
    });

    it('should resolve alert with quick action', async () => {
      // First acknowledge the alert
      await element(by.id('alert-quick-acknowledge-0')).tap();
      await waitFor(element(by.text('Alert acknowledged')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Then resolve it
      await element(by.id('alert-quick-resolve-0')).tap();
      
      // Should show success toast
      await waitFor(element(by.text('Alert resolved')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Alert should show resolved status
      await expect(element(by.id('alert-status-resolved-0'))).toBeVisible();
    });
  });

  describe('Search and Filter', () => {
    beforeEach(async () => {
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should search alerts by text', async () => {
      await element(by.id('search-input')).typeText('CPU');
      
      // Should filter alerts containing "CPU"
      await waitFor(element(by.text('CPU Alert')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Other alerts should be hidden
      await expect(element(by.text('Memory Alert'))).not.toBeVisible();
    });

    it('should filter alerts by severity', async () => {
      await element(by.id('filter-button')).tap();
      
      await waitFor(element(by.id('filter-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Select critical severity only
      await element(by.id('severity-critical')).tap();
      await element(by.id('apply-filters-button')).tap();
      
      // Should only show critical alerts
      await waitFor(element(by.id('critical-alert-0')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should sort alerts by different criteria', async () => {
      await element(by.id('sort-button')).tap();
      
      await waitFor(element(by.id('sort-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Sort by priority
      await element(by.id('sort-priority')).tap();
      await element(by.id('sort-descending')).tap();
      await element(by.id('apply-sort-button')).tap();
      
      // Should reorder alerts by priority
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Voice Commands', () => {
    beforeEach(async () => {
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should start voice recording', async () => {
      await element(by.id('voice-command-button')).tap();
      
      await waitFor(element(by.id('voice-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.text('Listening...'))).toBeVisible();
    });

    it('should process voice command to acknowledge alert', async () => {
      // Select an alert first
      await element(by.id('alert-item-0')).tap();
      
      await waitFor(element(by.id('alert-details-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Start voice command
      await element(by.id('voice-command-button')).tap();
      
      // Simulate voice input (this would require mock setup)
      await device.sendUserNotification({
        trigger: {
          type: 'push',
        },
        title: 'Voice Command',
        subtitle: 'acknowledge this alert',
        body: 'Processing voice command...',
        badge: 1,
        payload: {
          voiceCommand: 'acknowledge this alert',
        },
      });
      
      // Should acknowledge the alert
      await waitFor(element(by.text('Alert acknowledged')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should select multiple alerts', async () => {
      // Long press to start bulk selection
      await element(by.id('alert-item-0')).longPress();
      
      await waitFor(element(by.text('1 selected')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Select additional alerts
      await element(by.id('alert-item-1')).tap();
      await element(by.id('alert-item-2')).tap();
      
      await expect(element(by.text('3 selected'))).toBeVisible();
    });

    it('should perform bulk acknowledge', async () => {
      // Select multiple alerts
      await element(by.id('alert-item-0')).longPress();
      await element(by.id('alert-item-1')).tap();
      
      // Perform bulk acknowledge
      await element(by.id('bulk-acknowledge-button')).tap();
      
      // Confirm action
      await element(by.text('Confirm')).tap();
      
      // Should show success message
      await waitFor(element(by.text('2 alerts acknowledged')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Settings and Preferences', () => {
    beforeEach(async () => {
      await element(by.id('settings-tab')).tap();
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should toggle dark mode', async () => {
      await element(by.id('appearance-section')).tap();
      await element(by.id('theme-selector')).tap();
      
      await waitFor(element(by.id('theme-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('dark-theme')).tap();
      
      // Should apply dark theme
      await waitFor(element(by.id('dark-theme-applied')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should enable haptic feedback', async () => {
      await element(by.id('interaction-section')).tap();
      await element(by.id('haptic-feedback-toggle')).tap();
      
      // Should show confirmation
      await waitFor(element(by.text('Haptic feedback enabled')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should configure accessibility settings', async () => {
      await element(by.id('accessibility-section')).tap();
      await element(by.id('accessibility-enable-toggle')).tap();
      
      // Should show accessibility options
      await waitFor(element(by.id('font-size-selector')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('font-size-selector')).tap();
      await element(by.id('large-font')).tap();
      
      // Should apply large font
      await waitFor(element(by.text('Font size changed to large')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Performance Tests', () => {
    it('should load alerts within performance threshold', async () => {
      const startTime = Date.now();
      
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle smooth scrolling with many alerts', async () => {
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Scroll through the list
      await element(by.id('alert-list')).scroll(1000, 'down');
      await element(by.id('alert-list')).scroll(1000, 'down');
      await element(by.id('alert-list')).scroll(1000, 'up');
      
      // Should maintain smooth scrolling
      await expect(element(by.id('alert-list'))).toBeVisible();
    });

    it('should maintain app responsiveness during operations', async () => {
      // Perform multiple operations quickly
      await element(by.id('alerts-tab')).tap();
      await element(by.id('search-input')).typeText('test');
      await element(by.id('filter-button')).tap();
      await element(by.id('filter-modal-close')).tap();
      await element(by.id('sort-button')).tap();
      await element(by.id('sort-modal-close')).tap();
      
      // App should remain responsive
      await expect(element(by.id('alert-list'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network failure
      await device.setURLBlacklist(['.*']);
      
      await element(by.id('alerts-tab')).tap();
      
      // Should show error message
      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Should show retry option
      await expect(element(by.id('retry-button'))).toBeVisible();
      
      // Restore network
      await device.setURLBlacklist([]);
    });

    it('should recover from app crashes', async () => {
      // This would require specific crash simulation
      // For now, we'll test app restart recovery
      await device.terminateApp();
      await device.launchApp();
      
      // Should restore to previous state
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Accessibility Tests', () => {
    it('should be navigable with screen reader', async () => {
      // Enable accessibility
      await device.setAccessibilityEnabled(true);
      
      await element(by.id('alerts-tab')).tap();
      
      // Should have proper accessibility labels
      await expect(element(by.label('Alerts list'))).toBeVisible();
      await expect(element(by.label('Alert item 1'))).toBeVisible();
    });

    it('should support voice over navigation', async () => {
      await device.setAccessibilityEnabled(true);
      
      // Navigate using accessibility
      await element(by.label('Alerts tab')).tap();
      await element(by.label('First alert item')).tap();
      
      await waitFor(element(by.label('Alert details')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Gesture Navigation', () => {
    it('should support swipe gestures', async () => {
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Swipe right to acknowledge
      await element(by.id('alert-item-0')).swipe('right', 'fast');
      
      // Should acknowledge alert
      await waitFor(element(by.text('Alert acknowledged')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should support pull to refresh', async () => {
      await element(by.id('alerts-tab')).tap();
      await waitFor(element(by.id('alert-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Pull to refresh
      await element(by.id('alert-list')).swipe('down', 'fast');
      
      // Should show refresh indicator
      await waitFor(element(by.id('refresh-indicator')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });
});
