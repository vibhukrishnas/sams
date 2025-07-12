package com.sams.enterprise.repository;

import com.sams.enterprise.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Enterprise Alert Repository with Advanced Queries
 */
@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByServerIdOrderByCreatedAtDesc(Long serverId);
    
    List<Alert> findBySeverityOrderByCreatedAtDesc(Alert.AlertSeverity severity);
    
    List<Alert> findByStatusOrderByCreatedAtDesc(Alert.AlertStatus status);
    
    List<Alert> findBySeverityAndStatusOrderByCreatedAtDesc(Alert.AlertSeverity severity, Alert.AlertStatus status);
    
    Optional<Alert> findByFingerprintAndStatusIn(String fingerprint, List<Alert.AlertStatus> statuses);
    
    List<Alert> findByRuleIdAndStatus(String ruleId, Alert.AlertStatus status);
    
    long countByStatus(Alert.AlertStatus status);
    
    long countBySeverityAndStatus(Alert.AlertSeverity severity, Alert.AlertStatus status);
    
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.resolvedAt >= :startOfDay AND a.resolvedAt < :endOfDay")
    long countResolvedToday(@Param("startOfDay") LocalDate date);
    
    @Query("SELECT a FROM Alert a WHERE a.nextEscalationAt IS NOT NULL AND a.nextEscalationAt <= :now AND a.status IN ('OPEN', 'ACKNOWLEDGED')")
    List<Alert> findAlertsNeedingEscalation(@Param("now") LocalDateTime now);
    
    @Query("SELECT a FROM Alert a WHERE a.lastOccurrence < :threshold AND a.status IN ('OPEN', 'ACKNOWLEDGED')")
    List<Alert> findStaleAlerts(@Param("threshold") LocalDateTime threshold);
    
    @Query("SELECT a FROM Alert a WHERE " +
           "(:serverId IS NULL OR a.server.id = :serverId) AND " +
           "a.type = :type AND " +
           "a.severity = :severity AND " +
           "a.createdAt >= :since AND " +
           "a.status IN ('OPEN', 'ACKNOWLEDGED')")
    List<Alert> findRelatedAlerts(@Param("serverId") Long serverId, 
                                 @Param("type") Alert.AlertType type,
                                 @Param("severity") Alert.AlertSeverity severity,
                                 @Param("since") LocalDateTime since);
    
    @Query("SELECT a FROM Alert a WHERE a.correlationId = :correlationId")
    List<Alert> findByCorrelationId(@Param("correlationId") String correlationId);
    
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.createdAt >= :startDate AND a.createdAt < :endDate")
    long countAlertsInPeriod(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT a.severity, COUNT(a) FROM Alert a WHERE a.createdAt >= :since GROUP BY a.severity")
    List<Object[]> getAlertCountsBySeveritySince(@Param("since") LocalDateTime since);
    
    @Query("SELECT a.type, COUNT(a) FROM Alert a WHERE a.createdAt >= :since GROUP BY a.type")
    List<Object[]> getAlertCountsByTypeSince(@Param("since") LocalDateTime since);
}
