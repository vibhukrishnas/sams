#!/usr/bin/env node

// SAMS Phase 2 Week 7 Test Suite
// Testing API Development, Security & Performance

const axios = require('axios');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:8080';
const API_V1_URL = `${BASE_URL}/api/v1`;
const API_V2_URL = `${BASE_URL}/api/v2`;

class Week7TestSuite {
  constructor() {
    this.testResults = [];
    this.testUser = null;
    this.testToken = null;
    this.testApiKey = null;
    this.testServerId = null;
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
      const startTime = performance.now();
      await testFunction();
      const duration = performance.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'PASSED',
        duration: Math.round(duration)
      });
      
      this.log(`✅ ${testName} - PASSED (${Math.round(duration)}ms)`, 'success');
      
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
    }
  }

  // =============================================================================
  // API FRAMEWORK TESTS
  // =============================================================================

  async testAPIHealth() {
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Health check returned success: false');
    }
    
    if (!response.data.version) {
      throw new Error('API version not provided');
    }
  }

  async testAPIVersioning() {
    // Test v1 endpoint
    const v1Response = await axios.get(`${BASE_URL}/api/version`);
    if (v1Response.status !== 200) {
      throw new Error('Version endpoint failed');
    }
    
    // Check version header
    if (!v1Response.headers['x-api-version']) {
      this.log('⚠️ API version header not set', 'warning');
    }
  }

  async testRateLimiting() {
    const requests = [];
    const endpoint = `${API_V1_URL}/auth/login`;
    
    // Send multiple requests quickly to trigger rate limiting
    for (let i = 0; i < 15; i++) {
      requests.push(
        axios.post(endpoint, {
          username: 'nonexistent',
          password: 'invalid'
        }).catch(error => error.response)
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(res => res && res.status === 429);
    
    if (!rateLimited) {
      throw new Error('Rate limiting not working - expected 429 status');
    }
  }

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================

  async testUserRegistration() {
    const userData = {
      username: 'testuser_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      role: 'user'
    };
    
    const response = await axios.post(`${API_V1_URL}/auth/register`, userData);
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Registration returned success: false');
    }
    
    this.testUser = {
      ...userData,
      id: response.data.data.id
    };
  }

  async testUserLogin() {
    if (!this.testUser) {
      throw new Error('No test user available for login');
    }
    
    const response = await axios.post(`${API_V1_URL}/auth/login`, {
      username: this.testUser.username,
      password: this.testUser.password
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Login returned success: false');
    }
    
    if (!response.data.data.token) {
      throw new Error('JWT token not provided');
    }
    
    this.testToken = response.data.data.token;
  }

  async testJWTAuthentication() {
    if (!this.testToken) {
      throw new Error('No JWT token available');
    }
    
    const response = await axios.get(`${API_V1_URL}/servers`, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Authenticated request failed');
    }
  }

  async testMFASetup() {
    if (!this.testToken) {
      throw new Error('No JWT token available');
    }
    
    const response = await axios.post(`${API_V1_URL}/auth/mfa/setup`, {}, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('MFA setup failed');
    }
    
    if (!response.data.data.secret) {
      throw new Error('MFA secret not provided');
    }
  }

  // =============================================================================
  // API KEY TESTS
  // =============================================================================

  async testAPIKeyCreation() {
    if (!this.testToken) {
      throw new Error('No JWT token available');
    }
    
    const response = await axios.post(`${API_V1_URL}/auth/api-keys`, {
      name: 'Test API Key',
      permissions: ['read', 'write'],
      expiresIn: 30 // 30 days
    }, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('API key creation failed');
    }
    
    if (!response.data.data.key) {
      throw new Error('API key not provided');
    }
    
    this.testApiKey = response.data.data.key;
  }

  async testAPIKeyAuthentication() {
    if (!this.testApiKey) {
      throw new Error('No API key available');
    }
    
    const response = await axios.get(`${API_V1_URL}/servers`, {
      headers: {
        'X-API-Key': this.testApiKey
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('API key authentication failed');
    }
  }

  // =============================================================================
  // CRUD OPERATIONS TESTS
  // =============================================================================

  async testServerCreation() {
    if (!this.testToken) {
      throw new Error('No JWT token available');
    }
    
    const serverData = {
      name: 'Test Server ' + Date.now(),
      ip: '192.168.1.100',
      port: 22,
      description: 'Test server for API testing',
      environment: 'development',
      tags: ['test', 'api']
    };
    
    const response = await axios.post(`${API_V1_URL}/servers`, serverData, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Server creation failed');
    }
    
    this.testServerId = response.data.data.id;
  }

  async testServerRetrieval() {
    if (!this.testServerId || !this.testToken) {
      throw new Error('No test server or token available');
    }
    
    const response = await axios.get(`${API_V1_URL}/servers/${this.testServerId}`, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Server retrieval failed');
    }
    
    if (response.data.data.id !== this.testServerId) {
      throw new Error('Retrieved server ID mismatch');
    }
  }

  async testServerUpdate() {
    if (!this.testServerId || !this.testToken) {
      throw new Error('No test server or token available');
    }
    
    const updateData = {
      description: 'Updated test server description',
      environment: 'staging'
    };
    
    const response = await axios.put(`${API_V1_URL}/servers/${this.testServerId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Server update failed');
    }
  }

  async testServerPagination() {
    if (!this.testToken) {
      throw new Error('No JWT token available');
    }
    
    const response = await axios.get(`${API_V1_URL}/servers?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${this.testToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.data.success) {
      throw new Error('Server pagination failed');
    }
    
    if (!response.data.data.pagination) {
      throw new Error('Pagination data not provided');
    }
  }

  // =============================================================================
  // SECURITY TESTS
  // =============================================================================

  async testInputValidation() {
    // Test with invalid data
    try {
      await axios.post(`${API_V1_URL}/auth/register`, {
        username: '', // Invalid: empty
        email: 'invalid-email', // Invalid: not an email
        password: '123' // Invalid: too short
      });
      throw new Error('Input validation should have failed');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        // Expected validation error
        return;
      }
      throw error;
    }
  }

  async testUnauthorizedAccess() {
    try {
      await axios.get(`${API_V1_URL}/servers`);
      throw new Error('Unauthorized access should have been blocked');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Expected unauthorized error
        return;
      }
      throw error;
    }
  }

  async testInvalidToken() {
    try {
      await axios.get(`${API_V1_URL}/servers`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      throw new Error('Invalid token should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        // Expected forbidden error
        return;
      }
      throw error;
    }
  }

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  async testResponseTime() {
    const startTime = performance.now();
    
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    const responseTime = performance.now() - startTime;
    
    if (response.status !== 200) {
      throw new Error('Health check failed');
    }
    
    // Check if response time is reasonable (under 1 second)
    if (responseTime > 1000) {
      this.log(`⚠️ Slow response time: ${Math.round(responseTime)}ms`, 'warning');
    }
    
    // Check for performance headers
    if (!response.headers['x-response-time']) {
      this.log('⚠️ Response time header not set', 'warning');
    }
  }

  async testConcurrentRequests() {
    const requests = [];
    const endpoint = `${BASE_URL}/api/health`;
    
    // Send 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      requests.push(axios.get(endpoint));
    }
    
    const startTime = performance.now();
    const responses = await Promise.all(requests);
    const totalTime = performance.now() - startTime;
    
    // All requests should succeed
    const failedRequests = responses.filter(res => res.status !== 200);
    if (failedRequests.length > 0) {
      throw new Error(`${failedRequests.length} concurrent requests failed`);
    }
    
    // Average response time should be reasonable
    const avgResponseTime = totalTime / responses.length;
    if (avgResponseTime > 500) {
      this.log(`⚠️ High average response time under load: ${Math.round(avgResponseTime)}ms`, 'warning');
    }
  }

  // =============================================================================
  // API DOCUMENTATION TESTS
  // =============================================================================

  async testSwaggerDocumentation() {
    const response = await axios.get(`${BASE_URL}/api-docs/swagger.json`);
    
    if (response.status !== 200) {
      throw new Error('Swagger documentation not accessible');
    }
    
    const swaggerDoc = response.data;
    
    if (!swaggerDoc.openapi) {
      throw new Error('Invalid OpenAPI specification');
    }
    
    if (!swaggerDoc.info || !swaggerDoc.info.title) {
      throw new Error('API documentation missing title');
    }
  }

  // =============================================================================
  // CLEANUP AND REPORTING
  // =============================================================================

  async cleanup() {
    // Delete test server
    if (this.testServerId && this.testToken) {
      try {
        await axios.delete(`${API_V1_URL}/servers/${this.testServerId}`, {
          headers: {
            'Authorization': `Bearer ${this.testToken}`
          }
        });
        this.log('🧹 Test server cleaned up', 'info');
      } catch (error) {
        this.log(`⚠️ Failed to clean up test server: ${error.message}`, 'warning');
      }
    }
  }

  async runAllTests() {
    this.log('🚀 Starting SAMS Phase 2 Week 7 Tests', 'info');
    this.log('Testing: API Development, Security & Performance', 'info');
    this.log('=' .repeat(60), 'info');
    
    // API Framework tests
    await this.runTest('API Health Check', () => this.testAPIHealth());
    await this.runTest('API Versioning', () => this.testAPIVersioning());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    
    // Authentication tests
    await this.runTest('User Registration', () => this.testUserRegistration());
    await this.runTest('User Login', () => this.testUserLogin());
    await this.runTest('JWT Authentication', () => this.testJWTAuthentication());
    await this.runTest('MFA Setup', () => this.testMFASetup());
    
    // API Key tests
    await this.runTest('API Key Creation', () => this.testAPIKeyCreation());
    await this.runTest('API Key Authentication', () => this.testAPIKeyAuthentication());
    
    // CRUD operations tests
    await this.runTest('Server Creation', () => this.testServerCreation());
    await this.runTest('Server Retrieval', () => this.testServerRetrieval());
    await this.runTest('Server Update', () => this.testServerUpdate());
    await this.runTest('Server Pagination', () => this.testServerPagination());
    
    // Security tests
    await this.runTest('Input Validation', () => this.testInputValidation());
    await this.runTest('Unauthorized Access', () => this.testUnauthorizedAccess());
    await this.runTest('Invalid Token', () => this.testInvalidToken());
    
    // Performance tests
    await this.runTest('Response Time', () => this.testResponseTime());
    await this.runTest('Concurrent Requests', () => this.testConcurrentRequests());
    
    // Documentation tests
    await this.runTest('Swagger Documentation', () => this.testSwaggerDocumentation());
    
    // Cleanup
    await this.cleanup();
    
    // Results summary
    this.printResults();
  }

  printResults() {
    this.log('=' .repeat(60), 'info');
    this.log('🧪 Phase 2 Week 7 Test Results', 'info');
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
    } else {
      this.log('🎉 All tests passed!', 'success');
    }
    
    this.log('=' .repeat(60), 'info');
    this.log('📋 Week 7 Features Tested:', 'info');
    this.log('   ✅ RESTful API Framework with CRUD operations', 'info');
    this.log('   ✅ API Versioning and Rate Limiting', 'info');
    this.log('   ✅ JWT and API Key Authentication', 'info');
    this.log('   ✅ Multi-Factor Authentication Setup', 'info');
    this.log('   ✅ Input Validation and Security', 'info');
    this.log('   ✅ Performance Optimization', 'info');
    this.log('   ✅ OpenAPI/Swagger Documentation', 'info');
    this.log('=' .repeat(60), 'info');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tests = new Week7TestSuite();
  
  tests.runAllTests().then(() => {
    const failed = tests.testResults.filter(r => r.status === 'FAILED').length;
    process.exit(failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = Week7TestSuite;
