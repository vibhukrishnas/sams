package com.sams.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

/**
 * System Metrics Entity for storing performance data
 */
@Entity
@Table(name = "system_metrics")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SystemMetric {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull(message = "Metric name is required")
    @Column(name = "metric_name", nullable = false)
    private String metricName;
    
    @NotNull(message = "Metric value is required")
    @Column(name = "metric_value", nullable = false)
    private Double metricValue;
    
    @Column(name = "metric_unit")
    private String metricUnit;
    
    @Column(name = "metric_type")
    private String metricType;
    
    @Column(name = "timestamp")
    private LocalDateTime timestamp;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id")
    private Server server;
    
    // Constructors
    public SystemMetric() {
        this.timestamp = LocalDateTime.now();
    }
    
    public SystemMetric(String metricName, Double metricValue, String metricUnit) {
        this();
        this.metricName = metricName;
        this.metricValue = metricValue;
        this.metricUnit = metricUnit;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getMetricName() { return metricName; }
    public void setMetricName(String metricName) { this.metricName = metricName; }
    
    public Double getMetricValue() { return metricValue; }
    public void setMetricValue(Double metricValue) { this.metricValue = metricValue; }
    
    // Alternative method name for compatibility
    public Double getValue() { return metricValue; }
    public void setValue(Double value) { this.metricValue = value; }
    
    public String getMetricUnit() { return metricUnit; }
    public void setMetricUnit(String metricUnit) { this.metricUnit = metricUnit; }
    
    // Alternative method name for compatibility
    public String getUnit() { return metricUnit; }
    public void setUnit(String unit) { this.metricUnit = unit; }
    
    public String getMetricType() { return metricType; }
    public void setMetricType(String metricType) { this.metricType = metricType; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public Server getServer() { return server; }
    public void setServer(Server server) { this.server = server; }
    
    @Override
    public String toString() {
        return "SystemMetric{" +
                "id=" + id +
                ", metricName='" + metricName + '\'' +
                ", metricValue=" + metricValue +
                ", metricUnit='" + metricUnit + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
