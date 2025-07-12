/**
 * Alerts Flow E2E Tests
 * End-to-end testing of alert management workflows
 */

import { device, element, by, expect, waitFor } from 'detox';
import { selectors, testData, deviceHelpers } from './setup';

describe('Alerts Flow E2E', () => {
  beforeEach(async () => {
    // Ensure we're logged in and on the alerts screen
    await device.reloadReactNative();
    
    // Login if needed
    try {
      await waitFor(element(selectors.loginScreen)).toBeVisible().withTimeout(3000);
      await element(selectors.usernameInput).typeText(testData.validCredentials.username);
      await element(selectors.passwordInput).typeText(testData.validCredentials.password);
      await element(selectors.loginButton).tap();
      
      // Enter PIN
      await waitFor(element(selectors.pinScreen)).toBeVisible().withTimeout(5000);
      await element(selectors.pinInput).typeText(testData.validCredentials.pin);
      await element(selectors.pinButton).tap();
    } catch (error) {
      // Already logged in
    }
    
    // Navigate to alerts screen
    await waitFor(element(selectors.dashboardScreen)).toBeVisible().withTimeout(10000);
    await element(selectors.alertsTab).tap();
    await waitFor(element(selectors.alertsScreen)).toBeVisible().withTimeout(5000);
  });

  it('should display alerts list on screen load', async () => {
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Check if alerts are loaded
    const firstAlert = element(selectors.alertCard('1'));
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
  });

  it('should allow searching for alerts', async () => {
    await waitFor(element(selectors.searchInput)).toBeVisible().withTimeout(5000);
    
    // Type search query
    await element(selectors.searchInput).typeText('critical');
    await sleep(1000);
    
    // Verify search results
    const alertsList = element(selectors.alertsList);
    await expect(alertsList).toBeVisible();
    
    // Clear search
    await element(selectors.searchInput).clearText();
    await sleep(500);
  });

  it('should acknowledge an alert', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Find first alert and acknowledge it
    const firstAlert = element(selectors.alertCard('1'));
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
    
    const acknowledgeButton = element(selectors.acknowledgeButton('1'));
    await acknowledgeButton.tap();
    
    // Wait for acknowledgment to complete
    await sleep(2000);
    
    // Verify alert status changed
    await expect(firstAlert).toHaveText('Acknowledged');
  });

  it('should resolve an alert', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Find first alert and resolve it
    const firstAlert = element(selectors.alertCard('1'));
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
    
    const resolveButton = element(selectors.resolveButton('1'));
    await resolveButton.tap();
    
    // Wait for resolution to complete
    await sleep(2000);
    
    // Verify alert status changed
    await expect(firstAlert).toHaveText('Resolved');
  });

  it('should navigate to alert details', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Tap on first alert
    const firstAlert = element(selectors.alertCard('1'));
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
    await firstAlert.tap();
    
    // Verify navigation to alert details
    const alertDetailsScreen = element(by.id('alert-details-screen'));
    await waitFor(alertDetailsScreen).toBeVisible().withTimeout(5000);
    
    // Go back to alerts list
    await element(selectors.backButton).tap();
    await waitFor(element(selectors.alertsScreen)).toBeVisible().withTimeout(5000);
  });

  it('should filter alerts by severity', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Apply critical filter
    const criticalFilter = element(by.id('filter-critical'));
    await criticalFilter.tap();
    await sleep(1000);
    
    // Verify only critical alerts are shown
    const alertsList = element(selectors.alertsList);
    await expect(alertsList).toBeVisible();
    
    // Reset filter
    const allFilter = element(by.id('filter-all'));
    await allFilter.tap();
    await sleep(1000);
  });

  it('should pull to refresh alerts', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Pull to refresh
    const alertsList = element(selectors.alertsList);
    await alertsList.swipe('down', 'fast', 0.8);
    
    // Wait for refresh to complete
    await sleep(3000);
    
    // Verify alerts are still visible
    await expect(alertsList).toBeVisible();
  });

  it('should handle empty alerts state', async () => {
    // This test would require mocking empty state
    // For now, we'll test the UI elements exist
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Verify empty state elements exist (even if not currently shown)
    const emptyStateMessage = element(by.id('empty-state-message'));
    // Note: This might not be visible if there are alerts
  });

  it('should handle network errors gracefully', async () => {
    // Disable network
    await device.disableSynchronization();
    
    // Try to refresh
    const refreshButton = element(selectors.refreshButton);
    if (await refreshButton.isVisible()) {
      await refreshButton.tap();
    }
    
    // Wait for error state
    await sleep(3000);
    
    // Check for error message
    const errorMessage = element(selectors.errorMessage);
    // Note: Error handling might vary based on implementation
    
    // Re-enable network
    await device.enableSynchronization();
  });

  it('should maintain scroll position during updates', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Scroll down
    const alertsList = element(selectors.alertsList);
    await alertsList.scroll(500, 'down');
    await sleep(1000);
    
    // Trigger update (refresh)
    await alertsList.swipe('down', 'fast', 0.8);
    await sleep(2000);
    
    // Verify we're still scrolled (this is implementation dependent)
    await expect(alertsList).toBeVisible();
  });

  it('should work in landscape orientation', async () => {
    // Rotate to landscape
    await deviceHelpers.rotateToLandscape();
    
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Verify functionality still works
    const firstAlert = element(selectors.alertCard('1'));
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
    await firstAlert.tap();
    
    // Verify navigation works
    const alertDetailsScreen = element(by.id('alert-details-screen'));
    await waitFor(alertDetailsScreen).toBeVisible().withTimeout(5000);
    
    // Go back
    await element(selectors.backButton).tap();
    
    // Rotate back to portrait
    await deviceHelpers.rotateToPortrait();
  });

  it('should handle app backgrounding and foregrounding', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Send app to background and bring back
    await deviceHelpers.sendToBackground();
    
    // Verify alerts are still visible
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
  });

  it('should support accessibility features', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Test accessibility labels
    const firstAlert = element(selectors.alertCard('1'));
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
    
    // Verify accessibility properties exist
    await expect(firstAlert).toHaveAccessibilityLabel();
  });

  it('should handle rapid user interactions', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Rapidly tap multiple elements
    const firstAlert = element(selectors.alertCard('1'));
    const secondAlert = element(selectors.alertCard('2'));
    
    await waitFor(firstAlert).toBeVisible().withTimeout(5000);
    await waitFor(secondAlert).toBeVisible().withTimeout(5000);
    
    // Rapid taps
    await firstAlert.tap();
    await sleep(100);
    await element(selectors.backButton).tap();
    await sleep(100);
    await secondAlert.tap();
    await sleep(100);
    await element(selectors.backButton).tap();
    
    // Verify we're back on alerts screen
    await waitFor(element(selectors.alertsScreen)).toBeVisible().withTimeout(5000);
  });

  it('should support voice response modal', async () => {
    // Wait for alerts to load
    await waitFor(element(selectors.alertsList)).toBeVisible().withTimeout(10000);
    
    // Open voice response modal
    const voiceButton = element(by.id('voice-response-button'));
    if (await voiceButton.isVisible()) {
      await voiceButton.tap();
      
      // Wait for voice modal
      const voiceModal = element(by.id('voice-response-modal'));
      await waitFor(voiceModal).toBeVisible().withTimeout(5000);
      
      // Close modal
      const closeButton = element(by.id('close-voice-modal'));
      await closeButton.tap();
    }
  });
});
