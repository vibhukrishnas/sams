import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import Dashboard from '../src/components/Dashboard';
import { dashboardSlice } from '../src/store/dashboardSlice';
import { authSlice } from '../src/store/authSlice';

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      dashboard: dashboardSlice.reducer,
      auth: authSlice.reducer,
    },
    preloadedState: {
      dashboard: {
        servers: [],
        alerts: [],
        metrics: {},
        loading: false,
        error: null,
        ...initialState.dashboard,
      },
      auth: {
        user: { id: '1', username: 'testuser' },
        isAuthenticated: true,
        token: 'mock-token',
        ...initialState.auth,
      },
    },
  });
};

// Test wrapper component
const TestWrapper = ({ children, store }) => (
  <Provider store={store}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </Provider>
);

describe('Dashboard Component - Mobile', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = createMockStore();
    
    // Mock fetch
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
      const store = createMockStore({
        dashboard: { loading: true }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(getByTestId('dashboard-loading')).toBeTruthy();
    });

    test('renders dashboard with server data', () => {
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online', ip: '192.168.1.10' },
        { id: '2', name: 'Server 2', status: 'offline', ip: '192.168.1.11' },
      ];
      
      const store = createMockStore({
        dashboard: { servers: mockServers }
      });
      
      const { getByText } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(getByText('Server 1')).toBeTruthy();
      expect(getByText('Server 2')).toBeTruthy();
    });

    test('renders dashboard with alert data', () => {
      const mockAlerts = [
        { id: '1', title: 'High CPU Usage', severity: 'critical', timestamp: '2024-01-01T10:00:00Z' },
        { id: '2', title: 'Low Disk Space', severity: 'warning', timestamp: '2024-01-01T11:00:00Z' },
      ];
      
      const store = createMockStore({
        dashboard: { alerts: mockAlerts }
      });
      
      const { getByText } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(getByText('High CPU Usage')).toBeTruthy();
      expect(getByText('Low Disk Space')).toBeTruthy();
    });

    test('renders error state correctly', () => {
      const store = createMockStore({
        dashboard: { error: 'Failed to load dashboard data' }
      });
      
      const { getByText } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      expect(getByText(/failed to load dashboard data/i)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    test('handles server card press', async () => {
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online', ip: '192.168.1.10' },
      ];
      
      const store = createMockStore({
        dashboard: { servers: mockServers }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const serverCard = getByTestId('server-card-1');
      fireEvent.press(serverCard);

      await waitFor(() => {
        expect(getByTestId('server-details-modal')).toBeTruthy();
      });
    });

    test('handles alert acknowledgment', async () => {
      const mockAlerts = [
        { id: '1', title: 'High CPU Usage', severity: 'critical', status: 'active' },
      ];
      
      const store = createMockStore({
        dashboard: { alerts: mockAlerts }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const acknowledgeButton = getByTestId('acknowledge-alert-1');
      fireEvent.press(acknowledgeButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/alerts/1/acknowledge', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({ acknowledged: true }),
        });
      });
    });

    test('handles pull to refresh', async () => {
      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const scrollView = getByTestId('dashboard-scroll-view');
      
      // Simulate pull to refresh
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/dashboard/data');
      });
    });

    test('handles swipe gestures on alert cards', async () => {
      const mockAlerts = [
        { id: '1', title: 'High CPU Usage', severity: 'critical', status: 'active' },
      ];
      
      const store = createMockStore({
        dashboard: { alerts: mockAlerts }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const alertCard = getByTestId('alert-card-1');
      
      // Simulate swipe right gesture
      fireEvent(alertCard, 'swipeRight');

      await waitFor(() => {
        expect(getByTestId('alert-actions-1')).toBeTruthy();
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

      expect(WebSocket).toHaveBeenCalledWith('ws://192.168.1.10:8080/ws');
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

      const { getByText } = render(
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

      act(() => {
        messageHandler(mockMessage);
      });

      await waitFor(() => {
        expect(getByText('Updated Server')).toBeTruthy();
      });
    });

    test('handles push notifications', async () => {
      const PushNotification = require('react-native-push-notification');
      
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate receiving a push notification
      const notificationHandler = PushNotification.configure.mock.calls[0][0].onNotification;
      
      act(() => {
        notificationHandler({
          title: 'New Alert',
          message: 'Critical server issue detected',
          data: { alertId: '123' }
        });
      });

      expect(PushNotification.localNotification).toHaveBeenCalled();
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

      const store = createMockStore({
        dashboard: { servers: largeServerList }
      });
      
      const startTime = Date.now();
      
      render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render within 200ms even with large dataset
      expect(renderTime).toBeLessThan(200);
    });

    test('handles rapid state updates without performance issues', async () => {
      const store = createMockStore();
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          store.dispatch({
            type: 'dashboard/updateMetrics',
            payload: { cpu: Math.random() * 100 }
          });
        });
      }

      // Component should remain responsive
      const refreshButton = getByTestId('refresh-button');
      expect(refreshButton).toBeTruthy();
    });

    test('optimizes memory usage with large lists', () => {
      const largeAlertList = Array.from({ length: 5000 }, (_, i) => ({
        id: `alert-${i}`,
        title: `Alert ${i}`,
        severity: i % 3 === 0 ? 'critical' : 'warning',
        timestamp: new Date().toISOString(),
      }));

      const store = createMockStore({
        dashboard: { alerts: largeAlertList }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      // Should use FlatList for virtualization
      const alertsList = getByTestId('alerts-flatlist');
      expect(alertsList).toBeTruthy();
    });
  });

  describe('Offline Support', () => {
    test('handles offline state', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('offline-indicator')).toBeTruthy();
      });
    });

    test('caches data for offline access', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      const mockData = {
        servers: [{ id: '1', name: 'Cached Server' }],
        alerts: [{ id: '1', title: 'Cached Alert' }]
      };

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const { getByText } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Cached Server')).toBeTruthy();
        expect(getByText('Cached Alert')).toBeTruthy();
      });
    });

    test('syncs data when coming back online', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      
      // Start offline
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      
      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate coming back online
      const connectionListener = NetInfo.addEventListener.mock.calls[0][0];
      
      act(() => {
        connectionListener({ isConnected: true });
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/dashboard/data');
        expect(getByTestId('sync-indicator')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = getByTestId('refresh-button');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
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

      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate WebSocket error
      const errorHandler = wsInstance.addEventListener.mock.calls
        .find(call => call[0] === 'error')[1];
      
      act(() => {
        errorHandler(new Error('WebSocket connection failed'));
      });

      expect(getByTestId('connection-lost-indicator')).toBeTruthy();
    });

    test('handles app state changes', () => {
      const { AppState } = require('react-native');
      
      render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate app going to background
      act(() => {
        AppState.currentState = 'background';
        AppState._eventHandlers.change.forEach(handler => handler('background'));
      });

      // Simulate app coming to foreground
      act(() => {
        AppState.currentState = 'active';
        AppState._eventHandlers.change.forEach(handler => handler('active'));
      });

      // Should refresh data when app becomes active
      expect(fetch).toHaveBeenCalledWith('/api/dashboard/data');
    });
  });

  describe('Accessibility', () => {
    test('has proper accessibility labels', () => {
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online' },
      ];
      
      const store = createMockStore({
        dashboard: { servers: mockServers }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const serverCard = getByTestId('server-card-1');
      expect(serverCard.props.accessibilityLabel).toContain('Server 1');
      expect(serverCard.props.accessibilityLabel).toContain('online');
    });

    test('supports screen readers', () => {
      const mockAlerts = [
        { id: '1', title: 'Critical Alert', severity: 'critical' },
      ];
      
      const store = createMockStore({
        dashboard: { alerts: mockAlerts }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const alertCard = getByTestId('alert-card-1');
      expect(alertCard.props.accessibilityRole).toBe('button');
      expect(alertCard.props.accessibilityHint).toBeTruthy();
    });

    test('supports voice control', () => {
      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      const refreshButton = getByTestId('refresh-button');
      expect(refreshButton.props.accessibilityActions).toContainEqual(
        expect.objectContaining({ name: 'activate' })
      );
    });
  });

  describe('Device-specific Features', () => {
    test('handles device orientation changes', () => {
      const { Dimensions } = require('react-native');
      
      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate orientation change
      act(() => {
        Dimensions.set({
          window: { width: 812, height: 375 }, // Landscape
          screen: { width: 812, height: 375 },
        });
      });

      expect(getByTestId('landscape-layout')).toBeTruthy();
    });

    test('handles different screen densities', () => {
      const { PixelRatio } = require('react-native');
      PixelRatio.get = jest.fn(() => 3); // High density screen
      
      const { getByTestId } = render(
        <TestWrapper store={mockStore}>
          <Dashboard />
        </TestWrapper>
      );

      // Should use appropriate image sizes for high density
      const serverIcon = getByTestId('server-icon');
      expect(serverIcon.props.source.uri).toContain('@3x');
    });

    test('handles haptic feedback', () => {
      const { Haptics } = require('expo-haptics');
      
      const mockServers = [
        { id: '1', name: 'Server 1', status: 'online' },
      ];
      
      const store = createMockStore({
        dashboard: { servers: mockServers }
      });
      
      const { getByTestId } = render(
        <TestWrapper store={store}>
          <Dashboard />
        </TestWrapper>
      );

      const serverCard = getByTestId('server-card-1');
      fireEvent.press(serverCard);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });
});
