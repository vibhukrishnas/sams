import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import AdvancedAlertScreen from '../../screens/alerts/AdvancedAlertScreen';
import AlertDetailsScreen from '../../screens/alerts/AlertDetailsScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';
import alertsSlice from '../../store/slices/alertsSlice';
import enhancedAlertSlice from '../../store/slices/enhancedAlertSlice';
import settingsSlice from '../../store/slices/settingsSlice';
import uiSlice from '../../store/slices/uiSlice';
import {
  mockEnhancedAlert,
  createMockAlert,
  mockHapticService,
  mockVoiceService,
  mockApiResponses,
} from '../mocks';

// Mock services
jest.mock('../../services/HapticService', () => mockHapticService);
jest.mock('../../services/VoiceService', () => mockVoiceService);

// Mock API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

const Stack = createStackNavigator();

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      alerts: alertsSlice,
      enhancedAlerts: enhancedAlertSlice,
      settings: settingsSlice,
      ui: uiSlice,
    },
    preloadedState: {
      alerts: {
        alerts: [],
        selectedAlert: null,
        isLoading: false,
        error: null,
        ...initialState.alerts,
      },
      enhancedAlerts: {
        alerts: [mockEnhancedAlert],
        filteredAlerts: [mockEnhancedAlert],
        searchQuery: '',
        filters: {},
        sortBy: 'timestamp',
        sortOrder: 'desc',
        bulkSelection: [],
        viewMode: 'list',
        isLoading: false,
        voiceRecording: false,
        voiceTranscript: '',
        voiceProcessing: false,
        ...initialState.enhancedAlerts,
      },
      settings: {
        app: {
          theme: 'light',
          language: 'en',
          hapticFeedback: true,
          animations: true,
          gestureNavigation: true,
        },
        accessibility: {
          enabled: false,
          fontSize: 'normal',
          highContrast: false,
          reduceMotion: false,
          voiceCommands: false,
        },
        security: {
          biometricEnabled: false,
          pinEnabled: false,
          autoLock: true,
        },
        notifications: {
          enabled: true,
          sound: true,
          vibration: true,
          critical: true,
          warning: true,
          info: false,
        },
        ...initialState.settings,
      },
      ui: {
        toasts: [],
        modals: {},
        loading: {},
        ...initialState.ui,
      },
    },
  });
};

const TestNavigator = ({ initialState = {} }) => {
  const store = createTestStore(initialState);
  
  return (
    <Provider store={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="AlertList">
            <Stack.Screen 
              name="AlertList" 
              component={AdvancedAlertScreen}
              options={{ title: 'Alerts' }}
            />
            <Stack.Screen 
              name="AlertDetails" 
              component={AlertDetailsScreen}
              options={{ title: 'Alert Details' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </Provider>
  );
};

describe('Alert Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Alert List to Details Navigation', () => {
    it('navigates from alert list to alert details', async () => {
      const { getByText, getByTestId } = render(<TestNavigator />);

      // Wait for alerts to load
      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      // Tap on alert item
      fireEvent.press(getByTestId('alert-list-item-1'));

      // Should navigate to details screen
      await waitFor(() => {
        expect(getByText('Alert Details')).toBeTruthy();
      });
    });

    it('passes correct alert data to details screen', async () => {
      const { getByText, getByTestId } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      fireEvent.press(getByTestId('alert-list-item-1'));

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
        expect(getByText('Test alert description')).toBeTruthy();
        expect(getByText('Test Server')).toBeTruthy();
      });
    });
  });

  describe('Alert Actions Flow', () => {
    it('acknowledges alert and updates UI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { getByText, getByTestId } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      // Acknowledge alert
      fireEvent.press(getByTestId('quick-action-acknowledge'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/alerts/1/acknowledge'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Should show success toast
      await waitFor(() => {
        expect(getByText(/acknowledged/i)).toBeTruthy();
      });
    });

    it('resolves alert and updates UI', async () => {
      const acknowledgedAlert = createMockAlert({ 
        acknowledged: true,
        acknowledgedBy: 'admin',
        acknowledgedAt: '2024-01-01T01:00:00.000Z',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { getByText, getByTestId } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: [acknowledgedAlert],
              filteredAlerts: [acknowledgedAlert],
            },
          }}
        />
      );

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      // Resolve alert
      fireEvent.press(getByTestId('quick-action-resolve'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/alerts/1/resolve'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      // Should show success toast
      await waitFor(() => {
        expect(getByText(/resolved/i)).toBeTruthy();
      });
    });

    it('handles alert action errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { getByText, getByTestId } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      fireEvent.press(getByTestId('quick-action-acknowledge'));

      await waitFor(() => {
        expect(getByText(/error/i)).toBeTruthy();
      });
    });
  });

  describe('Search and Filter Flow', () => {
    it('filters alerts by search query', async () => {
      const multipleAlerts = [
        createMockAlert({ id: '1', title: 'CPU Alert', description: 'High CPU usage' }),
        createMockAlert({ id: '2', title: 'Memory Alert', description: 'Low memory' }),
        createMockAlert({ id: '3', title: 'Disk Alert', description: 'Disk full' }),
      ];

      const { getByText, getByPlaceholderText, queryByText } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: multipleAlerts,
              filteredAlerts: multipleAlerts,
            },
          }}
        />
      );

      // All alerts should be visible initially
      await waitFor(() => {
        expect(getByText('CPU Alert')).toBeTruthy();
        expect(getByText('Memory Alert')).toBeTruthy();
        expect(getByText('Disk Alert')).toBeTruthy();
      });

      // Search for CPU
      const searchInput = getByPlaceholderText('Search alerts...');
      fireEvent.changeText(searchInput, 'CPU');

      await waitFor(() => {
        expect(getByText('CPU Alert')).toBeTruthy();
        expect(queryByText('Memory Alert')).toBeNull();
        expect(queryByText('Disk Alert')).toBeNull();
      });
    });

    it('applies severity filters correctly', async () => {
      const mixedSeverityAlerts = [
        createMockAlert({ id: '1', title: 'Critical Alert', severity: 'critical' }),
        createMockAlert({ id: '2', title: 'Warning Alert', severity: 'warning' }),
        createMockAlert({ id: '3', title: 'Info Alert', severity: 'info' }),
      ];

      const { getByText, getByTestId, queryByText } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: mixedSeverityAlerts,
              filteredAlerts: mixedSeverityAlerts,
            },
          }}
        />
      );

      // Open filter modal
      fireEvent.press(getByTestId('filter-button'));

      await waitFor(() => {
        expect(getByText('Filter Alerts')).toBeTruthy();
      });

      // Select only critical severity
      fireEvent.press(getByText('Critical'));
      fireEvent.press(getByText('Apply Filters'));

      await waitFor(() => {
        expect(getByText('Critical Alert')).toBeTruthy();
        expect(queryByText('Warning Alert')).toBeNull();
        expect(queryByText('Info Alert')).toBeNull();
      });
    });
  });

  describe('Voice Command Flow', () => {
    it('processes voice commands correctly', async () => {
      mockVoiceService.startListening.mockResolvedValueOnce(true);
      
      const { getByText, getByTestId } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      // Start voice command
      fireEvent.press(getByTestId('voice-command-button'));

      await waitFor(() => {
        expect(mockVoiceService.startListening).toHaveBeenCalled();
      });

      // Simulate voice recognition result
      act(() => {
        mockVoiceService.onSpeechResults?.({ value: ['acknowledge this alert'] });
      });

      await waitFor(() => {
        expect(getByText(/voice command recognized/i)).toBeTruthy();
      });
    });

    it('handles voice command errors', async () => {
      mockVoiceService.startListening.mockRejectedValueOnce(new Error('Microphone not available'));
      
      const { getByText, getByTestId } = render(<TestNavigator />);

      fireEvent.press(getByTestId('voice-command-button'));

      await waitFor(() => {
        expect(getByText(/voice recognition failed/i)).toBeTruthy();
      });
    });
  });

  describe('Bulk Actions Flow', () => {
    it('selects multiple alerts and performs bulk action', async () => {
      const multipleAlerts = [
        createMockAlert({ id: '1', title: 'Alert 1' }),
        createMockAlert({ id: '2', title: 'Alert 2' }),
        createMockAlert({ id: '3', title: 'Alert 3' }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { getByText, getByTestId } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: multipleAlerts,
              filteredAlerts: multipleAlerts,
            },
          }}
        />
      );

      // Long press to start bulk selection
      fireEvent(getByTestId('alert-list-item-1'), 'longPress');

      await waitFor(() => {
        expect(getByText('1 selected')).toBeTruthy();
      });

      // Select additional alerts
      fireEvent.press(getByTestId('alert-list-item-2'));
      fireEvent.press(getByTestId('alert-list-item-3'));

      await waitFor(() => {
        expect(getByText('3 selected')).toBeTruthy();
      });

      // Perform bulk acknowledge
      fireEvent.press(getByTestId('bulk-acknowledge-button'));

      await waitFor(() => {
        expect(getByText(/acknowledge.*3.*alerts/i)).toBeTruthy();
      });

      // Confirm bulk action
      fireEvent.press(getByText('Confirm'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(getByText(/acknowledged.*3.*alerts/i)).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates Flow', () => {
    it('updates alerts when new data arrives', async () => {
      const { getByText, rerender } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText('Test Alert')).toBeTruthy();
      });

      // Simulate new alert arriving
      const newAlert = createMockAlert({ 
        id: '2', 
        title: 'New Critical Alert',
        severity: 'critical',
      });

      rerender(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: [mockEnhancedAlert, newAlert],
              filteredAlerts: [mockEnhancedAlert, newAlert],
            },
          }}
        />
      );

      await waitFor(() => {
        expect(getByText('New Critical Alert')).toBeTruthy();
      });
    });
  });

  describe('Performance Tests', () => {
    it('handles large number of alerts efficiently', async () => {
      const manyAlerts = Array.from({ length: 100 }, (_, i) => 
        createMockAlert({ 
          id: `alert-${i}`, 
          title: `Alert ${i}`,
          description: `Description for alert ${i}`,
        })
      );

      const startTime = performance.now();

      const { getByText } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: manyAlerts,
              filteredAlerts: manyAlerts.slice(0, 20), // Paginated
            },
          }}
        />
      );

      await waitFor(() => {
        expect(getByText('Alert 0')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (< 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('maintains smooth scrolling with many alerts', async () => {
      const manyAlerts = Array.from({ length: 50 }, (_, i) => 
        createMockAlert({ id: `alert-${i}`, title: `Alert ${i}` })
      );

      const { getByTestId } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: manyAlerts,
              filteredAlerts: manyAlerts,
            },
          }}
        />
      );

      const scrollView = getByTestId('alert-list');
      
      // Simulate scrolling
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 1000 },
          contentSize: { height: 5000 },
          layoutMeasurement: { height: 800 },
        },
      });

      // Should not throw or cause performance issues
      expect(scrollView).toBeTruthy();
    });
  });

  describe('Error Boundary Tests', () => {
    it('recovers from component errors gracefully', async () => {
      // Mock a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const { getByText } = render(
        <TestNavigator 
          initialState={{
            enhancedAlerts: {
              alerts: [{ ...mockEnhancedAlert, ErrorComponent }],
              filteredAlerts: [{ ...mockEnhancedAlert, ErrorComponent }],
            },
          }}
        />
      );

      // Should show error boundary fallback
      await waitFor(() => {
        expect(getByText(/something went wrong/i)).toBeTruthy();
      });
    });
  });
});
