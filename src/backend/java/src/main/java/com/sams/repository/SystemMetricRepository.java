package com.sams.repository;

import com.sams.entity.SystemMetric;
import com.sams.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for SystemMetric entity
 */
@Repository
public interface SystemMetricRepository extends JpaRepository<SystemMetric, Long> {
    
    /**
     * Find all metrics for a specific server
     */
    List<SystemMetric> findByServerOrderByTimestampDesc(Server server);
    
    /**
     * Find metrics for a server within a time range
     */
    List<SystemMetric> findByServerAndTimestampBetweenOrderByTimestampDesc(
            Server server, LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * Find latest metric for a server
     */
    SystemMetric findTopByServerOrderByTimestampDesc(Server server);
    
    /**
     * Find metrics by metric type
     */
    List<SystemMetric> findByMetricTypeOrderByTimestampDesc(String metricType);
    
    /**
     * Get average CPU usage for a server in the last hour
     */
    @Query("SELECT AVG(sm.metricValue) FROM SystemMetric sm " +
           "WHERE sm.server = :server AND sm.metricType = 'CPU_USAGE' " +
           "AND sm.timestamp >= :since")
    Double getAverageCpuUsage(@Param("server") Server server, @Param("since") LocalDateTime since);
    
    /**
     * Get average memory usage for a server in the last hour
     */
    @Query("SELECT AVG(sm.metricValue) FROM SystemMetric sm " +
           "WHERE sm.server = :server AND sm.metricType = 'MEMORY_USAGE' " +
           "AND sm.timestamp >= :since")
    Double getAverageMemoryUsage(@Param("server") Server server, @Param("since") LocalDateTime since);
    
    /**
     * Delete old metrics (older than specified date)
     */
    void deleteByTimestampBefore(LocalDateTime cutoffDate);
    
    /**
     * Count metrics for a server
     */
    long countByServer(Server server);
    
    /**
     * Find metrics with values above threshold
     */
    @Query("SELECT sm FROM SystemMetric sm " +
           "WHERE sm.server = :server AND sm.metricType = :metricType " +
           "AND sm.metricValue > :threshold AND sm.timestamp >= :since " +
           "ORDER BY sm.timestamp DESC")
    List<SystemMetric> findHighUsageMetrics(@Param("server") Server server, 
                                          @Param("metricType") String metricType,
                                          @Param("threshold") Double threshold, 
                                          @Param("since") LocalDateTime since);
    
    /**
     * Find metrics by timestamp after a certain date ordered by timestamp desc
     */
    List<SystemMetric> findByTimestampAfterOrderByTimestampDesc(LocalDateTime timestamp);
}
