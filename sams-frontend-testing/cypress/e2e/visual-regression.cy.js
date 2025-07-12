describe('SAMS Visual Regression Tests', () => {
  beforeEach(() => {
    // Mock API responses for consistent visual testing
    cy.intercept('GET', '/api/dashboard/data', { fixture: 'dashboard-data-visual.json' }).as('getDashboardData');
    cy.intercept('GET', '/api/servers', { fixture: 'servers-visual.json' }).as('getServers');
    cy.intercept('GET', '/api/alerts', { fixture: 'alerts-visual.json' }).as('getAlerts');
    cy.intercept('POST', '/api/auth/login', { fixture: 'auth-success.json' }).as('login');
    
    // Set consistent viewport
    cy.viewport(1920, 1080);
    
    // Visit and login
    cy.visit('/');
    cy.get('[data-testid="username-input"]').type('admin@sams.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    cy.wait('@login');
  });

  describe('Dashboard Visual Tests', () => {
    it('should match dashboard layout baseline', () => {
      cy.wait('@getDashboardData');
      cy.wait('@getServers');
      cy.wait('@getAlerts');
      
      // Wait for all animations to complete
      cy.wait(1000);
      
      // Take full page screenshot
      cy.percySnapshot('Dashboard - Full Layout', {
        widths: [1920],
        minHeight: 1080
      });
    });

    it('should match server cards layout', () => {
      cy.wait('@getServers');
      
      cy.get('[data-testid="servers-section"]').scrollIntoView();
      cy.percySnapshot('Dashboard - Server Cards', {
        scope: '[data-testid="servers-section"]'
      });
    });

    it('should match alerts section layout', () => {
      cy.wait('@getAlerts');
      
      cy.get('[data-testid="alerts-section"]').scrollIntoView();
      cy.percySnapshot('Dashboard - Alerts Section', {
        scope: '[data-testid="alerts-section"]'
      });
    });

    it('should match metrics dashboard layout', () => {
      cy.get('[data-testid="metrics-section"]').scrollIntoView();
      cy.percySnapshot('Dashboard - Metrics Section', {
        scope: '[data-testid="metrics-section"]'
      });
    });

    it('should match empty state layouts', () => {
      cy.intercept('GET', '/api/servers', { body: [] }).as('getEmptyServers');
      cy.intercept('GET', '/api/alerts', { body: [] }).as('getEmptyAlerts');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getEmptyServers');
      cy.wait('@getEmptyAlerts');
      
      cy.percySnapshot('Dashboard - Empty States');
    });
  });

  describe('Modal and Dialog Visual Tests', () => {
    beforeEach(() => {
      cy.wait('@getDashboardData');
      cy.wait('@getServers');
      cy.wait('@getAlerts');
    });

    it('should match server details modal', () => {
      cy.get('[data-testid="server-card-1"]').click();
      cy.get('[data-testid="server-details-modal"]').should('be.visible');
      
      cy.percySnapshot('Modal - Server Details');
    });

    it('should match add server modal', () => {
      cy.get('[data-testid="add-server-button"]').click();
      cy.get('[data-testid="add-server-modal"]').should('be.visible');
      
      cy.percySnapshot('Modal - Add Server');
    });

    it('should match alert resolution modal', () => {
      cy.get('[data-testid="alert-card-1"]').within(() => {
        cy.get('[data-testid="resolve-button"]').click();
      });
      cy.get('[data-testid="resolve-alert-modal"]').should('be.visible');
      
      cy.percySnapshot('Modal - Resolve Alert');
    });

    it('should match confirmation dialogs', () => {
      cy.get('[data-testid="server-card-1"]').click();
      cy.get('[data-testid="delete-server-button"]').click();
      cy.get('[data-testid="confirm-delete-modal"]').should('be.visible');
      
      cy.percySnapshot('Dialog - Delete Confirmation');
    });
  });

  describe('Form Visual Tests', () => {
    beforeEach(() => {
      cy.wait('@getDashboardData');
      cy.wait('@getServers');
    });

    it('should match form validation states', () => {
      cy.get('[data-testid="add-server-button"]').click();
      cy.get('[data-testid="add-server-modal"]').should('be.visible');
      
      // Test empty form
      cy.percySnapshot('Form - Add Server Empty');
      
      // Test validation errors
      cy.get('[data-testid="save-server-button"]').click();
      cy.percySnapshot('Form - Add Server Validation Errors');
      
      // Test filled form
      cy.get('[data-testid="server-name-input"]').type('Test Server');
      cy.get('[data-testid="server-ip-input"]').type('192.168.1.100');
      cy.get('[data-testid="server-port-input"]').type('22');
      cy.percySnapshot('Form - Add Server Filled');
    });

    it('should match search and filter states', () => {
      // Test search functionality
      cy.get('[data-testid="server-search"]').type('Production');
      cy.percySnapshot('Search - Server Search Active');
      
      // Test filter functionality
      cy.get('[data-testid="server-filter"]').select('offline');
      cy.percySnapshot('Filter - Server Filter Applied');
    });
  });

  describe('Responsive Visual Tests', () => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1440, height: 900, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ];

    viewports.forEach(viewport => {
      it(`should match layout on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        cy.viewport(viewport.width, viewport.height);
        
        cy.wait('@getDashboardData');
        cy.wait('@getServers');
        cy.wait('@getAlerts');
        
        // Wait for responsive layout to settle
        cy.wait(500);
        
        cy.percySnapshot(`Dashboard - ${viewport.name}`, {
          widths: [viewport.width],
          minHeight: viewport.height
        });
      });
    });
  });

  describe('Theme and Dark Mode Visual Tests', () => {
    beforeEach(() => {
      cy.wait('@getDashboardData');
      cy.wait('@getServers');
      cy.wait('@getAlerts');
    });

    it('should match light theme', () => {
      cy.get('[data-testid="theme-toggle"]').should('have.attr', 'data-theme', 'light');
      cy.percySnapshot('Theme - Light Mode');
    });

    it('should match dark theme', () => {
      cy.get('[data-testid="theme-toggle"]').click();
      cy.get('[data-testid="theme-toggle"]').should('have.attr', 'data-theme', 'dark');
      
      // Wait for theme transition
      cy.wait(300);
      
      cy.percySnapshot('Theme - Dark Mode');
    });

    it('should match high contrast theme', () => {
      cy.get('[data-testid="accessibility-menu"]').click();
      cy.get('[data-testid="high-contrast-toggle"]').click();
      
      cy.percySnapshot('Theme - High Contrast');
    });
  });

  describe('State-based Visual Tests', () => {
    it('should match loading states', () => {
      // Intercept with delay to capture loading state
      cy.intercept('GET', '/api/dashboard/data', (req) => {
        req.reply((res) => {
          res.delay(2000);
          res.send({ fixture: 'dashboard-data-visual.json' });
        });
      }).as('getSlowDashboardData');
      
      cy.get('[data-testid="refresh-button"]').click();
      
      // Capture loading state
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
      cy.percySnapshot('State - Loading Dashboard');
    });

    it('should match error states', () => {
      cy.intercept('GET', '/api/dashboard/data', { 
        statusCode: 500, 
        body: { error: 'Server error' } 
      }).as('getErrorData');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getErrorData');
      
      cy.percySnapshot('State - Error Dashboard');
    });

    it('should match offline states', () => {
      cy.intercept('GET', '/api/dashboard/data', { forceNetworkError: true }).as('getOfflineData');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getOfflineData');
      
      cy.percySnapshot('State - Offline Dashboard');
    });
  });

  describe('Interactive Element Visual Tests', () => {
    beforeEach(() => {
      cy.wait('@getDashboardData');
      cy.wait('@getServers');
      cy.wait('@getAlerts');
    });

    it('should match button hover states', () => {
      cy.get('[data-testid="add-server-button"]').trigger('mouseover');
      cy.percySnapshot('Interactive - Button Hover');
    });

    it('should match card hover states', () => {
      cy.get('[data-testid="server-card-1"]').trigger('mouseover');
      cy.percySnapshot('Interactive - Server Card Hover');
    });

    it('should match focus states', () => {
      cy.get('[data-testid="server-search"]').focus();
      cy.percySnapshot('Interactive - Search Focus');
    });

    it('should match active states', () => {
      cy.get('[data-testid="server-card-1"]').trigger('mousedown');
      cy.percySnapshot('Interactive - Server Card Active');
    });
  });

  describe('Notification Visual Tests', () => {
    beforeEach(() => {
      cy.wait('@getDashboardData');
      cy.wait('@getServers');
      cy.wait('@getAlerts');
    });

    it('should match success notifications', () => {
      cy.intercept('POST', '/api/servers', { fixture: 'server-created.json' }).as('createServer');
      
      cy.get('[data-testid="add-server-button"]').click();
      cy.get('[data-testid="server-name-input"]').type('Test Server');
      cy.get('[data-testid="server-ip-input"]').type('192.168.1.100');
      cy.get('[data-testid="server-port-input"]').type('22');
      cy.get('[data-testid="save-server-button"]').click();
      
      cy.wait('@createServer');
      cy.get('[data-testid="success-notification"]').should('be.visible');
      
      cy.percySnapshot('Notification - Success');
    });

    it('should match error notifications', () => {
      cy.intercept('POST', '/api/servers', { 
        statusCode: 400, 
        body: { error: 'Invalid server configuration' } 
      }).as('createServerError');
      
      cy.get('[data-testid="add-server-button"]').click();
      cy.get('[data-testid="server-name-input"]').type('Test Server');
      cy.get('[data-testid="save-server-button"]').click();
      
      cy.wait('@createServerError');
      cy.get('[data-testid="error-notification"]').should('be.visible');
      
      cy.percySnapshot('Notification - Error');
    });

    it('should match warning notifications', () => {
      // Simulate session timeout warning
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('session-warning', {
          detail: { timeRemaining: 300 }
        }));
      });
      
      cy.get('[data-testid="warning-notification"]').should('be.visible');
      cy.percySnapshot('Notification - Warning');
    });
  });

  describe('Data Visualization Visual Tests', () => {
    beforeEach(() => {
      cy.wait('@getDashboardData');
    });

    it('should match charts and graphs', () => {
      cy.get('[data-testid="metrics-chart"]').should('be.visible');
      
      // Wait for chart animation to complete
      cy.wait(2000);
      
      cy.percySnapshot('Visualization - Metrics Chart', {
        scope: '[data-testid="metrics-section"]'
      });
    });

    it('should match data tables', () => {
      cy.get('[data-testid="view-servers-table"]').click();
      cy.get('[data-testid="servers-table"]').should('be.visible');
      
      cy.percySnapshot('Visualization - Servers Table');
    });

    it('should match status indicators', () => {
      cy.get('[data-testid="system-health-indicators"]').should('be.visible');
      cy.percySnapshot('Visualization - Status Indicators', {
        scope: '[data-testid="system-health-indicators"]'
      });
    });
  });
});
