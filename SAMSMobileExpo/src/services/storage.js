import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  SETTINGS: 'appSettings'
};

class StorageService {
  async setSecureItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    } catch (error) {
      console.error('SecureStore save error:', error);
      throw error;
    }
  }

  async getSecureItem(key) {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('SecureStore read error:', error);
      throw error;
    }
  }

  async removeSecureItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore delete error:', error);
      throw error;
    }
  }

  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('AsyncStorage save error:', error);
      throw error;
    }
  }

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('AsyncStorage read error:', error);
      throw error;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage delete error:', error);
      throw error;
    }
  }

  async clearStorage() {
    try {
      await AsyncStorage.clear();
      // Clear secure storage keys individually
      Object.values(STORAGE_KEYS).forEach(async (key) => {
        await this.removeSecureItem(key);
      });
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }
}

export default new StorageService();
export { STORAGE_KEYS };
