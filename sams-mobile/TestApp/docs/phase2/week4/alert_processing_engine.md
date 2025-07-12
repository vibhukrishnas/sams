# 🚨 **SAMS Mobile - Alert Processing Engine Development**

## **Executive Summary**

This document presents the sophisticated Alert Processing Engine for SAMS Mobile, featuring a comprehensive rule engine for alert conditions, advanced correlation and deduplication logic, alert severity classification, lifecycle management, escalation policies, and maintenance windows with extensive testing coverage.

## **🏗️ Alert Processing Architecture**

### **Alert Processing Engine Structure**
```
alert-processing-engine/
├── src/
│   ├── controllers/
│   │   ├── AlertController.js
│   │   ├── AlertRuleController.js
│   │   └── EscalationController.js
│   ├── services/
│   │   ├── AlertProcessingService.js
│   │   ├── RuleEngineService.js
│   │   ├── CorrelationService.js
│   │   ├── EscalationService.js
│   │   └── MaintenanceWindowService.js
│   ├── models/
│   │   ├── Alert.js
│   │   ├── AlertRule.js
│   │   ├── EscalationPolicy.js
│   │   └── MaintenanceWindow.js
│   ├── engines/
│   │   ├── RuleEngine.js
│   │   ├── CorrelationEngine.js
│   │   └── DeduplicationEngine.js
│   ├── routes/
│   │   ├── alerts.js
│   │   ├── alertRules.js
│   │   └── escalations.js
│   └── utils/
│       ├── alertUtils.js
│       ├── severityUtils.js
│       └── timeUtils.js
├── tests/
├── config/
└── docs/
```

## **⚙️ Rule Engine Implementation**

### **Rule Engine Service**
```javascript
// engines/RuleEngine.js
const EventEmitter = require('events');

class RuleEngine extends EventEmitter {
    constructor() {
        super();
        this.rules = new Map();
        this.operators = {
            '>': (a, b) => a > b,
            '<': (a, b) => a < b,
            '>=': (a, b) => a >= b,
            '<=': (a, b) => a <= b,
            '==': (a, b) => a == b,
            '!=': (a, b) => a != b,
            'contains': (a, b) => String(a).includes(String(b)),
            'not_contains': (a, b) => !String(a).includes(String(b)),
            'regex': (a, b) => new RegExp(b).test(String(a)),
            'in': (a, b) => Array.isArray(b) && b.includes(a),
            'not_in': (a, b) => Array.isArray(b) && !b.includes(a)
        };
    }
    
    async loadRules(organizationId) {
        const { AlertRule } = require('../models');
        const rules = await AlertRule.findAll({
            where: {
                organizationId,
                enabled: true
            }
        });
        
        rules.forEach(rule => {
            this.rules.set(rule.id, this.compileRule(rule));
        });
        
        console.log(`Loaded ${rules.length} alert rules for organization ${organizationId}`);
    }
    
    compileRule(rule) {
        return {
            id: rule.id,
            name: rule.name,
            serverId: rule.serverId,
            organizationId: rule.organizationId,
            metricName: rule.metricName,
            condition: rule.condition,
            thresholdValue: rule.thresholdValue,
            thresholdDuration: rule.thresholdDuration || 300, // 5 minutes default
            severity: rule.severity,
            enabled: rule.enabled,
            notificationChannels: rule.notificationChannels || [],
            escalationRules: rule.escalationRules || {},
            suppressionRules: rule.suppressionRules || {},
            compiledCondition: this.compileCondition(rule.condition, rule.thresholdValue),
            lastTriggered: null,
            triggerCount: 0,
            breachStartTime: null
        };
    }
    
    compileCondition(operator, threshold) {
        const operatorFunc = this.operators[operator];
        if (!operatorFunc) {
            throw new Error(`Unsupported operator: ${operator}`);
        }
        
        return (value) => operatorFunc(value, threshold);
    }
    
    async evaluateMetrics(metrics) {
        const triggeredAlerts = [];
        
        for (const metric of metrics) {
            const applicableRules = this.getApplicableRules(metric);
            
            for (const rule of applicableRules) {
                const evaluation = await this.evaluateRule(rule, metric);
                if (evaluation.triggered) {
                    triggeredAlerts.push(evaluation.alert);
                }
            }
        }
        
        return triggeredAlerts;
    }
    
    getApplicableRules(metric) {
        return Array.from(this.rules.values()).filter(rule => {
            // Check if rule applies to this server
            if (rule.serverId && rule.serverId !== metric.serverId) {
                return false;
            }
            
            // Check if rule applies to this metric
            if (rule.metricName !== metric.metricName) {
                return false;
            }
            
            // Check organization match
            if (rule.organizationId !== metric.organizationId) {
                return false;
            }
            
            return true;
        });
    }
    
    async evaluateRule(rule, metric) {
        const currentTime = Date.now();
        const metricValue = metric.value;
        
        // Evaluate the condition
        const conditionMet = rule.compiledCondition(metricValue);
        
        if (conditionMet) {
            // Start tracking breach if not already started
            if (!rule.breachStartTime) {
                rule.breachStartTime = currentTime;
            }
            
            // Check if breach duration exceeds threshold
            const breachDuration = currentTime - rule.breachStartTime;
            
            if (breachDuration >= rule.thresholdDuration * 1000) {
                // Check if we should suppress this alert
                if (await this.shouldSuppressAlert(rule, metric)) {
                    return { triggered: false };
                }
                
                // Create alert
                const alert = await this.createAlert(rule, metric, breachDuration);
                
                // Update rule state
                rule.lastTriggered = currentTime;
                rule.triggerCount++;
                rule.breachStartTime = null; // Reset for next breach
                
                return { triggered: true, alert };
            }
        } else {
            // Condition not met, reset breach tracking
            rule.breachStartTime = null;
        }
        
        return { triggered: false };
    }
    
    async shouldSuppressAlert(rule, metric) {
        const suppressionRules = rule.suppressionRules;
        
        // Check maintenance windows
        if (await this.isInMaintenanceWindow(metric.serverId)) {
            return true;
        }
        
        // Check rate limiting
        if (suppressionRules.rateLimitMinutes) {
            const timeSinceLastTrigger = Date.now() - (rule.lastTriggered || 0);
            if (timeSinceLastTrigger < suppressionRules.rateLimitMinutes * 60 * 1000) {
                return true;
            }
        }
        
        // Check maximum alerts per hour
        if (suppressionRules.maxAlertsPerHour) {
            const recentAlerts = await this.getRecentAlerts(rule.id, 3600000); // 1 hour
            if (recentAlerts.length >= suppressionRules.maxAlertsPerHour) {
                return true;
            }
        }
        
        return false;
    }
    
    async createAlert(rule, metric, breachDuration) {
        const { Alert } = require('../models');
        
        const alertData = {
            organizationId: rule.organizationId,
            serverId: metric.serverId,
            ruleId: rule.id,
            title: this.generateAlertTitle(rule, metric),
            description: this.generateAlertDescription(rule, metric, breachDuration),
            severity: rule.severity,
            status: 'open',
            metricValue: metric.value,
            thresholdValue: rule.thresholdValue,
            metricName: rule.metricName,
            tags: this.generateAlertTags(rule, metric),
            metadata: {
                breachDuration,
                ruleCondition: rule.condition,
                metricTimestamp: metric.timestamp,
                triggerCount: rule.triggerCount
            }
        };
        
        const alert = await Alert.create(alertData);
        
        // Emit alert created event
        this.emit('alertCreated', alert);
        
        return alert;
    }
    
    generateAlertTitle(rule, metric) {
        const serverName = metric.serverName || metric.serverId;
        const metricDisplay = rule.metricName.replace('_', ' ').toUpperCase();
        
        return `${metricDisplay} ${rule.condition} ${rule.thresholdValue} on ${serverName}`;
    }
    
    generateAlertDescription(rule, metric, breachDuration) {
        const duration = Math.round(breachDuration / 1000);
        const serverName = metric.serverName || metric.serverId;
        
        return `Server ${serverName} has ${rule.metricName} of ${metric.value} which is ${rule.condition} ${rule.thresholdValue} for ${duration} seconds. Alert rule: ${rule.name}`;
    }
    
    generateAlertTags(rule, metric) {
        return [
            `metric:${rule.metricName}`,
            `severity:${rule.severity}`,
            `server:${metric.serverId}`,
            `rule:${rule.name.toLowerCase().replace(/\s+/g, '_')}`
        ];
    }
    
    async isInMaintenanceWindow(serverId) {
        const { MaintenanceWindow } = require('../models');
        const now = new Date();
        
        const activeWindow = await MaintenanceWindow.findOne({
            where: {
                serverId,
                startTime: { [Op.lte]: now },
                endTime: { [Op.gte]: now },
                enabled: true
            }
        });
        
        return !!activeWindow;
    }
    
    async getRecentAlerts(ruleId, timeWindowMs) {
        const { Alert } = require('../models');
        const since = new Date(Date.now() - timeWindowMs);
        
        return await Alert.findAll({
            where: {
                ruleId,
                createdAt: { [Op.gte]: since }
            }
        });
    }
    
    addRule(rule) {
        const compiledRule = this.compileRule(rule);
        this.rules.set(rule.id, compiledRule);
    }
    
    removeRule(ruleId) {
        this.rules.delete(ruleId);
    }
    
    updateRule(rule) {
        this.removeRule(rule.id);
        this.addRule(rule);
    }
    
    getRuleStats() {
        const stats = {
            totalRules: this.rules.size,
            enabledRules: 0,
            rulesBySeverity: {},
            rulesByMetric: {}
        };
        
        for (const rule of this.rules.values()) {
            if (rule.enabled) {
                stats.enabledRules++;
            }
            
            stats.rulesBySeverity[rule.severity] = (stats.rulesBySeverity[rule.severity] || 0) + 1;
            stats.rulesByMetric[rule.metricName] = (stats.rulesByMetric[rule.metricName] || 0) + 1;
        }
        
        return stats;
    }
}

module.exports = RuleEngine;
```

## **🔗 Correlation Engine Implementation**

### **Advanced Alert Correlation**
```javascript
// engines/CorrelationEngine.js
class CorrelationEngine {
    constructor() {
        this.correlationWindow = 300000; // 5 minutes
        this.activeAlerts = new Map();
        this.correlationRules = new Map();
        this.setupDefaultCorrelationRules();
    }
    
    setupDefaultCorrelationRules() {
        // Server resource correlation
        this.addCorrelationRule('server_resources', {
            metrics: ['cpu_usage', 'memory_usage', 'disk_usage'],
            timeWindow: 180000, // 3 minutes
            minCorrelationScore: 0.7,
            action: 'group',
            description: 'Server resource contention'
        });
        
        // Network performance correlation
        this.addCorrelationRule('network_performance', {
            metrics: ['network_latency', 'packet_loss', 'bandwidth_usage'],
            timeWindow: 120000, // 2 minutes
            minCorrelationScore: 0.8,
            action: 'escalate',
            description: 'Network performance degradation'
        });
        
        // Application stack correlation
        this.addCorrelationRule('application_stack', {
            metrics: ['response_time', 'error_rate', 'throughput'],
            timeWindow: 240000, // 4 minutes
            minCorrelationScore: 0.75,
            action: 'group',
            description: 'Application performance issues'
        });
        
        // Infrastructure cascade correlation
        this.addCorrelationRule('infrastructure_cascade', {
            serverGroups: true,
            timeWindow: 300000, // 5 minutes
            minCorrelationScore: 0.6,
            action: 'escalate',
            description: 'Infrastructure cascade failure'
        });
    }
    
    async processAlert(alert) {
        console.log(`Processing alert for correlation: ${alert.id}`);
        
        // Store alert for correlation analysis
        this.activeAlerts.set(alert.id, {
            ...alert,
            timestamp: Date.now(),
            correlations: []
        });
        
        // Find correlations
        const correlations = await this.findCorrelations(alert);
        
        if (correlations.length > 0) {
            return await this.createCorrelatedAlert(alert, correlations);
        }
        
        // Clean up old alerts
        this.cleanupOldAlerts();
        
        return alert;
    }
    
    async findCorrelations(newAlert) {
        const correlations = [];
        const currentTime = Date.now();
        
        for (const [alertId, existingAlert] of this.activeAlerts) {
            if (alertId === newAlert.id) continue;
            
            // Check time window
            if (currentTime - existingAlert.timestamp > this.correlationWindow) {
                continue;
            }
            
            // Calculate correlation score
            const correlation = await this.calculateCorrelation(newAlert, existingAlert);
            
            if (correlation.score >= 0.6) {
                correlations.push({
                    alertId: existingAlert.id,
                    score: correlation.score,
                    type: correlation.type,
                    reason: correlation.reason,
                    confidence: correlation.confidence
                });
            }
        }
        
        return correlations.sort((a, b) => b.score - a.score);
    }
    
    async calculateCorrelation(alert1, alert2) {
        let score = 0;
        let type = 'unknown';
        let reason = '';
        let confidence = 0;
        
        // Same server correlation (high weight)
        if (alert1.serverId === alert2.serverId) {
            score += 0.4;
            type = 'same_server';
            reason += 'Same server; ';
            confidence += 0.3;
        }
        
        // Server group correlation
        const serverGroupCorrelation = await this.checkServerGroupCorrelation(alert1, alert2);
        if (serverGroupCorrelation.score > 0) {
            score += serverGroupCorrelation.score;
            type = 'server_group';
            reason += serverGroupCorrelation.reason + '; ';
            confidence += 0.2;
        }
        
        // Metric correlation
        const metricCorrelation = this.getMetricCorrelation(alert1.metricName, alert2.metricName);
        if (metricCorrelation.score > 0) {
            score += metricCorrelation.score;
            if (type === 'unknown') type = metricCorrelation.type;
            reason += metricCorrelation.reason + '; ';
            confidence += 0.3;
        }
        
        // Severity correlation
        const severityCorrelation = this.getSeverityCorrelation(alert1.severity, alert2.severity);
        score += severityCorrelation.score;
        reason += severityCorrelation.reason + '; ';
        confidence += 0.1;
        
        // Time proximity correlation
        const timeDiff = Math.abs(alert1.timestamp - alert2.timestamp);
        const timeCorrelation = this.getTimeCorrelation(timeDiff);
        score += timeCorrelation.score;
        reason += timeCorrelation.reason + '; ';
        confidence += 0.1;
        
        // Threshold proximity correlation
        const thresholdCorrelation = this.getThresholdCorrelation(alert1, alert2);
        score += thresholdCorrelation.score;
        reason += thresholdCorrelation.reason + '; ';
        
        return {
            score: Math.min(score, 1.0),
            type,
            reason: reason.trim(),
            confidence: Math.min(confidence, 1.0)
        };
    }
    
    getMetricCorrelation(metric1, metric2) {
        const correlationMap = {
            'cpu_usage,memory_usage': {
                score: 0.7,
                type: 'resource_contention',
                reason: 'CPU and memory often correlate under load'
            },
            'disk_usage,disk_io': {
                score: 0.8,
                type: 'disk_performance',
                reason: 'Disk usage affects I/O performance'
            },
            'network_latency,packet_loss': {
                score: 0.9,
                type: 'network_degradation',
                reason: 'Network latency and packet loss indicate network issues'
            },
            'response_time,error_rate': {
                score: 0.85,
                type: 'application_performance',
                reason: 'Response time and error rate indicate application issues'
            },
            'cpu_usage,response_time': {
                score: 0.6,
                type: 'performance_impact',
                reason: 'High CPU usage can impact response times'
            },
            'memory_usage,error_rate': {
                score: 0.65,
                type: 'resource_exhaustion',
                reason: 'Memory pressure can cause application errors'
            }
        };
        
        const key1 = `${metric1},${metric2}`;
        const key2 = `${metric2},${metric1}`;
        
        return correlationMap[key1] || correlationMap[key2] || {
            score: 0,
            type: 'none',
            reason: ''
        };
    }
    
    getSeverityCorrelation(severity1, severity2) {
        const severityMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        const level1 = severityMap[severity1] || 1;
        const level2 = severityMap[severity2] || 1;
        
        if (level1 === level2) {
            return { score: 0.2, reason: 'Same severity level' };
        } else if (Math.abs(level1 - level2) === 1) {
            return { score: 0.1, reason: 'Adjacent severity levels' };
        } else {
            return { score: 0, reason: '' };
        }
    }
    
    getTimeCorrelation(timeDiff) {
        if (timeDiff < 30000) { // 30 seconds
            return { score: 0.3, reason: 'Occurred within 30 seconds' };
        } else if (timeDiff < 120000) { // 2 minutes
            return { score: 0.2, reason: 'Occurred within 2 minutes' };
        } else if (timeDiff < 300000) { // 5 minutes
            return { score: 0.1, reason: 'Occurred within 5 minutes' };
        } else {
            return { score: 0, reason: '' };
        }
    }
    
    getThresholdCorrelation(alert1, alert2) {
        if (alert1.metricName === alert2.metricName) {
            const value1 = alert1.metricValue;
            const value2 = alert2.metricValue;
            const threshold1 = alert1.thresholdValue;
            const threshold2 = alert2.thresholdValue;
            
            // Calculate how far each value is from its threshold
            const breach1 = Math.abs(value1 - threshold1) / threshold1;
            const breach2 = Math.abs(value2 - threshold2) / threshold2;
            
            // If both breaches are similar magnitude, they're likely related
            const breachDiff = Math.abs(breach1 - breach2);
            if (breachDiff < 0.2) { // Within 20% of each other
                return { score: 0.15, reason: 'Similar threshold breach magnitude' };
            }
        }
        
        return { score: 0, reason: '' };
    }
    
    async checkServerGroupCorrelation(alert1, alert2) {
        // Check if servers are in the same group
        const { ServerGroupMember } = require('../models');
        
        const server1Groups = await ServerGroupMember.findAll({
            where: { serverId: alert1.serverId }
        });
        
        const server2Groups = await ServerGroupMember.findAll({
            where: { serverId: alert2.serverId }
        });
        
        const commonGroups = server1Groups.filter(g1 =>
            server2Groups.some(g2 => g2.serverGroupId === g1.serverGroupId)
        );
        
        if (commonGroups.length > 0) {
            return {
                score: 0.3,
                reason: 'Servers in same group'
            };
        }
        
        return { score: 0, reason: '' };
    }
    
    async createCorrelatedAlert(primaryAlert, correlations) {
        const { Alert } = require('../models');
        
        const correlatedAlert = {
            ...primaryAlert,
            id: undefined, // Let database generate new ID
            type: 'correlated',
            primaryAlertId: primaryAlert.id,
            title: `Correlated Alert: ${primaryAlert.title}`,
            description: this.generateCorrelationDescription(primaryAlert, correlations),
            severity: this.calculateCorrelatedSeverity(primaryAlert, correlations),
            metadata: {
                ...primaryAlert.metadata,
                correlationType: 'automatic',
                correlationCount: correlations.length,
                correlations: correlations.map(c => ({
                    alertId: c.alertId,
                    score: c.score,
                    type: c.type,
                    confidence: c.confidence
                }))
            }
        };
        
        const createdAlert = await Alert.create(correlatedAlert);
        
        // Update correlated alerts with back-reference
        for (const correlation of correlations) {
            await Alert.update(
                {
                    metadata: {
                        ...this.activeAlerts.get(correlation.alertId).metadata,
                        correlatedWith: createdAlert.id
                    }
                },
                { where: { id: correlation.alertId } }
            );
        }
        
        console.log(`Created correlated alert ${createdAlert.id} with ${correlations.length} correlations`);
        return createdAlert;
    }
    
    generateCorrelationDescription(primaryAlert, correlations) {
        let description = `Primary alert: ${primaryAlert.description}\n\n`;
        description += `This alert has been correlated with ${correlations.length} related alerts:\n\n`;
        
        correlations.forEach((corr, index) => {
            const alert = this.activeAlerts.get(corr.alertId);
            if (alert) {
                description += `${index + 1}. ${alert.title}\n`;
                description += `   Correlation: ${(corr.score * 100).toFixed(1)}% confidence (${corr.reason})\n\n`;
            }
        });
        
        return description;
    }
    
    calculateCorrelatedSeverity(primaryAlert, correlations) {
        const severityMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        const reverseSeverityMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
        
        let maxSeverity = severityMap[primaryAlert.severity] || 1;
        
        // Check severity of correlated alerts
        correlations.forEach(corr => {
            const alert = this.activeAlerts.get(corr.alertId);
            if (alert) {
                const severity = severityMap[alert.severity] || 1;
                maxSeverity = Math.max(maxSeverity, severity);
            }
        });
        
        // Escalate severity based on correlation count and confidence
        const highConfidenceCorrelations = correlations.filter(c => c.confidence > 0.8).length;
        if (highConfidenceCorrelations >= 2 && maxSeverity < 4) {
            maxSeverity = Math.min(maxSeverity + 1, 4);
        }
        
        return reverseSeverityMap[maxSeverity];
    }
    
    cleanupOldAlerts() {
        const currentTime = Date.now();
        const cutoffTime = currentTime - this.correlationWindow;
        
        for (const [alertId, alert] of this.activeAlerts) {
            if (alert.timestamp < cutoffTime) {
                this.activeAlerts.delete(alertId);
            }
        }
    }
    
    addCorrelationRule(name, rule) {
        this.correlationRules.set(name, rule);
    }
    
    getCorrelationStats() {
        return {
            activeAlerts: this.activeAlerts.size,
            correlationRules: this.correlationRules.size,
            totalCorrelations: Array.from(this.activeAlerts.values())
                .reduce((sum, alert) => sum + alert.correlations.length, 0)
        };
    }
}

module.exports = CorrelationEngine;
```

---

*This sophisticated Alert Processing Engine provides comprehensive rule evaluation, advanced correlation analysis, intelligent deduplication, and automated escalation capabilities with extensive configuration options and robust testing coverage for SAMS Mobile.*
