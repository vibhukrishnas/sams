/**
 * 🐳 Docker Swarm Container Orchestrator
 * Implementation of ContainerOrchestrator for Docker Swarm
 */

import Docker from 'dockerode';
import { ContainerOrchestrator, ResourceMetrics } from './AutoScalingService';
import { logger } from '../../utils/logger';

export interface DockerSwarmConfig {
  serviceName: string;
  dockerHost?: string; // Docker daemon host, defaults to local socket
  dockerPort?: number;
  dockerProtocol?: 'http' | 'https';
  dockerCa?: string;
  dockerCert?: string;
  dockerKey?: string;
}

export class DockerSwarmOrchestrator implements ContainerOrchestrator {
  private docker: Docker;
  private config: DockerSwarmConfig;

  constructor(config: DockerSwarmConfig) {
    this.config = config;
    
    // Initialize Docker client
    const dockerOptions: Docker.DockerOptions = {};
    
    if (config.dockerHost) {
      dockerOptions.host = config.dockerHost;
      dockerOptions.port = config.dockerPort || 2376;
      dockerOptions.protocol = config.dockerProtocol || 'https';
      
      if (config.dockerCa && config.dockerCert && config.dockerKey) {
        dockerOptions.ca = config.dockerCa;
        dockerOptions.cert = config.dockerCert;
        dockerOptions.key = config.dockerKey;
      }
    }

    this.docker = new Docker(dockerOptions);
  }

  /**
   * Get current number of running service replicas
   */
  async getCurrentInstances(): Promise<number> {
    try {
      const service = await this.getService();
      const spec = service.Spec;
      
      if (spec?.Mode?.Replicated) {
        return spec.Mode.Replicated.Replicas || 0;
      } else if (spec?.Mode?.Global) {
        // For global services, count running tasks
        const tasks = await this.getServiceTasks();
        return tasks.filter(task => task.Status?.State === 'running').length;
      }
      
      return 0;
    } catch (error) {
      logger.error('Failed to get current instances from Docker Swarm:', error);
      throw new Error(`Failed to get service replicas: ${error.message}`);
    }
  }

  /**
   * Scale service to specified number of replicas
   */
  async scaleToInstances(count: number): Promise<void> {
    try {
      logger.info(`Scaling Docker Swarm service ${this.config.serviceName} to ${count} replicas`);

      const service = await this.getService();
      const spec = service.Spec;
      
      if (!spec?.Mode?.Replicated) {
        throw new Error('Service is not in replicated mode, cannot scale');
      }

      // Update service spec with new replica count
      spec.Mode.Replicated.Replicas = count;
      
      await this.docker.getService(this.config.serviceName).update({
        version: service.Version?.Index,
        ...spec
      });

      // Wait for scaling to complete
      await this.waitForScaling(count);

      logger.info(`Successfully scaled service to ${count} replicas`);
    } catch (error) {
      logger.error('Failed to scale Docker Swarm service:', error);
      throw new Error(`Failed to scale service: ${error.message}`);
    }
  }

  /**
   * Get resource metrics from all service tasks
   */
  async getInstanceMetrics(): Promise<ResourceMetrics[]> {
    try {
      const tasks = await this.getServiceTasks();
      const runningTasks = tasks.filter(task => task.Status?.State === 'running');

      const metricsPromises = runningTasks.map(task => this.getTaskMetrics(task));
      const taskMetrics = await Promise.all(metricsPromises);

      return taskMetrics.filter(metrics => metrics !== null) as ResourceMetrics[];
    } catch (error) {
      logger.error('Failed to get instance metrics from Docker Swarm:', error);
      return [];
    }
  }

  /**
   * Health check for Docker Swarm connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if Docker daemon is accessible
      await this.docker.ping();
      
      // Check if service exists
      await this.getService();
      
      return true;
    } catch (error) {
      logger.error('Docker Swarm health check failed:', error);
      return false;
    }
  }

  /**
   * Get service information
   */
  async getServiceInfo(): Promise<{
    name: string;
    replicas: number;
    runningTasks: number;
    image: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      const service = await this.getService();
      const tasks = await this.getServiceTasks();
      const runningTasks = tasks.filter(task => task.Status?.State === 'running');

      return {
        name: service.Spec?.Name || '',
        replicas: service.Spec?.Mode?.Replicated?.Replicas || 0,
        runningTasks: runningTasks.length,
        image: service.Spec?.TaskTemplate?.ContainerSpec?.Image || '',
        createdAt: new Date(service.CreatedAt || ''),
        updatedAt: new Date(service.UpdatedAt || '')
      };
    } catch (error) {
      logger.error('Failed to get service info:', error);
      throw error;
    }
  }

  /**
   * Get service logs
   */
  async getServiceLogs(lines: number = 100): Promise<string> {
    try {
      const service = this.docker.getService(this.config.serviceName);
      const logStream = await service.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: true
      });

      return logStream.toString();
    } catch (error) {
      logger.error(`Failed to get logs for service ${this.config.serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Get node information
   */
  async getNodeInfo(): Promise<any[]> {
    try {
      const nodes = await this.docker.listNodes();
      return nodes.map(node => ({
        id: node.ID,
        hostname: node.Description?.Hostname,
        role: node.Spec?.Role,
        availability: node.Spec?.Availability,
        state: node.Status?.State,
        addr: node.Status?.Addr,
        resources: node.Description?.Resources
      }));
    } catch (error) {
      logger.error('Failed to get node info:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getService(): Promise<any> {
    try {
      const service = this.docker.getService(this.config.serviceName);
      return await service.inspect();
    } catch (error) {
      throw new Error(`Service ${this.config.serviceName} not found`);
    }
  }

  private async getServiceTasks(): Promise<any[]> {
    try {
      const tasks = await this.docker.listTasks({
        filters: {
          service: [this.config.serviceName]
        }
      });
      return tasks;
    } catch (error) {
      logger.error('Failed to get service tasks:', error);
      return [];
    }
  }

  private async getTaskMetrics(task: any): Promise<ResourceMetrics | null> {
    try {
      const containerId = task.Status?.ContainerStatus?.ContainerID;
      if (!containerId) return null;

      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU usage percentage
      const cpuUsage = this.calculateCpuUsage(stats);
      
      // Calculate memory usage
      const memoryUsage = stats.memory_stats?.usage || 0;
      const memoryLimit = stats.memory_stats?.limit || 0;
      const memoryUsagePercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      // Get network stats
      const networkStats = this.calculateNetworkStats(stats);

      return {
        cpu: {
          usage: cpuUsage,
          cores: this.getCpuCores(stats),
          loadAverage: [0, 0, 0] // Not available from Docker stats
        },
        memory: {
          usage: memoryUsagePercent,
          used: memoryUsage,
          total: memoryLimit,
          available: memoryLimit - memoryUsage
        },
        network: {
          connectionsActive: 0, // Would need additional monitoring
          requestsPerSecond: 0, // Would need application metrics
          responseTime: 0 // Would need application metrics
        },
        application: {
          activeRequests: 0, // Would need application metrics
          queuedRequests: 0, // Would need application metrics
          errorRate: 0, // Would need application metrics
          throughput: 0 // Would need application metrics
        },
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get metrics for task ${task.ID}:`, error);
      return null;
    }
  }

  private calculateCpuUsage(stats: any): number {
    const cpuStats = stats.cpu_stats;
    const preCpuStats = stats.precpu_stats;

    if (!cpuStats || !preCpuStats) return 0;

    const cpuDelta = cpuStats.cpu_usage?.total_usage - preCpuStats.cpu_usage?.total_usage;
    const systemDelta = cpuStats.system_cpu_usage - preCpuStats.system_cpu_usage;
    const cpuCount = cpuStats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100;
    }

    return 0;
  }

  private getCpuCores(stats: any): number {
    return stats.cpu_stats?.online_cpus || 1;
  }

  private calculateNetworkStats(stats: any): { bytesIn: number; bytesOut: number } {
    const networks = stats.networks || {};
    let bytesIn = 0;
    let bytesOut = 0;

    Object.values(networks).forEach((network: any) => {
      bytesIn += network.rx_bytes || 0;
      bytesOut += network.tx_bytes || 0;
    });

    return { bytesIn, bytesOut };
  }

  private async waitForScaling(targetReplicas: number, timeoutMs: number = 300000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const tasks = await this.getServiceTasks();
        const runningTasks = tasks.filter(task => task.Status?.State === 'running');
        
        if (runningTasks.length === targetReplicas) {
          return; // Scaling completed
        }

        logger.debug(`Waiting for scaling: ${runningTasks.length}/${targetReplicas} running`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.error('Error while waiting for scaling:', error);
        throw error;
      }
    }

    throw new Error(`Scaling timeout: failed to reach ${targetReplicas} replicas within ${timeoutMs}ms`);
  }
}
