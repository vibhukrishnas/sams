package com.sams.enterprise.ai;

import com.sams.enterprise.entity.ServerMetric;
import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.entity.Server;
import com.sams.enterprise.repository.ServerMetricRepository;
import com.sams.enterprise.repository.ServerRepository;
import com.sams.enterprise.service.AlertProcessingService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 🔮 PREDICTIVE ALERTING SYSTEM
 * Advanced AI-powered predictive analytics for proactive monitoring
 */
@Service
public class PredictiveAlertingSystem {

    @Autowired
    private ServerMetricRepository serverMetricRepository;

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private AlertProcessingService alertProcessingService;

    @Autowired
    private AnomalyDetectionEngine anomalyDetectionEngine;

    private final Map<String, PredictiveModel> predictiveModels = new HashMap<>();
    private final Map<String, List<Prediction>> activePredictions = new HashMap<>();

    /**
     * Advanced Predictive Model
     */
    public static class PredictiveModel {
        private String modelId;
        private String metricName;
        private Long serverId;
        private List<Double> historicalValues;
        private List<LocalDateTime> timestamps;
        private double accuracy;
        private LocalDateTime lastTrained;
        private Map<String, Double> seasonalPatterns;
        private double trendCoefficient;
        private double volatility;

        public PredictiveModel(String modelId, String metricName, Long serverId) {
            this.modelId = modelId;
            this.metricName = metricName;
            this.serverId = serverId;
            this.historicalValues = new ArrayList<>();
            this.timestamps = new ArrayList<>();
            this.seasonalPatterns = new HashMap<>();
            this.accuracy = 0.0;
            this.lastTrained = LocalDateTime.now();
        }

        public void trainModel(List<ServerMetric> metrics) {
            if (metrics.size() < 20) return; // Need minimum data for training

            // Clear existing data
            historicalValues.clear();
            timestamps.clear();

            // Sort metrics by timestamp
            metrics.sort(Comparator.comparing(ServerMetric::getTimestamp));

            // Extract values and timestamps
            for (ServerMetric metric : metrics) {
                historicalValues.add(metric.getValue());
                timestamps.add(metric.getTimestamp());
            }

            // Calculate trend coefficient
            this.trendCoefficient = calculateTrendCoefficient();

            // Detect seasonal patterns
            detectSeasonalPatterns();

            // Calculate volatility
            this.volatility = calculateVolatility();

            // Update training timestamp
            this.lastTrained = LocalDateTime.now();

            // Calculate model accuracy based on backtesting
            this.accuracy = calculateModelAccuracy();
        }

        private double calculateTrendCoefficient() {
            if (historicalValues.size() < 2) return 0.0;

            double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            int n = historicalValues.size();

            for (int i = 0; i < n; i++) {
                double x = i;
                double y = historicalValues.get(i);
                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumX2 += x * x;
            }

            return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        }

        private void detectSeasonalPatterns() {
            seasonalPatterns.clear();

            // Hourly patterns
            Map<Integer, List<Double>> hourlyData = new HashMap<>();
            for (int i = 0; i < timestamps.size(); i++) {
                int hour = timestamps.get(i).getHour();
                hourlyData.computeIfAbsent(hour, k -> new ArrayList<>()).add(historicalValues.get(i));
            }

            for (Map.Entry<Integer, List<Double>> entry : hourlyData.entrySet()) {
                double average = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                seasonalPatterns.put("hour_" + entry.getKey(), average);
            }

            // Daily patterns
            Map<Integer, List<Double>> dailyData = new HashMap<>();
            for (int i = 0; i < timestamps.size(); i++) {
                int dayOfWeek = timestamps.get(i).getDayOfWeek().getValue();
                dailyData.computeIfAbsent(dayOfWeek, k -> new ArrayList<>()).add(historicalValues.get(i));
            }

            for (Map.Entry<Integer, List<Double>> entry : dailyData.entrySet()) {
                double average = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                seasonalPatterns.put("day_" + entry.getKey(), average);
            }
        }

        private double calculateVolatility() {
            if (historicalValues.size() < 2) return 0.0;

            double mean = historicalValues.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double variance = historicalValues.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average().orElse(0.0);

            return Math.sqrt(variance);
        }

        private double calculateModelAccuracy() {
            if (historicalValues.size() < 10) return 0.0;

            // Backtest the model
            int testSize = Math.min(10, historicalValues.size() / 4);
            double totalError = 0.0;

            for (int i = historicalValues.size() - testSize; i < historicalValues.size(); i++) {
                double predicted = predictValue(timestamps.get(i));
                double actual = historicalValues.get(i);
                totalError += Math.abs(predicted - actual) / actual;
            }

            return Math.max(0.0, 1.0 - (totalError / testSize));
        }

        public double predictValue(LocalDateTime targetTime) {
            if (historicalValues.isEmpty()) return 0.0;

            // Base prediction using trend
            long hoursFromStart = java.time.Duration.between(timestamps.get(0), targetTime).toHours();
            double basePrediction = historicalValues.get(historicalValues.size() - 1) + (trendCoefficient * hoursFromStart);

            // Apply seasonal adjustments
            int hour = targetTime.getHour();
            int dayOfWeek = targetTime.getDayOfWeek().getValue();

            double hourlyAdjustment = seasonalPatterns.getOrDefault("hour_" + hour, basePrediction);
            double dailyAdjustment = seasonalPatterns.getOrDefault("day_" + dayOfWeek, basePrediction);

            // Weighted combination
            double prediction = (basePrediction * 0.5) + (hourlyAdjustment * 0.3) + (dailyAdjustment * 0.2);

            return Math.max(0, prediction);
        }

        public double getPredictionConfidence(LocalDateTime targetTime) {
            // Confidence decreases with time distance and increases with model accuracy
            long hoursAhead = java.time.Duration.between(LocalDateTime.now(), targetTime).toHours();
            double timeDecay = Math.exp(-hoursAhead / 24.0); // Decay over 24 hours
            
            return accuracy * timeDecay;
        }

        // Getters
        public String getModelId() { return modelId; }
        public String getMetricName() { return metricName; }
        public Long getServerId() { return serverId; }
        public double getAccuracy() { return accuracy; }
        public LocalDateTime getLastTrained() { return lastTrained; }
        public double getTrendCoefficient() { return trendCoefficient; }
        public double getVolatility() { return volatility; }
        public Map<String, Double> getSeasonalPatterns() { return seasonalPatterns; }
    }

    /**
     * Prediction Result
     */
    public static class Prediction {
        private String predictionId;
        private Long serverId;
        private String metricName;
        private double predictedValue;
        private LocalDateTime predictionTime;
        private LocalDateTime targetTime;
        private double confidence;
        private String riskLevel;
        private String recommendedAction;
        private boolean alertTriggered;

        public Prediction(String predictionId, Long serverId, String metricName, 
                         double predictedValue, LocalDateTime targetTime, double confidence) {
            this.predictionId = predictionId;
            this.serverId = serverId;
            this.metricName = metricName;
            this.predictedValue = predictedValue;
            this.predictionTime = LocalDateTime.now();
            this.targetTime = targetTime;
            this.confidence = confidence;
            this.alertTriggered = false;
            
            // Determine risk level
            this.riskLevel = determineRiskLevel(predictedValue, confidence);
            this.recommendedAction = determineRecommendedAction(riskLevel);
        }

        private String determineRiskLevel(double value, double confidence) {
            if (confidence < 0.3) return "UNCERTAIN";
            if (value > 90) return "CRITICAL";
            if (value > 80) return "HIGH";
            if (value > 70) return "MEDIUM";
            return "LOW";
        }

        private String determineRecommendedAction(String riskLevel) {
            return switch (riskLevel) {
                case "CRITICAL" -> "immediate_intervention";
                case "HIGH" -> "prepare_scaling";
                case "MEDIUM" -> "monitor_closely";
                case "LOW" -> "routine_monitoring";
                default -> "gather_more_data";
            };
        }

        // Getters
        public String getPredictionId() { return predictionId; }
        public Long getServerId() { return serverId; }
        public String getMetricName() { return metricName; }
        public double getPredictedValue() { return predictedValue; }
        public LocalDateTime getPredictionTime() { return predictionTime; }
        public LocalDateTime getTargetTime() { return targetTime; }
        public double getConfidence() { return confidence; }
        public String getRiskLevel() { return riskLevel; }
        public String getRecommendedAction() { return recommendedAction; }
        public boolean isAlertTriggered() { return alertTriggered; }
        public void setAlertTriggered(boolean triggered) { this.alertTriggered = triggered; }
    }

    /**
     * Initialize predictive models for all servers
     */
    public void initializePredictiveModels() {
        List<Server> servers = serverRepository.findAll();
        
        for (Server server : servers) {
            String[] metricTypes = {"cpu_usage", "memory_usage", "disk_usage", "network_io"};
            
            for (String metricType : metricTypes) {
                String modelId = server.getId() + "_" + metricType;
                PredictiveModel model = new PredictiveModel(modelId, metricType, server.getId());
                
                // Train model with historical data
                LocalDateTime since = LocalDateTime.now().minusDays(30);
                List<ServerMetric> metrics = serverMetricRepository
                    .findByServerIdAndMetricNameAndTimestampAfter(server.getId(), metricType, since);
                
                if (!metrics.isEmpty()) {
                    model.trainModel(metrics);
                    predictiveModels.put(modelId, model);
                }
            }
        }
    }

    /**
     * Generate predictions for next 24 hours
     */
    @Scheduled(fixedRate = 3600000) // Run every hour
    public void generatePredictions() {
        LocalDateTime now = LocalDateTime.now();
        
        for (PredictiveModel model : predictiveModels.values()) {
            List<Prediction> predictions = new ArrayList<>();
            
            // Generate predictions for next 24 hours
            for (int hour = 1; hour <= 24; hour++) {
                LocalDateTime targetTime = now.plusHours(hour);
                double predictedValue = model.predictValue(targetTime);
                double confidence = model.getPredictionConfidence(targetTime);
                
                if (confidence > 0.3) { // Only keep predictions with reasonable confidence
                    String predictionId = model.getModelId() + "_" + targetTime.toString();
                    Prediction prediction = new Prediction(
                        predictionId, model.getServerId(), model.getMetricName(),
                        predictedValue, targetTime, confidence
                    );
                    
                    predictions.add(prediction);
                    
                    // Check if prediction warrants an alert
                    if (shouldTriggerPredictiveAlert(prediction)) {
                        createPredictiveAlert(prediction);
                        prediction.setAlertTriggered(true);
                    }
                }
            }
            
            activePredictions.put(model.getModelId(), predictions);
        }
    }

    /**
     * Check if prediction should trigger an alert
     */
    private boolean shouldTriggerPredictiveAlert(Prediction prediction) {
        // Trigger alert for high-confidence critical or high-risk predictions
        return prediction.getConfidence() > 0.7 && 
               ("CRITICAL".equals(prediction.getRiskLevel()) || "HIGH".equals(prediction.getRiskLevel()));
    }

    /**
     * Create predictive alert
     */
    private void createPredictiveAlert(Prediction prediction) {
        try {
            Alert alert = new Alert();
            alert.setTitle("🔮 Predictive Alert: " + prediction.getMetricName());
            alert.setDescription(String.format(
                "Predictive analysis indicates potential issue:\n" +
                "Metric: %s\n" +
                "Predicted Value: %.2f\n" +
                "Predicted Time: %s\n" +
                "Confidence: %.1f%%\n" +
                "Risk Level: %s\n" +
                "Recommended Action: %s",
                prediction.getMetricName(),
                prediction.getPredictedValue(),
                prediction.getTargetTime(),
                prediction.getConfidence() * 100,
                prediction.getRiskLevel(),
                prediction.getRecommendedAction()
            ));
            
            alert.setSeverity(mapRiskToSeverity(prediction.getRiskLevel()));
            alert.setType(Alert.AlertType.PREDICTIVE);
            alert.setSource("PREDICTIVE_AI");
            alert.setMetricValue(prediction.getPredictedValue());
            
            // Set metadata
            Map<String, String> metadata = new HashMap<>();
            metadata.put("predictionId", prediction.getPredictionId());
            metadata.put("confidence", String.valueOf(prediction.getConfidence()));
            metadata.put("riskLevel", prediction.getRiskLevel());
            metadata.put("targetTime", prediction.getTargetTime().toString());
            metadata.put("recommendedAction", prediction.getRecommendedAction());
            metadata.put("predictionType", "time_series_forecast");
            alert.setMetadata(metadata);
            
            alertProcessingService.processAlert(alert);
            
        } catch (Exception e) {
            System.err.println("Failed to create predictive alert: " + e.getMessage());
        }
    }

    /**
     * Map risk level to alert severity
     */
    private Alert.AlertSeverity mapRiskToSeverity(String riskLevel) {
        return switch (riskLevel) {
            case "CRITICAL" -> Alert.AlertSeverity.CRITICAL;
            case "HIGH" -> Alert.AlertSeverity.HIGH;
            case "MEDIUM" -> Alert.AlertSeverity.MEDIUM;
            case "LOW" -> Alert.AlertSeverity.LOW;
            default -> Alert.AlertSeverity.INFO;
        };
    }

    /**
     * Retrain models with new data
     */
    @Scheduled(fixedRate = 86400000) // Run daily
    public void retrainModels() {
        for (PredictiveModel model : predictiveModels.values()) {
            LocalDateTime since = LocalDateTime.now().minusDays(30);
            List<ServerMetric> metrics = serverMetricRepository
                .findByServerIdAndMetricNameAndTimestampAfter(
                    model.getServerId(), model.getMetricName(), since);
            
            if (metrics.size() > 20) {
                model.trainModel(metrics);
            }
        }
    }

    /**
     * Get predictions for server
     */
    public List<Prediction> getPredictionsForServer(Long serverId) {
        return activePredictions.values().stream()
            .flatMap(List::stream)
            .filter(p -> p.getServerId().equals(serverId))
            .collect(Collectors.toList());
    }

    /**
     * Get all active predictions
     */
    public Map<String, List<Prediction>> getAllActivePredictions() {
        return new HashMap<>(activePredictions);
    }

    /**
     * Get predictive system statistics
     */
    public Map<String, Object> getPredictiveSystemStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalModels", predictiveModels.size());
        stats.put("activePredictions", activePredictions.values().stream()
            .mapToInt(List::size).sum());
        
        // Model accuracy statistics
        double avgAccuracy = predictiveModels.values().stream()
            .mapToDouble(PredictiveModel::getAccuracy)
            .average().orElse(0.0);
        stats.put("averageModelAccuracy", avgAccuracy);
        
        // Risk level distribution
        Map<String, Long> riskDistribution = activePredictions.values().stream()
            .flatMap(List::stream)
            .collect(Collectors.groupingBy(Prediction::getRiskLevel, Collectors.counting()));
        stats.put("riskDistribution", riskDistribution);
        
        return stats;
    }
}
