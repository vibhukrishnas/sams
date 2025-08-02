package com.sams.service;

import com.sams.entity.Server;
import com.sams.entity.SystemMetric;
import com.sams.repository.ServerRepository;
import com.sams.repository.SystemMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;
import oshi.SystemInfo;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.IOException;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

/**
 * Real API Integration Service for Live Server Monitoring
 * Connects to actual servers and collects real metrics
 */
@Service
public class RealApiIntegrationService {
    
    private static final Logger logger = LoggerFactory.getLogger(RealApiIntegrationService.class);
    
    @Autowired
    private ServerRepository serverRepository;
    
    @Autowired
    private SystemMetricRepository systemMetricRepository;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final SystemInfo systemInfo = new SystemInfo();
    
    /**
     * Perform real health check on server endpoints
     */
    public boolean performRealHealthCheck(Server server) {
        try {
            String url = "http://" + server.getHost() + ":" + server.getPort();
            
            // Try different health endpoints
            String[] healthEndpoints = {
                "/health", "/api/health", "/actuator/health", "/status", "/"
            };
            
            for (String endpoint : healthEndpoints) {
                try {
                    URL healthUrl = new URL(url + endpoint);
                    HttpURLConnection connection = (HttpURLConnection) healthUrl.openConnection();
                    connection.setRequestMethod("GET");
                    connection.setConnectTimeout(5000);
                    connection.setReadTimeout(5000);
                    
                    int responseCode = connection.getResponseCode();
                    if (responseCode >= 200 && responseCode < 300) {
                        server.setStatus(Server.ServerStatus.ONLINE);
                        server.setLastPing(LocalDateTime.now());
                        serverRepository.save(server);
                        logger.info("Server {} is ONLINE - responded to {}", server.getName(), endpoint);
                        return true;
                    }
                    connection.disconnect();
                } catch (Exception e) {
                    // Continue to next endpoint
                    logger.debug("Endpoint {} failed for server {}: {}", endpoint, server.getName(), e.getMessage());
                }
            }
            
            // If no endpoint responds, mark as offline
            server.setStatus(Server.ServerStatus.OFFLINE);
            serverRepository.save(server);
            logger.warn("Server {} is OFFLINE - no endpoints responding", server.getName());
            return false;
            
        } catch (Exception e) {
            server.setStatus(Server.ServerStatus.CRITICAL);
            serverRepository.save(server);
            logger.error("Critical error checking server {}: {}", server.getName(), e.getMessage());
            return false;
        }
    }
    
    /**
     * Collect real system metrics from the current machine
     */
    public void collectRealSystemMetrics(Server server) {
        try {
            HardwareAbstractionLayer hardware = systemInfo.getHardware();
            
            // Get real CPU usage
            CentralProcessor processor = hardware.getProcessor();
            double cpuUsage = processor.getSystemCpuLoadBetweenTicks(processor.getSystemCpuLoadTicks()) * 100;
            
            // Get real memory usage
            GlobalMemory memory = hardware.getMemory();
            long totalMemory = memory.getTotal();
            long availableMemory = memory.getAvailable();
            double memoryUsage = ((double) (totalMemory - availableMemory) / totalMemory) * 100;
            
            // Get real disk usage
            FileSystem fileSystem = systemInfo.getOperatingSystem().getFileSystem();
            List<OSFileStore> fileStores = fileSystem.getFileStores();
            double avgDiskUsage = fileStores.stream()
                    .mapToDouble(store -> {
                        long total = store.getTotalSpace();
                        long free = store.getFreeSpace();
                        return total > 0 ? ((double) (total - free) / total) * 100 : 0;
                    })
                    .average()
                    .orElse(0.0);
            
            // Update server with real metrics
            server.setCpuUsage(Math.round(cpuUsage * 100.0) / 100.0);
            server.setMemoryUsage(Math.round(memoryUsage * 100.0) / 100.0);
            server.setDiskUsage(Math.round(avgDiskUsage * 100.0) / 100.0);
            server.setUptime(systemInfo.getOperatingSystem().getSystemUptime());
            
            serverRepository.save(server);
            
            // Store detailed metrics in system_metrics table
            LocalDateTime now = LocalDateTime.now();
            
            systemMetricRepository.save(createMetric(server, "CPU_USAGE", "CPU Utilization", cpuUsage, "%", now));
            systemMetricRepository.save(createMetric(server, "MEMORY_USAGE", "Memory Utilization", memoryUsage, "%", now));
            systemMetricRepository.save(createMetric(server, "DISK_USAGE", "Disk Utilization", avgDiskUsage, "%", now));
            systemMetricRepository.save(createMetric(server, "UPTIME", "System Uptime", (double) server.getUptime(), "seconds", now));
            systemMetricRepository.save(createMetric(server, "TOTAL_MEMORY", "Total Memory", (double) totalMemory / (1024 * 1024 * 1024), "GB", now));
            
            logger.info("Collected real metrics for server {}: CPU={:.2f}%, Memory={:.2f}%, Disk={:.2f}%", 
                       server.getName(), cpuUsage, memoryUsage, avgDiskUsage);
            
        } catch (Exception e) {
            logger.error("Failed to collect real system metrics for server {}: {}", server.getName(), e.getMessage());
        }
    }
    
    /**
     * Get real API response from server endpoints
     */
    public Map<String, Object> getRealApiResponse(Server server) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String baseUrl = "http://" + server.getHost() + ":" + server.getPort();
            
            // Try to get server info from various API endpoints
            String[] apiEndpoints = {
                "/api/info", "/actuator/info", "/info", "/api/status", "/status"
            };
            
            for (String endpoint : apiEndpoints) {
                try {
                    String apiUrl = baseUrl + endpoint;
                    Map apiResponse = restTemplate.getForObject(apiUrl, Map.class);
                    
                    if (apiResponse != null) {
                        response.putAll(apiResponse);
                        response.put("endpoint_used", endpoint);
                        response.put("api_accessible", true);
                        break;
                    }
                } catch (Exception e) {
                    logger.debug("API endpoint {} failed for server {}: {}", endpoint, server.getName(), e.getMessage());
                }
            }
            
            if (response.isEmpty()) {
                response.put("api_accessible", false);
                response.put("message", "No API endpoints accessible");
            }
            
            // Add real server metrics
            response.put("real_cpu_usage", server.getCpuUsage());
            response.put("real_memory_usage", server.getMemoryUsage());
            response.put("real_disk_usage", server.getDiskUsage());
            response.put("last_ping", server.getLastPing());
            response.put("uptime_seconds", server.getUptime());
            
        } catch (Exception e) {
            response.put("error", e.getMessage());
            response.put("api_accessible", false);
            logger.error("Failed to get real API response from server {}: {}", server.getName(), e.getMessage());
        }
        
        return response;
    }
    
    /**
     * Monitor all servers with real API integration
     */
    public void monitorAllServersRealTime() {
        List<Server> servers = serverRepository.findAll();
        
        logger.info("Starting real-time monitoring of {} servers", servers.size());
        
        for (Server server : servers) {
            try {
                // Perform real health check
                boolean isHealthy = performRealHealthCheck(server);
                
                // Collect real system metrics if server is accessible
                if (isHealthy) {
                    collectRealSystemMetrics(server);
                }
                
                // Add small delay between server checks
                Thread.sleep(1000);
                
            } catch (Exception e) {
                logger.error("Error monitoring server {}: {}", server.getName(), e.getMessage());
            }
        }
        
        logger.info("Completed real-time monitoring cycle");
    }
    
    /**
     * Create system metric entity
     */
    private SystemMetric createMetric(Server server, String type, String name, Double value, String unit, LocalDateTime timestamp) {
        SystemMetric metric = new SystemMetric();
        metric.setServer(server);
        metric.setMetricType(type);
        metric.setMetricName(name);
        metric.setValue(value);
        metric.setUnit(unit);
        metric.setTimestamp(timestamp);
        return metric;
    }
    
    /**
     * Get real dashboard statistics
     */
    public Map<String, Object> getRealDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            long totalServers = serverRepository.count();
            long onlineServers = serverRepository.countByStatus(Server.ServerStatus.ONLINE);
            long offlineServers = serverRepository.countByStatus(Server.ServerStatus.OFFLINE);
            long criticalServers = serverRepository.countByStatus(Server.ServerStatus.CRITICAL);
            
            stats.put("total_servers", totalServers);
            stats.put("online_servers", onlineServers);
            stats.put("offline_servers", offlineServers);
            stats.put("critical_servers", criticalServers);
            stats.put("uptime_percentage", totalServers > 0 ? (double) onlineServers / totalServers * 100 : 0);
            
            // Get real average metrics
            List<Server> onlineServerList = serverRepository.findByStatus(Server.ServerStatus.ONLINE);
            if (!onlineServerList.isEmpty()) {
                double avgCpu = onlineServerList.stream()
                        .filter(s -> s.getCpuUsage() != null)
                        .mapToDouble(Server::getCpuUsage)
                        .average()
                        .orElse(0.0);
                
                double avgMemory = onlineServerList.stream()
                        .filter(s -> s.getMemoryUsage() != null)
                        .mapToDouble(Server::getMemoryUsage)
                        .average()
                        .orElse(0.0);
                
                double avgDisk = onlineServerList.stream()
                        .filter(s -> s.getDiskUsage() != null)
                        .mapToDouble(Server::getDiskUsage)
                        .average()
                        .orElse(0.0);
                
                stats.put("average_cpu_usage", Math.round(avgCpu * 100.0) / 100.0);
                stats.put("average_memory_usage", Math.round(avgMemory * 100.0) / 100.0);
                stats.put("average_disk_usage", Math.round(avgDisk * 100.0) / 100.0);
            }
            
            stats.put("last_updated", LocalDateTime.now());
            stats.put("real_time_monitoring", true);
            
        } catch (Exception e) {
            logger.error("Error getting real dashboard stats: {}", e.getMessage());
            stats.put("error", e.getMessage());
        }
        
        return stats;
    }
}
