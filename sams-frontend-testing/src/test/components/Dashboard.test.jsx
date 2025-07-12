import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../components/Dashboard';
import { dashboardSlice } from '../store/dashboardSlice';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      dashboard: dashboardSlice.reducer,
    },
    preloadedState: {
      dashboard: {
        servers: [],
        alerts: [],
        metrics: {},
        loading: false,
        error: null,
        ...initialState,
      },
    },
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

describe('Dashboard Component', () => {
  let mockStore;
  let user;

  beforeEach(() => {
    mockStore = createMockStore();
    user = userEvent.setup();
    
    // Mock API calls
    global.fetch = jest.fn();
    
    // Mock WebSocket
    global.WebSocket = jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders dashboard with loading state', () => {
      const store = createMockStore({ loading: true });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    });

    test('renders dashboard with server data', () => {
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online', ip: '192.168.1.10' },
        { id: '2', name: 'Server 2', status: 'offline', ip: '192.168.1.11' },
      ];
      
      const store = createMockStore({ servers: mockServers });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.getByText('Server 2')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.11')).toBeInTheDocument();
    });

    test('renders dashboard with alert data', () => {
      const mockAlerts = [
        { id: '1', title: 'High CPU Usage', severity: 'critical', timestamp: '2024-01-01T10:00:00Z' },
        { id: '2', title: 'Low Disk Space', severity: 'warning', timestamp: '2024-01-01T11:00:00Z' },
      ];
      
      const store = createMockStore({ alerts: mockAlerts });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Low Disk Space')).toBeInTheDocument();
    });

    test('renders error state correctly', () => {
      const store = createMockStore({ error: 'Failed to load dashboard data' });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('handles server selection', async () => {
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online', ip: '192.168.1.10' },
      ];
      
      const store = createMockStore({ servers: mockServers });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const serverCard = screen.getByTestId('server-card-1');
      await user.click(serverCard);

      await waitFor(() => {
        expect(screen.getByTestId('server-details-modal')).toBeInTheDocument();
      });
    });

    test('handles alert acknowledgment', async () => {
      const mockAlerts = [
        { id: '1', title: 'High CPU Usage', severity: 'critical', status: 'active' },
      ];
      
      const store = createMockStore({ alerts: mockAlerts });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const acknowledgeButton = screen.getByTestId('acknowledge-alert-1');
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/alerts/1/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acknowledged: true }),
        });
      });
    });

    test('handles refresh button click', async () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/dashboard/data');
      });
    });

    test('handles filter changes', async () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const filterSelect = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(filterSelect, 'offline');

      await waitFor(() => {
        expect(filterSelect.value).toBe('offline');
      });
    });
  });

  describe('Real-time Updates', () => {
    test('handles WebSocket connection', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080/ws');
    });

    test('handles real-time server updates', async () => {
      let wsInstance;
      global.WebSocket = jest.fn(() => {
        wsInstance = {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          send: jest.fn(),
          close: jest.fn(),
        };
        return wsInstance;
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate WebSocket message
      const messageHandler = wsInstance.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1];
      
      const mockMessage = {
        data: JSON.stringify({
          type: 'SERVER_UPDATE',
          payload: { id: '1', name: 'Updated Server', status: 'online' }
        })
      };

      messageHandler(mockMessage);

      await waitFor(() => {
        expect(screen.getByText('Updated Server')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    test('renders large dataset efficiently', () => {
      const largeServerList = Array.from({ length: 1000 }, (_, i) => ({
        id: `server-${i}`,
        name: `Server ${i}`,
        status: i % 2 === 0 ? 'online' : 'offline',
        ip: `192.168.1.${i % 255}`,
      }));

      const store = createMockStore({ servers: largeServerList });
      
      const startTime = performance.now();
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms even with large dataset
      expect(renderTime).toBeLessThan(100);
    });

    test('handles rapid state updates', async () => {
      const store = createMockStore();
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        store.dispatch({
          type: 'dashboard/updateMetrics',
          payload: { cpu: Math.random() * 100 }
        });
      }

      // Component should remain responsive
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeEnabled();
    });
  });

  describe('Accessibility', () => {
    test('has no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('supports keyboard navigation', async () => {
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online' },
        { id: '2', name: 'Server 2', status: 'offline' },
      ];
      
      const store = createMockStore({ servers: mockServers });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('server-card-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('server-card-2')).toHaveFocus();
    });

    test('has proper ARIA labels', () => {
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Dashboard');
      expect(screen.getByRole('region', { name: /servers/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /alerts/i })).toBeInTheDocument();
    });

    test('supports screen readers', () => {
      const mockAlerts = [
        { id: '1', title: 'Critical Alert', severity: 'critical' },
      ];
      
      const store = createMockStore({ alerts: mockAlerts });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Critical Alert')).toHaveAttribute('aria-describedby');
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('handles WebSocket disconnection', () => {
      let wsInstance;
      global.WebSocket = jest.fn(() => {
        wsInstance = {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          send: jest.fn(),
          close: jest.fn(),
        };
        return wsInstance;
      });

      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate WebSocket error
      const errorHandler = wsInstance.addEventListener.mock.calls
        .find(call => call[0] === 'error')[1];
      
      errorHandler(new Error('WebSocket connection failed'));

      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });
  });

  describe('Data Validation', () => {
    test('handles malformed server data', () => {
      const malformedServers = [
        { id: '1', name: null, status: 'online' },
        { id: '2', status: 'offline' }, // missing name
        null, // null server
      ];
      
      const store = createMockStore({ servers: malformedServers });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      // Should render without crashing
      expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
    });

    test('handles empty data states', () => {
      const store = createMockStore({ servers: [], alerts: [] });
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/no servers found/i)).toBeInTheDocument();
      expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
    });
  });
});
