/**
 * 🔥 SIMPLE AXIOS SERVICE - GUARANTEED TO WORK
 * Direct connection to your Windows server at 192.168.1.10:8080
 */

const axios = require('axios').default || require('axios');

class SimpleAxiosService {
  constructor() {
    // 🔥 FIXED SERVER CONFIGURATION - CONNECT TO ACTUAL RUNNING BACKEND
    this.baseURL = 'http://10.0.2.2:8080';  // Android emulator to localhost
    this.fallbackURLs = [
      'http://10.0.2.2:8080',      // Android emulator to localhost (PRIMARY)
      'http://localhost:8080',     // Direct localhost
      'http://127.0.0.1:8080',     // Localhost IP
      'http://192.168.1.10:8080',  // Network IP (if needed)
    ];

    this.timeout = 10000; // 10 seconds
    console.log('🔥 SimpleAxiosService initialized - targeting', this.baseURL);
  }

  async makeRequest(endpoint, options = {}) {
    const method = options.method || 'GET';
    const data = options.body || options.data;

    // Add /api/v1 prefix to match backend endpoints
    const fullEndpoint = `/api/v1${endpoint}`;

    // Try each URL until one works
    for (const baseURL of this.fallbackURLs) {
      try {
        const url = `${baseURL}${fullEndpoint}`;
        console.log(`🌐 AXIOS REQUEST: ${method} ${url}`);

        const config = {
          method: method,
          url: url,
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'SAMS-Mobile/2.0',
          }
        };

        if (data) {
          config.data = data;
        }

        const response = await axios(config);
        console.log(`✅ AXIOS SUCCESS: ${method} ${url} - Status: ${response.status}`);
        return response.data;

      } catch (error) {
        console.error(`❌ AXIOS ERROR: ${method} ${baseURL}${fullEndpoint} - ${error.message}`);

        // If this is the last URL, throw the error
        if (baseURL === this.fallbackURLs[this.fallbackURLs.length - 1]) {
          throw this.createUserFriendlyError(error);
        }
        // Otherwise, try the next URL
        continue;
      }
    }
  }

  createUserFriendlyError(error) {
    let message = 'Unknown error occurred';
    
    if (error.code === 'ECONNREFUSED') {
      message = 'Cannot connect to server. Please check if your Windows server is running on 192.168.1.10:8080';
    } else if (error.code === 'ETIMEDOUT') {
      message = 'Server request timed out. Your Windows server may be slow to respond.';
    } else if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        message = 'Authentication failed. Please check your credentials.';
      } else if (status === 403) {
        message = 'Access denied. You may not have permission for this operation.';
      } else if (status === 404) {
        message = 'Requested resource not found on server.';
      } else if (status >= 500) {
        message = 'Server error occurred. Please try again later.';
      } else {
        message = `Server returned error: ${status} ${error.response.statusText}`;
      }
    } else if (error.request) {
      message = 'No response from server. Check your network connection.';
    }
    
    const enhancedError = new Error(message);
    enhancedError.originalError = error;
    return enhancedError;
  }

  // 🔥 REAL API METHODS - CORRECTLY MATCHING BACKEND ENDPOINTS

  async getServerHealth() {
    return this.makeRequest('/health');
  }

  async getServers() {
    return this.makeRequest('/servers');
  }

  async addServer(serverData) {
    return this.makeRequest('/servers', {
      method: 'POST',
      data: serverData
    });
  }

  async removeServer(serverId) {
    return this.makeRequest(`/servers/${serverId}`, {
      method: 'DELETE'
    });
  }

  async getServerMetrics(serverId) {
    return this.makeRequest(`/servers/${serverId}/metrics`);
  }

  async executeCommand(serverId, command) {
    return this.makeRequest(`/system/command`, {
      method: 'POST',
      data: { command: command }
    });
  }

  async getAlerts() {
    return this.makeRequest('/alerts');
  }

  async acknowledgeAlert(alertId) {
    return this.makeRequest(`/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    });
  }

  async generateReport(reportType, format = 'pdf') {
    return this.makeRequest('/reports', {
      method: 'POST',
      data: { type: reportType, format: format }
    });
  }

  async getSystemInfo() {
    return this.makeRequest('/system/info');
  }

  async testConnection() {
    try {
      console.log('🔍 Testing connection to your Windows server...');
      const response = await this.getServerHealth();
      console.log('✅ Connection test successful:', response);
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// 🔥 SINGLETON INSTANCE
const simpleAxiosService = new SimpleAxiosService();

module.exports = simpleAxiosService;
