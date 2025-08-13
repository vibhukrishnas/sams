import { configManager } from '../../src/services/ConfigurationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ConfigurationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Server Configuration', () => {
    it('should get server configuration with defaults', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const config = await configManager.getServerConfig();
      
      expect(config.url).toBe('localhost');
      expect(config.port).toBe(8080);
      expect(config.protocol).toBe('http');
    });

    it('should save and retrieve custom server configuration', async () => {
      const customConfig = {
        id: 'custom',
        name: 'Custom Server',
        url: 'example.com',
        port: 9000,
        protocol: 'https' as const,
        timeout: 15000,
        retryAttempts: 5,
        enabled: true
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(customConfig));

      await configManager.updateServerConfig(customConfig);
      const retrievedConfig = await configManager.getServerConfig();
      
      expect(retrievedConfig.url).toBe('example.com');
      expect(retrievedConfig.port).toBe(9000);
    });

    it('should validate server configuration', async () => {
      const validConfig = {
        url: 'localhost',
        port: 8080,
        timeout: 5000,
        retryAttempts: 3
      };

      const invalidConfig = {
        url: 'invalid-url-!@#',
        port: 99999,
        timeout: 500,
        retryAttempts: 20
      };

      expect(configManager.validateServerConfig(validConfig).valid).toBe(true);
      expect(configManager.validateServerConfig(invalidConfig).valid).toBe(false);
    });
  });

  describe('Connection Testing', () => {
    it('should test server connection successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const config = {
        url: 'localhost',
        port: 8080,
        protocol: 'http' as const,
        timeout: 10000
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(config));

      const result = await configManager.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
    });

    it('should handle connection failure', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const config = {
        url: 'badhost',
        port: 8080,
        protocol: 'http' as const,
        timeout: 10000
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(config));

      const result = await configManager.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('App Settings', () => {
    it('should get app settings with defaults', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const settings = await configManager.getAppConfig();
      
      expect(settings.theme).toBe('dark');
      expect(settings.refreshInterval).toBe(3000);
      expect(settings.notifications).toBe(true);
    });

    it('should save and retrieve custom app settings', async () => {
      const customSettings = {
        theme: 'light' as const,
        refreshInterval: 5000,
        notifications: false,
        biometric: true,
        autoLock: false,
        lockTimeout: 600000,
        language: 'es',
        debug: true
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(customSettings));

      await configManager.updateAppConfig(customSettings);
      const retrievedSettings = await configManager.getAppConfig();
      
      expect(retrievedSettings.theme).toBe('light');
      expect(retrievedSettings.refreshInterval).toBe(5000);
    });
  });

  describe('Backup and Restore', () => {
    it('should export configuration', async () => {
      const mockServerConfig = { url: 'localhost', port: 8080 };
      const mockAppConfig = { theme: 'dark', refreshInterval: 3000 };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockServerConfig))
        .mockResolvedValueOnce(JSON.stringify(mockAppConfig));

      const exportData = await configManager.exportConfig();
      
      expect(exportData).toContain('localhost');
      expect(exportData).toContain('8080');
      expect(exportData).toContain('dark');
    });

    it('should import configuration', async () => {
      const importData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        server: { url: 'imported.com', port: 9000 },
        app: { theme: 'light', refreshInterval: 1000 }
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await configManager.importConfig(JSON.stringify(importData));
      
      expect(result).toBe(true);
    });
  });
});
