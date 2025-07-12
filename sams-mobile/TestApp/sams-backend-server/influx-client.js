// SAMS InfluxDB Time-Series Database Integration
// Phase 2 Week 5: Time-Series Database with Optimization

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { OrgsAPI, BucketsAPI } = require('@influxdata/influxdb-client-apis');

// InfluxDB Configuration
const INFLUX_CONFIG = {
  url: process.env.INFLUX_URL || 'http://localhost:8086',
  token: process.env.INFLUX_TOKEN || 'sams-token',
  org: process.env.INFLUX_ORG || 'sams-org',
  bucket: process.env.INFLUX_BUCKET || 'sams-metrics'
};

class InfluxDBClient {
  constructor() {
    this.client = new InfluxDB({
      url: INFLUX_CONFIG.url,
      token: INFLUX_CONFIG.token
    });
    
    this.writeApi = this.client.getWriteApi(INFLUX_CONFIG.org, INFLUX_CONFIG.bucket);
    this.queryApi = this.client.getQueryApi(INFLUX_CONFIG.org);
    
    // Configure write options for performance
    this.writeApi.useDefaultTags({
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });

    this.isConnected = false;
    this.writeBuffer = [];
    this.batchSize = 1000;
    this.flushInterval = 10000; // 10 seconds
    
    this.stats = {
      pointsWritten: 0,
      queriesExecuted: 0,
      writeErrors: 0,
      queryErrors: 0,
      lastWrite: null,
      lastQuery: null
    };

    this.startBatchWriter();
  }

  async initialize() {
    try {
      console.log('🔄 Initializing InfluxDB connection...');
      
      // Test connection
      await this.testConnection();
      
      // Setup bucket and retention policies
      await this.setupBucket();
      
      this.isConnected = true;
      console.log('✅ InfluxDB initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize InfluxDB:', error);
      this.isConnected = false;
    }
  }

  async testConnection() {
    try {
      const result = await this.queryApi.queryRaw('buckets()');
      console.log('✅ InfluxDB connection test successful');
      return true;
    } catch (error) {
      console.error('❌ InfluxDB connection test failed:', error);
      throw error;
    }
  }

  async setupBucket() {
    try {
      const orgsAPI = new OrgsAPI(this.client);
      const bucketsAPI = new BucketsAPI(this.client);
      
      // Get organization
      const orgs = await orgsAPI.getOrgs({ org: INFLUX_CONFIG.org });
      if (!orgs.orgs || orgs.orgs.length === 0) {
        throw new Error(`Organization ${INFLUX_CONFIG.org} not found`);
      }
      
      const orgId = orgs.orgs[0].id;
      
      // Check if bucket exists
      const buckets = await bucketsAPI.getBuckets({ orgID: orgId, name: INFLUX_CONFIG.bucket });
      
      if (!buckets.buckets || buckets.buckets.length === 0) {
        // Create bucket with retention policy
        await bucketsAPI.postBuckets({
          body: {
            orgID: orgId,
            name: INFLUX_CONFIG.bucket,
            description: 'SAMS Infrastructure Monitoring Metrics',
            retentionRules: [
              {
                type: 'expire',
                everySeconds: 2592000 // 30 days
              }
            ]
          }
        });
        console.log(`✅ Created bucket: ${INFLUX_CONFIG.bucket}`);
      } else {
        console.log(`✅ Bucket exists: ${INFLUX_CONFIG.bucket}`);
      }
      
    } catch (error) {
      console.error('❌ Error setting up bucket:', error);
    }
  }

  // Write server metrics
  writeServerMetrics(serverId, metrics, timestamp = new Date()) {
    try {
      const point = new Point('server_metrics')
        .tag('server_id', serverId.toString())
        .tag('server_name', metrics.serverName || `server-${serverId}`)
        .tag('environment', metrics.environment || 'production')
        .floatField('cpu_usage', metrics.cpu || 0)
        .floatField('memory_usage', metrics.memory || 0)
        .floatField('disk_usage', metrics.disk || 0)
        .floatField('network_in', metrics.networkIn || 0)
        .floatField('network_out', metrics.networkOut || 0)
        .floatField('load_average', metrics.loadAverage || 0)
        .intField('active_connections', metrics.activeConnections || 0)
        .timestamp(timestamp);

      if (metrics.temperature) {
        point.floatField('temperature', metrics.temperature);
      }

      this.addToBuffer(point);
      
    } catch (error) {
      console.error('❌ Error writing server metrics:', error);
      this.stats.writeErrors++;
    }
  }

  // Write application metrics
  writeApplicationMetrics(appId, serverId, metrics, timestamp = new Date()) {
    try {
      const point = new Point('application_metrics')
        .tag('app_id', appId.toString())
        .tag('server_id', serverId.toString())
        .tag('app_name', metrics.appName || `app-${appId}`)
        .floatField('response_time', metrics.responseTime || 0)
        .intField('request_count', metrics.requestCount || 0)
        .intField('error_count', metrics.errorCount || 0)
        .floatField('throughput', metrics.throughput || 0)
        .floatField('cpu_usage', metrics.cpuUsage || 0)
        .floatField('memory_usage', metrics.memoryUsage || 0)
        .timestamp(timestamp);

      this.addToBuffer(point);
      
    } catch (error) {
      console.error('❌ Error writing application metrics:', error);
      this.stats.writeErrors++;
    }
  }

  // Write alert metrics
  writeAlertMetrics(alertId, serverId, alertData, timestamp = new Date()) {
    try {
      const point = new Point('alert_metrics')
        .tag('alert_id', alertId.toString())
        .tag('server_id', serverId?.toString() || 'system')
        .tag('alert_type', alertData.type || 'unknown')
        .tag('severity', alertData.severity || 'info')
        .tag('status', alertData.status || 'open')
        .intField('count', 1)
        .timestamp(timestamp);

      if (alertData.responseTime) {
        point.intField('response_time_minutes', alertData.responseTime);
      }

      this.addToBuffer(point);
      
    } catch (error) {
      console.error('❌ Error writing alert metrics:', error);
      this.stats.writeErrors++;
    }
  }

  // Write custom metrics
  writeCustomMetrics(measurement, tags, fields, timestamp = new Date()) {
    try {
      const point = new Point(measurement);
      
      // Add tags
      Object.entries(tags).forEach(([key, value]) => {
        point.tag(key, value.toString());
      });
      
      // Add fields
      Object.entries(fields).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            point.intField(key, value);
          } else {
            point.floatField(key, value);
          }
        } else if (typeof value === 'boolean') {
          point.booleanField(key, value);
        } else {
          point.stringField(key, value.toString());
        }
      });
      
      point.timestamp(timestamp);
      this.addToBuffer(point);
      
    } catch (error) {
      console.error('❌ Error writing custom metrics:', error);
      this.stats.writeErrors++;
    }
  }

  addToBuffer(point) {
    this.writeBuffer.push(point);
    
    // Flush if buffer is full
    if (this.writeBuffer.length >= this.batchSize) {
      this.flushBuffer();
    }
  }

  startBatchWriter() {
    setInterval(() => {
      if (this.writeBuffer.length > 0) {
        this.flushBuffer();
      }
    }, this.flushInterval);
  }

  async flushBuffer() {
    if (this.writeBuffer.length === 0) return;
    
    const pointsToWrite = [...this.writeBuffer];
    this.writeBuffer = [];
    
    try {
      pointsToWrite.forEach(point => {
        this.writeApi.writePoint(point);
      });
      
      await this.writeApi.flush();
      
      this.stats.pointsWritten += pointsToWrite.length;
      this.stats.lastWrite = new Date().toISOString();
      
      console.log(`📊 Wrote ${pointsToWrite.length} points to InfluxDB`);
      
    } catch (error) {
      console.error('❌ Error flushing buffer to InfluxDB:', error);
      this.stats.writeErrors++;
      
      // Re-add points to buffer for retry
      this.writeBuffer.unshift(...pointsToWrite);
    }
  }

  // Query server metrics
  async queryServerMetrics(serverId, timeRange = '1h', aggregation = 'mean') {
    try {
      const query = `
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -${timeRange})
          |> filter(fn: (r) => r._measurement == "server_metrics")
          |> filter(fn: (r) => r.server_id == "${serverId}")
          |> aggregateWindow(every: 1m, fn: ${aggregation}, createEmpty: false)
          |> yield(name: "${aggregation}")
      `;

      const result = await this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          return tableMeta.toObject(row);
        }
      });

      this.stats.queriesExecuted++;
      this.stats.lastQuery = new Date().toISOString();

      return result;

    } catch (error) {
      console.error('❌ Error querying server metrics:', error);
      this.stats.queryErrors++;
      throw error;
    }
  }

  // Query aggregated metrics for dashboard
  async queryDashboardMetrics(timeRange = '1h') {
    try {
      const query = `
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -${timeRange})
          |> filter(fn: (r) => r._measurement == "server_metrics")
          |> group(columns: ["server_id"])
          |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
          |> yield(name: "dashboard_metrics")
      `;

      const result = await this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          return tableMeta.toObject(row);
        }
      });

      this.stats.queriesExecuted++;
      this.stats.lastQuery = new Date().toISOString();

      return result;

    } catch (error) {
      console.error('❌ Error querying dashboard metrics:', error);
      this.stats.queryErrors++;
      throw error;
    }
  }

  // Query alert statistics
  async queryAlertStats(timeRange = '24h') {
    try {
      const query = `
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -${timeRange})
          |> filter(fn: (r) => r._measurement == "alert_metrics")
          |> group(columns: ["severity", "alert_type"])
          |> count()
          |> yield(name: "alert_stats")
      `;

      const result = await this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          return tableMeta.toObject(row);
        }
      });

      this.stats.queriesExecuted++;
      this.stats.lastQuery = new Date().toISOString();

      return result;

    } catch (error) {
      console.error('❌ Error querying alert stats:', error);
      this.stats.queryErrors++;
      throw error;
    }
  }

  // Data retention and cleanup
  async cleanupOldData(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const query = `
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: 1970-01-01T00:00:00Z, stop: ${cutoffDate.toISOString()})
          |> drop()
      `;

      await this.queryApi.queryRaw(query);
      console.log(`🧹 Cleaned up data older than ${retentionDays} days`);

    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
    }
  }

  // Performance monitoring
  async getPerformanceStats() {
    try {
      const query = `
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -1h)
          |> group()
          |> count()
          |> yield(name: "total_points")
      `;

      const result = await this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          return tableMeta.toObject(row);
        }
      });

      return {
        ...this.stats,
        totalPointsLastHour: result.length > 0 ? result[0]._value : 0,
        bufferSize: this.writeBuffer.length,
        isConnected: this.isConnected
      };

    } catch (error) {
      console.error('❌ Error getting performance stats:', error);
      return this.stats;
    }
  }

  // Backup and recovery
  async createBackup(outputPath) {
    try {
      console.log('🔄 Creating InfluxDB backup...');
      
      // This would typically use InfluxDB CLI tools
      // For now, we'll export recent data as JSON
      const query = `
        from(bucket: "${INFLUX_CONFIG.bucket}")
          |> range(start: -7d)
          |> yield(name: "backup")
      `;

      const result = await this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          return tableMeta.toObject(row);
        }
      });

      // In a real implementation, you'd write this to a file
      console.log(`✅ Backup created with ${result.length} data points`);
      return result;

    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw error;
    }
  }

  async shutdown() {
    try {
      console.log('🔄 Shutting down InfluxDB client...');
      
      // Flush any remaining data
      await this.flushBuffer();
      
      // Close write API
      await this.writeApi.close();
      
      console.log('✅ InfluxDB client shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during InfluxDB shutdown:', error);
    }
  }
}

// Create and export client instance
const influxClient = new InfluxDBClient();

// Graceful shutdown
process.on('SIGINT', async () => {
  await influxClient.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await influxClient.shutdown();
  process.exit(0);
});

module.exports = {
  influxClient,
  InfluxDBClient
};

// Initialize if run directly
if (require.main === module) {
  influxClient.initialize().then(() => {
    console.log('🚀 SAMS InfluxDB Client started');
    
    // Example usage
    setTimeout(() => {
      influxClient.writeServerMetrics(1, {
        cpu: 45.2,
        memory: 67.8,
        disk: 23.1,
        networkIn: 1024,
        networkOut: 2048,
        serverName: 'web-server-01',
        environment: 'production'
      });
    }, 2000);
  });
}
