import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET /api/dashboard - Get dashboard data
router.get('/', async (req: Request, res: Response) => {
  try {
    const dashboardData = {
      stats: {
        totalServers: 15,
        onlineServers: 12,
        offlineServers: 3,
        totalAlerts: 8,
        criticalAlerts: 2,
        warningAlerts: 4,
        infoAlerts: 2
      },
      recentAlerts: [
        {
          id: '1',
          severity: 'critical',
          message: 'High CPU usage on Production Server 1',
          timestamp: new Date().toISOString(),
          server: 'prod-server-01'
        },
        {
          id: '2',
          severity: 'warning',
          message: 'Low disk space on Database Server',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          server: 'db-server-01'
        }
      ],
      systemHealth: {
        cpu: 65,
        memory: 78,
        disk: 45,
        network: 92
      }
    };
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

export default router;
