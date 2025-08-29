package com.sams.service;

import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.NetworkIF;
import oshi.software.os.OperatingSystem;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

/**
 * 📊 System Metrics Collection Service
 * 
 * Real-time system monitoring using OSHI library
 * Compatible with mobile app and web dashboard requirements
 */
@Service
public class SystemMetricsService {

    private final SystemInfo systemInfo;
    private final HardwareAbstractionLayer hardware;
    private final OperatingSystem operatingSystem;

    public SystemMetricsService() {
        this.systemInfo = new SystemInfo();
        this.hardware = systemInfo.getHardware();
        this.operatingSystem = systemInfo.getOperatingSystem();
    }

    /**
     * 📊 Get comprehensive system metrics for a server
     */
    public Map<String, Object> getServerMetrics(String serverId) {
        Map<String, Object> metrics = new HashMap<>();
        
        try {
            // CPU Metrics
            metrics.put("cpu", getCpuMetrics());
            
            // Memory Metrics
            metrics.put("memory", getMemoryMetrics());
            
            // Disk Metrics
            metrics.put("disk", getDiskMetrics());
            
            // Network Metrics
            metrics.put("network", getNetworkMetrics());
            
            // System Information
            metrics.put("system", getSystemInfo());
            
            // Timestamp
            metrics.put("timestamp", LocalDateTime.now());
            metrics.put("serverId", serverId);
            
        } catch (Exception e) {
            metrics.put("error", "Failed to collect metrics: " + e.getMessage());
        }
        
        return metrics;
    }

    /**
     * 🖥️ Get CPU usage metrics
     */
    private Map<String, Object> getCpuMetrics() {
        CentralProcessor processor = hardware.getProcessor();
        
        // Get CPU usage percentage
        double cpuUsage = processor.getSystemCpuLoadBetweenTicks(processor.getSystemCpuLoadTicks()) * 100;
        
        Map<String, Object> cpuMetrics = new HashMap<>();
        cpuMetrics.put("usage", Math.round(cpuUsage * 100.0) / 100.0);
        cpuMetrics.put("cores", processor.getLogicalProcessorCount());
        cpuMetrics.put("model", processor.getProcessorIdentifier().getName());
        cpuMetrics.put("frequency", processor.getMaxFreq());
        cpuMetrics.put("loadAverage", getLoadAverage());
        
        return cpuMetrics;
    }

    /**
     * 🧠 Get memory usage metrics
     */
    private Map<String, Object> getMemoryMetrics() {
        GlobalMemory memory = hardware.getMemory();
        
        long totalMemory = memory.getTotal();
        long availableMemory = memory.getAvailable();
        long usedMemory = totalMemory - availableMemory;
        double memoryUsage = ((double) usedMemory / totalMemory) * 100;
        
        Map<String, Object> memoryMetrics = new HashMap<>();
        memoryMetrics.put("usage", Math.round(memoryUsage * 100.0) / 100.0);
        memoryMetrics.put("total", formatBytes(totalMemory));
        memoryMetrics.put("used", formatBytes(usedMemory));
        memoryMetrics.put("available", formatBytes(availableMemory));
        memoryMetrics.put("totalBytes", totalMemory);
        memoryMetrics.put("usedBytes", usedMemory);
        memoryMetrics.put("availableBytes", availableMemory);
        
        return memoryMetrics;
    }

    /**
     * 💾 Get disk usage metrics
     */
    private Map<String, Object> getDiskMetrics() {
        FileSystem fileSystem = operatingSystem.getFileSystem();
        List<OSFileStore> fileStores = fileSystem.getFileStores();
        
        long totalSpace = 0;
        long usedSpace = 0;
        double maxUsagePercentage = 0;
        
        for (OSFileStore store : fileStores) {
            long storeTotal = store.getTotalSpace();
            long storeUsed = storeTotal - store.getUsableSpace();
            
            totalSpace += storeTotal;
            usedSpace += storeUsed;
            
            double storeUsagePercentage = ((double) storeUsed / storeTotal) * 100;
            maxUsagePercentage = Math.max(maxUsagePercentage, storeUsagePercentage);
        }
        
        double overallUsage = totalSpace > 0 ? ((double) usedSpace / totalSpace) * 100 : 0;
        
        Map<String, Object> diskMetrics = new HashMap<>();
        diskMetrics.put("usage", Math.round(overallUsage * 100.0) / 100.0);
        diskMetrics.put("maxUsage", Math.round(maxUsagePercentage * 100.0) / 100.0);
        diskMetrics.put("total", formatBytes(totalSpace));
        diskMetrics.put("used", formatBytes(usedSpace));
        diskMetrics.put("available", formatBytes(totalSpace - usedSpace));
        diskMetrics.put("totalBytes", totalSpace);
        diskMetrics.put("usedBytes", usedSpace);
        diskMetrics.put("availableBytes", totalSpace - usedSpace);
        diskMetrics.put("storeCount", fileStores.size());
        
        return diskMetrics;
    }

    /**
     * 🌐 Get network interface metrics
     */
    private Map<String, Object> getNetworkMetrics() {
        List<NetworkIF> networkIFs = hardware.getNetworkIFs();
        
        long totalBytesReceived = 0;
        long totalBytesSent = 0;
        long totalPacketsReceived = 0;
        long totalPacketsSent = 0;
        int activeInterfaces = 0;
        
        for (NetworkIF networkIF : networkIFs) {
            if (networkIF.getBytesRecv() > 0 || networkIF.getBytesSent() > 0) {
                activeInterfaces++;
                totalBytesReceived += networkIF.getBytesRecv();
                totalBytesSent += networkIF.getBytesSent();
                totalPacketsReceived += networkIF.getPacketsRecv();
                totalPacketsSent += networkIF.getPacketsSent();
            }
        }
        
        Map<String, Object> networkMetrics = new HashMap<>();
        networkMetrics.put("bytesReceived", totalBytesReceived);
        networkMetrics.put("bytesSent", totalBytesSent);
        networkMetrics.put("packetsReceived", totalPacketsReceived);
        networkMetrics.put("packetsSent", totalPacketsSent);
        networkMetrics.put("activeInterfaces", activeInterfaces);
        networkMetrics.put("totalInterfaces", networkIFs.size());
        networkMetrics.put("formattedBytesReceived", formatBytes(totalBytesReceived));
        networkMetrics.put("formattedBytesSent", formatBytes(totalBytesSent));
        
        return networkMetrics;
    }

    /**
     * ℹ️ Get system information
     */
    private Map<String, Object> getSystemInfo() {
        Map<String, Object> systemMetrics = new HashMap<>();
        
        systemMetrics.put("osName", operatingSystem.getFamily());
        systemMetrics.put("osVersion", operatingSystem.getVersionInfo().toString());
        systemMetrics.put("architecture", System.getProperty("os.arch"));
        systemMetrics.put("hostname", systemInfo.getOperatingSystem().getNetworkParams().getHostName());
        systemMetrics.put("uptime", operatingSystem.getSystemUptime());
        systemMetrics.put("processCount", operatingSystem.getProcessCount());
        systemMetrics.put("threadCount", operatingSystem.getThreadCount());
        
        return systemMetrics;
    }

    /**
     * 📈 Get system load average
     */
    private double getLoadAverage() {
        try {
            double[] loadAverage = hardware.getProcessor().getSystemLoadAverage(3);
            return loadAverage[0]; // 1-minute load average
        } catch (Exception e) {
            return 0.0;
        }
    }

    /**
     * 📊 Get real-time performance snapshot
     */
    public Map<String, Object> getPerformanceSnapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        
        // Quick metrics for dashboard
        CentralProcessor processor = hardware.getProcessor();
        GlobalMemory memory = hardware.getMemory();
        
        double cpuUsage = processor.getSystemCpuLoadBetweenTicks(processor.getSystemCpuLoadTicks()) * 100;
        long totalMemory = memory.getTotal();
        long usedMemory = totalMemory - memory.getAvailable();
        double memoryUsage = ((double) usedMemory / totalMemory) * 100;
        
        snapshot.put("cpu", Math.round(cpuUsage * 100.0) / 100.0);
        snapshot.put("memory", Math.round(memoryUsage * 100.0) / 100.0);
        snapshot.put("timestamp", LocalDateTime.now());
        snapshot.put("healthy", cpuUsage < 80 && memoryUsage < 85);
        
        return snapshot;
    }

    /**
     * 📊 Format bytes to human readable format
     */
    private String formatBytes(long bytes) {
        if (bytes == 0) return "0 B";
        
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double size = bytes;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return String.format("%.1f %s", size, units[unitIndex]);
    }
}
