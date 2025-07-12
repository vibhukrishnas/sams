/**
 * Alert Flow Integration Tests
 * End-to-end testing of alert management workflows
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, createMockAlert, mockNetworkResponse, flushPromises } from '../utils';
import AlertsScreen from '../../screens/AlertsScreen';
import { createMockNavigation, createMockRoute } from '../utils';

describe('Alert Flow Integration', () => {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute({ name: 'Alerts' });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    mockNetworkResponse('/api/alerts', {
      alerts: [
        createMockAlert({ id: '1', title: 'Critical Alert', severity: 'critical' }),
        createMockAlert({ id: '2', title: 'Warning Alert', severity: 'high' }),
        createMockAlert({ id: '3', title: 'Info Alert', severity: 'low' }),
      ],
      total: 3,
    });
  });

  it('loads and displays alerts on screen mount', async () => {
    const { getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
      expect(getByText('Warning Alert')).toBeTruthy();
      expect(getByText('Info Alert')).toBeTruthy();
    });
  });

  it('filters alerts by severity', async () => {
    const { getByText, getByTestId, queryByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
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

  it('searches alerts by title', async () => {
    const { getByText, getByTestId, queryByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
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

  it('acknowledges an alert successfully', async () => {
    // Mock acknowledge API
    mockNetworkResponse('/api/alerts/1/acknowledge', { success: true });

    const { getByText, getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Acknowledge the alert
    const acknowledgeButton = getByTestId('acknowledge-button-1');
    fireEvent.press(acknowledgeButton);

    await waitFor(() => {
      expect(getByText('Acknowledged')).toBeTruthy();
    });
  });

  it('resolves an alert successfully', async () => {
    // Mock resolve API
    mockNetworkResponse('/api/alerts/1/resolve', { success: true });

    const { getByText, getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Resolve the alert
    const resolveButton = getByTestId('resolve-button-1');
    fireEvent.press(resolveButton);

    await waitFor(() => {
      expect(getByText('Resolved')).toBeTruthy();
    });
  });

  it('handles pull-to-refresh', async () => {
    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    const alertsList = getByTestId('alerts-list');
    
    // Trigger pull-to-refresh
    fireEvent(alertsList, 'refresh');

    await flushPromises();

    // Verify refresh was triggered (API call made)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/alerts'),
      expect.any(Object)
    );
  });

  it('navigates to alert details on card press', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Press on alert card
    const alertCard = getByTestId('alert-card-1');
    fireEvent.press(alertCard);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AlertDetails', {
      alertId: '1',
    });
  });

  it('shows empty state when no alerts', async () => {
    // Mock empty response
    mockNetworkResponse('/api/alerts', { alerts: [], total: 0 });

    const { getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText(/no alerts/i)).toBeTruthy();
    });
  });

  it('handles network errors gracefully', async () => {
    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    const { getByText } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText(/error loading alerts/i)).toBeTruthy();
    });
  });

  it('shows loading state during API calls', async () => {
    // Mock delayed response
    mockNetworkResponse('/api/alerts', { alerts: [] }, 1000);

    const { getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('maintains filter state during refresh', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Apply filter
    const criticalFilter = getByTestId('filter-critical');
    fireEvent.press(criticalFilter);

    // Refresh
    const alertsList = getByTestId('alerts-list');
    fireEvent(alertsList, 'refresh');

    await flushPromises();

    // Verify filter is still applied
    expect(criticalFilter.props.style).toMatchObject(
      expect.objectContaining({
        backgroundColor: expect.any(String),
      })
    );
  });

  it('handles bulk operations', async () => {
    // Mock bulk acknowledge API
    mockNetworkResponse('/api/alerts/bulk-acknowledge', { success: true });

    const { getByText, getByTestId } = renderWithProviders(
      <AlertsScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Critical Alert')).toBeTruthy();
    });

    // Select multiple alerts
    const selectButton1 = getByTestId('select-alert-1');
    const selectButton2 = getByTestId('select-alert-2');
    
    fireEvent.press(selectButton1);
    fireEvent.press(selectButton2);

    // Perform bulk acknowledge
    const bulkAcknowledgeButton = getByTestId('bulk-acknowledge');
    fireEvent.press(bulkAcknowledgeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/alerts/bulk-acknowledge'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('["1","2"]'),
        })
      );
    });
  });

  it('persists scroll position during updates', async () => {
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

    // Trigger update
    fireEvent(alertsList, 'refresh');
    await flushPromises();

    // Verify scroll position is maintained
    expect(alertsList.props.contentOffset).toEqual({ y: 500 });
  });
});
