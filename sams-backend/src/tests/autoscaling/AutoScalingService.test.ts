/**
 * 🧪 Auto-Scaling Service Test Suite
 * Comprehensive tests for auto-scaling implementation
 */

import { AutoScalingService, ContainerOrchestrator, ResourceMetrics, ScalingPolicy } from '../../services/autoscaling/AutoScalingService';

describe('AutoScalingService', () => {
  let autoScalingService: AutoScalingService;
  let mockOrchestrator: jest.Mocked<ContainerOrchestrator>;

  const mockMetrics: ResourceMetrics = {
    cpu: {
      usage: 50,
      cores: 2,
      loadAverage: [1.0, 1.2, 1.1]
    },
    memory: {
      usage: 60,
      used: 6000000000, // 6GB
      total: 10000000000, // 10GB
      available: 4000000000 // 4GB
    },
    network: {
      connectionsActive: 100,
      requestsPerSecond: 50,
      responseTime: 200
    },
    application: {
      activeRequests: 25,
      queuedRequests: 5,
      errorRate: 1.5,
      throughput: 45
    },
    timestamp: new Date()
  };

  beforeEach(() => {
    // Create mock orchestrator
    mockOrchestrator = {
      getCurrentInstances: jest.fn().mockResolvedValue(2),
      scaleToInstances: jest.fn().mockResolvedValue(undefined),
      getInstanceMetrics: jest.fn().mockResolvedValue([mockMetrics, mockMetrics]),
      healthCheck: jest.fn().mockResolvedValue(true)
    };

    autoScalingService = new AutoScalingService(mockOrchestrator);
  });

  afterEach(async () => {
    if (autoScalingService.getStatus().enabled) {
      await autoScalingService.stop();
    }
  });

  describe('Service Lifecycle', () => {
    test('should start successfully with healthy orchestrator', async () => {
      const startedSpy = jest.fn();
      autoScalingService.on('started', startedSpy);

      await autoScalingService.start();

      expect(mockOrchestrator.healthCheck).toHaveBeenCalled();
      expect(autoScalingService.getStatus().enabled).toBe(true);
      expect(startedSpy).toHaveBeenCalled();
    });

    test('should fail to start with unhealthy orchestrator', async () => {
      mockOrchestrator.healthCheck.mockResolvedValue(false);

      await expect(autoScalingService.start()).rejects.toThrow('Container orchestrator health check failed');
      expect(autoScalingService.getStatus().enabled).toBe(false);
    });

    test('should stop successfully', async () => {
      const stoppedSpy = jest.fn();
      autoScalingService.on('stopped', stoppedSpy);

      await autoScalingService.start();
      await autoScalingService.stop();

      expect(autoScalingService.getStatus().enabled).toBe(false);
      expect(stoppedSpy).toHaveBeenCalled();
    });

    test('should not start if already running', async () => {
      await autoScalingService.start();
      
      // Starting again should not throw but should warn
      await autoScalingService.start();
      
      expect(autoScalingService.getStatus().enabled).toBe(true);
    });
  });

  describe('Policy Management', () => {
    test('should add scaling policy successfully', () => {
      const policy: ScalingPolicy = {
        name: 'test_policy',
        enabled: true,
        cooldownPeriod: 300,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 2,
        scaleDownBy: 1,
        evaluationPeriods: 3
      };

      const policyUpdatedSpy = jest.fn();
      autoScalingService.on('policy_updated', policyUpdatedSpy);

      autoScalingService.addPolicy(policy);

      const retrievedPolicy = autoScalingService.getPolicy('test_policy');
      expect(retrievedPolicy).toEqual(policy);
      expect(policyUpdatedSpy).toHaveBeenCalledWith(policy);
    });

    test('should validate policy before adding', () => {
      const invalidPolicy: ScalingPolicy = {
        name: '',
        enabled: true,
        cooldownPeriod: 300,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 0, // Invalid
        maxInstances: 10,
        scaleUpBy: 2,
        scaleDownBy: 1,
        evaluationPeriods: 3
      };

      expect(() => autoScalingService.addPolicy(invalidPolicy)).toThrow();
    });

    test('should remove policy successfully', () => {
      const policy: ScalingPolicy = {
        name: 'test_policy',
        enabled: true,
        cooldownPeriod: 300,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 2,
        scaleDownBy: 1,
        evaluationPeriods: 3
      };

      const policyRemovedSpy = jest.fn();
      autoScalingService.on('policy_removed', policyRemovedSpy);

      autoScalingService.addPolicy(policy);
      const removed = autoScalingService.removePolicy('test_policy');

      expect(removed).toBe(true);
      expect(autoScalingService.getPolicy('test_policy')).toBeUndefined();
      expect(policyRemovedSpy).toHaveBeenCalledWith('test_policy');
    });

    test('should toggle policy enabled state', () => {
      const policy: ScalingPolicy = {
        name: 'test_policy',
        enabled: true,
        cooldownPeriod: 300,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 2,
        scaleDownBy: 1,
        evaluationPeriods: 3
      };

      const policyToggledSpy = jest.fn();
      autoScalingService.on('policy_toggled', policyToggledSpy);

      autoScalingService.addPolicy(policy);
      const toggled = autoScalingService.togglePolicy('test_policy', false);

      expect(toggled).toBe(true);
      expect(autoScalingService.getPolicy('test_policy')?.enabled).toBe(false);
      expect(policyToggledSpy).toHaveBeenCalledWith('test_policy', false);
    });

    test('should return default policies', () => {
      const policies = autoScalingService.getPolicies();
      
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.name === 'default_cpu_scaling')).toBe(true);
      expect(policies.some(p => p.name === 'default_response_time_scaling')).toBe(true);
    });
  });

  describe('Metrics Collection', () => {
    test('should collect current metrics', async () => {
      const metrics = await autoScalingService.getCurrentMetrics();

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('network');
      expect(metrics).toHaveProperty('application');
      expect(metrics).toHaveProperty('timestamp');
      expect(mockOrchestrator.getInstanceMetrics).toHaveBeenCalled();
    });

    test('should aggregate metrics from multiple instances', async () => {
      const instance1Metrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 40 } };
      const instance2Metrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 60 } };
      
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([instance1Metrics, instance2Metrics]);

      const aggregatedMetrics = await autoScalingService.getCurrentMetrics();

      expect(aggregatedMetrics.cpu.usage).toBe(50); // Average of 40 and 60
      expect(aggregatedMetrics.cpu.cores).toBe(4); // Sum of 2 + 2
    });

    test('should handle empty metrics gracefully', async () => {
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([]);

      const metrics = await autoScalingService.getCurrentMetrics();

      expect(metrics.cpu.usage).toBe(0);
      expect(metrics.memory.usage).toBe(0);
    });

    test('should maintain metrics history', async () => {
      await autoScalingService.start();
      
      // Wait for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const history = autoScalingService.getMetricsHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Manual Scaling', () => {
    test('should scale up manually', async () => {
      const scalingAction = await autoScalingService.manualScale(5, 'Manual scale up');

      expect(scalingAction.type).toBe('scale_up');
      expect(scalingAction.fromInstances).toBe(2);
      expect(scalingAction.toInstances).toBe(5);
      expect(scalingAction.reason).toBe('Manual scale up');
      expect(scalingAction.status).toBe('completed');
      expect(mockOrchestrator.scaleToInstances).toHaveBeenCalledWith(5);
    });

    test('should scale down manually', async () => {
      const scalingAction = await autoScalingService.manualScale(1, 'Manual scale down');

      expect(scalingAction.type).toBe('scale_down');
      expect(scalingAction.fromInstances).toBe(2);
      expect(scalingAction.toInstances).toBe(1);
      expect(scalingAction.reason).toBe('Manual scale down');
      expect(scalingAction.status).toBe('completed');
      expect(mockOrchestrator.scaleToInstances).toHaveBeenCalledWith(1);
    });

    test('should handle scaling failures', async () => {
      mockOrchestrator.scaleToInstances.mockRejectedValue(new Error('Scaling failed'));

      await expect(autoScalingService.manualScale(5)).rejects.toThrow('Scaling failed');
      
      const actions = autoScalingService.getScalingActions();
      const failedAction = actions[actions.length - 1];
      expect(failedAction.status).toBe('failed');
      expect(failedAction.error).toBe('Scaling failed');
    });

    test('should reject scaling to same instance count', async () => {
      await expect(autoScalingService.manualScale(2)).rejects.toThrow('Already at target instance count: 2');
    });
  });

  describe('Automatic Scaling', () => {
    test('should scale up when CPU threshold is exceeded', async () => {
      // Create high CPU metrics
      const highCpuMetrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 85 } };
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([highCpuMetrics, highCpuMetrics]);

      const scalingActionSpy = jest.fn();
      autoScalingService.on('scaling_action_completed', scalingActionSpy);

      // Add a policy with low threshold for testing
      autoScalingService.addPolicy({
        name: 'test_scale_up',
        enabled: true,
        cooldownPeriod: 0, // No cooldown for testing
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 1,
        scaleDownBy: 1,
        evaluationPeriods: 1 // Single evaluation period
      });

      await autoScalingService.start();
      
      // Wait for evaluation cycle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger evaluation manually by collecting metrics
      await (autoScalingService as any).collectMetricsAndEvaluate();

      expect(scalingActionSpy).toHaveBeenCalled();
      expect(mockOrchestrator.scaleToInstances).toHaveBeenCalledWith(3); // 2 + 1
    });

    test('should scale down when CPU threshold is below minimum', async () => {
      // Start with more instances
      mockOrchestrator.getCurrentInstances.mockResolvedValue(4);
      
      // Create low CPU metrics
      const lowCpuMetrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 15 } };
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([lowCpuMetrics, lowCpuMetrics, lowCpuMetrics, lowCpuMetrics]);

      const scalingActionSpy = jest.fn();
      autoScalingService.on('scaling_action_completed', scalingActionSpy);

      // Add a policy with high threshold for testing
      autoScalingService.addPolicy({
        name: 'test_scale_down',
        enabled: true,
        cooldownPeriod: 0,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 1,
        scaleDownBy: 1,
        evaluationPeriods: 1
      });

      await autoScalingService.start();
      
      // Trigger evaluation manually
      await (autoScalingService as any).collectMetricsAndEvaluate();

      expect(scalingActionSpy).toHaveBeenCalled();
      expect(mockOrchestrator.scaleToInstances).toHaveBeenCalledWith(3); // 4 - 1
    });

    test('should respect minimum and maximum instance limits', async () => {
      // Test maximum limit
      mockOrchestrator.getCurrentInstances.mockResolvedValue(5);
      const highCpuMetrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 90 } };
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([highCpuMetrics]);

      autoScalingService.addPolicy({
        name: 'test_limits',
        enabled: true,
        cooldownPeriod: 0,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 2,
        maxInstances: 5, // Already at max
        scaleUpBy: 1,
        scaleDownBy: 1,
        evaluationPeriods: 1
      });

      await autoScalingService.start();
      await (autoScalingService as any).collectMetricsAndEvaluate();

      // Should not scale beyond maximum
      expect(mockOrchestrator.scaleToInstances).not.toHaveBeenCalled();
    });

    test('should respect cooldown period', async () => {
      const highCpuMetrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 85 } };
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([highCpuMetrics, highCpuMetrics]);

      // Simulate recent scaling action
      (autoScalingService as any).lastScalingAction = new Date();

      autoScalingService.addPolicy({
        name: 'test_cooldown',
        enabled: true,
        cooldownPeriod: 300, // 5 minutes
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 1,
        scaleDownBy: 1,
        evaluationPeriods: 1
      });

      await autoScalingService.start();
      await (autoScalingService as any).collectMetricsAndEvaluate();

      // Should not scale due to cooldown
      expect(mockOrchestrator.scaleToInstances).not.toHaveBeenCalled();
    });

    test('should require multiple evaluation periods', async () => {
      const highCpuMetrics = { ...mockMetrics, cpu: { ...mockMetrics.cpu, usage: 85 } };
      mockOrchestrator.getInstanceMetrics.mockResolvedValue([highCpuMetrics, highCpuMetrics]);

      autoScalingService.addPolicy({
        name: 'test_evaluation_periods',
        enabled: true,
        cooldownPeriod: 0,
        scaleUpThresholds: { cpu: 80 },
        scaleDownThresholds: { cpu: 20 },
        minInstances: 1,
        maxInstances: 10,
        scaleUpBy: 1,
        scaleDownBy: 1,
        evaluationPeriods: 3 // Need 3 periods
      });

      await autoScalingService.start();
      
      // First evaluation - not enough data
      await (autoScalingService as any).collectMetricsAndEvaluate();
      expect(mockOrchestrator.scaleToInstances).not.toHaveBeenCalled();

      // Second evaluation - still not enough
      await (autoScalingService as any).collectMetricsAndEvaluate();
      expect(mockOrchestrator.scaleToInstances).not.toHaveBeenCalled();

      // Third evaluation - now should scale
      await (autoScalingService as any).collectMetricsAndEvaluate();
      expect(mockOrchestrator.scaleToInstances).toHaveBeenCalledWith(3);
    });
  });

  describe('Status and Information', () => {
    test('should return correct status', async () => {
      const status = autoScalingService.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('currentInstances');
      expect(status).toHaveProperty('activePolicies');
      expect(status).toHaveProperty('lastScalingAction');
      expect(status).toHaveProperty('metricsHistorySize');
      expect(status).toHaveProperty('scalingActionsCount');
    });

    test('should return current instance count', async () => {
      const instanceCount = await autoScalingService.getCurrentInstanceCount();
      expect(instanceCount).toBe(2);
      expect(mockOrchestrator.getCurrentInstances).toHaveBeenCalled();
    });

    test('should return scaling actions history', async () => {
      await autoScalingService.manualScale(3);
      
      const actions = autoScalingService.getScalingActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('scale_up');
    });
  });

  describe('Error Handling', () => {
    test('should handle orchestrator errors gracefully', async () => {
      mockOrchestrator.getInstanceMetrics.mockRejectedValue(new Error('Metrics collection failed'));

      const errorSpy = jest.fn();
      autoScalingService.on('evaluation_error', errorSpy);

      await autoScalingService.start();
      await (autoScalingService as any).collectMetricsAndEvaluate();

      expect(errorSpy).toHaveBeenCalled();
    });

    test('should emit events for scaling actions', async () => {
      const createdSpy = jest.fn();
      const updatedSpy = jest.fn();
      const completedSpy = jest.fn();

      autoScalingService.on('scaling_action_created', createdSpy);
      autoScalingService.on('scaling_action_updated', updatedSpy);
      autoScalingService.on('scaling_action_completed', completedSpy);

      await autoScalingService.manualScale(3);

      expect(createdSpy).toHaveBeenCalled();
      expect(updatedSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalled();
    });
  });
});
