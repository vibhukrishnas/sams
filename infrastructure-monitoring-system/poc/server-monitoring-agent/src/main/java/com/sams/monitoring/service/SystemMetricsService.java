package com.sams.monitoring.service;

import com.sams.monitoring.model.SystemMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.NetworkIF;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * System Metrics Collection Service
 * 
 * This service uses OSHI library to collect real system metrics including:
 * - CPU usage and load
 * - Memory usage (RAM)
 * - Disk usage and I/O
 * - Network statistics
 * - Operating system information
 */
@Service
public class SystemMetricsService {

    private static final Logger logger = LoggerFactory.getLogger(SystemMetricsService.class);
    
    private final SystemInfo systemInfo;
    private final HardwareAbstractionLayer hardware;
    private final OperatingSystem operatingSystem;
    private final CentralProcessor processor;
    private final GlobalMemory memory;
    
    // Store previous CPU ticks for accurate CPU usage calculation
    private long[] prevTicks;

    public SystemMetricsService() {
        this.systemInfo = new SystemInfo();
        this.hardware = systemInfo.getHardware();
        this.operatingSystem = systemInfo.getOperatingSystem();
        this.processor = hardware.getProcessor();
        this.memory = hardware.getMemory();
        this.prevTicks = processor.getSystemCpuLoadTicks();
        
        logger.info("SystemMetricsService initialized for: {} {}", 
                   operatingSystem.getFamily(), 
                   operatingSystem.getVersionInfo());
    }

    /**
     * Collect comprehensive system metrics
     * @return SystemMetrics object containing all current system data
     */
    public SystemMetrics collectMetrics() {
        try {
            SystemMetrics metrics = new SystemMetrics();
            metrics.setTimestamp(LocalDateTime.now());
            metrics.setHostname(getHostname());
            
            // CPU Metrics
            collectCpuMetrics(metrics);
            
            // Memory Metrics
            collectMemoryMetrics(metrics);
            
            // Disk Metrics
            collectDiskMetrics(metrics);
            
            // Network Metrics
            collectNetworkMetrics(metrics);
            
            // System Information
            collectSystemInfo(metrics);
            
            logger.debug("Collected system metrics: CPU={}%, Memory={}%, Disk={}%", 
                        metrics.getCpuUsage(), 
                        metrics.getMemoryUsage(), 
                        metrics.getDiskUsage());
            
            return metrics;
            
        } catch (Exception e) {
            logger.error("Error collecting system metrics", e);
            return createErrorMetrics(e.getMessage());
        }
    }

    private void collectCpuMetrics(SystemMetrics metrics) {
        // Get current CPU ticks
        long[] ticks = processor.getSystemCpuLoadTicks();
        
        // Calculate CPU usage percentage
        double cpuUsage = processor.getSystemCpuLoadBetweenTicks(prevTicks) * 100;
        metrics.setCpuUsage(Math.round(cpuUsage * 100.0) / 100.0);
        
        // Update previous ticks for next calculation
        prevTicks = ticks;
        
        // Additional CPU info
        metrics.setCpuCores(processor.getLogicalProcessorCount());
        metrics.setCpuModel(processor.getProcessorIdentifier().getName());
        
        // System load average (Unix-like systems)
        double[] loadAverage = processor.getSystemLoadAverage(3);
        if (loadAverage[0] >= 0) {
            metrics.setLoadAverage1m(Math.round(loadAverage[0] * 100.0) / 100.0);
            metrics.setLoadAverage5m(Math.round(loadAverage[1] * 100.0) / 100.0);
            metrics.setLoadAverage15m(Math.round(loadAverage[2] * 100.0) / 100.0);
        }
    }

    private void collectMemoryMetrics(SystemMetrics metrics) {
        long totalMemory = memory.getTotal();
        long availableMemory = memory.getAvailable();
        long usedMemory = totalMemory - availableMemory;
        
        metrics.setTotalMemory(totalMemory);
        metrics.setUsedMemory(usedMemory);
        metrics.setAvailableMemory(availableMemory);
        metrics.setMemoryUsage(Math.round((double) usedMemory / totalMemory * 100.0 * 100.0) / 100.0);
        
        // Swap memory
        long totalSwap = memory.getVirtualMemory().getSwapTotal();
        long usedSwap = memory.getVirtualMemory().getSwapUsed();
        metrics.setTotalSwap(totalSwap);
        metrics.setUsedSwap(usedSwap);
        if (totalSwap > 0) {
            metrics.setSwapUsage(Math.round((double) usedSwap / totalSwap * 100.0 * 100.0) / 100.0);
        }
    }

    private void collectDiskMetrics(SystemMetrics metrics) {
        FileSystem fileSystem = operatingSystem.getFileSystem();
        List<OSFileStore> fileStores = fileSystem.getFileStores();
        
        long totalDisk = 0;
        long usedDisk = 0;
        
        for (OSFileStore store : fileStores) {
            long total = store.getTotalSpace();
            long usable = store.getUsableSpace();
            long used = total - usable;
            
            totalDisk += total;
            usedDisk += used;
        }
        
        metrics.setTotalDisk(totalDisk);
        metrics.setUsedDisk(usedDisk);
        metrics.setAvailableDisk(totalDisk - usedDisk);
        
        if (totalDisk > 0) {
            metrics.setDiskUsage(Math.round((double) usedDisk / totalDisk * 100.0 * 100.0) / 100.0);
        }
    }

    private void collectNetworkMetrics(SystemMetrics metrics) {
        List<NetworkIF> networkIFs = hardware.getNetworkIFs();
        
        long totalBytesReceived = 0;
        long totalBytesSent = 0;
        long totalPacketsReceived = 0;
        long totalPacketsSent = 0;
        
        for (NetworkIF net : networkIFs) {
            net.updateAttributes();
            totalBytesReceived += net.getBytesRecv();
            totalBytesSent += net.getBytesSent();
            totalPacketsReceived += net.getPacketsRecv();
            totalPacketsSent += net.getPacketsSent();
        }
        
        metrics.setNetworkBytesReceived(totalBytesReceived);
        metrics.setNetworkBytesSent(totalBytesSent);
        metrics.setNetworkPacketsReceived(totalPacketsReceived);
        metrics.setNetworkPacketsSent(totalPacketsSent);
    }

    private void collectSystemInfo(SystemMetrics metrics) {
        metrics.setOperatingSystem(operatingSystem.toString());
        metrics.setSystemUptime(operatingSystem.getSystemUptime());
        metrics.setProcessCount(operatingSystem.getProcessCount());
        metrics.setThreadCount(operatingSystem.getThreadCount());
    }

    private String getHostname() {
        try {
            return java.net.InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "unknown";
        }
    }

    private SystemMetrics createErrorMetrics(String error) {
        SystemMetrics metrics = new SystemMetrics();
        metrics.setTimestamp(LocalDateTime.now());
        metrics.setHostname(getHostname());
        metrics.setError(error);
        return metrics;
    }
}
