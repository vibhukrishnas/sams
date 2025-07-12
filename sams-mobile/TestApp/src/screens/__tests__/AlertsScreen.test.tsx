/**
 * AlertsScreen Component Tests
 * Unit tests for the AlertsScreen component
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockAlert, mockNetworkResponse } from '../../test/utils';
import AlertsScreen from '../AlertsScreen';
import { createMockNavigation, createMockRoute } from '../../test/utils';

describe('AlertsScreen', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute({ name: 'Alerts' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkResponse('/api/alerts', {
      alerts: [
        createMockAlert({ id: '1', title: 'Critical Alert', severity: 'critical' }),
        createMockAlert({ id: '2', title: 'Warning Alert', severity: 'high' }),
        createMockAlert({ id: '3', title: 'Info Alert', severity: 'low' }),
      ],
      total: 3,
    });
  });

  it('renders alerts screen correctly', () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByTestId('alerts-screen')).toBeTruthy();
  });

  it('displays loading state initially', () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('loads and displays alerts', async () => {
    const { getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
      expect(getByText('Warning Alert')).toBeTruthy();
      expect(getByText('Info Alert')).toBeTruthy();
    });
  });

  it('filters alerts by search query', async () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for alerts to load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Search for "Critical"
    const searchInput = getByTestId('search-input');
    fireEvent.changeText(searchInput, 'Critical');

    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
      expect(queryByText('Warning Alert')).toBeFalsy();
      expect(queryByText('Info Alert')).toBeFalsy();
    });
  });

  it('filters alerts by severity', async () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for alerts to load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Apply critical filter
    const criticalFilter = getByTestId('filter-critical');
    fireEvent.press(criticalFilter);

    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
      expect(queryByText('Warning Alert')).toBeFalsy();
      expect(queryByText('Info Alert')).toBeFalsy();
    });
  });

  it('acknowledges an alert', async () => {
    mockNetworkResponse('/api/alerts/1/acknowledge', { success: true });

    const { getByTestId, getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for alerts to load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Acknowledge the alert
    const acknowledgeButton = getByTestId('acknowledge-button-1');
    fireEvent.press(acknowledgeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/alerts/1/acknowledge'),
        expect.any(Object)
      );
    });
  });

  it('resolves an alert', async () => {
    mockNetworkResponse('/api/alerts/1/resolve', { success: true });

    const { getByTestId, getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for alerts to load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Resolve the alert
    const resolveButton = getByTestId('resolve-button-1');
    fireEvent.press(resolveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/alerts/1/resolve'),
        expect.any(Object)
      );
    });
  });

  it('navigates to alert details', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for alerts to load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Tap on alert card
    const alertCard = getByTestId('alert-card-1');
    fireEvent.press(alertCard);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AlertDetails', {
      alertId: '1',
    });
  });

  it('handles pull to refresh', async () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    const alertsList = getByTestId('alerts-list');
    fireEvent(alertsList, 'refresh');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/alerts'),
        expect.any(Object)
      );
    });
  });

  it('shows empty state when no alerts', async () => {
    mockNetworkResponse('/api/alerts', { alerts: [], total: 0 });

    const { getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText(/no alerts/i)).toBeTruthy();
    });
  });

  it('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    const { getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText(/error loading alerts/i)).toBeTruthy();
    });
  });

  it('opens filter modal', async () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      expect(getByTestId('alert-filter-modal')).toBeTruthy();
    });
  });

  it('opens history modal', async () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    const historyButton = getByTestId('history-button');
    fireEvent.press(historyButton);

    await waitFor(() => {
      expect(getByTestId('alert-history-modal')).toBeTruthy();
    });
  });

  it('has proper accessibility labels', () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    const alertsScreen = getByTestId('alerts-screen');
    expect(alertsScreen.props.accessibilityLabel).toContain('Alerts');
  });

  it('maintains scroll position during updates', async () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    const alertsList = getByTestId('alerts-list');
    
    // Simulate scroll
    fireEvent.scroll(alertsList, {
      nativeEvent: {
        contentOffset: { y: 500 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 600 },
      },
    });

    // Trigger refresh
    fireEvent(alertsList, 'refresh');

    // Verify scroll position is maintained
    expect(alertsList.props.contentOffset).toEqual({ y: 500 });
  });
});
