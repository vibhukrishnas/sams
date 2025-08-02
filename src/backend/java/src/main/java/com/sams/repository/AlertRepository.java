package com.sams.repository;

import com.sams.entity.Alert;
import com.sams.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Alert Repository for database operations
 */
@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    
    /**
     * Find alerts by server
     */
    List<Alert> findByServer(Server server);
    
    /**
     * Find alerts by server ID
     */
    List<Alert> findByServerId(Long serverId);
    
    /**
     * Find alerts by status
     */
    List<Alert> findByStatus(Alert.AlertStatus status);
    
    /**
     * Find alerts by severity
     */
    List<Alert> findBySeverity(Alert.AlertSeverity severity);
    
    /**
     * Find open alerts
     */
    @Query("SELECT a FROM Alert a WHERE a.status = 'OPEN'")
    List<Alert> findOpenAlerts();
    
    /**
     * Find critical alerts
     */
    @Query("SELECT a FROM Alert a WHERE a.severity = 'CRITICAL' AND a.status = 'OPEN'")
    List<Alert> findCriticalAlerts();
    
    /**
     * Find alerts created after a specific date
     */
    List<Alert> findByCreatedAtAfter(LocalDateTime dateTime);
    
    /**
     * Find alerts by server and status
     */
    List<Alert> findByServerAndStatus(Server server, Alert.AlertStatus status);
    
    /**
     * Count open alerts by server
     */
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.server.id = :serverId AND a.status = 'OPEN'")
    Long countOpenAlertsByServerId(@Param("serverId") Long serverId);
    
    /**
     * Get alert statistics by severity
     */
    @Query("SELECT COUNT(a), a.severity FROM Alert a WHERE a.status = 'ACTIVE' GROUP BY a.severity")
    List<Object[]> getAlertSeverityStatistics();
    
    /**
     * Find alerts by server ordered by triggered date
     */
    List<Alert> findByServerOrderByTriggeredAtDesc(Server server);
    
    /**
     * Find alerts by status ordered by triggered date
     */
    List<Alert> findByStatusOrderByTriggeredAtDesc(Alert.AlertStatus status);
    
    /**
     * Find alerts by severity ordered by triggered date
     */
    List<Alert> findBySeverityOrderByTriggeredAtDesc(Alert.AlertSeverity severity);
    
    /**
     * Count alerts by status
     */
    long countByStatus(Alert.AlertStatus status);
    
    /**
     * Count alerts by severity and status
     */
    long countBySeverityAndStatus(Alert.AlertSeverity severity, Alert.AlertStatus status);
    
    /**
     * Count alerts by server and status
     */
    Integer countByServerAndStatus(Server server, Alert.AlertStatus status);
    
    /**
     * Check if alert exists with message containing text and status
     */
    boolean existsByServerAndMessageContainingAndStatus(Server server, String messageText, Alert.AlertStatus status);
    
    /**
     * Find active alerts older than specified date
     */
    @Query("SELECT a FROM Alert a WHERE a.status = 'ACTIVE' AND a.triggeredAt < :cutoffDate")
    List<Alert> findActiveAlertsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    /**
     * Find resolved alerts older than specified date
     */
    @Query("SELECT a FROM Alert a WHERE a.status = 'RESOLVED' AND a.resolvedAt < :cutoffDate")
    List<Alert> findResolvedAlertsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    /**
     * Find recent alerts (last 24 hours)
     */
    @Query("SELECT a FROM Alert a WHERE a.createdAt >= :since ORDER BY a.createdAt DESC")
    List<Alert> findRecentAlerts(@Param("since") LocalDateTime since);
    
    /**
     * Find top 50 alerts ordered by creation date descending
     */
    List<Alert> findTop50ByOrderByCreatedAtDesc();
    
    /**
     * Find top 10 alerts ordered by creation date descending
     */
    List<Alert> findTop10ByOrderByCreatedAtDesc();
}
