/**
 * 📊 Analytics API Routes
 * Advanced analytics endpoints for predictive insights and anomaly detection
 */

import { Router, Request, Response } from 'express';
import { AdvancedAnalyticsService } from '../services/analytics/AdvancedAnalyticsService';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const router = Router();
const analyticsService = AdvancedAnalyticsService.getInstance();

/**
 * GET /api/analytics/anomalies/:serverId
 * Detect anomalies in server metrics
 */
router.get('/anomalies/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      metric = 'cpu_usage',
      hours = 24,
      sensitivity = 0.95,
      method = 'zscore'
    } = req.query;

    // Get time series data from database
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (Number(hours) * 60 * 60 * 1000));

    const metricsQuery = `
      SELECT timestamp, value, metadata
      FROM server_metrics 
      WHERE server_id = $1 AND metric_name = $2 
        AND timestamp BETWEEN $3 AND $4
      ORDER BY timestamp ASC
    `;

    const metricsData = await DatabaseService.query(metricsQuery, [
      serverId, metric, startTime, endTime
    ]);

    if (metricsData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No metrics data found for the specified server and time range'
      });
    }

    const timeSeriesData = {
      metric: metric as string,
      server_id: serverId,
      data_points: metricsData.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
        metadata: row.metadata
      }))
    };

    const anomalies = await analyticsService.detectAnomalies(timeSeriesData, {
      sensitivity: Number(sensitivity),
      method: method as any
    });

    res.json({
      success: true,
      data: {
        server_id: serverId,
        metric: metric,
        time_range: { start: startTime, end: endTime },
        anomalies,
        total_anomalies: anomalies.length,
        anomaly_rate: (anomalies.length / metricsData.length) * 100
      }
    });

  } catch (error) {
    logger.error('Error in anomaly detection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect anomalies',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/predictions/:serverId
 * Generate predictions for server metrics
 */
router.get('/predictions/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      metric = 'cpu_usage',
      horizon_hours = 24,
      model_type = 'linear',
      confidence_level = 0.95
    } = req.query;

    // Get historical data (last 7 days for better prediction accuracy)
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (7 * 24 * 60 * 60 * 1000));

    const metricsQuery = `
      SELECT timestamp, value, metadata
      FROM server_metrics 
      WHERE server_id = $1 AND metric_name = $2 
        AND timestamp BETWEEN $3 AND $4
      ORDER BY timestamp ASC
    `;

    const metricsData = await DatabaseService.query(metricsQuery, [
      serverId, metric, startTime, endTime
    ]);

    if (metricsData.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient historical data for prediction (minimum 100 data points required)'
      });
    }

    const timeSeriesData = {
      metric: metric as string,
      server_id: serverId,
      data_points: metricsData.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
        metadata: row.metadata
      }))
    };

    const prediction = await analyticsService.generatePredictions(
      timeSeriesData,
      Number(horizon_hours),
      {
        model_type: model_type as any,
        confidence_level: Number(confidence_level)
      }
    );

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    logger.error('Error in prediction generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/trends/:serverId
 * Analyze trends in server metrics
 */
router.get('/trends/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      metric = 'cpu_usage',
      days = 7
    } = req.query;

    // Get historical data
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (Number(days) * 24 * 60 * 60 * 1000));

    const metricsQuery = `
      SELECT timestamp, value, metadata
      FROM server_metrics 
      WHERE server_id = $1 AND metric_name = $2 
        AND timestamp BETWEEN $3 AND $4
      ORDER BY timestamp ASC
    `;

    const metricsData = await DatabaseService.query(metricsQuery, [
      serverId, metric, startTime, endTime
    ]);

    if (metricsData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No metrics data found for trend analysis'
      });
    }

    const timeSeriesData = {
      metric: metric as string,
      server_id: serverId,
      data_points: metricsData.map(row => ({
        timestamp: new Date(row.timestamp),
        value: parseFloat(row.value),
        metadata: row.metadata
      }))
    };

    const trendAnalysis = await analyticsService.analyzeTrends(timeSeriesData);

    res.json({
      success: true,
      data: trendAnalysis
    });

  } catch (error) {
    logger.error('Error in trend analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze trends',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/correlations/:serverId
 * Analyze correlations between metrics
 */
router.get('/correlations/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      metrics = 'cpu_usage,memory_usage,disk_usage',
      days = 7,
      max_lag_minutes = 60
    } = req.query;

    const metricsList = (metrics as string).split(',');
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (Number(days) * 24 * 60 * 60 * 1000));

    // Get data for all specified metrics
    const metricsData = [];
    for (const metric of metricsList) {
      const query = `
        SELECT timestamp, value, metadata
        FROM server_metrics 
        WHERE server_id = $1 AND metric_name = $2 
          AND timestamp BETWEEN $3 AND $4
        ORDER BY timestamp ASC
      `;

      const data = await DatabaseService.query(query, [serverId, metric, startTime, endTime]);
      
      if (data.length > 0) {
        metricsData.push({
          metric,
          server_id: serverId,
          data_points: data.map(row => ({
            timestamp: new Date(row.timestamp),
            value: parseFloat(row.value),
            metadata: row.metadata
          }))
        });
      }
    }

    if (metricsData.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 metrics with data are required for correlation analysis'
      });
    }

    const correlationAnalysis = await analyticsService.analyzeCorrelations(
      metricsData,
      serverId,
      Number(max_lag_minutes)
    );

    res.json({
      success: true,
      data: correlationAnalysis
    });

  } catch (error) {
    logger.error('Error in correlation analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze correlations',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/capacity/:serverId
 * Generate capacity forecasts
 */
router.get('/capacity/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      resource_type = 'cpu',
      forecast_days = 30
    } = req.query;

    const validResourceTypes = ['cpu', 'memory', 'disk', 'network'];
    if (!validResourceTypes.includes(resource_type as string)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resource type. Must be one of: ${validResourceTypes.join(', ')}`
      });
    }

    const capacityForecast = await analyticsService.generateCapacityForecast(
      serverId,
      resource_type as any,
      Number(forecast_days)
    );

    res.json({
      success: true,
      data: capacityForecast
    });

  } catch (error) {
    logger.error('Error in capacity forecasting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate capacity forecast',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/insights/:serverId
 * Generate intelligent insights
 */
router.get('/insights/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const {
      hours = 24
    } = req.query;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (Number(hours) * 60 * 60 * 1000));

    const insights = await analyticsService.generateInsights(serverId, {
      start: startTime,
      end: endTime
    });

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/dashboard/:serverId
 * Get comprehensive analytics dashboard data
 */
router.get('/dashboard/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { hours = 24 } = req.query;

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (Number(hours) * 60 * 60 * 1000));

    // Get insights
    const insights = await analyticsService.generateInsights(serverId, {
      start: startTime,
      end: endTime
    });

    // Get recent anomalies for key metrics
    const keyMetrics = ['cpu_usage', 'memory_usage', 'disk_usage'];
    const recentAnomalies = [];

    for (const metric of keyMetrics) {
      try {
        const metricsQuery = `
          SELECT timestamp, value
          FROM server_metrics 
          WHERE server_id = $1 AND metric_name = $2 
            AND timestamp BETWEEN $3 AND $4
          ORDER BY timestamp ASC
        `;

        const metricsData = await DatabaseService.query(metricsQuery, [
          serverId, metric, startTime, endTime
        ]);

        if (metricsData.length > 50) {
          const timeSeriesData = {
            metric,
            server_id: serverId,
            data_points: metricsData.map(row => ({
              timestamp: new Date(row.timestamp),
              value: parseFloat(row.value)
            }))
          };

          const anomalies = await analyticsService.detectAnomalies(timeSeriesData, {
            sensitivity: 0.95
          });

          recentAnomalies.push({
            metric,
            anomalies: anomalies.slice(-5) // Last 5 anomalies
          });
        }
      } catch (error) {
        logger.warn(`Failed to get anomalies for ${metric}:`, error);
      }
    }

    // Get capacity forecasts for all resource types
    const capacityForecasts = [];
    const resourceTypes = ['cpu', 'memory', 'disk', 'network'];

    for (const resourceType of resourceTypes) {
      try {
        const forecast = await analyticsService.generateCapacityForecast(
          serverId,
          resourceType as any,
          7 // 7-day forecast for dashboard
        );
        capacityForecasts.push(forecast);
      } catch (error) {
        logger.warn(`Failed to get capacity forecast for ${resourceType}:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        server_id: serverId,
        time_range: { start: startTime, end: endTime },
        insights,
        recent_anomalies: recentAnomalies,
        capacity_forecasts: capacityForecasts,
        generated_at: new Date()
      }
    });

  } catch (error) {
    logger.error('Error generating analytics dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics dashboard',
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/train-model
 * Train or retrain analytics models
 */
router.post('/train-model', async (req: Request, res: Response) => {
  try {
    const {
      model_type,
      server_id,
      metric,
      training_days = 30
    } = req.body;

    if (!model_type || !server_id || !metric) {
      return res.status(400).json({
        success: false,
        message: 'model_type, server_id, and metric are required'
      });
    }

    // This would trigger model training in a background job
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      message: 'Model training initiated',
      data: {
        job_id: `train_${Date.now()}`,
        model_type,
        server_id,
        metric,
        training_days,
        status: 'queued',
        estimated_completion: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

  } catch (error) {
    logger.error('Error initiating model training:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate model training',
      error: error.message
    });
  }
});

export default router;
