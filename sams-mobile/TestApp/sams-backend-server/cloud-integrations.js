// SAMS Cloud Platform Integration Service
// Phase 2 Week 6: Multi-Cloud Monitoring Integration

const express = require('express');
const AWS = require('aws-sdk');
const { DefaultAzureCredential } = require('@azure/identity');
const { MonitorClient } = require('@azure/arm-monitor');
const { GoogleAuth } = require('google-auth-library');
const { monitoring } = require('@google-cloud/monitoring');

const app = express();
app.use(express.json());

const PORT = process.env.CLOUD_INTEGRATIONS_PORT || 8084;

class CloudIntegrationsService {
  constructor() {
    this.providers = new Map();
    this.resources = new Map();
    this.metrics = new Map();
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      resourcesDiscovered: 0,
      lastSyncAt: null
    };
    
    this.initializeProviders();
  }

  async initializeProviders() {
    console.log('🔄 Initializing cloud providers...');

    // Initialize AWS
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        this.providers.set('aws', new AWSProvider({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        }));
        console.log('✅ AWS provider initialized');
      } catch (error) {
        console.error('❌ AWS provider initialization failed:', error.message);
      }
    }

    // Initialize Azure
    if (process.env.AZURE_SUBSCRIPTION_ID) {
      try {
        this.providers.set('azure', new AzureProvider({
          subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
          resourceGroupName: process.env.AZURE_RESOURCE_GROUP
        }));
        console.log('✅ Azure provider initialized');
      } catch (error) {
        console.error('❌ Azure provider initialization failed:', error.message);
      }
    }

    // Initialize Google Cloud
    if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
      try {
        this.providers.set('gcp', new GCPProvider({
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        }));
        console.log('✅ Google Cloud provider initialized');
      } catch (error) {
        console.error('❌ Google Cloud provider initialization failed:', error.message);
      }
    }

    console.log(`🔌 ${this.providers.size} cloud providers initialized`);
  }

  async discoverResources(provider = null) {
    console.log('🔍 Starting resource discovery...');
    
    const providers = provider ? [provider] : Array.from(this.providers.keys());
    const discoveredResources = [];

    for (const providerName of providers) {
      const cloudProvider = this.providers.get(providerName);
      if (!cloudProvider) continue;

      try {
        console.log(`🔍 Discovering resources in ${providerName}...`);
        const resources = await cloudProvider.discoverResources();
        
        for (const resource of resources) {
          resource.provider = providerName;
          resource.discoveredAt = new Date().toISOString();
          this.resources.set(`${providerName}:${resource.id}`, resource);
          discoveredResources.push(resource);
        }

        this.stats.resourcesDiscovered += resources.length;
        console.log(`✅ Discovered ${resources.length} resources in ${providerName}`);

      } catch (error) {
        console.error(`❌ Resource discovery failed for ${providerName}:`, error.message);
        this.stats.failedQueries++;
      }
    }

    this.stats.lastSyncAt = new Date().toISOString();
    console.log(`🎉 Resource discovery completed: ${discoveredResources.length} total resources`);
    
    return discoveredResources;
  }

  async getMetrics(provider, resourceId, metricName, timeRange = '1h') {
    this.stats.totalQueries++;

    try {
      const cloudProvider = this.providers.get(provider);
      if (!cloudProvider) {
        throw new Error(`Provider ${provider} not found`);
      }

      const metrics = await cloudProvider.getMetrics(resourceId, metricName, timeRange);
      
      // Cache metrics
      const cacheKey = `${provider}:${resourceId}:${metricName}`;
      this.metrics.set(cacheKey, {
        data: metrics,
        timestamp: new Date().toISOString(),
        timeRange
      });

      this.stats.successfulQueries++;
      console.log(`✅ Retrieved metrics for ${provider}:${resourceId}:${metricName}`);
      
      return metrics;

    } catch (error) {
      this.stats.failedQueries++;
      console.error(`❌ Failed to get metrics for ${provider}:${resourceId}:`, error.message);
      throw error;
    }
  }

  async getMultiCloudMetrics(resourceType, metricName, timeRange = '1h') {
    const results = {};
    const promises = [];

    for (const [providerName, provider] of this.providers.entries()) {
      promises.push(
        this.getResourcesByType(providerName, resourceType)
          .then(resources => {
            const metricPromises = resources.map(resource =>
              this.getMetrics(providerName, resource.id, metricName, timeRange)
                .then(metrics => ({ resource, metrics }))
                .catch(error => ({ resource, error: error.message }))
            );
            return Promise.all(metricPromises);
          })
          .then(resourceMetrics => {
            results[providerName] = resourceMetrics;
          })
          .catch(error => {
            results[providerName] = { error: error.message };
          })
      );
    }

    await Promise.all(promises);
    return results;
  }

  getResourcesByType(provider, resourceType) {
    const providerResources = Array.from(this.resources.values())
      .filter(resource => resource.provider === provider && resource.type === resourceType);
    return Promise.resolve(providerResources);
  }

  getResourcesByProvider(provider) {
    const providerResources = Array.from(this.resources.values())
      .filter(resource => resource.provider === provider);
    return providerResources;
  }

  getAllResources() {
    return Array.from(this.resources.values());
  }

  getStats() {
    return {
      ...this.stats,
      providers: Array.from(this.providers.keys()),
      totalResources: this.resources.size,
      cachedMetrics: this.metrics.size
    };
  }

  async createDashboard(provider, resourceIds, metrics) {
    const cloudProvider = this.providers.get(provider);
    if (!cloudProvider || !cloudProvider.createDashboard) {
      throw new Error(`Dashboard creation not supported for ${provider}`);
    }

    return await cloudProvider.createDashboard(resourceIds, metrics);
  }
}

// AWS Provider
class AWSProvider {
  constructor(config) {
    this.config = config;
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    
    this.cloudWatch = new AWS.CloudWatch();
    this.ec2 = new AWS.EC2();
    this.rds = new AWS.RDS();
    this.lambda = new AWS.Lambda();
  }

  async discoverResources() {
    const resources = [];

    try {
      // Discover EC2 instances
      const ec2Instances = await this.ec2.describeInstances().promise();
      for (const reservation of ec2Instances.Reservations) {
        for (const instance of reservation.Instances) {
          resources.push({
            id: instance.InstanceId,
            name: this.getInstanceName(instance),
            type: 'ec2-instance',
            state: instance.State.Name,
            region: this.config.region,
            metadata: {
              instanceType: instance.InstanceType,
              platform: instance.Platform || 'linux',
              launchTime: instance.LaunchTime,
              privateIpAddress: instance.PrivateIpAddress,
              publicIpAddress: instance.PublicIpAddress
            }
          });
        }
      }

      // Discover RDS instances
      const rdsInstances = await this.rds.describeDBInstances().promise();
      for (const dbInstance of rdsInstances.DBInstances) {
        resources.push({
          id: dbInstance.DBInstanceIdentifier,
          name: dbInstance.DBInstanceIdentifier,
          type: 'rds-instance',
          state: dbInstance.DBInstanceStatus,
          region: this.config.region,
          metadata: {
            engine: dbInstance.Engine,
            engineVersion: dbInstance.EngineVersion,
            instanceClass: dbInstance.DBInstanceClass,
            allocatedStorage: dbInstance.AllocatedStorage
          }
        });
      }

      // Discover Lambda functions
      const lambdaFunctions = await this.lambda.listFunctions().promise();
      for (const func of lambdaFunctions.Functions) {
        resources.push({
          id: func.FunctionName,
          name: func.FunctionName,
          type: 'lambda-function',
          state: func.State,
          region: this.config.region,
          metadata: {
            runtime: func.Runtime,
            memorySize: func.MemorySize,
            timeout: func.Timeout,
            lastModified: func.LastModified
          }
        });
      }

    } catch (error) {
      console.error('AWS resource discovery error:', error);
    }

    return resources;
  }

  async getMetrics(resourceId, metricName, timeRange) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));

    const params = {
      MetricName: metricName,
      Namespace: this.getNamespaceForResource(resourceId),
      StartTime: startTime,
      EndTime: endTime,
      Period: 300, // 5 minutes
      Statistics: ['Average', 'Maximum'],
      Dimensions: this.getDimensionsForResource(resourceId)
    };

    const result = await this.cloudWatch.getMetricStatistics(params).promise();
    
    return {
      metricName,
      datapoints: result.Datapoints.map(dp => ({
        timestamp: dp.Timestamp,
        average: dp.Average,
        maximum: dp.Maximum
      }))
    };
  }

  getInstanceName(instance) {
    const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
    return nameTag ? nameTag.Value : instance.InstanceId;
  }

  getNamespaceForResource(resourceId) {
    if (resourceId.startsWith('i-')) return 'AWS/EC2';
    if (resourceId.includes('lambda')) return 'AWS/Lambda';
    return 'AWS/RDS';
  }

  getDimensionsForResource(resourceId) {
    if (resourceId.startsWith('i-')) {
      return [{ Name: 'InstanceId', Value: resourceId }];
    }
    if (resourceId.includes('lambda')) {
      return [{ Name: 'FunctionName', Value: resourceId }];
    }
    return [{ Name: 'DBInstanceIdentifier', Value: resourceId }];
  }

  parseTimeRange(timeRange) {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return 60 * 60 * 1000; // 1 hour default
    }
  }
}

// Azure Provider
class AzureProvider {
  constructor(config) {
    this.config = config;
    this.credential = new DefaultAzureCredential();
    this.monitorClient = new MonitorClient(this.credential, config.subscriptionId);
  }

  async discoverResources() {
    const resources = [];
    
    try {
      // This would implement Azure resource discovery
      // For now, return empty array as placeholder
      console.log('Azure resource discovery not fully implemented yet');
    } catch (error) {
      console.error('Azure resource discovery error:', error);
    }

    return resources;
  }

  async getMetrics(resourceId, metricName, timeRange) {
    // Azure metrics implementation would go here
    throw new Error('Azure metrics not implemented yet');
  }
}

// Google Cloud Provider
class GCPProvider {
  constructor(config) {
    this.config = config;
    this.auth = new GoogleAuth({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    this.monitoringClient = new monitoring.MetricServiceClient({ auth: this.auth });
  }

  async discoverResources() {
    const resources = [];
    
    try {
      // This would implement GCP resource discovery
      // For now, return empty array as placeholder
      console.log('GCP resource discovery not fully implemented yet');
    } catch (error) {
      console.error('GCP resource discovery error:', error);
    }

    return resources;
  }

  async getMetrics(resourceId, metricName, timeRange) {
    // GCP metrics implementation would go here
    throw new Error('GCP metrics not implemented yet');
  }
}

// Initialize service
const cloudService = new CloudIntegrationsService();

// REST API Endpoints
app.get('/api/v1/cloud/health', (req, res) => {
  res.json({
    success: true,
    service: 'SAMS Cloud Integrations Service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/cloud/stats', (req, res) => {
  res.json({
    success: true,
    data: cloudService.getStats(),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/v1/cloud/discover', async (req, res) => {
  const { provider } = req.body;

  try {
    const resources = await cloudService.discoverResources(provider);
    res.json({
      success: true,
      data: {
        resourcesFound: resources.length,
        resources: resources
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/cloud/resources', (req, res) => {
  const { provider, type } = req.query;
  
  let resources;
  if (provider) {
    resources = cloudService.getResourcesByProvider(provider);
  } else {
    resources = cloudService.getAllResources();
  }

  if (type) {
    resources = resources.filter(r => r.type === type);
  }

  res.json({
    success: true,
    data: {
      totalResources: resources.length,
      resources: resources
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/cloud/metrics/:provider/:resourceId/:metricName', async (req, res) => {
  const { provider, resourceId, metricName } = req.params;
  const { timeRange = '1h' } = req.query;

  try {
    const metrics = await cloudService.getMetrics(provider, resourceId, metricName, timeRange);
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/cloud/metrics/multi-cloud/:resourceType/:metricName', async (req, res) => {
  const { resourceType, metricName } = req.params;
  const { timeRange = '1h' } = req.query;

  try {
    const metrics = await cloudService.getMultiCloudMetrics(resourceType, metricName, timeRange);
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/cloud/dashboard/:provider', async (req, res) => {
  const { provider } = req.params;
  const { resourceIds, metrics } = req.body;

  try {
    const dashboard = await cloudService.createDashboard(provider, resourceIds, metrics);
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`☁️ SAMS Cloud Integrations Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/cloud/health`);
  console.log(`📈 Stats: http://localhost:${PORT}/api/v1/cloud/stats`);
  console.log(`🚀 Ready for multi-cloud monitoring!`);
});

module.exports = { cloudService, CloudIntegrationsService };
