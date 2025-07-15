/**
 * 📈 Auto-Scaling Service
 * Implements dynamic resource allocation based on CPU, memory, and request load
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export interface ResourceMetrics {
  cpu: {
    usage: number; // Percentage
    cores: number;
    loadAverage: number[];
  };
  memory: {
    usage: number; // Percentage
    used: number; // Bytes
    total: number; // Bytes
    available: number; // Bytes
  };
  network: {
    connectionsActive: number;
    requestsPerSecond: number;
    responseTime: number; // Milliseconds
  };
  application: {
    activeRequests: number;
    queuedRequests: number;
    errorRate: number; // Percentage
    throughput: number; // Requests per second
  };
  timestamp: Date;
}

export interface ScalingPolicy {
  name: string;
  enabled: boolean;
  cooldownPeriod: number; // Seconds
  scaleUpThresholds: {
    cpu?: number;
    memory?: number;
    requestsPerSecond?: number;
    responseTime?: number;
    errorRate?: number;
  };
  scaleDownThresholds: {
    cpu?: number;
    memory?: number;
    requestsPerSecond?: number;
    responseTime?: number;
    errorRate?: number;
  };
  minInstances: number;
  maxInstances: number;
  scaleUpBy: number;
  scaleDownBy: number;
  evaluationPeriods: number; // Number of consecutive periods before scaling
}

export interface ScalingAction {
  id: string;
  type: 'scale_up' | 'scale_down';
  reason: string;
  fromInstances: number;
  toInstances: number;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface ContainerOrchestrator {
  getCurrentInstances(): Promise<number>;
  scaleToInstances(count: number): Promise<void>;
  getInstanceMetrics(): Promise<ResourceMetrics[]>;
  healthCheck(): Promise<boolean>;
}

export class AutoScalingService extends EventEmitter {
  private policies: Map<string, ScalingPolicy> = new Map();
  private metricsHistory: ResourceMetrics[] = [];
  private scalingActions: ScalingAction[] = [];
  private orchestrator: ContainerOrchestrator;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isEnabled: boolean = false;
  private lastScalingAction: Date | null = null;

  constructor(orchestrator: ContainerOrchestrator) {
    super();
    this.orchestrator = orchestrator;
    this.setupDefaultPolicies();
  }

  /**
   * Start auto-scaling monitoring
   */
  async start(): Promise<void> {
    if (this.isEnabled) {
      logger.warn('Auto-scaling service is already running');
      return;
    }

    try {
      // Verify orchestrator is healthy
      const isHealthy = await this.orchestrator.healthCheck();
      if (!isHealthy) {
        throw new Error('Container orchestrator health check failed');
      }

      this.isEnabled = true;
      this.startMonitoring();
      
      logger.info('Auto-scaling service started successfully');
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start auto-scaling service:', error);
      throw error;
    }
  }

  /**
   * Stop auto-scaling monitoring
   */
  async stop(): Promise<void> {
    if (!this.isEnabled) {
      logger.warn('Auto-scaling service is not running');
      return;
    }

    this.isEnabled = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Auto-scaling service stopped');
    this.emit('stopped');
  }

  /**
   * Add or update a scaling policy
   */
  addPolicy(policy: ScalingPolicy): void {
    this.validatePolicy(policy);
    this.policies.set(policy.name, policy);
    
    logger.info(`Scaling policy added/updated: ${policy.name}`);
    this.emit('policy_updated', policy);
  }

  /**
   * Remove a scaling policy
   */
  removePolicy(policyName: string): boolean {
    const removed = this.policies.delete(policyName);
    if (removed) {
      logger.info(`Scaling policy removed: ${policyName}`);
      this.emit('policy_removed', policyName);
    }
    return removed;
  }

  /**
   * Get all scaling policies
   */
  getPolicies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get scaling policy by name
   */
  getPolicy(name: string): ScalingPolicy | undefined {
    return this.policies.get(name);
  }

  /**
   * Enable/disable a specific policy
   */
  togglePolicy(policyName: string, enabled: boolean): boolean {
    const policy = this.policies.get(policyName);
    if (policy) {
      policy.enabled = enabled;
      logger.info(`Policy ${policyName} ${enabled ? 'enabled' : 'disabled'}`);
      this.emit('policy_toggled', policyName, enabled);
      return true;
    }
    return false;
  }

  /**
   * Get current resource metrics
   */
  async getCurrentMetrics(): Promise<ResourceMetrics> {
    const instanceMetrics = await this.orchestrator.getInstanceMetrics();
    
    // Aggregate metrics from all instances
    const aggregated: ResourceMetrics = {
      cpu: {
        usage: 0,
        cores: 0,
        loadAverage: [0, 0, 0]
      },
      memory: {
        usage: 0,
        used: 0,
        total: 0,
        available: 0
      },
      network: {
        connectionsActive: 0,
        requestsPerSecond: 0,
        responseTime: 0
      },
      application: {
        activeRequests: 0,
        queuedRequests: 0,
        errorRate: 0,
        throughput: 0
      },
      timestamp: new Date()
    };

    if (instanceMetrics.length === 0) {
      return aggregated;
    }

    // Calculate averages and sums
    instanceMetrics.forEach(metrics => {
      aggregated.cpu.usage += metrics.cpu.usage;
      aggregated.cpu.cores += metrics.cpu.cores;
      aggregated.memory.used += metrics.memory.used;
      aggregated.memory.total += metrics.memory.total;
      aggregated.memory.available += metrics.memory.available;
      aggregated.network.connectionsActive += metrics.network.connectionsActive;
      aggregated.network.requestsPerSecond += metrics.network.requestsPerSecond;
      aggregated.network.responseTime += metrics.network.responseTime;
      aggregated.application.activeRequests += metrics.application.activeRequests;
      aggregated.application.queuedRequests += metrics.application.queuedRequests;
      aggregated.application.errorRate += metrics.application.errorRate;
      aggregated.application.throughput += metrics.application.throughput;
    });

    const instanceCount = instanceMetrics.length;
    aggregated.cpu.usage /= instanceCount;
    aggregated.memory.usage = (aggregated.memory.used / aggregated.memory.total) * 100;
    aggregated.network.responseTime /= instanceCount;
    aggregated.application.errorRate /= instanceCount;

    return aggregated;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): ResourceMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Get scaling actions history
   */
  getScalingActions(limit: number = 50): ScalingAction[] {
    return this.scalingActions.slice(-limit);
  }

  /**
   * Get current instance count
   */
  async getCurrentInstanceCount(): Promise<number> {
    return await this.orchestrator.getCurrentInstances();
  }

  /**
   * Manually trigger scaling
   */
  async manualScale(targetInstances: number, reason: string = 'Manual scaling'): Promise<ScalingAction> {
    const currentInstances = await this.getCurrentInstanceCount();
    
    if (targetInstances === currentInstances) {
      throw new Error(`Already at target instance count: ${targetInstances}`);
    }

    const action: ScalingAction = {
      id: this.generateActionId(),
      type: targetInstances > currentInstances ? 'scale_up' : 'scale_down',
      reason,
      fromInstances: currentInstances,
      toInstances: targetInstances,
      timestamp: new Date(),
      status: 'pending'
    };

    this.scalingActions.push(action);
    this.emit('scaling_action_created', action);

    try {
      action.status = 'in_progress';
      this.emit('scaling_action_updated', action);

      await this.orchestrator.scaleToInstances(targetInstances);
      
      action.status = 'completed';
      this.lastScalingAction = new Date();
      
      logger.info(`Manual scaling completed: ${currentInstances} → ${targetInstances} instances`);
      this.emit('scaling_action_completed', action);
      
      return action;
    } catch (error) {
      action.status = 'failed';
      action.error = error.message;
      
      logger.error(`Manual scaling failed:`, error);
      this.emit('scaling_action_failed', action);
      
      throw error;
    }
  }

  /**
   * Get auto-scaling status
   */
  getStatus(): {
    enabled: boolean;
    currentInstances: Promise<number>;
    activePolicies: number;
    lastScalingAction: Date | null;
    metricsHistorySize: number;
    scalingActionsCount: number;
  } {
    return {
      enabled: this.isEnabled,
      currentInstances: this.getCurrentInstanceCount(),
      activePolicies: Array.from(this.policies.values()).filter(p => p.enabled).length,
      lastScalingAction: this.lastScalingAction,
      metricsHistorySize: this.metricsHistory.length,
      scalingActionsCount: this.scalingActions.length
    };
  }

  // Private methods
  private startMonitoring(): void {
    const monitoringInterval = parseInt(process.env.AUTOSCALING_INTERVAL || '30000'); // 30 seconds default
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetricsAndEvaluate();
      } catch (error) {
        logger.error('Error during auto-scaling evaluation:', error);
        this.emit('evaluation_error', error);
      }
    }, monitoringInterval);

    logger.info(`Auto-scaling monitoring started with ${monitoringInterval}ms interval`);
  }

  private async collectMetricsAndEvaluate(): Promise<void> {
    // Collect current metrics
    const metrics = await this.getCurrentMetrics();
    this.metricsHistory.push(metrics);

    // Keep only last 1000 metrics (configurable)
    const maxHistorySize = parseInt(process.env.AUTOSCALING_HISTORY_SIZE || '1000');
    if (this.metricsHistory.length > maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-maxHistorySize);
    }

    this.emit('metrics_collected', metrics);

    // Evaluate scaling policies
    for (const policy of this.policies.values()) {
      if (policy.enabled) {
        await this.evaluatePolicy(policy, metrics);
      }
    }
  }

  private async evaluatePolicy(policy: ScalingPolicy, currentMetrics: ResourceMetrics): Promise<void> {
    // Check cooldown period
    if (this.lastScalingAction) {
      const timeSinceLastAction = Date.now() - this.lastScalingAction.getTime();
      if (timeSinceLastAction < policy.cooldownPeriod * 1000) {
        return; // Still in cooldown period
      }
    }

    // Get recent metrics for evaluation
    const recentMetrics = this.metricsHistory.slice(-policy.evaluationPeriods);
    if (recentMetrics.length < policy.evaluationPeriods) {
      return; // Not enough data points
    }

    const currentInstances = await this.getCurrentInstanceCount();

    // Check scale-up conditions
    if (this.shouldScaleUp(policy, recentMetrics, currentInstances)) {
      const targetInstances = Math.min(
        currentInstances + policy.scaleUpBy,
        policy.maxInstances
      );
      
      if (targetInstances > currentInstances) {
        const reason = this.buildScalingReason('scale_up', policy, currentMetrics);
        await this.executeScaling(targetInstances, reason, currentInstances);
      }
    }
    // Check scale-down conditions
    else if (this.shouldScaleDown(policy, recentMetrics, currentInstances)) {
      const targetInstances = Math.max(
        currentInstances - policy.scaleDownBy,
        policy.minInstances
      );
      
      if (targetInstances < currentInstances) {
        const reason = this.buildScalingReason('scale_down', policy, currentMetrics);
        await this.executeScaling(targetInstances, reason, currentInstances);
      }
    }
  }

  private shouldScaleUp(policy: ScalingPolicy, recentMetrics: ResourceMetrics[], currentInstances: number): boolean {
    if (currentInstances >= policy.maxInstances) {
      return false;
    }

    const thresholds = policy.scaleUpThresholds;
    
    return recentMetrics.every(metrics => {
      return (
        (!thresholds.cpu || metrics.cpu.usage >= thresholds.cpu) &&
        (!thresholds.memory || metrics.memory.usage >= thresholds.memory) &&
        (!thresholds.requestsPerSecond || metrics.network.requestsPerSecond >= thresholds.requestsPerSecond) &&
        (!thresholds.responseTime || metrics.network.responseTime >= thresholds.responseTime) &&
        (!thresholds.errorRate || metrics.application.errorRate >= thresholds.errorRate)
      );
    });
  }

  private shouldScaleDown(policy: ScalingPolicy, recentMetrics: ResourceMetrics[], currentInstances: number): boolean {
    if (currentInstances <= policy.minInstances) {
      return false;
    }

    const thresholds = policy.scaleDownThresholds;
    
    return recentMetrics.every(metrics => {
      return (
        (!thresholds.cpu || metrics.cpu.usage <= thresholds.cpu) &&
        (!thresholds.memory || metrics.memory.usage <= thresholds.memory) &&
        (!thresholds.requestsPerSecond || metrics.network.requestsPerSecond <= thresholds.requestsPerSecond) &&
        (!thresholds.responseTime || metrics.network.responseTime <= thresholds.responseTime) &&
        (!thresholds.errorRate || metrics.application.errorRate <= thresholds.errorRate)
      );
    });
  }

  private async executeScaling(targetInstances: number, reason: string, currentInstances: number): Promise<void> {
    const action: ScalingAction = {
      id: this.generateActionId(),
      type: targetInstances > currentInstances ? 'scale_up' : 'scale_down',
      reason,
      fromInstances: currentInstances,
      toInstances: targetInstances,
      timestamp: new Date(),
      status: 'pending'
    };

    this.scalingActions.push(action);
    this.emit('scaling_action_created', action);

    try {
      action.status = 'in_progress';
      this.emit('scaling_action_updated', action);

      await this.orchestrator.scaleToInstances(targetInstances);
      
      action.status = 'completed';
      this.lastScalingAction = new Date();
      
      logger.info(`Auto-scaling completed: ${currentInstances} → ${targetInstances} instances (${reason})`);
      this.emit('scaling_action_completed', action);
    } catch (error) {
      action.status = 'failed';
      action.error = error.message;
      
      logger.error(`Auto-scaling failed:`, error);
      this.emit('scaling_action_failed', action);
    }
  }

  private buildScalingReason(type: 'scale_up' | 'scale_down', policy: ScalingPolicy, metrics: ResourceMetrics): string {
    const reasons: string[] = [];
    const thresholds = type === 'scale_up' ? policy.scaleUpThresholds : policy.scaleDownThresholds;
    const operator = type === 'scale_up' ? '>=' : '<=';

    if (thresholds.cpu && ((type === 'scale_up' && metrics.cpu.usage >= thresholds.cpu) || 
                           (type === 'scale_down' && metrics.cpu.usage <= thresholds.cpu))) {
      reasons.push(`CPU ${metrics.cpu.usage.toFixed(1)}% ${operator} ${thresholds.cpu}%`);
    }

    if (thresholds.memory && ((type === 'scale_up' && metrics.memory.usage >= thresholds.memory) || 
                              (type === 'scale_down' && metrics.memory.usage <= thresholds.memory))) {
      reasons.push(`Memory ${metrics.memory.usage.toFixed(1)}% ${operator} ${thresholds.memory}%`);
    }

    if (thresholds.requestsPerSecond && ((type === 'scale_up' && metrics.network.requestsPerSecond >= thresholds.requestsPerSecond) || 
                                         (type === 'scale_down' && metrics.network.requestsPerSecond <= thresholds.requestsPerSecond))) {
      reasons.push(`RPS ${metrics.network.requestsPerSecond} ${operator} ${thresholds.requestsPerSecond}`);
    }

    return `Policy: ${policy.name} - ${reasons.join(', ')}`;
  }

  private validatePolicy(policy: ScalingPolicy): void {
    if (!policy.name) {
      throw new Error('Policy name is required');
    }

    if (policy.minInstances < 1) {
      throw new Error('Minimum instances must be at least 1');
    }

    if (policy.maxInstances < policy.minInstances) {
      throw new Error('Maximum instances must be greater than or equal to minimum instances');
    }

    if (policy.scaleUpBy < 1 || policy.scaleDownBy < 1) {
      throw new Error('Scale up/down values must be at least 1');
    }

    if (policy.evaluationPeriods < 1) {
      throw new Error('Evaluation periods must be at least 1');
    }

    if (policy.cooldownPeriod < 0) {
      throw new Error('Cooldown period cannot be negative');
    }
  }

  private setupDefaultPolicies(): void {
    // Default CPU-based scaling policy
    this.addPolicy({
      name: 'default_cpu_scaling',
      enabled: true,
      cooldownPeriod: 300, // 5 minutes
      scaleUpThresholds: {
        cpu: 70 // Scale up when CPU > 70%
      },
      scaleDownThresholds: {
        cpu: 30 // Scale down when CPU < 30%
      },
      minInstances: 1,
      maxInstances: 10,
      scaleUpBy: 1,
      scaleDownBy: 1,
      evaluationPeriods: 3 // 3 consecutive periods
    });

    // Default response time-based scaling policy
    this.addPolicy({
      name: 'default_response_time_scaling',
      enabled: true,
      cooldownPeriod: 180, // 3 minutes
      scaleUpThresholds: {
        responseTime: 1000 // Scale up when response time > 1000ms
      },
      scaleDownThresholds: {
        responseTime: 200 // Scale down when response time < 200ms
      },
      minInstances: 1,
      maxInstances: 15,
      scaleUpBy: 2,
      scaleDownBy: 1,
      evaluationPeriods: 2
    });
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
