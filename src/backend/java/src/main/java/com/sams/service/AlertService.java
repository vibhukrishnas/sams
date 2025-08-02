package com.sams.service;

import com.sams.entity.Alert;
import com.sams.entity.Server;
import com.sams.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service layer for Alert management
 */
@Service
@Transactional
public class AlertService {
    
    private static final Logger logger = LoggerFactory.getLogger(AlertService.class);
    
    @Autowired
    private AlertRepository alertRepository;
    
    /**
     * Create a new alert
     */
    public Alert createAlert(Server server, String title, String message, Alert.AlertSeverity severity) {
        logger.info("Creating alert for server {}: {}", server.getName(), title);
        
        Alert alert = new Alert();
        alert.setServer(server);
        alert.setTitle(title);
        alert.setMessage(message);
        alert.setSeverity(severity);
        alert.setStatus(Alert.AlertStatus.ACTIVE);
        alert.setTriggeredAt(LocalDateTime.now());
        
        return alertRepository.save(alert);
    }
    
    /**
     * Get all alerts with pagination
     */
    @Transactional(readOnly = true)
    public Page<Alert> getAllAlerts(Pageable pageable) {
        return alertRepository.findAll(pageable);
    }
    
    /**
     * Get active alerts
     */
    @Transactional(readOnly = true)
    public List<Alert> getActiveAlerts() {
        return alertRepository.findByStatusOrderByTriggeredAtDesc(Alert.AlertStatus.ACTIVE);
    }
    
    /**
     * Get alerts by server
     */
    @Transactional(readOnly = true)
    public List<Alert> getAlertsByServer(Server server) {
        return alertRepository.findByServerOrderByTriggeredAtDesc(server);
    }
    
    /**
     * Get alerts by severity
     */
    @Transactional(readOnly = true)
    public List<Alert> getAlertsBySeverity(Alert.AlertSeverity severity) {
        return alertRepository.findBySeverityOrderByTriggeredAtDesc(severity);
    }
    
    /**
     * Get critical alerts
     */
    @Transactional(readOnly = true)
    public List<Alert> getCriticalAlerts() {
        return getAlertsBySeverity(Alert.AlertSeverity.CRITICAL);
    }
    
    /**
     * Acknowledge an alert
     */
    public Optional<Alert> acknowledgeAlert(Long alertId) {
        logger.info("Acknowledging alert with ID: {}", alertId);
        
        return alertRepository.findById(alertId)
                .map(alert -> {
                    alert.setStatus(Alert.AlertStatus.ACKNOWLEDGED);
                    alert.setAcknowledgedAt(LocalDateTime.now());
                    return alertRepository.save(alert);
                });
    }
    
    /**
     * Resolve an alert
     */
    public Optional<Alert> resolveAlert(Long alertId) {
        logger.info("Resolving alert with ID: {}", alertId);
        
        return alertRepository.findById(alertId)
                .map(alert -> {
                    alert.setStatus(Alert.AlertStatus.RESOLVED);
                    alert.setResolvedAt(LocalDateTime.now());
                    return alertRepository.save(alert);
                });
    }
    
    /**
     * Auto-resolve old alerts (older than 24 hours and still active)
     */
    public int autoResolveOldAlerts() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        List<Alert> oldAlerts = alertRepository.findActiveAlertsOlderThan(cutoff);
        
        int resolvedCount = 0;
        for (Alert alert : oldAlerts) {
            alert.setStatus(Alert.AlertStatus.RESOLVED);
            alert.setResolvedAt(LocalDateTime.now());
            alertRepository.save(alert);
            resolvedCount++;
        }
        
        if (resolvedCount > 0) {
            logger.info("Auto-resolved {} old alerts", resolvedCount);
        }
        
        return resolvedCount;
    }
    
    /**
     * Get alert statistics
     */
    @Transactional(readOnly = true)
    public AlertStats getAlertStats() {
        long totalAlerts = alertRepository.count();
        long activeAlerts = alertRepository.countByStatus(Alert.AlertStatus.ACTIVE);
        long criticalAlerts = alertRepository.countBySeverityAndStatus(
                Alert.AlertSeverity.CRITICAL, Alert.AlertStatus.ACTIVE);
        long warningAlerts = alertRepository.countBySeverityAndStatus(
                Alert.AlertSeverity.WARNING, Alert.AlertStatus.ACTIVE);
        long infoAlerts = alertRepository.countBySeverityAndStatus(
                Alert.AlertSeverity.INFO, Alert.AlertStatus.ACTIVE);
        
        return new AlertStats(totalAlerts, activeAlerts, criticalAlerts, warningAlerts, infoAlerts);
    }
    
    /**
     * Delete resolved alerts older than specified days
     */
    public int cleanupOldResolvedAlerts(int daysOld) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysOld);
        List<Alert> oldResolvedAlerts = alertRepository.findResolvedAlertsOlderThan(cutoff);
        
        int deletedCount = oldResolvedAlerts.size();
        alertRepository.deleteAll(oldResolvedAlerts);
        
        if (deletedCount > 0) {
            logger.info("Cleaned up {} old resolved alerts", deletedCount);
        }
        
        return deletedCount;
    }
    
    /**
     * Create high CPU usage alert
     */
    public Alert createHighCpuAlert(Server server, double cpuUsage) {
        String message = String.format("High CPU usage detected: %.2f%%", cpuUsage);
        return createAlert(server, "High CPU Usage", message, Alert.AlertSeverity.WARNING);
    }
    
    /**
     * Create high memory usage alert
     */
    public Alert createHighMemoryAlert(Server server, double memoryUsage) {
        String message = String.format("High memory usage detected: %.2f%%", memoryUsage);
        return createAlert(server, "High Memory Usage", message, Alert.AlertSeverity.WARNING);
    }
    
    /**
     * Create disk space alert
     */
    public Alert createDiskSpaceAlert(Server server, double diskUsage) {
        String message = String.format("Low disk space: %.2f%% used", diskUsage);
        Alert.AlertSeverity severity = diskUsage > 90 ? Alert.AlertSeverity.CRITICAL : Alert.AlertSeverity.WARNING;
        return createAlert(server, "Disk Space Warning", message, severity);
    }
    
    /**
     * Inner class for alert statistics
     */
    public static class AlertStats {
        private final long totalAlerts;
        private final long activeAlerts;
        private final long criticalAlerts;
        private final long warningAlerts;
        private final long infoAlerts;
        
        public AlertStats(long totalAlerts, long activeAlerts, long criticalAlerts, 
                         long warningAlerts, long infoAlerts) {
            this.totalAlerts = totalAlerts;
            this.activeAlerts = activeAlerts;
            this.criticalAlerts = criticalAlerts;
            this.warningAlerts = warningAlerts;
            this.infoAlerts = infoAlerts;
        }
        
        // Getters
        public long getTotalAlerts() { return totalAlerts; }
        public long getActiveAlerts() { return activeAlerts; }
        public long getCriticalAlerts() { return criticalAlerts; }
        public long getWarningAlerts() { return warningAlerts; }
        public long getInfoAlerts() { return infoAlerts; }
    }
}
