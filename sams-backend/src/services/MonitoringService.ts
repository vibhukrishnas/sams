import { DatabaseService } from './DatabaseService';
import { WebSocketService } from './WebSocketService';
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServerMetrics {
  serverId: string;
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
  };
  uptime: number;
  status: 'online' | 'offline' | 'warning' | 'critical';
}

interface AlertRule {
  id: string;
  metric: string;
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  threshold: number;
  duration: number; // minutes
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class MonitoringService {
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static alertRules: AlertRule[] = [];
  private static metricsHistory: Map<string, ServerMetrics[]> = new Map();

  public static async initialize(): Promise<void> {
    try {
      // Load alert rules from database
      await this.loadAlertRules();
      
      // Start monitoring loop
      this.startMonitoring();
      
      logger.info('Monitoring service initialized');
    } catch (error) {
      logger.error('Failed to initialize monitoring service:', error);
      throw error;
    }
  }

  private static async loadAlertRules(): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      const rules = await db('alert_rules').where('enabled', true);
      this.alertRules = rules;
      logger.info(`Loaded ${rules.length} alert rules`);
    } catch (error) {
      logger.error('Failed to load alert rules:', error);
    }
  }

  private static startMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 30000);

    logger.info('Monitoring loop started (30s interval)');
  }

  private static async collectMetrics(): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      const servers = await db('servers')
        .where('monitoring_enabled', true)
        .where('status', '!=', 'offline');

      for (const server of servers) {
        try {
          const metrics = await this.collectServerMetrics(server);
          await this.storeMetrics(metrics);
          await this.checkAlertRules(server, metrics);
          
          // Update server last_seen
          await db('servers')
            .where('id', server.id)
            .update({ 
              last_seen: new Date(),
              last_heartbeat: new Date(),
              status: metrics.status
            });

          // Broadcast metrics update
          WebSocketService.broadcastServerUpdate({
            ...server,
            metrics,
            last_seen: new Date()
          });

        } catch (error) {
          logger.error(`Failed to collect metrics for server ${server.name}:`, error);
          
          // Mark server as offline if monitoring fails
          await db('servers')
            .where('id', server.id)
            .update({ status: 'offline' });
        }
      }
    } catch (error) {
      logger.error('Error in monitoring loop:', error);
    }
  }

  private static async collectServerMetrics(server: any): Promise<ServerMetrics> {
    // Try different methods to collect metrics based on server type
    if (server.agent_version) {
      // Use SAMS agent if available
      return this.collectMetricsFromAgent(server);
    } else if (server.type === 'linux') {
      // Use SSH for Linux servers
      return this.collectMetricsViaSSH(server);
    } else {
      // Use SNMP or other protocols
      return this.collectMetricsViaSNMP(server);
    }
  }

  private static async collectMetricsFromAgent(server: any): Promise<ServerMetrics> {
    try {
      const response = await axios.get(`http://${server.ip_address}:9100/metrics`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${server.agent_token || ''}`
        }
      });

      // Parse Prometheus-style metrics
      const metrics = this.parsePrometheusMetrics(response.data);
      
      return {
        serverId: server.id,
        timestamp: new Date(),
        cpu: {
          usage: metrics.cpu_usage || 0,
          loadAverage: metrics.load_average || [0, 0, 0],
          cores: metrics.cpu_cores || 1
        },
        memory: {
          total: metrics.memory_total || 0,
          used: metrics.memory_used || 0,
          free: metrics.memory_free || 0,
          usage: metrics.memory_usage || 0
        },
        disk: {
          total: metrics.disk_total || 0,
          used: metrics.disk_used || 0,
          free: metrics.disk_free || 0,
          usage: metrics.disk_usage || 0
        },
        network: {
          bytesIn: metrics.network_bytes_in || 0,
          bytesOut: metrics.network_bytes_out || 0,
          packetsIn: metrics.network_packets_in || 0,
          packetsOut: metrics.network_packets_out || 0
        },
        processes: {
          total: metrics.processes_total || 0,
          running: metrics.processes_running || 0,
          sleeping: metrics.processes_sleeping || 0
        },
        uptime: metrics.uptime || 0,
        status: this.determineServerStatus(metrics)
      };
    } catch (error) {
      logger.error(`Failed to collect metrics from agent for ${server.name}:`, error);
      throw error;
    }
  }

  private static async collectMetricsViaSSH(server: any): Promise<ServerMetrics> {
    try {
      // Simulate SSH metrics collection
      // In production, you would use actual SSH connection
      const commands = [
        'cat /proc/loadavg',
        'free -m',
        'df -h /',
        'uptime',
        'ps aux | wc -l'
      ];

      // For demo purposes, generate realistic metrics
      const cpuUsage = Math.random() * 100;
      const memoryUsage = Math.random() * 100;
      const diskUsage = Math.random() * 100;

      return {
        serverId: server.id,
        timestamp: new Date(),
        cpu: {
          usage: cpuUsage,
          loadAverage: [Math.random() * 4, Math.random() * 4, Math.random() * 4],
          cores: 4
        },
        memory: {
          total: 8192,
          used: (memoryUsage / 100) * 8192,
          free: 8192 - (memoryUsage / 100) * 8192,
          usage: memoryUsage
        },
        disk: {
          total: 100000,
          used: (diskUsage / 100) * 100000,
          free: 100000 - (diskUsage / 100) * 100000,
          usage: diskUsage
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000),
          packetsIn: Math.floor(Math.random() * 10000),
          packetsOut: Math.floor(Math.random() * 10000)
        },
        processes: {
          total: Math.floor(Math.random() * 200) + 50,
          running: Math.floor(Math.random() * 10) + 1,
          sleeping: Math.floor(Math.random() * 180) + 40
        },
        uptime: Math.floor(Math.random() * 86400 * 30), // Up to 30 days
        status: this.determineServerStatus({ cpu_usage: cpuUsage, memory_usage: memoryUsage, disk_usage: diskUsage })
      };
    } catch (error) {
      logger.error(`Failed to collect metrics via SSH for ${server.name}:`, error);
      throw error;
    }
  }

  private static async collectMetricsViaSNMP(server: any): Promise<ServerMetrics> {
    // Placeholder for SNMP metrics collection
    // In production, you would use SNMP libraries
    return this.collectMetricsViaSSH(server); // Fallback to SSH method
  }

  private static parsePrometheusMetrics(data: string): any {
    const metrics: any = {};
    const lines = data.split('\n');

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      const [metricLine, value] = line.split(' ');
      if (!metricLine || !value) continue;

      const [metricName] = metricLine.split('{');
      metrics[metricName] = parseFloat(value);
    }

    return metrics;
  }

  private static determineServerStatus(metrics: any): 'online' | 'offline' | 'warning' | 'critical' {
    const cpuUsage = metrics.cpu_usage || 0;
    const memoryUsage = metrics.memory_usage || 0;
    const diskUsage = metrics.disk_usage || 0;

    if (cpuUsage > 90 || memoryUsage > 90 || diskUsage > 95) {
      return 'critical';
    } else if (cpuUsage > 80 || memoryUsage > 80 || diskUsage > 85) {
      return 'warning';
    } else {
      return 'online';
    }
  }

  private static async storeMetrics(metrics: ServerMetrics): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      
      await db('server_metrics').insert({
        server_id: metrics.serverId,
        timestamp: metrics.timestamp,
        cpu_usage: metrics.cpu.usage,
        cpu_load_avg: JSON.stringify(metrics.cpu.loadAverage),
        memory_total: metrics.memory.total,
        memory_used: metrics.memory.used,
        memory_usage: metrics.memory.usage,
        disk_total: metrics.disk.total,
        disk_used: metrics.disk.used,
        disk_usage: metrics.disk.usage,
        network_bytes_in: metrics.network.bytesIn,
        network_bytes_out: metrics.network.bytesOut,
        processes_total: metrics.processes.total,
        uptime: metrics.uptime,
        status: metrics.status
      });

      // Keep metrics history in memory for quick access
      if (!this.metricsHistory.has(metrics.serverId)) {
        this.metricsHistory.set(metrics.serverId, []);
      }
      
      const history = this.metricsHistory.get(metrics.serverId)!;
      history.push(metrics);
      
      // Keep only last 100 metrics per server
      if (history.length > 100) {
        history.shift();
      }

    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  private static async checkAlertRules(server: any, metrics: ServerMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      try {
        const shouldAlert = this.evaluateAlertRule(rule, metrics);
        
        if (shouldAlert) {
          await this.createAlert(server, rule, metrics);
        }
      } catch (error) {
        logger.error(`Failed to evaluate alert rule ${rule.id}:`, error);
      }
    }
  }

  private static evaluateAlertRule(rule: AlertRule, metrics: ServerMetrics): boolean {
    let metricValue: number;

    // Get the metric value based on rule configuration
    switch (rule.metric) {
      case 'cpu_usage':
        metricValue = metrics.cpu.usage;
        break;
      case 'memory_usage':
        metricValue = metrics.memory.usage;
        break;
      case 'disk_usage':
        metricValue = metrics.disk.usage;
        break;
      case 'load_average':
        metricValue = metrics.cpu.loadAverage[0];
        break;
      default:
        return false;
    }

    // Evaluate the condition
    switch (rule.operator) {
      case '>':
        return metricValue > rule.threshold;
      case '<':
        return metricValue < rule.threshold;
      case '>=':
        return metricValue >= rule.threshold;
      case '<=':
        return metricValue <= rule.threshold;
      case '=':
        return metricValue === rule.threshold;
      case '!=':
        return metricValue !== rule.threshold;
      default:
        return false;
    }
  }

  private static async createAlert(server: any, rule: AlertRule, metrics: ServerMetrics): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      
      // Check if similar alert already exists (deduplication)
      const existingAlert = await db('alerts')
        .where('server_id', server.id)
        .where('metric_name', rule.metric)
        .where('status', 'active')
        .first();

      if (existingAlert) {
        // Update existing alert
        await db('alerts')
          .where('id', existingAlert.id)
          .update({
            last_seen: new Date(),
            occurrence_count: existingAlert.occurrence_count + 1,
            metric_value: this.getMetricValue(rule.metric, metrics)
          });
        return;
      }

      // Create new alert
      const alertData = {
        title: `${rule.metric.replace('_', ' ').toUpperCase()} Alert`,
        message: `${rule.metric} is ${this.getMetricValue(rule.metric, metrics)}% on ${server.name}`,
        severity: rule.severity,
        type: 'threshold',
        category: 'performance',
        source: 'SAMS Monitoring',
        server_id: server.id,
        server_name: server.name,
        metric_name: rule.metric,
        metric_value: this.getMetricValue(rule.metric, metrics),
        threshold_value: rule.threshold,
        first_seen: new Date(),
        last_seen: new Date()
      };

      const alert = await DatabaseService.create('alerts', alertData);

      // Send notifications
      await NotificationService.sendAlertNotification(alert);

      // Broadcast to WebSocket clients
      WebSocketService.broadcastAlert(alert);

      logger.info(`Alert created: ${alert.title} for server ${server.name}`);

    } catch (error) {
      logger.error('Failed to create alert:', error);
    }
  }

  private static getMetricValue(metric: string, metrics: ServerMetrics): number {
    switch (metric) {
      case 'cpu_usage':
        return metrics.cpu.usage;
      case 'memory_usage':
        return metrics.memory.usage;
      case 'disk_usage':
        return metrics.disk.usage;
      case 'load_average':
        return metrics.cpu.loadAverage[0];
      default:
        return 0;
    }
  }

  public static stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Monitoring service stopped');
    }
  }

  public static getMetricsHistory(serverId: string): ServerMetrics[] {
    return this.metricsHistory.get(serverId) || [];
  }

  public static async getServerHealth(): Promise<any> {
    const db = DatabaseService.getConnection();
    
    const stats = await db('servers')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as online', ['online']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as offline', ['offline']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as warning', ['warning']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as critical', ['critical'])
      )
      .first();

    return stats;
  }
}
