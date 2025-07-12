// SAMS Third-Party Integrations Service
// Phase 2 Week 6: Comprehensive Integration Framework

const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.INTEGRATIONS_PORT || 8083;

class IntegrationsService {
  constructor() {
    this.integrations = new Map();
    this.webhooks = new Map();
    this.templates = new Map();
    this.stats = {
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0,
      integrationErrors: 0,
      lastNotificationAt: null
    };
    
    this.loadConfiguration();
    this.initializeIntegrations();
    this.loadTemplates();
  }

  async loadConfiguration() {
    try {
      const configPath = path.join(__dirname, 'integrations-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log('✅ Integrations configuration loaded');
    } catch (error) {
      console.log('⚠️ Using default configuration');
      this.config = this.getDefaultConfiguration();
      await this.saveConfiguration();
    }
  }

  getDefaultConfiguration() {
    return {
      slack: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: '#alerts',
        username: 'SAMS Bot',
        iconEmoji: ':warning:'
      },
      teams: {
        enabled: false,
        webhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
        title: 'SAMS Infrastructure Alert'
      },
      email: {
        enabled: false,
        service: 'sendgrid', // sendgrid, ses, smtp
        apiKey: process.env.SENDGRID_API_KEY || '',
        from: process.env.EMAIL_FROM || 'alerts@company.com',
        to: process.env.EMAIL_TO || 'admin@company.com'
      },
      sms: {
        enabled: false,
        service: 'twilio', // twilio, sns
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        from: process.env.TWILIO_FROM || '',
        to: process.env.SMS_TO || ''
      },
      jira: {
        enabled: false,
        url: process.env.JIRA_URL || '',
        username: process.env.JIRA_USERNAME || '',
        apiToken: process.env.JIRA_API_TOKEN || '',
        projectKey: process.env.JIRA_PROJECT_KEY || 'SAMS'
      },
      servicenow: {
        enabled: false,
        instance: process.env.SERVICENOW_INSTANCE || '',
        username: process.env.SERVICENOW_USERNAME || '',
        password: process.env.SERVICENOW_PASSWORD || '',
        table: 'incident'
      },
      webhooks: {
        enabled: true,
        maxRetries: 3,
        timeout: 10000
      }
    };
  }

  async saveConfiguration() {
    try {
      const configPath = path.join(__dirname, 'integrations-config.json');
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
      console.log('✅ Configuration saved');
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
    }
  }

  initializeIntegrations() {
    // Initialize Slack
    if (this.config.slack.enabled && this.config.slack.webhookUrl) {
      this.integrations.set('slack', new SlackIntegration(this.config.slack));
      console.log('✅ Slack integration initialized');
    }

    // Initialize Teams
    if (this.config.teams.enabled && this.config.teams.webhookUrl) {
      this.integrations.set('teams', new TeamsIntegration(this.config.teams));
      console.log('✅ Teams integration initialized');
    }

    // Initialize Email
    if (this.config.email.enabled) {
      this.integrations.set('email', new EmailIntegration(this.config.email));
      console.log('✅ Email integration initialized');
    }

    // Initialize SMS
    if (this.config.sms.enabled) {
      this.integrations.set('sms', new SMSIntegration(this.config.sms));
      console.log('✅ SMS integration initialized');
    }

    // Initialize JIRA
    if (this.config.jira.enabled) {
      this.integrations.set('jira', new JiraIntegration(this.config.jira));
      console.log('✅ JIRA integration initialized');
    }

    // Initialize ServiceNow
    if (this.config.servicenow.enabled) {
      this.integrations.set('servicenow', new ServiceNowIntegration(this.config.servicenow));
      console.log('✅ ServiceNow integration initialized');
    }

    console.log(`🔌 ${this.integrations.size} integrations initialized`);
  }

  async loadTemplates() {
    this.templates.set('alert', {
      slack: {
        text: '🚨 *{severity}* Alert: {title}',
        attachments: [{
          color: '{color}',
          fields: [
            { title: 'Server', value: '{serverName}', short: true },
            { title: 'Time', value: '{timestamp}', short: true },
            { title: 'Message', value: '{message}', short: false }
          ]
        }]
      },
      teams: {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: 'SAMS Alert: {title}',
        themeColor: '{color}',
        sections: [{
          activityTitle: '🚨 {severity} Alert',
          activitySubtitle: '{title}',
          facts: [
            { name: 'Server', value: '{serverName}' },
            { name: 'Time', value: '{timestamp}' },
            { name: 'Message', value: '{message}' }
          ]
        }]
      },
      email: {
        subject: 'SAMS Alert: {title}',
        html: `
          <h2>🚨 SAMS Infrastructure Alert</h2>
          <p><strong>Severity:</strong> {severity}</p>
          <p><strong>Title:</strong> {title}</p>
          <p><strong>Server:</strong> {serverName}</p>
          <p><strong>Time:</strong> {timestamp}</p>
          <p><strong>Message:</strong> {message}</p>
          <hr>
          <p><small>This alert was generated by SAMS Infrastructure Monitoring System</small></p>
        `
      },
      sms: {
        body: 'SAMS Alert: {severity} - {title} on {serverName} at {timestamp}'
      }
    });

    console.log('✅ Notification templates loaded');
  }

  async sendNotification(type, data) {
    this.stats.totalNotifications++;
    
    try {
      const integration = this.integrations.get(type);
      if (!integration) {
        throw new Error(`Integration ${type} not found or not enabled`);
      }

      const template = this.templates.get('alert')[type];
      if (!template) {
        throw new Error(`Template for ${type} not found`);
      }

      const processedData = this.processTemplate(template, data);
      const result = await integration.send(processedData);

      this.stats.successfulNotifications++;
      this.stats.lastNotificationAt = new Date().toISOString();

      console.log(`✅ ${type} notification sent successfully`);
      return { success: true, result };

    } catch (error) {
      this.stats.failedNotifications++;
      this.stats.integrationErrors++;
      
      console.error(`❌ Failed to send ${type} notification:`, error.message);
      return { success: false, error: error.message };
    }
  }

  processTemplate(template, data) {
    const processed = JSON.parse(JSON.stringify(template));
    
    // Add color based on severity
    data.color = this.getSeverityColor(data.severity);
    
    // Format timestamp
    if (data.timestamp) {
      data.timestamp = new Date(data.timestamp).toLocaleString();
    }

    return this.replaceTemplateVariables(processed, data);
  }

  replaceTemplateVariables(obj, data) {
    if (typeof obj === 'string') {
      return obj.replace(/\{(\w+)\}/g, (match, key) => data[key] || match);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceTemplateVariables(item, data));
    } else if (typeof obj === 'object' && obj !== null) {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceTemplateVariables(value, data);
      }
      return result;
    }
    return obj;
  }

  getSeverityColor(severity) {
    const colors = {
      critical: '#FF0000',
      high: '#FF6600',
      warning: '#FFCC00',
      info: '#0099FF',
      low: '#00CC00'
    };
    return colors[severity?.toLowerCase()] || '#808080';
  }

  async broadcastAlert(alertData) {
    const results = {};
    const promises = [];

    for (const [type, integration] of this.integrations.entries()) {
      promises.push(
        this.sendNotification(type, alertData)
          .then(result => { results[type] = result; })
          .catch(error => { results[type] = { success: false, error: error.message }; })
      );
    }

    await Promise.all(promises);
    return results;
  }

  registerWebhook(name, url, secret = null) {
    const webhookId = crypto.randomUUID();
    this.webhooks.set(webhookId, {
      id: webhookId,
      name,
      url,
      secret,
      createdAt: new Date().toISOString(),
      enabled: true,
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastCall: null
      }
    });

    console.log(`✅ Webhook registered: ${name} (${webhookId})`);
    return webhookId;
  }

  async callWebhook(webhookId, data) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.enabled) {
      throw new Error('Webhook not found or disabled');
    }

    webhook.stats.totalCalls++;

    try {
      const headers = { 'Content-Type': 'application/json' };
      
      // Add signature if secret is provided
      if (webhook.secret) {
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(data))
          .digest('hex');
        headers['X-SAMS-Signature'] = `sha256=${signature}`;
      }

      const response = await axios.post(webhook.url, data, {
        headers,
        timeout: this.config.webhooks.timeout
      });

      webhook.stats.successfulCalls++;
      webhook.stats.lastCall = new Date().toISOString();

      console.log(`✅ Webhook called successfully: ${webhook.name}`);
      return { success: true, status: response.status, data: response.data };

    } catch (error) {
      webhook.stats.failedCalls++;
      console.error(`❌ Webhook call failed: ${webhook.name}`, error.message);
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      integrations: Array.from(this.integrations.keys()),
      webhooks: Array.from(this.webhooks.values()).map(w => ({
        id: w.id,
        name: w.name,
        enabled: w.enabled,
        stats: w.stats
      }))
    };
  }
}

// Slack Integration
class SlackIntegration {
  constructor(config) {
    this.config = config;
  }

  async send(data) {
    const payload = {
      channel: this.config.channel,
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      ...data
    };

    const response = await axios.post(this.config.webhookUrl, payload);
    return response.data;
  }
}

// Teams Integration
class TeamsIntegration {
  constructor(config) {
    this.config = config;
  }

  async send(data) {
    const response = await axios.post(this.config.webhookUrl, data);
    return response.data;
  }
}

// Email Integration
class EmailIntegration {
  constructor(config) {
    this.config = config;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (this.config.service === 'sendgrid') {
      // SendGrid configuration would go here
      this.transporter = nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: this.config.apiKey
        }
      });
    } else if (this.config.service === 'ses') {
      // AWS SES configuration would go here
      this.transporter = nodemailer.createTransporter({
        SES: { /* AWS SES config */ }
      });
    } else {
      // SMTP configuration
      this.transporter = nodemailer.createTransporter({
        host: this.config.host || 'localhost',
        port: this.config.port || 587,
        secure: this.config.secure || false,
        auth: {
          user: this.config.username,
          pass: this.config.password
        }
      });
    }
  }

  async send(data) {
    const mailOptions = {
      from: this.config.from,
      to: this.config.to,
      subject: data.subject,
      html: data.html
    };

    const result = await this.transporter.sendMail(mailOptions);
    return result;
  }
}

// SMS Integration
class SMSIntegration {
  constructor(config) {
    this.config = config;
    if (config.service === 'twilio') {
      this.client = twilio(config.accountSid, config.authToken);
    }
  }

  async send(data) {
    if (this.config.service === 'twilio') {
      const message = await this.client.messages.create({
        body: data.body,
        from: this.config.from,
        to: this.config.to
      });
      return message;
    } else if (this.config.service === 'sns') {
      // AWS SNS implementation would go here
      throw new Error('AWS SNS not implemented yet');
    }
  }
}

// JIRA Integration
class JiraIntegration {
  constructor(config) {
    this.config = config;
    this.baseUrl = `${config.url}/rest/api/2`;
    this.auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
  }

  async send(data) {
    const issue = {
      fields: {
        project: { key: this.config.projectKey },
        summary: data.title || 'SAMS Infrastructure Alert',
        description: data.message || 'Alert generated by SAMS',
        issuetype: { name: 'Bug' },
        priority: { name: this.mapSeverityToPriority(data.severity) }
      }
    };

    const response = await axios.post(`${this.baseUrl}/issue`, issue, {
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  mapSeverityToPriority(severity) {
    const mapping = {
      critical: 'Highest',
      high: 'High',
      warning: 'Medium',
      info: 'Low',
      low: 'Lowest'
    };
    return mapping[severity?.toLowerCase()] || 'Medium';
  }
}

// ServiceNow Integration
class ServiceNowIntegration {
  constructor(config) {
    this.config = config;
    this.baseUrl = `https://${config.instance}.service-now.com/api/now/table`;
    this.auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  }

  async send(data) {
    const incident = {
      short_description: data.title || 'SAMS Infrastructure Alert',
      description: data.message || 'Alert generated by SAMS',
      urgency: this.mapSeverityToUrgency(data.severity),
      impact: this.mapSeverityToImpact(data.severity),
      category: 'Infrastructure',
      subcategory: 'Monitoring'
    };

    const response = await axios.post(`${this.baseUrl}/${this.config.table}`, incident, {
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  mapSeverityToUrgency(severity) {
    const mapping = {
      critical: '1',
      high: '2',
      warning: '3',
      info: '3',
      low: '3'
    };
    return mapping[severity?.toLowerCase()] || '3';
  }

  mapSeverityToImpact(severity) {
    const mapping = {
      critical: '1',
      high: '2',
      warning: '3',
      info: '3',
      low: '3'
    };
    return mapping[severity?.toLowerCase()] || '3';
  }
}

// Initialize service
const integrationsService = new IntegrationsService();

// REST API Endpoints
app.get('/api/v1/integrations/health', (req, res) => {
  res.json({
    success: true,
    service: 'SAMS Integrations Service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/integrations/stats', (req, res) => {
  res.json({
    success: true,
    data: integrationsService.getStats(),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/v1/integrations/notify/:type', async (req, res) => {
  const { type } = req.params;
  const alertData = req.body;

  try {
    const result = await integrationsService.sendNotification(type, alertData);
    res.json({
      success: result.success,
      data: result.result,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/integrations/broadcast', async (req, res) => {
  const alertData = req.body;

  try {
    const results = await integrationsService.broadcastAlert(alertData);
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/integrations/webhooks', (req, res) => {
  const { name, url, secret } = req.body;

  if (!name || !url) {
    return res.status(400).json({
      success: false,
      error: 'Name and URL are required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const webhookId = integrationsService.registerWebhook(name, url, secret);
    res.status(201).json({
      success: true,
      data: { webhookId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/integrations/webhooks/:id/call', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const result = await integrationsService.callWebhook(id, data);
    res.json({
      success: result.success,
      data: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔌 SAMS Integrations Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/integrations/health`);
  console.log(`📈 Stats: http://localhost:${PORT}/api/v1/integrations/stats`);
  console.log(`🚀 Ready for third-party integrations!`);
});

module.exports = { integrationsService, IntegrationsService };
