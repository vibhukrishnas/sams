/**
 * 🧪 Alert Processing Engine Integration Tests
 * Comprehensive test suite for alert processing, correlation, and lifecycle management
 */

package com.monitoring.alert.service;

import com.monitoring.alert.entity.*;
import com.monitoring.alert.repository.*;
import com.monitoring.alert.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringJUnitTest;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@SpringJUnitTest
@Transactional
class AlertProcessingEngineIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16.1")
            .withDatabaseName("monitoring_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @Autowired
    private AlertProcessingEngine alertProcessingEngine;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private AlertRuleRepository alertRuleRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @MockBean
    private AlertRuleEvaluationService ruleEvaluationService;

    @MockBean
    private AlertCorrelationService correlationService;

    @MockBean
    private AlertNotificationService notificationService;

    @MockBean
    private KafkaTemplate<String, Object> kafkaTemplate;

    private Organization testOrganization;
    private AlertRule testRule;
    private MetricDataDto testMetricData;

    @BeforeEach
    void setUp() {
        // Create test organization
        testOrganization = new Organization();
        testOrganization.setName("Test Organization");
        testOrganization.setSlug("test-org");
        testOrganization = organizationRepository.save(testOrganization);

        // Create test alert rule
        testRule = new AlertRule();
        testRule.setName("CPU High Usage");
        testRule.setDescription("Alert when CPU usage exceeds 80%");
        testRule.setCategory("system");
        testRule.setSeverity(AlertSeverity.HIGH);
        testRule.setRuleType(AlertRuleType.THRESHOLD);
        testRule.setQuery("cpu_usage > 80");
        testRule.setEvaluationInterval(60);
        testRule.setForDuration(300);
        testRule.setIsEnabled(true);
        testRule.setOrganization(testOrganization);

        // Set up conditions
        Map<String, Object> conditions = new HashMap<>();
        conditions.put("metric", "cpu_usage");
        conditions.put("operator", ">");
        conditions.put("threshold", 80.0);
        testRule.setConditions(conditions);

        testRule = alertRuleRepository.save(testRule);

        // Create test metric data
        testMetricData = new MetricDataDto();
        testMetricData.setServerId(UUID.randomUUID());
        testMetricData.setServerName("test-server-01");
        testMetricData.setMetricName("cpu_usage");
        testMetricData.setValue(85.0);
        testMetricData.setTimestamp(LocalDateTime.now());
        testMetricData.setOrganizationId(testOrganization.getId());
    }

    @Test
    @DisplayName("Should create new alert when rule is triggered")
    void shouldCreateNewAlertWhenRuleTriggered() {
        // Given
        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);
        evaluationResult.setMessage("CPU usage exceeded threshold");

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        // When
        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Then
        List<Alert> alerts = alertRepository.findByRule(testRule);
        assertThat(alerts).hasSize(1);

        Alert createdAlert = alerts.get(0);
        assertThat(createdAlert.getRule()).isEqualTo(testRule);
        assertThat(createdAlert.getSeverity()).isEqualTo(AlertSeverity.HIGH);
        assertThat(createdAlert.getStatus()).isEqualTo(AlertStatus.PENDING);
        assertThat(createdAlert.getSummary()).contains("CPU High Usage");
        assertThat(createdAlert.getSummary()).contains("test-server-01");
        assertThat(createdAlert.getLabels()).containsEntry("server_id", testMetricData.getServerId().toString());
        assertThat(createdAlert.getLabels()).containsEntry("metric_name", "cpu_usage");

        // Verify notification was sent
        verify(notificationService).sendNotification(any(AlertNotificationDto.class));
        verify(kafkaTemplate).send(eq("monitoring.alerts"), eq(createdAlert.getId().toString()), any());
    }

    @Test
    @DisplayName("Should not create duplicate alert for same fingerprint")
    void shouldNotCreateDuplicateAlertForSameFingerprint() {
        // Given
        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        // When - evaluate rule twice with same data
        alertProcessingEngine.evaluateRule(testRule, testMetricData);
        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Then - should only have one alert
        List<Alert> alerts = alertRepository.findByRule(testRule);
        assertThat(alerts).hasSize(1);

        // Verify statistics
        AlertProcessingStatisticsDto stats = alertProcessingEngine.getProcessingStatistics();
        assertThat(stats.getDuplicateAlerts()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should correlate related alerts")
    void shouldCorrelateRelatedAlerts() {
        // Given
        // Create second alert rule for memory
        AlertRule memoryRule = new AlertRule();
        memoryRule.setName("Memory High Usage");
        memoryRule.setCategory("system");
        memoryRule.setSeverity(AlertSeverity.HIGH);
        memoryRule.setRuleType(AlertRuleType.THRESHOLD);
        memoryRule.setQuery("memory_usage > 90");
        memoryRule.setIsEnabled(true);
        memoryRule.setCorrelationEnabled(true);
        memoryRule.setCorrelationWindow(300);
        memoryRule.setOrganization(testOrganization);
        memoryRule = alertRuleRepository.save(memoryRule);

        // Create memory metric data
        MetricDataDto memoryMetricData = new MetricDataDto();
        memoryMetricData.setServerId(testMetricData.getServerId()); // Same server
        memoryMetricData.setServerName(testMetricData.getServerName());
        memoryMetricData.setMetricName("memory_usage");
        memoryMetricData.setValue(95.0);
        memoryMetricData.setTimestamp(LocalDateTime.now());
        memoryMetricData.setOrganizationId(testOrganization.getId());

        RuleEvaluationResult cpuResult = new RuleEvaluationResult();
        cpuResult.setTriggered(true);
        cpuResult.setActualValue(85.0);
        cpuResult.setThresholdValue(80.0);

        RuleEvaluationResult memoryResult = new RuleEvaluationResult();
        memoryResult.setTriggered(true);
        memoryResult.setActualValue(95.0);
        memoryResult.setThresholdValue(90.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(cpuResult);
        when(ruleEvaluationService.evaluateRule(eq(memoryRule), eq(memoryMetricData)))
                .thenReturn(memoryResult);

        // Mock correlation service to return high similarity
        when(correlationService.calculateSimilarity(any(Alert.class), any(Alert.class)))
                .thenReturn(0.8);
        when(correlationService.analyzeRootCause(anyList()))
                .thenReturn("Server resource exhaustion");

        // When
        alertProcessingEngine.evaluateRule(testRule, testMetricData);
        alertProcessingEngine.evaluateRule(memoryRule, memoryMetricData);

        // Then
        List<Alert> cpuAlerts = alertRepository.findByRule(testRule);
        List<Alert> memoryAlerts = alertRepository.findByRule(memoryRule);

        assertThat(cpuAlerts).hasSize(1);
        assertThat(memoryAlerts).hasSize(1);

        Alert cpuAlert = cpuAlerts.get(0);
        Alert memoryAlert = memoryAlerts.get(0);

        // Verify correlation
        assertThat(cpuAlert.getCorrelationGroupId()).isNotNull();
        assertThat(memoryAlert.getCorrelationGroupId()).isNotNull();
        assertThat(cpuAlert.getCorrelationGroupId()).isEqualTo(memoryAlert.getCorrelationGroupId());

        // Verify statistics
        AlertProcessingStatisticsDto stats = alertProcessingEngine.getProcessingStatistics();
        assertThat(stats.getCorrelatedAlerts()).isGreaterThan(0);
        assertThat(stats.getActiveCorrelationGroups()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should auto-resolve alerts when condition no longer met")
    void shouldAutoResolveAlertsWhenConditionNoLongerMet() {
        // Given
        testRule.setAutoResolveEnabled(true);
        testRule.setAutoResolveDuration(60); // 1 minute
        testRule = alertRuleRepository.save(testRule);

        // First evaluation - trigger alert
        RuleEvaluationResult triggeredResult = new RuleEvaluationResult();
        triggeredResult.setTriggered(true);
        triggeredResult.setActualValue(85.0);
        triggeredResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(triggeredResult);

        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Verify alert was created
        List<Alert> alerts = alertRepository.findByRule(testRule);
        assertThat(alerts).hasSize(1);
        Alert alert = alerts.get(0);
        assertThat(alert.getStatus()).isEqualTo(AlertStatus.PENDING);

        // Second evaluation - condition no longer met
        testMetricData.setValue(70.0); // Below threshold
        RuleEvaluationResult resolvedResult = new RuleEvaluationResult();
        resolvedResult.setTriggered(false);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(resolvedResult);

        // Simulate time passing (more than auto-resolve duration)
        alert.setLastUpdated(LocalDateTime.now().minusMinutes(2));
        alertRepository.save(alert);

        // When
        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Then
        Alert updatedAlert = alertRepository.findById(alert.getId()).orElse(null);
        assertThat(updatedAlert).isNotNull();
        assertThat(updatedAlert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(updatedAlert.getResolvedAt()).isNotNull();
        assertThat(updatedAlert.getResolutionReason()).contains("Auto-resolved");

        // Verify statistics
        AlertProcessingStatisticsDto stats = alertProcessingEngine.getProcessingStatistics();
        assertThat(stats.getAutoResolvedAlerts()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should acknowledge alert successfully")
    void shouldAcknowledgeAlertSuccessfully() {
        // Given
        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        List<Alert> alerts = alertRepository.findByRule(testRule);
        Alert alert = alerts.get(0);
        UUID userId = UUID.randomUUID();
        String comment = "Investigating the issue";

        // When
        alertProcessingEngine.acknowledgeAlert(alert.getId(), userId, comment);

        // Then
        Alert acknowledgedAlert = alertRepository.findById(alert.getId()).orElse(null);
        assertThat(acknowledgedAlert).isNotNull();
        assertThat(acknowledgedAlert.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
        assertThat(acknowledgedAlert.getAcknowledgedAt()).isNotNull();
        assertThat(acknowledgedAlert.getAcknowledgedBy()).isEqualTo(userId);
        assertThat(acknowledgedAlert.getAcknowledgmentComment()).isEqualTo(comment);

        // Verify notification was sent
        verify(notificationService, times(2)).sendNotification(any(AlertNotificationDto.class));
    }

    @Test
    @DisplayName("Should resolve alert successfully")
    void shouldResolveAlertSuccessfully() {
        // Given
        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        List<Alert> alerts = alertRepository.findByRule(testRule);
        Alert alert = alerts.get(0);
        String resolutionReason = "Issue fixed by restarting service";

        // When
        alertProcessingEngine.resolveAlert(alert, resolutionReason);

        // Then
        Alert resolvedAlert = alertRepository.findById(alert.getId()).orElse(null);
        assertThat(resolvedAlert).isNotNull();
        assertThat(resolvedAlert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(resolvedAlert.getResolvedAt()).isNotNull();
        assertThat(resolvedAlert.getResolutionReason()).isEqualTo(resolutionReason);

        // Verify notification was sent
        verify(notificationService, times(2)).sendNotification(any(AlertNotificationDto.class));
    }

    @Test
    @DisplayName("Should respect suppression window")
    void shouldRespectSuppressionWindow() {
        // Given
        testRule.setSuppressionEnabled(true);
        testRule.setSuppressionDuration(300); // 5 minutes
        testRule = alertRuleRepository.save(testRule);

        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        // When - first evaluation creates alert
        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Verify first alert was created
        List<Alert> alerts = alertRepository.findByRule(testRule);
        assertThat(alerts).hasSize(1);

        // When - second evaluation within suppression window
        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Then - no new alert should be created
        alerts = alertRepository.findByRule(testRule);
        assertThat(alerts).hasSize(1); // Still only one alert
    }

    @Test
    @DisplayName("Should transition alert from PENDING to FIRING")
    void shouldTransitionAlertFromPendingToFiring() {
        // Given
        testRule.setForDuration(1); // 1 second for faster testing
        testRule = alertRuleRepository.save(testRule);

        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        // When
        alertProcessingEngine.evaluateRule(testRule, testMetricData);

        // Then - initially PENDING
        List<Alert> alerts = alertRepository.findByRule(testRule);
        Alert alert = alerts.get(0);
        assertThat(alert.getStatus()).isEqualTo(AlertStatus.PENDING);

        // Wait for state transition
        await().atMost(5, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    Alert updatedAlert = alertRepository.findById(alert.getId()).orElse(null);
                    assertThat(updatedAlert).isNotNull();
                    assertThat(updatedAlert.getStatus()).isEqualTo(AlertStatus.FIRING);
                });
    }

    @Test
    @DisplayName("Should get accurate processing statistics")
    void shouldGetAccurateProcessingStatistics() {
        // Given
        RuleEvaluationResult evaluationResult = new RuleEvaluationResult();
        evaluationResult.setTriggered(true);
        evaluationResult.setActualValue(85.0);
        evaluationResult.setThresholdValue(80.0);

        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenReturn(evaluationResult);

        // When
        alertProcessingEngine.evaluateRule(testRule, testMetricData);
        alertProcessingEngine.evaluateRule(testRule, testMetricData); // Duplicate

        // Then
        AlertProcessingStatisticsDto stats = alertProcessingEngine.getProcessingStatistics();
        assertThat(stats.getTotalAlertsProcessed()).isEqualTo(1);
        assertThat(stats.getDuplicateAlerts()).isEqualTo(1);
        assertThat(stats.getActiveAlerts()).isEqualTo(1);
        assertThat(stats.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("Should handle rule evaluation errors gracefully")
    void shouldHandleRuleEvaluationErrorsGracefully() {
        // Given
        when(ruleEvaluationService.evaluateRule(eq(testRule), eq(testMetricData)))
                .thenThrow(new RuntimeException("Evaluation error"));

        // When & Then - should not throw exception
        assertThatCode(() -> alertProcessingEngine.evaluateRule(testRule, testMetricData))
                .doesNotThrowAnyException();

        // Verify no alerts were created
        List<Alert> alerts = alertRepository.findByRule(testRule);
        assertThat(alerts).isEmpty();
    }
}
