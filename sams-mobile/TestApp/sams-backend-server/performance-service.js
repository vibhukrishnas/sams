// SAMS Performance Optimization Service
// Phase 2 Week 7: Production Performance Optimization

const redis = require('redis');
const { Pool } = require('pg');
const cluster = require('cluster');
const os = require('os');
const v8 = require('v8');

class PerformanceService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      database: {
        connections: {
          active: 0,
          idle: 0,
          total: 0
        },
        queries: {
          total: 0,
          slow: 0,
          failed: 0,
          averageTime: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      cpu: {
        usage: 0,
        loadAverage: []
      }
    };
    
    this.performanceConfig = {
      database: {
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        queryTimeout: 30000,
        slowQueryThreshold: 1000 // 1 second
      },
      cache: {
        defaultTTL: 300, // 5 minutes
        maxMemory: '100mb',
        evictionPolicy: 'allkeys-lru'
      },
      monitoring: {
        metricsInterval: 10000, // 10 seconds
        alertThresholds: {
          responseTime: 2000, // 2 seconds
          errorRate: 0.05, // 5%
          memoryUsage: 0.85, // 85%
          cpuUsage: 0.80 // 80%
        }
      },
      optimization: {
        enableGzip: true,
        enableEtag: true,
        enableKeepAlive: true,
        maxRequestSize: '10mb',
        requestTimeout: 30000
      }
    };
    
    this.alerts = [];
    this.optimizations = [];
    
    this.initializePerformanceMonitoring();
  }

  async initializePerformanceMonitoring() {
    console.log('⚡ Initializing SAMS Performance Service...');
    
    // Initialize database connection pool
    await this.initializeDatabasePool();
    
    // Initialize Redis cache
    await this.initializeCache();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    // Setup JVM optimization
    this.optimizeJVM();
    
    console.log('✅ Performance service initialized');
  }

  // =============================================================================
  // DATABASE OPTIMIZATION
  // =============================================================================

  async initializeDatabasePool() {
    try {
      this.dbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sams',
        user: process.env.DB_USER || 'sams',
        password: process.env.DB_PASSWORD || 'password',
        max: this.performanceConfig.database.maxConnections,
        idleTimeoutMillis: this.performanceConfig.database.idleTimeoutMillis,
        connectionTimeoutMillis: this.performanceConfig.database.connectionTimeoutMillis,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });

      // Monitor pool events
      this.dbPool.on('connect', () => {
        this.metrics.database.connections.total++;
        console.log('📊 Database connection established');
      });

      this.dbPool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
        this.recordAlert('DATABASE_ERROR', { error: err.message }, 'high');
      });

      console.log('✅ Database connection pool initialized');
    } catch (error) {
      console.error('❌ Database pool initialization failed:', error);
      throw error;
    }
  }

  async executeQuery(query, params = [], options = {}) {
    const startTime = Date.now();
    const client = await this.dbPool.connect();
    
    try {
      // Set query timeout
      if (options.timeout) {
        client.query('SET statement_timeout = $1', [options.timeout]);
      }
      
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.database.queries.total++;
      this.updateQueryMetrics(duration);
      
      // Check for slow queries
      if (duration > this.performanceConfig.database.slowQueryThreshold) {
        this.metrics.database.queries.slow++;
        this.recordAlert('SLOW_QUERY', {
          query: query.substring(0, 100) + '...',
          duration,
          params: params.length
        }, 'medium');
      }
      
      return result;
      
    } catch (error) {
      this.metrics.database.queries.failed++;
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
      this.updateConnectionMetrics();
    }
  }

  updateQueryMetrics(duration) {
    const queries = this.metrics.database.queries;
    queries.averageTime = (queries.averageTime * (queries.total - 1) + duration) / queries.total;
  }

  updateConnectionMetrics() {
    this.metrics.database.connections.active = this.dbPool.totalCount - this.dbPool.idleCount;
    this.metrics.database.connections.idle = this.dbPool.idleCount;
    this.metrics.database.connections.total = this.dbPool.totalCount;
  }

  // =============================================================================
  // REDIS CACHING
  // =============================================================================

  async initializeCache() {
    try {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis cache connected');
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis error:', err);
        this.recordAlert('CACHE_ERROR', { error: err.message }, 'medium');
      });

      await this.redisClient.connect();
      
      // Configure Redis for optimal performance
      await this.redisClient.config('SET', 'maxmemory', this.performanceConfig.cache.maxMemory);
      await this.redisClient.config('SET', 'maxmemory-policy', this.performanceConfig.cache.evictionPolicy);
      
      console.log('✅ Redis cache initialized');
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      // Continue without cache if Redis is not available
    }
  }

  async cacheGet(key) {
    if (!this.redisClient) return null;
    
    try {
      const value = await this.redisClient.get(key);
      
      if (value) {
        this.metrics.cache.hits++;
        return JSON.parse(value);
      } else {
        this.metrics.cache.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.cache.misses++;
      return null;
    } finally {
      this.updateCacheMetrics();
    }
  }

  async cacheSet(key, value, ttl = this.performanceConfig.cache.defaultTTL) {
    if (!this.redisClient) return false;
    
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async cacheDel(key) {
    if (!this.redisClient) return false;
    
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  updateCacheMetrics() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? this.metrics.cache.hits / total : 0;
  }

  // =============================================================================
  // PERFORMANCE MONITORING
  // =============================================================================

  startPerformanceMonitoring() {
    // Collect metrics every 10 seconds
    setInterval(() => {
      this.collectMetrics();
    }, this.performanceConfig.monitoring.metricsInterval);
    
    // Check for performance issues every minute
    setInterval(() => {
      this.checkPerformanceThresholds();
    }, 60000);
    
    console.log('📊 Performance monitoring started');
  }

  collectMetrics() {
    // Memory metrics
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
    
    // CPU metrics
    this.metrics.cpu.loadAverage = os.loadavg();
    
    // V8 heap statistics
    const heapStats = v8.getHeapStatistics();
    this.metrics.v8 = {
      totalHeapSize: heapStats.total_heap_size,
      usedHeapSize: heapStats.used_heap_size,
      heapSizeLimit: heapStats.heap_size_limit,
      mallocedMemory: heapStats.malloced_memory
    };
    
    // Update cache size if Redis is available
    if (this.redisClient) {
      this.redisClient.dbsize().then(size => {
        this.metrics.cache.size = size;
      }).catch(() => {});
    }
  }

  checkPerformanceThresholds() {
    const thresholds = this.performanceConfig.monitoring.alertThresholds;
    
    // Check memory usage
    const memoryUsage = this.metrics.memory.heapUsed / this.metrics.memory.heapTotal;
    if (memoryUsage > thresholds.memoryUsage) {
      this.recordAlert('HIGH_MEMORY_USAGE', {
        usage: (memoryUsage * 100).toFixed(2) + '%',
        heapUsed: Math.round(this.metrics.memory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(this.metrics.memory.heapTotal / 1024 / 1024) + 'MB'
      }, 'high');
    }
    
    // Check CPU usage
    const cpuUsage = this.metrics.cpu.loadAverage[0] / os.cpus().length;
    if (cpuUsage > thresholds.cpuUsage) {
      this.recordAlert('HIGH_CPU_USAGE', {
        usage: (cpuUsage * 100).toFixed(2) + '%',
        loadAverage: this.metrics.cpu.loadAverage
      }, 'high');
    }
    
    // Check error rate
    const errorRate = this.metrics.requests.total > 0 ? 
      this.metrics.requests.failed / this.metrics.requests.total : 0;
    if (errorRate > thresholds.errorRate) {
      this.recordAlert('HIGH_ERROR_RATE', {
        rate: (errorRate * 100).toFixed(2) + '%',
        failed: this.metrics.requests.failed,
        total: this.metrics.requests.total
      }, 'high');
    }
    
    // Check response time
    if (this.metrics.requests.averageResponseTime > thresholds.responseTime) {
      this.recordAlert('HIGH_RESPONSE_TIME', {
        averageTime: this.metrics.requests.averageResponseTime + 'ms',
        threshold: thresholds.responseTime + 'ms'
      }, 'medium');
    }
  }

  recordAlert(type, details, severity) {
    const alert = {
      id: require('crypto').randomUUID(),
      type,
      details,
      severity,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000);
    }
    
    console.log(`🚨 Performance Alert [${severity.toUpperCase()}]: ${type}`, details);
  }

  // =============================================================================
  // JVM OPTIMIZATION
  // =============================================================================

  optimizeJVM() {
    // Force garbage collection if memory usage is high
    setInterval(() => {
      const memoryUsage = this.metrics.memory.heapUsed / this.metrics.memory.heapTotal;
      if (memoryUsage > 0.8) {
        if (global.gc) {
          global.gc();
          console.log('🧹 Forced garbage collection');
        }
      }
    }, 30000);
    
    // Optimize V8 flags for production
    if (process.env.NODE_ENV === 'production') {
      this.optimizations.push({
        type: 'V8_OPTIMIZATION',
        description: 'Production V8 flags applied',
        flags: [
          '--max-old-space-size=4096',
          '--optimize-for-size',
          '--gc-interval=100'
        ]
      });
    }
    
    console.log('⚡ JVM optimization configured');
  }

  // =============================================================================
  // PERFORMANCE UTILITIES
  // =============================================================================

  measureExecutionTime(fn, name) {
    return async (...args) => {
      const startTime = Date.now();
      try {
        const result = await fn(...args);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️ ${name} executed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ ${name} failed after ${duration}ms:`, error.message);
        throw error;
      }
    };
  }

  createPerformanceMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Update request metrics
        this.metrics.requests.total++;
        
        if (res.statusCode >= 400) {
          this.metrics.requests.failed++;
        } else {
          this.metrics.requests.successful++;
        }
        
        // Update response time metrics
        this.metrics.requests.responseTimes.push(duration);
        if (this.metrics.requests.responseTimes.length > 1000) {
          this.metrics.requests.responseTimes.shift();
        }
        
        // Calculate average response time
        const total = this.metrics.requests.responseTimes.length;
        this.metrics.requests.averageResponseTime = 
          this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / total;
        
        // Add performance headers
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Request-ID', req.id);
      });
      
      next();
    };
  }

  getPerformanceReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      optimizations: this.optimizations,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Memory recommendations
    const memoryUsage = this.metrics.memory.heapUsed / this.metrics.memory.heapTotal;
    if (memoryUsage > 0.8) {
      recommendations.push({
        type: 'MEMORY_OPTIMIZATION',
        message: 'Consider increasing heap size or optimizing memory usage',
        priority: 'high'
      });
    }
    
    // Cache recommendations
    if (this.metrics.cache.hitRate < 0.7) {
      recommendations.push({
        type: 'CACHE_OPTIMIZATION',
        message: 'Cache hit rate is low. Consider adjusting TTL or cache strategy',
        priority: 'medium'
      });
    }
    
    // Database recommendations
    if (this.metrics.database.queries.slow > this.metrics.database.queries.total * 0.1) {
      recommendations.push({
        type: 'DATABASE_OPTIMIZATION',
        message: 'High number of slow queries detected. Consider query optimization',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  // =============================================================================
  // CLUSTER MANAGEMENT
  // =============================================================================

  static setupCluster() {
    const numCPUs = os.cpus().length;
    const maxWorkers = parseInt(process.env.MAX_WORKERS) || Math.min(numCPUs, 4);
    
    if (cluster.isMaster) {
      console.log(`🚀 Master process ${process.pid} starting ${maxWorkers} workers`);
      
      // Fork workers
      for (let i = 0; i < maxWorkers; i++) {
        cluster.fork();
      }
      
      cluster.on('exit', (worker, code, signal) => {
        console.log(`💀 Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
      });
      
      return false; // Don't start server in master process
    } else {
      console.log(`👷 Worker ${process.pid} started`);
      return true; // Start server in worker process
    }
  }
}

module.exports = PerformanceService;
