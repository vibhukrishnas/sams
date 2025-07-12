/**
 * 📊 System Metric Collectors - Comprehensive System Monitoring
 * Advanced metric collectors for CPU, memory, disk, network, and process monitoring
 */

package com.monitoring.agent.collectors;

import com.monitoring.agent.config.AgentConfiguration;
import com.monitoring.agent.model.MetricData;
import com.sun.management.OperatingSystemMXBean;
import oshi.SystemInfo;
import oshi.hardware.*;
import oshi.software.os.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * CPU Metrics Collector
 */
public class CpuMetricCollector implements MetricCollector {
    
    private static final Logger logger = LoggerFactory.getLogger(CpuMetricCollector.class);
    private final AgentConfiguration config;
    private final SystemInfo systemInfo;
    private final CentralProcessor processor;
    private final OperatingSystemMXBean osBean;
    
    private long[] prevTicks;
    private long[][] prevProcTicks;

    public CpuMetricCollector(AgentConfiguration config) {
        this.config = config;
        this.systemInfo = new SystemInfo();
        this.processor = systemInfo.getHardware().getProcessor();
        this.osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        this.prevTicks = processor.getSystemCpuLoadTicks();
        this.prevProcTicks = processor.getProcessorCpuLoadTicks();
    }

    @Override
    public List<MetricData> collectMetrics() {
        List<MetricData> metrics = new ArrayList<>();
        LocalDateTime timestamp = LocalDateTime.now();

        try {
            // Overall CPU usage
            long[] ticks = processor.getSystemCpuLoadTicks();
            double cpuUsage = processor.getSystemCpuLoadBetweenTicks(prevTicks) * 100;
            prevTicks = ticks;

            metrics.add(createMetric("cpu.usage.total", cpuUsage, "percent", timestamp));

            // CPU load averages
            double[] loadAverage = processor.getSystemLoadAverage(3);
            if (loadAverage[0] >= 0) {
                metrics.add(createMetric("cpu.load.1min", loadAverage[0], "load", timestamp));
                if (loadAverage[1] >= 0) {
                    metrics.add(createMetric("cpu.load.5min", loadAverage[1], "load", timestamp));
                }
                if (loadAverage[2] >= 0) {
                    metrics.add(createMetric("cpu.load.15min", loadAverage[2], "load", timestamp));
                }
            }

            // Per-core CPU usage
            long[][] procTicks = processor.getProcessorCpuLoadTicks();
            for (int cpu = 0; cpu < processor.getLogicalProcessorCount(); cpu++) {
                double coreUsage = processor.getProcessorCpuLoadBetweenTicks(prevProcTicks[cpu], procTicks[cpu]) * 100;
                metrics.add(createMetric("cpu.usage.core" + cpu, coreUsage, "percent", timestamp));
            }
            prevProcTicks = procTicks;

            // CPU frequency
            long[] frequencies = processor.getCurrentFreq();
            if (frequencies.length > 0) {
                double avgFreq = Arrays.stream(frequencies).average().orElse(0) / 1_000_000; // Convert to MHz
                metrics.add(createMetric("cpu.frequency.avg", avgFreq, "MHz", timestamp));
            }

            // CPU temperature (if available)
            double temperature = processor.getTemperature();
            if (temperature > 0) {
                metrics.add(createMetric("cpu.temperature", temperature, "celsius", timestamp));
            }

            // Process CPU usage
            double processCpuUsage = osBean.getProcessCpuLoad() * 100;
            if (processCpuUsage >= 0) {
                metrics.add(createMetric("cpu.usage.process", processCpuUsage, "percent", timestamp));
            }

            logger.debug("📊 Collected {} CPU metrics", metrics.size());

        } catch (Exception e) {
            logger.error("❌ Error collecting CPU metrics: {}", e.getMessage(), e);
        }

        return metrics;
    }

    @Override
    public int getCollectionInterval() {
        return config.getCpuCollectionInterval();
    }

    private MetricData createMetric(String name, double value, String unit, LocalDateTime timestamp) {
        return MetricData.builder()
                .serverId(config.getServerId())
                .organizationId(config.getOrganizationId())
                .metricName(name)
                .value(value)
                .unit(unit)
                .timestamp(timestamp)
                .source("sams-agent")
                .environment(config.getEnvironment())
                .tags(Map.of("agent_id", config.getAgentId()))
                .build();
    }
}

/**
 * Memory Metrics Collector
 */
public class MemoryMetricCollector implements MetricCollector {
    
    private static final Logger logger = LoggerFactory.getLogger(MemoryMetricCollector.class);
    private final AgentConfiguration config;
    private final SystemInfo systemInfo;
    private final GlobalMemory memory;
    private final OperatingSystemMXBean osBean;

    public MemoryMetricCollector(AgentConfiguration config) {
        this.config = config;
        this.systemInfo = new SystemInfo();
        this.memory = systemInfo.getHardware().getMemory();
        this.osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
    }

    @Override
    public List<MetricData> collectMetrics() {
        List<MetricData> metrics = new ArrayList<>();
        LocalDateTime timestamp = LocalDateTime.now();

        try {
            // Physical memory
            long totalMemory = memory.getTotal();
            long availableMemory = memory.getAvailable();
            long usedMemory = totalMemory - availableMemory;
            double memoryUsagePercent = (double) usedMemory / totalMemory * 100;

            metrics.add(createMetric("memory.total", totalMemory / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.used", usedMemory / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.available", availableMemory / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.usage", memoryUsagePercent, "percent", timestamp));

            // Virtual memory (swap)
            VirtualMemory virtualMemory = memory.getVirtualMemory();
            long totalSwap = virtualMemory.getSwapTotal();
            long usedSwap = virtualMemory.getSwapUsed();
            
            if (totalSwap > 0) {
                double swapUsagePercent = (double) usedSwap / totalSwap * 100;
                metrics.add(createMetric("memory.swap.total", totalSwap / (1024.0 * 1024.0), "MB", timestamp));
                metrics.add(createMetric("memory.swap.used", usedSwap / (1024.0 * 1024.0), "MB", timestamp));
                metrics.add(createMetric("memory.swap.usage", swapUsagePercent, "percent", timestamp));
            }

            // Memory pages
            metrics.add(createMetric("memory.pages.in", virtualMemory.getSwapPagesIn(), "pages", timestamp));
            metrics.add(createMetric("memory.pages.out", virtualMemory.getSwapPagesOut(), "pages", timestamp));

            // JVM memory (if running in JVM)
            Runtime runtime = Runtime.getRuntime();
            long jvmTotal = runtime.totalMemory();
            long jvmFree = runtime.freeMemory();
            long jvmUsed = jvmTotal - jvmFree;
            long jvmMax = runtime.maxMemory();

            metrics.add(createMetric("memory.jvm.total", jvmTotal / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.jvm.used", jvmUsed / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.jvm.free", jvmFree / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.jvm.max", jvmMax / (1024.0 * 1024.0), "MB", timestamp));
            metrics.add(createMetric("memory.jvm.usage", (double) jvmUsed / jvmMax * 100, "percent", timestamp));

            logger.debug("📊 Collected {} memory metrics", metrics.size());

        } catch (Exception e) {
            logger.error("❌ Error collecting memory metrics: {}", e.getMessage(), e);
        }

        return metrics;
    }

    @Override
    public int getCollectionInterval() {
        return config.getMemoryCollectionInterval();
    }

    private MetricData createMetric(String name, double value, String unit, LocalDateTime timestamp) {
        return MetricData.builder()
                .serverId(config.getServerId())
                .organizationId(config.getOrganizationId())
                .metricName(name)
                .value(value)
                .unit(unit)
                .timestamp(timestamp)
                .source("sams-agent")
                .environment(config.getEnvironment())
                .tags(Map.of("agent_id", config.getAgentId()))
                .build();
    }
}

/**
 * Disk Metrics Collector
 */
public class DiskMetricCollector implements MetricCollector {
    
    private static final Logger logger = LoggerFactory.getLogger(DiskMetricCollector.class);
    private final AgentConfiguration config;
    private final SystemInfo systemInfo;
    private final FileSystem fileSystem;
    private final List<HWDiskStore> diskStores;

    public DiskMetricCollector(AgentConfiguration config) {
        this.config = config;
        this.systemInfo = new SystemInfo();
        this.fileSystem = systemInfo.getOperatingSystem().getFileSystem();
        this.diskStores = systemInfo.getHardware().getDiskStores();
    }

    @Override
    public List<MetricData> collectMetrics() {
        List<MetricData> metrics = new ArrayList<>();
        LocalDateTime timestamp = LocalDateTime.now();

        try {
            // File system usage
            List<OSFileStore> fileStores = fileSystem.getFileStores();
            for (OSFileStore store : fileStores) {
                String mountPoint = store.getMount();
                long totalSpace = store.getTotalSpace();
                long usableSpace = store.getUsableSpace();
                long usedSpace = totalSpace - usableSpace;
                
                if (totalSpace > 0) {
                    double usagePercent = (double) usedSpace / totalSpace * 100;
                    String safeMountPoint = mountPoint.replaceAll("[^a-zA-Z0-9]", "_");
                    
                    metrics.add(createMetric("disk.space.total." + safeMountPoint, 
                                           totalSpace / (1024.0 * 1024.0 * 1024.0), "GB", timestamp));
                    metrics.add(createMetric("disk.space.used." + safeMountPoint, 
                                           usedSpace / (1024.0 * 1024.0 * 1024.0), "GB", timestamp));
                    metrics.add(createMetric("disk.space.available." + safeMountPoint, 
                                           usableSpace / (1024.0 * 1024.0 * 1024.0), "GB", timestamp));
                    metrics.add(createMetric("disk.usage." + safeMountPoint, usagePercent, "percent", timestamp));
                }
            }

            // Disk I/O statistics
            for (HWDiskStore disk : diskStores) {
                String diskName = disk.getName().replaceAll("[^a-zA-Z0-9]", "_");
                
                metrics.add(createMetric("disk.reads." + diskName, disk.getReads(), "operations", timestamp));
                metrics.add(createMetric("disk.writes." + diskName, disk.getWrites(), "operations", timestamp));
                metrics.add(createMetric("disk.read_bytes." + diskName, 
                                       disk.getReadBytes() / (1024.0 * 1024.0), "MB", timestamp));
                metrics.add(createMetric("disk.write_bytes." + diskName, 
                                       disk.getWriteBytes() / (1024.0 * 1024.0), "MB", timestamp));
                metrics.add(createMetric("disk.transfer_time." + diskName, disk.getTransferTime(), "ms", timestamp));
            }

            // Inode usage (Unix-like systems)
            if (!System.getProperty("os.name").toLowerCase().contains("windows")) {
                for (OSFileStore store : fileStores) {
                    long totalInodes = store.getTotalInodes();
                    long freeInodes = store.getFreeInodes();
                    
                    if (totalInodes > 0) {
                        long usedInodes = totalInodes - freeInodes;
                        double inodeUsagePercent = (double) usedInodes / totalInodes * 100;
                        String safeMountPoint = store.getMount().replaceAll("[^a-zA-Z0-9]", "_");
                        
                        metrics.add(createMetric("disk.inodes.total." + safeMountPoint, totalInodes, "inodes", timestamp));
                        metrics.add(createMetric("disk.inodes.used." + safeMountPoint, usedInodes, "inodes", timestamp));
                        metrics.add(createMetric("disk.inodes.usage." + safeMountPoint, inodeUsagePercent, "percent", timestamp));
                    }
                }
            }

            logger.debug("📊 Collected {} disk metrics", metrics.size());

        } catch (Exception e) {
            logger.error("❌ Error collecting disk metrics: {}", e.getMessage(), e);
        }

        return metrics;
    }

    @Override
    public int getCollectionInterval() {
        return config.getDiskCollectionInterval();
    }

    private MetricData createMetric(String name, double value, String unit, LocalDateTime timestamp) {
        return MetricData.builder()
                .serverId(config.getServerId())
                .organizationId(config.getOrganizationId())
                .metricName(name)
                .value(value)
                .unit(unit)
                .timestamp(timestamp)
                .source("sams-agent")
                .environment(config.getEnvironment())
                .tags(Map.of("agent_id", config.getAgentId()))
                .build();
    }
}

/**
 * Network Metrics Collector
 */
public class NetworkMetricCollector implements MetricCollector {
    
    private static final Logger logger = LoggerFactory.getLogger(NetworkMetricCollector.class);
    private final AgentConfiguration config;
    private final SystemInfo systemInfo;
    private final List<NetworkIF> networkIFs;
    
    private Map<String, Long> prevBytesRecv = new HashMap<>();
    private Map<String, Long> prevBytesSent = new HashMap<>();
    private Map<String, Long> prevPacketsRecv = new HashMap<>();
    private Map<String, Long> prevPacketsSent = new HashMap<>();
    private long lastCollectionTime = System.currentTimeMillis();

    public NetworkMetricCollector(AgentConfiguration config) {
        this.config = config;
        this.systemInfo = new SystemInfo();
        this.networkIFs = systemInfo.getHardware().getNetworkIFs();
        
        // Initialize previous values
        for (NetworkIF netIF : networkIFs) {
            netIF.updateAttributes();
            String ifName = netIF.getName();
            prevBytesRecv.put(ifName, netIF.getBytesRecv());
            prevBytesSent.put(ifName, netIF.getBytesSent());
            prevPacketsRecv.put(ifName, netIF.getPacketsRecv());
            prevPacketsSent.put(ifName, netIF.getPacketsSent());
        }
    }

    @Override
    public List<MetricData> collectMetrics() {
        List<MetricData> metrics = new ArrayList<>();
        LocalDateTime timestamp = LocalDateTime.now();
        long currentTime = System.currentTimeMillis();
        double timeDelta = (currentTime - lastCollectionTime) / 1000.0; // seconds

        try {
            for (NetworkIF netIF : networkIFs) {
                netIF.updateAttributes();
                String ifName = netIF.getName().replaceAll("[^a-zA-Z0-9]", "_");
                
                // Skip loopback and inactive interfaces if configured
                if (config.isSkipLoopbackInterfaces() && netIF.getName().startsWith("lo")) {
                    continue;
                }
                
                // Current values
                long bytesRecv = netIF.getBytesRecv();
                long bytesSent = netIF.getBytesSent();
                long packetsRecv = netIF.getPacketsRecv();
                long packetsSent = netIF.getPacketsSent();
                
                // Calculate rates
                if (timeDelta > 0 && prevBytesRecv.containsKey(netIF.getName())) {
                    double recvRate = (bytesRecv - prevBytesRecv.get(netIF.getName())) / timeDelta / (1024.0 * 1024.0); // MB/s
                    double sentRate = (bytesSent - prevBytesSent.get(netIF.getName())) / timeDelta / (1024.0 * 1024.0); // MB/s
                    double packetRecvRate = (packetsRecv - prevPacketsRecv.get(netIF.getName())) / timeDelta;
                    double packetSentRate = (packetsSent - prevPacketsSent.get(netIF.getName())) / timeDelta;
                    
                    metrics.add(createMetric("network.bytes_recv_rate." + ifName, recvRate, "MB/s", timestamp));
                    metrics.add(createMetric("network.bytes_sent_rate." + ifName, sentRate, "MB/s", timestamp));
                    metrics.add(createMetric("network.packets_recv_rate." + ifName, packetRecvRate, "packets/s", timestamp));
                    metrics.add(createMetric("network.packets_sent_rate." + ifName, packetSentRate, "packets/s", timestamp));
                }
                
                // Cumulative values
                metrics.add(createMetric("network.bytes_recv." + ifName, bytesRecv / (1024.0 * 1024.0), "MB", timestamp));
                metrics.add(createMetric("network.bytes_sent." + ifName, bytesSent / (1024.0 * 1024.0), "MB", timestamp));
                metrics.add(createMetric("network.packets_recv." + ifName, packetsRecv, "packets", timestamp));
                metrics.add(createMetric("network.packets_sent." + ifName, packetsSent, "packets", timestamp));
                
                // Error statistics
                metrics.add(createMetric("network.errors_in." + ifName, netIF.getInErrors(), "errors", timestamp));
                metrics.add(createMetric("network.errors_out." + ifName, netIF.getOutErrors(), "errors", timestamp));
                metrics.add(createMetric("network.drops_in." + ifName, netIF.getInDrops(), "drops", timestamp));
                
                // Interface status
                metrics.add(createMetric("network.interface_up." + ifName, netIF.isUp() ? 1.0 : 0.0, "status", timestamp));
                metrics.add(createMetric("network.speed." + ifName, netIF.getSpeed() / (1024.0 * 1024.0), "Mbps", timestamp));
                
                // Update previous values
                prevBytesRecv.put(netIF.getName(), bytesRecv);
                prevBytesSent.put(netIF.getName(), bytesSent);
                prevPacketsRecv.put(netIF.getName(), packetsRecv);
                prevPacketsSent.put(netIF.getName(), packetsSent);
            }
            
            lastCollectionTime = currentTime;
            logger.debug("📊 Collected {} network metrics", metrics.size());

        } catch (Exception e) {
            logger.error("❌ Error collecting network metrics: {}", e.getMessage(), e);
        }

        return metrics;
    }

    @Override
    public int getCollectionInterval() {
        return config.getNetworkCollectionInterval();
    }

    private MetricData createMetric(String name, double value, String unit, LocalDateTime timestamp) {
        return MetricData.builder()
                .serverId(config.getServerId())
                .organizationId(config.getOrganizationId())
                .metricName(name)
                .value(value)
                .unit(unit)
                .timestamp(timestamp)
                .source("sams-agent")
                .environment(config.getEnvironment())
                .tags(Map.of("agent_id", config.getAgentId()))
                .build();
    }
}
