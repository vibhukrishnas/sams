package com.monitoring.server.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoring.server.dto.CreateServerRequest;
import com.monitoring.server.dto.UpdateServerRequest;
import com.monitoring.server.entity.Server;
import com.monitoring.server.service.ServerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for ServerController
 */
@WebMvcTest(ServerController.class)
class ServerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ServerService serverService;

    @Autowired
    private ObjectMapper objectMapper;

    private Server testServer;
    private CreateServerRequest createRequest;
    private UpdateServerRequest updateRequest;

    @BeforeEach
    void setUp() {
        testServer = new Server();
        testServer.setId(1L);
        testServer.setHostname("test-server-01");
        testServer.setIpAddress("192.168.1.100");
        testServer.setOperatingSystem("Ubuntu 22.04");
        testServer.setStatus("ONLINE");
        testServer.setLastSeen(LocalDateTime.now());
        testServer.setCreatedAt(LocalDateTime.now());

        createRequest = new CreateServerRequest();
        createRequest.setHostname("new-server-01");
        createRequest.setIpAddress("192.168.1.200");
        createRequest.setOperatingSystem("CentOS 8");
        createRequest.setGroup("web-servers");

        updateRequest = new UpdateServerRequest();
        updateRequest.setHostname("updated-server-01");
        updateRequest.setGroup("database-servers");
        updateRequest.setStatus("MAINTENANCE");
    }

    @Test
    @WithMockUser
    void getAllServers_ShouldReturnServerList() throws Exception {
        // Given
        List<Server> servers = Arrays.asList(testServer);
        when(serverService.getAllServers()).thenReturn(servers);

        // When & Then
        mockMvc.perform(get("/api/v1/servers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].hostname").value("test-server-01"))
                .andExpect(jsonPath("$.data[0].ipAddress").value("192.168.1.100"));
    }

    @Test
    @WithMockUser
    void getServerById_WithValidId_ShouldReturnServer() throws Exception {
        // Given
        when(serverService.getServerById(1L)).thenReturn(Optional.of(testServer));

        // When & Then
        mockMvc.perform(get("/api/v1/servers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hostname").value("test-server-01"))
                .andExpect(jsonPath("$.data.ipAddress").value("192.168.1.100"));
    }

    @Test
    @WithMockUser
    void getServerById_WithInvalidId_ShouldReturnNotFound() throws Exception {
        // Given
        when(serverService.getServerById(999L)).thenReturn(Optional.empty());

        // When & Then
        mockMvc.perform(get("/api/v1/servers/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.message").value("Server not found"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createServer_WithValidData_ShouldCreateServer() throws Exception {
        // Given
        when(serverService.createServer(any(CreateServerRequest.class))).thenReturn(testServer);

        // When & Then
        mockMvc.perform(post("/api/v1/servers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hostname").value("test-server-01"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createServer_WithInvalidData_ShouldReturnBadRequest() throws Exception {
        // Given
        createRequest.setHostname(""); // Invalid hostname

        // When & Then
        mockMvc.perform(post("/api/v1/servers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateServer_WithValidData_ShouldUpdateServer() throws Exception {
        // Given
        Server updatedServer = new Server();
        updatedServer.setId(1L);
        updatedServer.setHostname("updated-server-01");
        updatedServer.setGroup("database-servers");
        updatedServer.setStatus("MAINTENANCE");

        when(serverService.updateServer(eq(1L), any(UpdateServerRequest.class)))
                .thenReturn(Optional.of(updatedServer));

        // When & Then
        mockMvc.perform(put("/api/v1/servers/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hostname").value("updated-server-01"))
                .andExpect(jsonPath("$.data.group").value("database-servers"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateServer_WithInvalidId_ShouldReturnNotFound() throws Exception {
        // Given
        when(serverService.updateServer(eq(999L), any(UpdateServerRequest.class)))
                .thenReturn(Optional.empty());

        // When & Then
        mockMvc.perform(put("/api/v1/servers/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteServer_WithValidId_ShouldDeleteServer() throws Exception {
        // Given
        when(serverService.deleteServer(1L)).thenReturn(true);

        // When & Then
        mockMvc.perform(delete("/api/v1/servers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Server deleted successfully"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteServer_WithInvalidId_ShouldReturnNotFound() throws Exception {
        // Given
        when(serverService.deleteServer(999L)).thenReturn(false);

        // When & Then
        mockMvc.perform(delete("/api/v1/servers/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser
    void getServerMetrics_WithValidId_ShouldReturnMetrics() throws Exception {
        // Given
        // Mock metrics data would be returned by service

        // When & Then
        mockMvc.perform(get("/api/v1/servers/1/metrics")
                .param("from", "2024-01-01T00:00:00Z")
                .param("to", "2024-01-01T23:59:59Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser
    void getServerHealth_WithValidId_ShouldReturnHealthStatus() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/servers/1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = "USER")
    void createServer_WithUserRole_ShouldReturnForbidden() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/servers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAllServers_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/servers"))
                .andExpect(status().isUnauthorized());
    }
}
