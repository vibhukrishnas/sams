/**
 * 🧪 Advanced Analytics Service Test Suite
 * Comprehensive tests for predictive analytics and anomaly detection
 */

import { AdvancedAnalyticsService, TimeSeriesData, MetricDataPoint } from '../../services/analytics/AdvancedAnalyticsService';

describe('AdvancedAnalyticsService', () => {
  let analyticsService: AdvancedAnalyticsService;

  beforeEach(() => {
    analyticsService = AdvancedAnalyticsService.getInstance();
  });

  // Helper function to generate test data
  const generateTestData = (
    metric: string,
    serverId: string,
    dataPoints: number,
    baseValue: number = 50,
    variance: number = 10,
    anomalyIndices: number[] = []
  ): TimeSeriesData => {
    const data: MetricDataPoint[] = [];
    const startTime = new Date(Date.now() - dataPoints * 60 * 1000); // 1 minute intervals

    for (let i = 0; i < dataPoints; i++) {
      let value = baseValue + (Math.random() - 0.5) * variance;
      
      // Inject anomalies at specified indices
      if (anomalyIndices.includes(i)) {
        value = baseValue + (Math.random() > 0.5 ? 1 : -1) * variance * 5; // 5x variance for anomalies
      }

      data.push({
        timestamp: new Date(startTime.getTime() + i * 60 * 1000),
        value,
        metadata: { index: i }
      });
    }

    return {
      metric,
      server_id: serverId,
      data_points: data
    };
  };

  describe('Anomaly Detection', () => {
    test('should detect anomalies using Z-score method', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 100, 50, 5, [80, 85, 90]);

      const anomalies = await analyticsService.detectAnomalies(testData, {
        method: 'zscore',
        sensitivity: 0.95,
        window_size: 20
      });

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0]).toHaveProperty('is_anomaly', true);
      expect(anomalies[0]).toHaveProperty('anomaly_score');
      expect(anomalies[0]).toHaveProperty('expected_value');
      expect(anomalies[0]).toHaveProperty('actual_value');
      expect(anomalies[0]).toHaveProperty('confidence');
      expect(anomalies[0]).toHaveProperty('anomaly_type');
      expect(anomalies[0]).toHaveProperty('timestamp');
    });

    test('should handle insufficient data gracefully', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 10); // Too few data points

      const anomalies = await analyticsService.detectAnomalies(testData, {
        method: 'zscore',
        window_size: 50
      });

      expect(anomalies).toEqual([]);
    });

    test('should classify anomaly types correctly', async () => {
      // Create data with a clear spike
      const testData = generateTestData('cpu_usage', 'server-1', 100, 50, 2, [80]);
      testData.data_points[80].value = 90; // Clear spike

      const anomalies = await analyticsService.detectAnomalies(testData, {
        method: 'zscore',
        sensitivity: 0.90
      });

      const spikeAnomaly = anomalies.find(a => a.anomaly_type === 'spike');
      expect(spikeAnomaly).toBeDefined();
      expect(spikeAnomaly?.actual_value).toBeGreaterThan(spikeAnomaly?.expected_value || 0);
    });

    test('should respect sensitivity parameter', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 100, 50, 5, [80, 85]);

      const highSensitivityAnomalies = await analyticsService.detectAnomalies(testData, {
        method: 'zscore',
        sensitivity: 0.99
      });

      const lowSensitivityAnomalies = await analyticsService.detectAnomalies(testData, {
        method: 'zscore',
        sensitivity: 0.90
      });

      expect(lowSensitivityAnomalies.length).toBeGreaterThanOrEqual(highSensitivityAnomalies.length);
    });
  });

  describe('Trend Analysis', () => {
    test('should detect increasing trend', async () => {
      // Generate data with clear increasing trend
      const data: MetricDataPoint[] = [];
      const startTime = new Date();
      
      for (let i = 0; i < 100; i++) {
        data.push({
          timestamp: new Date(startTime.getTime() + i * 60 * 1000),
          value: 50 + i * 0.5 + (Math.random() - 0.5) * 2, // Increasing trend with noise
        });
      }

      const testData: TimeSeriesData = {
        metric: 'cpu_usage',
        server_id: 'server-1',
        data_points: data
      };

      const trendAnalysis = await analyticsService.analyzeTrends(testData);

      expect(trendAnalysis.trend_direction).toBe('increasing');
      expect(trendAnalysis.trend_strength).toBeGreaterThan(0.5);
      expect(trendAnalysis.metric).toBe('cpu_usage');
      expect(trendAnalysis.server_id).toBe('server-1');
    });

    test('should detect stable trend', async () => {
      const testData = generateTestData('memory_usage', 'server-2', 100, 60, 2); // Low variance = stable

      const trendAnalysis = await analyticsService.analyzeTrends(testData);

      expect(trendAnalysis.trend_direction).toBe('stable');
      expect(trendAnalysis.trend_strength).toBeLessThan(0.3);
    });

    test('should detect decreasing trend', async () => {
      // Generate data with clear decreasing trend
      const data: MetricDataPoint[] = [];
      const startTime = new Date();
      
      for (let i = 0; i < 100; i++) {
        data.push({
          timestamp: new Date(startTime.getTime() + i * 60 * 1000),
          value: 80 - i * 0.3 + (Math.random() - 0.5) * 2, // Decreasing trend with noise
        });
      }

      const testData: TimeSeriesData = {
        metric: 'disk_usage',
        server_id: 'server-3',
        data_points: data
      };

      const trendAnalysis = await analyticsService.analyzeTrends(testData);

      expect(trendAnalysis.trend_direction).toBe('decreasing');
      expect(trendAnalysis.trend_strength).toBeGreaterThan(0.5);
    });
  });

  describe('Prediction Generation', () => {
    test('should generate linear predictions', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 200, 50, 5);

      const prediction = await analyticsService.generatePredictions(testData, 24, {
        model_type: 'linear',
        confidence_level: 0.95
      });

      expect(prediction.metric).toBe('cpu_usage');
      expect(prediction.server_id).toBe('server-1');
      expect(prediction.prediction_horizon_hours).toBe(24);
      expect(prediction.model_accuracy).toBeGreaterThan(0);
      expect(prediction.predicted_values).toBeDefined();
      expect(Array.isArray(prediction.predicted_values)).toBe(true);
    });

    test('should handle different model types', async () => {
      const testData = generateTestData('memory_usage', 'server-2', 200, 70, 8);

      const modelTypes = ['linear', 'arima', 'lstm', 'prophet'];
      
      for (const modelType of modelTypes) {
        const prediction = await analyticsService.generatePredictions(testData, 12, {
          model_type: modelType as any
        });

        expect(prediction.metric).toBe('memory_usage');
        expect(prediction.server_id).toBe('server-2');
        expect(prediction.prediction_horizon_hours).toBe(12);
      }
    });

    test('should cache prediction results', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 200, 50, 5);

      const startTime = Date.now();
      const prediction1 = await analyticsService.generatePredictions(testData, 24);
      const firstCallTime = Date.now() - startTime;

      const startTime2 = Date.now();
      const prediction2 = await analyticsService.generatePredictions(testData, 24);
      const secondCallTime = Date.now() - startTime2;

      // Second call should be faster due to caching
      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(prediction1.metric).toBe(prediction2.metric);
    });
  });

  describe('Correlation Analysis', () => {
    test('should analyze correlations between metrics', async () => {
      // Create correlated data
      const baseData = generateTestData('cpu_usage', 'server-1', 100, 50, 10);
      const correlatedData: TimeSeriesData = {
        metric: 'memory_usage',
        server_id: 'server-1',
        data_points: baseData.data_points.map(point => ({
          timestamp: point.timestamp,
          value: point.value * 0.8 + 20 + (Math.random() - 0.5) * 5, // Correlated with some noise
        }))
      };

      const correlationAnalysis = await analyticsService.analyzeCorrelations(
        [baseData, correlatedData],
        'server-1'
      );

      expect(correlationAnalysis.server_id).toBe('server-1');
      expect(correlationAnalysis.metric_pairs).toHaveLength(1);
      expect(correlationAnalysis.metric_pairs[0].metric1).toBe('cpu_usage');
      expect(correlationAnalysis.metric_pairs[0].metric2).toBe('memory_usage');
      expect(correlationAnalysis.analysis_period).toHaveProperty('start');
      expect(correlationAnalysis.analysis_period).toHaveProperty('end');
    });

    test('should handle multiple metrics', async () => {
      const metrics = ['cpu_usage', 'memory_usage', 'disk_usage', 'network_usage'];
      const metricsData = metrics.map(metric => 
        generateTestData(metric, 'server-1', 100, 50, 10)
      );

      const correlationAnalysis = await analyticsService.analyzeCorrelations(
        metricsData,
        'server-1'
      );

      // Should have n*(n-1)/2 pairs for n metrics
      const expectedPairs = (metrics.length * (metrics.length - 1)) / 2;
      expect(correlationAnalysis.metric_pairs).toHaveLength(expectedPairs);
    });
  });

  describe('Capacity Forecasting', () => {
    test('should generate capacity forecast for CPU', async () => {
      // Mock the getHistoricalResourceData method
      const originalMethod = (analyticsService as any).getHistoricalResourceData;
      (analyticsService as any).getHistoricalResourceData = jest.fn().mockResolvedValue(
        generateTestData('cpu_usage', 'server-1', 2000, 60, 10) // 90 days of data
      );

      const forecast = await analyticsService.generateCapacityForecast('server-1', 'cpu', 30);

      expect(forecast.server_id).toBe('server-1');
      expect(forecast.resource_type).toBe('cpu');
      expect(forecast.current_utilization).toBeGreaterThan(0);
      expect(Array.isArray(forecast.forecasted_utilization)).toBe(true);
      expect(Array.isArray(forecast.recommended_actions)).toBe(true);

      // Restore original method
      (analyticsService as any).getHistoricalResourceData = originalMethod;
    });

    test('should handle different resource types', async () => {
      const resourceTypes = ['cpu', 'memory', 'disk', 'network'];
      
      // Mock the method for all resource types
      (analyticsService as any).getHistoricalResourceData = jest.fn().mockResolvedValue(
        generateTestData('test_metric', 'server-1', 2000, 70, 15)
      );

      for (const resourceType of resourceTypes) {
        const forecast = await analyticsService.generateCapacityForecast(
          'server-1', 
          resourceType as any, 
          7
        );

        expect(forecast.resource_type).toBe(resourceType);
        expect(forecast.server_id).toBe('server-1');
      }
    });
  });

  describe('Insights Generation', () => {
    test('should generate comprehensive insights', async () => {
      // Mock the getAllMetricsForServer method
      (analyticsService as any).getAllMetricsForServer = jest.fn().mockResolvedValue([
        generateTestData('cpu_usage', 'server-1', 100, 85, 5, [80, 85]), // High CPU with anomalies
        generateTestData('memory_usage', 'server-1', 100, 90, 3), // High memory
        generateTestData('disk_usage', 'server-1', 100, 50, 10)
      ]);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const insights = await analyticsService.generateInsights('server-1', timeRange);

      expect(insights.insights).toBeDefined();
      expect(Array.isArray(insights.insights)).toBe(true);
      expect(insights.summary).toBeDefined();
      expect(insights.summary.total_insights).toBeGreaterThanOrEqual(0);
      expect(insights.summary.performance_score).toBeGreaterThanOrEqual(0);
      expect(insights.summary.performance_score).toBeLessThanOrEqual(100);
      expect(['improving', 'stable', 'degrading']).toContain(insights.summary.health_trend);
    });

    test('should prioritize insights by severity', async () => {
      (analyticsService as any).getAllMetricsForServer = jest.fn().mockResolvedValue([
        generateTestData('cpu_usage', 'server-1', 100, 95, 2, [80, 85, 90]) // Critical CPU
      ]);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const insights = await analyticsService.generateInsights('server-1', timeRange);

      if (insights.insights.length > 1) {
        // Check that insights are sorted by severity (critical first)
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        for (let i = 0; i < insights.insights.length - 1; i++) {
          const currentSeverity = severityOrder[insights.insights[i].severity];
          const nextSeverity = severityOrder[insights.insights[i + 1].severity];
          expect(currentSeverity).toBeGreaterThanOrEqual(nextSeverity);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle empty data gracefully', async () => {
      const emptyData: TimeSeriesData = {
        metric: 'cpu_usage',
        server_id: 'server-1',
        data_points: []
      };

      await expect(analyticsService.detectAnomalies(emptyData)).resolves.toEqual([]);
    });

    test('should handle invalid parameters', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 100);

      await expect(analyticsService.detectAnomalies(testData, {
        method: 'invalid_method' as any
      })).rejects.toThrow();
    });

    test('should handle network/database errors gracefully', async () => {
      // Mock a database error
      (analyticsService as any).getHistoricalResourceData = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(analyticsService.generateCapacityForecast('server-1', 'cpu'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', async () => {
      const largeDataset = generateTestData('cpu_usage', 'server-1', 10000, 50, 10);

      const startTime = Date.now();
      const anomalies = await analyticsService.detectAnomalies(largeDataset);
      const endTime = Date.now();

      // Should complete within reasonable time (5 seconds for 10k points)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(Array.isArray(anomalies)).toBe(true);
    });

    test('should cache results effectively', async () => {
      const testData = generateTestData('cpu_usage', 'server-1', 1000);

      // First call
      const start1 = Date.now();
      await analyticsService.generatePredictions(testData, 24);
      const time1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      await analyticsService.generatePredictions(testData, 24);
      const time2 = Date.now() - start2;

      expect(time2).toBeLessThan(time1 * 0.5); // Should be at least 50% faster
    });
  });

  describe('Integration', () => {
    test('should work with real-world data patterns', async () => {
      // Simulate real CPU usage pattern with daily cycles
      const data: MetricDataPoint[] = [];
      const startTime = new Date();
      
      for (let i = 0; i < 1440; i++) { // 24 hours of minute-by-minute data
        const hour = (i / 60) % 24;
        const baseLoad = 30 + 20 * Math.sin((hour - 6) * Math.PI / 12); // Daily cycle
        const noise = (Math.random() - 0.5) * 10;
        const value = Math.max(0, Math.min(100, baseLoad + noise));

        data.push({
          timestamp: new Date(startTime.getTime() + i * 60 * 1000),
          value
        });
      }

      const testData: TimeSeriesData = {
        metric: 'cpu_usage',
        server_id: 'server-1',
        data_points: data
      };

      // Test all major functions with realistic data
      const anomalies = await analyticsService.detectAnomalies(testData);
      const trends = await analyticsService.analyzeTrends(testData);
      const predictions = await analyticsService.generatePredictions(testData, 6);

      expect(anomalies).toBeDefined();
      expect(trends).toBeDefined();
      expect(predictions).toBeDefined();
      expect(trends.trend_direction).toBeDefined();
      expect(predictions.predicted_values.length).toBeGreaterThan(0);
    });
  });
});
