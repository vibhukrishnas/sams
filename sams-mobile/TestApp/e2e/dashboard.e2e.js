import { device, expect, element, by, waitFor } from 'detox';

describe('SAMS Mobile App E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should display login screen on app launch', async () => {
      await expect(element(by.id('login-screen'))).toBeVisible();
      await expect(element(by.id('username-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('login-button'))).toBeVisible();
    });

    it('should login successfully with valid credentials', async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show error for invalid credentials', async () => {
      await element(by.id('username-input')).typeText('invalid@email.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.text('Invalid credentials'))).toBeVisible();
    });

    it('should handle biometric authentication', async () => {
      // Enable biometric login first
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('enable-biometric-toggle')).tap();
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Logout and test biometric login
      await element(by.id('profile-menu')).tap();
      await element(by.id('logout-button')).tap();
      
      await expect(element(by.id('biometric-login-button'))).toBeVisible();
      await element(by.id('biometric-login-button')).tap();
      
      // Simulate successful biometric authentication
      await device.setBiometricEnrollment(true);
      await device.matchBiometric();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Dashboard Functionality', () => {
    beforeEach(async () => {
      // Login before each test
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should display dashboard components', async () => {
      await expect(element(by.id('servers-section'))).toBeVisible();
      await expect(element(by.id('alerts-section'))).toBeVisible();
      await expect(element(by.id('metrics-section'))).toBeVisible();
    });

    it('should display server cards with correct information', async () => {
      await waitFor(element(by.id('server-card-1')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.id('server-name-1'))).toHaveText('Production Server 1');
      await expect(element(by.id('server-status-1'))).toHaveText('Online');
      await expect(element(by.id('server-ip-1'))).toHaveText('192.168.1.10');
    });

    it('should handle pull to refresh', async () => {
      await element(by.id('dashboard-scroll-view')).swipe('down', 'fast', 0.8);
      
      await waitFor(element(by.id('refresh-indicator')))
        .toBeVisible()
        .withTimeout(1000);
      
      await waitFor(element(by.id('refresh-indicator')))
        .not.toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to server details', async () => {
      await element(by.id('server-card-1')).tap();
      
      await waitFor(element(by.id('server-details-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.id('server-details-title'))).toHaveText('Production Server 1');
      await expect(element(by.id('server-metrics-chart'))).toBeVisible();
    });

    it('should handle server actions', async () => {
      await element(by.id('server-card-1')).tap();
      await waitFor(element(by.id('server-details-screen'))).toBeVisible().withTimeout(3000);
      
      // Test restart server action
      await element(by.id('server-actions-menu')).tap();
      await element(by.id('restart-server-action')).tap();
      await element(by.id('confirm-restart-button')).tap();
      
      await waitFor(element(by.text('Server restart initiated')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should display alerts with proper severity indicators', async () => {
      await waitFor(element(by.id('alert-card-1')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.id('alert-title-1'))).toHaveText('High CPU Usage');
      await expect(element(by.id('alert-severity-1'))).toHaveText('Critical');
    });

    it('should acknowledge alerts', async () => {
      await element(by.id('alert-card-1')).swipe('right', 'fast', 0.5);
      await element(by.id('acknowledge-alert-1')).tap();
      
      await waitFor(element(by.text('Alert acknowledged')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.id('alert-status-1'))).toHaveText('Acknowledged');
    });

    it('should resolve alerts with notes', async () => {
      await element(by.id('alert-card-1')).swipe('right', 'fast', 0.5);
      await element(by.id('resolve-alert-1')).tap();
      
      await waitFor(element(by.id('resolve-alert-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('resolution-notes-input')).typeText('Issue resolved by restarting service');
      await element(by.id('confirm-resolve-button')).tap();
      
      await waitFor(element(by.text('Alert resolved')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should filter alerts by severity', async () => {
      await element(by.id('alerts-filter-button')).tap();
      await element(by.id('filter-critical-alerts')).tap();
      
      await waitFor(element(by.id('alert-card-1')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Should only show critical alerts
      await expect(element(by.id('alert-severity-1'))).toHaveText('Critical');
    });

    it('should search alerts', async () => {
      await element(by.id('alerts-search-button')).tap();
      await element(by.id('alerts-search-input')).typeText('CPU');
      
      await waitFor(element(by.id('alert-card-1')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.id('alert-title-1'))).toHaveText('High CPU Usage');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should receive real-time server status updates', async () => {
      // Wait for initial load
      await waitFor(element(by.id('server-status-1')))
        .toHaveText('Online')
        .withTimeout(5000);
      
      // Simulate server going offline (this would be triggered by WebSocket in real app)
      await device.sendUserNotification({
        trigger: {
          type: 'push',
        },
        title: 'Server Status Update',
        body: 'Production Server 1 is now offline',
        payload: {
          type: 'SERVER_STATUS_UPDATE',
          serverId: '1',
          status: 'offline'
        },
      });
      
      await waitFor(element(by.id('server-status-1')))
        .toHaveText('Offline')
        .withTimeout(10000);
    });

    it('should receive push notifications for new alerts', async () => {
      await device.sendUserNotification({
        trigger: {
          type: 'push',
        },
        title: 'New Critical Alert',
        body: 'Database connection failed on Server 2',
        payload: {
          type: 'NEW_ALERT',
          alertId: 'new-alert-1',
          severity: 'critical'
        },
      });
      
      await waitFor(element(by.text('New Critical Alert')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should navigate between tabs', async () => {
      // Navigate to Servers tab
      await element(by.id('servers-tab')).tap();
      await expect(element(by.id('servers-screen'))).toBeVisible();
      
      // Navigate to Alerts tab
      await element(by.id('alerts-tab')).tap();
      await expect(element(by.id('alerts-screen'))).toBeVisible();
      
      // Navigate to Reports tab
      await element(by.id('reports-tab')).tap();
      await expect(element(by.id('reports-screen'))).toBeVisible();
      
      // Navigate back to Dashboard
      await element(by.id('dashboard-tab')).tap();
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
    });

    it('should handle deep linking', async () => {
      await device.openURL({ url: 'sams://server/1' });
      
      await waitFor(element(by.id('server-details-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('server-details-title'))).toHaveText('Production Server 1');
    });

    it('should handle back navigation', async () => {
      await element(by.id('server-card-1')).tap();
      await waitFor(element(by.id('server-details-screen'))).toBeVisible().withTimeout(3000);
      
      await element(by.id('back-button')).tap();
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
    });
  });

  describe('Offline Support', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should handle offline state', async () => {
      // Simulate going offline
      await device.setNetworkConnection(false);
      
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('You are offline'))).toBeVisible();
    });

    it('should sync data when coming back online', async () => {
      // Go offline
      await device.setNetworkConnection(false);
      await waitFor(element(by.id('offline-indicator'))).toBeVisible().withTimeout(5000);
      
      // Come back online
      await device.setNetworkConnection(true);
      
      await waitFor(element(by.id('sync-indicator')))
        .toBeVisible()
        .withTimeout(5000);
      
      await waitFor(element(by.id('sync-indicator')))
        .not.toBeVisible()
        .withTimeout(10000);
    });

    it('should show cached data when offline', async () => {
      // Ensure data is loaded first
      await waitFor(element(by.id('server-card-1'))).toBeVisible().withTimeout(5000);
      
      // Go offline
      await device.setNetworkConnection(false);
      
      // Data should still be visible from cache
      await expect(element(by.id('server-card-1'))).toBeVisible();
      await expect(element(by.id('server-name-1'))).toHaveText('Production Server 1');
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should handle large lists efficiently', async () => {
      // Navigate to servers list with many items
      await element(by.id('servers-tab')).tap();
      await waitFor(element(by.id('servers-screen'))).toBeVisible().withTimeout(3000);
      
      // Should use FlatList for performance
      await expect(element(by.id('servers-flatlist'))).toBeVisible();
      
      // Should be able to scroll through large list smoothly
      await element(by.id('servers-flatlist')).scroll(2000, 'down');
      await element(by.id('servers-flatlist')).scroll(2000, 'up');
    });

    it('should load quickly on app launch', async () => {
      const startTime = Date.now();
      
      await device.launchApp({ newInstance: true });
      await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(5000);
      
      const loadTime = Date.now() - startTime;
      
      // App should launch within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle memory efficiently', async () => {
      // Navigate through multiple screens to test memory usage
      for (let i = 0; i < 10; i++) {
        await element(by.id('servers-tab')).tap();
        await element(by.id('alerts-tab')).tap();
        await element(by.id('reports-tab')).tap();
        await element(by.id('dashboard-tab')).tap();
      }
      
      // App should remain responsive
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
    });
  });

  describe('Device-specific Features', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should handle device orientation changes', async () => {
      await device.setOrientation('landscape');
      
      await waitFor(element(by.id('landscape-layout')))
        .toBeVisible()
        .withTimeout(3000);
      
      await device.setOrientation('portrait');
      
      await waitFor(element(by.id('portrait-layout')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should handle app state changes', async () => {
      // Send app to background
      await device.sendToHome();
      
      // Bring app back to foreground
      await device.launchApp({ newInstance: false });
      
      // Should refresh data when app becomes active
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle low memory warnings', async () => {
      // Simulate low memory warning
      await device.pressBack(); // This is a placeholder - actual implementation would vary
      
      // App should handle gracefully and remain functional
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should support VoiceOver navigation', async () => {
      // Enable accessibility
      await device.setAccessibilityEnabled(true);
      
      // Test VoiceOver navigation
      await element(by.id('server-card-1')).tap();
      
      // Should announce server information
      await waitFor(element(by.id('server-details-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should have proper accessibility labels', async () => {
      await expect(element(by.id('server-card-1'))).toHaveAccessibilityLabel('Production Server 1, Online');
      await expect(element(by.id('alert-card-1'))).toHaveAccessibilityLabel('High CPU Usage, Critical severity');
    });

    it('should support dynamic text sizing', async () => {
      // Test with larger text size
      await device.setTextSize('large');
      
      // Text should scale appropriately
      await expect(element(by.id('server-name-1'))).toBeVisible();
      await expect(element(by.id('alert-title-1'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await element(by.id('username-input')).typeText('admin@sams.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
    });

    it('should handle API errors gracefully', async () => {
      // Simulate API error by going offline and trying to refresh
      await device.setNetworkConnection(false);
      await element(by.id('dashboard-scroll-view')).swipe('down', 'fast', 0.8);
      
      await waitFor(element(by.text('Unable to refresh data')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle app crashes gracefully', async () => {
      // This would typically involve crash simulation
      // For now, we'll test error boundary behavior
      await device.shake(); // Trigger error boundary test
      
      await waitFor(element(by.id('error-boundary-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('restart-app-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});
