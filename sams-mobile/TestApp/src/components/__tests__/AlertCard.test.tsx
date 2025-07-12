/**
 * AlertCard Component Tests
 * Unit tests for the AlertCard component
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders, createMockAlert } from '../../test/utils';
import AlertCard from '../alerts/AlertCard';

describe('AlertCard', () => {
  const mockAlert = createMockAlert();
  const mockOnPress = jest.fn();
  const mockOnAcknowledge = jest.fn();
  const mockOnResolve = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders alert information correctly', () => {
    const { getByText } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    expect(getByText(mockAlert.title)).toBeTruthy();
    expect(getByText(mockAlert.message)).toBeTruthy();
    expect(getByText(mockAlert.serverName)).toBeTruthy();
  });

  it('displays correct severity styling', () => {
    const criticalAlert = createMockAlert({ severity: 'critical' });
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={criticalAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
        testID="alert-card"
      />
    );

    const alertCard = getByTestId('alert-card');
    expect(alertCard.props.style).toMatchObject(
      expect.objectContaining({
        borderLeftColor: expect.stringMatching(/#F44336|red/i),
      })
    );
  });

  it('calls onPress when card is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
        testID="alert-card"
      />
    );

    fireEvent.press(getByTestId('alert-card'));
    expect(mockOnPress).toHaveBeenCalledWith(mockAlert);
  });

  it('calls onAcknowledge when acknowledge button is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    const acknowledgeButton = getByTestId('acknowledge-button');
    fireEvent.press(acknowledgeButton);
    expect(mockOnAcknowledge).toHaveBeenCalledWith(mockAlert.id);
  });

  it('calls onResolve when resolve button is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    const resolveButton = getByTestId('resolve-button');
    fireEvent.press(resolveButton);
    expect(mockOnResolve).toHaveBeenCalledWith(mockAlert.id);
  });

  it('shows acknowledged status correctly', () => {
    const acknowledgedAlert = createMockAlert({ status: 'acknowledged' });
    const { getByText } = renderWithProviders(
      <AlertCard
        alert={acknowledgedAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    expect(getByText('Acknowledged')).toBeTruthy();
  });

  it('shows resolved status correctly', () => {
    const resolvedAlert = createMockAlert({ status: 'resolved' });
    const { getByText } = renderWithProviders(
      <AlertCard
        alert={resolvedAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    expect(getByText('Resolved')).toBeTruthy();
  });

  it('formats timestamp correctly', () => {
    const now = new Date();
    const alertWithTimestamp = createMockAlert({
      timestamp: now.toISOString(),
    });

    const { getByText } = renderWithProviders(
      <AlertCard
        alert={alertWithTimestamp}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    // Should show "Just now" for recent timestamps
    expect(getByText(/just now|now/i)).toBeTruthy();
  });

  it('applies dark theme correctly', () => {
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={true}
        testID="alert-card"
      />
    );

    const alertCard = getByTestId('alert-card');
    expect(alertCard.props.style).toMatchObject(
      expect.objectContaining({
        backgroundColor: expect.stringMatching(/#1E1E1E|#2C2C2C/i),
      })
    );
  });

  it('handles long text content properly', () => {
    const longAlert = createMockAlert({
      title: 'This is a very long alert title that should be handled properly by the component',
      message: 'This is a very long alert message that contains a lot of details about the issue and should be displayed correctly without breaking the layout',
    });

    const { getByText } = renderWithProviders(
      <AlertCard
        alert={longAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    expect(getByText(longAlert.title)).toBeTruthy();
    expect(getByText(longAlert.message)).toBeTruthy();
  });

  it('has proper accessibility labels', () => {
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
        testID="alert-card"
      />
    );

    const alertCard = getByTestId('alert-card');
    expect(alertCard.props.accessibilityLabel).toContain(mockAlert.title);
    expect(alertCard.props.accessibilityLabel).toContain(mockAlert.severity);
  });

  it('disables buttons for resolved alerts', () => {
    const resolvedAlert = createMockAlert({ status: 'resolved' });
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={resolvedAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
      />
    );

    const acknowledgeButton = getByTestId('acknowledge-button');
    const resolveButton = getByTestId('resolve-button');

    expect(acknowledgeButton.props.disabled).toBe(true);
    expect(resolveButton.props.disabled).toBe(true);
  });

  it('shows loading state when processing', () => {
    const { getByTestId } = renderWithProviders(
      <AlertCard
        alert={mockAlert}
        onPress={mockOnPress}
        onAcknowledge={mockOnAcknowledge}
        onResolve={mockOnResolve}
        isDark={false}
        isLoading={true}
      />
    );

    const loadingIndicator = getByTestId('loading-indicator');
    expect(loadingIndicator).toBeTruthy();
  });
});
