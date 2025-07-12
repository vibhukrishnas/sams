/**
 * 🖥️ Server Monitoring Agent - POC Implementation
 * Demonstrates core server monitoring capabilities with metrics collection
 */

package com.monitoring.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.net.InetAddress;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

@SpringBootApplication
@EnableScheduling
public class ServerMonitoringAgent {
    
    private static final Logger logger = LoggerFactory.getLogger(ServerMonitoringAgent.class);
    
    public static void main(String[] args) {
        logger.info("🚀 Starting Server Monitoring Agent POC...");
        SpringApplication.run(ServerMonitoringAgent.class, args);
    }
}

/**
 * Core metrics collection service
 */
@Component
class MetricsCollector {
    
    private static final Logger logger = LoggerFactory.getLogger(MetricsCollector.class);
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String agentId = UUID.randomUUID().toString();
    private final String serverEndpoint = "http://localhost:8090/api/metrics/ingest";
    
    private final AtomicLong metricsCollected = new AtomicLong(0);
    private final AtomicLong successfulSends = new AtomicLong(0);
    private final AtomicLong failedSends = new AtomicLong(0);
    
    @PostConstruct
    public void initialize() {
        logger.info("🔧 Initializing Metrics Collector with Agent ID: {}", agentId);
        registerAgent();
    }
    
    /**
     * Register agent with monitoring server
     */
    private void registerAgent() {
        try {
            Map<String, Object> registration = new HashMap<>();
            registration.put("agentId", agentId);
            registration.put("hostname", InetAddress.getLocalHost().getHostName());
            registration.put("ipAddress", InetAddress.getLocalHost().getHostAddress());
            registration.put("operatingSystem", System.getProperty("os.name"));
            registration.put("architecture", System.getProperty("os.arch"));
            registration.put("javaVersion", System.getProperty("java.version"));
            registration.put("registeredAt", Instant.now().toString());
            
            logger.info("📝 Registering agent: {}", registration);
            
            // In real implementation, this would call the registration endpoint
            // restTemplate.postForObject(registrationEndpoint, registration, String.class);
            
        } catch (Exception e) {
            logger.error("❌ Failed to register agent: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Collect and send system metrics every 30 seconds
     */
    @Scheduled(fixedRate = 30000) // 30 seconds
    public void collectAndSendMetrics() {
        try {
            Map<String, Object> metrics = collectSystemMetrics();
            sendMetrics(metrics);
            metricsCollected.incrementAndGet();
            
            logger.debug("📊 Collected metrics: {}", metrics);
            
        } catch (Exception e) {
            logger.error("❌ Error collecting metrics: {}", e.getMessage(), e);
            failedSends.incrementAndGet();
        }
    }
    
    /**
     * Collect comprehensive system metrics
     */
    private Map<String, Object> collectSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Basic metadata
        metrics.put("agentId", agentId);
        metrics.put("timestamp", Instant.now().toString());
        metrics.put("hostname", getHostname());
        
        // CPU metrics
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        metrics.put("cpu.usage", getCpuUsage(osBean));
        metrics.put("cpu.loadAverage", osBean.getSystemLoadAverage());
        metrics.put("cpu.availableProcessors", osBean.getAvailableProcessors());
        
        // Memory metrics
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        long heapUsed = memoryBean.getHeapMemoryUsage().getUsed();
        long heapMax = memoryBean.getHeapMemoryUsage().getMax();
        long nonHeapUsed = memoryBean.getNonHeapMemoryUsage().getUsed();
        
        metrics.put("memory.heap.used", heapUsed);
        metrics.put("memory.heap.max", heapMax);
        metrics.put("memory.heap.usage", (double) heapUsed / heapMax * 100);
        metrics.put("memory.nonHeap.used", nonHeapUsed);
        
        // System memory (approximation)
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        
        metrics.put("system.memory.total", totalMemory);
        metrics.put("system.memory.used", usedMemory);
        metrics.put("system.memory.free", freeMemory);
        metrics.put("system.memory.usage", (double) usedMemory / totalMemory * 100);
        
        // Disk metrics
        File[] roots = File.listRoots();
        for (int i = 0; i < roots.length; i++) {
            File root = roots[i];
            String prefix = "disk." + i;
            
            metrics.put(prefix + ".path", root.getAbsolutePath());
            metrics.put(prefix + ".total", root.getTotalSpace());
            metrics.put(prefix + ".free", root.getFreeSpace());
            metrics.put(prefix + ".used", root.getTotalSpace() - root.getFreeSpace());
            metrics.put(prefix + ".usage", 
                (double) (root.getTotalSpace() - root.getFreeSpace()) / root.getTotalSpace() * 100);
        }
        
        // JVM metrics
        metrics.put("jvm.uptime", ManagementFactory.getRuntimeMXBean().getUptime());
        metrics.put("jvm.threads.count", ManagementFactory.getThreadMXBean().getThreadCount());
        metrics.put("jvm.threads.peak", ManagementFactory.getThreadMXBean().getPeakThreadCount());
        
        // Agent statistics
        metrics.put("agent.metrics.collected", metricsCollected.get());
        metrics.put("agent.metrics.successful", successfulSends.get());
        metrics.put("agent.metrics.failed", failedSends.get());
        
        return metrics;
    }
    
    /**
     * Get CPU usage percentage
     */
    private double getCpuUsage(OperatingSystemMXBean osBean) {
        if (osBean instanceof com.sun.management.OperatingSystemMXBean) {
            com.sun.management.OperatingSystemMXBean sunOsBean = 
                (com.sun.management.OperatingSystemMXBean) osBean;
            return sunOsBean.getProcessCpuLoad() * 100;
        }
        return -1; // Not available
    }
    
    /**
     * Get hostname safely
     */
    private String getHostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "unknown";
        }
    }
    
    /**
     * Send metrics to monitoring server
     */
    private void sendMetrics(Map<String, Object> metrics) {
        try {
            // In POC, we'll just log the metrics
            // In real implementation, this would send to the server
            logger.info("📤 Sending metrics to server: {} data points", metrics.size());
            
            // Simulate network call
            Thread.sleep(100); // Simulate network latency
            
            // Uncomment for real server integration:
            // String response = restTemplate.postForObject(serverEndpoint, metrics, String.class);
            // logger.debug("✅ Server response: {}", response);
            
            successfulSends.incrementAndGet();
            
        } catch (Exception e) {
            logger.error("❌ Failed to send metrics: {}", e.getMessage());
            failedSends.incrementAndGet();
            throw new RuntimeException("Metrics send failed", e);
        }
    }
    
    /**
     * Health check endpoint for the agent
     */
    @Scheduled(fixedRate = 60000) // 1 minute
    public void performHealthCheck() {
        try {
            Map<String, Object> healthStatus = new HashMap<>();
            healthStatus.put("agentId", agentId);
            healthStatus.put("status", "healthy");
            healthStatus.put("timestamp", Instant.now().toString());
            healthStatus.put("metricsCollected", metricsCollected.get());
            healthStatus.put("successRate", calculateSuccessRate());
            
            logger.info("💓 Agent Health Check: {}", healthStatus);
            
        } catch (Exception e) {
            logger.error("❌ Health check failed: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Calculate success rate for metrics transmission
     */
    private double calculateSuccessRate() {
        long total = successfulSends.get() + failedSends.get();
        if (total == 0) return 100.0;
        return (double) successfulSends.get() / total * 100;
    }
}

/**
 * Configuration for the monitoring agent
 */
@Component
class AgentConfiguration {
    
    private static final Logger logger = LoggerFactory.getLogger(AgentConfiguration.class);
    
    @PostConstruct
    public void logConfiguration() {
        logger.info("🔧 Agent Configuration:");
        logger.info("  - Collection Interval: 30 seconds");
        logger.info("  - Health Check Interval: 60 seconds");
        logger.info("  - Server Endpoint: http://localhost:8090/api/metrics/ingest");
        logger.info("  - Operating System: {}", System.getProperty("os.name"));
        logger.info("  - Java Version: {}", System.getProperty("java.version"));
        logger.info("  - Available Processors: {}", Runtime.getRuntime().availableProcessors());
        logger.info("  - Max Memory: {} MB", Runtime.getRuntime().maxMemory() / 1024 / 1024);
    }
}

/**
 * Error handling and retry logic
 */
@Component
class ErrorHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(ErrorHandler.class);
    private final AtomicLong errorCount = new AtomicLong(0);
    
    public void handleError(String operation, Exception error) {
        errorCount.incrementAndGet();
        logger.error("❌ Error in {}: {}", operation, error.getMessage());
        
        // Implement retry logic here
        if (shouldRetry(error)) {
            logger.info("🔄 Scheduling retry for operation: {}", operation);
            // Implement exponential backoff retry
        }
    }
    
    private boolean shouldRetry(Exception error) {
        // Determine if error is retryable
        return !(error instanceof SecurityException || 
                error instanceof IllegalArgumentException);
    }
    
    public long getErrorCount() {
        return errorCount.get();
    }
}
