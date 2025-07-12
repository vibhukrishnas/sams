// SAMS Alert Processing Engine
// Phase 2 Week 4: Sophisticated Alert Processing with Rule Engine

const express = require('express');
const crypto = require('crypto');
const EventEmitter = require('events');

const app = express();
app.use(express.json());

const PORT = process.env.ALERT_ENGINE_PORT || 8086;

class AlertProcessingEngine extends EventEmitter {
  constructor() {
    super();
    
    this.alerts = new Map();
    this.rules = new Map();
    this.escalationPolicies = new Map();
    this.maintenanceWindows = new Map();
    this.suppressionRules = new Map();
    this.correlationGroups = new Map();
    
    this.config = {
      correlation: {
        timeWindow: 5 * 60 * 1000, // 5 minutes
        maxGroupSize: 10,
        similarityThreshold: 0.8
      },
      escalation: {
        defaultLevels: [
          { level: 1, delay: 0, channels: ['email'] },
          { level: 2, delay: 15 * 60 * 1000, channels: ['email', 'sms'] }, // 15 minutes
          { level: 3, delay: 60 * 60 * 1000, channels: ['email', 'sms', 'phone'] } // 1 hour
        ]
      },
      retention: {
        resolvedAlerts: 30 * 24 * 60 * 60 * 1000, // 30 days
        acknowledgedAlerts: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };
    
    this.severityLevels = {
      critical: { value: 5, color: '#FF0000', escalate: true },
      high: { value: 4, color: '#FF6600', escalate: true },
      warning: { value: 3, color: '#FFCC00', escalate: false },
      info: { value: 2, color: '#0099FF', escalate: false },
      low: { value: 1, color: '#00CC00', escalate: false }
    };
    
    this.alertStates = {
      OPEN: 'open',
      ACKNOWLEDGED: 'acknowledged',
      RESOLVED: 'resolved',
      SUPPRESSED: 'suppressed',
      ESCALATED: 'escalated'
    };
    
    this.initializeDefaultRules();
    this.startProcessingTasks();
    
    console.log('🚨 Alert Processing Engine initialized');
  }

  initializeDefaultRules() {
    // CPU Usage Rule
    this.addRule({
      id: 'cpu-critical',
      name: 'Critical CPU Usage',
      description: 'CPU usage above 90%',
      condition: {
        metric: 'cpu',
        operator: '>',
        threshold: 90,
        duration: 300000 // 5 minutes
      },
      severity: 'critical',
      enabled: true,
      tags: ['performance', 'cpu']
    });
    
    // Memory Usage Rule
    this.addRule({
      id: 'memory-high',
      name: 'High Memory Usage',
      description: 'Memory usage above 85%',
      condition: {
        metric: 'memory',
        operator: '>',
        threshold: 85,
        duration: 600000 // 10 minutes
      },
      severity: 'high',
      enabled: true,
      tags: ['performance', 'memory']
    });
    
    // Disk Space Rule
    this.addRule({
      id: 'disk-warning',
      name: 'Low Disk Space',
      description: 'Disk usage above 80%',
      condition: {
        metric: 'disk',
        operator: '>',
        threshold: 80,
        duration: 0 // Immediate
      },
      severity: 'warning',
      enabled: true,
      tags: ['storage', 'disk']
    });
    
    // Server Down Rule
    this.addRule({
      id: 'server-down',
      name: 'Server Unreachable',
      description: 'Server is not responding',
      condition: {
        metric: 'status',
        operator: '==',
        threshold: 'offline',
        duration: 60000 // 1 minute
      },
      severity: 'critical',
      enabled: true,
      tags: ['connectivity', 'availability']
    });
    
    console.log(`✅ ${this.rules.size} default alert rules loaded`);
  }

  startProcessingTasks() {
    // Process correlation every minute
    setInterval(() => {
      this.processCorrelation();
    }, 60000);
    
    // Process escalations every 30 seconds
    setInterval(() => {
      this.processEscalations();
    }, 30000);
    
    // Cleanup old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
    
    console.log('🔄 Alert processing tasks started');
  }

  // =============================================================================
  // RULE ENGINE
  // =============================================================================

  addRule(rule) {
    const ruleId = rule.id || crypto.randomUUID();
    const ruleData = {
      id: ruleId,
      name: rule.name,
      description: rule.description,
      condition: rule.condition,
      severity: rule.severity,
      enabled: rule.enabled !== false,
      tags: rule.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      triggeredCount: 0,
      lastTriggered: null
    };
    
    this.rules.set(ruleId, ruleData);
    console.log(`📋 Alert rule added: ${rule.name}`);
    return ruleId;
  }

  evaluateRules(metrics, serverId, serverName) {
    const triggeredRules = [];
    
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;
      
      try {
        if (this.evaluateCondition(rule.condition, metrics)) {
          // Check if this rule was already triggered recently
          const recentAlert = this.findRecentAlert(ruleId, serverId, rule.condition.duration);
          
          if (!recentAlert) {
            const alert = this.createAlert(rule, serverId, serverName, metrics);
            triggeredRules.push(alert);
            
            // Update rule statistics
            rule.triggeredCount++;
            rule.lastTriggered = new Date().toISOString();
          }
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
    
    return triggeredRules;
  }

  evaluateCondition(condition, metrics) {
    const metricValue = metrics[condition.metric];
    
    if (metricValue === undefined || metricValue === null) {
      return false;
    }
    
    switch (condition.operator) {
      case '>':
        return parseFloat(metricValue) > condition.threshold;
      case '<':
        return parseFloat(metricValue) < condition.threshold;
      case '>=':
        return parseFloat(metricValue) >= condition.threshold;
      case '<=':
        return parseFloat(metricValue) <= condition.threshold;
      case '==':
        return metricValue == condition.threshold;
      case '!=':
        return metricValue != condition.threshold;
      default:
        return false;
    }
  }

  findRecentAlert(ruleId, serverId, duration) {
    const cutoffTime = new Date(Date.now() - duration);
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.ruleId === ruleId && 
          alert.serverId === serverId && 
          new Date(alert.createdAt) > cutoffTime &&
          alert.state !== this.alertStates.RESOLVED) {
        return alert;
      }
    }
    
    return null;
  }

  // =============================================================================
  // ALERT CREATION AND MANAGEMENT
  // =============================================================================

  createAlert(rule, serverId, serverName, metrics) {
    const alertId = crypto.randomUUID();
    const alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      serverId: serverId,
      serverName: serverName,
      severity: rule.severity,
      state: this.alertStates.OPEN,
      title: `${rule.name} on ${serverName}`,
      description: rule.description,
      message: this.generateAlertMessage(rule, metrics),
      tags: [...rule.tags],
      metrics: { ...metrics },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
      resolvedBy: null,
      escalationLevel: 0,
      escalatedAt: null,
      correlationGroupId: null,
      suppressedUntil: null,
      notificationsSent: []
    };
    
    this.alerts.set(alertId, alert);
    
    // Check for suppression
    if (this.isAlertSuppressed(alert)) {
      alert.state = this.alertStates.SUPPRESSED;
      alert.suppressedUntil = this.getSuppressedUntil(alert);
    } else {
      // Process correlation
      this.correlateAlert(alert);
      
      // Emit alert event
      this.emit('alertCreated', alert);
    }
    
    console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
    return alert;
  }

  generateAlertMessage(rule, metrics) {
    const condition = rule.condition;
    const metricValue = metrics[condition.metric];
    
    return `${rule.description}. Current value: ${metricValue}${condition.metric === 'cpu' || condition.metric === 'memory' || condition.metric === 'disk' ? '%' : ''}, threshold: ${condition.threshold}${condition.metric === 'cpu' || condition.metric === 'memory' || condition.metric === 'disk' ? '%' : ''}`;
  }

  acknowledgeAlert(alertId, userId, userName) {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    if (alert.state === this.alertStates.RESOLVED) {
      throw new Error('Cannot acknowledge resolved alert');
    }
    
    alert.state = this.alertStates.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = { id: userId, name: userName };
    alert.updatedAt = new Date().toISOString();
    
    this.emit('alertAcknowledged', alert);
    console.log(`✅ Alert acknowledged: ${alert.title} by ${userName}`);
    
    return alert;
  }

  resolveAlert(alertId, userId, userName, resolution) {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    alert.state = this.alertStates.RESOLVED;
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = { id: userId, name: userName };
    alert.resolution = resolution;
    alert.updatedAt = new Date().toISOString();
    
    this.emit('alertResolved', alert);
    console.log(`✅ Alert resolved: ${alert.title} by ${userName}`);
    
    return alert;
  }

  // =============================================================================
  // ALERT CORRELATION
  // =============================================================================

  correlateAlert(alert) {
    // Find similar alerts within time window
    const timeWindow = this.config.correlation.timeWindow;
    const cutoffTime = new Date(Date.now() - timeWindow);
    
    const similarAlerts = [];
    
    for (const [existingId, existingAlert] of this.alerts.entries()) {
      if (existingAlert.id === alert.id) continue;
      
      if (new Date(existingAlert.createdAt) < cutoffTime) continue;
      
      if (existingAlert.state === this.alertStates.RESOLVED) continue;
      
      const similarity = this.calculateAlertSimilarity(alert, existingAlert);
      
      if (similarity >= this.config.correlation.similarityThreshold) {
        similarAlerts.push({ alert: existingAlert, similarity });
      }
    }
    
    if (similarAlerts.length > 0) {
      // Find or create correlation group
      let groupId = null;
      
      for (const similar of similarAlerts) {
        if (similar.alert.correlationGroupId) {
          groupId = similar.alert.correlationGroupId;
          break;
        }
      }
      
      if (!groupId) {
        groupId = crypto.randomUUID();
        this.correlationGroups.set(groupId, {
          id: groupId,
          createdAt: new Date().toISOString(),
          alerts: [],
          pattern: this.identifyPattern(similarAlerts.map(s => s.alert).concat([alert]))
        });
      }
      
      // Add alert to correlation group
      alert.correlationGroupId = groupId;
      const group = this.correlationGroups.get(groupId);
      group.alerts.push(alert.id);
      
      // Update similar alerts
      for (const similar of similarAlerts) {
        if (!similar.alert.correlationGroupId) {
          similar.alert.correlationGroupId = groupId;
          group.alerts.push(similar.alert.id);
        }
      }
      
      console.log(`🔗 Alert correlated: ${alert.title} (group: ${groupId})`);
    }
  }

  calculateAlertSimilarity(alert1, alert2) {
    let similarity = 0;
    
    // Same rule
    if (alert1.ruleId === alert2.ruleId) similarity += 0.4;
    
    // Same server
    if (alert1.serverId === alert2.serverId) similarity += 0.3;
    
    // Same severity
    if (alert1.severity === alert2.severity) similarity += 0.1;
    
    // Similar tags
    const commonTags = alert1.tags.filter(tag => alert2.tags.includes(tag));
    similarity += (commonTags.length / Math.max(alert1.tags.length, alert2.tags.length)) * 0.2;
    
    return similarity;
  }

  identifyPattern(alerts) {
    const patterns = {
      servers: [...new Set(alerts.map(a => a.serverId))],
      rules: [...new Set(alerts.map(a => a.ruleId))],
      severities: [...new Set(alerts.map(a => a.severity))],
      tags: [...new Set(alerts.flatMap(a => a.tags))]
    };
    
    return patterns;
  }

  // =============================================================================
  // ESCALATION MANAGEMENT
  // =============================================================================

  processEscalations() {
    const now = new Date();
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.state !== this.alertStates.OPEN) continue;
      
      const severityConfig = this.severityLevels[alert.severity];
      if (!severityConfig || !severityConfig.escalate) continue;
      
      const escalationPolicy = this.escalationPolicies.get(alert.serverId) || 
                              this.config.escalation.defaultLevels;
      
      const nextLevel = alert.escalationLevel + 1;
      if (nextLevel >= escalationPolicy.length) continue;
      
      const nextEscalation = escalationPolicy[nextLevel];
      const escalationTime = new Date(alert.createdAt).getTime() + nextEscalation.delay;
      
      if (now.getTime() >= escalationTime) {
        this.escalateAlert(alert, nextLevel);
      }
    }
  }

  escalateAlert(alert, level) {
    alert.escalationLevel = level;
    alert.escalatedAt = new Date().toISOString();
    alert.state = this.alertStates.ESCALATED;
    alert.updatedAt = new Date().toISOString();
    
    this.emit('alertEscalated', alert, level);
    console.log(`⬆️ Alert escalated: ${alert.title} to level ${level}`);
  }

  // =============================================================================
  // SUPPRESSION AND MAINTENANCE
  // =============================================================================

  isAlertSuppressed(alert) {
    // Check maintenance windows
    for (const [windowId, window] of this.maintenanceWindows.entries()) {
      if (this.isInMaintenanceWindow(alert, window)) {
        return true;
      }
    }
    
    // Check suppression rules
    for (const [ruleId, rule] of this.suppressionRules.entries()) {
      if (this.matchesSuppressionRule(alert, rule)) {
        return true;
      }
    }
    
    return false;
  }

  isInMaintenanceWindow(alert, window) {
    const now = new Date();
    const start = new Date(window.startTime);
    const end = new Date(window.endTime);
    
    if (now < start || now > end) return false;
    
    // Check if alert matches window criteria
    if (window.servers && !window.servers.includes(alert.serverId)) return false;
    if (window.rules && !window.rules.includes(alert.ruleId)) return false;
    if (window.tags && !window.tags.some(tag => alert.tags.includes(tag))) return false;
    
    return true;
  }

  matchesSuppressionRule(alert, rule) {
    if (rule.severity && rule.severity !== alert.severity) return false;
    if (rule.servers && !rule.servers.includes(alert.serverId)) return false;
    if (rule.rules && !rule.rules.includes(alert.ruleId)) return false;
    if (rule.tags && !rule.tags.some(tag => alert.tags.includes(tag))) return false;
    
    return true;
  }

  getSuppressedUntil(alert) {
    // Find the longest suppression period
    let suppressedUntil = new Date();
    
    for (const [windowId, window] of this.maintenanceWindows.entries()) {
      if (this.isInMaintenanceWindow(alert, window)) {
        const windowEnd = new Date(window.endTime);
        if (windowEnd > suppressedUntil) {
          suppressedUntil = windowEnd;
        }
      }
    }
    
    return suppressedUntil.toISOString();
  }

  // =============================================================================
  // CLEANUP AND MAINTENANCE
  // =============================================================================

  cleanupOldAlerts() {
    const now = new Date();
    let cleaned = 0;
    
    for (const [alertId, alert] of this.alerts.entries()) {
      let shouldDelete = false;
      
      if (alert.state === this.alertStates.RESOLVED) {
        const resolvedAge = now - new Date(alert.resolvedAt);
        if (resolvedAge > this.config.retention.resolvedAlerts) {
          shouldDelete = true;
        }
      } else if (alert.state === this.alertStates.ACKNOWLEDGED) {
        const acknowledgedAge = now - new Date(alert.acknowledgedAt);
        if (acknowledgedAge > this.config.retention.acknowledgedAlerts) {
          shouldDelete = true;
        }
      }
      
      if (shouldDelete) {
        this.alerts.delete(alertId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old alerts`);
    }
  }

  // =============================================================================
  // STATISTICS AND REPORTING
  // =============================================================================

  getAlertStats() {
    const stats = {
      total: this.alerts.size,
      byState: {},
      bySeverity: {},
      byServer: {},
      correlationGroups: this.correlationGroups.size,
      rules: this.rules.size,
      escalationPolicies: this.escalationPolicies.size,
      maintenanceWindows: this.maintenanceWindows.size
    };
    
    // Count by state
    for (const state of Object.values(this.alertStates)) {
      stats.byState[state] = 0;
    }
    
    // Count by severity
    for (const severity of Object.keys(this.severityLevels)) {
      stats.bySeverity[severity] = 0;
    }
    
    for (const alert of this.alerts.values()) {
      stats.byState[alert.state]++;
      stats.bySeverity[alert.severity]++;
      
      stats.byServer[alert.serverId] = (stats.byServer[alert.serverId] || 0) + 1;
    }
    
    return stats;
  }

  processMetrics(serverId, serverName, metrics) {
    try {
      const triggeredAlerts = this.evaluateRules(metrics, serverId, serverName);
      
      if (triggeredAlerts.length > 0) {
        console.log(`🚨 ${triggeredAlerts.length} alerts triggered for ${serverName}`);
      }
      
      return triggeredAlerts;
    } catch (error) {
      console.error('Error processing metrics:', error);
      return [];
    }
  }
}

// Initialize the alert engine
const alertEngine = new AlertProcessingEngine();

// =============================================================================
// REST API ENDPOINTS
// =============================================================================

// Get all alerts
app.get('/api/v1/alerts', (req, res) => {
  try {
    const {
      state,
      severity,
      serverId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let alerts = Array.from(alertEngine.alerts.values());

    // Apply filters
    if (state) {
      alerts = alerts.filter(a => a.state === state);
    }

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (serverId) {
      alerts = alerts.filter(a => a.serverId === serverId);
    }

    // Sort alerts
    alerts.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === 'desc') {
        return new Date(bValue) - new Date(aValue);
      } else {
        return new Date(aValue) - new Date(bValue);
      }
    });

    // Pagination
    const total = alerts.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAlerts = alerts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      code: 'ALERTS_GET_ERROR'
    });
  }
});

// Get alert by ID
app.get('/api/v1/alerts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const alert = alertEngine.alerts.get(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
        code: 'ALERT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert',
      code: 'ALERT_GET_ERROR'
    });
  }
});

// Acknowledge alert
app.post('/api/v1/alerts/:id/acknowledge', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        error: 'User ID and name are required',
        code: 'USER_INFO_REQUIRED'
      });
    }

    const alert = alertEngine.acknowledgeAlert(id, userId, userName);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: alert
    });

  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ALERT_ACKNOWLEDGE_ERROR'
    });
  }
});

// Resolve alert
app.post('/api/v1/alerts/:id/resolve', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, resolution } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        error: 'User ID and name are required',
        code: 'USER_INFO_REQUIRED'
      });
    }

    const alert = alertEngine.resolveAlert(id, userId, userName, resolution);

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });

  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ALERT_RESOLVE_ERROR'
    });
  }
});

// Get alert rules
app.get('/api/v1/alert-rules', (req, res) => {
  try {
    const rules = Array.from(alertEngine.rules.values());

    res.json({
      success: true,
      data: {
        rules,
        total: rules.length
      }
    });

  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert rules',
      code: 'RULES_GET_ERROR'
    });
  }
});

// Create alert rule
app.post('/api/v1/alert-rules', (req, res) => {
  try {
    const rule = req.body;

    // Validate required fields
    if (!rule.name || !rule.condition || !rule.severity) {
      return res.status(400).json({
        success: false,
        error: 'Name, condition, and severity are required',
        code: 'RULE_VALIDATION_ERROR'
      });
    }

    const ruleId = alertEngine.addRule(rule);
    const createdRule = alertEngine.rules.get(ruleId);

    res.status(201).json({
      success: true,
      message: 'Alert rule created successfully',
      data: createdRule
    });

  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert rule',
      code: 'RULE_CREATE_ERROR'
    });
  }
});

// Process metrics (for testing)
app.post('/api/v1/alerts/process-metrics', (req, res) => {
  try {
    const { serverId, serverName, metrics } = req.body;

    if (!serverId || !serverName || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'Server ID, name, and metrics are required',
        code: 'METRICS_VALIDATION_ERROR'
      });
    }

    const triggeredAlerts = alertEngine.processMetrics(serverId, serverName, metrics);

    res.json({
      success: true,
      message: 'Metrics processed successfully',
      data: {
        triggeredAlerts: triggeredAlerts.length,
        alerts: triggeredAlerts
      }
    });

  } catch (error) {
    console.error('Process metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process metrics',
      code: 'METRICS_PROCESS_ERROR'
    });
  }
});

// Get alert statistics
app.get('/api/v1/alerts/stats', (req, res) => {
  try {
    const stats = alertEngine.getAlertStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert statistics',
      code: 'STATS_GET_ERROR'
    });
  }
});

// Health check
app.get('/api/v1/alerts/health', (req, res) => {
  res.json({
    success: true,
    service: 'SAMS Alert Processing Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: alertEngine.getAlertStats()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚨 SAMS Alert Processing Engine running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/alerts/health`);
  console.log(`🔔 Alert management endpoints available`);
});

// Export for use in other modules
module.exports = {
  alertEngine,
  AlertProcessingEngine
};
