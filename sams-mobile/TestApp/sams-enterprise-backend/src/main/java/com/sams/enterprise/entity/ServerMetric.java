package com.sams.enterprise.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Enterprise Server Metric Entity for Time-Series Data
 */
@Entity
@Table(name = "server_metrics", indexes = {
    @Index(name = "idx_metric_server_time", columnList = "server_id, timestamp"),
    @Index(name = "idx_metric_name_time", columnList = "metric_name, timestamp"),
    @Index(name = "idx_metric_timestamp", columnList = "timestamp")
})
public class ServerMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id", nullable = false)
    private Server server;

    @NotBlank
    @Column(name = "metric_name", nullable = false)
    private String metricName;

    @NotNull
    @Column(nullable = false)
    private Double value;

    @Column
    private String unit;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricType type = MetricType.GAUGE;

    @ElementCollection
    @CollectionTable(name = "metric_tags", joinColumns = @JoinColumn(name = "metric_id"))
    @MapKeyColumn(name = "tag_key")
    @Column(name = "tag_value")
    private Map<String, String> tags = new HashMap<>();

    @Column(name = "aggregation_period")
    private Integer aggregationPeriod; // in seconds

    @Column(name = "sample_count")
    private Integer sampleCount = 1;

    @Column(name = "min_value")
    private Double minValue;

    @Column(name = "max_value")
    private Double maxValue;

    @Column(name = "sum_value")
    private Double sumValue;

    // Constructors
    public ServerMetric() {}

    public ServerMetric(Server server, String metricName, Double value, String unit, MetricType type) {
        this.server = server;
        this.metricName = metricName;
        this.value = value;
        this.unit = unit;
        this.type = type;
        this.timestamp = LocalDateTime.now();
        this.minValue = value;
        this.maxValue = value;
        this.sumValue = value;
    }

    // Business Methods
    public void updateAggregation(Double newValue) {
        this.sampleCount++;
        this.sumValue += newValue;
        this.value = this.sumValue / this.sampleCount; // Average
        
        if (newValue < this.minValue) {
            this.minValue = newValue;
        }
        if (newValue > this.maxValue) {
            this.maxValue = newValue;
        }
    }

    public boolean isRecent(int minutes) {
        return timestamp.isAfter(LocalDateTime.now().minusMinutes(minutes));
    }

    public boolean isStale(int minutes) {
        return timestamp.isBefore(LocalDateTime.now().minusMinutes(minutes));
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Server getServer() { return server; }
    public void setServer(Server server) { this.server = server; }

    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public MetricType getType() { return type; }
    public void setType(MetricType type) { this.type = type; }

    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }

    public Integer getAggregationPeriod() { return aggregationPeriod; }
    public void setAggregationPeriod(Integer aggregationPeriod) { this.aggregationPeriod = aggregationPeriod; }

    public Integer getSampleCount() { return sampleCount; }
    public void setSampleCount(Integer sampleCount) { this.sampleCount = sampleCount; }

    public Double getMinValue() { return minValue; }
    public void setMinValue(Double minValue) { this.minValue = minValue; }

    public Double getMaxValue() { return maxValue; }
    public void setMaxValue(Double maxValue) { this.maxValue = maxValue; }

    public Double getSumValue() { return sumValue; }
    public void setSumValue(Double sumValue) { this.sumValue = sumValue; }

    // Enums
    public enum MetricType {
        GAUGE,      // Point-in-time value (CPU usage, memory usage)
        COUNTER,    // Monotonically increasing value (requests served, bytes sent)
        HISTOGRAM,  // Distribution of values (response times)
        SUMMARY     // Summary statistics (quantiles)
    }

    // Standard Metric Names
    public static final String CPU_USAGE = "cpu.usage.percent";
    public static final String MEMORY_USAGE = "memory.usage.percent";
    public static final String MEMORY_AVAILABLE = "memory.available.bytes";
    public static final String DISK_USAGE = "disk.usage.percent";
    public static final String DISK_FREE = "disk.free.bytes";
    public static final String NETWORK_IN = "network.in.bytes";
    public static final String NETWORK_OUT = "network.out.bytes";
    public static final String LOAD_AVERAGE_1M = "load.average.1m";
    public static final String LOAD_AVERAGE_5M = "load.average.5m";
    public static final String LOAD_AVERAGE_15M = "load.average.15m";
    public static final String UPTIME = "system.uptime.seconds";
    public static final String PROCESS_COUNT = "process.count";
    public static final String CONNECTION_COUNT = "connection.count";
    public static final String RESPONSE_TIME = "response.time.ms";
    public static final String ERROR_RATE = "error.rate.percent";
    public static final String THROUGHPUT = "throughput.requests_per_second";
}
