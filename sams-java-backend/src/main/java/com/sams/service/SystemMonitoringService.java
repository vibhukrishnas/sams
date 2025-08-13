package com.sams.service;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Real-time System Monitoring Service
 * 
 * Provides comprehensive system metrics using OSHI library
 * - CPU usage, load averages
 * - Memory utilization
 * - Disk space and I/O
 * - Network statistics
 * - Process monitoring
 */
@Service
@Slf4j
public class SystemMonitoringService {
    
    private final SystemInfo systemInfo;
    private final HardwareAbstractionLayer hardware;
    private final OperatingSystem os;
    
    public SystemMonitoringService() {
        this.systemInfo = new SystemInfo();
        this.hardware = systemInfo.getHardware();
        this.os = systemInfo.getOperatingSystem();
        
        log.info("🔧 System Monitoring Service initialized");
        log.info("💻 OS: {} {}", os.getFamily(), os.getVersionInfo());
    }
    
    /**
     * Get comprehensive system health metrics
     */
    public SystemMetrics getSystemMetrics() {
        SystemMetrics metrics = new SystemMetrics();
        
        // CPU Metrics
        CentralProcessor processor = hardware.getProcessor();
        double[] loadAverage = processor.getSystemLoadAverage(3);
        
        metrics.setCpuUsage(getCurrentCpuUsage());
        metrics.setLoadAverage1m(loadAverage[0] > 0 ? loadAverage[0] : 0.0);
        metrics.setLoadAverage5m(loadAverage[1] > 0 ? loadAverage[1] : 0.0);
        metrics.setLoadAverage15m(loadAverage[2] > 0 ? loadAverage[2] : 0.0);
        metrics.setCpuCores(processor.getLogicalProcessorCount());
        
        // Memory Metrics
        GlobalMemory memory = hardware.getMemory();
        long totalMemory = memory.getTotal();
        long availableMemory = memory.getAvailable();
        long usedMemory = totalMemory - availableMemory;
        
        metrics.setMemoryTotal(totalMemory);
        metrics.setMemoryUsed(usedMemory);
        metrics.setMemoryAvailable(availableMemory);
        metrics.setMemoryUsagePercent((double) usedMemory / totalMemory * 100);
        
        // Disk Metrics
        metrics.setDiskUsage(getDiskUsage());
        
        // System Info
        metrics.setHostname(os.getNetworkParams().getHostName());
        metrics.setUptime(System.currentTimeMillis() / 1000);
        metrics.setTimestamp(LocalDateTime.now());
        
        return metrics;
    }
    
    /**
     * Get current CPU usage percentage
     */
    private double getCurrentCpuUsage() {
        CentralProcessor processor = hardware.getProcessor();
        long[] prevTicks = processor.getSystemCpuLoadTicks();
        
        try {
            Thread.sleep(1000); // Wait 1 second for accurate measurement
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        long[] ticks = processor.getSystemCpuLoadTicks();
        double cpuLoad = processor.getSystemCpuLoadBetweenTicks(prevTicks) * 100;
        
        return Math.max(0.0, Math.min(100.0, cpuLoad));
    }
    
    /**
     * Get disk usage for all mounted file systems
     */
    private List<DiskUsage> getDiskUsage() {
        List<DiskUsage> diskUsages = new ArrayList<>();
        FileSystem fileSystem = os.getFileSystem();
        
        for (OSFileStore fs : fileSystem.getFileStores()) {
            if (fs.getTotalSpace() > 0) {
                DiskUsage usage = new DiskUsage();
                usage.setMountPoint(fs.getMount());
                usage.setFileSystem(fs.getType());
                usage.setTotalSpace(fs.getTotalSpace());
                usage.setUsedSpace(fs.getTotalSpace() - fs.getUsableSpace());
                usage.setAvailableSpace(fs.getUsableSpace());
                usage.setUsagePercent((double) (fs.getTotalSpace() - fs.getUsableSpace()) / fs.getTotalSpace() * 100);
                
                diskUsages.add(usage);
            }
        }
        
        return diskUsages;
    }
    
    /**
     * Get system alerts based on thresholds
     */
    public List<SystemAlert> getSystemAlerts() {
        List<SystemAlert> alerts = new ArrayList<>();
        SystemMetrics metrics = getSystemMetrics();
        
        // CPU Alert
        if (metrics.getCpuUsage() > 80.0) {
            alerts.add(new SystemAlert(
                "HIGH_CPU_USAGE",
                "High CPU Usage",
                String.format("CPU usage is %.1f%% (threshold: 80%%)", metrics.getCpuUsage()),
                "WARNING",
                LocalDateTime.now()
            ));
        }
        
        // Memory Alert
        if (metrics.getMemoryUsagePercent() > 85.0) {
            alerts.add(new SystemAlert(
                "HIGH_MEMORY_USAGE",
                "High Memory Usage",
                String.format("Memory usage is %.1f%% (threshold: 85%%)", metrics.getMemoryUsagePercent()),
                "WARNING",
                LocalDateTime.now()
            ));
        }
        
        // Disk Alerts
        for (DiskUsage disk : metrics.getDiskUsage()) {
            if (disk.getUsagePercent() > 90.0) {
                alerts.add(new SystemAlert(
                    "HIGH_DISK_USAGE",
                    "High Disk Usage",
                    String.format("Disk %s usage is %.1f%% (threshold: 90%%)", 
                        disk.getMountPoint(), disk.getUsagePercent()),
                    "CRITICAL",
                    LocalDateTime.now()
                ));
            }
        }
        
        return alerts;
    }
    
    /**
     * Get server information
     */
    public List<ServerInfo> getServerInfo() {
        List<ServerInfo> servers = new ArrayList<>();
        
        // Local server info
        ServerInfo localServer = new ServerInfo();
        localServer.setId("sams-java-001");
        localServer.setName("SAMS Java Backend");
        localServer.setHost(os.getNetworkParams().getHostName());
        localServer.setPort(8080);
        localServer.setStatus("RUNNING");
        localServer.setVersion("2.0.0");
        localServer.setLastChecked(LocalDateTime.now());
        
        SystemMetrics metrics = getSystemMetrics();
        localServer.setCpuUsage(metrics.getCpuUsage());
        localServer.setMemoryUsage(metrics.getMemoryUsagePercent());
        localServer.setUptime(metrics.getUptime());
        
        servers.add(localServer);
        
        return servers;
    }
    
    // Data Classes
    @Data
    public static class SystemMetrics {
        private double cpuUsage;
        private double loadAverage1m;
        private double loadAverage5m;
        private double loadAverage15m;
        private int cpuCores;
        
        private long memoryTotal;
        private long memoryUsed;
        private long memoryAvailable;
        private double memoryUsagePercent;
        
        private List<DiskUsage> diskUsage;
        
        private String hostname;
        private long uptime;
        
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime timestamp;
    }
    
    @Data
    public static class DiskUsage {
        private String mountPoint;
        private String fileSystem;
        private long totalSpace;
        private long usedSpace;
        private long availableSpace;
        private double usagePercent;
    }
    
    @Data
    public static class SystemAlert {
        private String id;
        private String title;
        private String message;
        private String severity;
        
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime timestamp;
        
        public SystemAlert(String id, String title, String message, String severity, LocalDateTime timestamp) {
            this.id = id;
            this.title = title;
            this.message = message;
            this.severity = severity;
            this.timestamp = timestamp;
        }
    }
    
    @Data
    public static class ServerInfo {
        private String id;
        private String name;
        private String host;
        private int port;
        private String status;
        private String version;
        private double cpuUsage;
        private double memoryUsage;
        private long uptime;
        
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime lastChecked;
    }
}
