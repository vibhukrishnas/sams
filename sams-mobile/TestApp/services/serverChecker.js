/**
 * 🔍 SAMS Server Health Checker Service
 * Enterprise-grade server connectivity and health validation
 * 
 * @author SAMS Development Team
 * @version 2.0.0
 */

import { Platform } from 'react-native';

class ServerChecker {
  constructor() {
    this.timeout = 10000; // 10 seconds default timeout
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 seconds between retries
  }

  /**
   * 🌐 Test basic network connectivity to server
   * @param {string} ip - Server IP address
   * @param {number} timeout - Connection timeout in ms
   * @returns {Promise<Object>} Connection result
   */
  async testConnectivity(ip, timeout = this.timeout) {
    console.log(`🔍 Testing connectivity to ${ip}...`);
    
    try {
      // Test multiple connection methods for reliability
      const tests = [
        this.testHTTP(ip, 80, timeout),
        this.testHTTP(ip, 8080, timeout),
        this.testHTTP(ip, 443, timeout),
        this.testPing(ip, timeout)
      ];

      const results = await Promise.allSettled(tests);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);

      if (successful.length > 0) {
        console.log(`✅ Connectivity test passed: ${successful.length}/${tests.length} methods successful`);
        return {
          success: true,
          methods: successful.map(r => r.value.method),
          latency: Math.min(...successful.map(r => r.value.latency || 0))
        };
      } else {
        console.log(`❌ Connectivity test failed: All methods failed`);
        return {
          success: false,
          error: 'Server unreachable via all tested methods',
          details: results.map(r => r.reason?.message || 'Unknown error')
        };
      }
    } catch (error) {
      console.log(`❌ Connectivity test error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🌐 Test HTTP connection to specific port
   * @param {string} ip - Server IP
   * @param {number} port - Port to test
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Object>} Test result
   */
  async testHTTP(ip, port, timeout) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`http://${ip}:${port}`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SAMS-Mobile-Client/2.0'
        }
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return {
        success: true,
        method: `HTTP:${port}`,
        latency,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        method: `HTTP:${port}`,
        error: error.message
      };
    }
  }

  /**
   * 🏓 Simulate ping test using HTTP HEAD request
   * @param {string} ip - Server IP
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Object>} Ping result
   */
  async testPing(ip, timeout) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Try to reach any common service
      const response = await fetch(`http://${ip}`, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return {
        success: true,
        method: 'PING',
        latency
      };
    } catch (error) {
      return {
        success: false,
        method: 'PING',
        error: error.message
      };
    }
  }

  /**
   * 🏥 Check SAMS monitoring agent health
   * @param {string} ip - Server IP address
   * @param {number} port - Agent port (default 8080)
   * @returns {Promise<Object>} Health check result
   */
  async checkAgentHealth(ip, port = 8080) {
    console.log(`🏥 Checking SAMS agent health on ${ip}:${port}...`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`http://${ip}:${port}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Mobile-Client/2.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const healthData = await response.json();
      
      console.log(`✅ SAMS agent is healthy on ${ip}:${port}`);
      return {
        success: true,
        agent: {
          status: healthData.status || 'unknown',
          version: healthData.version || 'unknown',
          uptime: healthData.uptime || 0,
          endpoints: healthData.endpoints || [],
          system: healthData.system || {}
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(`❌ SAMS agent health check failed on ${ip}:${port}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        needsDeployment: error.message.includes('404') || error.message.includes('ECONNREFUSED')
      };
    }
  }

  /**
   * 📊 Get comprehensive server metrics
   * @param {string} ip - Server IP address
   * @param {number} port - Agent port
   * @returns {Promise<Object>} Metrics data
   */
  async getServerMetrics(ip, port = 8080) {
    console.log(`📊 Fetching server metrics from ${ip}:${port}...`);
    
    try {
      const endpoints = [
        '/api/v1/metrics',
        '/api/v1/system',
        '/api/v1/processes',
        '/api/v1/services'
      ];

      const results = {};
      
      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`http://${ip}:${port}${endpoint}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'SAMS-Mobile-Client/2.0'
            }
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            results[endpoint.split('/').pop()] = await response.json();
          }
        } catch (endpointError) {
          console.log(`⚠️ Failed to fetch ${endpoint}: ${endpointError.message}`);
          results[endpoint.split('/').pop()] = null;
        }
      }

      return {
        success: true,
        metrics: results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(`❌ Failed to fetch server metrics: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔄 Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxAttempts - Maximum retry attempts
   * @param {number} baseDelay - Base delay between retries
   * @returns {Promise<any>} Operation result
   */
  async retryOperation(operation, maxAttempts = this.retryAttempts, baseDelay = this.retryDelay) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxAttempts}...`);
        const result = await operation();
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error || 'Operation failed';
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error.message;
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Error occurred, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxAttempts} attempts: ${lastError}`);
  }

  /**
   * 🔍 Comprehensive server validation
   * @param {string} ip - Server IP address
   * @returns {Promise<Object>} Complete validation result
   */
  async validateServer(ip) {
    console.log(`🔍 Starting comprehensive validation for server ${ip}...`);
    
    const validation = {
      ip,
      timestamp: new Date().toISOString(),
      connectivity: null,
      agent: null,
      metrics: null,
      overall: 'UNKNOWN'
    };

    try {
      // Step 1: Test basic connectivity
      validation.connectivity = await this.testConnectivity(ip);
      
      if (!validation.connectivity.success) {
        validation.overall = 'UNREACHABLE';
        return validation;
      }

      // Step 2: Check agent health
      validation.agent = await this.checkAgentHealth(ip);
      
      if (!validation.agent.success) {
        validation.overall = validation.agent.needsDeployment ? 'NEEDS_DEPLOYMENT' : 'AGENT_ERROR';
        return validation;
      }

      // Step 3: Get server metrics
      validation.metrics = await this.getServerMetrics(ip);
      
      validation.overall = 'ONLINE';
      console.log(`✅ Server ${ip} validation complete: ${validation.overall}`);
      
      return validation;

    } catch (error) {
      console.log(`❌ Server validation failed for ${ip}: ${error.message}`);
      validation.overall = 'ERROR';
      validation.error = error.message;
      return validation;
    }
  }
}

// Export singleton instance
export default new ServerChecker();
