/**
 * 🔥 ENTERPRISE ML ANOMALY DETECTION SERVICE
 * Advanced machine learning for predictive alerting and anomaly detection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import infraService from './InfraService';
import timeSeriesService from './api/TimeSeriesService';

class MLAnomalyDetectionService {
  constructor() {
    this.models = new Map();
    this.trainingData = new Map();
    this.anomalyThresholds = {
      cpu: { warning: 80, critical: 95 },
      memory: { warning: 85, critical: 95 },
      disk: { warning: 85, critical: 95 },
      network: { warning: 90, critical: 98 }
    };
    this.predictionWindow = 30 * 60 * 1000; // 30 minutes
    this.trainingWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.anomalyScores = new Map();
    this.patterns = new Map();
    this.seasonalPatterns = new Map();
    this.isTraining = false;
    this.lastTrainingTime = null;
    this.minDataPoints = 100;
    
    this.initializeML();
  }

  /**
   * Initialize ML service
   */
  async initializeML() {
    try {
      console.log('🔥 MLAnomalyDetectionService: Initializing ML models...');
      
      // Load existing models
      await this.loadModels();
      
      // Load training data
      await this.loadTrainingData();
      
      // Start periodic training
      this.startPeriodicTraining();
      
      // Start real-time anomaly detection
      this.startAnomalyDetection();
      
      console.log('🔥 MLAnomalyDetectionService: ML models initialized successfully');
    } catch (error) {
      console.error('MLAnomalyDetectionService initialization error:', error);
    }
  }

  /**
   * Train anomaly detection models
   */
  async trainModels(serverId = null) {
    if (this.isTraining) {
      console.log('MLAnomalyDetectionService: Training already in progress');
      return;
    }
    
    try {
      this.isTraining = true;
      console.log('🔥 MLAnomalyDetectionService: Starting model training');
      
      const servers = serverId ? [infraService.getServer(serverId)] : infraService.getServers();
      
      for (const server of servers) {
        if (!server) continue;
        
        console.log(`Training models for server: ${server.name}`);
        
        // Get historical data
        const historicalData = await this.getHistoricalData(server.id);
        
        if (historicalData.length < this.minDataPoints) {
          console.log(`Insufficient data for server ${server.name}, skipping training`);
          continue;
        }
        
        // Train models for each metric
        const metrics = ['cpu', 'memory', 'disk', 'network'];
        
        for (const metric of metrics) {
          await this.trainMetricModel(server.id, metric, historicalData);
        }
        
        // Detect seasonal patterns
        await this.detectSeasonalPatterns(server.id, historicalData);
        
        // Train correlation models
        await this.trainCorrelationModel(server.id, historicalData);
      }
      
      // Save trained models
      await this.saveModels();
      
      this.lastTrainingTime = Date.now();
      await AsyncStorage.setItem('lastMLTrainingTime', this.lastTrainingTime.toString());
      
      console.log('MLAnomalyDetectionService: Model training completed');
    } catch (error) {
      console.error('MLAnomalyDetectionService: Training error', error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Train model for specific metric
   */
  async trainMetricModel(serverId, metric, historicalData) {
    try {
      const metricData = historicalData.map(point => ({
        timestamp: new Date(point.timestamp).getTime(),
        value: point.fields[metric] || 0
      })).filter(point => point.value !== undefined);
      
      if (metricData.length < this.minDataPoints) {
        return;
      }
      
      // Calculate statistical features
      const stats = this.calculateStatistics(metricData.map(p => p.value));
      
      // Detect trends
      const trend = this.detectTrend(metricData);
      
      // Calculate moving averages
      const movingAverages = this.calculateMovingAverages(metricData);
      
      // Detect outliers using IQR method
      const outliers = this.detectOutliers(metricData.map(p => p.value));
      
      // Create model
      const model = {
        serverId,
        metric,
        statistics: stats,
        trend,
        movingAverages,
        outliers,
        thresholds: this.calculateDynamicThresholds(metricData.map(p => p.value)),
        lastUpdated: Date.now(),
        dataPoints: metricData.length
      };
      
      // Store model
      const modelKey = `${serverId}_${metric}`;
      this.models.set(modelKey, model);
      
      console.log(`MLAnomalyDetectionService: Trained model for ${serverId}:${metric}`);
    } catch (error) {
      console.error('MLAnomalyDetectionService: Train metric model error', error);
    }
  }

  /**
   * Calculate statistical features
   */
  calculateStatistics(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    return {
      mean,
      median,
      stdDev,
      variance,
      min: Math.min(...values),
      max: Math.max(...values),
      q1,
      q3,
      iqr,
      skewness: this.calculateSkewness(values, mean, stdDev),
      kurtosis: this.calculateKurtosis(values, mean, stdDev)
    };
  }

  /**
   * Calculate skewness
   */
  calculateSkewness(values, mean, stdDev) {
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  /**
   * Calculate kurtosis
   */
  calculateKurtosis(values, mean, stdDev) {
    const n = values.length;
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  /**
   * Detect trend in data
   */
  detectTrend(data) {
    if (data.length < 2) return { slope: 0, direction: 'stable' };
    
    const n = data.length;
    const sumX = data.reduce((sum, point, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = data.reduce((sum, point, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let direction = 'stable';
    if (slope > 0.1) direction = 'increasing';
    else if (slope < -0.1) direction = 'decreasing';
    
    return { slope, direction };
  }

  /**
   * Calculate moving averages
   */
  calculateMovingAverages(data) {
    const windows = [5, 10, 20];
    const averages = {};
    
    for (const window of windows) {
      averages[`ma${window}`] = [];
      
      for (let i = window - 1; i < data.length; i++) {
        const slice = data.slice(i - window + 1, i + 1);
        const avg = slice.reduce((sum, point) => sum + point.value, 0) / window;
        averages[`ma${window}`].push(avg);
      }
    }
    
    return averages;
  }

  /**
   * Detect outliers using IQR method
   */
  detectOutliers(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const outliers = values.filter(val => val < lowerBound || val > upperBound);
    
    return {
      count: outliers.length,
      percentage: (outliers.length / values.length) * 100,
      lowerBound,
      upperBound,
      values: outliers
    };
  }

  /**
   * Calculate dynamic thresholds
   */
  calculateDynamicThresholds(values) {
    const stats = this.calculateStatistics(values);
    
    return {
      warning: Math.min(stats.mean + 2 * stats.stdDev, 90),
      critical: Math.min(stats.mean + 3 * stats.stdDev, 95),
      anomaly: stats.mean + 2.5 * stats.stdDev
    };
  }

  /**
   * Detect seasonal patterns
   */
  async detectSeasonalPatterns(serverId, historicalData) {
    try {
      const patterns = {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0),
        monthly: new Array(12).fill(0)
      };
      
      const counts = {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0),
        monthly: new Array(12).fill(0)
      };
      
      for (const point of historicalData) {
        const date = new Date(point.timestamp);
        const hour = date.getHours();
        const day = date.getDay();
        const month = date.getMonth();
        
        const avgValue = (point.fields.cpu + point.fields.memory + point.fields.disk) / 3;
        
        patterns.hourly[hour] += avgValue;
        counts.hourly[hour]++;
        
        patterns.daily[day] += avgValue;
        counts.daily[day]++;
        
        patterns.monthly[month] += avgValue;
        counts.monthly[month]++;
      }
      
      // Calculate averages
      for (let i = 0; i < 24; i++) {
        patterns.hourly[i] = counts.hourly[i] > 0 ? patterns.hourly[i] / counts.hourly[i] : 0;
      }
      
      for (let i = 0; i < 7; i++) {
        patterns.daily[i] = counts.daily[i] > 0 ? patterns.daily[i] / counts.daily[i] : 0;
      }
      
      for (let i = 0; i < 12; i++) {
        patterns.monthly[i] = counts.monthly[i] > 0 ? patterns.monthly[i] / counts.monthly[i] : 0;
      }
      
      this.seasonalPatterns.set(serverId, patterns);
      console.log(`MLAnomalyDetectionService: Detected seasonal patterns for ${serverId}`);
    } catch (error) {
      console.error('MLAnomalyDetectionService: Detect seasonal patterns error', error);
    }
  }

  /**
   * Train correlation model
   */
  async trainCorrelationModel(serverId, historicalData) {
    try {
      const metrics = ['cpu', 'memory', 'disk', 'network'];
      const correlations = {};
      
      for (let i = 0; i < metrics.length; i++) {
        for (let j = i + 1; j < metrics.length; j++) {
          const metric1 = metrics[i];
          const metric2 = metrics[j];
          
          const values1 = historicalData.map(p => p.fields[metric1]).filter(v => v !== undefined);
          const values2 = historicalData.map(p => p.fields[metric2]).filter(v => v !== undefined);
          
          if (values1.length === values2.length && values1.length > 0) {
            const correlation = this.calculateCorrelation(values1, values2);
            correlations[`${metric1}_${metric2}`] = correlation;
          }
        }
      }
      
      this.patterns.set(`${serverId}_correlations`, correlations);
      console.log(`MLAnomalyDetectionService: Trained correlation model for ${serverId}`);
    } catch (error) {
      console.error('MLAnomalyDetectionService: Train correlation model error', error);
    }
  }

  /**
   * Calculate correlation coefficient
   */
  calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Detect anomalies in real-time
   */
  async detectAnomalies(serverId, currentMetrics) {
    try {
      const anomalies = [];
      const metrics = ['cpu', 'memory', 'disk', 'network'];
      
      for (const metric of metrics) {
        const modelKey = `${serverId}_${metric}`;
        const model = this.models.get(modelKey);
        
        if (!model) continue;
        
        const currentValue = currentMetrics[metric];
        if (currentValue === undefined) continue;
        
        // Calculate anomaly score
        const anomalyScore = this.calculateAnomalyScore(model, currentValue);
        
        // Check if anomalous
        if (anomalyScore > 0.8) {
          anomalies.push({
            serverId,
            metric,
            value: currentValue,
            anomalyScore,
            severity: anomalyScore > 0.95 ? 'critical' : 'high',
            expectedRange: {
              min: model.statistics.mean - 2 * model.statistics.stdDev,
              max: model.statistics.mean + 2 * model.statistics.stdDev
            },
            timestamp: new Date().toISOString()
          });
        }
        
        // Store anomaly score
        this.anomalyScores.set(`${serverId}_${metric}`, anomalyScore);
      }
      
      // Check for correlation anomalies
      const correlationAnomalies = await this.detectCorrelationAnomalies(serverId, currentMetrics);
      anomalies.push(...correlationAnomalies);
      
      return anomalies;
    } catch (error) {
      console.error('MLAnomalyDetectionService: Detect anomalies error', error);
      return [];
    }
  }

  /**
   * Calculate anomaly score
   */
  calculateAnomalyScore(model, currentValue) {
    const { statistics } = model;
    
    // Z-score based anomaly detection
    const zScore = Math.abs((currentValue - statistics.mean) / statistics.stdDev);
    
    // Convert z-score to probability (0-1)
    const anomalyScore = Math.min(zScore / 3, 1);
    
    return anomalyScore;
  }

  /**
   * Detect correlation anomalies
   */
  async detectCorrelationAnomalies(serverId, currentMetrics) {
    try {
      const anomalies = [];
      const correlations = this.patterns.get(`${serverId}_correlations`);
      
      if (!correlations) return anomalies;
      
      for (const [pair, expectedCorrelation] of Object.entries(correlations)) {
        const [metric1, metric2] = pair.split('_');
        
        const value1 = currentMetrics[metric1];
        const value2 = currentMetrics[metric2];
        
        if (value1 === undefined || value2 === undefined) continue;
        
        // Check if correlation is broken
        const expectedValue2 = this.predictValueFromCorrelation(value1, expectedCorrelation);
        const deviation = Math.abs(value2 - expectedValue2) / expectedValue2;
        
        if (deviation > 0.3) { // 30% deviation threshold
          anomalies.push({
            serverId,
            type: 'correlation',
            metrics: [metric1, metric2],
            values: [value1, value2],
            expectedCorrelation,
            deviation,
            severity: deviation > 0.5 ? 'high' : 'medium',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      console.error('MLAnomalyDetectionService: Detect correlation anomalies error', error);
      return [];
    }
  }

  /**
   * Predict value from correlation
   */
  predictValueFromCorrelation(value1, correlation) {
    // Simplified prediction based on correlation
    return value1 * correlation;
  }

  /**
   * Predict future values
   */
  async predictFutureValues(serverId, metric, timeHorizon = 30) {
    try {
      const modelKey = `${serverId}_${metric}`;
      const model = this.models.get(modelKey);
      
      if (!model) {
        throw new Error('Model not found');
      }
      
      const predictions = [];
      const currentTime = Date.now();
      
      for (let i = 1; i <= timeHorizon; i++) {
        const futureTime = currentTime + (i * 60 * 1000); // i minutes in future
        const futureDate = new Date(futureTime);
        
        // Get seasonal adjustment
        const seasonalAdjustment = this.getSeasonalAdjustment(serverId, futureDate);
        
        // Simple trend-based prediction
        const trendAdjustment = model.trend.slope * i;
        
        // Base prediction on mean with adjustments
        const predictedValue = model.statistics.mean + trendAdjustment + seasonalAdjustment;
        
        // Add confidence interval
        const confidence = Math.max(0.5, 1 - (i / timeHorizon) * 0.5);
        const margin = model.statistics.stdDev * (1 - confidence);
        
        predictions.push({
          timestamp: futureTime,
          value: Math.max(0, Math.min(100, predictedValue)),
          confidence,
          range: {
            min: Math.max(0, predictedValue - margin),
            max: Math.min(100, predictedValue + margin)
          }
        });
      }
      
      return predictions;
    } catch (error) {
      console.error('MLAnomalyDetectionService: Predict future values error', error);
      return [];
    }
  }

  /**
   * Get seasonal adjustment
   */
  getSeasonalAdjustment(serverId, date) {
    const patterns = this.seasonalPatterns.get(serverId);
    if (!patterns) return 0;
    
    const hour = date.getHours();
    const day = date.getDay();
    
    const hourlyPattern = patterns.hourly[hour] || 0;
    const dailyPattern = patterns.daily[day] || 0;
    
    // Combine patterns with weights
    return (hourlyPattern * 0.7 + dailyPattern * 0.3) - 50; // Normalize around 0
  }

  /**
   * Get historical data
   */
  async getHistoricalData(serverId) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - this.trainingWindow);
      
      return await timeSeriesService.queryMetrics({
        measurement: 'server_metrics',
        tags: { server_id: serverId },
        fields: ['cpu', 'memory', 'disk', 'network'],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        limit: 10000
      });
    } catch (error) {
      console.error('MLAnomalyDetectionService: Get historical data error', error);
      return [];
    }
  }

  /**
   * Start periodic training
   */
  startPeriodicTraining() {
    // Retrain models every 24 hours
    setInterval(() => {
      this.trainModels();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Start real-time anomaly detection
   */
  startAnomalyDetection() {
    // Check for anomalies every 5 minutes
    setInterval(async () => {
      const servers = infraService.getServers();
      
      for (const server of servers) {
        const anomalies = await this.detectAnomalies(server.id, server.metrics);
        
        if (anomalies.length > 0) {
          console.log(`MLAnomalyDetectionService: Detected ${anomalies.length} anomalies for ${server.name}`);
          
          // Create alerts for anomalies
          for (const anomaly of anomalies) {
            await this.createAnomalyAlert(anomaly);
          }
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Create alert for anomaly
   */
  async createAnomalyAlert(anomaly) {
    try {
      const server = infraService.getServer(anomaly.serverId);
      if (!server) return;
      
      const title = `ML Anomaly Detected: ${anomaly.metric?.toUpperCase() || 'Correlation'}`;
      const message = anomaly.metric 
        ? `${anomaly.metric} value ${anomaly.value} is anomalous (score: ${(anomaly.anomalyScore * 100).toFixed(1)}%)`
        : `Correlation anomaly between ${anomaly.metrics.join(' and ')} (deviation: ${(anomaly.deviation * 100).toFixed(1)}%)`;
      
      await infraService.createAlert(
        anomaly.serverId,
        'ml_anomaly',
        title,
        message,
        anomaly.severity
      );
    } catch (error) {
      console.error('MLAnomalyDetectionService: Create anomaly alert error', error);
    }
  }

  /**
   * Load models from storage
   */
  async loadModels() {
    try {
      const stored = await AsyncStorage.getItem('mlModels');
      if (stored) {
        const modelsArray = JSON.parse(stored);
        this.models = new Map(modelsArray);
        console.log('MLAnomalyDetectionService: Loaded ML models from storage');
      }
    } catch (error) {
      console.error('MLAnomalyDetectionService: Load models error', error);
    }
  }

  /**
   * Save models to storage
   */
  async saveModels() {
    try {
      const modelsArray = Array.from(this.models.entries());
      await AsyncStorage.setItem('mlModels', JSON.stringify(modelsArray));
    } catch (error) {
      console.error('MLAnomalyDetectionService: Save models error', error);
    }
  }

  /**
   * Load training data from storage
   */
  async loadTrainingData() {
    try {
      const stored = await AsyncStorage.getItem('mlTrainingData');
      if (stored) {
        const dataArray = JSON.parse(stored);
        this.trainingData = new Map(dataArray);
      }
    } catch (error) {
      console.error('MLAnomalyDetectionService: Load training data error', error);
    }
  }

  /**
   * Get ML service status
   */
  getMLStatus() {
    return {
      modelsCount: this.models.size,
      isTraining: this.isTraining,
      lastTrainingTime: this.lastTrainingTime ? new Date(this.lastTrainingTime).toISOString() : null,
      anomalyScoresCount: this.anomalyScores.size,
      patternsCount: this.patterns.size,
      seasonalPatternsCount: this.seasonalPatterns.size
    };
  }

  /**
   * Get anomaly scores for server
   */
  getAnomalyScores(serverId) {
    const scores = {};
    const metrics = ['cpu', 'memory', 'disk', 'network'];
    
    for (const metric of metrics) {
      const key = `${serverId}_${metric}`;
      scores[metric] = this.anomalyScores.get(key) || 0;
    }
    
    return scores;
  }

  /**
   * Clear all ML data
   */
  async clearMLData() {
    try {
      this.models.clear();
      this.trainingData.clear();
      this.anomalyScores.clear();
      this.patterns.clear();
      this.seasonalPatterns.clear();
      
      await AsyncStorage.multiRemove(['mlModels', 'mlTrainingData', 'lastMLTrainingTime']);
      
      console.log('MLAnomalyDetectionService: All ML data cleared');
    } catch (error) {
      console.error('MLAnomalyDetectionService: Clear ML data error', error);
    }
  }
}

export default new MLAnomalyDetectionService();
