package com.sams.enterprise.ai;

import com.sams.enterprise.entity.ServerMetric;
import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.entity.Server;
import com.sams.enterprise.repository.ServerMetricRepository;
import com.sams.enterprise.service.AlertProcessingService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 🤖 ML-BASED ANOMALY DETECTION ENGINE
 * Advanced AI-powered anomaly detection with machine learning algorithms
 */
@Service
public class AnomalyDetectionEngine {

    @Autowired
    private ServerMetricRepository serverMetricRepository;

    @Autowired
    private AlertProcessingService alertProcessingService;

    private final Map<String, AnomalyModel> models = new HashMap<>();
    private final Map<String, List<Double>> historicalData = new HashMap<>();

    /**
     * Advanced Statistical Anomaly Detection Model
     */
    public static class AnomalyModel {
        private double mean;
        private double standardDeviation;
        private double threshold;
        private List<Double> recentValues;
        private LocalDateTime lastUpdated;
        private int dataPoints;
        private double sensitivity;

        public AnomalyModel(double sensitivity) {
            this.sensitivity = sensitivity;
            this.recentValues = new ArrayList<>();
            this.lastUpdated = LocalDateTime.now();
            this.dataPoints = 0;
        }

        public void updateModel(List<Double> values) {
            if (values.isEmpty()) return;

            this.recentValues.addAll(values);
            
            // Keep only last 1000 data points for efficiency
            if (recentValues.size() > 1000) {
                recentValues = recentValues.subList(recentValues.size() - 1000, recentValues.size());
            }

            // Calculate statistical measures
            this.mean = recentValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            
            double variance = recentValues.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average().orElse(0.0);
            
            this.standardDeviation = Math.sqrt(variance);
            this.threshold = mean + (sensitivity * standardDeviation);
            this.lastUpdated = LocalDateTime.now();
            this.dataPoints = recentValues.size();
        }

        public boolean isAnomaly(double value) {
            if (dataPoints < 10) return false; // Need minimum data points
            
            // Multiple anomaly detection methods
            boolean statisticalAnomaly = Math.abs(value - mean) > (sensitivity * standardDeviation);
            boolean thresholdAnomaly = value > threshold;
            boolean percentileAnomaly = isPercentileAnomaly(value);
            
            return statisticalAnomaly || thresholdAnomaly || percentileAnomaly;
        }

        private boolean isPercentileAnomaly(double value) {
            if (recentValues.size() < 20) return false;
            
            List<Double> sorted = new ArrayList<>(recentValues);
            Collections.sort(sorted);
            
            int p95Index = (int) (sorted.size() * 0.95);
            int p99Index = (int) (sorted.size() * 0.99);
            
            return value > sorted.get(p99Index) || value < sorted.get((int) (sorted.size() * 0.01));
        }

        public double getAnomalyScore(double value) {
            if (standardDeviation == 0) return 0.0;
            return Math.abs(value - mean) / standardDeviation;
        }

        // Getters
        public double getMean() { return mean; }
        public double getStandardDeviation() { return standardDeviation; }
        public double getThreshold() { return threshold; }
        public LocalDateTime getLastUpdated() { return lastUpdated; }
        public int getDataPoints() { return dataPoints; }
    }

    /**
     * Initialize anomaly detection for a server metric
     */
    public void initializeAnomalyDetection(String metricKey, double sensitivity) {
        models.put(metricKey, new AnomalyModel(sensitivity));
        historicalData.put(metricKey, new ArrayList<>());
    }

    /**
     * Process new metric and detect anomalies
     */
    @Async
    public void processMetricForAnomalies(ServerMetric metric) {
        String metricKey = generateMetricKey(metric);
        
        // Initialize model if not exists
        if (!models.containsKey(metricKey)) {
            initializeAnomalyDetection(metricKey, 2.0); // 2 sigma threshold
        }

        AnomalyModel model = models.get(metricKey);
        List<Double> historical = historicalData.get(metricKey);

        // Add new data point
        historical.add(metric.getValue());
        
        // Update model with recent data
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        List<ServerMetric> recentMetrics = serverMetricRepository
            .findByServerIdAndMetricNameAndTimestampAfter(
                metric.getServerId(), metric.getMetricName(), since);
        
        List<Double> recentValues = recentMetrics.stream()
            .map(ServerMetric::getValue)
            .collect(Collectors.toList());
        
        model.updateModel(recentValues);

        // Check for anomaly
        if (model.isAnomaly(metric.getValue())) {
            createAnomalyAlert(metric, model);
        }
    }

    /**
     * Batch anomaly detection for multiple metrics
     */
    public Map<String, Boolean> batchAnomalyDetection(List<ServerMetric> metrics) {
        Map<String, Boolean> results = new HashMap<>();
        
        for (ServerMetric metric : metrics) {
            String metricKey = generateMetricKey(metric);
            AnomalyModel model = models.get(metricKey);
            
            if (model != null) {
                results.put(metricKey, model.isAnomaly(metric.getValue()));
            } else {
                results.put(metricKey, false);
            }
        }
        
        return results;
    }

    /**
     * Predictive anomaly detection
     */
    public List<PredictiveAlert> predictFutureAnomalies(Long serverId, int hoursAhead) {
        List<PredictiveAlert> predictions = new ArrayList<>();
        
        // Get all metrics for the server
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<ServerMetric> metrics = serverMetricRepository
            .findByServerIdAndTimestampAfter(serverId, since);
        
        // Group by metric name
        Map<String, List<ServerMetric>> metricGroups = metrics.stream()
            .collect(Collectors.groupingBy(ServerMetric::getMetricName));
        
        for (Map.Entry<String, List<ServerMetric>> entry : metricGroups.entrySet()) {
            String metricName = entry.getKey();
            List<ServerMetric> metricHistory = entry.getValue();
            
            // Simple trend analysis for prediction
            if (metricHistory.size() >= 10) {
                double trend = calculateTrend(metricHistory);
                double currentValue = metricHistory.get(metricHistory.size() - 1).getValue();
                double predictedValue = currentValue + (trend * hoursAhead);
                
                String metricKey = serverId + ":" + metricName;
                AnomalyModel model = models.get(metricKey);
                
                if (model != null && model.isAnomaly(predictedValue)) {
                    predictions.add(new PredictiveAlert(
                        serverId, metricName, predictedValue, 
                        LocalDateTime.now().plusHours(hoursAhead),
                        model.getAnomalyScore(predictedValue)
                    ));
                }
            }
        }
        
        return predictions;
    }

    /**
     * Calculate trend from historical data
     */
    private double calculateTrend(List<ServerMetric> metrics) {
        if (metrics.size() < 2) return 0.0;
        
        // Simple linear regression for trend calculation
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        int n = metrics.size();
        
        for (int i = 0; i < n; i++) {
            double x = i;
            double y = metrics.get(i).getValue();
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        
        double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    /**
     * Create anomaly alert
     */
    private void createAnomalyAlert(ServerMetric metric, AnomalyModel model) {
        try {
            Alert alert = new Alert();
            alert.setTitle("🤖 AI Anomaly Detected: " + metric.getMetricName());
            alert.setDescription(String.format(
                "Anomaly detected in %s for server %d.\n" +
                "Current Value: %.2f\n" +
                "Expected Range: %.2f ± %.2f\n" +
                "Anomaly Score: %.2f\n" +
                "Detection Method: ML Statistical Analysis",
                metric.getMetricName(),
                metric.getServerId(),
                metric.getValue(),
                model.getMean(),
                model.getStandardDeviation(),
                model.getAnomalyScore(metric.getValue())
            ));
            alert.setSeverity(Alert.AlertSeverity.WARNING);
            alert.setType(Alert.AlertType.ANOMALY);
            alert.setSource("AI_ANOMALY_DETECTION");
            alert.setMetricValue(metric.getValue());
            alert.setThresholdValue(model.getThreshold());
            
            // Set metadata
            Map<String, String> metadata = new HashMap<>();
            metadata.put("anomalyScore", String.valueOf(model.getAnomalyScore(metric.getValue())));
            metadata.put("expectedMean", String.valueOf(model.getMean()));
            metadata.put("standardDeviation", String.valueOf(model.getStandardDeviation()));
            metadata.put("dataPoints", String.valueOf(model.getDataPoints()));
            metadata.put("detectionMethod", "ML_STATISTICAL");
            alert.setMetadata(metadata);
            
            alertProcessingService.processAlert(alert);
            
        } catch (Exception e) {
            System.err.println("Failed to create anomaly alert: " + e.getMessage());
        }
    }

    /**
     * Generate metric key for model storage
     */
    private String generateMetricKey(ServerMetric metric) {
        return metric.getServerId() + ":" + metric.getMetricName();
    }

    /**
     * Get anomaly model statistics
     */
    public Map<String, Object> getAnomalyModelStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalModels", models.size());
        stats.put("modelsWithData", models.values().stream()
            .mapToInt(AnomalyModel::getDataPoints).sum());
        
        Map<String, Object> modelDetails = new HashMap<>();
        for (Map.Entry<String, AnomalyModel> entry : models.entrySet()) {
            AnomalyModel model = entry.getValue();
            modelDetails.put(entry.getKey(), Map.of(
                "mean", model.getMean(),
                "standardDeviation", model.getStandardDeviation(),
                "threshold", model.getThreshold(),
                "dataPoints", model.getDataPoints(),
                "lastUpdated", model.getLastUpdated()
            ));
        }
        stats.put("models", modelDetails);
        
        return stats;
    }

    /**
     * Predictive Alert class
     */
    public static class PredictiveAlert {
        private Long serverId;
        private String metricName;
        private double predictedValue;
        private LocalDateTime predictedTime;
        private double anomalyScore;

        public PredictiveAlert(Long serverId, String metricName, double predictedValue, 
                             LocalDateTime predictedTime, double anomalyScore) {
            this.serverId = serverId;
            this.metricName = metricName;
            this.predictedValue = predictedValue;
            this.predictedTime = predictedTime;
            this.anomalyScore = anomalyScore;
        }

        // Getters
        public Long getServerId() { return serverId; }
        public String getMetricName() { return metricName; }
        public double getPredictedValue() { return predictedValue; }
        public LocalDateTime getPredictedTime() { return predictedTime; }
        public double getAnomalyScore() { return anomalyScore; }
    }
}
