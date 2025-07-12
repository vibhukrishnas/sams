// SAMS Comprehensive Data Processing Pipeline
// Phase 2 Week 5: Integrated Real-time and Batch Processing

const { dataPipeline } = require('./kafka-producer');
const { influxClient } = require('./influx-client');
const { connectionManager } = require('./websocket-server');
const cron = require('node-cron');
const _ = require('lodash');

class SAMSDataPipeline {
  constructor() {
    this.isRunning = false;
    this.processingStats = {
      metricsProcessed: 0,
      alertsProcessed: 0,
      batchJobsCompleted: 0,
      errors: 0,
      lastProcessedAt: null,
      uptime: new Date()
    };
    
    this.thresholds = {
      cpu: { warning: 80, critical: 95 },
      memory: { warning: 85, critical: 95 },
      disk: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 5000 }
    };

    this.aggregationWindows = {
      realtime: 60000,    // 1 minute
      short: 300000,      // 5 minutes  
      medium: 1800000,    // 30 minutes
      long: 3600000       // 1 hour
    };

    this.dataBuffer = {
      metrics: new Map(),
      alerts: new Map(),
      events: new Map()
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing SAMS Data Processing Pipeline...');

      // Initialize all components
      await Promise.all([
        dataPipeline.initialize(),
        influxClient.initialize()
      ]);

      // Setup data processing workflows
      this.setupMetricsProcessing();
      this.setupAlertProcessing();
      this.setupBatchJobs();
      this.setupMonitoring();

      this.isRunning = true;
      console.log('✅ SAMS Data Pipeline initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize data pipeline:', error);
      this.isRunning = false;
    }
  }

  setupMetricsProcessing() {
    // Real-time metrics processing
    setInterval(async () => {
      await this.processRealtimeMetrics();
    }, this.aggregationWindows.realtime);

    console.log('📊 Real-time metrics processing setup complete');
  }

  setupAlertProcessing() {
    // Alert correlation and processing
    setInterval(async () => {
      await this.processAlerts();
    }, 30000); // Every 30 seconds

    console.log('🚨 Alert processing setup complete');
  }

  setupBatchJobs() {
    // Hourly aggregation
    cron.schedule('0 * * * *', async () => {
      await this.runHourlyAggregation();
    });

    // Daily cleanup
    cron.schedule('0 2 * * *', async () => {
      await this.runDailyCleanup();
    });

    // Weekly backup
    cron.schedule('0 3 * * 0', async () => {
      await this.runWeeklyBackup();
    });

    console.log('⏰ Batch jobs scheduled');
  }

  setupMonitoring() {
    // Pipeline health monitoring
    setInterval(async () => {
      await this.monitorPipelineHealth();
    }, 60000); // Every minute

    console.log('🔍 Pipeline monitoring setup complete');
  }

  // Process incoming server metrics
  async processServerMetrics(serverId, metrics, timestamp = new Date()) {
    try {
      // Validate metrics
      const validatedMetrics = this.validateMetrics(metrics);
      
      // Store in InfluxDB
      await influxClient.writeServerMetrics(serverId, validatedMetrics, timestamp);
      
      // Send to Kafka for stream processing
      await dataPipeline.produceMetrics(serverId, validatedMetrics);
      
      // Check for threshold violations
      const alerts = this.checkThresholds(serverId, validatedMetrics);
      for (const alert of alerts) {
        await this.processAlert(alert);
      }
      
      // Real-time WebSocket broadcast
      if (connectionManager) {
        connectionManager.broadcast('server_metrics', {
          serverId: serverId,
          metrics: validatedMetrics,
          timestamp: timestamp.toISOString()
        });
      }
      
      this.processingStats.metricsProcessed++;
      this.processingStats.lastProcessedAt = new Date().toISOString();
      
    } catch (error) {
      console.error(`❌ Error processing metrics for server ${serverId}:`, error);
      this.processingStats.errors++;
    }
  }

  // Process application metrics
  async processApplicationMetrics(appId, serverId, metrics, timestamp = new Date()) {
    try {
      const validatedMetrics = this.validateApplicationMetrics(metrics);
      
      // Store in InfluxDB
      await influxClient.writeApplicationMetrics(appId, serverId, validatedMetrics, timestamp);
      
      // Check application-specific thresholds
      const alerts = this.checkApplicationThresholds(appId, serverId, validatedMetrics);
      for (const alert of alerts) {
        await this.processAlert(alert);
      }
      
      // Real-time broadcast
      if (connectionManager) {
        connectionManager.broadcast('app_metrics', {
          appId: appId,
          serverId: serverId,
          metrics: validatedMetrics,
          timestamp: timestamp.toISOString()
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing app metrics for ${appId}:`, error);
      this.processingStats.errors++;
    }
  }

  // Process alerts with correlation
  async processAlert(alert) {
    try {
      // Add correlation ID and deduplication
      const correlatedAlert = await this.correlateAlert(alert);
      
      // Store alert metrics
      await influxClient.writeAlertMetrics(
        correlatedAlert.id,
        correlatedAlert.serverId,
        correlatedAlert,
        new Date()
      );
      
      // Send to Kafka for further processing
      await dataPipeline.produceAlert(correlatedAlert);
      
      // Real-time alert broadcast
      if (connectionManager) {
        connectionManager.broadcast('alerts', {
          type: 'new_alert',
          alert: correlatedAlert
        });
      }
      
      this.processingStats.alertsProcessed++;
      
    } catch (error) {
      console.error('❌ Error processing alert:', error);
      this.processingStats.errors++;
    }
  }

  // Real-time metrics aggregation
  async processRealtimeMetrics() {
    try {
      const now = new Date();
      const aggregatedData = {};
      
      // Get recent metrics from InfluxDB
      const recentMetrics = await influxClient.queryDashboardMetrics('5m');
      
      // Group by server and calculate aggregations
      const groupedMetrics = _.groupBy(recentMetrics, 'server_id');
      
      for (const [serverId, metrics] of Object.entries(groupedMetrics)) {
        const cpuValues = metrics.filter(m => m._field === 'cpu_usage').map(m => m._value);
        const memoryValues = metrics.filter(m => m._field === 'memory_usage').map(m => m._value);
        const diskValues = metrics.filter(m => m._field === 'disk_usage').map(m => m._value);
        
        if (cpuValues.length > 0) {
          aggregatedData[serverId] = {
            serverId: parseInt(serverId),
            timestamp: now.toISOString(),
            cpu: {
              current: _.last(cpuValues),
              avg: _.mean(cpuValues),
              min: _.min(cpuValues),
              max: _.max(cpuValues)
            },
            memory: {
              current: _.last(memoryValues),
              avg: _.mean(memoryValues),
              min: _.min(memoryValues),
              max: _.max(memoryValues)
            },
            disk: {
              current: _.last(diskValues),
              avg: _.mean(diskValues),
              min: _.min(diskValues),
              max: _.max(diskValues)
            }
          };
        }
      }
      
      // Broadcast aggregated data
      if (Object.keys(aggregatedData).length > 0 && connectionManager) {
        connectionManager.broadcast('aggregated_metrics', {
          type: 'realtime_aggregation',
          data: aggregatedData,
          window: 'realtime'
        });
      }
      
    } catch (error) {
      console.error('❌ Error in realtime metrics processing:', error);
    }
  }

  // Hourly batch aggregation
  async runHourlyAggregation() {
    try {
      console.log('🔄 Running hourly aggregation...');
      
      const hourlyStats = await influxClient.queryDashboardMetrics('1h');
      
      // Process and store aggregated data
      const aggregatedData = this.aggregateHourlyData(hourlyStats);
      
      // Store aggregated results
      for (const [serverId, data] of Object.entries(aggregatedData)) {
        await influxClient.writeCustomMetrics(
          'hourly_aggregation',
          { server_id: serverId, aggregation_type: 'hourly' },
          data,
          new Date()
        );
      }
      
      this.processingStats.batchJobsCompleted++;
      console.log('✅ Hourly aggregation completed');
      
    } catch (error) {
      console.error('❌ Error in hourly aggregation:', error);
    }
  }

  // Daily cleanup job
  async runDailyCleanup() {
    try {
      console.log('🧹 Running daily cleanup...');
      
      // Clean up old data
      await influxClient.cleanupOldData(30);
      
      // Clean up old alerts
      await this.cleanupOldAlerts();
      
      // Generate daily report
      await this.generateDailyReport();
      
      console.log('✅ Daily cleanup completed');
      
    } catch (error) {
      console.error('❌ Error in daily cleanup:', error);
    }
  }

  // Weekly backup
  async runWeeklyBackup() {
    try {
      console.log('💾 Running weekly backup...');
      
      const backupData = await influxClient.createBackup();
      
      // In production, you'd store this to cloud storage
      console.log(`✅ Weekly backup completed: ${backupData.length} records`);
      
    } catch (error) {
      console.error('❌ Error in weekly backup:', error);
    }
  }

  // Validate incoming metrics
  validateMetrics(metrics) {
    const validated = {};
    
    // Ensure numeric values are within reasonable ranges
    validated.cpu = Math.max(0, Math.min(100, parseFloat(metrics.cpu) || 0));
    validated.memory = Math.max(0, Math.min(100, parseFloat(metrics.memory) || 0));
    validated.disk = Math.max(0, Math.min(100, parseFloat(metrics.disk) || 0));
    validated.networkIn = Math.max(0, parseFloat(metrics.networkIn) || 0);
    validated.networkOut = Math.max(0, parseFloat(metrics.networkOut) || 0);
    validated.loadAverage = Math.max(0, parseFloat(metrics.loadAverage) || 0);
    validated.activeConnections = Math.max(0, parseInt(metrics.activeConnections) || 0);
    
    // Optional fields
    if (metrics.temperature) {
      validated.temperature = parseFloat(metrics.temperature);
    }
    if (metrics.serverName) {
      validated.serverName = metrics.serverName.toString();
    }
    if (metrics.environment) {
      validated.environment = metrics.environment.toString();
    }
    
    return validated;
  }

  validateApplicationMetrics(metrics) {
    return {
      responseTime: Math.max(0, parseFloat(metrics.responseTime) || 0),
      requestCount: Math.max(0, parseInt(metrics.requestCount) || 0),
      errorCount: Math.max(0, parseInt(metrics.errorCount) || 0),
      throughput: Math.max(0, parseFloat(metrics.throughput) || 0),
      cpuUsage: Math.max(0, Math.min(100, parseFloat(metrics.cpuUsage) || 0)),
      memoryUsage: Math.max(0, Math.min(100, parseFloat(metrics.memoryUsage) || 0)),
      appName: metrics.appName?.toString() || 'unknown'
    };
  }

  // Check metric thresholds
  checkThresholds(serverId, metrics) {
    const alerts = [];
    const timestamp = new Date().toISOString();
    
    // CPU threshold check
    if (metrics.cpu >= this.thresholds.cpu.critical) {
      alerts.push({
        id: `cpu-critical-${serverId}-${Date.now()}`,
        serverId: serverId,
        type: 'cpu_critical',
        severity: 'critical',
        title: 'Critical CPU Usage',
        message: `CPU usage is ${metrics.cpu}% (critical threshold: ${this.thresholds.cpu.critical}%)`,
        value: metrics.cpu,
        threshold: this.thresholds.cpu.critical,
        timestamp: timestamp
      });
    } else if (metrics.cpu >= this.thresholds.cpu.warning) {
      alerts.push({
        id: `cpu-warning-${serverId}-${Date.now()}`,
        serverId: serverId,
        type: 'cpu_warning',
        severity: 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is ${metrics.cpu}% (warning threshold: ${this.thresholds.cpu.warning}%)`,
        value: metrics.cpu,
        threshold: this.thresholds.cpu.warning,
        timestamp: timestamp
      });
    }
    
    // Memory threshold check
    if (metrics.memory >= this.thresholds.memory.critical) {
      alerts.push({
        id: `memory-critical-${serverId}-${Date.now()}`,
        serverId: serverId,
        type: 'memory_critical',
        severity: 'critical',
        title: 'Critical Memory Usage',
        message: `Memory usage is ${metrics.memory}% (critical threshold: ${this.thresholds.memory.critical}%)`,
        value: metrics.memory,
        threshold: this.thresholds.memory.critical,
        timestamp: timestamp
      });
    } else if (metrics.memory >= this.thresholds.memory.warning) {
      alerts.push({
        id: `memory-warning-${serverId}-${Date.now()}`,
        serverId: serverId,
        type: 'memory_warning',
        severity: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is ${metrics.memory}% (warning threshold: ${this.thresholds.memory.warning}%)`,
        value: metrics.memory,
        threshold: this.thresholds.memory.warning,
        timestamp: timestamp
      });
    }
    
    // Disk threshold check
    if (metrics.disk >= this.thresholds.disk.critical) {
      alerts.push({
        id: `disk-critical-${serverId}-${Date.now()}`,
        serverId: serverId,
        type: 'disk_critical',
        severity: 'critical',
        title: 'Critical Disk Usage',
        message: `Disk usage is ${metrics.disk}% (critical threshold: ${this.thresholds.disk.critical}%)`,
        value: metrics.disk,
        threshold: this.thresholds.disk.critical,
        timestamp: timestamp
      });
    } else if (metrics.disk >= this.thresholds.disk.warning) {
      alerts.push({
        id: `disk-warning-${serverId}-${Date.now()}`,
        serverId: serverId,
        type: 'disk_warning',
        severity: 'warning',
        title: 'High Disk Usage',
        message: `Disk usage is ${metrics.disk}% (warning threshold: ${this.thresholds.disk.warning}%)`,
        value: metrics.disk,
        threshold: this.thresholds.disk.warning,
        timestamp: timestamp
      });
    }
    
    return alerts;
  }

  checkApplicationThresholds(appId, serverId, metrics) {
    const alerts = [];
    const timestamp = new Date().toISOString();
    
    // Response time check
    if (metrics.responseTime >= this.thresholds.responseTime.critical) {
      alerts.push({
        id: `response-critical-${appId}-${Date.now()}`,
        appId: appId,
        serverId: serverId,
        type: 'response_time_critical',
        severity: 'critical',
        title: 'Critical Response Time',
        message: `Response time is ${metrics.responseTime}ms (critical threshold: ${this.thresholds.responseTime.critical}ms)`,
        value: metrics.responseTime,
        threshold: this.thresholds.responseTime.critical,
        timestamp: timestamp
      });
    } else if (metrics.responseTime >= this.thresholds.responseTime.warning) {
      alerts.push({
        id: `response-warning-${appId}-${Date.now()}`,
        appId: appId,
        serverId: serverId,
        type: 'response_time_warning',
        severity: 'warning',
        title: 'High Response Time',
        message: `Response time is ${metrics.responseTime}ms (warning threshold: ${this.thresholds.responseTime.warning}ms)`,
        value: metrics.responseTime,
        threshold: this.thresholds.responseTime.warning,
        timestamp: timestamp
      });
    }
    
    return alerts;
  }

  // Alert correlation (simplified)
  async correlateAlert(alert) {
    // Add correlation logic here
    // For now, just add a correlation ID
    return {
      ...alert,
      correlationId: `corr-${alert.serverId}-${alert.type}`,
      processed: true,
      processedAt: new Date().toISOString()
    };
  }

  aggregateHourlyData(rawData) {
    // Implement hourly aggregation logic
    const grouped = _.groupBy(rawData, 'server_id');
    const aggregated = {};
    
    for (const [serverId, data] of Object.entries(grouped)) {
      const cpuData = data.filter(d => d._field === 'cpu_usage');
      const memoryData = data.filter(d => d._field === 'memory_usage');
      const diskData = data.filter(d => d._field === 'disk_usage');
      
      aggregated[serverId] = {
        cpu_avg: _.mean(cpuData.map(d => d._value)),
        cpu_max: _.max(cpuData.map(d => d._value)),
        memory_avg: _.mean(memoryData.map(d => d._value)),
        memory_max: _.max(memoryData.map(d => d._value)),
        disk_avg: _.mean(diskData.map(d => d._value)),
        disk_max: _.max(diskData.map(d => d._value)),
        data_points: data.length
      };
    }
    
    return aggregated;
  }

  async cleanupOldAlerts() {
    // Implement alert cleanup logic
    console.log('🧹 Cleaning up old alerts...');
  }

  async generateDailyReport() {
    // Generate daily performance report
    console.log('📊 Generating daily report...');
  }

  async monitorPipelineHealth() {
    try {
      const kafkaStats = dataPipeline.getStats();
      const influxStats = await influxClient.getPerformanceStats();
      
      const healthStatus = {
        timestamp: new Date().toISOString(),
        kafka: kafkaStats,
        influx: influxStats,
        pipeline: this.processingStats,
        overall: this.isRunning && kafkaStats.isConnected && influxStats.isConnected
      };
      
      // Broadcast health status
      if (connectionManager) {
        connectionManager.broadcast('pipeline_health', healthStatus);
      }
      
    } catch (error) {
      console.error('❌ Error monitoring pipeline health:', error);
    }
  }

  getStats() {
    return {
      ...this.processingStats,
      isRunning: this.isRunning,
      thresholds: this.thresholds
    };
  }

  async shutdown() {
    console.log('🔄 Shutting down SAMS Data Pipeline...');
    
    this.isRunning = false;
    
    try {
      await Promise.all([
        dataPipeline.shutdown(),
        influxClient.shutdown()
      ]);
      
      console.log('✅ SAMS Data Pipeline shutdown complete');
    } catch (error) {
      console.error('❌ Error during pipeline shutdown:', error);
    }
  }
}

// Create and export pipeline instance
const samsPipeline = new SAMSDataPipeline();

// Graceful shutdown
process.on('SIGINT', async () => {
  await samsPipeline.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await samsPipeline.shutdown();
  process.exit(0);
});

module.exports = {
  samsPipeline,
  SAMSDataPipeline
};

// Start pipeline if run directly
if (require.main === module) {
  samsPipeline.initialize().then(() => {
    console.log('🚀 SAMS Comprehensive Data Pipeline started');
  });
}
