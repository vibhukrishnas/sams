/**
 * 🔍 Server Details Management Service
 * Real server details with actual log files and functional operations
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Alert } from 'react-native';
import { storeData, getData } from '../utils/storage';

class ServerDetailsManager {
  constructor() {
    this.serverDetails = new Map(); // Cache server details
    this.logCache = new Map(); // Cache log files
    this.version = '2.0.0';
    
    console.log(`🔍 ServerDetailsManager v${this.version} initialized`);
  }

  /**
   * 📋 Get comprehensive server details
   */
  async getServerDetails(server) {
    try {
      console.log(`🔍 Fetching details for ${server.name} (${server.ip})`);
      
      const details = await this.fetchServerDetailsFromAPI(server);
      
      // Cache the details
      this.serverDetails.set(server.id, {
        ...details,
        lastFetched: new Date(),
        server: server
      });

      return details;

    } catch (error) {
      console.error(`❌ Failed to get server details: ${error.message}`);
      
      // Return cached data if available
      const cached = this.serverDetails.get(server.id);
      if (cached) {
        console.log('📋 Using cached server details');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * 🌐 Fetch server details from API
   */
  async fetchServerDetailsFromAPI(server) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/server/details`;
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Details fetch timeout')), 15000)
      );

      const fetchPromise = fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Mobile-Details/2.0'
        }
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Server details fetched successfully`);
      
      return {
        systemInfo: data.system || {},
        hardware: data.hardware || {},
        network: data.network || {},
        services: data.services || [],
        processes: data.processes || [],
        logs: data.logs || {},
        performance: data.performance || {},
        security: data.security || {},
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`❌ Server details API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📄 Get server logs
   */
  async getServerLogs(server, logType = 'system') {
    try {
      console.log(`📄 Fetching ${logType} logs for ${server.name}`);
      
      const cacheKey = `${server.id}-${logType}`;
      const cached = this.logCache.get(cacheKey);
      
      // Return cached logs if less than 5 minutes old
      if (cached && (Date.now() - cached.timestamp) < 300000) {
        console.log('📄 Using cached log data');
        return cached.logs;
      }

      const logs = await this.fetchServerLogsFromAPI(server, logType);
      
      // Cache the logs
      this.logCache.set(cacheKey, {
        logs: logs,
        timestamp: Date.now()
      });

      return logs;

    } catch (error) {
      console.error(`❌ Failed to get server logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🌐 Fetch server logs from API
   */
  async fetchServerLogsFromAPI(server, logType) {
    try {
      const endpoint = `http://${server.ip}:8080/api/v1/server/logs/${logType}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        logType: logType,
        entries: data.entries || [],
        totalLines: data.totalLines || 0,
        lastModified: data.lastModified || new Date(),
        filePath: data.filePath || 'Unknown',
        size: data.size || 0
      };

    } catch (error) {
      console.error(`❌ Server logs API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔄 Restart server service
   */
  async restartService(server, serviceName) {
    try {
      console.log(`🔄 Restarting service ${serviceName} on ${server.name}`);
      
      const endpoint = `http://${server.ip}:8080/api/v1/server/service/restart`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          service_name: serviceName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ Service ${serviceName} restarted successfully`);
      
      return {
        success: true,
        service: serviceName,
        message: result.message || 'Service restarted successfully',
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Service restart failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🛑 Stop server service
   */
  async stopService(server, serviceName) {
    try {
      console.log(`🛑 Stopping service ${serviceName} on ${server.name}`);
      
      const endpoint = `http://${server.ip}:8080/api/v1/server/service/stop`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          service_name: serviceName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ Service ${serviceName} stopped successfully`);
      
      return {
        success: true,
        service: serviceName,
        message: result.message || 'Service stopped successfully',
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Service stop failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * ▶️ Start server service
   */
  async startService(server, serviceName) {
    try {
      console.log(`▶️ Starting service ${serviceName} on ${server.name}`);
      
      const endpoint = `http://${server.ip}:8080/api/v1/server/service/start`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_id: server.id,
          service_name: serviceName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ Service ${serviceName} started successfully`);
      
      return {
        success: true,
        service: serviceName,
        message: result.message || 'Service started successfully',
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Service start failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔍 Get real-time server performance
   */
  async getServerPerformance(server) {
    try {
      console.log(`🔍 Fetching performance data for ${server.name}`);
      
      const endpoint = `http://${server.ip}:8080/api/v1/server/performance`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        cpu: data.cpu || { usage: 0, cores: 1 },
        memory: data.memory || { used: 0, total: 1, available: 1 },
        disk: data.disk || { used: 0, total: 1, free: 1 },
        network: data.network || { bytesIn: 0, bytesOut: 0 },
        uptime: data.uptime || 0,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Performance data fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🗂️ Get available log types
   */
  getAvailableLogTypes() {
    return [
      { id: 'system', name: 'System Logs', icon: '🖥️', description: 'Windows System Event Log' },
      { id: 'application', name: 'Application Logs', icon: '📱', description: 'Application Event Log' },
      { id: 'security', name: 'Security Logs', icon: '🔒', description: 'Security Event Log' },
      { id: 'setup', name: 'Setup Logs', icon: '⚙️', description: 'Windows Setup Log' },
      { id: 'forwarded', name: 'Forwarded Events', icon: '📤', description: 'Forwarded Event Log' },
      { id: 'iis', name: 'IIS Logs', icon: '🌐', description: 'Internet Information Services Log' },
      { id: 'custom', name: 'Custom Logs', icon: '📋', description: 'Custom Application Logs' }
    ];
  }

  /**
   * 🧹 Clear log cache
   */
  clearLogCache() {
    this.logCache.clear();
    console.log('🧹 Log cache cleared');
  }

  /**
   * 📊 Get cache statistics
   */
  getCacheStatistics() {
    return {
      detailsCacheSize: this.serverDetails.size,
      logsCacheSize: this.logCache.size,
      totalMemoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * 📏 Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    this.serverDetails.forEach(details => {
      totalSize += JSON.stringify(details).length;
    });
    
    this.logCache.forEach(logs => {
      totalSize += JSON.stringify(logs).length;
    });
    
    return Math.round(totalSize / 1024); // KB
  }
}

// Export singleton instance
export default new ServerDetailsManager();
