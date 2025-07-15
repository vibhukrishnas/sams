/**
 * ☸️ Kubernetes Container Orchestrator
 * Implementation of ContainerOrchestrator for Kubernetes
 */

import * as k8s from '@kubernetes/client-node';
import { ContainerOrchestrator, ResourceMetrics } from './AutoScalingService';
import { logger } from '../../utils/logger';

export interface KubernetesConfig {
  namespace: string;
  deploymentName: string;
  serviceName?: string;
  kubeconfig?: string; // Path to kubeconfig file, defaults to in-cluster config
  metricsServerUrl?: string;
}

export class KubernetesOrchestrator implements ContainerOrchestrator {
  private k8sApi: k8s.AppsV1Api;
  private k8sCoreApi: k8s.CoreV1Api;
  private k8sMetricsApi: k8s.Metrics;
  private config: KubernetesConfig;
  private kubeConfig: k8s.KubeConfig;

  constructor(config: KubernetesConfig) {
    this.config = config;
    this.kubeConfig = new k8s.KubeConfig();
    
    // Load kubeconfig
    if (config.kubeconfig) {
      this.kubeConfig.loadFromFile(config.kubeconfig);
    } else {
      // Try in-cluster config first, fallback to default config
      try {
        this.kubeConfig.loadFromCluster();
      } catch (error) {
        logger.warn('Failed to load in-cluster config, trying default config');
        this.kubeConfig.loadFromDefault();
      }
    }

    // Initialize API clients
    this.k8sApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.k8sCoreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.k8sMetricsApi = new k8s.Metrics(this.kubeConfig);
  }

  /**
   * Get current number of running instances (pods)
   */
  async getCurrentInstances(): Promise<number> {
    try {
      const response = await this.k8sApi.readNamespacedDeployment(
        this.config.deploymentName,
        this.config.namespace
      );

      const deployment = response.body;
      return deployment.status?.readyReplicas || 0;
    } catch (error) {
      logger.error('Failed to get current instances from Kubernetes:', error);
      throw new Error(`Failed to get deployment status: ${error.message}`);
    }
  }

  /**
   * Scale deployment to specified number of instances
   */
  async scaleToInstances(count: number): Promise<void> {
    try {
      logger.info(`Scaling Kubernetes deployment ${this.config.deploymentName} to ${count} instances`);

      // Patch the deployment with new replica count
      const patch = {
        spec: {
          replicas: count
        }
      };

      await this.k8sApi.patchNamespacedDeployment(
        this.config.deploymentName,
        this.config.namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json'
          }
        }
      );

      // Wait for scaling to complete
      await this.waitForScaling(count);

      logger.info(`Successfully scaled deployment to ${count} instances`);
    } catch (error) {
      logger.error('Failed to scale Kubernetes deployment:', error);
      throw new Error(`Failed to scale deployment: ${error.message}`);
    }
  }

  /**
   * Get resource metrics from all instances
   */
  async getInstanceMetrics(): Promise<ResourceMetrics[]> {
    try {
      // Get pods for the deployment
      const podsResponse = await this.k8sCoreApi.listNamespacedPod(
        this.config.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${this.config.deploymentName}`
      );

      const pods = podsResponse.body.items.filter(pod => 
        pod.status?.phase === 'Running' && 
        pod.status?.conditions?.some(condition => 
          condition.type === 'Ready' && condition.status === 'True'
        )
      );

      const metricsPromises = pods.map(pod => this.getPodMetrics(pod));
      const podMetrics = await Promise.all(metricsPromises);

      return podMetrics.filter(metrics => metrics !== null) as ResourceMetrics[];
    } catch (error) {
      logger.error('Failed to get instance metrics from Kubernetes:', error);
      return [];
    }
  }

  /**
   * Health check for Kubernetes connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get deployment status
      await this.k8sApi.readNamespacedDeployment(
        this.config.deploymentName,
        this.config.namespace
      );
      return true;
    } catch (error) {
      logger.error('Kubernetes health check failed:', error);
      return false;
    }
  }

  /**
   * Get deployment status information
   */
  async getDeploymentStatus(): Promise<{
    name: string;
    namespace: string;
    replicas: number;
    readyReplicas: number;
    availableReplicas: number;
    updatedReplicas: number;
    conditions: any[];
  }> {
    try {
      const response = await this.k8sApi.readNamespacedDeployment(
        this.config.deploymentName,
        this.config.namespace
      );

      const deployment = response.body;
      return {
        name: deployment.metadata?.name || '',
        namespace: deployment.metadata?.namespace || '',
        replicas: deployment.spec?.replicas || 0,
        readyReplicas: deployment.status?.readyReplicas || 0,
        availableReplicas: deployment.status?.availableReplicas || 0,
        updatedReplicas: deployment.status?.updatedReplicas || 0,
        conditions: deployment.status?.conditions || []
      };
    } catch (error) {
      logger.error('Failed to get deployment status:', error);
      throw error;
    }
  }

  /**
   * Get pod logs for debugging
   */
  async getPodLogs(podName: string, lines: number = 100): Promise<string> {
    try {
      const response = await this.k8sCoreApi.readNamespacedPodLog(
        podName,
        this.config.namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        lines
      );

      return response.body;
    } catch (error) {
      logger.error(`Failed to get logs for pod ${podName}:`, error);
      throw error;
    }
  }

  /**
   * Get horizontal pod autoscaler status (if exists)
   */
  async getHPAStatus(): Promise<any> {
    try {
      const hpaApi = this.kubeConfig.makeApiClient(k8s.AutoscalingV2Api);
      const response = await hpaApi.readNamespacedHorizontalPodAutoscaler(
        this.config.deploymentName,
        this.config.namespace
      );

      return response.body;
    } catch (error) {
      // HPA might not exist, which is fine
      logger.debug(`No HPA found for deployment ${this.config.deploymentName}`);
      return null;
    }
  }

  // Private helper methods
  private async getPodMetrics(pod: k8s.V1Pod): Promise<ResourceMetrics | null> {
    try {
      const podName = pod.metadata?.name;
      if (!podName) return null;

      // Get metrics from metrics server
      const metricsResponse = await this.k8sMetricsApi.getPodMetrics(
        this.config.namespace,
        podName
      );

      const podMetrics = metricsResponse.body;
      
      // Parse resource usage
      const containerMetrics = podMetrics.containers?.[0]; // Assume single container
      if (!containerMetrics) return null;

      // Get pod resource requests/limits for percentage calculations
      const container = pod.spec?.containers?.[0];
      const requests = container?.resources?.requests || {};
      const limits = container?.resources?.limits || {};

      // Parse CPU usage (from millicores to percentage)
      const cpuUsageMillicores = this.parseQuantity(containerMetrics.usage?.cpu || '0');
      const cpuLimitMillicores = this.parseQuantity(limits.cpu || '1000m');
      const cpuUsagePercent = (cpuUsageMillicores / cpuLimitMillicores) * 100;

      // Parse memory usage (from bytes to percentage)
      const memoryUsageBytes = this.parseQuantity(containerMetrics.usage?.memory || '0');
      const memoryLimitBytes = this.parseQuantity(limits.memory || '1Gi');
      const memoryUsagePercent = (memoryUsageBytes / memoryLimitBytes) * 100;

      // Get additional metrics from pod status and annotations
      const networkMetrics = await this.getNetworkMetrics(pod);
      const applicationMetrics = await this.getApplicationMetrics(pod);

      return {
        cpu: {
          usage: Math.min(cpuUsagePercent, 100),
          cores: cpuLimitMillicores / 1000,
          loadAverage: [0, 0, 0] // Not available from K8s metrics
        },
        memory: {
          usage: Math.min(memoryUsagePercent, 100),
          used: memoryUsageBytes,
          total: memoryLimitBytes,
          available: memoryLimitBytes - memoryUsageBytes
        },
        network: networkMetrics,
        application: applicationMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get metrics for pod ${pod.metadata?.name}:`, error);
      return null;
    }
  }

  private async getNetworkMetrics(pod: k8s.V1Pod): Promise<ResourceMetrics['network']> {
    // In a real implementation, you would collect these metrics from:
    // - Service mesh (Istio, Linkerd)
    // - Application metrics endpoint
    // - Custom metrics from monitoring system (Prometheus)
    
    // For now, return mock data
    return {
      connectionsActive: 0,
      requestsPerSecond: 0,
      responseTime: 0
    };
  }

  private async getApplicationMetrics(pod: k8s.V1Pod): Promise<ResourceMetrics['application']> {
    // In a real implementation, you would collect these metrics from:
    // - Application health endpoints
    // - APM tools (New Relic, Datadog)
    // - Custom metrics from monitoring system
    
    // For now, return mock data
    return {
      activeRequests: 0,
      queuedRequests: 0,
      errorRate: 0,
      throughput: 0
    };
  }

  private parseQuantity(quantity: string): number {
    // Simple quantity parser for Kubernetes resource quantities
    // This is a simplified version - in production, use a proper library
    
    if (quantity.endsWith('m')) {
      return parseInt(quantity.slice(0, -1));
    }
    
    if (quantity.endsWith('Ki')) {
      return parseInt(quantity.slice(0, -2)) * 1024;
    }
    
    if (quantity.endsWith('Mi')) {
      return parseInt(quantity.slice(0, -2)) * 1024 * 1024;
    }
    
    if (quantity.endsWith('Gi')) {
      return parseInt(quantity.slice(0, -2)) * 1024 * 1024 * 1024;
    }
    
    return parseInt(quantity) || 0;
  }

  private async waitForScaling(targetReplicas: number, timeoutMs: number = 300000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const currentReplicas = await this.getCurrentInstances();
        
        if (currentReplicas === targetReplicas) {
          return; // Scaling completed
        }

        logger.debug(`Waiting for scaling: ${currentReplicas}/${targetReplicas} ready`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.error('Error while waiting for scaling:', error);
        throw error;
      }
    }

    throw new Error(`Scaling timeout: failed to reach ${targetReplicas} replicas within ${timeoutMs}ms`);
  }
}
