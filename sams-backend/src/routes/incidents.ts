import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/incidents - Get all incidents
router.get('/', async (req: Request, res: Response) => {
  try {
    const incidents = [
      {
        id: '1',
        title: 'Database Connection Issues',
        description: 'Multiple connection timeouts reported',
        severity: 'high',
        status: 'investigating',
        createdAt: new Date().toISOString(),
        assignedTo: 'admin@sams.com'
      },
      {
        id: '2',
        title: 'Network Latency Spike',
        description: 'Increased response times across all services',
        severity: 'medium',
        status: 'resolved',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        resolvedAt: new Date(Date.now() - 3600000).toISOString(),
        assignedTo: 'ops@sams.com'
      }
    ];
    
    res.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents'
    });
  }
});

// POST /api/incidents - Create new incident
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, severity, assignedTo } = req.body;
    
    const incident = {
      id: Date.now().toString(),
      title,
      description,
      severity,
      status: 'open',
      assignedTo,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: incident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create incident'
    });
  }
});

export default router;
