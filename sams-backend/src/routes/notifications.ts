import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/notifications - Get all notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = [
      {
        id: '1',
        title: 'Server Alert',
        message: 'Production server is experiencing high load',
        type: 'alert',
        read: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'System Update',
        message: 'Maintenance scheduled for tonight',
        type: 'info',
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// POST /api/notifications - Send notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, message, type, recipients } = req.body;
    
    const notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      recipients,
      status: 'sent',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

export default router;
