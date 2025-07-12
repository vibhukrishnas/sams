/**
 * 📊 Performance Monitor Service
 * Monitors system performance, tracks metrics, and manages scalability
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'system' | 'api' | 'mobile' | 'network' | 'database';
  threshold: {
    warning: number;
    critical: number;
  };
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceTarget {
  name: string;
  target: number;
  current: number;
  unit: string;
  status: 'met' | 'warning' | 'critical';
  description: string;
}

interface ScalabilityMetric {
  id: string;
  component: string;
  currentLoad: number;
  maxCapacity: number;
  utilizationPercent: number;
  autoScalingEnabled: boolean;
  lastScaleEvent?: Date;
  scaleDirection?: 'up' | 'down';
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  lastUpdate: Date;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private performanceTargets: PerformanceTarget[] = [];
  private scalabilityMetrics: ScalabilityMetric[] = [];
  private systemHealth: SystemHealth;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.systemHealth = {
      overall: 'healthy',
      uptime: 99.95,
      responseTime: 85,
      throughput: 1250,
      errorRate: 0.05,
      lastUpdate: new Date(),
    };

    this.initializePerformanceTargets();
    this.initializeScalabilityMetrics();
    this.startMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializePerformanceTargets() {
    this.performanceTargets = [
      {
        name: 'Alert Delivery Time',
        target: 30,
        current: 12.5,
        unit: 'seconds',
        status: 'met',
        description: 'Time from alert generation to delivery'
      },
      {
        name: 'Dashboard Load Time',
        target: 2,
        current: 1.3,
        unit: 'seconds',
        status: 'met',
        description: 'Time to fully load dashboard'
      },
      {
        name: 'API Response Time',
        target: 100,
        current: 85,
        unit: 'ms',
        status: 'met',
        description: 'Average API response time'
      },
      {
        name: 'Mobile App Startup',
        target: 3,
        current: 2.1,
        unit: 'seconds',
        status: 'met',
        description: 'Time from app launch to ready state'
      },
      {
        name: 'System Uptime',
        target: 99.9,
        current: 99.95,
        unit: '%',
        status: 'met',
        description: 'Overall system availability'
      }
    ];
  }

  private initializeScalabilityMetrics() {
    this.scalabilityMetrics = [
      {
        id: '1',
        component: 'API Gateway',
        currentLoad: 1250,
        maxCapacity: 5000,
        utilizationPercent: 25,
        autoScalingEnabled: true
      },
      {
        id: '2',
        component: 'Alert Processing',
        currentLoad: 850,
        maxCapacity: 2000,
        utilizationPercent: 42.5,
        autoScalingEnabled: true
      },
      {
        id: '3',
        component: 'Metrics Ingestion',
        currentLoad: 45000,
        maxCapacity: 100000,
        utilizationPercent: 45,
        autoScalingEnabled: true
      },
      {
        id: '4',
        component: 'Database Connections',
        currentLoad: 180,
        maxCapacity: 500,
        utilizationPercent: 36,
        autoScalingEnabled: false
      },
      {
        id: '5',
        component: 'WebSocket Connections',
        currentLoad: 2400,
        maxCapacity: 10000,
        utilizationPercent: 24,
        autoScalingEnabled: true
      }
    ];
  }

  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.updatePerformanceTargets();
      this.checkScalabilityThresholds();
      this.updateSystemHealth();
    }, 5000); // Update every 5 seconds
  }

  private collectMetrics() {
    const now = new Date();
    
    // Simulate real-time metrics collection
    const newMetrics: PerformanceMetric[] = [
      {
        id: `metric_${now.getTime()}_1`,
        name: 'API Response Time',
        value: Math.random() * 50 + 70, // 70-120ms
        unit: 'ms',
        timestamp: now,
        category: 'api',
        threshold: { warning: 100, critical: 200 },
        trend: 'stable'
      },
      {
        id: `metric_${now.getTime()}_2`,
        name: 'Memory Usage',
        value: Math.random() * 20 + 65, // 65-85%
        unit: '%',
        timestamp: now,
        category: 'system',
        threshold: { warning: 80, critical: 90 },
        trend: 'up'
      },
      {
        id: `metric_${now.getTime()}_3`,
        name: 'Database Query Time',
        value: Math.random() * 30 + 15, // 15-45ms
        unit: 'ms',
        timestamp: now,
        category: 'database',
        threshold: { warning: 50, critical: 100 },
        trend: 'stable'
      },
      {
        id: `metric_${now.getTime()}_4`,
        name: 'Network Latency',
        value: Math.random() * 10 + 5, // 5-15ms
        unit: 'ms',
        timestamp: now,
        category: 'network',
        threshold: { warning: 20, critical: 50 },
        trend: 'down'
      },
      {
        id: `metric_${now.getTime()}_5`,
        name: 'Mobile App FPS',
        value: Math.random() * 10 + 55, // 55-65 FPS
        unit: 'fps',
        timestamp: now,
        category: 'mobile',
        threshold: { warning: 50, critical: 30 },
        trend: 'stable'
      }
    ];

    // Keep only last 100 metrics to prevent memory issues
    this.metrics = [...newMetrics, ...this.metrics].slice(0, 100);
  }

  private updatePerformanceTargets() {
    // Simulate real-time performance target updates
    this.performanceTargets = this.performanceTargets.map(target => {
      let newCurrent = target.current;
      let newStatus = target.status;

      // Simulate slight variations in performance
      const variation = (Math.random() - 0.5) * 0.1;
      newCurrent = Math.max(0, target.current + (target.current * variation));

      // Update status based on target
      if (target.name === 'System Uptime') {
        newStatus = newCurrent >= target.target ? 'met' : 
                   newCurrent >= target.target - 0.1 ? 'warning' : 'critical';
      } else {
        newStatus = newCurrent <= target.target ? 'met' : 
                   newCurrent <= target.target * 1.2 ? 'warning' : 'critical';
      }

      return {
        ...target,
        current: newCurrent,
        status: newStatus
      };
    });
  }

  private checkScalabilityThresholds() {
    this.scalabilityMetrics = this.scalabilityMetrics.map(metric => {
      // Simulate load variations
      const variation = (Math.random() - 0.5) * 0.1;
      const newLoad = Math.max(0, metric.currentLoad + (metric.currentLoad * variation));
      const newUtilization = (newLoad / metric.maxCapacity) * 100;

      let scaleEvent = undefined;
      let scaleDirection = undefined;

      // Auto-scaling logic
      if (metric.autoScalingEnabled) {
        if (newUtilization > 80) {
          scaleEvent = new Date();
          scaleDirection = 'up';
        } else if (newUtilization < 20 && metric.currentLoad > metric.maxCapacity * 0.1) {
          scaleEvent = new Date();
          scaleDirection = 'down';
        }
      }

      return {
        ...metric,
        currentLoad: newLoad,
        utilizationPercent: newUtilization,
        lastScaleEvent: scaleEvent || metric.lastScaleEvent,
        scaleDirection: scaleDirection || metric.scaleDirection
      };
    });
  }

  private updateSystemHealth() {
    const avgResponseTime = this.getAverageMetric('API Response Time');
    const memoryUsage = this.getAverageMetric('Memory Usage');
    const errorRate = Math.random() * 0.1; // 0-0.1%

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (avgResponseTime > 150 || memoryUsage > 85 || errorRate > 0.5) {
      overall = 'critical';
    } else if (avgResponseTime > 100 || memoryUsage > 75 || errorRate > 0.1) {
      overall = 'warning';
    }

    this.systemHealth = {
      overall,
      uptime: this.performanceTargets.find(t => t.name === 'System Uptime')?.current || 99.9,
      responseTime: avgResponseTime,
      throughput: this.scalabilityMetrics.find(m => m.component === 'API Gateway')?.currentLoad || 1000,
      errorRate,
      lastUpdate: new Date()
    };
  }

  private getAverageMetric(metricName: string): number {
    const recentMetrics = this.metrics
      .filter(m => m.name === metricName)
      .slice(0, 10); // Last 10 readings

    if (recentMetrics.length === 0) return 0;
    
    return recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
  }

  // Public methods
  getPerformanceTargets(): PerformanceTarget[] {
    return this.performanceTargets;
  }

  getScalabilityMetrics(): ScalabilityMetric[] {
    return this.scalabilityMetrics;
  }

  getSystemHealth(): SystemHealth {
    return this.systemHealth;
  }

  getRecentMetrics(category?: string, limit: number = 20): PerformanceMetric[] {
    let filteredMetrics = this.metrics;
    
    if (category) {
      filteredMetrics = this.metrics.filter(m => m.category === category);
    }
    
    return filteredMetrics.slice(0, limit);
  }

  async measureApiCall<T>(apiCall: () => Promise<T>, endpoint: string): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      // Record successful API call
      this.recordApiMetric(endpoint, duration, 'success');
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed API call
      this.recordApiMetric(endpoint, duration, 'error');
      
      throw error;
    }
  }

  private recordApiMetric(endpoint: string, duration: number, status: 'success' | 'error') {
    const metric: PerformanceMetric = {
      id: `api_${Date.now()}_${Math.random()}`,
      name: `API ${endpoint}`,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      category: 'api',
      threshold: { warning: 100, critical: 200 },
      trend: 'stable'
    };

    this.metrics.unshift(metric);
    this.metrics = this.metrics.slice(0, 100);
  }

  measureComponentRenderTime(componentName: string, renderTime: number) {
    const metric: PerformanceMetric = {
      id: `render_${Date.now()}_${Math.random()}`,
      name: `${componentName} Render`,
      value: renderTime,
      unit: 'ms',
      timestamp: new Date(),
      category: 'mobile',
      threshold: { warning: 100, critical: 200 },
      trend: 'stable'
    };

    this.metrics.unshift(metric);
    this.metrics = this.metrics.slice(0, 100);
  }

  getPerformanceReport(): {
    targets: PerformanceTarget[];
    scalability: ScalabilityMetric[];
    health: SystemHealth;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Generate recommendations based on current metrics
    const criticalTargets = this.performanceTargets.filter(t => t.status === 'critical');
    const warningTargets = this.performanceTargets.filter(t => t.status === 'warning');
    const highUtilization = this.scalabilityMetrics.filter(m => m.utilizationPercent > 70);

    if (criticalTargets.length > 0) {
      recommendations.push(`Critical: ${criticalTargets.length} performance targets not met`);
    }

    if (warningTargets.length > 0) {
      recommendations.push(`Warning: ${warningTargets.length} performance targets at risk`);
    }

    if (highUtilization.length > 0) {
      recommendations.push(`Consider scaling: ${highUtilization.map(m => m.component).join(', ')}`);
    }

    if (this.systemHealth.overall === 'healthy' && recommendations.length === 0) {
      recommendations.push('All systems operating within optimal parameters');
    }

    return {
      targets: this.performanceTargets,
      scalability: this.scalabilityMetrics,
      health: this.systemHealth,
      recommendations
    };
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default PerformanceMonitor;

/**
 * 🚀 Scalability Manager
 * Handles auto-scaling, load balancing, and capacity management
 */
export class ScalabilityManager {
  private static instance: ScalabilityManager;
  private scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private loadBalancers: Map<string, LoadBalancer> = new Map();

  private constructor() {
    this.initializeScalingPolicies();
    this.initializeLoadBalancers();
  }

  public static getInstance(): ScalabilityManager {
    if (!ScalabilityManager.instance) {
      ScalabilityManager.instance = new ScalabilityManager();
    }
    return ScalabilityManager.instance;
  }

  private initializeScalingPolicies() {
    // API Gateway scaling policy
    this.scalingPolicies.set('api-gateway', {
      component: 'API Gateway',
      minInstances: 2,
      maxInstances: 20,
      targetUtilization: 70,
      scaleUpThreshold: 80,
      scaleDownThreshold: 30,
      cooldownPeriod: 300, // 5 minutes
      scaleUpBy: 2,
      scaleDownBy: 1,
      enabled: true
    });

    // Alert Processing scaling policy
    this.scalingPolicies.set('alert-processing', {
      component: 'Alert Processing',
      minInstances: 1,
      maxInstances: 10,
      targetUtilization: 60,
      scaleUpThreshold: 75,
      scaleDownThreshold: 25,
      cooldownPeriod: 180, // 3 minutes
      scaleUpBy: 1,
      scaleDownBy: 1,
      enabled: true
    });

    // Metrics Ingestion scaling policy
    this.scalingPolicies.set('metrics-ingestion', {
      component: 'Metrics Ingestion',
      minInstances: 3,
      maxInstances: 50,
      targetUtilization: 65,
      scaleUpThreshold: 80,
      scaleDownThreshold: 40,
      cooldownPeriod: 120, // 2 minutes
      scaleUpBy: 3,
      scaleDownBy: 1,
      enabled: true
    });
  }

  private initializeLoadBalancers() {
    this.loadBalancers.set('api-gateway', {
      name: 'API Gateway Load Balancer',
      algorithm: 'round-robin',
      healthCheckInterval: 30,
      healthCheckTimeout: 5,
      healthCheckPath: '/health',
      instances: [
        { id: 'api-1', endpoint: 'api-1.sams.local', healthy: true, load: 25 },
        { id: 'api-2', endpoint: 'api-2.sams.local', healthy: true, load: 30 },
        { id: 'api-3', endpoint: 'api-3.sams.local', healthy: true, load: 20 }
      ],
      totalRequests: 15420,
      successfulRequests: 15387,
      failedRequests: 33
    });

    this.loadBalancers.set('alert-processing', {
      name: 'Alert Processing Load Balancer',
      algorithm: 'least-connections',
      healthCheckInterval: 15,
      healthCheckTimeout: 3,
      healthCheckPath: '/health',
      instances: [
        { id: 'alert-1', endpoint: 'alert-1.sams.local', healthy: true, load: 45 },
        { id: 'alert-2', endpoint: 'alert-2.sams.local', healthy: true, load: 38 }
      ],
      totalRequests: 8920,
      successfulRequests: 8901,
      failedRequests: 19
    });
  }

  getScalingPolicies(): ScalingPolicy[] {
    return Array.from(this.scalingPolicies.values());
  }

  getLoadBalancers(): LoadBalancer[] {
    return Array.from(this.loadBalancers.values());
  }

  updateScalingPolicy(componentId: string, policy: Partial<ScalingPolicy>) {
    const existing = this.scalingPolicies.get(componentId);
    if (existing) {
      this.scalingPolicies.set(componentId, { ...existing, ...policy });
    }
  }

  triggerScaling(componentId: string, direction: 'up' | 'down', reason: string) {
    const policy = this.scalingPolicies.get(componentId);
    if (!policy || !policy.enabled) return;

    console.log(`Scaling ${direction} ${policy.component}: ${reason}`);

    // In a real implementation, this would trigger actual scaling operations
    // For now, we'll simulate the scaling event
    return {
      componentId,
      direction,
      reason,
      timestamp: new Date(),
      success: true
    };
  }

  getCapacityRecommendations(): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];

    // Analyze current utilization and provide recommendations
    this.scalingPolicies.forEach((policy, componentId) => {
      const performanceMonitor = PerformanceMonitor.getInstance();
      const scalabilityMetrics = performanceMonitor.getScalabilityMetrics();
      const metric = scalabilityMetrics.find(m => m.component === policy.component);

      if (metric) {
        if (metric.utilizationPercent > 85) {
          recommendations.push({
            component: policy.component,
            type: 'scale-up',
            priority: 'high',
            description: `${policy.component} is at ${metric.utilizationPercent.toFixed(1)}% utilization. Consider scaling up.`,
            estimatedCost: this.calculateScalingCost(policy, 'up'),
            estimatedBenefit: 'Improved response times and reduced risk of service degradation'
          });
        } else if (metric.utilizationPercent < 20) {
          recommendations.push({
            component: policy.component,
            type: 'scale-down',
            priority: 'medium',
            description: `${policy.component} is at ${metric.utilizationPercent.toFixed(1)}% utilization. Consider scaling down.`,
            estimatedCost: this.calculateScalingCost(policy, 'down'),
            estimatedBenefit: 'Reduced infrastructure costs while maintaining performance'
          });
        }
      }
    });

    return recommendations;
  }

  private calculateScalingCost(policy: ScalingPolicy, direction: 'up' | 'down'): string {
    // Simplified cost calculation
    const instanceCost = 50; // $50 per instance per month
    const instances = direction === 'up' ? policy.scaleUpBy : policy.scaleDownBy;
    const monthlyCost = instances * instanceCost;

    return direction === 'up'
      ? `+$${monthlyCost}/month`
      : `-$${monthlyCost}/month`;
  }
}

interface ScalingPolicy {
  component: string;
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // seconds
  scaleUpBy: number;
  scaleDownBy: number;
  enabled: boolean;
}

interface LoadBalancer {
  name: string;
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheckInterval: number; // seconds
  healthCheckTimeout: number; // seconds
  healthCheckPath: string;
  instances: LoadBalancerInstance[];
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

interface LoadBalancerInstance {
  id: string;
  endpoint: string;
  healthy: boolean;
  load: number; // percentage
}

interface CapacityRecommendation {
  component: string;
  type: 'scale-up' | 'scale-down' | 'optimize' | 'migrate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedCost: string;
  estimatedBenefit: string;
}
