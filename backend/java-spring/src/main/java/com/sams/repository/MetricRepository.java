package com.sams.repository;

import com.sams.models.Metric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface MetricRepository extends JpaRepository<Metric, Long> {
    List<Metric> findByAgentIdAndTimestampAfterOrderByTimestampDesc(String agentId, LocalDateTime since);

    @Query(value = "SELECT * FROM metrics WHERE agent_id = :agentId AND timestamp > :since ORDER BY timestamp DESC LIMIT :limit", nativeQuery = true)
    List<Metric> findRecentMetrics(@Param("agentId") String agentId, @Param("since") LocalDateTime since, @Param("limit") int limit);

    @Query("SELECT m FROM Metric m WHERE m.agentId = :agentId AND m.timestamp BETWEEN :start AND :end")
    List<Metric> findMetricsInRange(@Param("agentId") String agentId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "DELETE FROM metrics WHERE timestamp < :cutoff", nativeQuery = true)
    void deleteOldMetrics(@Param("cutoff") LocalDateTime cutoff);
}
