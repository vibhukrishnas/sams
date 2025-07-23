package com.sams.service;

import com.sams.model.SystemMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.*;
import oshi.software.os.OperatingSystem;
import oshi.software.os.OSProcess;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * System Monitoring Service using OSHI
 * Provides real-time system metrics for CPU, Memory, Disk, Network, and Processes
 */
@Service
@Slf4j
public class SystemMonitoringService {

    private final SystemInfo systemInfo;
    private final HardwareAbstractionLayer hardware;
    private final OperatingSystem operatingSystem;
    private final CentralProcessor processor;
    private final GlobalMemory memory;
    private final List<HWDiskStore> diskStores;
    private final List<NetworkIF> networkIFs;

    public SystemMonitoringService() {
        this.systemInfo = new SystemInfo();
        this.hardware = systemInfo.getHardware();
        this.operatingSystem = systemInfo.getOperatingSystem();
        this.processor = hardware.getProcessor();
        this.memory = hardware.getMemory();
        this.diskStores = hardware.getDiskStores();
        this.networkIFs = hardware.getNetworkIFs();
        
        log.info("System Monitoring Service initialized for: {}", 
                operatingSystem.getFamily() + " " + operatingSystem.getVersionInfo());
    }

    /**
     * Get comprehensive system information
     */
    public SystemMetrics.SystemInfo getSystemInfo() {
        try {
            return SystemMetrics.SystemInfo.builder()
                    .hostname(getHostname())
                    .os(getOperatingSystemInfo())
                    .architecture(System.getProperty("os.arch"))
                    .processors(processor.getLogicalProcessorCount())
                    .uptime(operatingSystem.getSystemUptime())
                    .timestamp(LocalDateTime.now())
                    .cpu(getCpuMetrics())
                    .memory(getMemoryMetrics())
                    .disk(getDiskMetrics())
                    .network(getNetworkMetrics())
                    .processes(getTopProcesses())
                    .build();
        } catch (Exception e) {
            log.error("Error getting system info: {}", e.getMessage());
            return createErrorSystemInfo();
        }
    }

    /**
     * Get CPU metrics
     */
    public SystemMetrics.CpuMetrics getCpuMetrics() {
        try {
            double[] loadAverage = processor.getSystemLoadAverage(3);
            double cpuUsage = processor.getSystemCpuLoadBetweenTicks(processor.getSystemCpuLoadTicks()) * 100;
            
            return SystemMetrics.CpuMetrics.builder()
                    .usagePercent(Math.round(cpuUsage * 100.0) / 100.0)
                    .loadAverage(loadAverage)
                    .cores(processor.getLogicalProcessorCount())
                    .model(processor.getProcessorIdentifier().getName())
                    .frequency(processor.getMaxFreq())
                    .build();
        } catch (Exception e) {
            log.error("Error getting CPU metrics: {}", e.getMessage());
            return SystemMetrics.CpuMetrics.builder()
                    .usagePercent(0.0)
                    .cores(Runtime.getRuntime().availableProcessors())
                    .build();
        }
    }

    /**
     * Get memory metrics
     */
    public SystemMetrics.MemoryMetrics getMemoryMetrics() {
        try {
            long total = memory.getTotal();
            long available = memory.getAvailable();
            long used = total - available;
            double usagePercent = (used * 100.0) / total;
            
            VirtualMemory virtualMemory = memory.getVirtualMemory();
            long swapTotal = virtualMemory.getSwapTotal();
            long swapUsed = virtualMemory.getSwapUsed();
            
            return SystemMetrics.MemoryMetrics.builder()
                    .total(total)
                    .available(available)
                    .used(used)
                    .usagePercent(Math.round(usagePercent * 100.0) / 100.0)
                    .swapTotal(swapTotal)
                    .swapUsed(swapUsed)
                    .build();
        } catch (Exception e) {
            log.error("Error getting memory metrics: {}", e.getMessage());
            return SystemMetrics.MemoryMetrics.builder()
                    .total(Runtime.getRuntime().totalMemory())
                    .available(Runtime.getRuntime().freeMemory())
                    .used(Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory())
                    .usagePercent(0.0)
                    .build();
        }
    }

    /**
     * Get disk metrics
     */
    public SystemMetrics.DiskMetrics getDiskMetrics() {
        try {
            long totalSpace = 0;
            long freeSpace = 0;
            
            List<SystemMetrics.DiskPartition> partitions = diskStores.stream()
                    .flatMap(disk -> disk.getPartitions().stream())
                    .map(partition -> {
                        long partTotal = partition.getSize();
                        long partFree = 0;
                        
                        try {
                            partFree = systemInfo.getOperatingSystem()
                                    .getFileSystem()
                                    .getFileStores()
                                    .stream()
                                    .filter(fs -> fs.getMount().equals(partition.getMountPoint()))
                                    .mapToLong(fs -> fs.getFreeSpace())
                                    .findFirst()
                                    .orElse(0L);
                        } catch (Exception e) {
                            log.debug("Could not get free space for partition: {}", partition.getMountPoint());
                        }
                        
                        long partUsed = partTotal - partFree;
                        double partUsagePercent = partTotal > 0 ? (partUsed * 100.0) / partTotal : 0.0;
                        
                        return SystemMetrics.DiskPartition.builder()
                                .name(partition.getName())
                                .mount(partition.getMountPoint())
                                .type(partition.getType())
                                .total(partTotal)
                                .free(partFree)
                                .used(partUsed)
                                .usagePercent(Math.round(partUsagePercent * 100.0) / 100.0)
                                .build();
                    })
                    .collect(Collectors.toList());
            
            totalSpace = partitions.stream().mapToLong(SystemMetrics.DiskPartition::getTotal).sum();
            freeSpace = partitions.stream().mapToLong(SystemMetrics.DiskPartition::getFree).sum();
            long usedSpace = totalSpace - freeSpace;
            double usagePercent = totalSpace > 0 ? (usedSpace * 100.0) / totalSpace : 0.0;
            
            return SystemMetrics.DiskMetrics.builder()
                    .total(totalSpace)
                    .free(freeSpace)
                    .used(usedSpace)
                    .usagePercent(Math.round(usagePercent * 100.0) / 100.0)
                    .partitions(partitions)
                    .build();
        } catch (Exception e) {
            log.error("Error getting disk metrics: {}", e.getMessage());
            return SystemMetrics.DiskMetrics.builder()
                    .total(0L)
                    .free(0L)
                    .used(0L)
                    .usagePercent(0.0)
                    .build();
        }
    }

    /**
     * Get network metrics
     */
    public SystemMetrics.NetworkMetrics getNetworkMetrics() {
        try {
            // Update network interface statistics
            networkIFs.forEach(NetworkIF::updateAttributes);
            
            long totalBytesSent = networkIFs.stream().mapToLong(NetworkIF::getBytesSent).sum();
            long totalBytesReceived = networkIFs.stream().mapToLong(NetworkIF::getBytesRecv).sum();
            long totalPacketsSent = networkIFs.stream().mapToLong(NetworkIF::getPacketsSent).sum();
            long totalPacketsReceived = networkIFs.stream().mapToLong(NetworkIF::getPacketsRecv).sum();
            
            List<SystemMetrics.NetworkInterface> interfaces = networkIFs.stream()
                    .map(netIf -> SystemMetrics.NetworkInterface.builder()
                            .name(netIf.getName())
                            .displayName(netIf.getDisplayName())
                            .bytesSent(netIf.getBytesSent())
                            .bytesReceived(netIf.getBytesRecv())
                            .up(netIf.isKnownVmMacAddr())
                            .speed(netIf.getSpeed())
                            .build())
                    .collect(Collectors.toList());
            
            return SystemMetrics.NetworkMetrics.builder()
                    .bytesSent(totalBytesSent)
                    .bytesReceived(totalBytesReceived)
                    .packetsSent(totalPacketsSent)
                    .packetsReceived(totalPacketsReceived)
                    .interfaces(interfaces)
                    .build();
        } catch (Exception e) {
            log.error("Error getting network metrics: {}", e.getMessage());
            return SystemMetrics.NetworkMetrics.builder()
                    .bytesSent(0L)
                    .bytesReceived(0L)
                    .packetsSent(0L)
                    .packetsReceived(0L)
                    .build();
        }
    }

    /**
     * Get top processes by CPU usage
     */
    public List<SystemMetrics.ProcessMetrics> getTopProcesses() {
        try {
            return operatingSystem.getProcesses(null, null, 10)
                    .stream()
                    .map(process -> SystemMetrics.ProcessMetrics.builder()
                            .pid(process.getProcessID())
                            .name(process.getName())
                            .cpuPercent(Math.round(process.getProcessCpuLoadCumulative() * 10000.0) / 100.0)
                            .memoryPercent(Math.round((process.getResidentSetSize() * 100.0 / memory.getTotal()) * 100.0) / 100.0)
                            .memoryRss(process.getResidentSetSize())
                            .status(process.getState().name())
                            .user(process.getUser())
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting process metrics: {}", e.getMessage());
            return List.of();
        }
    }

    private String getHostname() {
        try {
            return systemInfo.getOperatingSystem().getNetworkParams().getHostName();
        } catch (Exception e) {
            return System.getenv("COMPUTERNAME") != null ? 
                   System.getenv("COMPUTERNAME") : "localhost";
        }
    }

    private String getOperatingSystemInfo() {
        return operatingSystem.getFamily() + " " + 
               operatingSystem.getVersionInfo().getVersion() + " " +
               operatingSystem.getVersionInfo().getBuildNumber();
    }

    private SystemMetrics.SystemInfo createErrorSystemInfo() {
        return SystemMetrics.SystemInfo.builder()
                .hostname("unknown")
                .os("Unknown OS")
                .architecture("unknown")
                .processors(1)
                .uptime(0L)
                .timestamp(LocalDateTime.now())
                .cpu(SystemMetrics.CpuMetrics.builder().usagePercent(0.0).cores(1).build())
                .memory(SystemMetrics.MemoryMetrics.builder().total(0L).available(0L).used(0L).usagePercent(0.0).build())
                .disk(SystemMetrics.DiskMetrics.builder().total(0L).free(0L).used(0L).usagePercent(0.0).build())
                .network(SystemMetrics.NetworkMetrics.builder().bytesSent(0L).bytesReceived(0L).build())
                .processes(List.of())
                .build();
    }
}
