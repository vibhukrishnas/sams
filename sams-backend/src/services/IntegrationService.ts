import { EventEmitter } from 'events';
import axios, { AxiosResponse } from 'axios';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: { [key: string]: string };
  events: string[]; // Which events trigger this webhook
  enabled: boolean;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  secretKey?: string; // For HMAC signature verification
  lastTriggered?: string;
  triggerCount: number;
  successCount: number;
  failureCount: number;
}

export interface APIExtension {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  handler: string; // Path to handler function
  authentication: 'none' | 'api_key' | 'bearer_token';
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  enabled: boolean;
  version: string;
  created: string;
  lastCalled?: string;
  callCount: number;
}

export interface ComplianceReport {
  id: string;
  name: string;
  type: 'security' | 'audit' | 'performance' | 'inventory' | 'custom';
  schedule: 'manual' | 'daily' | 'weekly' | 'monthly';
  format: 'json' | 'csv' | 'pdf' | 'html';
  recipients: string[];
  query: string; // SQL-like query or configuration
  lastGenerated?: string;
  nextScheduled?: string;
  enabled: boolean;
  template?: string;
}

export interface IntegrationEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: any;
  webhookResults?: WebhookResult[];
}

export interface WebhookResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  timestamp: string;
  duration: number; // milliseconds
}

export interface ThirdPartyIntegration {
  id: string;
  name: string;
  type: 'monitoring' | 'ticketing' | 'communication' | 'automation' | 'storage';
  config: { [key: string]: any };
  enabled: boolean;
  lastSync?: string;
  syncInterval: number; // minutes
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

export class IntegrationService extends EventEmitter {
  private static instance: IntegrationService;
  private webhooks: Map<string, WebhookConfig> = new Map();
  private apiExtensions: Map<string, APIExtension> = new Map();
  private complianceReports: Map<string, ComplianceReport> = new Map();
  private integrations: Map<string, ThirdPartyIntegration> = new Map();
  private eventHistory: IntegrationEvent[] = [];

  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  constructor() {
    super();
    this.initializeDefaultIntegrations();
  }

  /**
   * Create a new webhook
   */
  createWebhook(webhook: Omit<WebhookConfig, 'id' | 'triggerCount' | 'successCount' | 'failureCount'>): WebhookConfig {
    const webhookConfig: WebhookConfig = {
      ...webhook,
      id: this.generateId(),
      triggerCount: 0,
      successCount: 0,
      failureCount: 0
    };

    this.webhooks.set(webhookConfig.id, webhookConfig);
    console.log(`Webhook created: ${webhookConfig.name} -> ${webhookConfig.url}`);
    
    return webhookConfig;
  }

  /**
   * Update a webhook
   */
  updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return null;
    }

    const updatedWebhook = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updatedWebhook);
    
    console.log(`Webhook updated: ${updatedWebhook.name}`);
    return updatedWebhook;
  }

  /**
   * Delete a webhook
   */
  deleteWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return false;
    }

    this.webhooks.delete(webhookId);
    console.log(`Webhook deleted: ${webhook.name}`);
    return true;
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(eventType: string, eventData: any, source: string = 'system'): Promise<IntegrationEvent> {
    const event: IntegrationEvent = {
      id: this.generateId(),
      type: eventType,
      source,
      timestamp: new Date().toISOString(),
      data: eventData,
      webhookResults: []
    };

    // Find webhooks that should be triggered by this event
    const applicableWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => webhook.enabled && webhook.events.includes(eventType));

    console.log(`Triggering ${applicableWebhooks.length} webhooks for event: ${eventType}`);

    // Execute webhooks
    const webhookPromises = applicableWebhooks.map(webhook => this.executeWebhook(webhook, event));
    const results = await Promise.allSettled(webhookPromises);

    // Process results
    event.webhookResults = results.map((result, index) => {
      const webhook = applicableWebhooks[index];
      
      if (result.status === 'fulfilled') {
        webhook.successCount++;
        return result.value;
      } else {
        webhook.failureCount++;
        return {
          webhookId: webhook.id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date().toISOString(),
          duration: 0
        };
      }
    });

    // Store event
    this.eventHistory.push(event);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    this.emit('integrationEvent', event);
    return event;
  }

  /**
   * Execute a single webhook
   */
  private async executeWebhook(webhook: WebhookConfig, event: IntegrationEvent): Promise<WebhookResult> {
    const startTime = Date.now();
    
    try {
      webhook.triggerCount++;
      webhook.lastTriggered = new Date().toISOString();

      const payload = {
        event: {
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          source: event.source
        },
        data: event.data
      };

      // Add HMAC signature if secret key is provided
      const headers = { ...webhook.headers };
      if (webhook.secretKey) {
        const crypto = require('crypto');
        const signature = crypto
          .createHmac('sha256', webhook.secretKey)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-SAMS-Signature'] = `sha256=${signature}`;
      }

      const response: AxiosResponse = await axios({
        method: webhook.method,
        url: webhook.url,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Integration-Service/1.0',
          ...headers
        },
        data: webhook.method !== 'GET' ? payload : undefined,
        params: webhook.method === 'GET' ? payload : undefined,
        timeout: webhook.timeout,
        validateStatus: (status) => status < 500 // Consider 4xx as success for webhook delivery
      });

      const result: WebhookResult = {
        webhookId: webhook.id,
        success: response.status < 400,
        statusCode: response.status,
        response: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      console.log(`Webhook ${webhook.name} executed successfully: ${response.status}`);
      return result;

    } catch (error) {
      const result: WebhookResult = {
        webhookId: webhook.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      console.error(`Webhook ${webhook.name} failed:`, error);
      
      // Retry logic
      if (webhook.retryAttempts > 0) {
        await new Promise(resolve => setTimeout(resolve, webhook.retryDelay));
        // TODO: Implement proper retry mechanism
      }

      return result;
    }
  }

  /**
   * Create API extension
   */
  createAPIExtension(extension: Omit<APIExtension, 'id' | 'created' | 'callCount'>): APIExtension {
    const apiExtension: APIExtension = {
      ...extension,
      id: this.generateId(),
      created: new Date().toISOString(),
      callCount: 0
    };

    this.apiExtensions.set(apiExtension.id, apiExtension);
    console.log(`API extension created: ${apiExtension.name} at ${apiExtension.endpoint}`);
    
    return apiExtension;
  }

  /**
   * Get all API extensions
   */
  getAPIExtensions(): APIExtension[] {
    return Array.from(this.apiExtensions.values());
  }

  /**
   * Call an API extension
   */
  async callAPIExtension(extensionId: string, data: any): Promise<any> {
    const extension = this.apiExtensions.get(extensionId);
    if (!extension || !extension.enabled) {
      throw new Error(`API extension not found or disabled: ${extensionId}`);
    }

    extension.callCount++;
    extension.lastCalled = new Date().toISOString();

    // In a real implementation, this would dynamically load and execute the handler
    console.log(`API extension called: ${extension.name}`, data);
    
    return {
      success: true,
      message: `API extension ${extension.name} executed successfully`,
      data: data
    };
  }

  /**
   * Create compliance report
   */
  createComplianceReport(report: Omit<ComplianceReport, 'id'>): ComplianceReport {
    const complianceReport: ComplianceReport = {
      ...report,
      id: this.generateId()
    };

    this.complianceReports.set(complianceReport.id, complianceReport);
    console.log(`Compliance report created: ${complianceReport.name}`);
    
    return complianceReport;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(reportId: string): Promise<string> {
    const report = this.complianceReports.get(reportId);
    if (!report || !report.enabled) {
      throw new Error(`Compliance report not found or disabled: ${reportId}`);
    }

    report.lastGenerated = new Date().toISOString();
    
    // In a real implementation, this would execute the query and generate the report
    const reportContent = await this.executeReportQuery(report);
    
    // Send to recipients if specified
    if (report.recipients.length > 0) {
      await this.sendReportToRecipients(report, reportContent);
    }

    console.log(`Compliance report generated: ${report.name}`);
    return reportContent;
  }

  /**
   * Execute report query
   */
  private async executeReportQuery(report: ComplianceReport): Promise<string> {
    // Mock implementation - in reality would query the database
    const mockData = {
      reportId: report.id,
      reportName: report.name,
      type: report.type,
      generatedAt: new Date().toISOString(),
      summary: {
        totalDevices: 15,
        alertsLastWeek: 42,
        securityIncidents: 3,
        complianceScore: 87
      },
      details: [
        { device: 'SERVER-01', status: 'Compliant', score: 95 },
        { device: 'SERVER-02', status: 'Warning', score: 78 },
        { device: 'WORKSTATION-01', status: 'Compliant', score: 92 }
      ]
    };

    switch (report.format) {
      case 'json':
        return JSON.stringify(mockData, null, 2);
      case 'csv':
        return this.convertToCSV(mockData);
      case 'html':
        return this.convertToHTML(mockData);
      case 'pdf':
        return this.convertToPDF(mockData);
      default:
        return JSON.stringify(mockData, null, 2);
    }
  }

  /**
   * Send report to recipients
   */
  private async sendReportToRecipients(report: ComplianceReport, content: string): Promise<void> {
    for (const recipient of report.recipients) {
      // Mock email sending
      console.log(`Sending ${report.format} report to: ${recipient}`);
      
      // In reality, would integrate with email service
      await this.triggerWebhooks('compliance_report_sent', {
        reportId: report.id,
        reportName: report.name,
        recipient,
        format: report.format
      });
    }
  }

  /**
   * Add third-party integration
   */
  addIntegration(integration: Omit<ThirdPartyIntegration, 'id' | 'status'>): ThirdPartyIntegration {
    const newIntegration: ThirdPartyIntegration = {
      ...integration,
      id: this.generateId(),
      status: 'disconnected'
    };

    this.integrations.set(newIntegration.id, newIntegration);
    console.log(`Integration added: ${newIntegration.name}`);
    
    return newIntegration;
  }

  /**
   * Test integration connection
   */
  async testIntegration(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    try {
      // Mock connection test
      console.log(`Testing integration: ${integration.name}`);
      
      integration.status = 'connected';
      integration.lastSync = new Date().toISOString();
      integration.errorMessage = undefined;

      await this.triggerWebhooks('integration_connected', {
        integrationId: integration.id,
        name: integration.name,
        type: integration.type
      });

      return true;
    } catch (error) {
      integration.status = 'error';
      integration.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.triggerWebhooks('integration_error', {
        integrationId: integration.id,
        name: integration.name,
        error: integration.errorMessage
      });

      return false;
    }
  }

  /**
   * Sync with third-party integration
   */
  async syncIntegration(integrationId: string): Promise<any> {
    const integration = this.integrations.get(integrationId);
    if (!integration || !integration.enabled) {
      throw new Error(`Integration not found or disabled: ${integrationId}`);
    }

    try {
      console.log(`Syncing integration: ${integration.name}`);
      
      // Mock sync process
      const syncResult = {
        syncId: this.generateId(),
        integrationId: integration.id,
        timestamp: new Date().toISOString(),
        recordsProcessed: Math.floor(Math.random() * 100),
        success: true
      };

      integration.lastSync = new Date().toISOString();
      integration.status = 'connected';

      await this.triggerWebhooks('integration_sync_completed', syncResult);

      return syncResult;
    } catch (error) {
      integration.status = 'error';
      integration.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      throw error;
    }
  }

  /**
   * Get integration statistics
   */
  getIntegrationStatistics(): any {
    const webhooks = Array.from(this.webhooks.values());
    const extensions = Array.from(this.apiExtensions.values());
    const reports = Array.from(this.complianceReports.values());
    const integrations = Array.from(this.integrations.values());

    return {
      webhooks: {
        total: webhooks.length,
        enabled: webhooks.filter(w => w.enabled).length,
        totalTriggers: webhooks.reduce((sum, w) => sum + w.triggerCount, 0),
        successRate: this.calculateWebhookSuccessRate(webhooks)
      },
      apiExtensions: {
        total: extensions.length,
        enabled: extensions.filter(e => e.enabled).length,
        totalCalls: extensions.reduce((sum, e) => sum + e.callCount, 0)
      },
      complianceReports: {
        total: reports.length,
        enabled: reports.filter(r => r.enabled).length,
        lastGenerated: reports
          .filter(r => r.lastGenerated)
          .sort((a, b) => new Date(b.lastGenerated!).getTime() - new Date(a.lastGenerated!).getTime())[0]?.lastGenerated
      },
      integrations: {
        total: integrations.length,
        connected: integrations.filter(i => i.status === 'connected').length,
        error: integrations.filter(i => i.status === 'error').length
      },
      events: {
        total: this.eventHistory.length,
        lastWeek: this.eventHistory.filter(e => 
          Date.now() - new Date(e.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length
      }
    };
  }

  // Helper methods
  private calculateWebhookSuccessRate(webhooks: WebhookConfig[]): number {
    const totalAttempts = webhooks.reduce((sum, w) => sum + w.triggerCount, 0);
    const totalSuccesses = webhooks.reduce((sum, w) => sum + w.successCount, 0);
    
    return totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion
    return `Report,${data.reportName}\nGenerated,${data.generatedAt}\nTotal Devices,${data.summary.totalDevices}\nAlerts Last Week,${data.summary.alertsLastWeek}`;
  }

  private convertToHTML(data: any): string {
    return `
      <html>
        <head><title>${data.reportName}</title></head>
        <body>
          <h1>${data.reportName}</h1>
          <p>Generated: ${data.generatedAt}</p>
          <h2>Summary</h2>
          <ul>
            <li>Total Devices: ${data.summary.totalDevices}</li>
            <li>Alerts Last Week: ${data.summary.alertsLastWeek}</li>
            <li>Compliance Score: ${data.summary.complianceScore}%</li>
          </ul>
        </body>
      </html>
    `;
  }

  private convertToPDF(data: any): string {
    // In reality, would use a PDF library
    return `PDF: ${data.reportName} - ${data.generatedAt}`;
  }

  private generateId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultIntegrations(): void {
    // Create default webhook for system events
    this.createWebhook({
      name: 'System Alerts Webhook',
      url: 'http://localhost:3000/api/notifications/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      events: ['alert_created', 'alert_resolved', 'system_error'],
      enabled: true,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Create default compliance report
    this.createComplianceReport({
      name: 'Weekly Security Report',
      type: 'security',
      schedule: 'weekly',
      format: 'html',
      recipients: ['admin@example.com'],
      query: 'SELECT * FROM security_events WHERE created_at > NOW() - INTERVAL 7 DAY',
      enabled: true
    });
  }

  // Getters
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  getComplianceReports(): ComplianceReport[] {
    return Array.from(this.complianceReports.values());
  }

  getIntegrations(): ThirdPartyIntegration[] {
    return Array.from(this.integrations.values());
  }

  getEventHistory(): IntegrationEvent[] {
    return [...this.eventHistory];
  }
}
