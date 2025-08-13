import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  port: number;
  protocol: 'http' | 'https';
  timeout: number;
  retryAttempts: number;
  enabled: boolean;
}

export interface AppConfig {
  theme: 'dark' | 'light' | 'auto';
  refreshInterval: number;
  notifications: boolean;
  biometric: boolean;
  autoLock: boolean;
  lockTimeout: number;
  language: string;
  debug: boolean;
}

export class ConfigurationManager {
  private defaultServerConfig: ServerConfig = {
    id: 'default',
    name: 'SAMS Backend',
    url: 'localhost',
    port: 8080,
    protocol: 'http',
    timeout: 10000,
    retryAttempts: 3,
    enabled: true
  };

  private defaultAppConfig: AppConfig = {
    theme: 'dark',
    refreshInterval: 3000,
    notifications: true,
    biometric: false,
    autoLock: true,
    lockTimeout: 300000, // 5 minutes
    language: 'en',
    debug: false
  };

  /**
   * Get server configuration
   */
  async getServerConfig(): Promise<ServerConfig> {
    try {
      const config = await AsyncStorage.getItem('server_config');
      if (config) {
        return { ...this.defaultServerConfig, ...JSON.parse(config) };
      }
      return this.defaultServerConfig;
    } catch (error) {
      console.error('Error loading server config:', error);
      return this.defaultServerConfig;
    }
  }

  /**
   * Update server configuration
   */
  async updateServerConfig(config: Partial<ServerConfig>): Promise<boolean> {
    try {
      const currentConfig = await this.getServerConfig();
      const newConfig = { ...currentConfig, ...config };
      await AsyncStorage.setItem('server_config', JSON.stringify(newConfig));
      return true;
    } catch (error) {
      console.error('Error updating server config:', error);
      return false;
    }
  }

  /**
   * Get app configuration
   */
  async getAppConfig(): Promise<AppConfig> {
    try {
      const config = await AsyncStorage.getItem('app_config');
      if (config) {
        return { ...this.defaultAppConfig, ...JSON.parse(config) };
      }
      return this.defaultAppConfig;
    } catch (error) {
      console.error('Error loading app config:', error);
      return this.defaultAppConfig;
    }
  }

  /**
   * Update app configuration
   */
  async updateAppConfig(config: Partial<AppConfig>): Promise<boolean> {
    try {
      const currentConfig = await this.getAppConfig();
      const newConfig = { ...currentConfig, ...config };
      await AsyncStorage.setItem('app_config', JSON.stringify(newConfig));
      return true;
    } catch (error) {
      console.error('Error updating app config:', error);
      return false;
    }
  }

  /**
   * Get full server URL
   */
  async getServerUrl(): Promise<string> {
    const config = await this.getServerConfig();
    return `${config.protocol}://${config.url}:${config.port}`;
  }

  /**
   * Test server connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    try {
      const serverUrl = await this.getServerUrl();
      const config = await this.getServerConfig();
      
      const startTime = Date.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      const response = await fetch(`${serverUrl}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful',
          latency
        };
      } else {
        return {
          success: false,
          message: `Server responded with status ${response.status}`
        };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timeout'
        };
      }
      return {
        success: false,
        message: error.message || 'Connection failed'
      };
    }
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem('server_config');
      await AsyncStorage.removeItem('app_config');
      return true;
    } catch (error) {
      console.error('Error resetting config:', error);
      return false;
    }
  }

  /**
   * Export configuration
   */
  async exportConfig(): Promise<string> {
    try {
      const serverConfig = await this.getServerConfig();
      const appConfig = await this.getAppConfig();
      
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        server: serverConfig,
        app: appConfig
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting config:', error);
      return '';
    }
  }

  /**
   * Import configuration
   */
  async importConfig(configString: string): Promise<boolean> {
    try {
      const config = JSON.parse(configString);
      
      if (config.server) {
        await this.updateServerConfig(config.server);
      }
      
      if (config.app) {
        await this.updateAppConfig(config.app);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }

  /**
   * Validate server configuration
   */
  validateServerConfig(config: Partial<ServerConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (config.url && !/^[a-zA-Z0-9.-]+$/.test(config.url)) {
      errors.push('Invalid server URL format');
    }
    
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }
    
    if (config.timeout && config.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }
    
    if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      errors.push('Retry attempts must be between 0 and 10');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const configManager = new ConfigurationManager();
