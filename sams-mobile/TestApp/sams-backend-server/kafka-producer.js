// SAMS Kafka Data Processing Pipeline
// Phase 2 Week 5: Real-time Data Pipeline with Stream Processing

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

// Kafka Configuration
const kafka = Kafka({
  clientId: 'sams-producer',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

const consumer = kafka.consumer({ 
  groupId: 'sams-processing-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Topics Configuration
const TOPICS = {
  METRICS: 'sams-metrics',
  ALERTS: 'sams-alerts', 
  EVENTS: 'sams-events',
  LOGS: 'sams-logs',
  PROCESSED_METRICS: 'sams-processed-metrics',
  AGGREGATED_DATA: 'sams-aggregated-data'
};

class DataPipeline {
  constructor() {
    this.isConnected = false;
    this.messageBuffer = [];
    this.processingStats = {
      messagesProduced: 0,
      messagesConsumed: 0,
      processingErrors: 0,
      lastProcessedAt: null
    };
    this.aggregationWindow = 60000; // 1 minute
    this.metricsBuffer = new Map();
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Kafka Data Pipeline...');
      
      // Connect producer
      await producer.connect();
      console.log('✅ Kafka Producer connected');

      // Connect consumer
      await consumer.connect();
      console.log('✅ Kafka Consumer connected');

      // Create topics if they don't exist
      await this.createTopics();

      // Subscribe to topics
      await consumer.subscribe({ 
        topics: [TOPICS.METRICS, TOPICS.ALERTS, TOPICS.EVENTS],
        fromBeginning: false 
      });

      // Start consuming
      await this.startConsumer();

      // Start aggregation process
      this.startAggregation();

      this.isConnected = true;
      console.log('🚀 Kafka Data Pipeline initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Kafka pipeline:', error);
      this.isConnected = false;
    }
  }

  async createTopics() {
    const admin = kafka.admin();
    await admin.connect();

    try {
      const topicConfigs = Object.values(TOPICS).map(topic => ({
        topic: topic,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          { name: 'cleanup.policy', value: 'delete' },
          { name: 'retention.ms', value: '604800000' }, // 7 days
          { name: 'segment.ms', value: '86400000' } // 1 day
        ]
      }));

      await admin.createTopics({
        topics: topicConfigs,
        waitForLeaders: true
      });

      console.log('✅ Kafka topics created/verified');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('❌ Error creating topics:', error);
      }
    } finally {
      await admin.disconnect();
    }
  }

  async produceMetrics(serverId, metrics) {
    if (!this.isConnected) {
      this.messageBuffer.push({ type: 'metrics', serverId, metrics });
      return;
    }

    try {
      const message = {
        key: serverId.toString(),
        value: JSON.stringify({
          serverId: serverId,
          metrics: metrics,
          timestamp: new Date().toISOString(),
          messageId: uuidv4()
        }),
        timestamp: Date.now()
      };

      await producer.send({
        topic: TOPICS.METRICS,
        messages: [message]
      });

      this.processingStats.messagesProduced++;
      console.log(`📊 Metrics sent for server ${serverId}`);

    } catch (error) {
      console.error('❌ Error producing metrics:', error);
      this.processingStats.processingErrors++;
    }
  }

  async produceAlert(alert) {
    if (!this.isConnected) {
      this.messageBuffer.push({ type: 'alert', alert });
      return;
    }

    try {
      const message = {
        key: alert.serverId?.toString() || 'system',
        value: JSON.stringify({
          ...alert,
          timestamp: new Date().toISOString(),
          messageId: uuidv4()
        }),
        timestamp: Date.now()
      };

      await producer.send({
        topic: TOPICS.ALERTS,
        messages: [message]
      });

      this.processingStats.messagesProduced++;
      console.log(`🚨 Alert sent: ${alert.title}`);

    } catch (error) {
      console.error('❌ Error producing alert:', error);
      this.processingStats.processingErrors++;
    }
  }

  async produceEvent(event) {
    if (!this.isConnected) {
      this.messageBuffer.push({ type: 'event', event });
      return;
    }

    try {
      const message = {
        key: event.type || 'system',
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          messageId: uuidv4()
        }),
        timestamp: Date.now()
      };

      await producer.send({
        topic: TOPICS.EVENTS,
        messages: [message]
      });

      this.processingStats.messagesProduced++;
      console.log(`📝 Event sent: ${event.type}`);

    } catch (error) {
      console.error('❌ Error producing event:', error);
      this.processingStats.processingErrors++;
    }
  }

  async startConsumer() {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          
          switch (topic) {
            case TOPICS.METRICS:
              await this.processMetrics(data);
              break;
            case TOPICS.ALERTS:
              await this.processAlert(data);
              break;
            case TOPICS.EVENTS:
              await this.processEvent(data);
              break;
          }

          this.processingStats.messagesConsumed++;
          this.processingStats.lastProcessedAt = new Date().toISOString();

        } catch (error) {
          console.error(`❌ Error processing message from ${topic}:`, error);
          this.processingStats.processingErrors++;
        }
      }
    });
  }

  async processMetrics(data) {
    // Real-time metrics processing
    const { serverId, metrics, timestamp } = data;
    
    // Store in buffer for aggregation
    if (!this.metricsBuffer.has(serverId)) {
      this.metricsBuffer.set(serverId, []);
    }
    
    this.metricsBuffer.get(serverId).push({
      ...metrics,
      timestamp: timestamp
    });

    // Trigger alerts based on thresholds
    await this.checkMetricThresholds(serverId, metrics);

    // Send processed metrics to another topic
    await this.sendProcessedMetrics(serverId, metrics, timestamp);
  }

  async processAlert(data) {
    // Alert correlation and deduplication
    console.log(`🔍 Processing alert: ${data.title}`);
    
    // Here you would implement alert correlation logic
    // For now, just log the alert processing
    
    // Send to notification system (WebSocket, email, etc.)
    // This would integrate with your notification service
  }

  async processEvent(data) {
    // Event processing and logging
    console.log(`📋 Processing event: ${data.type}`);
    
    // Store events for audit trail
    // Trigger workflows based on event types
  }

  async checkMetricThresholds(serverId, metrics) {
    const alerts = [];

    // CPU threshold check
    if (metrics.cpu > 85) {
      alerts.push({
        serverId: serverId,
        type: 'cpu_high',
        title: 'High CPU Usage',
        message: `CPU usage is ${metrics.cpu}% (threshold: 85%)`,
        severity: metrics.cpu > 95 ? 'critical' : 'warning',
        timestamp: new Date().toISOString()
      });
    }

    // Memory threshold check
    if (metrics.memory > 90) {
      alerts.push({
        serverId: serverId,
        type: 'memory_high',
        title: 'High Memory Usage',
        message: `Memory usage is ${metrics.memory}% (threshold: 90%)`,
        severity: metrics.memory > 95 ? 'critical' : 'warning',
        timestamp: new Date().toISOString()
      });
    }

    // Disk threshold check
    if (metrics.disk > 85) {
      alerts.push({
        serverId: serverId,
        type: 'disk_high',
        title: 'High Disk Usage',
        message: `Disk usage is ${metrics.disk}% (threshold: 85%)`,
        severity: metrics.disk > 95 ? 'critical' : 'warning',
        timestamp: new Date().toISOString()
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.produceAlert(alert);
    }
  }

  async sendProcessedMetrics(serverId, metrics, timestamp) {
    try {
      const processedData = {
        serverId: serverId,
        metrics: {
          ...metrics,
          processed: true,
          processingTimestamp: new Date().toISOString()
        },
        originalTimestamp: timestamp
      };

      await producer.send({
        topic: TOPICS.PROCESSED_METRICS,
        messages: [{
          key: serverId.toString(),
          value: JSON.stringify(processedData),
          timestamp: Date.now()
        }]
      });

    } catch (error) {
      console.error('❌ Error sending processed metrics:', error);
    }
  }

  startAggregation() {
    setInterval(async () => {
      await this.aggregateMetrics();
    }, this.aggregationWindow);
  }

  async aggregateMetrics() {
    const now = new Date();
    const aggregatedData = {};

    for (const [serverId, metrics] of this.metricsBuffer.entries()) {
      if (metrics.length === 0) continue;

      // Calculate aggregations
      const cpuValues = metrics.map(m => m.cpu).filter(v => v !== undefined);
      const memoryValues = metrics.map(m => m.memory).filter(v => v !== undefined);
      const diskValues = metrics.map(m => m.disk).filter(v => v !== undefined);

      if (cpuValues.length > 0) {
        aggregatedData[serverId] = {
          serverId: serverId,
          window: this.aggregationWindow,
          timestamp: now.toISOString(),
          cpu: {
            avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
            min: Math.min(...cpuValues),
            max: Math.max(...cpuValues),
            count: cpuValues.length
          },
          memory: {
            avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
            min: Math.min(...memoryValues),
            max: Math.max(...memoryValues),
            count: memoryValues.length
          },
          disk: {
            avg: diskValues.reduce((a, b) => a + b, 0) / diskValues.length,
            min: Math.min(...diskValues),
            max: Math.max(...diskValues),
            count: diskValues.length
          }
        };
      }

      // Clear processed metrics
      this.metricsBuffer.set(serverId, []);
    }

    // Send aggregated data
    if (Object.keys(aggregatedData).length > 0) {
      await this.sendAggregatedData(aggregatedData);
    }
  }

  async sendAggregatedData(aggregatedData) {
    try {
      const messages = Object.values(aggregatedData).map(data => ({
        key: data.serverId.toString(),
        value: JSON.stringify(data),
        timestamp: Date.now()
      }));

      await producer.send({
        topic: TOPICS.AGGREGATED_DATA,
        messages: messages
      });

      console.log(`📈 Sent aggregated data for ${messages.length} servers`);

    } catch (error) {
      console.error('❌ Error sending aggregated data:', error);
    }
  }

  async flushBufferedMessages() {
    if (this.messageBuffer.length === 0) return;

    console.log(`📤 Flushing ${this.messageBuffer.length} buffered messages`);

    for (const bufferedMessage of this.messageBuffer) {
      try {
        switch (bufferedMessage.type) {
          case 'metrics':
            await this.produceMetrics(bufferedMessage.serverId, bufferedMessage.metrics);
            break;
          case 'alert':
            await this.produceAlert(bufferedMessage.alert);
            break;
          case 'event':
            await this.produceEvent(bufferedMessage.event);
            break;
        }
      } catch (error) {
        console.error('❌ Error flushing buffered message:', error);
      }
    }

    this.messageBuffer = [];
  }

  getStats() {
    return {
      ...this.processingStats,
      isConnected: this.isConnected,
      bufferedMessages: this.messageBuffer.length,
      metricsBufferSize: Array.from(this.metricsBuffer.values())
        .reduce((total, metrics) => total + metrics.length, 0)
    };
  }

  async shutdown() {
    console.log('🔄 Shutting down Kafka pipeline...');
    
    try {
      await consumer.disconnect();
      await producer.disconnect();
      console.log('✅ Kafka pipeline shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

// Create and export pipeline instance
const dataPipeline = new DataPipeline();

// Graceful shutdown
process.on('SIGINT', async () => {
  await dataPipeline.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dataPipeline.shutdown();
  process.exit(0);
});

module.exports = {
  dataPipeline,
  TOPICS
};

// Start pipeline if run directly
if (require.main === module) {
  dataPipeline.initialize().then(() => {
    console.log('🚀 SAMS Kafka Data Pipeline started');
    
    // Flush any buffered messages
    setTimeout(() => {
      dataPipeline.flushBufferedMessages();
    }, 5000);
  });
}
