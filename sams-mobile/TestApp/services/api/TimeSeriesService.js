/**
 * 🔥 ENTERPRISE TIME-SERIES DATABASE SERVICE
 * Handles metrics storage, retrieval, and analysis with InfluxDB/TimescaleDB
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class TimeSeriesService {
  constructor() {
    this.baseURL = 'http://192.168.1.10:8080/api/metrics';
    this.fallbackURLs = [
      'http://192.168.1.10:8080/api/metrics',
      'http://localhost:3001/api/metrics',
      'http://10.0.2.2:3001/api/metrics'
    ];
    this.currentURLIndex = 0;
    this.metricsCache = new Map();
    this.batchSize = 100;
    this.flushInterval = 30000; // 30 seconds
    this.pendingMetrics = [];
    this.flushTimer = null;
    this.retentionPolicies = {
      raw: '7d',      // Raw data for 7 days
      hourly: '30d',  // Hourly aggregates for 30 days
      daily: '1y',    // Daily aggregates for 1 year
      monthly: '5y'   // Monthly aggregates for 5 years
    };
  }

  /**
   * Initialize time-series service
   */
  async initialize() {
    try {
      console.log('🔥 TimeSeriesService: Initializing...');
      
      // Start batch flushing
      this.startBatchFlushing();
      
      // Load cached metrics
      await this.loadCachedMetrics();
      
      console.log('🔥 TimeSeriesService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('TimeSeriesService initialization error:', error);
      return false;
    }
  }

  /**
   * Write metric data point
   */
  async writeMetric(measurement, tags, fields, timestamp = null) {
    try {
      const dataPoint = {
        measurement,
        tags,
        fields,
        timestamp: timestamp || new Date().toISOString(),
        id: `${measurement}_${Date.now()}_${Math.random()}`
      };
      
      // Add to pending batch
      this.pendingMetrics.push(dataPoint);
      
      // Cache locally
      this.cacheMetric(dataPoint);
      
      // Flush if batch is full
      if (this.pendingMetrics.length >= this.batchSize) {
        await this.flushMetrics();
      }
      
      return true;
    } catch (error) {
      console.error('TimeSeriesService: Write metric error', error);
      return false;
    }
  }

  /**
   * Write multiple metrics in batch
   */
  async writeMetrics(dataPoints) {
    try {
      for (const point of dataPoints) {
        await this.writeMetric(
          point.measurement,
          point.tags,
          point.fields,
          point.timestamp
        );
      }
      return true;
    } catch (error) {
      console.error('TimeSeriesService: Write metrics batch error', error);
      return false;
    }
  }

  /**
   * Query metrics with time range and filters
   */
  async queryMetrics(query) {
    try {
      const {
        measurement,
        tags = {},
        fields = [],
        startTime,
        endTime,
        aggregation = null,
        groupBy = null,
        limit = 1000
      } = query;
      
      // Try to get from cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.metricsCache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        console.log('TimeSeriesService: Returning cached metrics');
        return cached.data;
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        measurement,
        startTime: startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: endTime || new Date().toISOString(),
        limit: limit.toString()
      });
      
      // Add tags
      Object.entries(tags).forEach(([key, value]) => {
        params.append(`tag_${key}`, value);
      });
      
      // Add fields
      fields.forEach(field => {
        params.append('field', field);
      });
      
      // Add aggregation
      if (aggregation) {
        params.append('aggregation', aggregation);
      }
      
      // Add groupBy
      if (groupBy) {
        params.append('groupBy', groupBy);
      }
      
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${this.baseURL}/query?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.metricsCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: 60000 // 1 minute TTL
      });
      
      return data;
    } catch (error) {
      console.error('TimeSeriesService: Query metrics error', error);
      
      // Return cached data if available
      const cacheKey = this.generateCacheKey(query);
      const cached = this.metricsCache.get(cacheKey);
      if (cached) {
        console.log('TimeSeriesService: Returning stale cached data due to error');
        return cached.data;
      }
      
      return [];
    }
  }

  /**
   * Get server metrics for specific time range
   */
  async getServerMetrics(serverId, timeRange = '1h') {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));
    
    return await this.queryMetrics({
      measurement: 'server_metrics',
      tags: { server_id: serverId },
      fields: ['cpu', 'memory', 'disk', 'network'],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      aggregation: 'mean',
      groupBy: '5m'
    });
  }

  /**
   * Get aggregated metrics for dashboard
   */
  async getDashboardMetrics(timeRange = '24h') {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));
    
    const queries = [
      // CPU metrics
      this.queryMetrics({
        measurement: 'server_metrics',
        fields: ['cpu'],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        aggregation: 'mean',
        groupBy: '1h'
      }),
      
      // Memory metrics
      this.queryMetrics({
        measurement: 'server_metrics',
        fields: ['memory'],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        aggregation: 'mean',
        groupBy: '1h'
      }),
      
      // Alert metrics
      this.queryMetrics({
        measurement: 'alerts',
        fields: ['count'],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        aggregation: 'sum',
        groupBy: '1h'
      })
    ];
    
    const [cpuData, memoryData, alertData] = await Promise.all(queries);
    
    return {
      cpu: cpuData,
      memory: memoryData,
      alerts: alertData,
      timeRange,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get real-time metrics stream
   */
  async getRealtimeMetrics(serverId, callback) {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll simulate with polling
    const interval = setInterval(async () => {
      try {
        const metrics = await this.getServerMetrics(serverId, '5m');
        const latest = metrics[metrics.length - 1];
        if (latest) {
          callback(latest);
        }
      } catch (error) {
        console.error('TimeSeriesService: Realtime metrics error', error);
      }
    }, 5000); // 5 seconds
    
    return () => clearInterval(interval);
  }

  /**
   * Write server health metrics
   */
  async writeServerHealth(serverId, metrics) {
    return await this.writeMetric(
      'server_health',
      {
        server_id: serverId,
        environment: metrics.environment || 'production',
        region: metrics.region || 'default'
      },
      {
        cpu_usage: metrics.cpu,
        memory_usage: metrics.memory,
        disk_usage: metrics.disk,
        network_io: metrics.network,
        response_time: metrics.responseTime || 0,
        error_rate: metrics.errorRate || 0,
        uptime: metrics.uptime || 0
      }
    );
  }

  /**
   * Write alert metrics
   */
  async writeAlertMetric(alertId, serverId, severity, type) {
    return await this.writeMetric(
      'alerts',
      {
        alert_id: alertId,
        server_id: serverId,
        severity,
        type,
        environment: 'production'
      },
      {
        count: 1,
        duration: 0,
        acknowledged: 0
      }
    );
  }

  /**
   * Write performance metrics
   */
  async writePerformanceMetric(operation, duration, success = true) {
    return await this.writeMetric(
      'performance',
      {
        operation,
        status: success ? 'success' : 'error',
        platform: 'mobile'
      },
      {
        duration,
        count: 1
      }
    );
  }

  /**
   * Flush pending metrics to backend
   */
  async flushMetrics() {
    if (this.pendingMetrics.length === 0) return;
    
    try {
      console.log('🔥 TimeSeriesService: Flushing', this.pendingMetrics.length, 'metrics');
      
      const authToken = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${this.baseURL}/write`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataPoints: this.pendingMetrics
        })
      });
      
      if (response.ok) {
        console.log('TimeSeriesService: Metrics flushed successfully');
        this.pendingMetrics = [];
      } else {
        console.error('TimeSeriesService: Flush failed', response.status);
        // Keep metrics for retry
      }
    } catch (error) {
      console.error('TimeSeriesService: Flush error', error);
      // Keep metrics for retry
    }
  }

  /**
   * Start batch flushing timer
   */
  startBatchFlushing() {
    if (this.flushTimer) return;
    
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  /**
   * Stop batch flushing timer
   */
  stopBatchFlushing() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Cache metric locally
   */
  cacheMetric(dataPoint) {
    const key = `${dataPoint.measurement}_${JSON.stringify(dataPoint.tags)}`;
    
    if (!this.metricsCache.has(key)) {
      this.metricsCache.set(key, []);
    }
    
    const cached = this.metricsCache.get(key);
    cached.push(dataPoint);
    
    // Keep only last 100 points per key
    if (cached.length > 100) {
      cached.splice(0, cached.length - 100);
    }
  }

  /**
   * Load cached metrics from storage
   */
  async loadCachedMetrics() {
    try {
      const cached = await AsyncStorage.getItem('timeSeriesCache');
      if (cached) {
        const data = JSON.parse(cached);
        this.metricsCache = new Map(data);
        console.log('TimeSeriesService: Loaded cached metrics');
      }
    } catch (error) {
      console.error('TimeSeriesService: Load cache error', error);
    }
  }

  /**
   * Save metrics cache to storage
   */
  async saveCachedMetrics() {
    try {
      const data = Array.from(this.metricsCache.entries());
      await AsyncStorage.setItem('timeSeriesCache', JSON.stringify(data));
    } catch (error) {
      console.error('TimeSeriesService: Save cache error', error);
    }
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(query) {
    return JSON.stringify(query);
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cached) {
    return (Date.now() - cached.timestamp) < cached.ttl;
  }

  /**
   * Parse time range string to milliseconds
   */
  parseTimeRange(timeRange) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([smhdw])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Get retention policy for measurement
   */
  getRetentionPolicy(measurement) {
    return this.retentionPolicies[measurement] || this.retentionPolicies.raw;
  }

  /**
   * Clean up old cached data
   */
  cleanupCache() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, value] of this.metricsCache.entries()) {
      if (value.timestamp && (now - value.timestamp) > maxAge) {
        this.metricsCache.delete(key);
      }
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      pendingMetrics: this.pendingMetrics.length,
      cacheSize: this.metricsCache.size,
      flushInterval: this.flushInterval,
      batchSize: this.batchSize,
      isFlushingActive: !!this.flushTimer
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    console.log('🔥 TimeSeriesService: Shutting down...');
    
    // Stop flushing timer
    this.stopBatchFlushing();
    
    // Flush remaining metrics
    await this.flushMetrics();
    
    // Save cache
    await this.saveCachedMetrics();
    
    console.log('TimeSeriesService: Shutdown complete');
  }
}

export default new TimeSeriesService();
