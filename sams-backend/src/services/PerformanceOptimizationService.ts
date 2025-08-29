export interface PerformanceMetric {
  deviceId: string;
  timestamp: string;
  cpu: {
    usage: number;
    processes: Array<{
      name: string;
      pid: number;
      cpu: number;
      memory: number;
    }>;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  disk: {
    drives: Array<{
      drive: string;
      total: number;
      used: number;
      available: number;
      percentage: number;
      ioRead: number;
      ioWrite: number;
    }>;
  };
  network: {
    interfaces: Array<{
      name: string;
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
      errors: number;
    }>;
  };
  applications: Array<{
    name: string;
    responseTime: number;
    availability: number;
    errorRate: number;
  }>;
}

export interface PerformanceRecommendation {
  id: string;
  deviceId: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'application' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  category: 'optimization' | 'maintenance' | 'upgrade' | 'configuration';
  created: string;
  applied?: boolean;
  appliedAt?: string;
  automatable: boolean;
  estimatedImprovement: {
    metric: string;
    percentage: number;
  };
  relatedMetrics: string[];
}

export interface PerformanceTrend {
  deviceId: string;
  metric: string;
  timeframe: '1h' | '24h' | '7d' | '30d';
  trend: 'improving' | 'degrading' | 'stable';
  slope: number;
  confidence: number;
  dataPoints: Array<{
    timestamp: string;
    value: number;
  }>;
  forecast?: Array<{
    timestamp: string;
    predicted: number;
    confidence: number;
  }>;
}

export interface PerformanceBaseline {
  deviceId: string;
  metric: string;
  baseline: number;
  threshold: {
    warning: number;
    critical: number;
  };
  lastCalculated: string;
  sampleSize: number;
  standardDeviation: number;
}

export interface OptimizationTask {
  id: string;
  deviceId: string;
  type: 'automated' | 'manual';
  action: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduled: string;
  started?: string;
  completed?: string;
  result?: any;
  error?: string;
  rollbackAvailable: boolean;
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private recommendations: Map<string, PerformanceRecommendation> = new Map();
  private trends: Map<string, PerformanceTrend> = new Map();
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private optimizationTasks: Map<string, OptimizationTask> = new Map();

  public static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  /**
   * Collect performance metrics for a device
   */
  async collectMetrics(deviceId: string): Promise<PerformanceMetric> {
    try {
      console.log(`Collecting performance metrics for device: ${deviceId}`);

      const metric: PerformanceMetric = {
        deviceId,
        timestamp: new Date().toISOString(),
        cpu: await this.collectCPUMetrics(),
        memory: await this.collectMemoryMetrics(),
        disk: await this.collectDiskMetrics(),
        network: await this.collectNetworkMetrics(),
        applications: await this.collectApplicationMetrics()
      };

      // Store metric
      if (!this.metrics.has(deviceId)) {
        this.metrics.set(deviceId, []);
      }
      
      const deviceMetrics = this.metrics.get(deviceId)!;
      deviceMetrics.push(metric);

      // Keep only last 1000 metrics per device
      if (deviceMetrics.length > 1000) {
        deviceMetrics.splice(0, deviceMetrics.length - 1000);
      }

      // Analyze and generate recommendations
      await this.analyzePerformance(deviceId, metric);

      console.log(`Performance metrics collected for device: ${deviceId}`);
      return metric;
    } catch (error) {
      console.error(`Failed to collect metrics for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze performance and generate recommendations
   */
  private async analyzePerformance(deviceId: string, metric: PerformanceMetric): Promise<void> {
    // Update baselines
    await this.updateBaselines(deviceId, metric);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(deviceId, metric);
    
    for (const recommendation of recommendations) {
      this.recommendations.set(recommendation.id, recommendation);
    }

    // Update trends
    await this.updateTrends(deviceId, metric);

    // Check for automated optimizations
    await this.checkAutomatedOptimizations(deviceId, metric);
  }

  /**
   * Collect CPU metrics
   */
  private async collectCPUMetrics(): Promise<PerformanceMetric['cpu']> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Get overall CPU usage
      const { stdout: cpuOutput } = await execAsync(`
        powershell -Command "
        Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 1 | 
        Select-Object -ExpandProperty CounterSamples | 
        Select-Object -ExpandProperty CookedValue
        "
      `);

      const cpuUsage = parseFloat(cpuOutput.trim()) || 0;

      // Get top processes
      const { stdout: processOutput } = await execAsync(`
        powershell -Command "
        Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name, Id, CPU, WorkingSet | ConvertTo-Json
        "
      `);

      const processes = JSON.parse(processOutput || '[]');
      const topProcesses = (Array.isArray(processes) ? processes : [processes]).map((proc: any) => ({
        name: proc.Name || 'Unknown',
        pid: proc.Id || 0,
        cpu: parseFloat(proc.CPU) || 0,
        memory: Math.round((proc.WorkingSet || 0) / 1024 / 1024) // Convert to MB
      }));

      return {
        usage: Math.round(cpuUsage * 100) / 100,
        processes: topProcesses
      };
    } catch (error) {
      console.error('Failed to collect CPU metrics:', error);
      return {
        usage: 0,
        processes: []
      };
    }
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(): Promise<PerformanceMetric['memory']> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`
        powershell -Command "
        $os = Get-WmiObject -Class Win32_OperatingSystem;
        $total = $os.TotalVisibleMemorySize * 1024;
        $available = $os.AvailablePhysicalMemory * 1024;
        $used = $total - $available;
        @{
          Total = $total;
          Used = $used;
          Available = $available;
          Percentage = ($used / $total) * 100
        } | ConvertTo-Json
        "
      `);

      const memData = JSON.parse(stdout);

      return {
        total: Math.round(memData.Total / 1024 / 1024), // Convert to MB
        used: Math.round(memData.Used / 1024 / 1024),
        available: Math.round(memData.Available / 1024 / 1024),
        percentage: Math.round(memData.Percentage * 100) / 100
      };
    } catch (error) {
      console.error('Failed to collect memory metrics:', error);
      return {
        total: 0,
        used: 0,
        available: 0,
        percentage: 0
      };
    }
  }

  /**
   * Collect disk metrics
   */
  private async collectDiskMetrics(): Promise<PerformanceMetric['disk']> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`
        powershell -Command "
        Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3} | 
        Select-Object DeviceID, Size, FreeSpace | ConvertTo-Json
        "
      `);

      const diskData = JSON.parse(stdout || '[]');
      const drives = (Array.isArray(diskData) ? diskData : [diskData]).map((drive: any) => {
        const total = drive.Size || 0;
        const available = drive.FreeSpace || 0;
        const used = total - available;
        const percentage = total > 0 ? (used / total) * 100 : 0;

        return {
          drive: drive.DeviceID || 'Unknown',
          total: Math.round(total / 1024 / 1024 / 1024), // Convert to GB
          used: Math.round(used / 1024 / 1024 / 1024),
          available: Math.round(available / 1024 / 1024 / 1024),
          percentage: Math.round(percentage * 100) / 100,
          ioRead: 0, // Would need performance counters for real data
          ioWrite: 0
        };
      });

      return { drives };
    } catch (error) {
      console.error('Failed to collect disk metrics:', error);
      return { drives: [] };
    }
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(): Promise<PerformanceMetric['network']> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`
        powershell -Command "
        Get-NetAdapterStatistics | Select-Object Name, BytesReceived, BytesSent, PacketsReceived, PacketsSent | ConvertTo-Json
        "
      `);

      const networkData = JSON.parse(stdout || '[]');
      const interfaces = (Array.isArray(networkData) ? networkData : [networkData]).map((iface: any) => ({
        name: iface.Name || 'Unknown',
        bytesIn: iface.BytesReceived || 0,
        bytesOut: iface.BytesSent || 0,
        packetsIn: iface.PacketsReceived || 0,
        packetsOut: iface.PacketsSent || 0,
        errors: 0 // Would need additional counters
      }));

      return { interfaces };
    } catch (error) {
      console.error('Failed to collect network metrics:', error);
      return { interfaces: [] };
    }
  }

  /**
   * Collect application metrics
   */
  private async collectApplicationMetrics(): Promise<PerformanceMetric['applications']> {
    // Mock application metrics - in reality would monitor specific applications
    return [
      {
        name: 'SAMS Backend',
        responseTime: 50 + Math.random() * 100,
        availability: 99.5 + Math.random() * 0.5,
        errorRate: Math.random() * 0.1
      },
      {
        name: 'Database',
        responseTime: 10 + Math.random() * 20,
        availability: 99.8 + Math.random() * 0.2,
        errorRate: Math.random() * 0.05
      }
    ];
  }

  /**
   * Generate performance recommendations
   */
  private async generateRecommendations(deviceId: string, metric: PerformanceMetric): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = [];

    // CPU recommendations
    if (metric.cpu.usage > 80) {
      recommendations.push({
        id: this.generateId(),
        deviceId,
        type: 'cpu',
        priority: metric.cpu.usage > 95 ? 'critical' : 'high',
        title: 'High CPU Usage Detected',
        description: `CPU usage is at ${metric.cpu.usage.toFixed(1)}%, which may impact system performance.`,
        recommendation: 'Consider stopping unnecessary processes, upgrading CPU, or optimizing running applications.',
        impact: 'System responsiveness may be degraded. Applications may run slowly.',
        effort: 'medium',
        category: 'optimization',
        created: new Date().toISOString(),
        automatable: true,
        estimatedImprovement: {
          metric: 'cpu_usage',
          percentage: 15
        },
        relatedMetrics: ['cpu_usage_percent', 'process_count']
      });
    }

    // Memory recommendations
    if (metric.memory.percentage > 85) {
      recommendations.push({
        id: this.generateId(),
        deviceId,
        type: 'memory',
        priority: metric.memory.percentage > 95 ? 'critical' : 'high',
        title: 'High Memory Usage Detected',
        description: `Memory usage is at ${metric.memory.percentage.toFixed(1)}%, approaching system limits.`,
        recommendation: 'Close unnecessary applications, increase virtual memory, or add more RAM.',
        impact: 'System may become unstable or slow. Applications may crash.',
        effort: 'medium',
        category: 'optimization',
        created: new Date().toISOString(),
        automatable: false,
        estimatedImprovement: {
          metric: 'memory_usage',
          percentage: 20
        },
        relatedMetrics: ['memory_usage_percent', 'available_memory']
      });
    }

    // Disk recommendations
    for (const drive of metric.disk.drives) {
      if (drive.percentage > 90) {
        recommendations.push({
          id: this.generateId(),
          deviceId,
          type: 'disk',
          priority: drive.percentage > 95 ? 'critical' : 'high',
          title: `Low Disk Space on Drive ${drive.drive}`,
          description: `Drive ${drive.drive} is ${drive.percentage.toFixed(1)}% full with only ${drive.available}GB remaining.`,
          recommendation: 'Clean up temporary files, move data to other drives, or expand storage capacity.',
          impact: 'System may fail to save files or create temporary files needed for applications.',
          effort: 'low',
          category: 'maintenance',
          created: new Date().toISOString(),
          automatable: true,
          estimatedImprovement: {
            metric: 'disk_usage',
            percentage: 10
          },
          relatedMetrics: [`disk_usage_${drive.drive}`, 'available_space']
        });
      }
    }

    // Application performance recommendations
    for (const app of metric.applications) {
      if (app.responseTime > 1000) {
        recommendations.push({
          id: this.generateId(),
          deviceId,
          type: 'application',
          priority: 'medium',
          title: `Slow Response Time for ${app.name}`,
          description: `${app.name} has an average response time of ${app.responseTime.toFixed(0)}ms.`,
          recommendation: 'Optimize application configuration, check database queries, or consider load balancing.',
          impact: 'User experience may be degraded due to slow application response.',
          effort: 'high',
          category: 'optimization',
          created: new Date().toISOString(),
          automatable: false,
          estimatedImprovement: {
            metric: 'response_time',
            percentage: 30
          },
          relatedMetrics: [`${app.name}_response_time`, `${app.name}_error_rate`]
        });
      }
    }

    return recommendations;
  }

  /**
   * Update performance baselines
   */
  private async updateBaselines(deviceId: string, metric: PerformanceMetric): Promise<void> {
    const deviceMetrics = this.metrics.get(deviceId) || [];
    
    if (deviceMetrics.length < 10) {
      return; // Need more data points for meaningful baselines
    }

    // Calculate baseline for CPU usage
    const cpuValues = deviceMetrics.map(m => m.cpu.usage);
    this.updateBaseline(deviceId, 'cpu_usage', cpuValues);

    // Calculate baseline for memory usage
    const memoryValues = deviceMetrics.map(m => m.memory.percentage);
    this.updateBaseline(deviceId, 'memory_usage', memoryValues);

    // Calculate baseline for disk usage (average across all drives)
    const diskValues = deviceMetrics.map(m => {
      const avgDiskUsage = m.disk.drives.reduce((sum, drive) => sum + drive.percentage, 0) / m.disk.drives.length;
      return avgDiskUsage || 0;
    });
    this.updateBaseline(deviceId, 'disk_usage', diskValues);
  }

  /**
   * Update baseline for a specific metric
   */
  private updateBaseline(deviceId: string, metric: string, values: number[]): void {
    const key = `${deviceId}:${metric}`;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    const baseline: PerformanceBaseline = {
      deviceId,
      metric,
      baseline: mean,
      threshold: {
        warning: mean + standardDeviation,
        critical: mean + (2 * standardDeviation)
      },
      lastCalculated: new Date().toISOString(),
      sampleSize: values.length,
      standardDeviation
    };

    this.baselines.set(key, baseline);
  }

  /**
   * Update performance trends
   */
  private async updateTrends(deviceId: string, metric: PerformanceMetric): Promise<void> {
    const deviceMetrics = this.metrics.get(deviceId) || [];
    
    if (deviceMetrics.length < 5) {
      return; // Need more data points for trend analysis
    }

    // Analyze CPU trend
    this.analyzeTrend(deviceId, 'cpu_usage', deviceMetrics.map(m => ({
      timestamp: m.timestamp,
      value: m.cpu.usage
    })));

    // Analyze memory trend
    this.analyzeTrend(deviceId, 'memory_usage', deviceMetrics.map(m => ({
      timestamp: m.timestamp,
      value: m.memory.percentage
    })));
  }

  /**
   * Analyze trend for a specific metric
   */
  private analyzeTrend(deviceId: string, metric: string, dataPoints: Array<{ timestamp: string; value: number }>): void {
    const key = `${deviceId}:${metric}`;
    
    // Simple linear regression for trend analysis
    const n = dataPoints.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = dataPoints.map(dp => dp.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend direction
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.1) {
      if (metric.includes('usage') || metric.includes('error')) {
        trend = slope > 0 ? 'degrading' : 'improving';
      } else {
        trend = slope > 0 ? 'improving' : 'degrading';
      }
    }

    // Calculate confidence (R-squared)
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + (sumY - slope * sumX) / n;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const confidence = 1 - (ssRes / ssTotal);

    const performanceTrend: PerformanceTrend = {
      deviceId,
      metric,
      timeframe: '24h', // Could be dynamic based on data range
      trend,
      slope,
      confidence: Math.max(0, Math.min(1, confidence)),
      dataPoints: dataPoints.slice(-50) // Keep last 50 points
    };

    this.trends.set(key, performanceTrend);
  }

  /**
   * Check for automated optimizations
   */
  private async checkAutomatedOptimizations(deviceId: string, metric: PerformanceMetric): Promise<void> {
    // Check if automated cleanup is needed
    for (const drive of metric.disk.drives) {
      if (drive.percentage > 85) {
        await this.scheduleOptimizationTask(deviceId, {
          type: 'automated',
          action: 'disk_cleanup',
          description: `Automated disk cleanup for drive ${drive.drive}`,
          rollbackAvailable: false
        });
      }
    }

    // Check if service restart is needed for high memory usage
    if (metric.memory.percentage > 90) {
      await this.scheduleOptimizationTask(deviceId, {
        type: 'automated',
        action: 'restart_services',
        description: 'Restart memory-intensive services to free up RAM',
        rollbackAvailable: true
      });
    }
  }

  /**
   * Schedule an optimization task
   */
  private async scheduleOptimizationTask(deviceId: string, taskData: {
    type: 'automated' | 'manual';
    action: string;
    description: string;
    rollbackAvailable: boolean;
  }): Promise<OptimizationTask> {
    const task: OptimizationTask = {
      id: this.generateId(),
      deviceId,
      status: 'pending',
      scheduled: new Date().toISOString(),
      ...taskData
    };

    this.optimizationTasks.set(task.id, task);
    
    // Execute automated tasks immediately
    if (task.type === 'automated') {
      setTimeout(() => this.executeOptimizationTask(task.id), 1000);
    }

    console.log(`Optimization task scheduled: ${task.description} for device ${deviceId}`);
    return task;
  }

  /**
   * Execute an optimization task
   */
  async executeOptimizationTask(taskId: string): Promise<OptimizationTask> {
    const task = this.optimizationTasks.get(taskId);
    if (!task) {
      throw new Error(`Optimization task not found: ${taskId}`);
    }

    task.status = 'running';
    task.started = new Date().toISOString();

    try {
      console.log(`Executing optimization task: ${task.description}`);

      // Mock execution based on action type
      let result: any;
      
      switch (task.action) {
        case 'disk_cleanup':
          result = await this.performDiskCleanup(task.deviceId);
          break;
        case 'restart_services':
          result = await this.restartServices(task.deviceId);
          break;
        default:
          throw new Error(`Unknown optimization action: ${task.action}`);
      }

      task.status = 'completed';
      task.completed = new Date().toISOString();
      task.result = result;

      console.log(`Optimization task completed: ${task.description}`);
      return task;
    } catch (error) {
      task.status = 'failed';
      task.completed = new Date().toISOString();
      task.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`Optimization task failed: ${task.description}`, error);
      return task;
    }
  }

  /**
   * Perform disk cleanup
   */
  private async performDiskCleanup(deviceId: string): Promise<any> {
    // Mock disk cleanup - in reality would run actual cleanup commands
    console.log(`Performing disk cleanup for device: ${deviceId}`);
    
    return {
      action: 'disk_cleanup',
      spaceFreed: Math.floor(Math.random() * 1000) + 100, // MB
      filesDeleted: Math.floor(Math.random() * 100) + 10,
      tempFilesCleared: true,
      recycleBinEmptied: true
    };
  }

  /**
   * Restart services
   */
  private async restartServices(deviceId: string): Promise<any> {
    // Mock service restart - in reality would restart actual services
    console.log(`Restarting services for device: ${deviceId}`);
    
    return {
      action: 'restart_services',
      servicesRestarted: ['SAMSAgent', 'MonitoringService'],
      memoryFreed: Math.floor(Math.random() * 500) + 100, // MB
      success: true
    };
  }

  /**
   * Get performance recommendations for a device
   */
  getRecommendations(deviceId?: string, priority?: string): PerformanceRecommendation[] {
    let recommendations = Array.from(this.recommendations.values());

    if (deviceId) {
      recommendations = recommendations.filter(r => r.deviceId === deviceId);
    }

    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get performance trends for a device
   */
  getTrends(deviceId?: string): PerformanceTrend[] {
    let trends = Array.from(this.trends.values());

    if (deviceId) {
      trends = trends.filter(t => t.deviceId === deviceId);
    }

    return trends;
  }

  /**
   * Get optimization tasks
   */
  getOptimizationTasks(deviceId?: string, status?: string): OptimizationTask[] {
    let tasks = Array.from(this.optimizationTasks.values());

    if (deviceId) {
      tasks = tasks.filter(t => t.deviceId === deviceId);
    }

    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }

    return tasks.sort((a, b) => new Date(b.scheduled).getTime() - new Date(a.scheduled).getTime());
  }

  /**
   * Get performance summary for a device
   */
  getPerformanceSummary(deviceId: string): any {
    const deviceMetrics = this.metrics.get(deviceId) || [];
    const latestMetric = deviceMetrics[deviceMetrics.length - 1];

    if (!latestMetric) {
      return null;
    }

    const deviceRecommendations = this.getRecommendations(deviceId);
    const deviceTrends = this.getTrends(deviceId);
    const deviceTasks = this.getOptimizationTasks(deviceId);

    return {
      deviceId,
      lastUpdated: latestMetric.timestamp,
      current: {
        cpu: latestMetric.cpu.usage,
        memory: latestMetric.memory.percentage,
        diskUsage: latestMetric.disk.drives.reduce((avg, drive) => avg + drive.percentage, 0) / latestMetric.disk.drives.length
      },
      recommendations: {
        total: deviceRecommendations.length,
        critical: deviceRecommendations.filter(r => r.priority === 'critical').length,
        high: deviceRecommendations.filter(r => r.priority === 'high').length
      },
      trends: deviceTrends.reduce((acc, trend) => {
        acc[trend.metric] = trend.trend;
        return acc;
      }, {} as { [key: string]: string }),
      optimization: {
        pendingTasks: deviceTasks.filter(t => t.status === 'pending').length,
        completedTasks: deviceTasks.filter(t => t.status === 'completed').length,
        lastOptimization: deviceTasks.find(t => t.status === 'completed')?.completed
      }
    };
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
