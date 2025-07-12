package com.sams.monitor.contract;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactBroker;
import au.com.dius.pact.provider.spring.SpringBootHttpTarget;
import com.sams.monitor.entity.Alert;
import com.sams.monitor.entity.Server;
import com.sams.monitor.entity.User;
import com.sams.monitor.enums.AlertSeverity;
import com.sams.monitor.enums.AlertStatus;
import com.sams.monitor.enums.ServerType;
import com.sams.monitor.repository.AlertRepository;
import com.sams.monitor.repository.ServerRepository;
import com.sams.monitor.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Provider("sams-alert-service")
@PactBroker(url = "http://localhost:9292")
class AlertApiContractTest {

    @LocalServerPort
    private int port;

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
    void setUp(PactVerificationContext context) {
        context.setTarget(new SpringBootHttpTarget("localhost", port));
        
        // Clean up and set up test data
        alertRepository.deleteAll();
        serverRepository.deleteAll();
        userRepository.deleteAll();
        
        setupTestData();
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("alerts exist")
    void alertsExist() {
        setupTestData();
    }

    @State("no alerts exist")
    void noAlertsExist() {
        alertRepository.deleteAll();
    }

    @State("alert with id exists")
    void alertWithIdExists() {
        setupTestData();
    }

    @State("alert with id does not exist")
    void alertWithIdDoesNotExist() {
        alertRepository.deleteAll();
    }

    @State("server with id exists")
    void serverWithIdExists() {
        setupTestData();
    }

    @State("user is authenticated")
    void userIsAuthenticated() {
        setupTestData();
    }

    @State("critical alerts exist")
    void criticalAlertsExist() {
        setupTestData();
        
        // Create additional critical alerts
        for (int i = 0; i < 3; i++) {
            Alert criticalAlert = Alert.builder()
                    .title("Critical Alert " + i)
                    .description("Critical system issue " + i)
                    .severity(AlertSeverity.CRITICAL)
                    .status(AlertStatus.ACTIVE)
                    .server(testServer)
                    .createdAt(LocalDateTime.now().minusMinutes(i * 10))
                    .build();
            alertRepository.save(criticalAlert);
        }
    }

    @State("acknowledged alerts exist")
    void acknowledgedAlertsExist() {
        setupTestData();
        
        // Create acknowledged alerts
        for (int i = 0; i < 2; i++) {
            Alert acknowledgedAlert = Alert.builder()
                    .title("Acknowledged Alert " + i)
                    .description("Previously acknowledged alert " + i)
                    .severity(AlertSeverity.WARNING)
                    .status(AlertStatus.ACKNOWLEDGED)
                    .server(testServer)
                    .acknowledgedBy(testUser)
                    .acknowledgedAt(LocalDateTime.now().minusHours(i + 1))
                    .createdAt(LocalDateTime.now().minusHours(i + 2))
                    .build();
            alertRepository.save(acknowledgedAlert);
        }
    }

    @State("resolved alerts exist")
    void resolvedAlertsExist() {
        setupTestData();
        
        // Create resolved alerts
        for (int i = 0; i < 2; i++) {
            Alert resolvedAlert = Alert.builder()
                    .title("Resolved Alert " + i)
                    .description("Previously resolved alert " + i)
                    .severity(AlertSeverity.INFO)
                    .status(AlertStatus.RESOLVED)
                    .server(testServer)
                    .acknowledgedBy(testUser)
                    .acknowledgedAt(LocalDateTime.now().minusHours(i + 2))
                    .resolvedBy(testUser)
                    .resolvedAt(LocalDateTime.now().minusHours(i + 1))
                    .createdAt(LocalDateTime.now().minusHours(i + 3))
                    .build();
            alertRepository.save(resolvedAlert);
        }
    }

    @State("multiple servers with alerts exist")
    void multipleServersWithAlertsExist() {
        setupTestData();
        
        // Create additional servers with alerts
        for (int i = 0; i < 2; i++) {
            Server server = Server.builder()
                    .name("Test Server " + i)
                    .ipAddress("192.168.1." + (101 + i))
                    .port(22)
                    .type(ServerType.LINUX)
                    .description("Additional test server " + i)
                    .createdAt(LocalDateTime.now())
                    .build();
            server = serverRepository.save(server);
            
            // Create alerts for each server
            for (int j = 0; j < 2; j++) {
                Alert alert = Alert.builder()
                        .title("Server " + i + " Alert " + j)
                        .description("Alert " + j + " for server " + i)
                        .severity(j == 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING)
                        .status(AlertStatus.ACTIVE)
                        .server(server)
                        .createdAt(LocalDateTime.now().minusMinutes(j * 5))
                        .build();
                alertRepository.save(alert);
            }
        }
    }

    @State("alert can be acknowledged")
    void alertCanBeAcknowledged() {
        setupTestData();
        // Ensure alert is in ACTIVE status
        testAlert.setStatus(AlertStatus.ACTIVE);
        alertRepository.save(testAlert);
    }

    @State("alert can be resolved")
    void alertCanBeResolved() {
        setupTestData();
        // Ensure alert is in ACKNOWLEDGED status
        testAlert.setStatus(AlertStatus.ACKNOWLEDGED);
        testAlert.setAcknowledgedBy(testUser);
        testAlert.setAcknowledgedAt(LocalDateTime.now().minusMinutes(30));
        alertRepository.save(testAlert);
    }

    @State("alert cannot be acknowledged")
    void alertCannotBeAcknowledged() {
        setupTestData();
        // Set alert to already acknowledged status
        testAlert.setStatus(AlertStatus.ACKNOWLEDGED);
        testAlert.setAcknowledgedBy(testUser);
        testAlert.setAcknowledgedAt(LocalDateTime.now().minusMinutes(30));
        alertRepository.save(testAlert);
    }

    @State("bulk acknowledgment is possible")
    void bulkAcknowledgmentIsPossible() {
        setupTestData();
        
        // Create multiple active alerts
        for (int i = 0; i < 5; i++) {
            Alert alert = Alert.builder()
                    .title("Bulk Alert " + i)
                    .description("Alert " + i + " for bulk acknowledgment")
                    .severity(AlertSeverity.WARNING)
                    .status(AlertStatus.ACTIVE)
                    .server(testServer)
                    .createdAt(LocalDateTime.now().minusMinutes(i * 2))
                    .build();
            alertRepository.save(alert);
        }
    }

    @State("alert escalation is needed")
    void alertEscalationIsNeeded() {
        setupTestData();
        
        // Create old unacknowledged critical alerts
        for (int i = 0; i < 3; i++) {
            Alert oldAlert = Alert.builder()
                    .title("Old Critical Alert " + i)
                    .description("Unacknowledged critical alert " + i)
                    .severity(AlertSeverity.CRITICAL)
                    .status(AlertStatus.ACTIVE)
                    .server(testServer)
                    .createdAt(LocalDateTime.now().minusMinutes(20 + i * 5)) // Older than 15 minutes
                    .build();
            alertRepository.save(oldAlert);
        }
    }

    @State("alert statistics are available")
    void alertStatisticsAreAvailable() {
        setupTestData();
        
        // Create alerts with different statuses and severities
        AlertSeverity[] severities = {AlertSeverity.CRITICAL, AlertSeverity.WARNING, AlertSeverity.INFO};
        AlertStatus[] statuses = {AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED};
        
        for (AlertSeverity severity : severities) {
            for (AlertStatus status : statuses) {
                for (int i = 0; i < 2; i++) {
                    Alert alert = Alert.builder()
                            .title(severity + " " + status + " Alert " + i)
                            .description("Alert for statistics")
                            .severity(severity)
                            .status(status)
                            .server(testServer)
                            .createdAt(LocalDateTime.now().minusHours(i + 1))
                            .build();
                    
                    if (status != AlertStatus.ACTIVE) {
                        alert.setAcknowledgedBy(testUser);
                        alert.setAcknowledgedAt(LocalDateTime.now().minusMinutes(30));
                    }
                    
                    if (status == AlertStatus.RESOLVED) {
                        alert.setResolvedBy(testUser);
                        alert.setResolvedAt(LocalDateTime.now().minusMinutes(15));
                    }
                    
                    alertRepository.save(alert);
                }
            }
        }
    }

    @State("alert history exists")
    void alertHistoryExists() {
        setupTestData();
        
        // Create alerts with different timestamps for history
        for (int i = 0; i < 10; i++) {
            Alert historicalAlert = Alert.builder()
                    .title("Historical Alert " + i)
                    .description("Alert from " + i + " days ago")
                    .severity(i % 2 == 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING)
                    .status(i < 5 ? AlertStatus.RESOLVED : AlertStatus.ACTIVE)
                    .server(testServer)
                    .createdAt(LocalDateTime.now().minusDays(i + 1))
                    .build();
            
            if (historicalAlert.getStatus() == AlertStatus.RESOLVED) {
                historicalAlert.setAcknowledgedBy(testUser);
                historicalAlert.setAcknowledgedAt(LocalDateTime.now().minusDays(i + 1).plusHours(1));
                historicalAlert.setResolvedBy(testUser);
                historicalAlert.setResolvedAt(LocalDateTime.now().minusDays(i + 1).plusHours(2));
            }
            
            alertRepository.save(historicalAlert);
        }
    }

    private void setupTestData() {
        // Create test user
        testUser = User.builder()
                .username("contractuser")
                .email("contract@example.com")
                .password("$2a$10$encrypted.password")
                .role("ADMIN")
                .enabled(true)
                .build();
        testUser = userRepository.save(testUser);

        // Create test server
        testServer = Server.builder()
                .name("Contract Test Server")
                .ipAddress("192.168.1.100")
                .port(22)
                .type(ServerType.LINUX)
                .description("Server for contract testing")
                .createdAt(LocalDateTime.now())
                .build();
        testServer = serverRepository.save(testServer);

        // Create test alert
        testAlert = Alert.builder()
                .title("Contract Test Alert")
                .description("Alert for contract testing")
                .severity(AlertSeverity.WARNING)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();
        testAlert = alertRepository.save(testAlert);
    }
}
