/**
 * 🔥 ENTERPRISE THIRD-PARTY INTEGRATIONS SERVICE
 * Handles Slack, Teams, Email, SMS, Jira, ServiceNow integrations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class IntegrationsService {
  constructor() {
    this.baseURL = 'http://192.168.1.10:8080/api/integrations';
    this.integrations = new Map();
    this.webhookQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
    
    this.initializeIntegrations();
  }

  /**
   * Initialize integrations
   */
  async initializeIntegrations() {
    try {
      console.log('🔥 IntegrationsService: Initializing integrations...');
      
      // Load saved integrations
      await this.loadIntegrations();
      
      // Setup default integrations
      this.setupDefaultIntegrations();
      
      console.log('🔥 IntegrationsService: Initialized successfully');
    } catch (error) {
      console.error('IntegrationsService initialization error:', error);
    }
  }

  /**
   * Setup default integrations
   */
  setupDefaultIntegrations() {
    // Slack integration
    this.integrations.set('slack', {
      name: 'Slack',
      type: 'webhook',
      enabled: true,
      config: {
        webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        channel: '#alerts',
        username: 'SAMS Bot',
        iconEmoji: ':warning:'
      },
      templates: {
        critical: '🚨 *CRITICAL ALERT* 🚨\n*Server:* {serverName}\n*Alert:* {alertTitle}\n*Message:* {alertMessage}\n*Time:* {timestamp}',
        high: '⚠️ *HIGH PRIORITY ALERT*\n*Server:* {serverName}\n*Alert:* {alertTitle}\n*Message:* {alertMessage}\n*Time:* {timestamp}',
        medium: '📢 *MEDIUM ALERT*\n*Server:* {serverName}\n*Alert:* {alertTitle}\n*Message:* {alertMessage}\n*Time:* {timestamp}',
        low: '💡 *INFO*\n*Server:* {serverName}\n*Alert:* {alertTitle}\n*Message:* {alertMessage}\n*Time:* {timestamp}'
      }
    });

    // Microsoft Teams integration
    this.integrations.set('teams', {
      name: 'Microsoft Teams',
      type: 'webhook',
      enabled: true,
      config: {
        webhookUrl: 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK',
        title: 'SAMS Alert'
      },
      templates: {
        critical: {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          'themeColor': 'FF0000',
          'summary': 'Critical Alert from SAMS',
          'sections': [{
            'activityTitle': '🚨 CRITICAL ALERT',
            'activitySubtitle': '{serverName}',
            'facts': [
              { 'name': 'Alert', 'value': '{alertTitle}' },
              { 'name': 'Message', 'value': '{alertMessage}' },
              { 'name': 'Time', 'value': '{timestamp}' },
              { 'name': 'Severity', 'value': 'CRITICAL' }
            ]
          }]
        }
      }
    });

    // Email integration
    this.integrations.set('email', {
      name: 'Email',
      type: 'email',
      enabled: true,
      config: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        username: 'sams@yourcompany.com',
        password: 'your-app-password',
        from: 'SAMS Monitoring <sams@yourcompany.com>',
        to: ['admin@yourcompany.com', 'devops@yourcompany.com']
      },
      templates: {
        critical: {
          subject: '🚨 CRITICAL ALERT: {alertTitle} - {serverName}',
          html: `
            <h2 style="color: #d32f2f;">🚨 CRITICAL ALERT</h2>
            <p><strong>Server:</strong> {serverName}</p>
            <p><strong>Alert:</strong> {alertTitle}</p>
            <p><strong>Message:</strong> {alertMessage}</p>
            <p><strong>Time:</strong> {timestamp}</p>
            <p><strong>Severity:</strong> CRITICAL</p>
            <hr>
            <p><em>This is an automated message from SAMS Monitoring System</em></p>
          `
        }
      }
    });

    // SMS integration (Twilio)
    this.integrations.set('sms', {
      name: 'SMS',
      type: 'sms',
      enabled: true,
      config: {
        accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
        authToken: 'YOUR_TWILIO_AUTH_TOKEN',
        fromNumber: '+1234567890',
        toNumbers: ['+1987654321', '+1555123456']
      },
      templates: {
        critical: 'SAMS CRITICAL: {alertTitle} on {serverName}. {alertMessage}. Time: {timestamp}',
        high: 'SAMS HIGH: {alertTitle} on {serverName}. {alertMessage}. Time: {timestamp}'
      }
    });

    // Jira integration
    this.integrations.set('jira', {
      name: 'Jira',
      type: 'ticketing',
      enabled: false,
      config: {
        baseUrl: 'https://yourcompany.atlassian.net',
        username: 'sams@yourcompany.com',
        apiToken: 'YOUR_JIRA_API_TOKEN',
        projectKey: 'OPS',
        issueType: 'Bug'
      },
      templates: {
        critical: {
          summary: 'CRITICAL: {alertTitle} - {serverName}',
          description: 'Alert: {alertTitle}\nServer: {serverName}\nMessage: {alertMessage}\nTime: {timestamp}\nSeverity: CRITICAL',
          priority: 'Highest',
          labels: ['sams', 'critical', 'monitoring']
        }
      }
    });

    // ServiceNow integration
    this.integrations.set('servicenow', {
      name: 'ServiceNow',
      type: 'ticketing',
      enabled: false,
      config: {
        instanceUrl: 'https://yourcompany.service-now.com',
        username: 'sams_user',
        password: 'your_password',
        table: 'incident'
      },
      templates: {
        critical: {
          short_description: 'CRITICAL: {alertTitle} - {serverName}',
          description: 'Alert: {alertTitle}\nServer: {serverName}\nMessage: {alertMessage}\nTime: {timestamp}',
          urgency: '1',
          impact: '1',
          priority: '1',
          category: 'Infrastructure',
          subcategory: 'Monitoring'
        }
      }
    });
  }

  /**
   * Send alert to all enabled integrations
   */
  async sendAlert(alert, serverInfo) {
    try {
      console.log('🔥 IntegrationsService: Sending alert to integrations', alert.id);
      
      const promises = [];
      
      for (const [key, integration] of this.integrations.entries()) {
        if (integration.enabled && this.shouldSendToIntegration(integration, alert)) {
          promises.push(this.sendToIntegration(key, integration, alert, serverInfo));
        }
      }
      
      const results = await Promise.allSettled(promises);
      
      // Log results
      results.forEach((result, index) => {
        const integrationKey = Array.from(this.integrations.keys())[index];
        if (result.status === 'fulfilled') {
          console.log(`IntegrationsService: Successfully sent to ${integrationKey}`);
        } else {
          console.error(`IntegrationsService: Failed to send to ${integrationKey}:`, result.reason);
        }
      });
      
      return results;
    } catch (error) {
      console.error('IntegrationsService: Send alert error', error);
      return [];
    }
  }

  /**
   * Send to specific integration
   */
  async sendToIntegration(key, integration, alert, serverInfo) {
    try {
      switch (integration.type) {
        case 'webhook':
          return await this.sendWebhook(integration, alert, serverInfo);
        case 'email':
          return await this.sendEmail(integration, alert, serverInfo);
        case 'sms':
          return await this.sendSMS(integration, alert, serverInfo);
        case 'ticketing':
          return await this.createTicket(integration, alert, serverInfo);
        default:
          throw new Error(`Unknown integration type: ${integration.type}`);
      }
    } catch (error) {
      console.error(`IntegrationsService: ${key} integration error:`, error);
      
      // Add to retry queue
      this.addToRetryQueue(key, integration, alert, serverInfo);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(integration, alert, serverInfo) {
    const template = integration.templates[alert.severity] || integration.templates.medium;
    const message = this.processTemplate(template, alert, serverInfo);
    
    let payload;
    
    if (integration.name === 'Slack') {
      payload = {
        channel: integration.config.channel,
        username: integration.config.username,
        icon_emoji: integration.config.iconEmoji,
        text: message
      };
    } else if (integration.name === 'Microsoft Teams') {
      payload = this.processTemplate(template, alert, serverInfo);
    } else {
      payload = { message };
    }
    
    const response = await fetch(integration.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
    
    return { success: true, integration: integration.name };
  }

  /**
   * Send email notification
   */
  async sendEmail(integration, alert, serverInfo) {
    const template = integration.templates[alert.severity] || integration.templates.critical;
    const subject = this.processTemplate(template.subject, alert, serverInfo);
    const html = this.processTemplate(template.html, alert, serverInfo);
    
    const authToken = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/email/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: integration.config.from,
        to: integration.config.to,
        subject,
        html,
        config: {
          host: integration.config.smtpHost,
          port: integration.config.smtpPort,
          auth: {
            user: integration.config.username,
            pass: integration.config.password
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Email failed: ${response.status}`);
    }
    
    return { success: true, integration: 'Email' };
  }

  /**
   * Send SMS notification
   */
  async sendSMS(integration, alert, serverInfo) {
    const template = integration.templates[alert.severity] || integration.templates.critical;
    const message = this.processTemplate(template, alert, serverInfo);
    
    const authToken = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/sms/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: integration.config.fromNumber,
        to: integration.config.toNumbers,
        message,
        config: {
          accountSid: integration.config.accountSid,
          authToken: integration.config.authToken
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`SMS failed: ${response.status}`);
    }
    
    return { success: true, integration: 'SMS' };
  }

  /**
   * Create ticket in ticketing system
   */
  async createTicket(integration, alert, serverInfo) {
    const template = integration.templates[alert.severity] || integration.templates.critical;
    const ticketData = this.processTemplate(template, alert, serverInfo);
    
    const authToken = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/tickets/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system: integration.name.toLowerCase(),
        config: integration.config,
        ticket: ticketData
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ticket creation failed: ${response.status}`);
    }
    
    const result = await response.json();
    return { success: true, integration: integration.name, ticketId: result.ticketId };
  }

  /**
   * Process template with alert data
   */
  processTemplate(template, alert, serverInfo) {
    if (typeof template === 'string') {
      return template
        .replace(/{alertTitle}/g, alert.title)
        .replace(/{alertMessage}/g, alert.message)
        .replace(/{serverName}/g, serverInfo.name)
        .replace(/{serverId}/g, serverInfo.id)
        .replace(/{severity}/g, alert.severity.toUpperCase())
        .replace(/{timestamp}/g, new Date(alert.timestamp).toLocaleString());
    } else if (typeof template === 'object') {
      const processed = JSON.parse(JSON.stringify(template));
      const jsonString = JSON.stringify(processed);
      const processedString = jsonString
        .replace(/{alertTitle}/g, alert.title)
        .replace(/{alertMessage}/g, alert.message)
        .replace(/{serverName}/g, serverInfo.name)
        .replace(/{serverId}/g, serverInfo.id)
        .replace(/{severity}/g, alert.severity.toUpperCase())
        .replace(/{timestamp}/g, new Date(alert.timestamp).toLocaleString());
      return JSON.parse(processedString);
    }
    
    return template;
  }

  /**
   * Check if alert should be sent to integration
   */
  shouldSendToIntegration(integration, alert) {
    // Send critical and high alerts to all integrations
    if (alert.severity === 'critical' || alert.severity === 'high') {
      return true;
    }
    
    // Send medium alerts to webhook integrations only
    if (alert.severity === 'medium' && integration.type === 'webhook') {
      return true;
    }
    
    // Don't send low alerts to SMS or ticketing systems
    if (alert.severity === 'low' && (integration.type === 'sms' || integration.type === 'ticketing')) {
      return false;
    }
    
    return true;
  }

  /**
   * Add to retry queue
   */
  addToRetryQueue(key, integration, alert, serverInfo) {
    const retryKey = `${key}_${alert.id}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    
    if (currentAttempts < this.maxRetries) {
      this.retryAttempts.set(retryKey, currentAttempts + 1);
      
      setTimeout(() => {
        this.sendToIntegration(key, integration, alert, serverInfo)
          .then(() => {
            this.retryAttempts.delete(retryKey);
          })
          .catch(() => {
            // Will be retried again if under max attempts
          });
      }, this.retryDelay * (currentAttempts + 1));
    } else {
      console.error(`IntegrationsService: Max retries reached for ${key}`);
      this.retryAttempts.delete(retryKey);
    }
  }

  /**
   * Test integration
   */
  async testIntegration(integrationKey) {
    try {
      const integration = this.integrations.get(integrationKey);
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      const testAlert = {
        id: 'test_' + Date.now(),
        title: 'Test Alert',
        message: 'This is a test alert from SAMS',
        severity: 'medium',
        timestamp: new Date().toISOString()
      };
      
      const testServer = {
        id: 'test_server',
        name: 'Test Server'
      };
      
      await this.sendToIntegration(integrationKey, integration, testAlert, testServer);
      return { success: true, message: 'Test alert sent successfully' };
    } catch (error) {
      console.error('IntegrationsService: Test integration error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update integration configuration
   */
  async updateIntegration(key, config) {
    try {
      const integration = this.integrations.get(key);
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      integration.config = { ...integration.config, ...config };
      await this.saveIntegrations();
      
      return { success: true };
    } catch (error) {
      console.error('IntegrationsService: Update integration error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable/disable integration
   */
  async toggleIntegration(key, enabled) {
    try {
      const integration = this.integrations.get(key);
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      integration.enabled = enabled;
      await this.saveIntegrations();
      
      return { success: true };
    } catch (error) {
      console.error('IntegrationsService: Toggle integration error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all integrations
   */
  getIntegrations() {
    return Array.from(this.integrations.entries()).map(([key, integration]) => ({
      key,
      ...integration
    }));
  }

  /**
   * Save integrations to storage
   */
  async saveIntegrations() {
    try {
      const data = Array.from(this.integrations.entries());
      await AsyncStorage.setItem('integrations', JSON.stringify(data));
    } catch (error) {
      console.error('IntegrationsService: Save integrations error', error);
    }
  }

  /**
   * Load integrations from storage
   */
  async loadIntegrations() {
    try {
      const data = await AsyncStorage.getItem('integrations');
      if (data) {
        const integrations = JSON.parse(data);
        this.integrations = new Map(integrations);
        console.log('IntegrationsService: Loaded saved integrations');
      }
    } catch (error) {
      console.error('IntegrationsService: Load integrations error', error);
    }
  }

  /**
   * Get integration statistics
   */
  getStats() {
    const stats = {
      totalIntegrations: this.integrations.size,
      enabledIntegrations: 0,
      byType: {},
      retryQueueSize: this.retryAttempts.size
    };
    
    for (const integration of this.integrations.values()) {
      if (integration.enabled) {
        stats.enabledIntegrations++;
      }
      
      stats.byType[integration.type] = (stats.byType[integration.type] || 0) + 1;
    }
    
    return stats;
  }
}

export default new IntegrationsService();
