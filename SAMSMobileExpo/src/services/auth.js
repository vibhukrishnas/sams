import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import StorageService, { STORAGE_KEYS } from './storage';
import WebSocketService from './websocket';

class AuthService {
  constructor() {
    this.isAuthenticated = false;
  }

  async login(credentials) {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
      const { token, user } = response.data;

      await StorageService.setSecureItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await StorageService.setItem(STORAGE_KEYS.USER_DATA, user);

      WebSocketService.connect(token);
      this.isAuthenticated = true;

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      WebSocketService.disconnect();
      await StorageService.clearStorage();
      this.isAuthenticated = false;
    }
  }

  async refreshToken() {
    try {
      const token = await StorageService.getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) throw new Error('No refresh token available');

      const response = await apiClient.post(ENDPOINTS.AUTH.REFRESH);
      const { newToken } = response.data;

      await StorageService.setSecureItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      throw error;
    }
  }

  async checkAuthStatus() {
    try {
      const token = await StorageService.getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
      const user = await StorageService.getItem(STORAGE_KEYS.USER_DATA);

      if (token && user) {
        WebSocketService.connect(token);
        this.isAuthenticated = true;
        return user;
      }

      return null;
    } catch (error) {
      console.error('Auth status check error:', error);
      return null;
    }
  }
}

export default new AuthService();
