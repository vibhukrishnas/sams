import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

interface ReportTemplate {
  id: string;
  name: string;
  type: 'system' | 'alert' | 'operational' | 'custom';
  query: string;
  parameters: any[];
  format: 'pdf' | 'csv' | 'json';
  template: string;
}

interface ReportData {
  title: string;
  generatedAt: Date;
  generatedBy: string;
  data: any[];
  summary: any;
  charts?: any[];
}

export class ReportService {
  private static reportsDir = path.join(process.cwd(), 'reports');

  public static async initialize(): Promise<void> {
    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsDir)) {
        fs.mkdirSync(this.reportsDir, { recursive: true });
      }
      
      logger.info('Report service initialized');
    } catch (error) {
      logger.error('Failed to initialize report service:', error);
      throw error;
    }
  }

  public static async generateReport(
    templateId: string,
    parameters: any = {},
    userId: string,
    format: 'pdf' | 'csv' | 'json' = 'pdf'
  ): Promise<string> {
    try {
      const template = await this.getReportTemplate(templateId);
      if (!template) {
        throw new Error(`Report template not found: ${templateId}`);
      }

      // Execute query to get data
      const data = await this.executeReportQuery(template.query, parameters);
      
      // Generate summary statistics
      const summary = this.generateSummary(data, template.type);

      const reportData: ReportData = {
        title: template.name,
        generatedAt: new Date(),
        generatedBy: userId,
        data,
        summary
      };

      // Generate report file
      let filePath: string;
      switch (format) {
        case 'pdf':
          filePath = await this.generatePDFReport(reportData, template);
          break;
        case 'csv':
          filePath = await this.generateCSVReport(reportData, template);
          break;
        case 'json':
          filePath = await this.generateJSONReport(reportData, template);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Log report generation
      await this.logReportGeneration(templateId, userId, filePath, format);

      logger.info(`Report generated: ${template.name} (${format}) for user ${userId}`);
      return filePath;

    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  private static async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    try {
      const db = DatabaseService.getConnection();
      const template = await db('report_templates').where('id', templateId).first();
      return template || null;
    } catch (error) {
      logger.error('Failed to get report template:', error);
      return null;
    }
  }

  private static async executeReportQuery(query: string, parameters: any): Promise<any[]> {
    try {
      const db = DatabaseService.getConnection();
      
      // Replace parameters in query
      let processedQuery = query;
      Object.keys(parameters).forEach(key => {
        const placeholder = `:${key}`;
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), parameters[key]);
      });

      const result = await db.raw(processedQuery);
      return result.rows || result;
    } catch (error) {
      logger.error('Failed to execute report query:', error);
      throw error;
    }
  }

  private static generateSummary(data: any[], reportType: string): any {
    const summary: any = {
      totalRecords: data.length,
      generatedAt: new Date().toISOString()
    };

    switch (reportType) {
      case 'system':
        summary.serverCount = data.filter(item => item.type === 'server').length;
        summary.onlineServers = data.filter(item => item.status === 'online').length;
        summary.offlineServers = data.filter(item => item.status === 'offline').length;
        break;
      
      case 'alert':
        summary.criticalAlerts = data.filter(item => item.severity === 'critical').length;
        summary.highAlerts = data.filter(item => item.severity === 'high').length;
        summary.resolvedAlerts = data.filter(item => item.status === 'resolved').length;
        summary.activeAlerts = data.filter(item => item.status === 'active').length;
        break;
      
      case 'operational':
        summary.uptimeAverage = this.calculateAverageUptime(data);
        summary.incidentCount = data.filter(item => item.type === 'incident').length;
        break;
    }

    return summary;
  }

  private static calculateAverageUptime(data: any[]): number {
    if (data.length === 0) return 0;
    const totalUptime = data.reduce((sum, item) => sum + (item.uptime || 0), 0);
    return Math.round((totalUptime / data.length) * 100) / 100;
  }

  private static async generatePDFReport(reportData: ReportData, template: ReportTemplate): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join(this.reportsDir, fileName);
        
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('SAMS Report', 50, 50);
        doc.fontSize(16).text(reportData.title, 50, 80);
        doc.fontSize(12).text(`Generated: ${reportData.generatedAt.toLocaleString()}`, 50, 110);
        doc.text(`Generated by: ${reportData.generatedBy}`, 50, 130);

        // Summary section
        doc.fontSize(14).text('Summary', 50, 170);
        let yPosition = 190;
        
        Object.keys(reportData.summary).forEach(key => {
          const value = reportData.summary[key];
          doc.fontSize(10).text(`${key}: ${value}`, 70, yPosition);
          yPosition += 15;
        });

        // Data section
        yPosition += 20;
        doc.fontSize(14).text('Data', 50, yPosition);
        yPosition += 20;

        // Table headers
        if (reportData.data.length > 0) {
          const headers = Object.keys(reportData.data[0]);
          const columnWidth = 500 / headers.length;
          
          headers.forEach((header, index) => {
            doc.fontSize(10).text(header, 50 + (index * columnWidth), yPosition, {
              width: columnWidth,
              align: 'left'
            });
          });
          yPosition += 20;

          // Table data (limit to first 50 rows for PDF)
          const limitedData = reportData.data.slice(0, 50);
          limitedData.forEach(row => {
            if (yPosition > 700) {
              doc.addPage();
              yPosition = 50;
            }

            headers.forEach((header, index) => {
              const value = row[header] || '';
              doc.fontSize(8).text(String(value).substring(0, 30), 50 + (index * columnWidth), yPosition, {
                width: columnWidth,
                align: 'left'
              });
            });
            yPosition += 15;
          });

          if (reportData.data.length > 50) {
            doc.fontSize(10).text(`... and ${reportData.data.length - 50} more records`, 50, yPosition + 10);
          }
        }

        // Footer
        doc.fontSize(8).text('Generated by SAMS - Server and Application Monitoring System', 50, 750);

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private static async generateCSVReport(reportData: ReportData, template: ReportTemplate): Promise<string> {
    try {
      const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
      const filePath = path.join(this.reportsDir, fileName);

      if (reportData.data.length === 0) {
        fs.writeFileSync(filePath, 'No data available\n');
        return filePath;
      }

      // Generate CSV content
      const headers = Object.keys(reportData.data[0]);
      let csvContent = headers.join(',') + '\n';

      reportData.data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvContent += values.join(',') + '\n';
      });

      fs.writeFileSync(filePath, csvContent);
      return filePath;

    } catch (error) {
      logger.error('Failed to generate CSV report:', error);
      throw error;
    }
  }

  private static async generateJSONReport(reportData: ReportData, template: ReportTemplate): Promise<string> {
    try {
      const fileName = `${template.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const filePath = path.join(this.reportsDir, fileName);

      const jsonContent = JSON.stringify(reportData, null, 2);
      fs.writeFileSync(filePath, jsonContent);
      
      return filePath;

    } catch (error) {
      logger.error('Failed to generate JSON report:', error);
      throw error;
    }
  }

  private static async logReportGeneration(
    templateId: string,
    userId: string,
    filePath: string,
    format: string
  ): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      await db('report_logs').insert({
        template_id: templateId,
        generated_by: userId,
        file_path: filePath,
        format,
        generated_at: new Date(),
        file_size: fs.statSync(filePath).size
      });
    } catch (error) {
      logger.error('Failed to log report generation:', error);
    }
  }

  // Predefined report templates
  public static async createDefaultTemplates(): Promise<void> {
    try {
      const db = DatabaseService.getConnection();

      const templates = [
        {
          id: 'server-inventory',
          name: 'Server Inventory Report',
          type: 'system',
          query: `
            SELECT 
              s.name,
              s.hostname,
              s.ip_address,
              s.type,
              s.os,
              s.status,
              s.location,
              s.last_seen,
              s.cpu_cores,
              s.memory_gb,
              s.disk_gb
            FROM servers s
            ORDER BY s.name
          `,
          parameters: [],
          format: 'pdf',
          template: 'default'
        },
        {
          id: 'alert-summary',
          name: 'Alert Summary Report',
          type: 'alert',
          query: `
            SELECT 
              a.title,
              a.severity,
              a.status,
              a.server_name,
              a.category,
              a.first_seen,
              a.acknowledged_at,
              a.resolved_at
            FROM alerts a
            WHERE a.first_seen >= NOW() - INTERVAL '7 days'
            ORDER BY a.first_seen DESC
          `,
          parameters: [],
          format: 'pdf',
          template: 'default'
        },
        {
          id: 'uptime-report',
          name: 'Server Uptime Report',
          type: 'operational',
          query: `
            SELECT 
              s.name,
              s.hostname,
              s.status,
              s.last_seen,
              EXTRACT(EPOCH FROM (NOW() - s.last_seen))/3600 as hours_since_last_seen,
              sm.uptime
            FROM servers s
            LEFT JOIN (
              SELECT DISTINCT ON (server_id) 
                server_id, uptime 
              FROM server_metrics 
              ORDER BY server_id, timestamp DESC
            ) sm ON s.id = sm.server_id
            ORDER BY s.name
          `,
          parameters: [],
          format: 'pdf',
          template: 'default'
        }
      ];

      for (const template of templates) {
        const existing = await db('report_templates').where('id', template.id).first();
        if (!existing) {
          await db('report_templates').insert(template);
        }
      }

      logger.info('Default report templates created');

    } catch (error) {
      logger.error('Failed to create default templates:', error);
    }
  }

  public static async getAvailableTemplates(): Promise<ReportTemplate[]> {
    try {
      const db = DatabaseService.getConnection();
      return await db('report_templates').orderBy('name');
    } catch (error) {
      logger.error('Failed to get available templates:', error);
      return [];
    }
  }

  public static async scheduleReport(
    templateId: string,
    schedule: string,
    recipients: string[],
    format: 'pdf' | 'csv' | 'json' = 'pdf'
  ): Promise<void> {
    try {
      const db = DatabaseService.getConnection();
      await db('scheduled_reports').insert({
        template_id: templateId,
        schedule,
        recipients: JSON.stringify(recipients),
        format,
        enabled: true,
        created_at: new Date()
      });

      logger.info(`Report scheduled: ${templateId} with schedule ${schedule}`);

    } catch (error) {
      logger.error('Failed to schedule report:', error);
      throw error;
    }
  }

  public static getReportFile(fileName: string): string {
    const filePath = path.join(this.reportsDir, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    throw new Error('Report file not found');
  }

  public static async cleanupOldReports(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Get old report files from database
      const db = DatabaseService.getConnection();
      const oldReports = await db('report_logs')
        .where('generated_at', '<', cutoffDate);

      // Delete files and database records
      for (const report of oldReports) {
        try {
          if (fs.existsSync(report.file_path)) {
            fs.unlinkSync(report.file_path);
          }
          await db('report_logs').where('id', report.id).del();
        } catch (error) {
          logger.error(`Failed to cleanup report ${report.id}:`, error);
        }
      }

      logger.info(`Cleaned up ${oldReports.length} old reports`);

    } catch (error) {
      logger.error('Failed to cleanup old reports:', error);
    }
  }
}
