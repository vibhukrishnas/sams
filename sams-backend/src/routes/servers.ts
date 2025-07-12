import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/servers - Get all servers
router.get('/', async (req: Request, res: Response) => {
  try {
    // Mock data for now
    const servers = [
      {
        id: '1',
        name: 'Production Server 1',
        ip: '192.168.1.10',
        status: 'online',
        lastSeen: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Development Server',
        ip: '192.168.1.20',
        status: 'offline',
        lastSeen: new Date(Date.now() - 300000).toISOString()
      }
    ];
    
    res.json({
      success: true,
      data: servers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch servers'
    });
  }
});

// POST /api/servers - Add new server
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ip, description } = req.body;
    
    // Mock response
    const newServer = {
      id: Date.now().toString(),
      name,
      ip,
      description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: newServer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add server'
    });
  }
});

export default router;
