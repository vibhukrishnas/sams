import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AlertListItem from '../AlertListItem';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { 
  mockEnhancedAlert, 
  mockTheme, 
  createMockAlert,
  mockHapticService 
} from '../../../__tests__/mocks';
import alertsSlice from '../../../store/slices/alertsSlice';
import settingsSlice from '../../../store/slices/settingsSlice';

// Mock services
jest.mock('../../../services/HapticService', () => mockHapticService);

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      alerts: alertsSlice,
      settings: settingsSlice,
    },
    preloadedState: {
      alerts: {
        alerts: [],
        filteredAlerts: [],
        selectedAlert: null,
        isLoading: false,
        error: null,
        ...initialState.alerts,
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
    },
  });
};

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  
  return render(
    <Provider store={store}>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </Provider>
  );
};

describe('AlertListItem', () => {
  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();
  const mockOnQuickAction = jest.fn();

  const defaultProps = {
    alert: mockEnhancedAlert,
    isSelected: false,
    onPress: mockOnPress,
    onLongPress: mockOnLongPress,
    onQuickAction: mockOnQuickAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders alert information correctly', () => {
      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      expect(getByText('Test Alert')).toBeTruthy();
      expect(getByText('Test alert description')).toBeTruthy();
      expect(getByText('Test Server')).toBeTruthy();
      expect(getByText('Performance')).toBeTruthy();
    });

    it('displays severity icon correctly', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      // Critical alert should show error icon
      expect(getByTestId('severity-icon')).toBeTruthy();
    });

    it('shows priority indicator', () => {
      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      expect(getByText('HIGH')).toBeTruthy(); // Priority 8 = HIGH
    });

    it('displays tags when present', () => {
      const alertWithTags = createMockAlert({
        tags: ['performance', 'cpu', 'critical'],
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={alertWithTags} />
      );

      expect(getByText('performance')).toBeTruthy();
      expect(getByText('cpu')).toBeTruthy();
      expect(getByText('critical')).toBeTruthy();
    });

    it('shows selection indicator when selected', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} isSelected={true} />
      );

      expect(getByTestId('selection-indicator')).toBeTruthy();
    });

    it('applies resolved styling for resolved alerts', () => {
      const resolvedAlert = createMockAlert({ resolved: true });

      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={resolvedAlert} />
      );

      const container = getByTestId('alert-list-item');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ opacity: 0.7 })
      );
    });
  });

  describe('Interactions', () => {
    it('calls onPress when tapped', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      fireEvent.press(getByTestId('alert-list-item'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onLongPress when long pressed', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      fireEvent(getByTestId('alert-list-item'), 'longPress');
      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic feedback on press', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      fireEvent.press(getByTestId('alert-list-item'));
      expect(mockHapticService.buttonPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quick Actions', () => {
    it('shows acknowledge button for unacknowledged alerts', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      expect(getByTestId('quick-action-acknowledge')).toBeTruthy();
    });

    it('shows resolve button for acknowledged alerts', () => {
      const acknowledgedAlert = createMockAlert({ acknowledged: true });

      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={acknowledgedAlert} />
      );

      expect(getByTestId('quick-action-resolve')).toBeTruthy();
    });

    it('hides quick actions for resolved alerts', () => {
      const resolvedAlert = createMockAlert({ resolved: true });

      const { queryByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={resolvedAlert} />
      );

      expect(queryByTestId('quick-action-acknowledge')).toBeNull();
      expect(queryByTestId('quick-action-resolve')).toBeNull();
    });

    it('calls onQuickAction when quick action is pressed', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      fireEvent.press(getByTestId('quick-action-acknowledge'));
      expect(mockOnQuickAction).toHaveBeenCalledWith('acknowledge');
    });
  });

  describe('Status Badges', () => {
    it('shows acknowledged badge for acknowledged alerts', () => {
      const acknowledgedAlert = createMockAlert({ 
        acknowledged: true,
        acknowledgedBy: 'admin',
        acknowledgedAt: '2024-01-01T01:00:00.000Z',
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={acknowledgedAlert} />
      );

      expect(getByText('ACK')).toBeTruthy();
    });

    it('shows resolved badge for resolved alerts', () => {
      const resolvedAlert = createMockAlert({ 
        resolved: true,
        resolvedBy: 'admin',
        resolvedAt: '2024-01-01T02:00:00.000Z',
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={resolvedAlert} />
      );

      expect(getByText('RESOLVED')).toBeTruthy();
    });

    it('shows escalation level badge for escalated alerts', () => {
      const escalatedAlert = createMockAlert({ escalationLevel: 2 });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={escalatedAlert} />
      );

      expect(getByText('L2')).toBeTruthy();
    });

    it('shows voice notes badge when voice notes exist', () => {
      const alertWithVoiceNotes = createMockAlert({
        voiceNotes: [
          { id: '1', transcript: 'Test note', timestamp: '2024-01-01T00:00:00.000Z' },
        ],
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={alertWithVoiceNotes} />
      );

      expect(getByText('1')).toBeTruthy(); // Voice notes count
    });
  });

  describe('Time Formatting', () => {
    it('formats recent timestamps correctly', () => {
      const recentAlert = createMockAlert({
        timestamp: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={recentAlert} />
      );

      expect(getByText('Just now')).toBeTruthy();
    });

    it('formats minute timestamps correctly', () => {
      const minuteAlert = createMockAlert({
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={minuteAlert} />
      );

      expect(getByText('5m ago')).toBeTruthy();
    });

    it('formats hour timestamps correctly', () => {
      const hourAlert = createMockAlert({
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={hourAlert} />
      );

      expect(getByText('2h ago')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', () => {
      const { getByLabelText } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      expect(getByLabelText(/Test Alert/)).toBeTruthy();
    });

    it('has proper accessibility roles', () => {
      const { getByRole } = renderWithProviders(
        <AlertListItem {...defaultProps} />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('announces selection state for screen readers', () => {
      const { getByTestId } = renderWithProviders(
        <AlertListItem {...defaultProps} isSelected={true} />
      );

      const item = getByTestId('alert-list-item');
      expect(item.props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('Performance', () => {
    it('renders within performance threshold', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<AlertListItem {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 16ms (60fps)
      expect(renderTime).toBeLessThan(16);
    });

    it('handles large number of tags efficiently', () => {
      const alertWithManyTags = createMockAlert({
        tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
      });

      const { getByText } = renderWithProviders(
        <AlertListItem {...defaultProps} alert={alertWithManyTags} />
      );

      // Should only show first 3 tags + more indicator
      expect(getByText('tag-0')).toBeTruthy();
      expect(getByText('tag-1')).toBeTruthy();
      expect(getByText('tag-2')).toBeTruthy();
      expect(getByText('+17')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles missing alert data gracefully', () => {
      const incompleteAlert = createMockAlert({
        title: undefined,
        description: undefined,
      });

      expect(() => {
        renderWithProviders(
          <AlertListItem {...defaultProps} alert={incompleteAlert} />
        );
      }).not.toThrow();
    });

    it('handles invalid timestamps gracefully', () => {
      const invalidTimestampAlert = createMockAlert({
        timestamp: 'invalid-date',
      });

      expect(() => {
        renderWithProviders(
          <AlertListItem {...defaultProps} alert={invalidTimestampAlert} />
        );
      }).not.toThrow();
    });
  });
});
