import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../src/services/AuthService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth service state by logging out
    authService.logout();
  });

  describe('PIN Authentication', () => {
    test('should authenticate with correct PIN', async () => {
      const mockStoredPin = '1234';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockStoredPin);

      const result = await authService.validatePin('1234');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Authentication successful');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user_pin');
    });

    test('should fail authentication with incorrect PIN', async () => {
      const mockStoredPin = '1234';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockStoredPin);

      const result = await authService.validatePin('9999');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid PIN');
    });

    test('should lock account after 5 failed attempts', async () => {
      const mockStoredPin = '1234';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockStoredPin);

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.validatePin('9999');
      }

      const result = await authService.validatePin('1234');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Account is temporarily locked');
    });
  });

  describe('PIN Management', () => {
    test('should set new PIN successfully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.setPin('5678');
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_pin', '5678');
    });
  });

  describe('Authentication State', () => {
    test('should return false for unauthenticated user', () => {
      expect(authService.isUserAuthenticated()).toBe(false);
    });

    test('should set authentication state correctly', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1234');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await authService.validatePin('1234');
      expect(authService.isUserAuthenticated()).toBe(true);
      
      await authService.logout();
      expect(authService.isUserAuthenticated()).toBe(false);
    });

    test('should return null for current user when not authenticated', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    test('should return user data when authenticated', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1234');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await authService.validatePin('1234');
      const user = authService.getCurrentUser();
      
      expect(user).toBeTruthy();
      expect(user?.name).toBe('System Administrator');
      expect(user?.role).toBe('admin');
    });
  });

  describe('Session Management', () => {
    test('should load valid session', async () => {
      const sessionData = {
        isAuthenticated: true,
        user: { id: '1', name: 'Test User', role: 'admin' },
        loginTime: new Date().toISOString()
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(sessionData));
      
      const result = await authService.loadSession();
      expect(result).toBe(true);
      expect(authService.isUserAuthenticated()).toBe(true);
    });
  });
});
