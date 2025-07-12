package com.sams.monitor.repository;

import com.sams.monitor.entity.Alert;
import com.sams.monitor.entity.Server;
import com.sams.monitor.entity.User;
import com.sams.monitor.enums.AlertSeverity;
import com.sams.monitor.enums.AlertStatus;
import com.sams.monitor.enums.ServerType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AlertRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("sams_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private UserRepository userRepository;

    private Server testServer;
    private User testUser;
    private Alert testAlert;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("$2a$10$encrypted.password")
                .role("ADMIN")
                .enabled(true)
                .build();
        testUser = entityManager.persistAndFlush(testUser);

        // Create test server
        testServer = Server.builder()
                .name("Test Server")
                .ipAddress("192.168.1.100")
                .port(22)
                .type(ServerType.LINUX)
                .description("Test server")
                .createdAt(LocalDateTime.now())
                .build();
        testServer = entityManager.persistAndFlush(testServer);

        // Create test alert
        testAlert = Alert.builder()
                .title("Test Alert")
                .description("Test alert description")
                .severity(AlertSeverity.WARNING)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();
        testAlert = entityManager.persistAndFlush(testAlert);

        entityManager.clear();
    }

    @Test
    void findBySeverity_ShouldReturnAlertsWithSpecificSeverity() {
        // Given
        Alert criticalAlert = Alert.builder()
                .title("Critical Alert")
                .description("Critical issue")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(criticalAlert);

        Pageable pageable = PageRequest.of(0, 10);

        // When
        Page<Alert> criticalAlerts = alertRepository.findBySeverity(AlertSeverity.CRITICAL, pageable);
        Page<Alert> warningAlerts = alertRepository.findBySeverity(AlertSeverity.WARNING, pageable);

        // Then
        assertThat(criticalAlerts.getContent()).hasSize(1);
        assertThat(criticalAlerts.getContent().get(0).getSeverity()).isEqualTo(AlertSeverity.CRITICAL);
        
        assertThat(warningAlerts.getContent()).hasSize(1);
        assertThat(warningAlerts.getContent().get(0).getSeverity()).isEqualTo(AlertSeverity.WARNING);
    }

    @Test
    void findByStatus_ShouldReturnAlertsWithSpecificStatus() {
        // Given
        Alert acknowledgedAlert = Alert.builder()
                .title("Acknowledged Alert")
                .description("Acknowledged issue")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.ACKNOWLEDGED)
                .server(testServer)
                .acknowledgedBy(testUser)
                .acknowledgedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(acknowledgedAlert);

        Pageable pageable = PageRequest.of(0, 10);

        // When
        Page<Alert> activeAlerts = alertRepository.findByStatus(AlertStatus.ACTIVE, pageable);
        Page<Alert> acknowledgedAlerts = alertRepository.findByStatus(AlertStatus.ACKNOWLEDGED, pageable);

        // Then
        assertThat(activeAlerts.getContent()).hasSize(1);
        assertThat(activeAlerts.getContent().get(0).getStatus()).isEqualTo(AlertStatus.ACTIVE);
        
        assertThat(acknowledgedAlerts.getContent()).hasSize(1);
        assertThat(acknowledgedAlerts.getContent().get(0).getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
    }

    @Test
    void findByServerId_ShouldReturnAlertsForSpecificServer() {
        // Given
        Server anotherServer = Server.builder()
                .name("Another Server")
                .ipAddress("192.168.1.101")
                .port(22)
                .type(ServerType.WINDOWS)
                .description("Another test server")
                .createdAt(LocalDateTime.now())
                .build();
        anotherServer = entityManager.persistAndFlush(anotherServer);

        Alert anotherAlert = Alert.builder()
                .title("Another Alert")
                .description("Alert for another server")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.ACTIVE)
                .server(anotherServer)
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(anotherAlert);

        Pageable pageable = PageRequest.of(0, 10);

        // When
        Page<Alert> serverAlerts = alertRepository.findByServerId(testServer.getId(), pageable);

        // Then
        assertThat(serverAlerts.getContent()).hasSize(1);
        assertThat(serverAlerts.getContent().get(0).getServer().getId()).isEqualTo(testServer.getId());
    }

    @Test
    void countByStatus_ShouldReturnCorrectCounts() {
        // Given
        Alert acknowledgedAlert = Alert.builder()
                .title("Acknowledged Alert")
                .description("Acknowledged issue")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.ACKNOWLEDGED)
                .server(testServer)
                .acknowledgedBy(testUser)
                .acknowledgedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(acknowledgedAlert);

        Alert resolvedAlert = Alert.builder()
                .title("Resolved Alert")
                .description("Resolved issue")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.RESOLVED)
                .server(testServer)
                .acknowledgedBy(testUser)
                .acknowledgedAt(LocalDateTime.now().minusMinutes(30))
                .resolvedBy(testUser)
                .resolvedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        entityManager.persistAndFlush(resolvedAlert);

        // When
        long activeCount = alertRepository.countByStatus(AlertStatus.ACTIVE);
        long acknowledgedCount = alertRepository.countByStatus(AlertStatus.ACKNOWLEDGED);
        long resolvedCount = alertRepository.countByStatus(AlertStatus.RESOLVED);

        // Then
        assertThat(activeCount).isEqualTo(1);
        assertThat(acknowledgedCount).isEqualTo(1);
        assertThat(resolvedCount).isEqualTo(1);
    }

    @Test
    void countBySeverityAndStatus_ShouldReturnCorrectCounts() {
        // Given
        Alert criticalActiveAlert = Alert.builder()
                .title("Critical Active Alert")
                .description("Critical active issue")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(criticalActiveAlert);

        Alert criticalAcknowledgedAlert = Alert.builder()
                .title("Critical Acknowledged Alert")
                .description("Critical acknowledged issue")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.ACKNOWLEDGED)
                .server(testServer)
                .acknowledgedBy(testUser)
                .acknowledgedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(criticalAcknowledgedAlert);

        // When
        long criticalActiveCount = alertRepository.countBySeverityAndStatus(AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
        long criticalAcknowledgedCount = alertRepository.countBySeverityAndStatus(AlertSeverity.CRITICAL, AlertStatus.ACKNOWLEDGED);
        long warningActiveCount = alertRepository.countBySeverityAndStatus(AlertSeverity.WARNING, AlertStatus.ACTIVE);

        // Then
        assertThat(criticalActiveCount).isEqualTo(1);
        assertThat(criticalAcknowledgedCount).isEqualTo(1);
        assertThat(warningActiveCount).isEqualTo(1); // Original test alert
    }

    @Test
    void findByStatusAndCreatedAtBeforeAndSeverity_ShouldReturnOldUnacknowledgedCriticalAlerts() {
        // Given
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(15);
        
        Alert oldCriticalAlert = Alert.builder()
                .title("Old Critical Alert")
                .description("Old critical issue")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(cutoffTime.minusMinutes(10))
                .build();
        entityManager.persistAndFlush(oldCriticalAlert);

        Alert recentCriticalAlert = Alert.builder()
                .title("Recent Critical Alert")
                .description("Recent critical issue")
                .severity(AlertSeverity.CRITICAL)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();
        entityManager.persistAndFlush(recentCriticalAlert);

        // When
        List<Alert> oldUnacknowledgedCritical = alertRepository.findByStatusAndCreatedAtBeforeAndSeverity(
                AlertStatus.ACTIVE, cutoffTime, AlertSeverity.CRITICAL);

        // Then
        assertThat(oldUnacknowledgedCritical).hasSize(1);
        assertThat(oldUnacknowledgedCritical.get(0).getTitle()).isEqualTo("Old Critical Alert");
    }

    @Test
    void deleteByStatusAndResolvedAtBefore_ShouldDeleteOldResolvedAlerts() {
        // Given
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
        
        Alert oldResolvedAlert = Alert.builder()
                .title("Old Resolved Alert")
                .description("Old resolved issue")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.RESOLVED)
                .server(testServer)
                .acknowledgedBy(testUser)
                .acknowledgedAt(cutoffDate.minusDays(1))
                .resolvedBy(testUser)
                .resolvedAt(cutoffDate.minusDays(1).plusHours(1))
                .createdAt(cutoffDate.minusDays(2))
                .build();
        entityManager.persistAndFlush(oldResolvedAlert);

        Alert recentResolvedAlert = Alert.builder()
                .title("Recent Resolved Alert")
                .description("Recent resolved issue")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.RESOLVED)
                .server(testServer)
                .acknowledgedBy(testUser)
                .acknowledgedAt(LocalDateTime.now().minusHours(2))
                .resolvedBy(testUser)
                .resolvedAt(LocalDateTime.now().minusHours(1))
                .createdAt(LocalDateTime.now().minusHours(3))
                .build();
        entityManager.persistAndFlush(recentResolvedAlert);

        // When
        int deletedCount = alertRepository.deleteByStatusAndResolvedAtBefore(AlertStatus.RESOLVED, cutoffDate);

        // Then
        assertThat(deletedCount).isEqualTo(1);
        
        // Verify the old alert was deleted and recent one remains
        Optional<Alert> oldAlert = alertRepository.findById(oldResolvedAlert.getId());
        Optional<Alert> recentAlert = alertRepository.findById(recentResolvedAlert.getId());
        
        assertThat(oldAlert).isEmpty();
        assertThat(recentAlert).isPresent();
    }

    @Test
    void findByCreatedAtBetween_ShouldReturnAlertsInTimeRange() {
        // Given
        LocalDateTime startTime = LocalDateTime.now().minusHours(2);
        LocalDateTime endTime = LocalDateTime.now().minusHours(1);
        
        Alert alertInRange = Alert.builder()
                .title("Alert In Range")
                .description("Alert within time range")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(startTime.plusMinutes(30))
                .build();
        entityManager.persistAndFlush(alertInRange);

        Alert alertOutOfRange = Alert.builder()
                .title("Alert Out Of Range")
                .description("Alert outside time range")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(startTime.minusHours(1))
                .build();
        entityManager.persistAndFlush(alertOutOfRange);

        // When
        List<Alert> alertsInRange = alertRepository.findByCreatedAtBetween(startTime, endTime);

        // Then
        assertThat(alertsInRange).hasSize(1);
        assertThat(alertsInRange.get(0).getTitle()).isEqualTo("Alert In Range");
    }

    @Test
    void findTopByServerIdOrderByCreatedAtDesc_ShouldReturnLatestAlert() {
        // Given
        Alert olderAlert = Alert.builder()
                .title("Older Alert")
                .description("Older alert")
                .severity(AlertSeverity.INFO)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now().minusHours(2))
                .build();
        entityManager.persistAndFlush(olderAlert);

        Alert newerAlert = Alert.builder()
                .title("Newer Alert")
                .description("Newer alert")
                .severity(AlertSeverity.WARNING)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        entityManager.persistAndFlush(newerAlert);

        // When
        Optional<Alert> latestAlert = alertRepository.findTopByServerIdOrderByCreatedAtDesc(testServer.getId());

        // Then
        assertThat(latestAlert).isPresent();
        assertThat(latestAlert.get().getTitle()).isEqualTo("Newer Alert");
    }

    @Test
    void customQuery_findAlertsWithServerInfo_ShouldReturnAlertsWithJoinedData() {
        // When
        List<Alert> alerts = alertRepository.findAll();

        // Then
        assertThat(alerts).hasSize(1);
        Alert alert = alerts.get(0);
        assertThat(alert.getServer()).isNotNull();
        assertThat(alert.getServer().getName()).isEqualTo("Test Server");
        assertThat(alert.getServer().getIpAddress()).isEqualTo("192.168.1.100");
    }
}
