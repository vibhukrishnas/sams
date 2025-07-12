import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { DatabaseService } from '../services/DatabaseService';
import { NotificationService } from '../services/NotificationService';
import { WebSocketService } from '../services/WebSocketService';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all alerts with filtering and pagination
router.get('/', 
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('severity').optional().isIn(['info', 'low', 'medium', 'high', 'critical']),
    query('status').optional().isIn(['active', 'acknowledged', 'resolved', 'suppressed']),
    query('server_id').optional().isUUID(),
    query('category').optional().isIn(['system', 'performance', 'application', 'security', 'network'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: errors.array()
        });
      }

      const {
        page = 1,
        limit = 20,
        severity,
        status,
        server_id,
        category,
        search
      } = req.query;

      const db = DatabaseService.getConnection();
      let query = db('alerts')
        .leftJoin('servers', 'alerts.server_id', 'servers.id')
        .leftJoin('users as ack_user', 'alerts.acknowledged_by', 'ack_user.id')
        .leftJoin('users as res_user', 'alerts.resolved_by', 'res_user.id')
        .select(
          'alerts.*',
          'servers.name as server_name',
          'servers.hostname as server_hostname',
          'ack_user.username as acknowledged_by_username',
          'res_user.username as resolved_by_username'
        );

      // Apply filters
      if (severity) query = query.where('alerts.severity', severity);
      if (status) query = query.where('alerts.status', status);
      if (server_id) query = query.where('alerts.server_id', server_id);
      if (category) query = query.where('alerts.category', category);
      
      if (search) {
        query = query.where(function() {
          this.where('alerts.title', 'ILIKE', `%${search}%`)
              .orWhere('alerts.message', 'ILIKE', `%${search}%`)
              .orWhere('servers.name', 'ILIKE', `%${search}%`);
        });
      }

      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count('alerts.id as count');
      const total = parseInt(count as string);

      // Get paginated results
      const alerts = await query
        .orderBy('alerts.first_seen', 'desc')
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit));

      res.json({
        success: true,
        data: alerts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get alert by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseService.getConnection();

    const alert = await db('alerts')
      .leftJoin('servers', 'alerts.server_id', 'servers.id')
      .leftJoin('users as ack_user', 'alerts.acknowledged_by', 'ack_user.id')
      .leftJoin('users as res_user', 'alerts.resolved_by', 'res_user.id')
      .select(
        'alerts.*',
        'servers.name as server_name',
        'servers.hostname as server_hostname',
        'ack_user.username as acknowledged_by_username',
        'res_user.username as resolved_by_username'
      )
      .where('alerts.id', id)
      .first();

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    logger.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new alert
router.post('/',
  [
    body('title').notEmpty().trim(),
    body('message').notEmpty().trim(),
    body('severity').isIn(['info', 'low', 'medium', 'high', 'critical']),
    body('type').isIn(['threshold', 'anomaly', 'availability', 'security', 'custom']),
    body('category').isIn(['system', 'performance', 'application', 'security', 'network']),
    body('source').notEmpty().trim(),
    body('server_id').optional().isUUID(),
    body('metric_name').optional().trim(),
    body('metric_value').optional().isNumeric(),
    body('threshold_value').optional().isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const alertData = {
        ...req.body,
        first_seen: new Date(),
        last_seen: new Date(),
        occurrence_count: 1
      };

      const alert = await DatabaseService.create('alerts', alertData);

      // Send notifications
      await NotificationService.sendAlertNotification(alert);

      // Broadcast to WebSocket clients
      WebSocketService.broadcastAlert(alert);

      logger.info(`New alert created: ${alert.title} (${alert.id})`);

      res.status(201).json({
        success: true,
        message: 'Alert created successfully',
        data: alert
      });

    } catch (error) {
      logger.error('Error creating alert:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Acknowledge alert
router.post('/:id/acknowledge',
  [
    body('note').optional().trim()
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const userId = (req as any).user.userId;

      const updateData = {
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date(),
        acknowledgment_note: note,
        status: 'acknowledged'
      };

      const alert = await DatabaseService.update('alerts', id, updateData);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      // Broadcast update to WebSocket clients
      WebSocketService.broadcastAlertUpdate(alert);

      logger.info(`Alert acknowledged: ${id} by user ${userId}`);

      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: alert
      });

    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Resolve alert
router.post('/:id/resolve',
  [
    body('note').optional().trim()
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const userId = (req as any).user.userId;

      const updateData = {
        resolved: true,
        resolved_by: userId,
        resolved_at: new Date(),
        resolution_note: note,
        status: 'resolved'
      };

      const alert = await DatabaseService.update('alerts', id, updateData);

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }

      // Broadcast update to WebSocket clients
      WebSocketService.broadcastAlertUpdate(alert);

      logger.info(`Alert resolved: ${id} by user ${userId}`);

      res.json({
        success: true,
        message: 'Alert resolved successfully',
        data: alert
      });

    } catch (error) {
      logger.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Escalate alert
router.post('/:id/escalate', async (req, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseService.getConnection();

    const alert = await db('alerts').where('id', id).first();
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    const updateData = {
      escalation_level: alert.escalation_level + 1
    };

    const updatedAlert = await DatabaseService.update('alerts', id, updateData);

    // Send escalation notifications
    await NotificationService.sendEscalationNotification(updatedAlert);

    // Broadcast update to WebSocket clients
    WebSocketService.broadcastAlertUpdate(updatedAlert);

    logger.info(`Alert escalated: ${id} to level ${updatedAlert.escalation_level}`);

    res.json({
      success: true,
      message: 'Alert escalated successfully',
      data: updatedAlert
    });

  } catch (error) {
    logger.error('Error escalating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get alert statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const db = DatabaseService.getConnection();

    const stats = await db('alerts')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN severity = ? THEN 1 END) as critical', ['critical']),
        db.raw('COUNT(CASE WHEN severity = ? THEN 1 END) as high', ['high']),
        db.raw('COUNT(CASE WHEN severity = ? THEN 1 END) as medium', ['medium']),
        db.raw('COUNT(CASE WHEN severity = ? THEN 1 END) as low', ['low']),
        db.raw('COUNT(CASE WHEN severity = ? THEN 1 END) as info', ['info']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as active', ['active']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as acknowledged', ['acknowledged']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as resolved', ['resolved'])
      )
      .first();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching alert statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
