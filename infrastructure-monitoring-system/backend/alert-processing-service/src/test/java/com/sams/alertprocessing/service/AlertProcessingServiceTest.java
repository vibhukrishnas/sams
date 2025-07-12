package com.sams.alertprocessing.service;

import com.sams.alertprocessing.dto.AlertAcknowledgeRequest;
import com.sams.alertprocessing.dto.AlertCreateRequest;
import com.sams.alertprocessing.dto.AlertResolveRequest;
import com.sams.alertprocessing.dto.AlertResponse;
import com.sams.alertprocessing.entity.Alert;
import com.sams.alertprocessing.entity.AlertSeverity;
import com.sams.alertprocessing.entity.AlertStatus;
import com.sams.alertprocessing.exception.AlertNotFoundException;
import com.sams.alertprocessing.repository.AlertRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AlertProcessingService
 */
@ExtendWith(MockitoExtension.class)
class AlertProcessingServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private AlertRuleEngine alertRuleEngine;

    @Mock
    private AlertCorrelationService alertCorrelationService;

    @Mock
    private AlertNotificationService alertNotificationService;

    @Mock
    private AlertEscalationService alertEscalationService;

    @Mock
    private AlertSuppressionService alertSuppressionService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private AlertProcessingService alertProcessingService;

    private Alert testAlert;
    private AlertCreateRequest createRequest;

    @BeforeEach
    void setUp() {
        // Setup test alert
        testAlert = new Alert("test-source", "CPU_HIGH", AlertSeverity.WARNING, "CPU usage is high");
        testAlert.setId(1L);
        testAlert.setServerId(100L);
        testAlert.setServerName("test-server");
        testAlert.setStatus(AlertStatus.OPEN);
        testAlert.setCreatedAt(LocalDateTime.now());
        testAlert.setCorrelationKey("test-correlation-key");
        testAlert.setCorrelationId("test-correlation-id");

        // Setup create request
        createRequest = new AlertCreateRequest();
        createRequest.setSource("test-source");
        createRequest.setServerId(100L);
        createRequest.setServerName("test-server");
        createRequest.setAlertType("CPU_HIGH");
        createRequest.setSeverity(AlertSeverity.WARNING);
        createRequest.setMessage("CPU usage is high");
        createRequest.setDescription("CPU usage exceeded 80% threshold");

        Map<String, String> alertData = new HashMap<>();
        alertData.put("cpu_usage", "85.5");
        alertData.put("threshold", "80.0");
        createRequest.setAlertData(alertData);

        Map<String, String> tags = new HashMap<>();
        tags.put("environment", "production");
        tags.put("team", "infrastructure");
        createRequest.setTags(tags);
    }

    @Test
    void processAlert_NewAlert_Success() {
        // Arrange
        when(alertCorrelationService.generateCorrelationKey(any(Alert.class))).thenReturn("test-correlation-key");
        when(alertRepository.findActiveAlertByCorrelationKey("test-correlation-key")).thenReturn(null);
        when(alertCorrelationService.correlateAlert(any(Alert.class))).thenReturn("test-correlation-id");
        when(alertSuppressionService.isAlertSuppressed(any(Alert.class))).thenReturn(false);
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        // Act
        AlertResponse response = alertProcessingService.processAlert(createRequest, "admin");

        // Assert
        assertNotNull(response);
        assertEquals(testAlert.getId(), response.getId());
        assertEquals(testAlert.getSource(), response.getSource());
        assertEquals(testAlert.getAlertType(), response.getAlertType());
        assertEquals(testAlert.getSeverity(), response.getSeverity());
        assertEquals(testAlert.getStatus(), response.getStatus());

        verify(alertRuleEngine).applyRules(any(Alert.class));
        verify(alertNotificationService).sendNotification(any(Alert.class));
        verify(alertEscalationService).scheduleEscalation(any(Alert.class));
        verify(auditService).logAlertCreated(testAlert.getId(), "admin");
    }

    @Test
    void processAlert_DuplicateAlert_UpdatesExisting() {
        // Arrange
        Alert existingAlert = new Alert("test-source", "CPU_HIGH", AlertSeverity.INFO, "CPU usage is high");
        existingAlert.setId(2L);
        existingAlert.setDuplicateCount(1);
        existingAlert.setCorrelationKey("test-correlation-key");

        when(alertCorrelationService.generateCorrelationKey(any(Alert.class))).thenReturn("test-correlation-key");
        when(alertRepository.findActiveAlertByCorrelationKey("test-correlation-key")).thenReturn(existingAlert);
        when(alertRepository.save(any(Alert.class))).thenReturn(existingAlert);

        // Act
        AlertResponse response = alertProcessingService.processAlert(createRequest, "admin");

        // Assert
        assertNotNull(response);
        assertEquals(existingAlert.getId(), response.getId());
        
        verify(alertRepository).save(argThat(alert -> 
            alert.getDuplicateCount() == 2 && 
            alert.getSeverity() == AlertSeverity.WARNING // Escalated from INFO to WARNING
        ));
    }

    @Test
    void processAlert_SuppressedAlert_DoesNotNotify() {
        // Arrange
        when(alertCorrelationService.generateCorrelationKey(any(Alert.class))).thenReturn("test-correlation-key");
        when(alertRepository.findActiveAlertByCorrelationKey("test-correlation-key")).thenReturn(null);
        when(alertCorrelationService.correlateAlert(any(Alert.class))).thenReturn("test-correlation-id");
        when(alertSuppressionService.isAlertSuppressed(any(Alert.class))).thenReturn(true);
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        // Act
        AlertResponse response = alertProcessingService.processAlert(createRequest, "admin");

        // Assert
        assertNotNull(response);
        verify(alertNotificationService, never()).sendNotification(any(Alert.class));
        verify(alertEscalationService, never()).scheduleEscalation(any(Alert.class));
    }

    @Test
    void acknowledgeAlert_Success() {
        // Arrange
        when(alertRepository.findById(1L)).thenReturn(Optional.of(testAlert));
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        AlertAcknowledgeRequest request = new AlertAcknowledgeRequest();
        request.setNote("Investigating the issue");

        // Act
        AlertResponse response = alertProcessingService.acknowledgeAlert(1L, request, "operator");

        // Assert
        assertNotNull(response);
        verify(alertRepository).save(argThat(alert -> 
            alert.getStatus() == AlertStatus.ACKNOWLEDGED &&
            "operator".equals(alert.getAcknowledgedBy()) &&
            "Investigating the issue".equals(alert.getAcknowledgmentNote()) &&
            alert.getAcknowledgedAt() != null
        ));
        verify(alertEscalationService).cancelEscalation(1L);
        verify(alertNotificationService).sendAcknowledgmentNotification(any(Alert.class));
        verify(auditService).logAlertAcknowledged(1L, "operator");
    }

    @Test
    void acknowledgeAlert_InvalidStatus_ThrowsException() {
        // Arrange
        testAlert.setStatus(AlertStatus.RESOLVED);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(testAlert));

        AlertAcknowledgeRequest request = new AlertAcknowledgeRequest();
        request.setNote("Investigating the issue");

        // Act & Assert
        assertThrows(IllegalStateException.class, () -> {
            alertProcessingService.acknowledgeAlert(1L, request, "operator");
        });

        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    void resolveAlert_Success() {
        // Arrange
        testAlert.setStatus(AlertStatus.ACKNOWLEDGED);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(testAlert));
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        AlertResolveRequest request = new AlertResolveRequest();
        request.setNote("Issue has been fixed");
        request.setResolveCorrelated(false);

        // Act
        AlertResponse response = alertProcessingService.resolveAlert(1L, request, "operator");

        // Assert
        assertNotNull(response);
        verify(alertRepository).save(argThat(alert -> 
            alert.getStatus() == AlertStatus.RESOLVED &&
            "operator".equals(alert.getResolvedBy()) &&
            "Issue has been fixed".equals(alert.getResolutionNote()) &&
            alert.getResolvedAt() != null &&
            !alert.getAutoResolved()
        ));
        verify(alertEscalationService).cancelEscalation(1L);
        verify(alertNotificationService).sendResolutionNotification(any(Alert.class));
        verify(auditService).logAlertResolved(1L, "operator");
    }

    @Test
    void resolveAlert_NotFound_ThrowsException() {
        // Arrange
        when(alertRepository.findById(1L)).thenReturn(Optional.empty());

        AlertResolveRequest request = new AlertResolveRequest();
        request.setNote("Issue has been fixed");

        // Act & Assert
        assertThrows(AlertNotFoundException.class, () -> {
            alertProcessingService.resolveAlert(1L, request, "operator");
        });

        verify(alertRepository, never()).save(any(Alert.class));
    }

    @Test
    void getAlertById_Success() {
        // Arrange
        when(alertRepository.findById(1L)).thenReturn(Optional.of(testAlert));

        // Act
        AlertResponse response = alertProcessingService.getAlertById(1L);

        // Assert
        assertNotNull(response);
        assertEquals(testAlert.getId(), response.getId());
        assertEquals(testAlert.getSource(), response.getSource());
        assertEquals(testAlert.getAlertType(), response.getAlertType());
        assertEquals(testAlert.getSeverity(), response.getSeverity());
        assertEquals(testAlert.getStatus(), response.getStatus());
    }

    @Test
    void getAlertById_NotFound_ThrowsException() {
        // Arrange
        when(alertRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(AlertNotFoundException.class, () -> {
            alertProcessingService.getAlertById(1L);
        });
    }

    @Test
    void closeAlert_Success() {
        // Arrange
        testAlert.setStatus(AlertStatus.RESOLVED);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(testAlert));
        when(alertRepository.save(any(Alert.class))).thenReturn(testAlert);

        // Act
        AlertResponse response = alertProcessingService.closeAlert(1L, "admin");

        // Assert
        assertNotNull(response);
        verify(alertRepository).save(argThat(alert -> 
            alert.getStatus() == AlertStatus.CLOSED &&
            "admin".equals(alert.getUpdatedBy())
        ));
        verify(auditService).logAlertClosed(1L, "admin");
    }

    @Test
    void getAlertStatistics_Success() {
        // Arrange
        Object[] statsArray = {100L, 25L, 15L, 50L, 5L, 3L, 2L}; // total, open, ack, resolved, critical, suppressed, escalated
        when(alertRepository.getAlertStatistics()).thenReturn(statsArray);

        // Act
        AlertProcessingService.AlertStatistics stats = alertProcessingService.getAlertStatistics();

        // Assert
        assertNotNull(stats);
        assertEquals(100L, stats.getTotalAlerts());
        assertEquals(25L, stats.getOpenAlerts());
        assertEquals(15L, stats.getAcknowledgedAlerts());
        assertEquals(50L, stats.getResolvedAlerts());
        assertEquals(5L, stats.getCriticalAlerts());
        assertEquals(3L, stats.getSuppressedAlerts());
        assertEquals(2L, stats.getEscalatedAlerts());
    }
}
