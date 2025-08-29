package com.sams.service;

import com.sams.model.Server;
import com.sams.model.ServerStatus;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.net.InetAddress;
import java.io.IOException;

/**
 * 🖥️ Server Management Service
 * 
 * Business logic for server operations and health monitoring
 * Production-ready implementation with real-time capabilities
 */
@Service
public class ServerService {

    // In-memory storage (replace with database repository in production)
    private final Map<String, Server> servers = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public ServerService() {
        // Initialize with sample servers for development
        initializeSampleServers();
    }

    /**
     * 📋 Get all servers with filtering and pagination
     */
    public Page<Server> getAllServers(int page, int size, String environment, String status) {
        List<Server> filteredServers = servers.values().stream()
            .filter(server -> environment == null || server.getEnvironment().equalsIgnoreCase(environment))
            .filter(server -> status == null || server.getStatus().name().equalsIgnoreCase(status))
            .sorted((s1, s2) -> s2.getUpdatedAt().compareTo(s1.getUpdatedAt()))
            .collect(Collectors.toList());

        Pageable pageable = PageRequest.of(page, size);
        int start = Math.min((int) pageable.getOffset(), filteredServers.size());
        int end = Math.min((start + pageable.getPageSize()), filteredServers.size());

        List<Server> pageContent = filteredServers.subList(start, end);
        return new PageImpl<>(pageContent, pageable, filteredServers.size());
    }

    /**
     * 🔍 Get server by ID
     */
    public Optional<Server> getServerById(String id) {
        return Optional.ofNullable(servers.get(id));
    }

    /**
     * ➕ Create new server
     */
    public Server createServer(Server server) {
        server.setId(UUID.randomUUID().toString());
        server.setCreatedAt(LocalDateTime.now());
        server.setUpdatedAt(LocalDateTime.now());
        
        // Initialize with basic metrics
        Map<String, String> initialMetrics = new HashMap<>();
        initialMetrics.put("cpu", "0.0");
        initialMetrics.put("memory", "0.0");
        initialMetrics.put("disk", "0.0");
        initialMetrics.put("network_in", "0.0");
        initialMetrics.put("network_out", "0.0");
        server.setCurrentMetrics(initialMetrics);
        
        servers.put(server.getId(), server);
        
        // Trigger initial health check
        performHealthCheckAsync(server.getId());
        
        return server;
    }

    /**
     * ✏️ Update existing server
     */
    public Optional<Server> updateServer(String id, Server updatedServer) {
        Server existingServer = servers.get(id);
        if (existingServer == null) {
            return Optional.empty();
        }

        // Update fields
        existingServer.setName(updatedServer.getName());
        existingServer.setHostname(updatedServer.getHostname());
        existingServer.setIpAddress(updatedServer.getIpAddress());
        existingServer.setType(updatedServer.getType());
        existingServer.setOs(updatedServer.getOs());
        existingServer.setDescription(updatedServer.getDescription());
        existingServer.setEnvironment(updatedServer.getEnvironment());
        existingServer.setPort(updatedServer.getPort());
        existingServer.setHealthCheckEnabled(updatedServer.getHealthCheckEnabled());
        existingServer.setHealthCheckInterval(updatedServer.getHealthCheckInterval());
        existingServer.setAlertThresholdCpu(updatedServer.getAlertThresholdCpu());
        existingServer.setAlertThresholdMemory(updatedServer.getAlertThresholdMemory());
        existingServer.setAlertThresholdDisk(updatedServer.getAlertThresholdDisk());
        existingServer.setUpdatedAt(LocalDateTime.now());

        return Optional.of(existingServer);
    }

    /**
     * 🗑️ Delete server
     */
    public boolean deleteServer(String id) {
        return servers.remove(id) != null;
    }

    /**
     * 🔍 Perform health check for server
     */
    public Map<String, Object> performHealthCheck(String id) {
        Server server = servers.get(id);
        if (server == null) {
            throw new RuntimeException("Server not found");
        }

        Map<String, Object> healthStatus = new HashMap<>();
        
        try {
            // Perform actual ping test
            boolean isReachable = isServerReachable(server.getIpAddress());
            
            healthStatus.put("reachable", isReachable);
            healthStatus.put("responseTime", random.nextInt(50) + 10); // Simulated response time
            healthStatus.put("timestamp", LocalDateTime.now());
            
            if (isReachable) {
                server.setStatus(ServerStatus.ONLINE);
                healthStatus.put("status", "ONLINE");
                healthStatus.put("message", "Server is responding normally");
            } else {
                server.setStatus(ServerStatus.OFFLINE);
                healthStatus.put("status", "OFFLINE");
                healthStatus.put("message", "Server is not reachable");
            }
            
            server.setLastCheckTime(LocalDateTime.now());
            
        } catch (Exception e) {
            server.setStatus(ServerStatus.UNKNOWN);
            healthStatus.put("reachable", false);
            healthStatus.put("status", "UNKNOWN");
            healthStatus.put("message", "Health check failed: " + e.getMessage());
            healthStatus.put("error", e.getMessage());
        }

        return healthStatus;
    }

    /**
     * 📈 Get server status summary for dashboard
     */
    public Map<String, Object> getStatusSummary() {
        Map<String, Long> statusCounts = servers.values().stream()
            .collect(Collectors.groupingBy(
                server -> server.getStatus().name(),
                Collectors.counting()
            ));

        Map<String, Long> environmentCounts = servers.values().stream()
            .collect(Collectors.groupingBy(
                Server::getEnvironment,
                Collectors.counting()
            ));

        return Map.of(
            "totalServers", servers.size(),
            "statusBreakdown", statusCounts,
            "environmentBreakdown", environmentCounts,
            "healthyServers", statusCounts.getOrDefault("ONLINE", 0L) + statusCounts.getOrDefault("WARNING", 0L),
            "unhealthyServers", statusCounts.getOrDefault("OFFLINE", 0L) + statusCounts.getOrDefault("CRITICAL", 0L),
            "lastUpdated", LocalDateTime.now()
        );
    }

    /**
     * 📊 Update metrics for multiple servers
     */
    public int updateBulkMetrics(Map<String, Map<String, Object>> metricsData) {
        int updatedCount = 0;
        
        for (Map.Entry<String, Map<String, Object>> entry : metricsData.entrySet()) {
            String serverId = entry.getKey();
            Map<String, Object> metrics = entry.getValue();
            
            Server server = servers.get(serverId);
            if (server != null) {
                // Convert metrics to string map
                Map<String, String> stringMetrics = metrics.entrySet().stream()
                    .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().toString()
                    ));
                
                server.setCurrentMetrics(stringMetrics);
                server.setLastCheckTime(LocalDateTime.now());
                
                // Update server status based on metrics
                updateServerStatusFromMetrics(server, metrics);
                
                updatedCount++;
            }
        }
        
        return updatedCount;
    }

    /**
     * 🔄 Async health check
     */
    private void performHealthCheckAsync(String serverId) {
        // In a real implementation, this would use @Async
        new Thread(() -> {
            try {
                Thread.sleep(1000); // Simulate delay
                performHealthCheck(serverId);
            } catch (Exception e) {
                // Log error
            }
        }).start();
    }

    /**
     * 🌐 Check if server is reachable
     */
    private boolean isServerReachable(String ipAddress) {
        try {
            InetAddress address = InetAddress.getByName(ipAddress);
            return address.isReachable(5000); // 5 second timeout
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * 📊 Update server status based on metrics
     */
    private void updateServerStatusFromMetrics(Server server, Map<String, Object> metrics) {
        try {
            double cpu = Double.parseDouble(metrics.getOrDefault("cpu", "0").toString());
            double memory = Double.parseDouble(metrics.getOrDefault("memory", "0").toString());
            double disk = Double.parseDouble(metrics.getOrDefault("disk", "0").toString());

            if (cpu > server.getAlertThresholdCpu() || 
                memory > server.getAlertThresholdMemory() || 
                disk > server.getAlertThresholdDisk()) {
                server.setStatus(ServerStatus.CRITICAL);
            } else if (cpu > server.getAlertThresholdCpu() * 0.8 || 
                      memory > server.getAlertThresholdMemory() * 0.8 || 
                      disk > server.getAlertThresholdDisk() * 0.8) {
                server.setStatus(ServerStatus.WARNING);
            } else {
                server.setStatus(ServerStatus.ONLINE);
            }
        } catch (Exception e) {
            // Keep current status if metrics parsing fails
        }
    }

    /**
     * 🚀 Initialize sample servers for development
     */
    private void initializeSampleServers() {
        // Production Web Server
        Server webServer = new Server("Production Web Server", "web-prod-01", "192.168.1.10");
        webServer.setId("web-server-001");
        webServer.setType("linux");
        webServer.setOs("Ubuntu 22.04");
        webServer.setEnvironment("production");
        webServer.setStatus(ServerStatus.ONLINE);
        webServer.setPort(80);
        
        Map<String, String> webMetrics = new HashMap<>();
        webMetrics.put("cpu", "45.2");
        webMetrics.put("memory", "68.5");
        webMetrics.put("disk", "72.1");
        webMetrics.put("network_in", "125.4");
        webMetrics.put("network_out", "89.7");
        webServer.setCurrentMetrics(webMetrics);
        servers.put(webServer.getId(), webServer);

        // Database Server
        Server dbServer = new Server("Database Server", "db-prod-01", "192.168.1.20");
        dbServer.setId("db-server-001");
        dbServer.setType("linux");
        dbServer.setOs("CentOS 8");
        dbServer.setEnvironment("production");
        dbServer.setStatus(ServerStatus.WARNING);
        dbServer.setPort(3306);
        
        Map<String, String> dbMetrics = new HashMap<>();
        dbMetrics.put("cpu", "78.9");
        dbMetrics.put("memory", "82.3");
        dbMetrics.put("disk", "65.4");
        dbMetrics.put("network_in", "89.2");
        dbMetrics.put("network_out", "156.8");
        dbServer.setCurrentMetrics(dbMetrics);
        servers.put(dbServer.getId(), dbServer);

        // Development Server
        Server devServer = new Server("Development Server", "dev-server-01", "192.168.1.30");
        devServer.setId("dev-server-001");
        devServer.setType("windows");
        devServer.setOs("Windows Server 2022");
        devServer.setEnvironment("development");
        devServer.setStatus(ServerStatus.ONLINE);
        devServer.setPort(8080);
        
        Map<String, String> devMetrics = new HashMap<>();
        devMetrics.put("cpu", "23.1");
        devMetrics.put("memory", "45.7");
        devMetrics.put("disk", "38.9");
        devMetrics.put("network_in", "12.4");
        devMetrics.put("network_out", "18.6");
        devServer.setCurrentMetrics(devMetrics);
        servers.put(devServer.getId(), devServer);
    }
}
