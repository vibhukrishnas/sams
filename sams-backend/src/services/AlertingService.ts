import { EventEmitter } from 'events';

export interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'service' | 'process' | 'security' | 'performance' | 'custom';
  severity: 'info' | 'warning' | 'error' | 'critical';
  deviceId: string;
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: string;
  tags: string[];
  correlatedAlerts?: string[];
  predictive?: boolean;
  trend?: 'increasing' | 'decreasing' | 'stable';
  metadata: { [key: string]: any };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  deviceId?: string; // If null, applies to all devices
  type: Alert['type'];
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  severity: Alert['severity'];
  enabled: boolean;
  cooldownPeriod: number; // minutes
  consecutiveChecks: number; // number of consecutive threshold breaches before alerting
  predictiveEnabled: boolean;
  predictiveWindow: number; // minutes to look ahead
  notificationChannels: string[]; // email, sms, webhook, etc.
  tags: string[];
  created: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertCorrelation {
  pattern: string;
  relatedMetrics: string[];
  timeWindow: number; // minutes
  description: string;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams' | 'pushbullet';
  name: string;
  config: { [key: string]: any };
  enabled: boolean;
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  alertsByType: { [type: string]: number };
  alertsBySeverity: { [severity: string]: number };
  alertsByDevice: { [deviceId: string]: number };
  averageResolutionTime: number;
  mostFrequentAlerts: { rule: string; count: number }[];
  trendsLastWeek: { [day: string]: number };
}

export class AlertingService extends EventEmitter {
  private static instance: AlertingService;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private correlationPatterns: AlertCorrelation[] = [];
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private metricHistory: Map<string, Array<{ timestamp: string; value: number }>> = new Map();
  private lastRuleCheck: Map<string, string> = new Map();

  public static getInstance(): AlertingService {
    if (!AlertingService.instance) {
      AlertingService.instance = new AlertingService();
    }
    return AlertingService.instance;
  }

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
    this.initializeCorrelationPatterns();
  }

  /**
   * Create a new alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id' | 'created' | 'triggerCount' | 'lastTriggered'>): AlertRule {
    const alertRule: AlertRule = {
      ...rule,
      id: this.generateId(),
      created: new Date().toISOString(),
      triggerCount: 0
    };

    this.alertRules.set(alertRule.id, alertRule);
    console.log(`Alert rule created: ${alertRule.name}`);
    
    return alertRule;
  }

  /**
   * Update an existing alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return null;
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    
    console.log(`Alert rule updated: ${updatedRule.name}`);
    return updatedRule;
  }

  /**
   * Delete an alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    this.alertRules.delete(ruleId);
    console.log(`Alert rule deleted: ${rule.name}`);
    return true;
  }

  /**
   * Process metric data and check for alerts
   */
  async processMetric(deviceId: string, metric: string, value: number, timestamp?: string): Promise<Alert[]> {
    const ts = timestamp || new Date().toISOString();
    
    // Store metric history
    this.storeMetricHistory(deviceId, metric, value, ts);

    // Check all applicable rules
    const triggeredAlerts: Alert[] = [];
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      if (rule.deviceId && rule.deviceId !== deviceId) continue;
      if (rule.metric !== metric) continue;

      const shouldTrigger = await this.evaluateRule(rule, deviceId, metric, value, ts);
      
      if (shouldTrigger) {
        const alert = await this.createAlert(rule, deviceId, value, ts);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      }
    }

    // Check for correlations
    if (triggeredAlerts.length > 0) {
      await this.checkCorrelations(deviceId, triggeredAlerts);
    }

    return triggeredAlerts;
  }

  /**
   * Create an alert from a triggered rule
   */
  private async createAlert(rule: AlertRule, deviceId: string, currentValue: number, timestamp: string): Promise<Alert | null> {
    // Check cooldown period
    const lastTriggered = this.lastRuleCheck.get(`${rule.id}_${deviceId}`);
    if (lastTriggered) {
      const cooldownMs = rule.cooldownPeriod * 60 * 1000;
      const timeSinceLastTrigger = Date.now() - new Date(lastTriggered).getTime();
      
      if (timeSinceLastTrigger < cooldownMs) {
        return null; // Still in cooldown
      }
    }

    // Check for predictive alerting
    let predictive = false;
    let trend: Alert['trend'] = 'stable';
    
    if (rule.predictiveEnabled) {
      const prediction = await this.performPredictiveAnalysis(deviceId, rule.metric, rule.predictiveWindow);
      predictive = prediction.willExceedThreshold;
      trend = prediction.trend;
    }

    const alert: Alert = {
      id: this.generateId(),
      type: rule.type,
      severity: rule.severity,
      deviceId,
      title: `${rule.name} Alert`,
      description: `${rule.metric} ${rule.operator} ${rule.threshold} (Current: ${currentValue})`,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      timestamp,
      acknowledged: false,
      resolved: false,
      tags: [...rule.tags],
      predictive,
      trend,
      metadata: {
        ruleId: rule.id,
        ruleName: rule.name,
        operator: rule.operator
      }
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Update rule statistics
    rule.triggerCount++;
    rule.lastTriggered = timestamp;
    this.lastRuleCheck.set(`${rule.id}_${deviceId}`, timestamp);

    // Send notifications
    await this.sendNotifications(alert, rule.notificationChannels);

    // Emit event
    this.emit('alertCreated', alert);

    console.log(`Alert created: ${alert.title} for device ${deviceId}`);
    return alert;
  }

  /**
   * Evaluate if a rule should trigger
   */
  private async evaluateRule(rule: AlertRule, deviceId: string, metric: string, value: number, timestamp: string): Promise<boolean> {
    // Check threshold
    let thresholdBreached = false;
    
    switch (rule.operator) {
      case '>':
        thresholdBreached = value > rule.threshold;
        break;
      case '<':
        thresholdBreached = value < rule.threshold;
        break;
      case '>=':
        thresholdBreached = value >= rule.threshold;
        break;
      case '<=':
        thresholdBreached = value <= rule.threshold;
        break;
      case '==':
        thresholdBreached = value === rule.threshold;
        break;
      case '!=':
        thresholdBreached = value !== rule.threshold;
        break;
    }

    if (!thresholdBreached) {
      return false;
    }

    // Check consecutive breaches
    if (rule.consecutiveChecks > 1) {
      const recentHistory = this.getRecentMetricHistory(deviceId, metric, rule.consecutiveChecks);
      let consecutiveBreaches = 0;
      
      for (const entry of recentHistory.reverse()) {
        const breached = this.evaluateThreshold(entry.value, rule.operator, rule.threshold);
        if (breached) {
          consecutiveBreaches++;
        } else {
          break;
        }
      }
      
      return consecutiveBreaches >= rule.consecutiveChecks;
    }

    return true;
  }

  /**
   * Perform predictive analysis
   */
  private async performPredictiveAnalysis(deviceId: string, metric: string, windowMinutes: number): Promise<{
    willExceedThreshold: boolean;
    trend: 'increasing' | 'decreasing' | 'stable';
    projectedValue?: number;
  }> {
    const history = this.getRecentMetricHistory(deviceId, metric, 20); // Get last 20 data points
    
    if (history.length < 5) {
      return { willExceedThreshold: false, trend: 'stable' };
    }

    // Simple linear regression for trend analysis
    const values = history.map(h => h.value);
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.1) { // Threshold for considering a trend significant
      trend = slope > 0 ? 'increasing' : 'decreasing';
    }

    // Project value ahead
    const futureX = n + (windowMinutes / 5); // Assuming 5-minute intervals
    const projectedValue = slope * futureX + intercept;

    return {
      willExceedThreshold: false, // Would need rule context to determine this
      trend,
      projectedValue
    };
  }

  /**
   * Check for alert correlations
   */
  private async checkCorrelations(deviceId: string, newAlerts: Alert[]): Promise<void> {
    for (const pattern of this.correlationPatterns) {
      const windowMs = pattern.timeWindow * 60 * 1000;
      const now = Date.now();

      // Get alerts within time window
      const recentAlerts = Array.from(this.alerts.values()).filter(alert => 
        alert.deviceId === deviceId &&
        (now - new Date(alert.timestamp).getTime()) <= windowMs
      );

      // Check if pattern matches
      const relatedAlerts = recentAlerts.filter(alert => 
        pattern.relatedMetrics.includes(alert.metric || '')
      );

      if (relatedAlerts.length >= 2) {
        // Create correlation
        const correlationId = this.generateId();
        
        for (const alert of relatedAlerts) {
          if (!alert.correlatedAlerts) {
            alert.correlatedAlerts = [];
          }
          alert.correlatedAlerts.push(correlationId);
        }

        console.log(`Alert correlation detected: ${pattern.description} for device ${deviceId}`);
        this.emit('alertCorrelation', {
          id: correlationId,
          pattern: pattern.pattern,
          description: pattern.description,
          alerts: relatedAlerts,
          deviceId
        });
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.metadata.acknowledgedBy = userId;
    alert.metadata.acknowledgedAt = new Date().toISOString();

    this.emit('alertAcknowledged', alert);
    console.log(`Alert acknowledged: ${alert.title}`);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    alert.metadata.resolvedBy = userId;

    this.emit('alertResolved', alert);
    console.log(`Alert resolved: ${alert.title}`);
    return true;
  }

  /**
   * Get all alerts
   */
  getAlerts(filters?: {
    deviceId?: string;
    type?: string;
    severity?: string;
    resolved?: boolean;
    acknowledged?: boolean;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.deviceId) {
        alerts = alerts.filter(a => a.deviceId === filters.deviceId);
      }
      if (filters.type) {
        alerts = alerts.filter(a => a.type === filters.type);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        alerts = alerts.filter(a => a.resolved === filters.resolved);
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
      }
    }

    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): AlertStatistics {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(a => !a.resolved);

    const alertsByType: { [type: string]: number } = {};
    const alertsBySeverity: { [severity: string]: number } = {};
    const alertsByDevice: { [deviceId: string]: number } = {};

    for (const alert of allAlerts) {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByDevice[alert.deviceId] = (alertsByDevice[alert.deviceId] || 0) + 1;
    }

    // Calculate average resolution time
    const resolvedAlerts = allAlerts.filter(a => a.resolved && a.resolvedAt);
    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      const created = new Date(alert.timestamp).getTime();
      const resolved = new Date(alert.resolvedAt!).getTime();
      return sum + (resolved - created);
    }, 0);
    
    const averageResolutionTime = resolvedAlerts.length > 0 ? 
      totalResolutionTime / resolvedAlerts.length / (1000 * 60) : 0; // Convert to minutes

    // Most frequent alerts
    const ruleFrequency = new Map<string, number>();
    for (const alert of allAlerts) {
      const ruleId = alert.metadata.ruleId;
      if (ruleId) {
        ruleFrequency.set(ruleId, (ruleFrequency.get(ruleId) || 0) + 1);
      }
    }

    const mostFrequentAlerts = Array.from(ruleFrequency.entries())
      .map(([ruleId, count]) => {
        const rule = this.alertRules.get(ruleId);
        return { rule: rule?.name || ruleId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Trends for last week
    const trendsLastWeek: { [day: string]: number } = {};
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weekAlerts = allAlerts.filter(a => new Date(a.timestamp).getTime() > weekAgo);
    
    for (const alert of weekAlerts) {
      const day = new Date(alert.timestamp).toISOString().split('T')[0];
      trendsLastWeek[day] = (trendsLastWeek[day] || 0) + 1;
    }

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      alertsByType,
      alertsBySeverity,
      alertsByDevice,
      averageResolutionTime,
      mostFrequentAlerts,
      trendsLastWeek
    };
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert, channelIds: string[]): Promise<void> {
    for (const channelId of channelIds) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) {
        continue;
      }

      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        console.error(`Failed to send notification via ${channel.name}:`, error);
      }
    }
  }

  /**
   * Send a single notification
   */
  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    const message = this.formatNotificationMessage(alert);
    
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookNotification(channel.config.url, alert, message);
        break;
      case 'email':
        console.log(`Email notification sent to ${channel.config.recipient}: ${message}`);
        break;
      case 'sms':
        console.log(`SMS notification sent to ${channel.config.phoneNumber}: ${message}`);
        break;
      default:
        console.log(`${channel.type} notification: ${message}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(url: string, alert: Alert, message: string): Promise<void> {
    // This would typically use axios or similar HTTP client
    console.log(`Webhook notification sent to ${url}: ${message}`);
  }

  /**
   * Format notification message
   */
  private formatNotificationMessage(alert: Alert): string {
    return `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.title}\n` +
           `Device: ${alert.deviceId}\n` +
           `Description: ${alert.description}\n` +
           `Time: ${alert.timestamp}`;
  }

  // Helper methods
  private storeMetricHistory(deviceId: string, metric: string, value: number, timestamp: string): void {
    const key = `${deviceId}:${metric}`;
    if (!this.metricHistory.has(key)) {
      this.metricHistory.set(key, []);
    }
    
    const history = this.metricHistory.get(key)!;
    history.push({ timestamp, value });
    
    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private getRecentMetricHistory(deviceId: string, metric: string, count: number): Array<{ timestamp: string; value: number }> {
    const key = `${deviceId}:${metric}`;
    const history = this.metricHistory.get(key) || [];
    return history.slice(-count);
  }

  private evaluateThreshold(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultRules(): void {
    // CPU Usage Rule
    this.createAlertRule({
      name: 'High CPU Usage',
      description: 'CPU usage exceeds 85%',
      type: 'cpu',
      metric: 'cpu_usage_percent',
      operator: '>',
      threshold: 85,
      severity: 'warning',
      enabled: true,
      cooldownPeriod: 5,
      consecutiveChecks: 2,
      predictiveEnabled: true,
      predictiveWindow: 10,
      notificationChannels: ['default_webhook'],
      tags: ['performance', 'cpu']
    });

    // Memory Usage Rule
    this.createAlertRule({
      name: 'High Memory Usage',
      description: 'Memory usage exceeds 90%',
      type: 'memory',
      metric: 'memory_usage_percent',
      operator: '>',
      threshold: 90,
      severity: 'error',
      enabled: true,
      cooldownPeriod: 5,
      consecutiveChecks: 2,
      predictiveEnabled: true,
      predictiveWindow: 15,
      notificationChannels: ['default_webhook'],
      tags: ['performance', 'memory']
    });

    // Disk Space Rule
    this.createAlertRule({
      name: 'Low Disk Space',
      description: 'Disk space usage exceeds 90%',
      type: 'disk',
      metric: 'disk_usage_percent',
      operator: '>',
      threshold: 90,
      severity: 'error',
      enabled: true,
      cooldownPeriod: 15,
      consecutiveChecks: 1,
      predictiveEnabled: true,
      predictiveWindow: 30,
      notificationChannels: ['default_webhook'],
      tags: ['storage', 'disk']
    });
  }

  private initializeDefaultChannels(): void {
    this.notificationChannels.set('default_webhook', {
      id: 'default_webhook',
      type: 'webhook',
      name: 'Default Webhook',
      config: {
        url: 'http://localhost:3000/api/notifications/webhook'
      },
      enabled: true
    });
  }

  private initializeCorrelationPatterns(): void {
    this.correlationPatterns.push(
      {
        pattern: 'performance_degradation',
        relatedMetrics: ['cpu_usage_percent', 'memory_usage_percent', 'disk_io_wait'],
        timeWindow: 10,
        description: 'System performance degradation detected'
      },
      {
        pattern: 'resource_exhaustion',
        relatedMetrics: ['memory_usage_percent', 'disk_usage_percent'],
        timeWindow: 5,
        description: 'Resource exhaustion pattern detected'
      }
    );
  }
}
