package com.sams.monitor.service;

import com.sams.monitor.dto.ServerDTO;
import com.sams.monitor.dto.ServerMetricsDTO;
import com.sams.monitor.entity.Server;
import com.sams.monitor.entity.ServerMetrics;
import com.sams.monitor.enums.ServerStatus;
import com.sams.monitor.enums.ServerType;
import com.sams.monitor.repository.ServerRepository;
import com.sams.monitor.repository.ServerMetricsRepository;
import com.sams.monitor.service.impl.ServerServiceImpl;
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
class ServerServiceTest {

    @Mock
    private ServerRepository serverRepository;

    @Mock
    private ServerMetricsRepository metricsRepository;

    @Mock
    private MonitoringAgentService agentService;

    @Mock
    private AlertService alertService;

    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private ServerServiceImpl serverService;

    private Server testServer;
    private ServerDTO testServerDTO;
    private ServerMetrics testMetrics;

    @BeforeEach
    void setUp() {
        testServer = Server.builder()
                .id(UUID.randomUUID())
                .name("Test Server")
                .ipAddress("192.168.1.100")
                .port(22)
                .type(ServerType.LINUX)
                .status(ServerStatus.ONLINE)
                .description("Test server for unit testing")
                .createdAt(LocalDateTime.now())
                .lastSeen(LocalDateTime.now())
                .build();

        testServerDTO = ServerDTO.builder()
                .name("New Test Server")
                .ipAddress("192.168.1.101")
                .port(22)
                .type(ServerType.LINUX)
                .description("New test server")
                .build();

        testMetrics = ServerMetrics.builder()
                .id(UUID.randomUUID())
                .server(testServer)
                .cpuUsage(75.5)
                .memoryUsage(60.2)
                .diskUsage(45.8)
                .networkIn(1024L)
                .networkOut(2048L)
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Test
    void createServer_ShouldCreateAndReturnServer() {
        // Given
        when(serverRepository.existsByIpAddressAndPort(testServerDTO.getIpAddress(), testServerDTO.getPort()))
                .thenReturn(false);
        when(serverRepository.save(any(Server.class))).thenReturn(testServer);

        // When
        Server result = serverService.createServer(testServerDTO);

        // Then
        assertNotNull(result);
        assertEquals(testServer.getName(), result.getName());
        assertEquals(testServer.getIpAddress(), result.getIpAddress());
        verify(serverRepository).save(any(Server.class));
        verify(agentService).deployAgent(any(Server.class));
    }

    @Test
    void createServer_WithDuplicateIpAndPort_ShouldThrowException() {
        // Given
        when(serverRepository.existsByIpAddressAndPort(testServerDTO.getIpAddress(), testServerDTO.getPort()))
                .thenReturn(true);

        // When & Then
        assertThrows(RuntimeException.class, () -> serverService.createServer(testServerDTO));
        verify(serverRepository, never()).save(any(Server.class));
    }

    @Test
    void getServers_ShouldReturnPagedServers() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Server> servers = Arrays.asList(testServer);
        Page<Server> serverPage = new PageImpl<>(servers, pageable, 1);
        
        when(serverRepository.findAll(pageable)).thenReturn(serverPage);

        // When
        Page<Server> result = serverService.getServers(pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(testServer.getId(), result.getContent().get(0).getId());
    }

    @Test
    void getServerById_ShouldReturnServer() {
        // Given
        UUID serverId = testServer.getId();
        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));

        // When
        Server result = serverService.getServerById(serverId);

        // Then
        assertNotNull(result);
        assertEquals(testServer.getId(), result.getId());
        assertEquals(testServer.getName(), result.getName());
    }

    @Test
    void getServerById_WithInvalidId_ShouldThrowException() {
        // Given
        UUID invalidId = UUID.randomUUID();
        when(serverRepository.findById(invalidId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> serverService.getServerById(invalidId));
    }

    @Test
    void updateServer_ShouldUpdateAndReturnServer() {
        // Given
        UUID serverId = testServer.getId();
        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));
        when(serverRepository.save(any(Server.class))).thenReturn(testServer);

        // When
        Server result = serverService.updateServer(serverId, testServerDTO);

        // Then
        assertNotNull(result);
        verify(serverRepository).save(testServer);
        verify(webSocketService).broadcastServerUpdate(testServer);
    }

    @Test
    void deleteServer_ShouldDeleteServer() {
        // Given
        UUID serverId = testServer.getId();
        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));

        // When
        serverService.deleteServer(serverId);

        // Then
        verify(agentService).removeAgent(testServer);
        verify(serverRepository).delete(testServer);
    }

    @Test
    void testConnection_ShouldReturnConnectionStatus() {
        // Given
        UUID serverId = testServer.getId();
        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));
        when(agentService.testConnection(testServer)).thenReturn(true);

        // When
        boolean result = serverService.testConnection(serverId);

        // Then
        assertTrue(result);
        verify(agentService).testConnection(testServer);
    }

    @Test
    void deployAgent_ShouldDeployAgentToServer() {
        // Given
        UUID serverId = testServer.getId();
        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));
        when(agentService.deployAgent(testServer)).thenReturn(true);

        // When
        boolean result = serverService.deployAgent(serverId);

        // Then
        assertTrue(result);
        verify(agentService).deployAgent(testServer);
    }

    @Test
    void updateServerMetrics_ShouldSaveMetricsAndCheckThresholds() {
        // Given
        UUID serverId = testServer.getId();
        ServerMetricsDTO metricsDTO = ServerMetricsDTO.builder()
                .cpuUsage(85.0)
                .memoryUsage(90.0)
                .diskUsage(95.0)
                .networkIn(5000L)
                .networkOut(10000L)
                .build();

        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));
        when(metricsRepository.save(any(ServerMetrics.class))).thenReturn(testMetrics);

        // When
        serverService.updateServerMetrics(serverId, metricsDTO);

        // Then
        verify(metricsRepository).save(any(ServerMetrics.class));
        verify(alertService).checkMetricThresholds(eq(testServer), any(ServerMetrics.class));
        verify(webSocketService).broadcastMetricsUpdate(eq(serverId), any(ServerMetrics.class));
    }

    @Test
    void getServerMetrics_ShouldReturnMetricsHistory() {
        // Given
        UUID serverId = testServer.getId();
        LocalDateTime startTime = LocalDateTime.now().minusHours(24);
        LocalDateTime endTime = LocalDateTime.now();
        List<ServerMetrics> metrics = Arrays.asList(testMetrics);

        when(metricsRepository.findByServerIdAndTimestampBetweenOrderByTimestampDesc(
                serverId, startTime, endTime)).thenReturn(metrics);

        // When
        List<ServerMetrics> result = serverService.getServerMetrics(serverId, startTime, endTime);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testMetrics.getId(), result.get(0).getId());
    }

    @Test
    void getLatestMetrics_ShouldReturnLatestMetrics() {
        // Given
        UUID serverId = testServer.getId();
        when(metricsRepository.findTopByServerIdOrderByTimestampDesc(serverId))
                .thenReturn(Optional.of(testMetrics));

        // When
        Optional<ServerMetrics> result = serverService.getLatestMetrics(serverId);

        // Then
        assertTrue(result.isPresent());
        assertEquals(testMetrics.getId(), result.get().getId());
    }

    @Test
    void updateServerStatus_ShouldUpdateStatusAndNotify() {
        // Given
        UUID serverId = testServer.getId();
        ServerStatus newStatus = ServerStatus.OFFLINE;
        when(serverRepository.findById(serverId)).thenReturn(Optional.of(testServer));
        when(serverRepository.save(any(Server.class))).thenReturn(testServer);

        // When
        serverService.updateServerStatus(serverId, newStatus);

        // Then
        assertEquals(newStatus, testServer.getStatus());
        verify(serverRepository).save(testServer);
        verify(webSocketService).broadcastServerUpdate(testServer);
        verify(alertService).createServerStatusAlert(testServer, newStatus);
    }

    @Test
    void getServersByStatus_ShouldReturnFilteredServers() {
        // Given
        ServerStatus status = ServerStatus.ONLINE;
        List<Server> servers = Arrays.asList(testServer);
        when(serverRepository.findByStatus(status)).thenReturn(servers);

        // When
        List<Server> result = serverService.getServersByStatus(status);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testServer.getId(), result.get(0).getId());
    }

    @Test
    void getServerStatistics_ShouldReturnCorrectStats() {
        // Given
        when(serverRepository.countByStatus(ServerStatus.ONLINE)).thenReturn(10L);
        when(serverRepository.countByStatus(ServerStatus.OFFLINE)).thenReturn(2L);
        when(serverRepository.countByStatus(ServerStatus.MAINTENANCE)).thenReturn(1L);
        when(serverRepository.count()).thenReturn(13L);

        // When
        var stats = serverService.getServerStatistics();

        // Then
        assertNotNull(stats);
        assertEquals(10L, stats.getOnlineCount());
        assertEquals(2L, stats.getOfflineCount());
        assertEquals(1L, stats.getMaintenanceCount());
        assertEquals(13L, stats.getTotalCount());
    }

    @Test
    void performHealthCheck_ShouldCheckAllServersHealth() {
        // Given
        List<Server> servers = Arrays.asList(testServer);
        when(serverRepository.findAll()).thenReturn(servers);
        when(agentService.performHealthCheck(testServer)).thenReturn(true);

        // When
        serverService.performHealthCheck();

        // Then
        verify(agentService).performHealthCheck(testServer);
        verify(serverRepository).save(testServer);
    }

    @Test
    void cleanupOldMetrics_ShouldDeleteExpiredMetrics() {
        // Given
        int retentionDays = 30;
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
        when(metricsRepository.deleteByTimestampBefore(cutoffDate)).thenReturn(100);

        // When
        int deletedCount = serverService.cleanupOldMetrics(retentionDays);

        // Then
        assertEquals(100, deletedCount);
        verify(metricsRepository).deleteByTimestampBefore(cutoffDate);
    }
}
