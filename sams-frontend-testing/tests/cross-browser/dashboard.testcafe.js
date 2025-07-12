import { Selector, RequestMock } from 'testcafe';

// Mock API responses
const dashboardDataMock = RequestMock()
  .onRequestTo(/\/api\/dashboard\/data/)
  .respond({
    servers: [
      { id: '1', name: 'Production Server 1', status: 'online', ip: '192.168.1.10' },
      { id: '2', name: 'Production Server 2', status: 'offline', ip: '192.168.1.11' }
    ],
    alerts: [
      { id: '1', title: 'High CPU Usage', severity: 'critical', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', title: 'Low Disk Space', severity: 'warning', timestamp: '2024-01-01T11:00:00Z' }
    ],
    metrics: {
      totalServers: 2,
      onlineServers: 1,
      offlineServers: 1,
      totalAlerts: 2
    }
  })
  .onRequestTo(/\/api\/auth\/login/)
  .respond({ token: 'mock-jwt-token', user: { id: '1', username: 'admin' } });

fixture('SAMS Dashboard Cross-Browser Tests')
  .page('http://localhost:3000')
  .requestHooks(dashboardDataMock);

// Selectors
const loginForm = Selector('[data-testid="login-form"]');
const usernameInput = Selector('[data-testid="username-input"]');
const passwordInput = Selector('[data-testid="password-input"]');
const loginButton = Selector('[data-testid="login-button"]');
const dashboardContainer = Selector('[data-testid="dashboard-container"]');
const serverCards = Selector('[data-testid^="server-card-"]');
const alertCards = Selector('[data-testid^="alert-card-"]');
const refreshButton = Selector('[data-testid="refresh-button"]');
const addServerButton = Selector('[data-testid="add-server-button"]');

test('Dashboard should load correctly in Chrome', async t => {
  await t
    .expect(loginForm.exists).ok('Login form should be visible')
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok('Dashboard should load after login')
    .expect(serverCards.count).eql(2, 'Should display 2 server cards')
    .expect(alertCards.count).eql(2, 'Should display 2 alert cards');
});

test('Dashboard should load correctly in Firefox', async t => {
  await t
    .expect(loginForm.exists).ok('Login form should be visible')
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok('Dashboard should load after login')
    .expect(serverCards.count).eql(2, 'Should display 2 server cards')
    .expect(alertCards.count).eql(2, 'Should display 2 alert cards');
});

test('Dashboard should load correctly in Safari', async t => {
  await t
    .expect(loginForm.exists).ok('Login form should be visible')
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok('Dashboard should load after login')
    .expect(serverCards.count).eql(2, 'Should display 2 server cards')
    .expect(alertCards.count).eql(2, 'Should display 2 alert cards');
});

test('Dashboard should load correctly in Edge', async t => {
  await t
    .expect(loginForm.exists).ok('Login form should be visible')
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok('Dashboard should load after login')
    .expect(serverCards.count).eql(2, 'Should display 2 server cards')
    .expect(alertCards.count).eql(2, 'Should display 2 alert cards');
});

test('Server interaction should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test server card interaction
  const firstServerCard = serverCards.nth(0);
  const serverDetailsModal = Selector('[data-testid="server-details-modal"]');
  
  await t
    .click(firstServerCard)
    .expect(serverDetailsModal.exists).ok('Server details modal should open')
    .expect(serverDetailsModal.find('[data-testid="server-details-title"]').textContent)
    .contains('Production Server 1', 'Modal should show correct server name');
});

test('Alert management should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test alert acknowledgment
  const firstAlertCard = alertCards.nth(0);
  const acknowledgeButton = firstAlertCard.find('[data-testid="acknowledge-button"]');
  
  await t
    .click(acknowledgeButton)
    .expect(firstAlertCard.hasClass('acknowledged')).ok('Alert should be marked as acknowledged');
});

test('Responsive design should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test mobile viewport
  await t
    .resizeWindow(375, 667)
    .expect(Selector('[data-testid="mobile-menu-button"]').exists).ok('Mobile menu should be visible')
    .expect(Selector('[data-testid="desktop-sidebar"]').exists).notOk('Desktop sidebar should be hidden');

  // Test tablet viewport
  await t
    .resizeWindow(768, 1024)
    .expect(Selector('[data-testid="tablet-layout"]').exists).ok('Tablet layout should be active');

  // Test desktop viewport
  await t
    .resizeWindow(1920, 1080)
    .expect(Selector('[data-testid="desktop-sidebar"]').exists).ok('Desktop sidebar should be visible');
});

test('Form validation should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test add server form validation
  const addServerModal = Selector('[data-testid="add-server-modal"]');
  const serverNameInput = Selector('[data-testid="server-name-input"]');
  const serverIpInput = Selector('[data-testid="server-ip-input"]');
  const saveServerButton = Selector('[data-testid="save-server-button"]');
  const validationError = Selector('[data-testid="validation-error"]');

  await t
    .click(addServerButton)
    .expect(addServerModal.exists).ok('Add server modal should open')
    .click(saveServerButton)
    .expect(validationError.exists).ok('Validation error should appear for empty form')
    .typeText(serverNameInput, 'Test Server')
    .typeText(serverIpInput, 'invalid-ip')
    .click(saveServerButton)
    .expect(validationError.textContent).contains('Invalid IP address', 'Should show IP validation error');
});

test('Search and filter functionality should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test server search
  const serverSearch = Selector('[data-testid="server-search"]');
  
  await t
    .typeText(serverSearch, 'Production')
    .expect(serverCards.count).eql(2, 'Should show all servers matching search')
    .selectText(serverSearch)
    .typeText(serverSearch, 'Server 1')
    .expect(serverCards.count).eql(1, 'Should show only Server 1');

  // Test server filter
  const serverFilter = Selector('[data-testid="server-filter"]');
  
  await t
    .click(serverFilter)
    .click(serverFilter.find('option').withText('Offline'))
    .expect(serverCards.count).eql(1, 'Should show only offline servers')
    .click(serverFilter)
    .click(serverFilter.find('option').withText('All'))
    .expect(serverCards.count).eql(2, 'Should show all servers again');
});

test('Real-time updates should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test refresh functionality
  await t
    .click(refreshButton)
    .expect(Selector('[data-testid="loading-indicator"]').exists).ok('Loading indicator should appear')
    .wait(2000) // Wait for refresh to complete
    .expect(Selector('[data-testid="loading-indicator"]').exists).notOk('Loading indicator should disappear');
});

test('Keyboard navigation should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test tab navigation
  await t
    .pressKey('tab') // Should focus refresh button
    .expect(refreshButton.focused).ok('Refresh button should be focused')
    .pressKey('tab') // Should focus first server card
    .expect(serverCards.nth(0).focused).ok('First server card should be focused')
    .pressKey('enter') // Should open server details
    .expect(Selector('[data-testid="server-details-modal"]').exists).ok('Server details should open');
});

test('Error handling should work across browsers', async t => {
  // Test login with invalid credentials
  const errorMessage = Selector('[data-testid="error-message"]');
  
  await t
    .typeText(usernameInput, 'invalid@email.com')
    .typeText(passwordInput, 'wrongpassword')
    .click(loginButton)
    .expect(errorMessage.exists).ok('Error message should appear for invalid login');

  // Login with correct credentials
  await t
    .selectText(usernameInput)
    .typeText(usernameInput, 'admin@sams.com')
    .selectText(passwordInput)
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test API error handling
  const networkErrorMock = RequestMock()
    .onRequestTo(/\/api\/dashboard\/data/)
    .respond(null, 500, { 'content-type': 'application/json' });

  await t
    .addRequestHooks(networkErrorMock)
    .click(refreshButton)
    .expect(Selector('[data-testid="error-notification"]').exists).ok('Error notification should appear');
});

test('Performance should be acceptable across browsers', async t => {
  const startTime = Date.now();
  
  // Login and measure load time
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();
  
  const loadTime = Date.now() - startTime;
  
  // Dashboard should load within 5 seconds
  await t.expect(loadTime).lt(5000, 'Dashboard should load within 5 seconds');
});

test('Local storage should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Check if authentication token is stored
  const token = await t.eval(() => localStorage.getItem('authToken'));
  await t.expect(token).ok('Auth token should be stored in localStorage');

  // Test theme preference storage
  const themeToggle = Selector('[data-testid="theme-toggle"]');
  
  await t
    .click(themeToggle)
    .expect(Selector('body').hasClass('dark-theme')).ok('Dark theme should be applied');

  const theme = await t.eval(() => localStorage.getItem('theme'));
  await t.expect(theme).eql('dark', 'Theme preference should be stored');
});

test('Session management should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Simulate session timeout
  await t.eval(() => {
    localStorage.removeItem('authToken');
    window.dispatchEvent(new Event('storage'));
  });

  // Should redirect to login
  await t
    .wait(1000)
    .expect(loginForm.exists).ok('Should redirect to login after session timeout');
});

test('Accessibility features should work across browsers', async t => {
  // Login first
  await t
    .typeText(usernameInput, 'admin@sams.com')
    .typeText(passwordInput, 'password123')
    .click(loginButton)
    .expect(dashboardContainer.exists).ok();

  // Test high contrast mode
  const accessibilityMenu = Selector('[data-testid="accessibility-menu"]');
  const highContrastToggle = Selector('[data-testid="high-contrast-toggle"]');
  
  await t
    .click(accessibilityMenu)
    .click(highContrastToggle)
    .expect(Selector('body').hasClass('high-contrast')).ok('High contrast mode should be enabled');

  // Test screen reader announcements
  const liveRegion = Selector('[aria-live="polite"]');
  
  await t
    .click(refreshButton)
    .expect(liveRegion.textContent).contains('Dashboard updated', 'Live region should announce updates');
});
