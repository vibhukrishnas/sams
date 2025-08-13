import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfigurationManager } from '../../src/services/ConfigurationManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new ConfigurationManager();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'healthy' }),
    });
  });

  describe('Server Configuration', () => {
    test('should return default server configuration', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const config = await configManager.getServerConfig();
      
      expect(config).toBeDefined();
      expect(config.name).toBe('SAMS Backend');
      expect(config.port).toBe(8080);
      expect(config.protocol).toBe('http');
    });

    test('should update server configuration', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newConfig = {
        name: 'Updated Backend',
        port: 8081,
      };

      const result = await configManager.updateServerConfig(newConfig);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Connection Testing', () => {
    test('should test server connection successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const result = await configManager.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(typeof result.latency).toBe('number');
    });

    test('should handle connection failures', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });
      
      const result = await configManager.testConnection();
      
      expect(result.success).toBe(false);
    });
  });

  describe('App Configuration', () => {
    test('should return default app configuration', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const config = await configManager.getAppConfig();
      
      expect(config).toBeDefined();
      expect(config.theme).toBe('dark');
      expect(config.refreshInterval).toBe(3000);
      expect(config.notifications).toBe(true);
    });

    test('should update app configuration', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newConfig = {
        theme: 'light' as const,
        notifications: false,
      };

      const result = await configManager.updateAppConfig(newConfig);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Configuration Export/Import', () => {
    test('should export configuration', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const exportedConfig = await configManager.exportConfig();
      
      expect(typeof exportedConfig).toBe('string');
    });

    test('should import configuration', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const configToImport = JSON.stringify({
        server: {
          name: 'Test Server',
          port: 8080,
        },
        app: {
          theme: 'light',
          notifications: false,
        }
      });

      const result = await configManager.importConfig(configToImport);
      
      expect(result).toBe(true);
    });

    test('should validate server configuration', () => {
      const validConfig = {
        url: 'localhost',
        port: 8080,
        timeout: 5000,
        retryAttempts: 3
      };

      const result = configManager.validateServerConfig(validConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid server configuration', () => {
      const invalidConfig = {
        url: 'invalid..url',
        port: 70000,
        timeout: 500,
        retryAttempts: 15
      };

      const result = configManager.validateServerConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
