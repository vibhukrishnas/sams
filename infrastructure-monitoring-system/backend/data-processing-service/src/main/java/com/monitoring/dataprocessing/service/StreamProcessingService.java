/**
 * 🌊 Stream Processing Service - Real-Time Data Processing
 * Advanced Kafka Streams processing with aggregation, windowing, and anomaly detection
 */

package com.monitoring.dataprocessing.service;

import com.monitoring.dataprocessing.model.*;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.streams.state.Stores;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.serializer.JsonSerde;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class StreamProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(StreamProcessingService.class);

    @Autowired
    private StreamsBuilder streamsBuilder;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private DataValidationService validationService;

    @Autowired
    private AnomalyDetectionService anomalyDetectionService;

    // Processing metrics
    private final AtomicLong processedMetrics = new AtomicLong(0);
    private final AtomicLong invalidMetrics = new AtomicLong(0);
    private final AtomicLong aggregatedMetrics = new AtomicLong(0);
    private final AtomicLong anomaliesDetected = new AtomicLong(0);

    @PostConstruct
    public void buildProcessingTopology() {
        logger.info("🌊 Building stream processing topology...");

        // Configure serdes
        JsonSerde<MetricData> metricDataSerde = new JsonSerde<>(MetricData.class);
        JsonSerde<AggregatedMetricData> aggregatedMetricSerde = new JsonSerde<>(AggregatedMetricData.class);
        JsonSerde<AnomalyData> anomalyDataSerde = new JsonSerde<>(AnomalyData.class);

        // Main metrics stream
        KStream<String, MetricData> metricsStream = streamsBuilder
                .stream("monitoring.metrics.raw", Consumed.with(Serdes.String(), metricDataSerde))
                .peek((key, value) -> logger.debug("📊 Processing metric: {}", value))
                .filter(this::validateAndFilterMetrics);

        // Branch the stream for different processing paths
        Map<String, KStream<String, MetricData>> branches = metricsStream.split(Named.as("metrics-"))
                .branch((key, value) -> isRealTimeMetric(value), Branched.as("realtime"))
                .branch((key, value) -> isBatchMetric(value), Branched.as("batch"))
                .defaultBranch(Branched.as("other"));

        // Real-time processing branch
        processRealTimeMetrics(branches.get("metrics-realtime"), metricDataSerde, aggregatedMetricSerde);

        // Batch processing branch
        processBatchMetrics(branches.get("metrics-batch"), metricDataSerde);

        // Anomaly detection
        processAnomalyDetection(metricsStream, metricDataSerde, anomalyDataSerde);

        logger.info("✅ Stream processing topology built successfully");
    }

    /**
     * Process real-time metrics with windowed aggregations
     */
    private void processRealTimeMetrics(KStream<String, MetricData> stream, 
                                      JsonSerde<MetricData> metricSerde,
                                      JsonSerde<AggregatedMetricData> aggregatedSerde) {
        
        logger.info("🔄 Setting up real-time metrics processing...");

        // Group by metric key for aggregation
        KGroupedStream<String, MetricData> groupedStream = stream
                .groupBy((key, value) -> value.getMetricKey(), 
                        Grouped.with(Serdes.String(), metricSerde));

        // 1-minute tumbling window aggregations
        processWindowedAggregation(groupedStream, Duration.ofMinutes(1), "1m", aggregatedSerde);

        // 5-minute tumbling window aggregations
        processWindowedAggregation(groupedStream, Duration.ofMinutes(5), "5m", aggregatedSerde);

        // 15-minute tumbling window aggregations
        processWindowedAggregation(groupedStream, Duration.ofMinutes(15), "15m", aggregatedSerde);

        // 1-hour tumbling window aggregations
        processWindowedAggregation(groupedStream, Duration.ofHours(1), "1h", aggregatedSerde);

        // Real-time alerting stream
        stream
                .filter((key, value) -> shouldTriggerRealTimeAlert(value))
                .peek((key, value) -> logger.info("🚨 Real-time alert triggered for: {}", value))
                .to("monitoring.alerts.realtime", Produced.with(Serdes.String(), metricSerde));
    }

    /**
     * Process windowed aggregations
     */
    private void processWindowedAggregation(KGroupedStream<String, MetricData> groupedStream,
                                          Duration windowSize, String windowName,
                                          JsonSerde<AggregatedMetricData> aggregatedSerde) {
        
        // Create windowed aggregations
        groupedStream
                .windowedBy(TimeWindows.of(windowSize))
                .aggregate(
                        () -> new MetricAggregator(),
                        (key, value, aggregator) -> {
                            aggregator.addMetric(value);
                            return aggregator;
                        },
                        Materialized.<String, MetricAggregator>as(
                                Stores.persistentWindowStore("aggregation-store-" + windowName,
                                        Duration.ofDays(7), windowSize, false))
                                .withKeySerde(Serdes.String())
                                .withValueSerde(new JsonSerde<>(MetricAggregator.class))
                )
                .toStream()
                .map((windowedKey, aggregator) -> {
                    String key = windowedKey.key();
                    Windowed<String> window = windowedKey;
                    
                    // Create aggregated metrics for different aggregation types
                    AggregatedMetricData avgMetric = aggregator.getAggregatedData("AVG", window);
                    AggregatedMetricData maxMetric = aggregator.getAggregatedData("MAX", window);
                    AggregatedMetricData minMetric = aggregator.getAggregatedData("MIN", window);
                    
                    aggregatedMetrics.addAndGet(3); // Count all three aggregations
                    
                    return KeyValue.pair(key + ":AVG", avgMetric);
                })
                .peek((key, value) -> logger.debug("📈 Aggregated metric ({}): {}", windowName, value))
                .to("monitoring.metrics.aggregated." + windowName, 
                    Produced.with(Serdes.String(), aggregatedSerde));
    }

    /**
     * Process batch metrics for historical analysis
     */
    private void processBatchMetrics(KStream<String, MetricData> stream, JsonSerde<MetricData> metricSerde) {
        logger.info("📦 Setting up batch metrics processing...");

        stream
                .peek((key, value) -> logger.debug("📦 Processing batch metric: {}", value))
                .filter((key, value) -> validationService.validateBatchMetric(value))
                .to("monitoring.metrics.batch", Produced.with(Serdes.String(), metricSerde));
    }

    /**
     * Process anomaly detection
     */
    private void processAnomalyDetection(KStream<String, MetricData> stream,
                                       JsonSerde<MetricData> metricSerde,
                                       JsonSerde<AnomalyData> anomalySerde) {
        
        logger.info("🔍 Setting up anomaly detection processing...");

        stream
                .filter((key, value) -> shouldCheckForAnomalies(value))
                .groupBy((key, value) -> value.getMetricKey(), 
                        Grouped.with(Serdes.String(), metricSerde))
                .windowedBy(TimeWindows.of(Duration.ofMinutes(10)))
                .aggregate(
                        () -> new AnomalyDetector(),
                        (key, value, detector) -> {
                            detector.addDataPoint(value);
                            return detector;
                        },
                        Materialized.<String, AnomalyDetector>as("anomaly-detection-store")
                                .withKeySerde(Serdes.String())
                                .withValueSerde(new JsonSerde<>(AnomalyDetector.class))
                )
                .toStream()
                .flatMap((windowedKey, detector) -> {
                    List<AnomalyData> anomalies = detector.detectAnomalies();
                    anomaliesDetected.addAndGet(anomalies.size());
                    
                    return anomalies.stream()
                            .map(anomaly -> KeyValue.pair(windowedKey.key(), anomaly))
                            .collect(Collectors.toList());
                })
                .peek((key, anomaly) -> logger.warn("🚨 Anomaly detected: {}", anomaly))
                .to("monitoring.anomalies", Produced.with(Serdes.String(), anomalySerde));
    }

    /**
     * Validate and filter metrics
     */
    private boolean validateAndFilterMetrics(String key, MetricData metric) {
        processedMetrics.incrementAndGet();
        
        if (!validationService.validateMetric(metric)) {
            invalidMetrics.incrementAndGet();
            logger.warn("⚠️ Invalid metric filtered out: {}", metric);
            return false;
        }
        
        return true;
    }

    /**
     * Check if metric is real-time
     */
    private boolean isRealTimeMetric(MetricData metric) {
        // Consider metrics from the last 5 minutes as real-time
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        return metric.getTimestamp().isAfter(fiveMinutesAgo);
    }

    /**
     * Check if metric is batch
     */
    private boolean isBatchMetric(MetricData metric) {
        // Consider metrics older than 5 minutes as batch
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        return metric.getTimestamp().isBefore(fiveMinutesAgo);
    }

    /**
     * Check if metric should trigger real-time alert
     */
    private boolean shouldTriggerRealTimeAlert(MetricData metric) {
        // Define critical thresholds for immediate alerting
        switch (metric.getMetricName().toLowerCase()) {
            case "cpu_usage":
                return metric.getValue() > 95.0;
            case "memory_usage":
                return metric.getValue() > 90.0;
            case "disk_usage":
                return metric.getValue() > 95.0;
            case "error_rate":
                return metric.getValue() > 10.0;
            default:
                return false;
        }
    }

    /**
     * Check if metric should be checked for anomalies
     */
    private boolean shouldCheckForAnomalies(MetricData metric) {
        // Enable anomaly detection for key system metrics
        Set<String> anomalyMetrics = Set.of(
                "cpu_usage", "memory_usage", "disk_usage", "network_io",
                "response_time", "error_rate", "throughput"
        );
        return anomalyMetrics.contains(metric.getMetricName().toLowerCase());
    }

    /**
     * Get processing statistics
     */
    public StreamProcessingStatistics getStatistics() {
        StreamProcessingStatistics stats = new StreamProcessingStatistics();
        stats.setProcessedMetrics(processedMetrics.get());
        stats.setInvalidMetrics(invalidMetrics.get());
        stats.setAggregatedMetrics(aggregatedMetrics.get());
        stats.setAnomaliesDetected(anomaliesDetected.get());
        stats.setProcessingRate(calculateProcessingRate());
        stats.setTimestamp(LocalDateTime.now());
        return stats;
    }

    private double calculateProcessingRate() {
        // Calculate metrics per second (simplified)
        return processedMetrics.get() / 60.0; // Assuming 1-minute window
    }
}

/**
 * Metric aggregator for windowed operations
 */
package com.monitoring.dataprocessing.model;

import org.apache.kafka.streams.kstream.Windowed;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class MetricAggregator {
    
    private List<MetricData> metrics = new ArrayList<>();
    private double sum = 0.0;
    private double min = Double.MAX_VALUE;
    private double max = Double.MIN_VALUE;
    private int count = 0;
    private UUID serverId;
    private String metricName;
    private UUID organizationId;
    private String unit;
    private String environment;

    public void addMetric(MetricData metric) {
        if (metric.getValue() != null) {
            metrics.add(metric);
            double value = metric.getValue();
            
            sum += value;
            count++;
            
            if (value < min) min = value;
            if (value > max) max = value;
            
            // Set metadata from first metric
            if (serverId == null) {
                serverId = metric.getServerId();
                metricName = metric.getMetricName();
                organizationId = metric.getOrganizationId();
                unit = metric.getUnit();
                environment = metric.getEnvironment();
            }
        }
    }

    public AggregatedMetricData getAggregatedData(String aggregationType, Windowed<String> window) {
        AggregatedMetricData aggregated = new AggregatedMetricData();
        aggregated.setServerId(serverId);
        aggregated.setMetricName(metricName);
        aggregated.setOrganizationId(organizationId);
        aggregated.setAggregationType(aggregationType);
        aggregated.setCount((long) count);
        aggregated.setSum(sum);
        aggregated.setMin(min == Double.MAX_VALUE ? null : min);
        aggregated.setMax(max == Double.MIN_VALUE ? null : max);
        aggregated.setUnit(unit);
        aggregated.setEnvironment(environment);
        
        // Set window times
        Instant startInstant = Instant.ofEpochMilli(window.window().start());
        Instant endInstant = Instant.ofEpochMilli(window.window().end());
        aggregated.setWindowStart(LocalDateTime.ofInstant(startInstant, ZoneOffset.UTC));
        aggregated.setWindowEnd(LocalDateTime.ofInstant(endInstant, ZoneOffset.UTC));
        
        // Calculate aggregated value
        switch (aggregationType.toUpperCase()) {
            case "AVG":
                aggregated.setValue(count > 0 ? sum / count : 0.0);
                break;
            case "SUM":
                aggregated.setValue(sum);
                break;
            case "MIN":
                aggregated.setValue(min == Double.MAX_VALUE ? null : min);
                break;
            case "MAX":
                aggregated.setValue(max == Double.MIN_VALUE ? null : max);
                break;
            case "COUNT":
                aggregated.setValue((double) count);
                break;
            default:
                aggregated.setValue(count > 0 ? sum / count : 0.0);
        }
        
        return aggregated;
    }

    // Getters
    public List<MetricData> getMetrics() { return metrics; }
    public double getSum() { return sum; }
    public double getMin() { return min; }
    public double getMax() { return max; }
    public int getCount() { return count; }
}

/**
 * Stream processing statistics
 */
package com.monitoring.dataprocessing.model;

import java.time.LocalDateTime;

public class StreamProcessingStatistics {
    private long processedMetrics;
    private long invalidMetrics;
    private long aggregatedMetrics;
    private long anomaliesDetected;
    private double processingRate;
    private LocalDateTime timestamp;

    // Getters and Setters
    public long getProcessedMetrics() { return processedMetrics; }
    public void setProcessedMetrics(long processedMetrics) { this.processedMetrics = processedMetrics; }

    public long getInvalidMetrics() { return invalidMetrics; }
    public void setInvalidMetrics(long invalidMetrics) { this.invalidMetrics = invalidMetrics; }

    public long getAggregatedMetrics() { return aggregatedMetrics; }
    public void setAggregatedMetrics(long aggregatedMetrics) { this.aggregatedMetrics = aggregatedMetrics; }

    public long getAnomaliesDetected() { return anomaliesDetected; }
    public void setAnomaliesDetected(long anomaliesDetected) { this.anomaliesDetected = anomaliesDetected; }

    public double getProcessingRate() { return processingRate; }
    public void setProcessingRate(double processingRate) { this.processingRate = processingRate; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
