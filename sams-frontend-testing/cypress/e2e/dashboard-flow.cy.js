describe('SAMS Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '/api/dashboard/data', { fixture: 'dashboard-data.json' }).as('getDashboardData');
    cy.intercept('GET', '/api/servers', { fixture: 'servers.json' }).as('getServers');
    cy.intercept('GET', '/api/alerts', { fixture: 'alerts.json' }).as('getAlerts');
    cy.intercept('POST', '/api/auth/login', { fixture: 'auth-success.json' }).as('login');
    
    // Visit the application
    cy.visit('/');
  });

  describe('Authentication Flow', () => {
    it('should login successfully with valid credentials', () => {
      cy.get('[data-testid="login-form"]').should('be.visible');
      
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      
      cy.wait('@login');
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard-container"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.intercept('POST', '/api/auth/login', { 
        statusCode: 401, 
        body: { error: 'Invalid credentials' } 
      }).as('loginFailed');
      
      cy.get('[data-testid="username-input"]').type('invalid@email.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      
      cy.wait('@loginFailed');
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
    });

    it('should handle session timeout', () => {
      // Login first
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
      
      // Simulate session timeout
      cy.intercept('GET', '/api/dashboard/data', { 
        statusCode: 401, 
        body: { error: 'Session expired' } 
      }).as('sessionExpired');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@sessionExpired');
      
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');
    });
  });

  describe('Dashboard Functionality', () => {
    beforeEach(() => {
      // Login before each test
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('should load dashboard data correctly', () => {
      cy.wait('@getDashboardData');
      
      cy.get('[data-testid="dashboard-container"]').should('be.visible');
      cy.get('[data-testid="servers-section"]').should('be.visible');
      cy.get('[data-testid="alerts-section"]').should('be.visible');
      cy.get('[data-testid="metrics-section"]').should('be.visible');
    });

    it('should display server cards with correct information', () => {
      cy.wait('@getServers');
      
      cy.get('[data-testid^="server-card-"]').should('have.length.at.least', 1);
      cy.get('[data-testid="server-card-1"]').within(() => {
        cy.get('[data-testid="server-name"]').should('contain', 'Production Server 1');
        cy.get('[data-testid="server-status"]').should('contain', 'Online');
        cy.get('[data-testid="server-ip"]').should('contain', '192.168.1.10');
      });
    });

    it('should display alerts with proper severity indicators', () => {
      cy.wait('@getAlerts');
      
      cy.get('[data-testid^="alert-card-"]').should('have.length.at.least', 1);
      cy.get('[data-testid="alert-card-1"]').within(() => {
        cy.get('[data-testid="alert-title"]').should('contain', 'High CPU Usage');
        cy.get('[data-testid="alert-severity"]').should('have.class', 'severity-critical');
        cy.get('[data-testid="alert-timestamp"]').should('be.visible');
      });
    });

    it('should refresh data when refresh button is clicked', () => {
      cy.get('[data-testid="refresh-button"]').click();
      
      cy.wait('@getDashboardData');
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
      cy.get('[data-testid="loading-indicator"]').should('not.exist');
    });

    it('should filter servers by status', () => {
      cy.wait('@getServers');
      
      cy.get('[data-testid="server-filter"]').select('offline');
      cy.get('[data-testid^="server-card-"]').each(($card) => {
        cy.wrap($card).find('[data-testid="server-status"]').should('contain', 'Offline');
      });
      
      cy.get('[data-testid="server-filter"]').select('all');
      cy.get('[data-testid^="server-card-"]').should('have.length.at.least', 2);
    });

    it('should search servers by name', () => {
      cy.wait('@getServers');
      
      cy.get('[data-testid="server-search"]').type('Production');
      cy.get('[data-testid^="server-card-"]').each(($card) => {
        cy.wrap($card).find('[data-testid="server-name"]').should('contain', 'Production');
      });
      
      cy.get('[data-testid="server-search"]').clear();
      cy.get('[data-testid^="server-card-"]').should('have.length.at.least', 2);
    });
  });

  describe('Server Management', () => {
    beforeEach(() => {
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('should open server details modal', () => {
      cy.wait('@getServers');
      
      cy.get('[data-testid="server-card-1"]').click();
      cy.get('[data-testid="server-details-modal"]').should('be.visible');
      cy.get('[data-testid="server-details-title"]').should('contain', 'Production Server 1');
    });

    it('should add a new server', () => {
      cy.intercept('POST', '/api/servers', { fixture: 'server-created.json' }).as('createServer');
      
      cy.get('[data-testid="add-server-button"]').click();
      cy.get('[data-testid="add-server-modal"]').should('be.visible');
      
      cy.get('[data-testid="server-name-input"]').type('New Test Server');
      cy.get('[data-testid="server-ip-input"]').type('192.168.1.100');
      cy.get('[data-testid="server-port-input"]').type('22');
      cy.get('[data-testid="server-type-select"]').select('Linux');
      
      cy.get('[data-testid="save-server-button"]').click();
      cy.wait('@createServer');
      
      cy.get('[data-testid="success-message"]').should('contain', 'Server added successfully');
      cy.get('[data-testid="add-server-modal"]').should('not.exist');
    });

    it('should edit server configuration', () => {
      cy.intercept('PUT', '/api/servers/1', { fixture: 'server-updated.json' }).as('updateServer');
      
      cy.get('[data-testid="server-card-1"]').click();
      cy.get('[data-testid="edit-server-button"]').click();
      
      cy.get('[data-testid="server-name-input"]').clear().type('Updated Server Name');
      cy.get('[data-testid="save-server-button"]').click();
      
      cy.wait('@updateServer');
      cy.get('[data-testid="success-message"]').should('contain', 'Server updated successfully');
    });

    it('should delete server with confirmation', () => {
      cy.intercept('DELETE', '/api/servers/1', { statusCode: 204 }).as('deleteServer');
      
      cy.get('[data-testid="server-card-1"]').click();
      cy.get('[data-testid="delete-server-button"]').click();
      
      cy.get('[data-testid="confirm-delete-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      cy.wait('@deleteServer');
      cy.get('[data-testid="success-message"]').should('contain', 'Server deleted successfully');
    });
  });

  describe('Alert Management', () => {
    beforeEach(() => {
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('should acknowledge an alert', () => {
      cy.intercept('POST', '/api/alerts/1/acknowledge', { fixture: 'alert-acknowledged.json' }).as('acknowledgeAlert');
      
      cy.wait('@getAlerts');
      cy.get('[data-testid="alert-card-1"]').within(() => {
        cy.get('[data-testid="acknowledge-button"]').click();
      });
      
      cy.wait('@acknowledgeAlert');
      cy.get('[data-testid="alert-card-1"]').should('have.class', 'acknowledged');
    });

    it('should resolve an alert', () => {
      cy.intercept('POST', '/api/alerts/1/resolve', { fixture: 'alert-resolved.json' }).as('resolveAlert');
      
      cy.wait('@getAlerts');
      cy.get('[data-testid="alert-card-1"]').within(() => {
        cy.get('[data-testid="resolve-button"]').click();
      });
      
      cy.get('[data-testid="resolve-alert-modal"]').should('be.visible');
      cy.get('[data-testid="resolution-notes"]').type('Issue resolved by restarting service');
      cy.get('[data-testid="confirm-resolve-button"]').click();
      
      cy.wait('@resolveAlert');
      cy.get('[data-testid="success-message"]').should('contain', 'Alert resolved successfully');
    });

    it('should filter alerts by severity', () => {
      cy.wait('@getAlerts');
      
      cy.get('[data-testid="alert-severity-filter"]').select('critical');
      cy.get('[data-testid^="alert-card-"]').each(($card) => {
        cy.wrap($card).find('[data-testid="alert-severity"]').should('have.class', 'severity-critical');
      });
    });

    it('should bulk acknowledge alerts', () => {
      cy.intercept('POST', '/api/alerts/bulk-acknowledge', { fixture: 'alerts-bulk-acknowledged.json' }).as('bulkAcknowledge');
      
      cy.wait('@getAlerts');
      
      cy.get('[data-testid="select-all-alerts"]').check();
      cy.get('[data-testid="bulk-acknowledge-button"]').click();
      
      cy.wait('@bulkAcknowledge');
      cy.get('[data-testid="success-message"]').should('contain', 'Alerts acknowledged successfully');
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('should receive real-time server status updates', () => {
      // Mock WebSocket connection
      cy.window().then((win) => {
        const mockWs = {
          send: cy.stub(),
          close: cy.stub(),
          addEventListener: cy.stub(),
        };
        
        win.WebSocket = cy.stub().returns(mockWs);
        
        // Simulate server status update
        const updateMessage = {
          type: 'SERVER_STATUS_UPDATE',
          payload: {
            serverId: '1',
            status: 'offline',
            timestamp: new Date().toISOString()
          }
        };
        
        // Trigger the message handler
        mockWs.addEventListener.withArgs('message').callArgWith(1, {
          data: JSON.stringify(updateMessage)
        });
      });
      
      cy.get('[data-testid="server-card-1"]').within(() => {
        cy.get('[data-testid="server-status"]').should('contain', 'Offline');
      });
    });

    it('should receive real-time alert notifications', () => {
      cy.window().then((win) => {
        const mockWs = {
          send: cy.stub(),
          close: cy.stub(),
          addEventListener: cy.stub(),
        };
        
        win.WebSocket = cy.stub().returns(mockWs);
        
        // Simulate new alert
        const alertMessage = {
          type: 'NEW_ALERT',
          payload: {
            id: 'new-alert-1',
            title: 'Database Connection Failed',
            severity: 'critical',
            timestamp: new Date().toISOString()
          }
        };
        
        mockWs.addEventListener.withArgs('message').callArgWith(1, {
          data: JSON.stringify(alertMessage)
        });
      });
      
      cy.get('[data-testid="alert-notification"]').should('be.visible');
      cy.get('[data-testid="alert-notification"]').should('contain', 'Database Connection Failed');
    });
  });

  describe('Performance and Responsiveness', () => {
    beforeEach(() => {
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('should load dashboard within acceptable time', () => {
      const startTime = Date.now();
      
      cy.wait('@getDashboardData').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 seconds
      });
    });

    it('should handle large datasets efficiently', () => {
      cy.intercept('GET', '/api/servers', { fixture: 'large-server-list.json' }).as('getLargeServerList');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getLargeServerList');
      
      // Should render without performance issues
      cy.get('[data-testid^="server-card-"]').should('have.length', 1000);
      cy.get('[data-testid="server-search"]').type('Server 500');
      cy.get('[data-testid^="server-card-"]').should('have.length', 1);
    });

    it('should be responsive on different screen sizes', () => {
      // Test mobile view
      cy.viewport(375, 667);
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      cy.get('[data-testid="desktop-sidebar"]').should('not.be.visible');
      
      // Test tablet view
      cy.viewport(768, 1024);
      cy.get('[data-testid="tablet-layout"]').should('be.visible');
      
      // Test desktop view
      cy.viewport(1920, 1080);
      cy.get('[data-testid="desktop-sidebar"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.get('[data-testid="username-input"]').type('admin@sams.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.wait('@login');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/dashboard/data', { 
        statusCode: 500, 
        body: { error: 'Internal server error' } 
      }).as('serverError');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@serverError');
      
      cy.get('[data-testid="error-message"]').should('contain', 'Failed to load dashboard data');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });

    it('should handle network connectivity issues', () => {
      cy.intercept('GET', '/api/dashboard/data', { forceNetworkError: true }).as('networkError');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@networkError');
      
      cy.get('[data-testid="offline-indicator"]').should('be.visible');
      cy.get('[data-testid="offline-message"]').should('contain', 'Connection lost');
    });

    it('should retry failed requests', () => {
      cy.intercept('GET', '/api/dashboard/data', { 
        statusCode: 500, 
        body: { error: 'Server error' } 
      }).as('firstAttempt');
      
      cy.intercept('GET', '/api/dashboard/data', { fixture: 'dashboard-data.json' }).as('retrySuccess');
      
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@firstAttempt');
      
      cy.get('[data-testid="retry-button"]').click();
      cy.wait('@retrySuccess');
      
      cy.get('[data-testid="dashboard-container"]').should('be.visible');
    });
  });
});
