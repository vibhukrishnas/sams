/**
 * ⚙️ Configuration Management Service
 * Real server configuration with actual changes and file-based settings
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Alert } from 'react-native';
import { storeData, getData } from '../utils/storage';

class ConfigurationManager {
  constructor() {
    this.configurations = new Map(); // Track configurations per server
    this.configHistory = []; // Track configuration changes
    this.notificationCallbacks = new Set(); // Notification listeners
    this.version = '2.0.0';
    
    console.log(`⚙️ ConfigurationManager v${this.version} initialized`);
  }

  /**
   * 🔧 Apply performance tuning configuration
   */
  async applyPerformanceTuning(server, tuningType) {
    try {
      console.log(`🔧 Applying ${tuningType} performance tuning to ${server.name}`);
      
      const operation = {
        id: `perf-${Date.now()}`,
        server: server,
        type: 'performance',
        subType: tuningType,
        startTime: new Date(),
        status: 'in-progress'
      };

      // Show progress notification
      this.notifyConfigChange({
        type: 'progress',
        message: `🔄 Applying ${tuningType} performance tuning...`,
        server: server.name
      });

      // Make actual API call
      const response = await this.makeConfigurationAPICall(server, 'performance', { type: tuningType });
      
      if (response.success) {
        // Update configuration state
        this.updateConfigurationState(server, 'performance', {
          type: tuningType,
          changes: response.changes || [],
          appliedAt: new Date()
        });

        // Store in history
        this.configHistory.push({
          ...operation,
          status: 'completed',
          endTime: new Date(),
          changes: response.changes
        });

        // Save to storage
        await this.saveConfigurationState();

        // Show success notification
        this.notifyConfigChange({
          type: 'success',
          message: `✅ ${tuningType} performance tuning applied to ${server.name}`,
          changes: response.changes,
          server: server.name
        });

        return {
          success: true,
          changes: response.changes,
          type: tuningType
        };
      } else {
        throw new Error(response.error || 'Performance tuning failed');
      }

    } catch (error) {
      console.error(`❌ Performance tuning failed: ${error.message}`);
      
      this.notifyConfigChange({
        type: 'error',
        message: `❌ Performance tuning failed: ${error.message}`,
        server: server.name
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🌐 Apply network configuration
   */
  async applyNetworkConfiguration(server, networkType) {
    try {
      console.log(`🌐 Applying ${networkType} network configuration to ${server.name}`);
      
      const response = await this.makeConfigurationAPICall(server, 'network', { type: networkType });
      
      if (response.success) {
        this.updateConfigurationState(server, 'network', {
          type: networkType,
          changes: response.changes || [],
          appliedAt: new Date()
        });

        await this.saveConfigurationState();

        this.notifyConfigChange({
          type: 'success',
          message: `✅ ${networkType} network configuration applied to ${server.name}`,
          changes: response.changes,
          server: server.name
        });

        return {
          success: true,
          changes: response.changes,
          type: networkType
        };
      } else {
        throw new Error(response.error || 'Network configuration failed');
      }

    } catch (error) {
      console.error(`❌ Network configuration failed: ${error.message}`);
      
      this.notifyConfigChange({
        type: 'error',
        message: `❌ Network configuration failed: ${error.message}`,
        server: server.name
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 💾 Apply backup and maintenance configuration
   */
  async applyBackupMaintenance(server, backupType) {
    try {
      console.log(`💾 Applying ${backupType} backup/maintenance to ${server.name}`);
      
      const response = await this.makeConfigurationAPICall(server, 'backup', { type: backupType });
      
      if (response.success) {
        this.updateConfigurationState(server, 'backup', {
          type: backupType,
          changes: response.changes || [],
          appliedAt: new Date()
        });

        await this.saveConfigurationState();

        this.notifyConfigChange({
          type: 'success',
          message: `✅ ${backupType} backup/maintenance configured on ${server.name}`,
          changes: response.changes,
          server: server.name
        });

        return {
          success: true,
          changes: response.changes,
          type: backupType
        };
      } else {
        throw new Error(response.error || 'Backup configuration failed');
      }

    } catch (error) {
      console.error(`❌ Backup configuration failed: ${error.message}`);
      
      this.notifyConfigChange({
        type: 'error',
        message: `❌ Backup configuration failed: ${error.message}`,
        server: server.name
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🌐 Make configuration API call
   */
  async makeConfigurationAPICall(server, configType, options) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/server/configure/${configType}`;
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Configuration timeout')), 30000)
      );

      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Mobile-Config/2.0'
        },
        body: JSON.stringify({
          server_id: server.id,
          config_type: configType,
          ...options,
          timestamp: new Date().toISOString()
        })
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Configuration API response:`, data);
      
      return data;

    } catch (error) {
      console.error(`❌ Configuration API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Update configuration state
   */
  updateConfigurationState(server, configType, configData) {
    const serverConfig = this.configurations.get(server.id) || {};
    serverConfig[configType] = configData;
    this.configurations.set(server.id, serverConfig);
  }

  /**
   * 📋 Get configuration status for server
   */
  getConfigurationStatus(serverId) {
    const config = this.configurations.get(serverId);
    
    if (!config) {
      return {
        performance: { status: 'not-configured' },
        network: { status: 'not-configured' },
        security: { status: 'not-configured' },
        backup: { status: 'not-configured' }
      };
    }

    return {
      performance: config.performance || { status: 'not-configured' },
      network: config.network || { status: 'not-configured' },
      security: config.security || { status: 'not-configured' },
      backup: config.backup || { status: 'not-configured' }
    };
  }

  /**
   * 📂 Create configuration file
   */
  async createConfigurationFile(server, configType, settings) {
    try {
      console.log(`📂 Creating ${configType} configuration file for ${server.name}`);
      
      const endpoint = `http://${server.ip}:3001/api/v1/server/config/file/create`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          config_type: configType,
          settings: settings,
          filename: `${configType}_config_${Date.now()}.json`,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ Configuration file created: ${result.filename}`);
      
      return {
        success: true,
        filename: result.filename,
        path: result.path,
        size: result.size
      };

    } catch (error) {
      console.error(`❌ Configuration file creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📖 Read configuration file
   */
  async readConfigurationFile(server, filename) {
    try {
      console.log(`📖 Reading configuration file ${filename} from ${server.name}`);
      
      const endpoint = `http://${server.ip}:3001/api/v1/server/config/file/read`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          filename: filename
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        content: result.content,
        lastModified: result.lastModified,
        size: result.size
      };

    } catch (error) {
      console.error(`❌ Configuration file read failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📢 Add notification listener
   */
  addNotificationListener(callback) {
    this.notificationCallbacks.add(callback);
    
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * 📢 Notify about configuration changes
   */
  notifyConfigChange(notification) {
    console.log(`📢 Configuration notification:`, notification);
    
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  /**
   * 💾 Save configuration state
   */
  async saveConfigurationState() {
    try {
      const stateData = {
        configurations: Object.fromEntries(this.configurations),
        history: this.configHistory.slice(-100), // Keep last 100 entries
        lastSaved: new Date().toISOString()
      };

      await storeData('configuration_state', stateData);
      console.log('✅ Configuration state saved to storage');
    } catch (error) {
      console.error('❌ Failed to save configuration state:', error);
    }
  }

  /**
   * 📖 Load configuration state
   */
  async loadConfigurationState() {
    try {
      const stateData = await getData('configuration_state');
      
      if (stateData) {
        this.configurations = new Map(Object.entries(stateData.configurations || {}));
        this.configHistory = stateData.history || [];
        
        console.log(`✅ Configuration state loaded: ${this.configurations.size} servers`);
      }
    } catch (error) {
      console.error('❌ Failed to load configuration state:', error);
    }
  }

  /**
   * 📊 Get configuration statistics
   */
  getConfigurationStatistics() {
    const stats = {
      totalServers: this.configurations.size,
      configuredServers: 0,
      recentChanges: 0,
      configTypes: {
        performance: 0,
        network: 0,
        security: 0,
        backup: 0
      }
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    this.configurations.forEach(config => {
      let hasAnyConfig = false;
      
      Object.keys(stats.configTypes).forEach(type => {
        if (config[type] && config[type].appliedAt) {
          stats.configTypes[type]++;
          hasAnyConfig = true;
        }
      });
      
      if (hasAnyConfig) {
        stats.configuredServers++;
      }
    });

    stats.recentChanges = this.configHistory.filter(
      entry => new Date(entry.startTime) > oneDayAgo
    ).length;

    return stats;
  }
}

// Export singleton instance
export default new ConfigurationManager();
