package com.sams.service;

import com.sams.service.SystemMonitoringService.SystemMetrics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Real-time Metrics Broadcasting Service
 * 
 * Broadcasts system metrics via WebSocket every 5 seconds
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MetricsBroadcastService {
    
    private final SystemMonitoringService monitoringService;
    private final SimpMessagingTemplate messagingTemplate;
    
    /**
     * Broadcast system metrics every 5 seconds
     */
    @Scheduled(fixedRate = 5000)
    public void broadcastMetrics() {
        try {
            SystemMetrics metrics = monitoringService.getSystemMetrics();
            
            // Broadcast to all connected clients
            messagingTemplate.convertAndSend("/topic/metrics", metrics);
            
            log.debug("📡 Metrics broadcasted - CPU: {:.1f}%, Memory: {:.1f}%", 
                metrics.getCpuUsage(), metrics.getMemoryUsagePercent());
            
        } catch (Exception e) {
            log.error("❌ Error broadcasting metrics", e);
        }
    }
    
    /**
     * Broadcast alerts every 30 seconds
     */
    @Scheduled(fixedRate = 30000)
    public void broadcastAlerts() {
        try {
            var alerts = monitoringService.getSystemAlerts();
            
            if (!alerts.isEmpty()) {
                messagingTemplate.convertAndSend("/topic/alerts", alerts);
                log.info("🚨 {} alerts broadcasted", alerts.size());
            }
            
        } catch (Exception e) {
            log.error("❌ Error broadcasting alerts", e);
        }
    }
}
