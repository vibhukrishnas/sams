package com.sams.enterprise.repository;

import com.sams.enterprise.entity.ServerMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Server Metric Repository
 */
@Repository
public interface ServerMetricRepository extends JpaRepository<ServerMetric, Long> {
    
    List<ServerMetric> findByServerIdAndTimestampAfter(Long serverId, LocalDateTime timestamp);
    
    List<ServerMetric> findByServerIdAndMetricNameAndTimestampAfter(Long serverId, String metricName, LocalDateTime timestamp);
    
    List<ServerMetric> findByMetricNameAndTimestampAfter(String metricName, LocalDateTime timestamp);
}
