package com.sams.monitor.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sams.monitor.dto.AlertDTO;
import com.sams.monitor.dto.ServerDTO;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureTestMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureTestMvc
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties")
@Transactional
class AlertServerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
        // Clean up repositories
        alertRepository.deleteAll();
        serverRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("$2a$10$encrypted.password")
                .role("ADMIN")
                .enabled(true)
                .build();
        testUser = userRepository.save(testUser);

        // Create test server
        testServer = Server.builder()
                .name("Integration Test Server")
                .ipAddress("192.168.1.200")
                .port(22)
                .type(ServerType.LINUX)
                .description("Server for integration testing")
                .createdAt(LocalDateTime.now())
                .build();
        testServer = serverRepository.save(testServer);

        // Create test alert
        testAlert = Alert.builder()
                .title("Integration Test Alert")
                .description("Alert for integration testing")
                .severity(AlertSeverity.WARNING)
                .status(AlertStatus.ACTIVE)
                .server(testServer)
                .createdAt(LocalDateTime.now())
                .build();
        testAlert = alertRepository.save(testAlert);
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void createServerAndAlert_ShouldWorkEndToEnd() throws Exception {
        // Create a new server
        ServerDTO serverDTO = ServerDTO.builder()
                .name("New Integration Server")
                .ipAddress("192.168.1.201")
                .port(22)
                .type(ServerType.LINUX)
                .description("New server for testing")
                .build();

        String serverResponse = mockMvc.perform(post("/api/v1/servers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(serverDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("New Integration Server")))
                .andExpect(jsonPath("$.ipAddress", is("192.168.1.201")))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Server createdServer = objectMapper.readValue(serverResponse, Server.class);

        // Create an alert for the new server
        AlertDTO alertDTO = AlertDTO.builder()
                .title("High CPU Alert")
                .description("CPU usage exceeded threshold")
                .severity(AlertSeverity.CRITICAL)
                .serverId(createdServer.getId())
                .build();

        mockMvc.perform(post("/api/v1/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(alertDTO)))
                .andExpect(status().isCreated())
                .andExpected(jsonPath("$.title", is("High CPU Alert")))
                .andExpect(jsonPath("$.severity", is("CRITICAL")))
                .andExpect(jsonPath("$.server.id", is(createdServer.getId().toString())));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void getAlertsForServer_ShouldReturnServerAlerts() throws Exception {
        mockMvc.perform(get("/api/v1/servers/{serverId}/alerts", testServer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id", is(testAlert.getId().toString())))
                .andExpect(jsonPath("$.content[0].server.id", is(testServer.getId().toString())));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void acknowledgeAlert_ShouldUpdateAlertAndServer() throws Exception {
        String acknowledgeRequest = """
            {
                "notes": "Alert acknowledged during integration test"
            }
            """;

        mockMvc.perform(post("/api/v1/alerts/{alertId}/acknowledge", testAlert.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(acknowledgeRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ACKNOWLEDGED")))
                .andExpect(jsonPath("$.acknowledgedBy.username", is("testuser")))
                .andExpect(jsonPath("$.acknowledgedAt", notNullValue()));

        // Verify server alert count is updated
        mockMvc.perform(get("/api/v1/servers/{serverId}", testServer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeAlertsCount", is(0)));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void deleteServer_ShouldCascadeDeleteAlerts() throws Exception {
        // Verify alert exists
        mockMvc.perform(get("/api/v1/alerts/{alertId}", testAlert.getId()))
                .andExpect(status().isOk());

        // Delete server
        mockMvc.perform(delete("/api/v1/servers/{serverId}", testServer.getId()))
                .andExpect(status().isNoContent());

        // Verify alert is also deleted (cascade)
        mockMvc.perform(get("/api/v1/alerts/{alertId}", testAlert.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void serverMetricsUpdate_ShouldTriggerAlerts() throws Exception {
        String metricsUpdate = """
            {
                "cpuUsage": 95.0,
                "memoryUsage": 90.0,
                "diskUsage": 85.0,
                "networkIn": 10000,
                "networkOut": 20000
            }
            """;

        mockMvc.perform(post("/api/v1/servers/{serverId}/metrics", testServer.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(metricsUpdate))
                .andExpect(status().isOk());

        // Check if high CPU usage triggered an alert
        mockMvc.perform(get("/api/v1/servers/{serverId}/alerts", testServer.getId())
                .param("severity", "CRITICAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThan(0))));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void bulkOperations_ShouldWorkAcrossServices() throws Exception {
        // Create multiple alerts
        for (int i = 0; i < 3; i++) {
            Alert alert = Alert.builder()
                    .title("Bulk Test Alert " + i)
                    .description("Alert " + i + " for bulk testing")
                    .severity(AlertSeverity.WARNING)
                    .status(AlertStatus.ACTIVE)
                    .server(testServer)
                    .createdAt(LocalDateTime.now())
                    .build();
            alertRepository.save(alert);
        }

        // Get all alerts for the server
        String alertsResponse = mockMvc.perform(get("/api/v1/servers/{serverId}/alerts", testServer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(4))) // 1 original + 3 new
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Extract alert IDs for bulk acknowledge
        String bulkAcknowledgeRequest = """
            {
                "alertIds": [
                    "%s"
                ],
                "notes": "Bulk acknowledge during integration test"
            }
            """.formatted(testAlert.getId());

        mockMvc.perform(post("/api/v1/alerts/bulk-acknowledge")
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkAcknowledgeRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status", is("ACKNOWLEDGED")));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void alertEscalation_ShouldUpdateServerPriority() throws Exception {
        // Create a critical alert
        AlertDTO criticalAlert = AlertDTO.builder()
                .title("Critical System Failure")
                .description("System is completely down")
                .severity(AlertSeverity.CRITICAL)
                .serverId(testServer.getId())
                .build();

        mockMvc.perform(post("/api/v1/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(criticalAlert)))
                .andExpect(status().isCreated());

        // Trigger escalation process
        mockMvc.perform(post("/api/v1/alerts/escalate-unacknowledged"))
                .andExpect(status().isOk());

        // Verify server priority is updated
        mockMvc.perform(get("/api/v1/servers/{serverId}", testServer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority", is("HIGH")));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void serverStatusChange_ShouldCreateStatusAlert() throws Exception {
        String statusUpdate = """
            {
                "status": "OFFLINE"
            }
            """;

        mockMvc.perform(patch("/api/v1/servers/{serverId}/status", testServer.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusUpdate))
                .andExpect(status().isOk());

        // Verify status change alert was created
        mockMvc.perform(get("/api/v1/servers/{serverId}/alerts", testServer.getId())
                .param("type", "STATUS_CHANGE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.content[0].title", containsString("Status Changed")));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void alertStatistics_ShouldReflectServerChanges() throws Exception {
        // Get initial statistics
        mockMvc.perform(get("/api/v1/alerts/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCount", is(1)));

        // Acknowledge the alert
        mockMvc.perform(post("/api/v1/alerts/{alertId}/acknowledge", testAlert.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"notes\": \"Test acknowledge\"}"))
                .andExpect(status().isOk());

        // Verify statistics are updated
        mockMvc.perform(get("/api/v1/alerts/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCount", is(0)))
                .andExpect(jsonPath("$.acknowledgedCount", is(1)));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"ADMIN"})
    void crossServiceDataConsistency_ShouldMaintainIntegrity() throws Exception {
        // Create alert through alert service
        AlertDTO newAlert = AlertDTO.builder()
                .title("Consistency Test Alert")
                .description("Testing data consistency")
                .severity(AlertSeverity.INFO)
                .serverId(testServer.getId())
                .build();

        String alertResponse = mockMvc.perform(post("/api/v1/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newAlert)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Alert createdAlert = objectMapper.readValue(alertResponse, Alert.class);

        // Verify alert appears in server's alert list
        mockMvc.perform(get("/api/v1/servers/{serverId}/alerts", testServer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + createdAlert.getId() + "')]", hasSize(1)));

        // Verify server's alert count is updated
        mockMvc.perform(get("/api/v1/servers/{serverId}", testServer.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeAlertsCount", is(2))); // Original + new alert
    }
}
