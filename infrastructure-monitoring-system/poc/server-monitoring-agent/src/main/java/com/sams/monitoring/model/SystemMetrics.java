package com.sams.monitoring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

/**
 * System Metrics Data Model
 * 
 * This class represents comprehensive system metrics collected from the server.
 * All metrics are collected in real-time and provide detailed system health information.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SystemMetrics {

    // Timestamp and identification
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime timestamp;
    private String hostname;
    private String error;

    // CPU Metrics
    private Double cpuUsage;              // CPU usage percentage (0-100)
    private Integer cpuCores;             // Number of logical CPU cores
    private String cpuModel;              // CPU model name
    private Double loadAverage1m;         // 1-minute load average
    private Double loadAverage5m;         // 5-minute load average
    private Double loadAverage15m;        // 15-minute load average

    // Memory Metrics (in bytes)
    private Long totalMemory;             // Total system memory
    private Long usedMemory;              // Used memory
    private Long availableMemory;         // Available memory
    private Double memoryUsage;           // Memory usage percentage (0-100)
    private Long totalSwap;               // Total swap space
    private Long usedSwap;                // Used swap space
    private Double swapUsage;             // Swap usage percentage (0-100)

    // Disk Metrics (in bytes)
    private Long totalDisk;               // Total disk space
    private Long usedDisk;                // Used disk space
    private Long availableDisk;           // Available disk space
    private Double diskUsage;             // Disk usage percentage (0-100)

    // Network Metrics (in bytes/packets)
    private Long networkBytesReceived;    // Total bytes received
    private Long networkBytesSent;        // Total bytes sent
    private Long networkPacketsReceived;  // Total packets received
    private Long networkPacketsSent;      // Total packets sent

    // System Information
    private String operatingSystem;       // Operating system details
    private Long systemUptime;            // System uptime in seconds
    private Integer processCount;         // Number of running processes
    private Integer threadCount;          // Number of running threads

    // Constructors
    public SystemMetrics() {}

    // Getters and Setters
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public Double getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(Double cpuUsage) { this.cpuUsage = cpuUsage; }

    public Integer getCpuCores() { return cpuCores; }
    public void setCpuCores(Integer cpuCores) { this.cpuCores = cpuCores; }

    public String getCpuModel() { return cpuModel; }
    public void setCpuModel(String cpuModel) { this.cpuModel = cpuModel; }

    public Double getLoadAverage1m() { return loadAverage1m; }
    public void setLoadAverage1m(Double loadAverage1m) { this.loadAverage1m = loadAverage1m; }

    public Double getLoadAverage5m() { return loadAverage5m; }
    public void setLoadAverage5m(Double loadAverage5m) { this.loadAverage5m = loadAverage5m; }

    public Double getLoadAverage15m() { return loadAverage15m; }
    public void setLoadAverage15m(Double loadAverage15m) { this.loadAverage15m = loadAverage15m; }

    public Long getTotalMemory() { return totalMemory; }
    public void setTotalMemory(Long totalMemory) { this.totalMemory = totalMemory; }

    public Long getUsedMemory() { return usedMemory; }
    public void setUsedMemory(Long usedMemory) { this.usedMemory = usedMemory; }

    public Long getAvailableMemory() { return availableMemory; }
    public void setAvailableMemory(Long availableMemory) { this.availableMemory = availableMemory; }

    public Double getMemoryUsage() { return memoryUsage; }
    public void setMemoryUsage(Double memoryUsage) { this.memoryUsage = memoryUsage; }

    public Long getTotalSwap() { return totalSwap; }
    public void setTotalSwap(Long totalSwap) { this.totalSwap = totalSwap; }

    public Long getUsedSwap() { return usedSwap; }
    public void setUsedSwap(Long usedSwap) { this.usedSwap = usedSwap; }

    public Double getSwapUsage() { return swapUsage; }
    public void setSwapUsage(Double swapUsage) { this.swapUsage = swapUsage; }

    public Long getTotalDisk() { return totalDisk; }
    public void setTotalDisk(Long totalDisk) { this.totalDisk = totalDisk; }

    public Long getUsedDisk() { return usedDisk; }
    public void setUsedDisk(Long usedDisk) { this.usedDisk = usedDisk; }

    public Long getAvailableDisk() { return availableDisk; }
    public void setAvailableDisk(Long availableDisk) { this.availableDisk = availableDisk; }

    public Double getDiskUsage() { return diskUsage; }
    public void setDiskUsage(Double diskUsage) { this.diskUsage = diskUsage; }

    public Long getNetworkBytesReceived() { return networkBytesReceived; }
    public void setNetworkBytesReceived(Long networkBytesReceived) { this.networkBytesReceived = networkBytesReceived; }

    public Long getNetworkBytesSent() { return networkBytesSent; }
    public void setNetworkBytesSent(Long networkBytesSent) { this.networkBytesSent = networkBytesSent; }

    public Long getNetworkPacketsReceived() { return networkPacketsReceived; }
    public void setNetworkPacketsReceived(Long networkPacketsReceived) { this.networkPacketsReceived = networkPacketsReceived; }

    public Long getNetworkPacketsSent() { return networkPacketsSent; }
    public void setNetworkPacketsSent(Long networkPacketsSent) { this.networkPacketsSent = networkPacketsSent; }

    public String getOperatingSystem() { return operatingSystem; }
    public void setOperatingSystem(String operatingSystem) { this.operatingSystem = operatingSystem; }

    public Long getSystemUptime() { return systemUptime; }
    public void setSystemUptime(Long systemUptime) { this.systemUptime = systemUptime; }

    public Integer getProcessCount() { return processCount; }
    public void setProcessCount(Integer processCount) { this.processCount = processCount; }

    public Integer getThreadCount() { return threadCount; }
    public void setThreadCount(Integer threadCount) { this.threadCount = threadCount; }

    /**
     * Calculate overall system health score based on resource usage
     * @return Health score from 0-100 (100 = excellent, 0 = critical)
     */
    public Double getHealthScore() {
        if (cpuUsage == null || memoryUsage == null || diskUsage == null) {
            return null;
        }
        
        // Weight factors for different metrics
        double cpuWeight = 0.4;
        double memoryWeight = 0.4;
        double diskWeight = 0.2;
        
        // Calculate individual scores (inverted - lower usage = higher score)
        double cpuScore = Math.max(0, 100 - cpuUsage);
        double memoryScore = Math.max(0, 100 - memoryUsage);
        double diskScore = Math.max(0, 100 - diskUsage);
        
        // Calculate weighted average
        double healthScore = (cpuScore * cpuWeight) + (memoryScore * memoryWeight) + (diskScore * diskWeight);
        
        return Math.round(healthScore * 100.0) / 100.0;
    }

    /**
     * Get system status based on health score
     * @return Status string (EXCELLENT, GOOD, WARNING, CRITICAL)
     */
    public String getSystemStatus() {
        Double health = getHealthScore();
        if (health == null) return "UNKNOWN";
        
        if (health >= 90) return "EXCELLENT";
        if (health >= 70) return "GOOD";
        if (health >= 50) return "WARNING";
        return "CRITICAL";
    }

    @Override
    public String toString() {
        return String.format("SystemMetrics{hostname='%s', cpu=%.1f%%, memory=%.1f%%, disk=%.1f%%, health=%.1f, status=%s}", 
                           hostname, cpuUsage, memoryUsage, diskUsage, getHealthScore(), getSystemStatus());
    }
}
