import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

interface NotificationChannel {
  id: string;
  type: 'push' | 'email' | 'sms' | 'slack' | 'teams' | 'webhook';
  enabled: boolean;
  configuration: any;
  severityFilter: string[];
}

interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high';
}

export class NotificationService {
  private static emailTransporter: nodemailer.Transporter;
  private static twilioClient: any;
  private static notificationChannels: NotificationChannel[] = [];

  public static async initialize(): Promise<void> {
    try {
      // Initialize Firebase Admin SDK
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        logger.info('Firebase Admin SDK initialized');
      }

      // Initialize email transporter
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Initialize Twilio client
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        logger.info('Twilio client initialized');
      }

      // Load notification channels
      await this.loadNotificationChannels();

      logger.info('Notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private static async loadNotificationChannels(): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      const channels = await db('notification_channels').where('enabled', true);
      this.notificationChannels = channels;
      logger.info(`Loaded ${channels.length} notification channels`);
    } catch (error) {
      logger.error('Failed to load notification channels:', error);
    }
  }

  public static async sendAlertNotification(alert: any): Promise<void> {
    try {
      const template = this.getNotificationTemplate('alert', alert);
      
      for (const channel of this.notificationChannels) {
        // Check if channel should receive this severity
        if (!channel.severityFilter.includes(alert.severity)) {
          continue;
        }

        try {
          switch (channel.type) {
            case 'push':
              await this.sendPushNotification(template, channel);
              break;
            case 'email':
              await this.sendEmailNotification(template, channel, alert);
              break;
            case 'sms':
              await this.sendSMSNotification(template, channel);
              break;
            case 'slack':
              await this.sendSlackNotification(template, channel, alert);
              break;
            case 'teams':
              await this.sendTeamsNotification(template, channel, alert);
              break;
            case 'webhook':
              await this.sendWebhookNotification(alert, channel);
              break;
          }

          // Log successful notification
          await this.logNotification(alert.id, channel.type, 'sent');

        } catch (error) {
          logger.error(`Failed to send ${channel.type} notification:`, error);
          await this.logNotification(alert.id, channel.type, 'failed', error.message);
        }
      }
    } catch (error) {
      logger.error('Failed to send alert notifications:', error);
    }
  }

  public static async sendEscalationNotification(alert: any): Promise<void> {
    try {
      const template = this.getNotificationTemplate('escalation', alert);
      
      // Send escalation notifications to higher priority channels
      const escalationChannels = this.notificationChannels.filter(channel => 
        ['sms', 'push', 'slack'].includes(channel.type) && 
        channel.severityFilter.includes(alert.severity)
      );

      for (const channel of escalationChannels) {
        try {
          switch (channel.type) {
            case 'push':
              await this.sendPushNotification(template, channel);
              break;
            case 'sms':
              await this.sendSMSNotification(template, channel);
              break;
            case 'slack':
              await this.sendSlackNotification(template, channel, alert);
              break;
          }

          await this.logNotification(alert.id, channel.type, 'escalated');

        } catch (error) {
          logger.error(`Failed to send escalation ${channel.type} notification:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to send escalation notifications:', error);
    }
  }

  private static async sendPushNotification(template: NotificationTemplate, channel: NotificationChannel): Promise<void> {
    try {
      // Get all users with push notifications enabled
      const db = DatabaseService.getConnection();
      const users = await db('users')
        .where('push_notifications', true)
        .whereNotNull('firebase_token');

      const tokens = users.map(user => user.firebase_token).filter(Boolean);

      if (tokens.length === 0) {
        logger.warn('No FCM tokens found for push notification');
        return;
      }

      const message = {
        notification: {
          title: template.title,
          body: template.body
        },
        data: {
          type: template.type,
          priority: template.priority,
          timestamp: new Date().toISOString()
        },
        tokens: tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      
      logger.info(`Push notification sent to ${response.successCount} devices`);

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });

        // Remove invalid tokens from database
        if (failedTokens.length > 0) {
          await db('users')
            .whereIn('firebase_token', failedTokens)
            .update({ firebase_token: null });
        }
      }

    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  private static async sendEmailNotification(template: NotificationTemplate, channel: NotificationChannel, alert: any): Promise<void> {
    try {
      const recipients = channel.configuration.recipients || [];
      
      if (recipients.length === 0) {
        logger.warn('No email recipients configured');
        return;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@sams.com',
        to: recipients.join(', '),
        subject: template.title,
        html: this.generateEmailHTML(template, alert),
        text: template.body
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email notification sent to ${recipients.length} recipients`);

    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  private static async sendSMSNotification(template: NotificationTemplate, channel: NotificationChannel): Promise<void> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not initialized');
      }

      const phoneNumbers = channel.configuration.numbers || [];
      
      if (phoneNumbers.length === 0) {
        logger.warn('No phone numbers configured for SMS');
        return;
      }

      for (const phoneNumber of phoneNumbers) {
        await this.twilioClient.messages.create({
          body: `${template.title}\n${template.body}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
      }

      logger.info(`SMS notification sent to ${phoneNumbers.length} recipients`);

    } catch (error) {
      logger.error('Failed to send SMS notification:', error);
      throw error;
    }
  }

  private static async sendSlackNotification(template: NotificationTemplate, channel: NotificationChannel, alert: any): Promise<void> {
    try {
      const webhookUrl = channel.configuration.webhook_url;
      
      if (!webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const slackMessage = {
        text: template.title,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              {
                title: 'Server',
                value: alert.server_name || 'Unknown',
                short: true
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true
              },
              {
                title: 'Message',
                value: template.body,
                short: false
              },
              {
                title: 'Time',
                value: new Date(alert.first_seen).toLocaleString(),
                short: true
              }
            ]
          }
        ]
      };

      await axios.post(webhookUrl, slackMessage);
      logger.info('Slack notification sent');

    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  private static async sendTeamsNotification(template: NotificationTemplate, channel: NotificationChannel, alert: any): Promise<void> {
    try {
      const webhookUrl = channel.configuration.webhook_url;
      
      if (!webhookUrl) {
        throw new Error('Teams webhook URL not configured');
      }

      const teamsMessage = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: this.getSeverityColor(alert.severity),
        summary: template.title,
        sections: [
          {
            activityTitle: template.title,
            activitySubtitle: `Server: ${alert.server_name || 'Unknown'}`,
            facts: [
              {
                name: 'Severity',
                value: alert.severity.toUpperCase()
              },
              {
                name: 'Time',
                value: new Date(alert.first_seen).toLocaleString()
              },
              {
                name: 'Message',
                value: template.body
              }
            ]
          }
        ]
      };

      await axios.post(webhookUrl, teamsMessage);
      logger.info('Teams notification sent');

    } catch (error) {
      logger.error('Failed to send Teams notification:', error);
      throw error;
    }
  }

  private static async sendWebhookNotification(alert: any, channel: NotificationChannel): Promise<void> {
    try {
      const webhookUrl = channel.configuration.url;
      const headers = channel.configuration.headers || {};
      
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      await axios.post(webhookUrl, {
        type: 'alert',
        data: alert,
        timestamp: new Date().toISOString()
      }, { headers });

      logger.info('Webhook notification sent');

    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
      throw error;
    }
  }

  private static getNotificationTemplate(type: string, alert: any): NotificationTemplate {
    switch (type) {
      case 'alert':
        return {
          type: 'alert',
          title: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
          body: `${alert.message}\nServer: ${alert.server_name || 'Unknown'}\nTime: ${new Date(alert.first_seen).toLocaleString()}`,
          priority: alert.severity === 'critical' ? 'high' : 'normal'
        };
      case 'escalation':
        return {
          type: 'escalation',
          title: `⚠️ ESCALATED: ${alert.title}`,
          body: `Alert has been escalated to level ${alert.escalation_level}\n${alert.message}\nServer: ${alert.server_name || 'Unknown'}`,
          priority: 'high'
        };
      default:
        return {
          type: 'generic',
          title: 'SAMS Notification',
          body: 'A notification has been triggered',
          priority: 'normal'
        };
    }
  }

  private static generateEmailHTML(template: NotificationTemplate, alert: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; border: 1px solid #ddd; }
          .footer { padding: 10px; text-align: center; color: #666; font-size: 12px; }
          .metric { background-color: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${template.title}</h1>
          </div>
          <div class="content">
            <p><strong>Message:</strong> ${alert.message}</p>
            <div class="metric">
              <p><strong>Server:</strong> ${alert.server_name || 'Unknown'}</p>
              <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
              <p><strong>Category:</strong> ${alert.category}</p>
              <p><strong>Time:</strong> ${new Date(alert.first_seen).toLocaleString()}</p>
            </div>
            ${alert.metric_name ? `<p><strong>Metric:</strong> ${alert.metric_name} = ${alert.metric_value}</p>` : ''}
            ${alert.runbook_url ? `<p><strong>Runbook:</strong> <a href="${alert.runbook_url}">View Documentation</a></p>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from SAMS (Server and Application Monitoring System)</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private static getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#FF3366';
      case 'high': return '#FF6B35';
      case 'medium': return '#FFA500';
      case 'low': return '#00FF88';
      case 'info': return '#00BFFF';
      default: return '#666666';
    }
  }

  private static async logNotification(alertId: string, type: string, status: string, error?: string): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      await db('notification_logs').insert({
        alert_id: alertId,
        type,
        status,
        error_message: error,
        sent_at: new Date()
      });
    } catch (error) {
      logger.error('Failed to log notification:', error);
    }
  }

  // Public method to send custom notifications
  public static async sendCustomNotification(
    title: string,
    message: string,
    recipients: string[],
    type: 'push' | 'email' | 'sms' = 'push'
  ): Promise<void> {
    try {
      const template: NotificationTemplate = {
        type: 'custom',
        title,
        body: message,
        priority: 'normal'
      };

      const channel: NotificationChannel = {
        id: 'custom',
        type,
        enabled: true,
        configuration: { recipients },
        severityFilter: ['info', 'low', 'medium', 'high', 'critical']
      };

      switch (type) {
        case 'push':
          await this.sendPushNotification(template, channel);
          break;
        case 'email':
          await this.sendEmailNotification(template, channel, { severity: 'info' });
          break;
        case 'sms':
          await this.sendSMSNotification(template, channel);
          break;
      }

      logger.info(`Custom ${type} notification sent to ${recipients.length} recipients`);

    } catch (error) {
      logger.error('Failed to send custom notification:', error);
      throw error;
    }
  }
}
