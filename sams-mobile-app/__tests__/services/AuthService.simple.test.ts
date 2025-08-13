import { authService } from '../../src/services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Logout to reset state
    authService.logout();
  });

  describe('PIN Authentication', () => {
    it('should authenticate with correct PIN', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1234');

      const result = await authService.validatePin('1234');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Authentication successful');
      expect(authService.isUserAuthenticated()).toBe(true);
    });

    it('should fail authentication with incorrect PIN', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1234');

      const result = await authService.validatePin('5678');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid PIN');
      expect(authService.isUserAuthenticated()).toBe(false);
    });

    it('should set PIN for first-time setup', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.setPin('9999');
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_pin', '9999');
    });
  });

  describe('Session Management', () => {
    it('should manage session state correctly', async () => {
      expect(authService.isUserAuthenticated()).toBe(false);
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1234');
      await authService.validatePin('1234');
      
      expect(authService.isUserAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()).toBeTruthy();
    });

    it('should handle session timeout', async () => {
      const oldSession = {
        isAuthenticated: true,
        user: { id: '1', name: 'Test User' },
        loginTime: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(oldSession));
      
      const result = await authService.loadSession();
      expect(result).toBe(false);
    });
  });

  describe('Security Features', () => {
    it('should clear sensitive data on logout', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1234');
      await authService.validatePin('1234');
      
      expect(authService.isUserAuthenticated()).toBe(true);
      
      await authService.logout();
      
      expect(authService.isUserAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user_session');
    });
  });
});
