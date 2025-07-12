import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

// Import components to test
import Dashboard from '../components/Dashboard';
import ServerCard from '../components/ServerCard';
import AlertCard from '../components/AlertCard';
import LoginForm from '../components/LoginForm';
import AddServerModal from '../components/AddServerModal';
import Navigation from '../components/Navigation';

expect.extend(toHaveNoViolations);

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      dashboard: (state = {}, action) => state,
      auth: (state = {}, action) => state,
    },
    preloadedState: initialState,
  });
};

// Test wrapper component
const TestWrapper = ({ children, store }) => (
  <Provider store={store}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

describe('Accessibility Tests', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = createMockStore({
      dashboard: {
        servers: [],
        alerts: [],
        metrics: {},
        loading: false,
        error: null,
      },
      auth: {
        user: null,
        isAuthenticated: false,
      },
    });
  });

  describe('Dashboard Accessibility', () => {
    test('Dashboard component should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Dashboard should have proper heading hierarchy', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
      
      // Check that heading levels don't skip (e.g., h1 -> h3)
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i];
        const previousLevel = headingLevels[i - 1];
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    });

    test('Dashboard should have proper landmark regions', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(container.querySelector('[role="main"]')).toBeInTheDocument();
      expect(container.querySelector('[role="navigation"]')).toBeInTheDocument();
      expect(container.querySelector('[role="banner"]')).toBeInTheDocument();
    });

    test('Dashboard should support keyboard navigation', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      focusableElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Server Card Accessibility', () => {
    const mockServer = {
      id: '1',
      name: 'Test Server',
      status: 'online',
      ip: '192.168.1.10',
      lastSeen: '2024-01-01T10:00:00Z',
    };

    test('ServerCard should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <ServerCard server={mockServer} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('ServerCard should have proper ARIA labels', () => {
      const { getByRole } = render(
        <TestWrapper store={mockStore}>
          <ServerCard server={mockServer} />
        </TestWrapper>
      );

      const card = getByRole('button');
      expect(card).toHaveAttribute('aria-label');
      expect(card.getAttribute('aria-label')).toContain('Test Server');
      expect(card.getAttribute('aria-label')).toContain('online');
    });

    test('ServerCard should have proper status indicators', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <ServerCard server={mockServer} />
        </TestWrapper>
      );

      const statusIndicator = container.querySelector('[data-testid="server-status"]');
      expect(statusIndicator).toHaveAttribute('aria-label');
      expect(statusIndicator).toHaveAttribute('role', 'status');
    });

    test('ServerCard should support screen readers', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <ServerCard server={mockServer} />
        </TestWrapper>
      );

      const card = container.querySelector('[data-testid="server-card"]');
      expect(card).toHaveAttribute('aria-describedby');
      
      const description = container.querySelector(`#${card.getAttribute('aria-describedby')}`);
      expect(description).toBeInTheDocument();
    });
  });

  describe('Alert Card Accessibility', () => {
    const mockAlert = {
      id: '1',
      title: 'High CPU Usage',
      description: 'CPU usage is above 90%',
      severity: 'critical',
      timestamp: '2024-01-01T10:00:00Z',
      status: 'active',
    };

    test('AlertCard should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <AlertCard alert={mockAlert} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('AlertCard should have proper alert role', () => {
      const { getByRole } = render(
        <TestWrapper store={mockStore}>
          <AlertCard alert={mockAlert} />
        </TestWrapper>
      );

      const alertElement = getByRole('alert');
      expect(alertElement).toBeInTheDocument();
    });

    test('AlertCard should have proper severity indicators', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <AlertCard alert={mockAlert} />
        </TestWrapper>
      );

      const severityIndicator = container.querySelector('[data-testid="alert-severity"]');
      expect(severityIndicator).toHaveAttribute('aria-label');
      expect(severityIndicator.getAttribute('aria-label')).toContain('critical');
    });

    test('AlertCard actions should be accessible', () => {
      const { getAllByRole } = render(
        <TestWrapper store={mockStore}>
          <AlertCard alert={mockAlert} />
        </TestWrapper>
      );

      const buttons = getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });

  describe('Login Form Accessibility', () => {
    test('LoginForm should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <LoginForm />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('LoginForm should have proper form labels', () => {
      const { getByLabelText } = render(
        <TestWrapper store={mockStore}>
          <LoginForm />
        </TestWrapper>
      );

      expect(getByLabelText(/username/i)).toBeInTheDocument();
      expect(getByLabelText(/password/i)).toBeInTheDocument();
    });

    test('LoginForm should have proper error handling', () => {
      const storeWithError = createMockStore({
        auth: {
          error: 'Invalid credentials',
          isAuthenticated: false,
        },
      });

      const { getByRole } = render(
        <TestWrapper store={storeWithError}>
          <LoginForm />
        </TestWrapper>
      );

      const errorMessage = getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Invalid credentials');
    });

    test('LoginForm should support keyboard navigation', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <LoginForm />
        </TestWrapper>
      );

      const inputs = container.querySelectorAll('input');
      const submitButton = container.querySelector('button[type="submit"]');

      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('tabindex', '-1');
      });

      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Modal Accessibility', () => {
    test('AddServerModal should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <AddServerModal isOpen={true} onClose={() => {}} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('AddServerModal should have proper modal attributes', () => {
      const { getByRole } = render(
        <TestWrapper store={mockStore}>
          <AddServerModal isOpen={true} onClose={() => {}} />
        </TestWrapper>
      );

      const modal = getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
    });

    test('AddServerModal should trap focus', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <AddServerModal isOpen={true} onClose={() => {}} />
        </TestWrapper>
      );

      const modal = container.querySelector('[role="dialog"]');
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);
      
      // First focusable element should receive focus
      expect(document.activeElement).toBe(focusableElements[0]);
    });

    test('AddServerModal should handle escape key', () => {
      const onClose = jest.fn();
      const { container } = render(
        <TestWrapper store={mockStore}>
          <AddServerModal isOpen={true} onClose={onClose} />
        </TestWrapper>
      );

      const modal = container.querySelector('[role="dialog"]');
      
      // Simulate escape key press
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      modal.dispatchEvent(escapeEvent);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Navigation Accessibility', () => {
    test('Navigation should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Navigation />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('Navigation should have proper landmark', () => {
      const { getByRole } = render(
        <TestWrapper store={mockStore}>
          <Navigation />
        </TestWrapper>
      );

      const nav = getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label');
    });

    test('Navigation links should be accessible', () => {
      const { getAllByRole } = render(
        <TestWrapper store={mockStore}>
          <Navigation />
        </TestWrapper>
      );

      const links = getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link).toHaveAccessibleName();
      });
    });

    test('Navigation should indicate current page', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Navigation />
        </TestWrapper>
      );

      const currentLink = container.querySelector('[aria-current="page"]');
      expect(currentLink).toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should have sufficient color contrast', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    test('should not rely solely on color for information', async () => {
      const mockServer = {
        id: '1',
        name: 'Test Server',
        status: 'offline',
        ip: '192.168.1.10',
      };

      const { container } = render(
        <TestWrapper store={mockStore}>
          <ServerCard server={mockServer} />
        </TestWrapper>
      );

      const statusIndicator = container.querySelector('[data-testid="server-status"]');
      
      // Should have text or icon in addition to color
      expect(statusIndicator).toHaveTextContent();
      expect(statusIndicator).toHaveAttribute('aria-label');
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide meaningful text alternatives', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });

      const icons = container.querySelectorAll('[data-icon]');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-label');
      });
    });

    test('should provide live region updates', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const liveRegions = container.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    test('should provide proper table headers', () => {
      const storeWithServers = createMockStore({
        dashboard: {
          servers: [
            { id: '1', name: 'Server 1', status: 'online' },
            { id: '2', name: 'Server 2', status: 'offline' },
          ],
          viewMode: 'table',
        },
      });

      const { container } = render(
        <TestWrapper store={storeWithServers}>
          <Dashboard />
        </TestWrapper>
      );

      const table = container.querySelector('table');
      if (table) {
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope');
        });
      }
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support tab navigation', () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Should have logical tab order
      let previousTabIndex = -1;
      focusableElements.forEach(element => {
        const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
        if (tabIndex > 0) {
          expect(tabIndex).toBeGreaterThan(previousTabIndex);
          previousTabIndex = tabIndex;
        }
      });
    });

    test('should support arrow key navigation for lists', () => {
      const storeWithServers = createMockStore({
        dashboard: {
          servers: [
            { id: '1', name: 'Server 1', status: 'online' },
            { id: '2', name: 'Server 2', status: 'offline' },
          ],
        },
      });

      const { container } = render(
        <TestWrapper store={storeWithServers}>
          <Dashboard />
        </TestWrapper>
      );

      const serverList = container.querySelector('[role="list"]');
      if (serverList) {
        expect(serverList).toHaveAttribute('aria-label');
        
        const listItems = serverList.querySelectorAll('[role="listitem"]');
        listItems.forEach(item => {
          expect(item).toHaveAttribute('tabindex');
        });
      }
    });

    test('should support enter and space key activation', () => {
      const mockServer = {
        id: '1',
        name: 'Test Server',
        status: 'online',
      };

      const onClick = jest.fn();
      const { getByRole } = render(
        <TestWrapper store={mockStore}>
          <ServerCard server={mockServer} onClick={onClick} />
        </TestWrapper>
      );

      const card = getByRole('button');
      
      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      card.dispatchEvent(enterEvent);
      expect(onClick).toHaveBeenCalled();

      // Simulate Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      card.dispatchEvent(spaceEvent);
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });
});
