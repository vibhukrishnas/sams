package com.sams.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "metric")
public class Metric {
    @Id
    @GeneratedValue
    private UUID id;
    private String agentId;
    private Double cpuUsage;
    private Double memoryUsage;
    private String metricType;
    private String metricName;
    @Column(name = "metric_value")  // Renamed to avoid SQL reserved keyword 'value'
    private Double value;
    private String unit;
    private Instant timestamp;
    private UUID hostId;
    private String hostName;
    private String tags;
    private Double thresholdWarning;
    private Double thresholdCritical;
    private String status;
    private String source;
    private String additionalInfo;
}
