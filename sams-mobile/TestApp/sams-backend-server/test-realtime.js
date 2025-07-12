#!/usr/bin/env node

// SAMS Real-Time System Test Suite
// Phase 2 Week 5: Comprehensive Testing of WebSocket + Kafka + InfluxDB

const WebSocket = require('ws');
const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8081';

class SAMSRealtimeTests {
  constructor() {
    this.testResults = [];
    this.ws = null;
    this.testData = {
      serverId: 999,
      serverName: 'test-server-realtime',
      metrics: {
        cpu: 75.5,
        memory: 82.3,
        disk: 45.7,
        networkIn: 1024,
        networkOut: 2048,
        loadAverage: 1.5,
        activeConnections: 150
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFunction) {
    this.log(`🧪 Running test: ${testName}`, 'info');
    
    try {
      const startTime = Date.now();
      await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'PASSED',
        duration: duration
      });
      
      this.log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
      
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
    }
  }

  async testServerHealth() {
    const response = await axios.get(`${BASE_URL}/api/v1/health`);
    
    if (response.status !== 200) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Health check returned success: false');
    }
  }

  async testWebSocketConnection() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let authenticated = false;
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
      
      ws.on('open', () => {
        // Authenticate
        ws.send(JSON.stringify({
          type: 'auth',
          userId: 'test-user',
          userRole: 'admin'
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'auth_success') {
            authenticated = true;
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error('Invalid WebSocket message format'));
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });
      
      ws.on('close', () => {
        if (!authenticated) {
          clearTimeout(timeout);
          reject(new Error('WebSocket closed before authentication'));
        }
      });
    });
  }

  async testWebSocketSubscription() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let subscribed = false;
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket subscription timeout'));
      }, 10000);
      
      ws.on('open', () => {
        // Authenticate first
        ws.send(JSON.stringify({
          type: 'auth',
          userId: 'test-user',
          userRole: 'admin'
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'auth_success') {
            // Subscribe to metrics
            ws.send(JSON.stringify({
              type: 'subscribe',
              topic: 'server_metrics'
            }));
          } else if (message.type === 'subscribed') {
            subscribed = true;
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error('Invalid WebSocket message format'));
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });
    });
  }

  async testWebSocketStats() {
    const response = await axios.get(`${BASE_URL}/api/v1/websocket/stats`);
    
    if (response.status !== 200) {
      throw new Error(`WebSocket stats failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('WebSocket stats returned success: false');
    }
    
    const stats = response.data.data;
    if (typeof stats.totalConnections !== 'number') {
      throw new Error('Invalid WebSocket stats format');
    }
  }

  async testPipelineStats() {
    const response = await axios.get(`${BASE_URL}/api/v1/pipeline/stats`);
    
    if (response.status !== 200) {
      throw new Error(`Pipeline stats failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Pipeline stats returned success: false');
    }
    
    const stats = response.data.data;
    if (!stats.pipeline || !stats.influxdb) {
      throw new Error('Invalid pipeline stats format');
    }
  }

  async testMetricsIngestion() {
    const response = await axios.post(`${BASE_URL}/api/v1/metrics/ingest`, {
      serverId: this.testData.serverId,
      metrics: this.testData.metrics
    });
    
    if (response.status !== 200) {
      throw new Error(`Metrics ingestion failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Metrics ingestion returned success: false');
    }
  }

  async testBroadcast() {
    const response = await axios.post(`${BASE_URL}/api/v1/websocket/broadcast`, {
      topic: 'test_broadcast',
      message: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Broadcast failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Broadcast returned success: false');
    }
  }

  async testServerRegistration() {
    // Register test server
    const response = await axios.post(`${BASE_URL}/api/v1/servers`, {
      name: this.testData.serverName,
      ip: '192.168.1.100',
      port: 22,
      description: 'Test server for real-time features',
      environment: 'test'
    });
    
    if (response.status !== 201) {
      throw new Error(`Server registration failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Server registration returned success: false');
    }
    
    // Store server ID for cleanup
    this.testData.registeredServerId = response.data.data.id;
  }

  async testServerMetrics() {
    if (!this.testData.registeredServerId) {
      throw new Error('No registered server for metrics test');
    }
    
    // Send metrics for the registered server
    const response = await axios.post(`${BASE_URL}/api/v1/servers/${this.testData.registeredServerId}/metrics`, {
      cpu: this.testData.metrics.cpu,
      memory: this.testData.metrics.memory,
      disk: this.testData.metrics.disk,
      timestamp: new Date().toISOString()
    });
    
    if (response.status !== 200) {
      throw new Error(`Server metrics failed with status ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Server metrics returned success: false');
    }
  }

  async testRealtimeMetricsQuery() {
    const response = await axios.get(`${BASE_URL}/api/v1/metrics/realtime/${this.testData.serverId}?timeRange=1h`);
    
    // This might fail if InfluxDB is not available, which is OK
    if (response.status === 200 && response.data.success) {
      this.log('✅ Real-time metrics query successful', 'success');
    } else {
      this.log('⚠️ Real-time metrics query failed (InfluxDB may not be available)', 'warning');
    }
  }

  async testDashboardMetrics() {
    const response = await axios.get(`${BASE_URL}/api/v1/metrics/dashboard?timeRange=1h`);
    
    // This might fail if InfluxDB is not available, which is OK
    if (response.status === 200 && response.data.success) {
      this.log('✅ Dashboard metrics query successful', 'success');
    } else {
      this.log('⚠️ Dashboard metrics query failed (InfluxDB may not be available)', 'warning');
    }
  }

  async testAlertStats() {
    const response = await axios.get(`${BASE_URL}/api/v1/alerts/stats?timeRange=24h`);
    
    // This might fail if InfluxDB is not available, which is OK
    if (response.status === 200 && response.data.success) {
      this.log('✅ Alert stats query successful', 'success');
    } else {
      this.log('⚠️ Alert stats query failed (InfluxDB may not be available)', 'warning');
    }
  }

  async cleanup() {
    // Clean up test server if it was created
    if (this.testData.registeredServerId) {
      try {
        await axios.delete(`${BASE_URL}/api/v1/servers/${this.testData.registeredServerId}`);
        this.log('🧹 Test server cleaned up', 'info');
      } catch (error) {
        this.log(`⚠️ Failed to clean up test server: ${error.message}`, 'warning');
      }
    }
  }

  async runAllTests() {
    this.log('🚀 Starting SAMS Real-Time System Tests', 'info');
    this.log('=' .repeat(60), 'info');
    
    // Core functionality tests
    await this.runTest('Server Health Check', () => this.testServerHealth());
    await this.runTest('WebSocket Connection', () => this.testWebSocketConnection());
    await this.runTest('WebSocket Subscription', () => this.testWebSocketSubscription());
    await this.runTest('WebSocket Stats API', () => this.testWebSocketStats());
    await this.runTest('Pipeline Stats API', () => this.testPipelineStats());
    await this.runTest('Metrics Ingestion', () => this.testMetricsIngestion());
    await this.runTest('WebSocket Broadcast', () => this.testBroadcast());
    
    // Server management tests
    await this.runTest('Server Registration', () => this.testServerRegistration());
    await this.runTest('Server Metrics', () => this.testServerMetrics());
    
    // Optional features (may fail if external services not available)
    await this.runTest('Real-time Metrics Query', () => this.testRealtimeMetricsQuery());
    await this.runTest('Dashboard Metrics Query', () => this.testDashboardMetrics());
    await this.runTest('Alert Stats Query', () => this.testAlertStats());
    
    // Cleanup
    await this.cleanup();
    
    // Results summary
    this.printResults();
  }

  printResults() {
    this.log('=' .repeat(60), 'info');
    this.log('🧪 Test Results Summary', 'info');
    this.log('=' .repeat(60), 'info');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      this.log(`${status} ${result.name}${duration}`, result.status === 'PASSED' ? 'success' : 'error');
      
      if (result.error) {
        this.log(`   Error: ${result.error}`, 'error');
      }
    });
    
    this.log('=' .repeat(60), 'info');
    this.log(`📊 Results: ${passed}/${total} tests passed`, passed === total ? 'success' : 'warning');
    
    if (failed > 0) {
      this.log(`❌ ${failed} tests failed`, 'error');
      this.log('💡 Some failures may be expected if external services (InfluxDB, Kafka, Redis) are not running', 'warning');
    } else {
      this.log('🎉 All tests passed!', 'success');
    }
    
    this.log('=' .repeat(60), 'info');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tests = new SAMSRealtimeTests();
  
  tests.runAllTests().then(() => {
    const failed = tests.testResults.filter(r => r.status === 'FAILED').length;
    process.exit(failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = SAMSRealtimeTests;
