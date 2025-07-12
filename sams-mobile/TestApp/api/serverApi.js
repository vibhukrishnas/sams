/**
 * 🌐 SAMS Server API Service - REAL BACKEND CONNECTION
 * Connects to actual SAMS backend server for real functionality
 *
 * @author SAMS Development Team
 * @version 2.0.0
 */

class ServerAPI {
  constructor() {
    // 🔥 FIXED: Use your Windows server IP and port
    this.baseURL = 'http://192.168.1.10:8080/api/v1'; // YOUR WINDOWS SERVER
    this.fallbackURLs = [
      'http://192.168.1.10:8080/api/v1',
      'http://localhost:3001/api/v1',
      'http://10.0.2.2:3001/api/v1', // Android emulator
      'http://127.0.0.1:3001/api/v1'
    ];
    this.version = '2.0.0';
    this.isEnterpriseMode = true;
    this.retryCount = 0;
    this.maxRetries = 3;

    console.log(`🚀 ServerAPI v${this.version} initialized - connecting to YOUR server at ${this.baseURL}`);
  }

  /**
   * 🔥 BULLETPROOF HTTP REQUEST WITH FALLBACK AND RETRY
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(endpoint, options = {}) {
    const urls = [this.baseURL + endpoint, ...this.fallbackURLs.map(url => url + endpoint)];

    for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
      const url = urls[urlIndex];

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`🌐 API Request (Attempt ${attempt}/${this.maxRetries}): ${options.method || 'GET'} ${url}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const config = {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'SAMS-Mobile/2.0',
              ...options.headers
            },
            signal: controller.signal,
            ...options
          };

          if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
          }

          const response = await fetch(url, config);
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`✅ API Success: ${url}`);

          // Update working URL
          this.baseURL = url.replace(endpoint, '');
          this.retryCount = 0;
          return data;

        } catch (error) {
          console.error(`❌ API Error (URL ${urlIndex + 1}/${urls.length}, Attempt ${attempt}/${this.maxRetries}): ${error.message}`);

          if (attempt < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }
    }

    // 🔥 ALL ATTEMPTS FAILED - GRACEFUL FALLBACK
    console.error('🚨 ALL API ENDPOINTS FAILED - Using fallback data');
    throw new Error(`ECONNREFUSED: Cannot connect to server at ${this.baseURL}. Server may be down.`);
  }
      console.error(`❌ API Error: ${config.method} ${url} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 🚀 Add new server - REAL API CALL
   * @param {Object} serverConfig - Server configuration
   * @returns {Promise<Object>} Addition result
   */
  async addServer(serverConfig) {
    const { ip, name, type, description } = serverConfig;

    console.log(`🚀 Adding server ${name} (${ip}) to REAL backend...`);

    try {
      const response = await this.makeRequest('/servers', {
        method: 'POST',
        body: {
          name,
          ip,
          type: type || 'windows',
          description: description || ''
        }
      });

      console.log(`✅ Server ${name} (${ip}) added successfully via REAL API`);

      return {
        success: true,
        server: response.data,
        message: response.message
      };

    } catch (error) {
      console.log(`❌ Failed to add server ${name} (${ip}): ${error.message}`);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🗑️ Remove server - REAL API CALL
   * @param {string} serverId - Server ID
   * @returns {Promise<Object>} Removal result
   */
  async removeServer(serverId) {
    console.log(`🗑️ Removing server ${serverId} from REAL backend...`);

    try {
      const response = await this.makeRequest(`/servers/${serverId}`, {
        method: 'DELETE'
      });

      console.log(`✅ Server ${serverId} removed successfully via REAL API`);

      return {
        success: true,
        removedServer: response.data,
        message: response.message
      };
    } catch (error) {
      console.log(`❌ Failed to remove server ${serverId}: ${error.message}`);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📋 Get all servers - REAL API CALL
   * @returns {Promise<Array>} List of servers
   */
  async getAllServers() {
    try {
      const response = await this.makeRequest('/servers');
      console.log(`📋 Retrieved ${response.data.length} servers from REAL backend`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get servers: ${error.message}`);
      return [];
    }
  }

  /**
   * 🚨 Get alerts - REAL API CALL
   * @returns {Promise<Array>} List of alerts
   */
  async getAlerts() {
    try {
      const response = await this.makeRequest('/alerts');
      console.log(`🚨 Retrieved ${response.data.length} alerts from REAL backend`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get alerts: ${error.message}`);
      return [];
    }
  }

  /**
   * ✅ Acknowledge alert - REAL API CALL
   * @param {string} alertId - Alert ID
   * @returns {Promise<Object>} Acknowledgment result
   */
  async acknowledgeAlert(alertId) {
    try {
      const response = await this.makeRequest(`/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      console.log(`✅ Alert ${alertId} acknowledged via REAL API`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to acknowledge alert ${alertId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔧 Get services - REAL API CALL
   * @returns {Promise<Array>} List of services
   */
  async getServices() {
    try {
      const response = await this.makeRequest('/services');
      console.log(`🔧 Retrieved ${response.data.length} services from REAL backend`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get services: ${error.message}`);
      return [];
    }
  }

  /**
   * ⚙️ Get processes - REAL API CALL
   * @returns {Promise<Array>} List of processes
   */
  async getProcesses() {
    try {
      const response = await this.makeRequest('/processes');
      console.log(`⚙️ Retrieved ${response.data.length} processes from REAL backend`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get processes: ${error.message}`);
      return [];
    }
  }

  /**
   * ⚡ Execute system command - REAL API CALL
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Command result
   */
  async executeCommand(command) {
    try {
      const response = await this.makeRequest('/system/command', {
        method: 'POST',
        body: { command }
      });
      console.log(`⚡ Command executed successfully: ${command}`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to execute command ${command}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🏥 Get system health - REAL API CALL
   * @returns {Promise<Object>} System health data
   */
  async getSystemHealth() {
    try {
      const response = await this.makeRequest('/health');
      console.log(`🏥 Retrieved system health from REAL backend`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to get system health: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 Get reports - REAL API CALL
   * @returns {Promise<Array>} List of reports
   */
  async getReports() {
    try {
      const response = await this.makeRequest('/reports');
      console.log(`📊 Retrieved ${response.data.length} reports from REAL backend`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get reports: ${error.message}`);
      return [];
    }
  }

  /**
   * 📈 Generate report - REAL API CALL
   * @param {Object} reportConfig - Report configuration
   * @returns {Promise<Object>} Generated report
   */
  async generateReport(reportConfig) {
    try {
      const response = await this.makeRequest('/reports/generate', {
        method: 'POST',
        body: reportConfig
      });
      console.log(`📈 Report generated successfully: ${reportConfig.type}`);
      return response;
    } catch (error) {
      console.error(`❌ Failed to generate report: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 Get server statistics - REAL API CALL
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      const servers = await this.getAllServers();
      const online = servers.filter(s => s.status === 'online').length;
      const offline = servers.filter(s => s.status === 'offline').length;
      const error = servers.filter(s => s.status === 'error').length;

      return {
        total: servers.length,
        online,
        offline,
        error
      };
    } catch (error) {
      console.error(`❌ Failed to get statistics: ${error.message}`);
      return {
        total: 0,
        online: 0,
        offline: 0,
        error: 0
      };
    }
  }

  /**
   * 🧹 Cleanup resources
   */
  cleanup() {
    console.log('🧹 Cleaning up ServerAPI resources...');
    // No cleanup needed for HTTP-based API
  }
}

// Export singleton instance
export default new ServerAPI();
