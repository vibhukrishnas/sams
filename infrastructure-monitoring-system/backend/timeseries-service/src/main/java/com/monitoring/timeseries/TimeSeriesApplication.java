/**
 * 📊 Time-Series Database Service - InfluxDB Integration
 * Optimized time-series data storage and retrieval with performance monitoring
 */

package com.monitoring.timeseries;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableScheduling
public class TimeSeriesApplication {

    public static void main(String[] args) {
        SpringApplication.run(TimeSeriesApplication.class, args);
    }
}

/**
 * InfluxDB configuration
 */
package com.monitoring.timeseries.config;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.WriteApi;
import com.influxdb.client.QueryApi;
import com.influxdb.client.DeleteApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InfluxDBConfig {

    @Value("${influxdb.url}")
    private String influxUrl;

    @Value("${influxdb.token}")
    private String influxToken;

    @Value("${influxdb.org}")
    private String influxOrg;

    @Value("${influxdb.bucket}")
    private String influxBucket;

    @Bean
    public InfluxDBClient influxDBClient() {
        return InfluxDBClientFactory.create(influxUrl, influxToken.toCharArray(), influxOrg, influxBucket);
    }

    @Bean
    public WriteApi writeApi(InfluxDBClient influxDBClient) {
        return influxDBClient.makeWriteApi();
    }

    @Bean
    public QueryApi queryApi(InfluxDBClient influxDBClient) {
        return influxDBClient.getQueryApi();
    }

    @Bean
    public DeleteApi deleteApi(InfluxDBClient influxDBClient) {
        return influxDBClient.getDeleteApi();
    }

    public String getInfluxOrg() { return influxOrg; }
    public String getInfluxBucket() { return influxBucket; }
}

/**
 * Time-series data service with optimized operations
 */
package com.monitoring.timeseries.service;

import com.influxdb.client.*;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import com.monitoring.timeseries.config.InfluxDBConfig;
import com.monitoring.timeseries.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class TimeSeriesService {

    private static final Logger logger = LoggerFactory.getLogger(TimeSeriesService.class);

    @Autowired
    private InfluxDBClient influxDBClient;

    @Autowired
    private WriteApi writeApi;

    @Autowired
    private QueryApi queryApi;

    @Autowired
    private DeleteApi deleteApi;

    @Autowired
    private InfluxDBConfig influxConfig;

    // Performance metrics
    private final AtomicLong totalWrites = new AtomicLong(0);
    private final AtomicLong totalReads = new AtomicLong(0);
    private final AtomicLong failedWrites = new AtomicLong(0);
    private final AtomicLong failedReads = new AtomicLong(0);

    /**
     * Listen for metrics from Kafka and store in InfluxDB
     */
    @KafkaListener(topics = "monitoring.metrics.processed", groupId = "timeseries-storage")
    @Async
    public void storeMetrics(List<MetricDataPoint> metrics) {
        logger.debug("📊 Storing {} metrics to InfluxDB", metrics.size());

        try {
            List<Point> points = metrics.stream()
                    .filter(this::validateMetric)
                    .map(this::convertToInfluxPoint)
                    .collect(Collectors.toList());

            if (!points.isEmpty()) {
                writeApi.writePoints(points);
                totalWrites.addAndGet(points.size());
                logger.debug("✅ Successfully stored {} metrics", points.size());
            }

        } catch (Exception e) {
            logger.error("❌ Error storing metrics to InfluxDB: {}", e.getMessage(), e);
            failedWrites.addAndGet(metrics.size());
        }
    }

    /**
     * Store single metric data point
     */
    @Async
    public CompletableFuture<Void> storeMetric(MetricDataPoint metric) {
        return CompletableFuture.runAsync(() -> {
            try {
                if (validateMetric(metric)) {
                    Point point = convertToInfluxPoint(metric);
                    writeApi.writePoint(point);
                    totalWrites.incrementAndGet();
                    logger.debug("✅ Stored metric: {}", metric.getMetricName());
                }
            } catch (Exception e) {
                logger.error("❌ Error storing metric {}: {}", metric.getMetricName(), e.getMessage(), e);
                failedWrites.incrementAndGet();
            }
        });
    }

    /**
     * Store aggregated metrics
     */
    @KafkaListener(topics = {"monitoring.metrics.aggregated.1m", "monitoring.metrics.aggregated.5m", 
                            "monitoring.metrics.aggregated.15m", "monitoring.metrics.aggregated.1h"}, 
                   groupId = "timeseries-aggregated")
    @Async
    public void storeAggregatedMetrics(List<AggregatedMetricDataPoint> aggregatedMetrics) {
        logger.debug("📈 Storing {} aggregated metrics to InfluxDB", aggregatedMetrics.size());

        try {
            List<Point> points = aggregatedMetrics.stream()
                    .filter(this::validateAggregatedMetric)
                    .map(this::convertAggregatedToInfluxPoint)
                    .collect(Collectors.toList());

            if (!points.isEmpty()) {
                writeApi.writePoints(points);
                totalWrites.addAndGet(points.size());
                logger.debug("✅ Successfully stored {} aggregated metrics", points.size());
            }

        } catch (Exception e) {
            logger.error("❌ Error storing aggregated metrics to InfluxDB: {}", e.getMessage(), e);
            failedWrites.addAndGet(aggregatedMetrics.size());
        }
    }

    /**
     * Query metrics for dashboard with caching
     */
    @Cacheable(value = "dashboard-metrics", key = "#request.getCacheKey()")
    public DashboardMetricsResponse queryDashboardMetrics(DashboardMetricsRequest request) {
        logger.debug("📊 Querying dashboard metrics: {}", request);

        try {
            totalReads.incrementAndGet();

            String fluxQuery = buildDashboardQuery(request);
            List<FluxTable> tables = queryApi.query(fluxQuery, influxConfig.getInfluxOrg());

            DashboardMetricsResponse response = new DashboardMetricsResponse();
            response.setRequest(request);
            response.setMetrics(parseFluxTables(tables));
            response.setTimestamp(LocalDateTime.now());
            response.setQueryExecutionTime(System.currentTimeMillis() - request.getStartTime());

            logger.debug("✅ Retrieved {} metric series for dashboard", response.getMetrics().size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error querying dashboard metrics: {}", e.getMessage(), e);
            failedReads.incrementAndGet();
            throw new RuntimeException("Failed to query dashboard metrics", e);
        }
    }

    /**
     * Query historical metrics with optimization
     */
    public HistoricalMetricsResponse queryHistoricalMetrics(HistoricalMetricsRequest request) {
        logger.debug("📈 Querying historical metrics: {}", request);

        try {
            totalReads.incrementAndGet();

            String fluxQuery = buildHistoricalQuery(request);
            List<FluxTable> tables = queryApi.query(fluxQuery, influxConfig.getInfluxOrg());

            HistoricalMetricsResponse response = new HistoricalMetricsResponse();
            response.setRequest(request);
            response.setMetrics(parseFluxTables(tables));
            response.setTimestamp(LocalDateTime.now());

            logger.debug("✅ Retrieved {} historical metric points", response.getMetrics().size());
            return response;

        } catch (Exception e) {
            logger.error("❌ Error querying historical metrics: {}", e.getMessage(), e);
            failedReads.incrementAndGet();
            throw new RuntimeException("Failed to query historical metrics", e);
        }
    }

    /**
     * Query real-time metrics for alerts
     */
    public List<MetricDataPoint> queryRealtimeMetrics(String serverId, String metricName, 
                                                     LocalDateTime startTime, LocalDateTime endTime) {
        logger.debug("⚡ Querying real-time metrics: {} - {}", serverId, metricName);

        try {
            totalReads.incrementAndGet();

            String fluxQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: %s, stop: %s)
                  |> filter(fn: (r) => r["_measurement"] == "metrics")
                  |> filter(fn: (r) => r["server_id"] == "%s")
                  |> filter(fn: (r) => r["metric_name"] == "%s")
                  |> filter(fn: (r) => r["_field"] == "value")
                  |> sort(columns: ["_time"], desc: false)
                """, 
                influxConfig.getInfluxBucket(),
                startTime.toInstant(ZoneOffset.UTC),
                endTime.toInstant(ZoneOffset.UTC),
                serverId,
                metricName
            );

            List<FluxTable> tables = queryApi.query(fluxQuery, influxConfig.getInfluxOrg());
            List<MetricDataPoint> metrics = parseFluxTablesToMetrics(tables);

            logger.debug("✅ Retrieved {} real-time metric points", metrics.size());
            return metrics;

        } catch (Exception e) {
            logger.error("❌ Error querying real-time metrics: {}", e.getMessage(), e);
            failedReads.incrementAndGet();
            return new ArrayList<>();
        }
    }

    /**
     * Get metric statistics for performance monitoring
     */
    public MetricStatistics getMetricStatistics(String serverId, String metricName, 
                                              LocalDateTime startTime, LocalDateTime endTime) {
        logger.debug("📊 Getting metric statistics: {} - {}", serverId, metricName);

        try {
            String fluxQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: %s, stop: %s)
                  |> filter(fn: (r) => r["_measurement"] == "metrics")
                  |> filter(fn: (r) => r["server_id"] == "%s")
                  |> filter(fn: (r) => r["metric_name"] == "%s")
                  |> filter(fn: (r) => r["_field"] == "value")
                  |> group()
                  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
                  |> yield(name: "mean")
                """,
                influxConfig.getInfluxBucket(),
                startTime.toInstant(ZoneOffset.UTC),
                endTime.toInstant(ZoneOffset.UTC),
                serverId,
                metricName
            );

            List<FluxTable> tables = queryApi.query(fluxQuery, influxConfig.getInfluxOrg());
            return calculateStatistics(tables, serverId, metricName);

        } catch (Exception e) {
            logger.error("❌ Error getting metric statistics: {}", e.getMessage(), e);
            return new MetricStatistics();
        }
    }

    /**
     * Delete old metrics based on retention policy
     */
    @Async
    public void deleteOldMetrics(LocalDateTime cutoffTime) {
        logger.info("🗑️ Deleting metrics older than: {}", cutoffTime);

        try {
            Instant start = Instant.EPOCH;
            Instant stop = cutoffTime.toInstant(ZoneOffset.UTC);

            deleteApi.delete(start, stop, "", influxConfig.getInfluxBucket(), influxConfig.getInfluxOrg());

            logger.info("✅ Successfully deleted old metrics before: {}", cutoffTime);

        } catch (Exception e) {
            logger.error("❌ Error deleting old metrics: {}", e.getMessage(), e);
        }
    }

    /**
     * Get database performance metrics
     */
    public DatabasePerformanceMetrics getPerformanceMetrics() {
        DatabasePerformanceMetrics metrics = new DatabasePerformanceMetrics();
        metrics.setTotalWrites(totalWrites.get());
        metrics.setTotalReads(totalReads.get());
        metrics.setFailedWrites(failedWrites.get());
        metrics.setFailedReads(failedReads.get());
        metrics.setWriteSuccessRate(calculateSuccessRate(totalWrites.get(), failedWrites.get()));
        metrics.setReadSuccessRate(calculateSuccessRate(totalReads.get(), failedReads.get()));
        metrics.setTimestamp(LocalDateTime.now());

        // Get InfluxDB health status
        try {
            boolean isHealthy = influxDBClient.health().getStatus().getValue().equals("pass");
            metrics.setDatabaseHealthy(isHealthy);
        } catch (Exception e) {
            metrics.setDatabaseHealthy(false);
            logger.warn("⚠️ Unable to check InfluxDB health: {}", e.getMessage());
        }

        return metrics;
    }

    // Helper methods
    private boolean validateMetric(MetricDataPoint metric) {
        return metric != null &&
               metric.getServerId() != null &&
               metric.getMetricName() != null && !metric.getMetricName().trim().isEmpty() &&
               metric.getValue() != null && !metric.getValue().isNaN() && !metric.getValue().isInfinite() &&
               metric.getTimestamp() != null;
    }

    private boolean validateAggregatedMetric(AggregatedMetricDataPoint metric) {
        return metric != null &&
               metric.getServerId() != null &&
               metric.getMetricName() != null && !metric.getMetricName().trim().isEmpty() &&
               metric.getValue() != null && !metric.getValue().isNaN() && !metric.getValue().isInfinite() &&
               metric.getWindowStart() != null &&
               metric.getWindowEnd() != null;
    }

    private Point convertToInfluxPoint(MetricDataPoint metric) {
        Point point = Point.measurement("metrics")
                .time(metric.getTimestamp().toInstant(ZoneOffset.UTC), WritePrecision.NS)
                .addTag("server_id", metric.getServerId().toString())
                .addTag("metric_name", metric.getMetricName())
                .addTag("organization_id", metric.getOrganizationId().toString())
                .addField("value", metric.getValue());

        // Add optional tags
        if (metric.getUnit() != null) {
            point.addTag("unit", metric.getUnit());
        }
        if (metric.getEnvironment() != null) {
            point.addTag("environment", metric.getEnvironment());
        }
        if (metric.getSource() != null) {
            point.addTag("source", metric.getSource());
        }

        // Add custom tags
        if (metric.getTags() != null) {
            metric.getTags().forEach(point::addTag);
        }

        return point;
    }

    private Point convertAggregatedToInfluxPoint(AggregatedMetricDataPoint metric) {
        Point point = Point.measurement("aggregated_metrics")
                .time(metric.getWindowEnd().toInstant(ZoneOffset.UTC), WritePrecision.NS)
                .addTag("server_id", metric.getServerId().toString())
                .addTag("metric_name", metric.getMetricName())
                .addTag("organization_id", metric.getOrganizationId().toString())
                .addTag("aggregation_type", metric.getAggregationType())
                .addTag("window_size", metric.getWindowSize())
                .addField("value", metric.getValue())
                .addField("count", metric.getCount());

        // Add statistical fields
        if (metric.getMin() != null) {
            point.addField("min", metric.getMin());
        }
        if (metric.getMax() != null) {
            point.addField("max", metric.getMax());
        }
        if (metric.getSum() != null) {
            point.addField("sum", metric.getSum());
        }

        return point;
    }

    private String buildDashboardQuery(DashboardMetricsRequest request) {
        StringBuilder query = new StringBuilder();
        query.append(String.format("from(bucket: \"%s\")\n", influxConfig.getInfluxBucket()));
        query.append(String.format("  |> range(start: %s, stop: %s)\n", 
                request.getStartTime().toInstant(ZoneOffset.UTC),
                request.getEndTime().toInstant(ZoneOffset.UTC)));
        query.append("  |> filter(fn: (r) => r[\"_measurement\"] == \"metrics\")\n");
        
        if (request.getServerIds() != null && !request.getServerIds().isEmpty()) {
            String serverFilter = request.getServerIds().stream()
                    .map(id -> String.format("r[\"server_id\"] == \"%s\"", id))
                    .collect(Collectors.joining(" or "));
            query.append(String.format("  |> filter(fn: (r) => %s)\n", serverFilter));
        }
        
        if (request.getMetricNames() != null && !request.getMetricNames().isEmpty()) {
            String metricFilter = request.getMetricNames().stream()
                    .map(name -> String.format("r[\"metric_name\"] == \"%s\"", name))
                    .collect(Collectors.joining(" or "));
            query.append(String.format("  |> filter(fn: (r) => %s)\n", metricFilter));
        }
        
        query.append("  |> filter(fn: (r) => r[\"_field\"] == \"value\")\n");
        
        if (request.getAggregationWindow() != null) {
            query.append(String.format("  |> aggregateWindow(every: %s, fn: %s, createEmpty: false)\n",
                    request.getAggregationWindow(), request.getAggregationFunction()));
        }
        
        query.append("  |> sort(columns: [\"_time\"], desc: false)");
        
        return query.toString();
    }

    private String buildHistoricalQuery(HistoricalMetricsRequest request) {
        // Similar to dashboard query but optimized for historical data
        return buildDashboardQuery(request.toDashboardRequest());
    }

    private List<MetricSeries> parseFluxTables(List<FluxTable> tables) {
        Map<String, MetricSeries> seriesMap = new HashMap<>();
        
        for (FluxTable table : tables) {
            for (FluxRecord record : table.getRecords()) {
                String seriesKey = String.format("%s:%s", 
                        record.getValueByKey("server_id"),
                        record.getValueByKey("metric_name"));
                
                MetricSeries series = seriesMap.computeIfAbsent(seriesKey, k -> {
                    MetricSeries s = new MetricSeries();
                    s.setServerId(UUID.fromString((String) record.getValueByKey("server_id")));
                    s.setMetricName((String) record.getValueByKey("metric_name"));
                    s.setDataPoints(new ArrayList<>());
                    return s;
                });
                
                MetricDataPoint point = new MetricDataPoint();
                point.setTimestamp(LocalDateTime.ofInstant(record.getTime(), ZoneOffset.UTC));
                point.setValue(((Number) record.getValue()).doubleValue());
                series.getDataPoints().add(point);
            }
        }
        
        return new ArrayList<>(seriesMap.values());
    }

    private List<MetricDataPoint> parseFluxTablesToMetrics(List<FluxTable> tables) {
        List<MetricDataPoint> metrics = new ArrayList<>();
        
        for (FluxTable table : tables) {
            for (FluxRecord record : table.getRecords()) {
                MetricDataPoint metric = new MetricDataPoint();
                metric.setServerId(UUID.fromString((String) record.getValueByKey("server_id")));
                metric.setMetricName((String) record.getValueByKey("metric_name"));
                metric.setValue(((Number) record.getValue()).doubleValue());
                metric.setTimestamp(LocalDateTime.ofInstant(record.getTime(), ZoneOffset.UTC));
                metrics.add(metric);
            }
        }
        
        return metrics;
    }

    private MetricStatistics calculateStatistics(List<FluxTable> tables, String serverId, String metricName) {
        MetricStatistics stats = new MetricStatistics();
        stats.setServerId(UUID.fromString(serverId));
        stats.setMetricName(metricName);
        
        List<Double> values = new ArrayList<>();
        for (FluxTable table : tables) {
            for (FluxRecord record : table.getRecords()) {
                values.add(((Number) record.getValue()).doubleValue());
            }
        }
        
        if (!values.isEmpty()) {
            stats.setCount(values.size());
            stats.setMin(values.stream().mapToDouble(Double::doubleValue).min().orElse(0.0));
            stats.setMax(values.stream().mapToDouble(Double::doubleValue).max().orElse(0.0));
            stats.setAverage(values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
            stats.setSum(values.stream().mapToDouble(Double::doubleValue).sum());
        }
        
        return stats;
    }

    private double calculateSuccessRate(long total, long failed) {
        if (total == 0) return 100.0;
        return ((double) (total - failed) / total) * 100.0;
    }
}
