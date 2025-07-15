/**
 * 📊 Advanced Analytics Service
 * Implements predictive analytics, anomaly detection, and intelligent insights
 */

import { DatabaseService } from '../DatabaseService';
import { logger } from '../../utils/logger';

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metadata?: any;
}

export interface TimeSeriesData {
  metric: string;
  server_id: string;
  data_points: MetricDataPoint[];
}

export interface AnomalyDetectionResult {
  is_anomaly: boolean;
  anomaly_score: number;
  expected_value: number;
  actual_value: number;
  confidence: number;
  anomaly_type: 'spike' | 'drop' | 'trend_change' | 'seasonal_deviation';
  timestamp: Date;
  metadata?: any;
}

export interface PredictionResult {
  metric: string;
  server_id: string;
  predicted_values: Array<{
    timestamp: Date;
    value: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
  }>;
  model_accuracy: number;
  prediction_horizon_hours: number;
}

export interface TrendAnalysis {
  metric: string;
  server_id: string;
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trend_strength: number; // 0-1
  seasonal_patterns: Array<{
    period: 'hourly' | 'daily' | 'weekly' | 'monthly';
    strength: number;
    peak_times: string[];
  }>;
  change_points: Array<{
    timestamp: Date;
    significance: number;
    description: string;
  }>;
}

export interface CorrelationAnalysis {
  metric_pairs: Array<{
    metric1: string;
    metric2: string;
    correlation_coefficient: number;
    p_value: number;
    relationship_type: 'positive' | 'negative' | 'none';
    lag_minutes?: number;
  }>;
  server_id: string;
  analysis_period: {
    start: Date;
    end: Date;
  };
}

export interface CapacityForecast {
  server_id: string;
  resource_type: 'cpu' | 'memory' | 'disk' | 'network';
  current_utilization: number;
  forecasted_utilization: Array<{
    timestamp: Date;
    utilization: number;
    confidence: number;
  }>;
  capacity_exhaustion_date?: Date;
  recommended_actions: string[];
}

export class AdvancedAnalyticsService {
  private static instance: AdvancedAnalyticsService;
  private analysisCache: Map<string, any> = new Map();
  private modelCache: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): AdvancedAnalyticsService {
    if (!AdvancedAnalyticsService.instance) {
      AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
    }
    return AdvancedAnalyticsService.instance;
  }

  /**
   * Detect anomalies in time series data using statistical methods
   */
  async detectAnomalies(
    timeSeriesData: TimeSeriesData,
    options: {
      sensitivity?: number;
      window_size?: number;
      method?: 'zscore' | 'iqr' | 'isolation_forest' | 'lstm';
    } = {}
  ): Promise<AnomalyDetectionResult[]> {
    try {
      const { sensitivity = 0.95, window_size = 50, method = 'zscore' } = options;
      const anomalies: AnomalyDetectionResult[] = [];

      if (timeSeriesData.data_points.length < window_size) {
        logger.warn(`Insufficient data points for anomaly detection: ${timeSeriesData.data_points.length}`);
        return anomalies;
      }

      switch (method) {
        case 'zscore':
          return this.detectAnomaliesZScore(timeSeriesData, sensitivity, window_size);
        case 'iqr':
          return this.detectAnomaliesIQR(timeSeriesData, sensitivity, window_size);
        case 'isolation_forest':
          return this.detectAnomaliesIsolationForest(timeSeriesData, sensitivity);
        case 'lstm':
          return this.detectAnomaliesLSTM(timeSeriesData, sensitivity);
        default:
          throw new Error(`Unknown anomaly detection method: ${method}`);
      }
    } catch (error) {
      logger.error('Error in anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Generate predictions for future metric values
   */
  async generatePredictions(
    timeSeriesData: TimeSeriesData,
    horizonHours: number = 24,
    options: {
      model_type?: 'linear' | 'arima' | 'lstm' | 'prophet';
      confidence_level?: number;
    } = {}
  ): Promise<PredictionResult> {
    try {
      const { model_type = 'linear', confidence_level = 0.95 } = options;

      // Check cache first
      const cacheKey = `prediction_${timeSeriesData.metric}_${timeSeriesData.server_id}_${horizonHours}_${model_type}`;
      if (this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
          return cached.result;
        }
      }

      let prediction: PredictionResult;

      switch (model_type) {
        case 'linear':
          prediction = await this.generateLinearPrediction(timeSeriesData, horizonHours, confidence_level);
          break;
        case 'arima':
          prediction = await this.generateARIMAPrediction(timeSeriesData, horizonHours, confidence_level);
          break;
        case 'lstm':
          prediction = await this.generateLSTMPrediction(timeSeriesData, horizonHours, confidence_level);
          break;
        case 'prophet':
          prediction = await this.generateProphetPrediction(timeSeriesData, horizonHours, confidence_level);
          break;
        default:
          throw new Error(`Unknown prediction model: ${model_type}`);
      }

      // Cache the result
      this.analysisCache.set(cacheKey, {
        result: prediction,
        timestamp: Date.now()
      });

      return prediction;
    } catch (error) {
      logger.error('Error in prediction generation:', error);
      throw error;
    }
  }

  /**
   * Analyze trends and seasonal patterns in time series data
   */
  async analyzeTrends(timeSeriesData: TimeSeriesData): Promise<TrendAnalysis> {
    try {
      const dataPoints = timeSeriesData.data_points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Calculate trend direction and strength
      const trendAnalysis = this.calculateTrend(dataPoints);
      
      // Detect seasonal patterns
      const seasonalPatterns = this.detectSeasonalPatterns(dataPoints);
      
      // Find change points
      const changePoints = this.detectChangePoints(dataPoints);

      return {
        metric: timeSeriesData.metric,
        server_id: timeSeriesData.server_id,
        trend_direction: trendAnalysis.direction,
        trend_strength: trendAnalysis.strength,
        seasonal_patterns: seasonalPatterns,
        change_points: changePoints
      };
    } catch (error) {
      logger.error('Error in trend analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze correlations between different metrics
   */
  async analyzeCorrelations(
    metricsData: TimeSeriesData[],
    serverId: string,
    maxLagMinutes: number = 60
  ): Promise<CorrelationAnalysis> {
    try {
      const correlationPairs: CorrelationAnalysis['metric_pairs'] = [];
      
      // Calculate correlations between all metric pairs
      for (let i = 0; i < metricsData.length; i++) {
        for (let j = i + 1; j < metricsData.length; j++) {
          const metric1 = metricsData[i];
          const metric2 = metricsData[j];
          
          const correlation = await this.calculateCorrelation(metric1, metric2, maxLagMinutes);
          correlationPairs.push(correlation);
        }
      }

      const analysisStart = new Date(Math.min(...metricsData.flatMap(m => m.data_points.map(p => p.timestamp.getTime()))));
      const analysisEnd = new Date(Math.max(...metricsData.flatMap(m => m.data_points.map(p => p.timestamp.getTime()))));

      return {
        metric_pairs: correlationPairs,
        server_id: serverId,
        analysis_period: {
          start: analysisStart,
          end: analysisEnd
        }
      };
    } catch (error) {
      logger.error('Error in correlation analysis:', error);
      throw error;
    }
  }

  /**
   * Generate capacity forecasts for resource planning
   */
  async generateCapacityForecast(
    serverId: string,
    resourceType: 'cpu' | 'memory' | 'disk' | 'network',
    forecastDays: number = 30
  ): Promise<CapacityForecast> {
    try {
      // Get historical data for the resource
      const historicalData = await this.getHistoricalResourceData(serverId, resourceType, 90); // 90 days of history
      
      if (historicalData.data_points.length === 0) {
        throw new Error(`No historical data available for ${resourceType} on server ${serverId}`);
      }

      // Calculate current utilization
      const recentData = historicalData.data_points.slice(-24); // Last 24 hours
      const currentUtilization = recentData.reduce((sum, point) => sum + point.value, 0) / recentData.length;

      // Generate forecast
      const prediction = await this.generatePredictions(historicalData, forecastDays * 24, {
        model_type: 'prophet',
        confidence_level: 0.90
      });

      // Calculate capacity exhaustion date
      const capacityThreshold = this.getCapacityThreshold(resourceType);
      const exhaustionDate = this.calculateCapacityExhaustionDate(prediction, capacityThreshold);

      // Generate recommendations
      const recommendations = this.generateCapacityRecommendations(
        resourceType,
        currentUtilization,
        prediction,
        exhaustionDate
      );

      return {
        server_id: serverId,
        resource_type: resourceType,
        current_utilization: currentUtilization,
        forecasted_utilization: prediction.predicted_values.map(p => ({
          timestamp: p.timestamp,
          utilization: p.value,
          confidence: (p.confidence_interval.upper - p.confidence_interval.lower) / (2 * p.value)
        })),
        capacity_exhaustion_date: exhaustionDate,
        recommended_actions: recommendations
      };
    } catch (error) {
      logger.error('Error in capacity forecasting:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent insights from analytics results
   */
  async generateInsights(serverId: string, timeRange: { start: Date; end: Date }): Promise<{
    insights: Array<{
      type: 'anomaly' | 'trend' | 'correlation' | 'capacity' | 'performance';
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      recommendations: string[];
      confidence: number;
      metadata: any;
    }>;
    summary: {
      total_insights: number;
      critical_issues: number;
      performance_score: number;
      health_trend: 'improving' | 'stable' | 'degrading';
    };
  }> {
    try {
      const insights: any[] = [];

      // Get all metrics for the server
      const metricsData = await this.getAllMetricsForServer(serverId, timeRange);

      // Analyze each metric for anomalies and trends
      for (const metricData of metricsData) {
        // Anomaly detection
        const anomalies = await this.detectAnomalies(metricData, { sensitivity: 0.95 });
        for (const anomaly of anomalies) {
          if (anomaly.anomaly_score > 0.8) {
            insights.push({
              type: 'anomaly',
              severity: anomaly.anomaly_score > 0.95 ? 'critical' : 'high',
              title: `Anomaly detected in ${metricData.metric}`,
              description: `Unusual ${anomaly.anomaly_type} detected with ${(anomaly.anomaly_score * 100).toFixed(1)}% confidence`,
              recommendations: this.getAnomalyRecommendations(metricData.metric, anomaly),
              confidence: anomaly.confidence,
              metadata: { anomaly, metric: metricData.metric }
            });
          }
        }

        // Trend analysis
        const trendAnalysis = await this.analyzeTrends(metricData);
        if (trendAnalysis.trend_strength > 0.7) {
          const severity = this.getTrendSeverity(metricData.metric, trendAnalysis);
          if (severity !== 'low') {
            insights.push({
              type: 'trend',
              severity,
              title: `${trendAnalysis.trend_direction} trend in ${metricData.metric}`,
              description: `Strong ${trendAnalysis.trend_direction} trend detected with ${(trendAnalysis.trend_strength * 100).toFixed(1)}% strength`,
              recommendations: this.getTrendRecommendations(metricData.metric, trendAnalysis),
              confidence: trendAnalysis.trend_strength,
              metadata: { trend: trendAnalysis, metric: metricData.metric }
            });
          }
        }
      }

      // Correlation analysis
      const correlations = await this.analyzeCorrelations(metricsData, serverId);
      for (const pair of correlations.metric_pairs) {
        if (Math.abs(pair.correlation_coefficient) > 0.8 && pair.p_value < 0.05) {
          insights.push({
            type: 'correlation',
            severity: 'medium',
            title: `Strong correlation between ${pair.metric1} and ${pair.metric2}`,
            description: `${pair.relationship_type} correlation (${(pair.correlation_coefficient * 100).toFixed(1)}%) detected`,
            recommendations: this.getCorrelationRecommendations(pair),
            confidence: 1 - pair.p_value,
            metadata: { correlation: pair }
          });
        }
      }

      // Capacity forecasting
      const resourceTypes: Array<'cpu' | 'memory' | 'disk' | 'network'> = ['cpu', 'memory', 'disk', 'network'];
      for (const resourceType of resourceTypes) {
        try {
          const forecast = await this.generateCapacityForecast(serverId, resourceType);
          if (forecast.capacity_exhaustion_date && forecast.capacity_exhaustion_date < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            insights.push({
              type: 'capacity',
              severity: 'high',
              title: `${resourceType.toUpperCase()} capacity warning`,
              description: `Capacity exhaustion predicted for ${forecast.capacity_exhaustion_date.toDateString()}`,
              recommendations: forecast.recommended_actions,
              confidence: 0.85,
              metadata: { forecast, resource_type: resourceType }
            });
          }
        } catch (error) {
          logger.warn(`Failed to generate capacity forecast for ${resourceType}:`, error);
        }
      }

      // Calculate summary
      const criticalIssues = insights.filter(i => i.severity === 'critical').length;
      const performanceScore = this.calculatePerformanceScore(insights, metricsData);
      const healthTrend = this.calculateHealthTrend(metricsData);

      return {
        insights: insights.sort((a, b) => {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        }),
        summary: {
          total_insights: insights.length,
          critical_issues: criticalIssues,
          performance_score: performanceScore,
          health_trend: healthTrend
        }
      };
    } catch (error) {
      logger.error('Error generating insights:', error);
      throw error;
    }
  }

  // Private helper methods would be implemented here
  private async detectAnomaliesZScore(data: TimeSeriesData, sensitivity: number, windowSize: number): Promise<AnomalyDetectionResult[]> {
    // Z-score based anomaly detection implementation
    const anomalies: AnomalyDetectionResult[] = [];
    const values = data.data_points.map(p => p.value);
    
    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const std = Math.sqrt(window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length);
      
      const zScore = Math.abs((values[i] - mean) / std);
      const threshold = this.getZScoreThreshold(sensitivity);
      
      if (zScore > threshold) {
        anomalies.push({
          is_anomaly: true,
          anomaly_score: Math.min(zScore / threshold, 1),
          expected_value: mean,
          actual_value: values[i],
          confidence: sensitivity,
          anomaly_type: values[i] > mean ? 'spike' : 'drop',
          timestamp: data.data_points[i].timestamp
        });
      }
    }
    
    return anomalies;
  }

  private getZScoreThreshold(sensitivity: number): number {
    // Convert sensitivity to z-score threshold
    const thresholds = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
      0.999: 3.291
    };
    
    return thresholds[sensitivity] || 2.0;
  }

  // Additional private methods would be implemented here...
  private async detectAnomaliesIQR(data: TimeSeriesData, sensitivity: number, windowSize: number): Promise<AnomalyDetectionResult[]> {
    // IQR-based anomaly detection - placeholder implementation
    return [];
  }

  private async detectAnomaliesIsolationForest(data: TimeSeriesData, sensitivity: number): Promise<AnomalyDetectionResult[]> {
    // Isolation Forest anomaly detection - placeholder implementation
    return [];
  }

  private async detectAnomaliesLSTM(data: TimeSeriesData, sensitivity: number): Promise<AnomalyDetectionResult[]> {
    // LSTM-based anomaly detection - placeholder implementation
    return [];
  }

  private async generateLinearPrediction(data: TimeSeriesData, horizonHours: number, confidence: number): Promise<PredictionResult> {
    // Linear regression prediction - placeholder implementation
    return {
      metric: data.metric,
      server_id: data.server_id,
      predicted_values: [],
      model_accuracy: 0.8,
      prediction_horizon_hours: horizonHours
    };
  }

  private async generateARIMAPrediction(data: TimeSeriesData, horizonHours: number, confidence: number): Promise<PredictionResult> {
    // ARIMA prediction - placeholder implementation
    return {
      metric: data.metric,
      server_id: data.server_id,
      predicted_values: [],
      model_accuracy: 0.85,
      prediction_horizon_hours: horizonHours
    };
  }

  private async generateLSTMPrediction(data: TimeSeriesData, horizonHours: number, confidence: number): Promise<PredictionResult> {
    // LSTM prediction - placeholder implementation
    return {
      metric: data.metric,
      server_id: data.server_id,
      predicted_values: [],
      model_accuracy: 0.9,
      prediction_horizon_hours: horizonHours
    };
  }

  private async generateProphetPrediction(data: TimeSeriesData, horizonHours: number, confidence: number): Promise<PredictionResult> {
    // Prophet prediction - placeholder implementation
    return {
      metric: data.metric,
      server_id: data.server_id,
      predicted_values: [],
      model_accuracy: 0.88,
      prediction_horizon_hours: horizonHours
    };
  }

  private calculateTrend(dataPoints: MetricDataPoint[]): { direction: TrendAnalysis['trend_direction']; strength: number } {
    // Simple linear regression for trend calculation
    const n = dataPoints.length;
    const x = dataPoints.map((_, i) => i);
    const y = dataPoints.map(p => p.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = this.calculateCorrelationCoefficient(x, y);
    
    let direction: TrendAnalysis['trend_direction'];
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    return {
      direction,
      strength: Math.abs(correlation)
    };
  }

  private calculateCorrelationCoefficient(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private detectSeasonalPatterns(dataPoints: MetricDataPoint[]): TrendAnalysis['seasonal_patterns'] {
    // Placeholder implementation for seasonal pattern detection
    return [];
  }

  private detectChangePoints(dataPoints: MetricDataPoint[]): TrendAnalysis['change_points'] {
    // Placeholder implementation for change point detection
    return [];
  }

  private async calculateCorrelation(metric1: TimeSeriesData, metric2: TimeSeriesData, maxLagMinutes: number): Promise<CorrelationAnalysis['metric_pairs'][0]> {
    // Placeholder implementation for correlation calculation
    return {
      metric1: metric1.metric,
      metric2: metric2.metric,
      correlation_coefficient: 0,
      p_value: 1,
      relationship_type: 'none'
    };
  }

  private async getHistoricalResourceData(serverId: string, resourceType: string, days: number): Promise<TimeSeriesData> {
    // Placeholder implementation to get historical data from database
    return {
      metric: resourceType,
      server_id: serverId,
      data_points: []
    };
  }

  private getCapacityThreshold(resourceType: string): number {
    const thresholds = {
      cpu: 90,
      memory: 85,
      disk: 90,
      network: 80
    };
    return thresholds[resourceType] || 90;
  }

  private calculateCapacityExhaustionDate(prediction: PredictionResult, threshold: number): Date | undefined {
    // Find when predicted values exceed threshold
    for (const point of prediction.predicted_values) {
      if (point.value > threshold) {
        return point.timestamp;
      }
    }
    return undefined;
  }

  private generateCapacityRecommendations(resourceType: string, currentUtilization: number, prediction: PredictionResult, exhaustionDate?: Date): string[] {
    const recommendations: string[] = [];
    
    if (exhaustionDate) {
      recommendations.push(`Immediate action required: ${resourceType} capacity will be exhausted by ${exhaustionDate.toDateString()}`);
    }
    
    if (currentUtilization > 80) {
      recommendations.push(`Consider scaling up ${resourceType} resources`);
    }
    
    return recommendations;
  }

  private async getAllMetricsForServer(serverId: string, timeRange: { start: Date; end: Date }): Promise<TimeSeriesData[]> {
    // Placeholder implementation to get all metrics for a server
    return [];
  }

  private getAnomalyRecommendations(metric: string, anomaly: AnomalyDetectionResult): string[] {
    // Generate recommendations based on anomaly type and metric
    return [`Investigate ${metric} anomaly`, 'Check system logs', 'Monitor related metrics'];
  }

  private getTrendSeverity(metric: string, trend: TrendAnalysis): 'low' | 'medium' | 'high' | 'critical' {
    // Determine severity based on metric type and trend
    if (trend.trend_strength > 0.9) return 'high';
    if (trend.trend_strength > 0.8) return 'medium';
    return 'low';
  }

  private getTrendRecommendations(metric: string, trend: TrendAnalysis): string[] {
    // Generate recommendations based on trend analysis
    return [`Monitor ${metric} trend`, 'Consider capacity planning', 'Review system configuration'];
  }

  private getCorrelationRecommendations(pair: CorrelationAnalysis['metric_pairs'][0]): string[] {
    // Generate recommendations based on correlation
    return [`Monitor relationship between ${pair.metric1} and ${pair.metric2}`, 'Consider joint optimization'];
  }

  private calculatePerformanceScore(insights: any[], metricsData: TimeSeriesData[]): number {
    // Calculate overall performance score based on insights and metrics
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    const highCount = insights.filter(i => i.severity === 'high').length;
    
    let score = 100;
    score -= criticalCount * 20;
    score -= highCount * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateHealthTrend(metricsData: TimeSeriesData[]): 'improving' | 'stable' | 'degrading' {
    // Calculate overall health trend based on metrics
    return 'stable'; // Placeholder implementation
  }
}
