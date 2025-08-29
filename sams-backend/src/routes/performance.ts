import express from 'express';
import { PerformanceOptimizationService } from '../services/PerformanceOptimizationService';

const router = express.Router();
const performanceService = PerformanceOptimizationService.getInstance();

/**
 * @route POST /api/performance/collect/:deviceId
 * @desc Collect performance metrics for a device
 * @access Public (in demo, should be protected in production)
 */
router.post('/collect/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    console.log(`Starting performance metrics collection for device: ${deviceId}`);

    const metrics = await performanceService.collectMetrics(deviceId);

    res.json({
      success: true,
      message: `Performance metrics collected for device ${deviceId}`,
      data: metrics
    });
  } catch (error) {
    console.error('Error collecting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to collect performance metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/performance/recommendations
 * @desc Get performance recommendations
 * @access Public (in demo, should be protected in production)
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { deviceId, priority } = req.query;

    const recommendations = performanceService.getRecommendations(
      deviceId as string,
      priority as string
    );

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting performance recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/performance/trends
 * @desc Get performance trends
 * @access Public (in demo, should be protected in production)
 */
router.get('/trends', async (req, res) => {
  try {
    const { deviceId } = req.query;

    const trends = performanceService.getTrends(deviceId as string);

    res.json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Error getting performance trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance trends',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/performance/summary/:deviceId
 * @desc Get performance summary for a device
 * @access Public (in demo, should be protected in production)
 */
router.get('/summary/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const summary = performanceService.getPerformanceSummary(deviceId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: `No performance data found for device: ${deviceId}`
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/performance/optimization/tasks
 * @desc Get optimization tasks
 * @access Public (in demo, should be protected in production)
 */
router.get('/optimization/tasks', async (req, res) => {
  try {
    const { deviceId, status } = req.query;

    const tasks = performanceService.getOptimizationTasks(
      deviceId as string,
      status as string
    );

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error getting optimization tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get optimization tasks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/performance/optimization/execute/:taskId
 * @desc Execute an optimization task
 * @access Public (in demo, should be protected in production)
 */
router.post('/optimization/execute/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    console.log(`Executing optimization task: ${taskId}`);

    const task = await performanceService.executeOptimizationTask(taskId);

    res.json({
      success: true,
      message: `Optimization task ${task.status}`,
      data: task
    });
  } catch (error) {
    console.error('Error executing optimization task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute optimization task',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/performance/test/:deviceId
 * @desc Test performance monitoring with sample data
 * @access Public (in demo, should be protected in production)
 */
router.post('/test/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    console.log(`Testing performance monitoring for device: ${deviceId}`);

    // Collect metrics multiple times to generate trends and recommendations
    const results = [];
    for (let i = 0; i < 3; i++) {
      const metrics = await performanceService.collectMetrics(deviceId);
      results.push(metrics);
      
      // Wait a bit between collections
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Get the summary
    const summary = performanceService.getPerformanceSummary(deviceId);
    const recommendations = performanceService.getRecommendations(deviceId);
    const trends = performanceService.getTrends(deviceId);

    res.json({
      success: true,
      message: `Performance monitoring test completed for device ${deviceId}`,
      data: {
        metricsCollected: results.length,
        latestMetrics: results[results.length - 1],
        summary,
        recommendations: recommendations.slice(0, 5), // Top 5 recommendations
        trends: trends.slice(0, 3) // Top 3 trends
      }
    });
  } catch (error) {
    console.error('Error testing performance monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test performance monitoring',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/performance/health/:deviceId
 * @desc Get device health score and status
 * @access Public (in demo, should be protected in production)
 */
router.get('/health/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const summary = performanceService.getPerformanceSummary(deviceId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: `No performance data found for device: ${deviceId}`
      });
    }

    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Deduct points for high resource usage
    if (summary.current.cpu > 80) healthScore -= (summary.current.cpu - 80) / 2;
    if (summary.current.memory > 85) healthScore -= (summary.current.memory - 85) / 1.5;
    if (summary.current.diskUsage > 90) healthScore -= (summary.current.diskUsage - 90);

    // Deduct points for critical/high priority recommendations
    healthScore -= summary.recommendations.critical * 10;
    healthScore -= summary.recommendations.high * 5;

    healthScore = Math.max(0, Math.round(healthScore));

    // Determine status
    let status = 'excellent';
    if (healthScore < 60) status = 'poor';
    else if (healthScore < 75) status = 'fair';
    else if (healthScore < 90) status = 'good';

    const health = {
      deviceId,
      healthScore,
      status,
      lastChecked: summary.lastUpdated,
      issues: {
        critical: summary.recommendations.critical,
        high: summary.recommendations.high,
        performance: {
          cpu: summary.current.cpu > 80 ? 'high' : summary.current.cpu > 60 ? 'medium' : 'normal',
          memory: summary.current.memory > 85 ? 'high' : summary.current.memory > 70 ? 'medium' : 'normal',
          disk: summary.current.diskUsage > 90 ? 'high' : summary.current.diskUsage > 75 ? 'medium' : 'normal'
        }
      },
      trends: summary.trends,
      nextOptimization: summary.optimization.lastOptimization
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting device health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device health',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
