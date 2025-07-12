package com.sams.monitor.service;

import com.sams.monitor.dto.AlertDTO;
import com.sams.monitor.entity.Alert;
import com.sams.monitor.entity.Server;
import com.sams.monitor.entity.User;
import com.sams.monitor.enums.AlertSeverity;
import com.sams.monitor.enums.AlertStatus;
import com.sams.monitor.repository.AlertRepository;
import com.sams.monitor.repository.ServerRepository;
import com.sams.monitor.service.impl.AlertServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private ServerRepository serverRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private AlertServiceImpl alertService;

    private Alert testAlert;
    private Server testServer;
    private User testUser;
    private AlertDTO testAlertDTO;

    @BeforeEach
    void setUp() {
        testServer = Server.builder()
                .id(UUID.randomUUID())
                .name("Test Server")
                .ipAddress("192.168.1.100")
                .port(22)
                .status("ONLINE")
                .build();

        testUser = User.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .email("test@example.com")
                .build();

        testAlert = Alert.builder()
                .id(UUID.randomUUID())
                .title("High CPU Usage")
                .description("CPU usage is above 90%")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();

        testAlertDTO = AlertDTO.builder()
                .title("High Memory Usage")
                .description("Memory usage is above 85%")
                .severity(AlertSeverity.WARNING)
                .serverId(testServer.getId())
                .build();
    }

    @Test
    void createAlert_ShouldCreateAndReturnAlert() {
        // Given
        when(serverRepository.findById(testAlertDTO.getServerId())).thenReturn(Optional.of(testServer));
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        // When
        Alert result = alertService.createAlert(testAlertDTO);

        // Then
        assertNotNull(result);
        assertEquals(testAlert.getTitle(), result.getTitle());
        assertEquals(testAlert.getSeverity(), result.getSeverity());
        verify(alertRepository).save(any(Alert.class));
        verify(notificationService).sendAlertNotification(any(Alert.class));
        verify(webSocketService).broadcastAlert(any(Alert.class));
    }

    @Test
    void createAlert_WithInvalidServer_ShouldThrowException() {
        // Given
        when(serverRepository.findById(testAlertDTO.getServerId())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> alertService.createAlert(testAlertDTO));
        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    void getAlerts_ShouldReturnPagedAlerts() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Alert> alerts = Arrays.asList(testAlert);
        Page<Alert> alertPage = new PageImpl<>(alerts, pageable, 1);
        
        when(alertRepository.findAll(pageable)).thenReturn(alertPage);

        // When
        Page<Alert> result = alertService.getAlerts(pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(testAlert.getId(), result.getContent().get(0).getId());
    }

    @Test
    void getAlertsBySeverity_ShouldReturnFilteredAlerts() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Alert> alerts = Arrays.asList(testAlert);
        Page<Alert> alertPage = new PageImpl<>(alerts, pageable, 1);
        
        when(alertRepository.findBySeverity(AlertSeverity.CRITICAL, pageable)).thenReturn(alertPage);

        // When
        Page<Alert> result = alertService.getAlertsBySeverity(AlertSeverity.CRITICAL, pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(AlertSeverity.CRITICAL, result.getContent().get(0).getSeverity());
    }

    @Test
    void acknowledgeAlert_ShouldUpdateAlertStatus() {
        // Given
        UUID alertId = testAlert.getId();
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(testAlert));
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        // When
        Alert result = alertService.acknowledgeAlert(alertId, testUser, "Acknowledged by user");

        // Then
        assertNotNull(result);
        assertEquals(AlertStatus.ACKNOWLEDGED, result.getStatus());
        assertEquals(testUser, result.getAcknowledgedBy());
        assertNotNull(result.getAcknowledgedAt());
        verify(alertRepository).save(testAlert);
        verify(webSocketService).broadcastAlertUpdate(testAlert);
    }

    @Test
    void acknowledgeAlert_WithInvalidId_ShouldThrowException() {
        // Given
        UUID invalidId = UUID.randomUUID();
        when(alertRepository.findById(invalidId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, 
            () -> alertService.acknowledgeAlert(invalidId, testUser, "Test note"));
    }

    @Test
    void resolveAlert_ShouldUpdateAlertStatus() {
        // Given
        UUID alertId = testAlert.getId();
        testAlert.setStatus(AlertStatus.ACKNOWLEDGED);
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(testAlert));
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        // When
        Alert result = alertService.resolveAlert(alertId, testUser, "Issue resolved");

        // Then
        assertNotNull(result);
        assertEquals(AlertStatus.RESOLVED, result.getStatus());
        assertEquals(testUser, result.getResolvedBy());
        assertNotNull(result.getResolvedAt());
        verify(alertRepository).save(testAlert);
    }

    @Test
    void getActiveAlertsCount_ShouldReturnCorrectCount() {
        // Given
        when(alertRepository.countByStatus(AlertStatus.ACTIVE)).thenReturn(5L);

        // When
        long count = alertService.getActiveAlertsCount();

        // Then
        assertEquals(5L, count);
    }

    @Test
    void getCriticalAlertsCount_ShouldReturnCorrectCount() {
        // Given
        when(alertRepository.countBySeverityAndStatus(AlertSeverity.CRITICAL, AlertStatus.ACTIVE))
            .thenReturn(3L);

        // When
        long count = alertService.getCriticalAlertsCount();

        // Then
        assertEquals(3L, count);
    }

    @Test
    void deleteOldResolvedAlerts_ShouldDeleteExpiredAlerts() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
        when(alertRepository.deleteByStatusAndResolvedAtBefore(AlertStatus.RESOLVED, cutoffDate))
            .thenReturn(10);

        // When
        int deletedCount = alertService.deleteOldResolvedAlerts(30);

        // Then
        assertEquals(10, deletedCount);
        verify(alertRepository).deleteByStatusAndResolvedAtBefore(AlertStatus.RESOLVED, cutoffDate);
    }

    @Test
    void escalateUnacknowledgedAlerts_ShouldEscalateAlerts() {
        // Given
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(15);
        List<Alert> unacknowledgedAlerts = Arrays.asList(testAlert);
        when(alertRepository.findByStatusAndCreatedAtBeforeAndSeverity(
            AlertStatus.ACTIVE, cutoffTime, AlertSeverity.CRITICAL))
            .thenReturn(unacknowledgedAlerts);

        // When
        alertService.escalateUnacknowledgedAlerts();

        // Then
        verify(notificationService).sendEscalationNotification(testAlert);
        verify(alertRepository).saveAll(unacknowledgedAlerts);
    }

    @Test
    void getAlertStatistics_ShouldReturnCorrectStats() {
        // Given
        when(alertRepository.countByStatus(AlertStatus.ACTIVE)).thenReturn(10L);
        when(alertRepository.countByStatus(AlertStatus.ACKNOWLEDGED)).thenReturn(5L);
        when(alertRepository.countByStatus(AlertStatus.RESOLVED)).thenReturn(20L);
        when(alertRepository.countBySeverity(AlertSeverity.CRITICAL)).thenReturn(3L);
        when(alertRepository.countBySeverity(AlertSeverity.WARNING)).thenReturn(7L);

        // When
        var stats = alertService.getAlertStatistics();

        // Then
        assertNotNull(stats);
        assertEquals(10L, stats.getActiveCount());
        assertEquals(5L, stats.getAcknowledgedCount());
        assertEquals(20L, stats.getResolvedCount());
        assertEquals(3L, stats.getCriticalCount());
        assertEquals(7L, stats.getWarningCount());
    }

    @Test
    void bulkAcknowledgeAlerts_ShouldAcknowledgeMultipleAlerts() {
        // Given
        List<UUID> alertIds = Arrays.asList(UUID.randomUUID(), UUID.randomUUID());
        List<Alert> alerts = Arrays.asList(testAlert, testAlert);
        when(alertRepository.findAllById(alertIds)).thenReturn(alerts);
        when(alertRepository.saveAll(any())).thenReturn(alerts);

        // When
        List<Alert> result = alertService.bulkAcknowledgeAlerts(alertIds, testUser, "Bulk acknowledge");

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(alertRepository).saveAll(alerts);
        verify(webSocketService, times(2)).broadcastAlertUpdate(any(Alert.class));
    }
}
