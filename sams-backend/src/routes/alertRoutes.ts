/**
 * 🚨 Alert Management Routes
 * Enhanced API endpoints for alert lifecycle management, correlation, and automation
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const router = Router();

interface AlertFilters {
  search?: string;
  severity?: string;
  status?: string;
  timeRange?: string;
  source?: string;
  assignee?: string;
  tags?: string[];
}

interface AlertCreateRequest {
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  source?: string;
  tags?: string[];
  metadata?: any;
}

interface AlertUpdateRequest {
  title?: string;
  description?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status?: 'open' | 'acknowledged' | 'in-progress' | 'resolved';
  assigned_to?: string;
  resolution?: string;
  tags?: string[];
}

/**
 * GET /api/alerts - Get alerts with filtering, sorting, and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      severity,
      status,
      timeRange,
      source,
      assignee
    } = req.query;

    const filters: AlertFilters = {
      search: search as string,
      severity: severity as string,
      status: status as string,
      timeRange: timeRange as string,
      source: source as string,
      assignee: assignee as string
    };

    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereValues: any[] = [];
    let paramIndex = 1;

    // Search filter
    if (filters.search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      whereValues.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Severity filter
    if (filters.severity) {
      whereConditions.push(`severity = $${paramIndex}`);
      whereValues.push(filters.severity);
      paramIndex++;
    }

    // Status filter
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      whereValues.push(filters.status);
      paramIndex++;
    }

    // Source filter
    if (filters.source) {
      whereConditions.push(`source = $${paramIndex}`);
      whereValues.push(filters.source);
      paramIndex++;
    }

    // Assignee filter
    if (filters.assignee) {
      whereConditions.push(`assigned_to = $${paramIndex}`);
      whereValues.push(filters.assignee);
      paramIndex++;
    }

    // Time range filter
    if (filters.timeRange) {
      const timeRangeMap: { [key: string]: string } = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };
      
      if (timeRangeMap[filters.timeRange]) {
        whereConditions.push(`created_at >= NOW() - INTERVAL '${timeRangeMap[filters.timeRange]}'`);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM alerts ${whereClause}`;
    const countResult = await DatabaseService.query(countQuery, whereValues);
    const total = parseInt(countResult[0].count);

    // Get paginated alerts
    const offset = (Number(page) - 1) * Number(limit);
    const alertsQuery = `
      SELECT 
        id, title, description, severity, status, source, assigned_to, 
        escalation_level, tags, metadata, created_at, updated_at, resolved_at
      FROM alerts 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const alerts = await DatabaseService.query(alertsQuery, [...whereValues, Number(limit), offset]);

    // Parse tags from JSON strings
    const processedAlerts = alerts.map(alert => ({
      ...alert,
      tags: alert.tags ? JSON.parse(alert.tags) : []
    }));

    res.json({
      success: true,
      alerts: processedAlerts,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

/**
 * GET /api/alerts/:id - Get specific alert details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await DatabaseService.findById('alerts', id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Parse tags from JSON string
    alert.tags = alert.tags ? JSON.parse(alert.tags) : [];

    // Get alert history/timeline
    const historyQuery = `
      SELECT action, details, created_by, created_at 
      FROM alert_history 
      WHERE alert_id = $1 
      ORDER BY created_at DESC
    `;
    const history = await DatabaseService.query(historyQuery, [id]);

    res.json({
      success: true,
      alert: {
        ...alert,
        history
      }
    });

  } catch (error) {
    logger.error('Error fetching alert details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert details',
      error: error.message
    });
  }
});

/**
 * POST /api/alerts - Create new alert
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const alertData: AlertCreateRequest = req.body;

    // Validate required fields
    if (!alertData.title || !alertData.severity) {
      return res.status(400).json({
        success: false,
        message: 'Title and severity are required'
      });
    }

    // Validate severity
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!validSeverities.includes(alertData.severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity level'
      });
    }

    const newAlert = {
      title: alertData.title,
      description: alertData.description || null,
      severity: alertData.severity,
      status: 'open',
      source: alertData.source || null,
      tags: alertData.tags ? JSON.stringify(alertData.tags) : null,
      metadata: alertData.metadata ? JSON.stringify(alertData.metadata) : null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const alert = await DatabaseService.create('alerts', newAlert);

    // Log alert creation
    await DatabaseService.create('alert_history', {
      alert_id: alert.id,
      action: 'created',
      details: 'Alert created',
      created_by: req.user?.id || 'system',
      created_at: new Date()
    });

    // Trigger alert processing (notifications, escalations, etc.)
    await processNewAlert(alert);

    res.status(201).json({
      success: true,
      alert: {
        ...alert,
        tags: alert.tags ? JSON.parse(alert.tags) : []
      }
    });

  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message
    });
  }
});

/**
 * PUT /api/alerts/:id - Update alert
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: AlertUpdateRequest = req.body;

    const existingAlert = await DatabaseService.findById('alerts', id);
    if (!existingAlert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Validate severity if provided
    if (updateData.severity) {
      const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
      if (!validSeverities.includes(updateData.severity)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid severity level'
        });
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['open', 'acknowledged', 'in-progress', 'resolved'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
    }

    const updatedFields: any = {
      ...updateData,
      updated_at: new Date()
    };

    // Handle tags
    if (updateData.tags) {
      updatedFields.tags = JSON.stringify(updateData.tags);
    }

    // Set resolved_at if status is resolved
    if (updateData.status === 'resolved' && existingAlert.status !== 'resolved') {
      updatedFields.resolved_at = new Date();
    }

    const updatedAlert = await DatabaseService.update('alerts', id, updatedFields);

    // Log the update
    const changes = Object.keys(updateData).map(key => `${key}: ${updateData[key]}`).join(', ');
    await DatabaseService.create('alert_history', {
      alert_id: id,
      action: 'updated',
      details: `Alert updated: ${changes}`,
      created_by: req.user?.id || 'system',
      created_at: new Date()
    });

    res.json({
      success: true,
      alert: {
        ...updatedAlert,
        tags: updatedAlert.tags ? JSON.parse(updatedAlert.tags) : []
      }
    });

  } catch (error) {
    logger.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:id/acknowledge - Acknowledge alert
 */
router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const alert = await DatabaseService.findById('alerts', id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Only open alerts can be acknowledged'
      });
    }

    const updatedAlert = await DatabaseService.update('alerts', id, {
      status: 'acknowledged',
      acknowledged_at: new Date(),
      acknowledged_by: req.user?.id || 'system',
      updated_at: new Date()
    });

    // Log acknowledgment
    await DatabaseService.create('alert_history', {
      alert_id: id,
      action: 'acknowledged',
      details: notes || 'Alert acknowledged',
      created_by: req.user?.id || 'system',
      created_at: new Date()
    });

    res.json({
      success: true,
      alert: updatedAlert
    });

  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:id/assign - Assign alert
 */
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignee } = req.body;

    if (!assignee) {
      return res.status(400).json({
        success: false,
        message: 'Assignee is required'
      });
    }

    const alert = await DatabaseService.findById('alerts', id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    const updatedAlert = await DatabaseService.update('alerts', id, {
      assigned_to: assignee,
      status: alert.status === 'open' ? 'acknowledged' : alert.status,
      updated_at: new Date()
    });

    // Log assignment
    await DatabaseService.create('alert_history', {
      alert_id: id,
      action: 'assigned',
      details: `Alert assigned to ${assignee}`,
      created_by: req.user?.id || 'system',
      created_at: new Date()
    });

    res.json({
      success: true,
      alert: updatedAlert
    });

  } catch (error) {
    logger.error('Error assigning alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign alert',
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:id/resolve - Resolve alert
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const alert = await DatabaseService.findById('alerts', id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved'
      });
    }

    const updatedAlert = await DatabaseService.update('alerts', id, {
      status: 'resolved',
      resolution: resolution || null,
      resolved_at: new Date(),
      resolved_by: req.user?.id || 'system',
      updated_at: new Date()
    });

    // Log resolution
    await DatabaseService.create('alert_history', {
      alert_id: id,
      action: 'resolved',
      details: resolution || 'Alert resolved',
      created_by: req.user?.id || 'system',
      created_at: new Date()
    });

    res.json({
      success: true,
      alert: updatedAlert
    });

  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
});

/**
 * POST /api/alerts/:id/escalate - Escalate alert
 */
router.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const alert = await DatabaseService.findById('alerts', id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot escalate resolved alert'
      });
    }

    const currentLevel = alert.escalation_level || 0;
    const newLevel = currentLevel + 1;

    const updatedAlert = await DatabaseService.update('alerts', id, {
      escalation_level: newLevel,
      updated_at: new Date()
    });

    // Log escalation
    await DatabaseService.create('alert_history', {
      alert_id: id,
      action: 'escalated',
      details: reason || `Alert escalated to level ${newLevel}`,
      created_by: req.user?.id || 'system',
      created_at: new Date()
    });

    // Trigger escalation notifications
    await processAlertEscalation(updatedAlert);

    res.json({
      success: true,
      alert: updatedAlert
    });

  } catch (error) {
    logger.error('Error escalating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to escalate alert',
      error: error.message
    });
  }
});

// Helper functions
async function processNewAlert(alert: any): Promise<void> {
  try {
    // Implement alert processing logic:
    // - Send notifications
    // - Check for correlation with existing alerts
    // - Apply automation rules
    // - Schedule escalations
    
    logger.info(`Processing new alert: ${alert.id} - ${alert.title}`);
    
    // Example: Auto-escalate critical alerts after 15 minutes
    if (alert.severity === 'critical') {
      setTimeout(async () => {
        const currentAlert = await DatabaseService.findById('alerts', alert.id);
        if (currentAlert && currentAlert.status !== 'resolved') {
          // Auto-escalate
          await DatabaseService.update('alerts', alert.id, {
            escalation_level: 1,
            updated_at: new Date()
          });
        }
      }, 15 * 60 * 1000); // 15 minutes
    }
  } catch (error) {
    logger.error('Error processing new alert:', error);
  }
}

async function processAlertEscalation(alert: any): Promise<void> {
  try {
    // Implement escalation processing logic:
    // - Send escalation notifications
    // - Update on-call schedules
    // - Trigger additional automation
    
    logger.info(`Processing alert escalation: ${alert.id} - Level ${alert.escalation_level}`);
  } catch (error) {
    logger.error('Error processing alert escalation:', error);
  }
}

export default router;
