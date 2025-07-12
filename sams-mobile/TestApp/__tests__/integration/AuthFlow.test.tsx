import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store } from '../../src/store/store';
import App from '../../App';
import { authService } from '../../src/services/authService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../src/services/authService', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    validateToken: jest.fn(),
  },
}));

jest.mock('@react-native-community/push-notification-ios', () => ({
  addEventListener: jest.fn(),
  requestPermissions: jest.fn(() => Promise.resolve()),
  getInitialNotification: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
}));

describe('Authentication Flow Integration Tests', () => {
  const mockAuthService = authService as jest.Mocked<typeof authService>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  const renderApp = () => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <App />
        </NavigationContainer>
      </Provider>
    );
  };

  describe('Login Flow', () => {
    it('should complete successful login flow', async () => {
      // Mock successful login
      mockAuthService.login.mockResolvedValue({
        success: true,
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            role: 'USER',
          },
        },
      });

      const { getByTestId, getByText } = renderApp();

      // Wait for login screen to appear
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      // Enter credentials
      const usernameInput = getByTestId('username-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(passwordInput, 'password123');

      // Submit login
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Verify login service was called
      expect(mockAuthService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });

      // Wait for navigation to dashboard
      await waitFor(() => {
        expect(getByTestId('dashboard-screen')).toBeTruthy();
      }, { timeout: 5000 });

      // Verify tokens were stored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'accessToken',
        'mock-access-token'
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token'
      );
    });

    it('should handle login failure', async () => {
      // Mock failed login
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const { getByTestId, getByText } = renderApp();

      // Wait for login screen
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      // Enter invalid credentials
      const usernameInput = getByTestId('username-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(usernameInput, 'wronguser');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      // Submit login
      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Wait for error message
      await waitFor(() => {
        expect(getByText('Invalid credentials')).toBeTruthy();
      });

      // Verify still on login screen
      expect(getByTestId('login-screen')).toBeTruthy();
    });
  });

  describe('PIN Authentication Flow', () => {
    it('should complete PIN setup and authentication', async () => {
      // Mock successful login
      mockAuthService.login.mockResolvedValue({
        success: true,
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            role: 'USER',
          },
        },
      });

      const { getByTestId } = renderApp();

      // Complete initial login
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      const usernameInput = getByTestId('username-input');
      const passwordInput = getByTestId('password-input');
      const loginButton = getByTestId('login-button');

      fireEvent.changeText(usernameInput, 'testuser');
      fireEvent.changeText(passwordInput, 'password123');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Navigate to PIN setup
      await waitFor(() => {
        expect(getByTestId('dashboard-screen')).toBeTruthy();
      });

      // Access settings to set up PIN
      const settingsButton = getByTestId('settings-button');
      fireEvent.press(settingsButton);

      await waitFor(() => {
        expect(getByTestId('settings-screen')).toBeTruthy();
      });

      // Set up PIN
      const pinSetupButton = getByTestId('pin-setup-button');
      fireEvent.press(pinSetupButton);

      await waitFor(() => {
        expect(getByTestId('pin-setup-screen')).toBeTruthy();
      });

      // Enter PIN
      const pinInputs = [
        getByTestId('pin-input-0'),
        getByTestId('pin-input-1'),
        getByTestId('pin-input-2'),
        getByTestId('pin-input-3'),
      ];

      pinInputs.forEach((input, index) => {
        fireEvent.changeText(input, (index + 1).toString());
      });

      const confirmPinButton = getByTestId('confirm-pin-button');
      await act(async () => {
        fireEvent.press(confirmPinButton);
      });

      // Verify PIN was saved
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'userPin',
        expect.any(String)
      );
    });
  });

  describe('Token Refresh Flow', () => {
    it('should automatically refresh expired tokens', async () => {
      // Mock stored tokens
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return Promise.resolve('expired-token');
        if (key === 'refreshToken') return Promise.resolve('valid-refresh-token');
        return Promise.resolve(null);
      });

      // Mock token validation failure and successful refresh
      mockAuthService.validateToken.mockResolvedValue(false);
      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      const { getByTestId } = renderApp();

      // Wait for automatic token refresh
      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      });

      // Verify new tokens were stored
      await waitFor(() => {
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'accessToken',
          'new-access-token'
        );
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'refreshToken',
          'new-refresh-token'
        );
      });

      // Should navigate to dashboard
      await waitFor(() => {
        expect(getByTestId('dashboard-screen')).toBeTruthy();
      });
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout and clear stored data', async () => {
      // Mock stored tokens
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return Promise.resolve('valid-token');
        if (key === 'refreshToken') return Promise.resolve('valid-refresh-token');
        return Promise.resolve(null);
      });

      mockAuthService.validateToken.mockResolvedValue(true);
      mockAuthService.logout.mockResolvedValue({ success: true });

      const { getByTestId } = renderApp();

      // Wait for dashboard
      await waitFor(() => {
        expect(getByTestId('dashboard-screen')).toBeTruthy();
      });

      // Access settings
      const settingsButton = getByTestId('settings-button');
      fireEvent.press(settingsButton);

      await waitFor(() => {
        expect(getByTestId('settings-screen')).toBeTruthy();
      });

      // Logout
      const logoutButton = getByTestId('logout-button');
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      // Verify logout service was called
      expect(mockAuthService.logout).toHaveBeenCalled();

      // Verify tokens were cleared
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('userPin');

      // Should navigate back to login
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });
    });
  });
});
