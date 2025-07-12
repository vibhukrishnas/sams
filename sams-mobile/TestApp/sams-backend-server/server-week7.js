#!/usr/bin/env node

// SAMS Phase 2 Week 7 - Complete API Server
// Enterprise-Grade API with Security & Performance

const express = require('express');
const cluster = require('cluster');
const { app: apiFramework } = require('./api-framework');
const SecurityService = require('./security-service');
const PerformanceService = require('./performance-service');

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

class SAMSAPIServer {
  constructor() {
    this.app = express();
    this.securityService = new SecurityService();
    this.performanceService = new PerformanceService();
    this.server = null;
    
    this.initializeServer();
  }

  async initializeServer() {
    console.log('🚀 Initializing SAMS API Server - Phase 2 Week 7');
    console.log('Enterprise-Grade API with Security & Performance');
    console.log('=' .repeat(60));
    
    try {
      // Setup performance monitoring middleware
      this.app.use(this.performanceService.createPerformanceMiddleware());
      
      // Security middleware
      this.app.use(this.createSecurityMiddleware());
      
      // Mount API framework
      this.app.use('/', apiFramework);
      
      // Additional Week 7 endpoints
      this.setupWeek7Endpoints();
      
      // Error handling
      this.setupErrorHandling();
      
      console.log('✅ Server initialization complete');
      
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  createSecurityMiddleware() {
    return (req, res, next) => {
      // Record security events
      this.securityService.recordSecurityEvent('API_REQUEST', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Sanitize input
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }
      
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }
      
      next();
    };
  }

  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.securityService.sanitizeInput(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  setupWeek7Endpoints() {
    // Security endpoints
    this.app.get('/api/v1/security/stats', (req, res) => {
      try {
        const stats = this.securityService.getSecurityStats();
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve security stats',
          code: 'SECURITY_STATS_ERROR'
        });
      }
    });

    // Performance endpoints
    this.app.get('/api/v1/performance/stats', (req, res) => {
      try {
        const report = this.performanceService.getPerformanceReport();
        res.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve performance stats',
          code: 'PERFORMANCE_STATS_ERROR'
        });
      }
    });

    // Encryption test endpoint
    this.app.post('/api/v1/security/encrypt', async (req, res) => {
      try {
        const { data } = req.body;
        
        if (!data) {
          return res.status(400).json({
            success: false,
            error: 'Data is required',
            code: 'DATA_REQUIRED'
          });
        }
        
        const encrypted = await this.securityService.encryptData(data);
        
        res.json({
          success: true,
          data: {
            encrypted: encrypted.encrypted,
            algorithm: encrypted.algorithm,
            timestamp: encrypted.timestamp
          }
        });
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Encryption failed',
          code: 'ENCRYPTION_ERROR'
        });
      }
    });

    // Cache test endpoint
    this.app.get('/api/v1/performance/cache-test', async (req, res) => {
      try {
        const testKey = 'cache-test-' + Date.now();
        const testData = { message: 'Cache test data', timestamp: new Date().toISOString() };
        
        // Set cache
        await this.performanceService.cacheSet(testKey, testData, 60);
        
        // Get cache
        const cachedData = await this.performanceService.cacheGet(testKey);
        
        res.json({
          success: true,
          data: {
            original: testData,
            cached: cachedData,
            cacheWorking: JSON.stringify(testData) === JSON.stringify(cachedData)
          }
        });
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Cache test failed',
          code: 'CACHE_TEST_ERROR'
        });
      }
    });

    // Load test endpoint
    this.app.get('/api/v1/performance/load-test', async (req, res) => {
      try {
        const { iterations = 100 } = req.query;
        const startTime = Date.now();
        
        // Simulate some work
        for (let i = 0; i < iterations; i++) {
          await new Promise(resolve => setImmediate(resolve));
        }
        
        const duration = Date.now() - startTime;
        
        res.json({
          success: true,
          data: {
            iterations: parseInt(iterations),
            duration: duration,
            iterationsPerSecond: Math.round(iterations / (duration / 1000))
          }
        });
        
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Load test failed',
          code: 'LOAD_TEST_ERROR'
        });
      }
    });

    console.log('✅ Week 7 endpoints configured');
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Server Error:', error);
      
      // Record security event for errors
      this.securityService.recordSecurityEvent('SERVER_ERROR', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      }, 'high');
      
      res.status(error.status || 500).json({
        success: false,
        error: NODE_ENV === 'production' ? 'Internal server error' : error.message,
        code: error.code || 'INTERNAL_ERROR',
        requestId: req.id
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      this.securityService.recordSecurityEvent('NOT_FOUND', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        requestId: req.id
      });
    });

    console.log('✅ Error handling configured');
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(PORT, '0.0.0.0', (error) => {
        if (error) {
          reject(error);
        } else {
          console.log('🎉 SAMS API Server Started Successfully!');
          console.log('=' .repeat(60));
          console.log(`🌐 Server: http://localhost:${PORT}`);
          console.log(`📊 Health: http://localhost:${PORT}/api/health`);
          console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
          console.log(`🔒 Security Stats: http://localhost:${PORT}/api/v1/security/stats`);
          console.log(`⚡ Performance Stats: http://localhost:${PORT}/api/v1/performance/stats`);
          console.log('');
          console.log('📋 Available API Versions:');
          console.log('   📌 v1: /api/v1/*');
          console.log('   📌 v2: /api/v2/*');
          console.log('');
          console.log('🔐 Authentication Methods:');
          console.log('   🔑 JWT Bearer Token');
          console.log('   🗝️ API Key (X-API-Key header)');
          console.log('   🔐 Multi-Factor Authentication');
          console.log('');
          console.log('🛡️ Security Features:');
          console.log('   ✅ Rate Limiting');
          console.log('   ✅ Input Validation');
          console.log('   ✅ Encryption at Rest');
          console.log('   ✅ Audit Logging');
          console.log('   ✅ Threat Detection');
          console.log('');
          console.log('⚡ Performance Features:');
          console.log('   ✅ Redis Caching');
          console.log('   ✅ Database Connection Pooling');
          console.log('   ✅ Response Time Monitoring');
          console.log('   ✅ Memory Optimization');
          console.log('');
          console.log('🧪 Testing:');
          console.log('   🔬 Run Tests: npm run test-week7');
          console.log('   📊 Load Test: GET /api/v1/performance/load-test');
          console.log('   🔒 Security Test: POST /api/v1/security/encrypt');
          console.log('');
          console.log('=' .repeat(60));
          console.log(`Environment: ${NODE_ENV}`);
          console.log(`Process ID: ${process.pid}`);
          console.log(`Memory Usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
          console.log('=' .repeat(60));
          
          resolve();
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 SAMS API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getStats() {
    return {
      server: {
        port: PORT,
        environment: NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      },
      security: this.securityService.getSecurityStats(),
      performance: this.performanceService.getPerformanceReport()
    };
  }
}

// Graceful shutdown
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);
    
    try {
      await server.stop();
      console.log('✅ Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main execution
async function main() {
  try {
    // Setup cluster if in production
    if (NODE_ENV === 'production' && process.env.CLUSTER_MODE === 'true') {
      if (!PerformanceService.setupCluster()) {
        return; // Exit if this is the master process
      }
    }
    
    const server = new SAMSAPIServer();
    await server.start();
    
    setupGracefulShutdown(server);
    
    // Export server instance for testing
    module.exports = server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  main();
}

module.exports = SAMSAPIServer;
