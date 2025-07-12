/**
 * 🔥 REAL AXIOS SERVICE - CONNECTS TO YOUR WINDOWS SERVER
 * No more fake data - this connects to http://192.168.1.10:8080
 */

const axios = require('axios');
const { Alert, ToastAndroid, Platform } = require('react-native');

class AxiosService {
  constructor() {
    // 🔥 YOUR WINDOWS SERVER CONFIGURATION
    this.baseURL = 'http://192.168.1.10:8080';
    this.fallbackURLs = [
      'http://192.168.1.10:8080',
      'http://localhost:3001', // Local development fallback
      'http://10.0.2.2:3001',  // Android emulator fallback
    ];
    
    this.currentURLIndex = 0;
    this.maxRetries = 3;
    this.timeout = 10000; // 10 seconds
    
    this.setupAxiosInstance();
    this.setupInterceptors();
    
    console.log('🔥 AxiosService initialized - targeting YOUR Windows server at', this.baseURL);
  }

  setupAxiosInstance() {
    this.axiosInstance = axios.create({
      baseURL: this.getCurrentURL(),
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SAMS-Mobile/2.0',
        'X-Client-Type': 'mobile',
        'X-Client-Platform': Platform.OS,
      }
    });
  }

  getCurrentURL() {
    return this.fallbackURLs[this.currentURLIndex] || this.baseURL;
  }

  setupInterceptors() {
    // 🔥 REQUEST INTERCEPTOR - ADD AUTH AND LOGGING
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        console.log(`🌐 REAL API REQUEST: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        
        // Add authentication token if available (simplified for now)
        // Note: AsyncStorage would be used in production
        // const token = await AsyncStorage.getItem('auth_token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        
        // Add request timestamp
        config.headers['X-Request-Time'] = new Date().toISOString();
        
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // 🔥 RESPONSE INTERCEPTOR - HANDLE ERRORS AND FALLBACKS
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ API SUCCESS: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      async (error) => {
        console.error(`❌ API ERROR: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.message}`);
        
        // 🔥 AUTOMATIC FALLBACK TO NEXT URL
        if (this.shouldTryFallback(error)) {
          return this.tryFallbackURL(error.config);
        }
        
        // 🔥 HANDLE SPECIFIC ERROR TYPES
        return this.handleError(error);
      }
    );
  }

  shouldTryFallback(error) {
    const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    return networkErrors.some(errorType => error.code === errorType || error.message.includes(errorType));
  }

  async tryFallbackURL(originalConfig) {
    if (this.currentURLIndex < this.fallbackURLs.length - 1) {
      this.currentURLIndex++;
      const newURL = this.getCurrentURL();
      
      console.log(`🔄 Trying fallback URL: ${newURL}`);
      
      // Update axios instance with new base URL
      this.axiosInstance.defaults.baseURL = newURL;
      
      // Retry the original request
      return this.axiosInstance.request(originalConfig);
    }
    
    // All URLs failed
    throw new Error(`All server endpoints failed. Cannot connect to your Windows server.`);
  }

  handleError(error) {
    let userMessage = 'Unknown error occurred';
    let errorType = 'UNKNOWN_ERROR';
    
    if (error.code === 'ECONNREFUSED') {
      userMessage = 'Cannot connect to server. Please check if your Windows server is running on 192.168.1.10:8080';
      errorType = 'CONNECTION_REFUSED';
    } else if (error.code === 'ETIMEDOUT') {
      userMessage = 'Server request timed out. Your Windows server may be slow to respond.';
      errorType = 'TIMEOUT';
    } else if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      if (status === 401) {
        userMessage = 'Authentication failed. Please check your credentials.';
        errorType = 'AUTH_ERROR';
      } else if (status === 403) {
        userMessage = 'Access denied. You may not have permission for this operation.';
        errorType = 'PERMISSION_ERROR';
      } else if (status === 404) {
        userMessage = 'Requested resource not found on server.';
        errorType = 'NOT_FOUND';
      } else if (status >= 500) {
        userMessage = 'Server error occurred. Please try again later.';
        errorType = 'SERVER_ERROR';
      } else {
        userMessage = `Server returned error: ${status} ${error.response.statusText}`;
        errorType = 'HTTP_ERROR';
      }
    } else if (error.request) {
      userMessage = 'No response from server. Check your network connection.';
      errorType = 'NETWORK_ERROR';
    }
    
    // Show user-friendly error
    if (Platform.OS === 'android') {
      ToastAndroid.show(`❌ ${userMessage}`, ToastAndroid.LONG);
    }
    
    // Create enhanced error object
    const enhancedError = new Error(userMessage);
    enhancedError.type = errorType;
    enhancedError.originalError = error;
    enhancedError.timestamp = new Date().toISOString();
    
    return Promise.reject(enhancedError);
  }

  // 🔥 REAL API METHODS FOR YOUR WINDOWS SERVER

  async getServerHealth() {
    try {
      const response = await this.axiosInstance.get('/api/v1/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async getServers() {
    try {
      const response = await this.axiosInstance.get('/api/v1/servers');
      return response.data;
    } catch (error) {
      console.error('Get servers failed:', error);
      throw error;
    }
  }

  async addServer(serverData) {
    try {
      const response = await this.axiosInstance.post('/api/v1/servers', serverData);
      return response.data;
    } catch (error) {
      console.error('Add server failed:', error);
      throw error;
    }
  }

  async removeServer(serverId) {
    try {
      const response = await this.axiosInstance.delete(`/api/v1/servers/${serverId}`);
      return response.data;
    } catch (error) {
      console.error('Remove server failed:', error);
      throw error;
    }
  }

  async getServerMetrics(serverId) {
    try {
      const response = await this.axiosInstance.get(`/api/v1/servers/${serverId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Get server metrics failed:', error);
      throw error;
    }
  }

  async executeCommand(serverId, command) {
    try {
      const response = await this.axiosInstance.post(`/api/v1/servers/${serverId}/command`, {
        command: command
      });
      return response.data;
    } catch (error) {
      console.error('Execute command failed:', error);
      throw error;
    }
  }

  async getAlerts() {
    try {
      const response = await this.axiosInstance.get('/api/v1/alerts');
      return response.data;
    } catch (error) {
      console.error('Get alerts failed:', error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId) {
    try {
      const response = await this.axiosInstance.post(`/api/v1/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Acknowledge alert failed:', error);
      throw error;
    }
  }

  async generateReport(reportType, format = 'pdf') {
    try {
      const response = await this.axiosInstance.post('/api/v1/reports/generate', {
        type: reportType,
        format: format
      });
      return response.data;
    } catch (error) {
      console.error('Generate report failed:', error);
      throw error;
    }
  }

  async getSystemInfo() {
    try {
      const response = await this.axiosInstance.get('/api/v1/system/info');
      return response.data;
    } catch (error) {
      console.error('Get system info failed:', error);
      throw error;
    }
  }

  // 🔥 UTILITY METHODS

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

  resetToMainURL() {
    this.currentURLIndex = 0;
    this.axiosInstance.defaults.baseURL = this.getCurrentURL();
    console.log('🔄 Reset to main URL:', this.getCurrentURL());
  }

  getCurrentEndpoint() {
    return this.getCurrentURL();
  }
}

// 🔥 SINGLETON INSTANCE
const axiosService = new AxiosService();

module.exports = axiosService;
