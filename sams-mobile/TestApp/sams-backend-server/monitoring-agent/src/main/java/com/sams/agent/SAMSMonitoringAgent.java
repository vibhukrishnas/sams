package com.sams.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.management.OperatingSystemMXBean;
import java.io.*;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * SAMS Monitoring Agent - Phase 2 Week 6
 * Cross-platform monitoring agent for system and application metrics
 */
public class SAMSMonitoringAgent {
    
    private static final String VERSION = "1.0.0";
    private static final String CONFIG_FILE = "sams-agent.properties";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    private Properties config;
    private ScheduledExecutorService scheduler;
    private String serverUrl;
    private String agentId;
    private int collectionInterval;
    private boolean running = false;
    
    // System monitoring beans
    private final OperatingSystemMXBean osBean;
    private final MemoryMXBean memoryBean;
    private final Runtime runtime;
    
    public SAMSMonitoringAgent() {
        this.osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        this.memoryBean = ManagementFactory.getMemoryMXBean();
        this.runtime = Runtime.getRuntime();
        this.scheduler = Executors.newScheduledThreadPool(3);
        
        loadConfiguration();
        initializeAgent();
    }
    
    private void loadConfiguration() {
        config = new Properties();
        
        try {
            // Try to load from file first
            if (Files.exists(Paths.get(CONFIG_FILE))) {
                config.load(new FileInputStream(CONFIG_FILE));
                log("Configuration loaded from " + CONFIG_FILE);
            } else {
                // Use default configuration
                setDefaultConfiguration();
                saveConfiguration();
                log("Default configuration created");
            }
        } catch (IOException e) {
            log("Error loading configuration: " + e.getMessage());
            setDefaultConfiguration();
        }
        
        // Override with environment variables if present
        overrideWithEnvironment();
    }
    
    private void setDefaultConfiguration() {
        config.setProperty("server.url", "http://localhost:8080");
        config.setProperty("agent.id", generateAgentId());
        config.setProperty("collection.interval", "30");
        config.setProperty("metrics.system.enabled", "true");
        config.setProperty("metrics.application.enabled", "true");
        config.setProperty("metrics.network.enabled", "true");
        config.setProperty("auto.update.enabled", "true");
        config.setProperty("auto.update.check.interval", "3600");
        config.setProperty("log.level", "INFO");
    }
    
    private void overrideWithEnvironment() {
        String envServerUrl = System.getenv("SAMS_SERVER_URL");
        if (envServerUrl != null) {
            config.setProperty("server.url", envServerUrl);
        }
        
        String envAgentId = System.getenv("SAMS_AGENT_ID");
        if (envAgentId != null) {
            config.setProperty("agent.id", envAgentId);
        }
        
        String envInterval = System.getenv("SAMS_COLLECTION_INTERVAL");
        if (envInterval != null) {
            config.setProperty("collection.interval", envInterval);
        }
    }
    
    private void saveConfiguration() {
        try {
            config.store(new FileOutputStream(CONFIG_FILE), "SAMS Monitoring Agent Configuration");
        } catch (IOException e) {
            log("Error saving configuration: " + e.getMessage());
        }
    }
    
    private void initializeAgent() {
        serverUrl = config.getProperty("server.url");
        agentId = config.getProperty("agent.id");
        collectionInterval = Integer.parseInt(config.getProperty("collection.interval", "30"));
        
        log("SAMS Monitoring Agent v" + VERSION + " initialized");
        log("Agent ID: " + agentId);
        log("Server URL: " + serverUrl);
        log("Collection Interval: " + collectionInterval + " seconds");
    }
    
    public void start() {
        if (running) {
            log("Agent is already running");
            return;
        }
        
        running = true;
        log("Starting SAMS Monitoring Agent...");
        
        // Register agent with server
        registerAgent();
        
        // Start metrics collection
        startMetricsCollection();
        
        // Start auto-update check if enabled
        if (Boolean.parseBoolean(config.getProperty("auto.update.enabled", "true"))) {
            startAutoUpdateCheck();
        }
        
        log("SAMS Monitoring Agent started successfully");
    }
    
    public void stop() {
        if (!running) {
            log("Agent is not running");
            return;
        }
        
        running = false;
        log("Stopping SAMS Monitoring Agent...");
        
        // Unregister agent
        unregisterAgent();
        
        // Shutdown scheduler
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(10, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
        }
        
        log("SAMS Monitoring Agent stopped");
    }
    
    private void registerAgent() {
        try {
            Map<String, Object> registration = new HashMap<>();
            registration.put("agentId", agentId);
            registration.put("version", VERSION);
            registration.put("hostname", getHostname());
            registration.put("platform", getPlatformInfo());
            registration.put("capabilities", getCapabilities());
            registration.put("timestamp", System.currentTimeMillis());
            
            String response = sendHttpRequest("/api/v1/agents/register", "POST", registration);
            log("Agent registered successfully: " + response);
            
        } catch (Exception e) {
            log("Error registering agent: " + e.getMessage());
        }
    }
    
    private void unregisterAgent() {
        try {
            Map<String, Object> unregistration = new HashMap<>();
            unregistration.put("agentId", agentId);
            unregistration.put("timestamp", System.currentTimeMillis());
            
            sendHttpRequest("/api/v1/agents/unregister", "POST", unregistration);
            log("Agent unregistered successfully");
            
        } catch (Exception e) {
            log("Error unregistering agent: " + e.getMessage());
        }
    }
    
    private void startMetricsCollection() {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                collectAndSendMetrics();
            } catch (Exception e) {
                log("Error collecting metrics: " + e.getMessage());
            }
        }, 0, collectionInterval, TimeUnit.SECONDS);
        
        log("Metrics collection started (interval: " + collectionInterval + "s)");
    }
    
    private void collectAndSendMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // System metrics
        if (Boolean.parseBoolean(config.getProperty("metrics.system.enabled", "true"))) {
            metrics.putAll(collectSystemMetrics());
        }
        
        // Application metrics
        if (Boolean.parseBoolean(config.getProperty("metrics.application.enabled", "true"))) {
            metrics.putAll(collectApplicationMetrics());
        }
        
        // Network metrics
        if (Boolean.parseBoolean(config.getProperty("metrics.network.enabled", "true"))) {
            metrics.putAll(collectNetworkMetrics());
        }
        
        // Add metadata
        metrics.put("agentId", agentId);
        metrics.put("hostname", getHostname());
        metrics.put("timestamp", System.currentTimeMillis());
        
        // Send to server
        try {
            sendHttpRequest("/api/v1/metrics/agent", "POST", metrics);
            log("Metrics sent successfully");
        } catch (Exception e) {
            log("Error sending metrics: " + e.getMessage());
        }
    }
    
    private Map<String, Object> collectSystemMetrics() {
        Map<String, Object> systemMetrics = new HashMap<>();
        
        try {
            // CPU metrics
            double cpuUsage = osBean.getProcessCpuLoad() * 100;
            double systemCpuUsage = osBean.getSystemCpuLoad() * 100;
            systemMetrics.put("cpu.process", Math.max(0, cpuUsage));
            systemMetrics.put("cpu.system", Math.max(0, systemCpuUsage));
            systemMetrics.put("cpu.cores", osBean.getAvailableProcessors());
            
            // Memory metrics
            long totalMemory = osBean.getTotalPhysicalMemorySize();
            long freeMemory = osBean.getFreePhysicalMemorySize();
            long usedMemory = totalMemory - freeMemory;
            double memoryUsage = (double) usedMemory / totalMemory * 100;
            
            systemMetrics.put("memory.total", totalMemory);
            systemMetrics.put("memory.used", usedMemory);
            systemMetrics.put("memory.free", freeMemory);
            systemMetrics.put("memory.usage", memoryUsage);
            
            // JVM Memory
            long jvmTotal = runtime.totalMemory();
            long jvmFree = runtime.freeMemory();
            long jvmUsed = jvmTotal - jvmFree;
            long jvmMax = runtime.maxMemory();
            
            systemMetrics.put("jvm.memory.total", jvmTotal);
            systemMetrics.put("jvm.memory.used", jvmUsed);
            systemMetrics.put("jvm.memory.free", jvmFree);
            systemMetrics.put("jvm.memory.max", jvmMax);
            
            // Disk metrics
            File[] roots = File.listRoots();
            long totalDisk = 0;
            long freeDisk = 0;
            
            for (File root : roots) {
                totalDisk += root.getTotalSpace();
                freeDisk += root.getFreeSpace();
            }
            
            long usedDisk = totalDisk - freeDisk;
            double diskUsage = totalDisk > 0 ? (double) usedDisk / totalDisk * 100 : 0;
            
            systemMetrics.put("disk.total", totalDisk);
            systemMetrics.put("disk.used", usedDisk);
            systemMetrics.put("disk.free", freeDisk);
            systemMetrics.put("disk.usage", diskUsage);
            
            // Load average (Unix-like systems)
            double loadAverage = osBean.getSystemLoadAverage();
            if (loadAverage >= 0) {
                systemMetrics.put("load.average", loadAverage);
            }
            
        } catch (Exception e) {
            log("Error collecting system metrics: " + e.getMessage());
        }
        
        return systemMetrics;
    }
    
    private Map<String, Object> collectApplicationMetrics() {
        Map<String, Object> appMetrics = new HashMap<>();
        
        try {
            // Thread metrics
            appMetrics.put("threads.total", Thread.activeCount());
            appMetrics.put("threads.daemon", Thread.getAllStackTraces().size());
            
            // GC metrics
            appMetrics.put("gc.collections", getGCCollections());
            appMetrics.put("gc.time", getGCTime());
            
            // Uptime
            appMetrics.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime());
            
            // Process metrics
            appMetrics.put("process.id", ProcessHandle.current().pid());
            
        } catch (Exception e) {
            log("Error collecting application metrics: " + e.getMessage());
        }
        
        return appMetrics;
    }
    
    private Map<String, Object> collectNetworkMetrics() {
        Map<String, Object> networkMetrics = new HashMap<>();
        
        try {
            // Network interface metrics (simplified)
            networkMetrics.put("network.interfaces", getNetworkInterfaces());
            
            // Connection test to server
            long startTime = System.currentTimeMillis();
            boolean serverReachable = testServerConnection();
            long responseTime = System.currentTimeMillis() - startTime;
            
            networkMetrics.put("server.reachable", serverReachable);
            networkMetrics.put("server.response.time", responseTime);
            
        } catch (Exception e) {
            log("Error collecting network metrics: " + e.getMessage());
        }
        
        return networkMetrics;
    }
    
    private void startAutoUpdateCheck() {
        int checkInterval = Integer.parseInt(config.getProperty("auto.update.check.interval", "3600"));
        
        scheduler.scheduleAtFixedRate(() -> {
            try {
                checkForUpdates();
            } catch (Exception e) {
                log("Error checking for updates: " + e.getMessage());
            }
        }, checkInterval, checkInterval, TimeUnit.SECONDS);
        
        log("Auto-update check started (interval: " + checkInterval + "s)");
    }
    
    private void checkForUpdates() {
        try {
            Map<String, Object> updateCheck = new HashMap<>();
            updateCheck.put("agentId", agentId);
            updateCheck.put("currentVersion", VERSION);
            updateCheck.put("platform", getPlatformInfo());
            
            String response = sendHttpRequest("/api/v1/agents/check-update", "POST", updateCheck);
            
            // Parse response and handle update if available
            Map<String, Object> updateInfo = objectMapper.readValue(response, Map.class);
            
            if (Boolean.TRUE.equals(updateInfo.get("updateAvailable"))) {
                String newVersion = (String) updateInfo.get("version");
                String downloadUrl = (String) updateInfo.get("downloadUrl");
                
                log("Update available: " + newVersion);
                log("Download URL: " + downloadUrl);
                
                // In a real implementation, you would download and install the update
                // For now, just log the availability
            }
            
        } catch (Exception e) {
            log("Error checking for updates: " + e.getMessage());
        }
    }
    
    // Utility methods
    private String generateAgentId() {
        return "agent-" + UUID.randomUUID().toString().substring(0, 8);
    }
    
    private String getHostname() {
        try {
            return java.net.InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "unknown";
        }
    }
    
    private Map<String, String> getPlatformInfo() {
        Map<String, String> platform = new HashMap<>();
        platform.put("os.name", System.getProperty("os.name"));
        platform.put("os.version", System.getProperty("os.version"));
        platform.put("os.arch", System.getProperty("os.arch"));
        platform.put("java.version", System.getProperty("java.version"));
        platform.put("java.vendor", System.getProperty("java.vendor"));
        return platform;
    }
    
    private List<String> getCapabilities() {
        List<String> capabilities = new ArrayList<>();
        capabilities.add("system-metrics");
        capabilities.add("application-metrics");
        capabilities.add("network-metrics");
        capabilities.add("auto-update");
        return capabilities;
    }
    
    private long getGCCollections() {
        return ManagementFactory.getGarbageCollectorMXBeans().stream()
                .mapToLong(gc -> gc.getCollectionCount())
                .sum();
    }
    
    private long getGCTime() {
        return ManagementFactory.getGarbageCollectorMXBeans().stream()
                .mapToLong(gc -> gc.getCollectionTime())
                .sum();
    }
    
    private List<String> getNetworkInterfaces() {
        List<String> interfaces = new ArrayList<>();
        try {
            java.net.NetworkInterface.getNetworkInterfaces().asIterator()
                    .forEachRemaining(ni -> interfaces.add(ni.getName()));
        } catch (Exception e) {
            log("Error getting network interfaces: " + e.getMessage());
        }
        return interfaces;
    }
    
    private boolean testServerConnection() {
        try {
            URL url = new URL(serverUrl + "/api/v1/health");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            
            int responseCode = conn.getResponseCode();
            return responseCode == 200;
            
        } catch (Exception e) {
            return false;
        }
    }
    
    private String sendHttpRequest(String endpoint, String method, Object data) throws Exception {
        URL url = new URL(serverUrl + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        conn.setRequestMethod(method);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", "SAMS-Agent/" + VERSION);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);
        
        if (data != null) {
            conn.setDoOutput(true);
            String jsonData = objectMapper.writeValueAsString(data);
            
            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonData.getBytes());
            }
        }
        
        int responseCode = conn.getResponseCode();
        
        try (BufferedReader br = new BufferedReader(new InputStreamReader(
                responseCode >= 200 && responseCode < 300 ? conn.getInputStream() : conn.getErrorStream()))) {
            
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            
            if (responseCode >= 200 && responseCode < 300) {
                return response.toString();
            } else {
                throw new Exception("HTTP " + responseCode + ": " + response.toString());
            }
        }
    }
    
    private void log(String message) {
        String timestamp = new Date().toString();
        System.out.println("[" + timestamp + "] " + message);
    }
    
    // Main method
    public static void main(String[] args) {
        SAMSMonitoringAgent agent = new SAMSMonitoringAgent();
        
        // Add shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(agent::stop));
        
        // Start agent
        agent.start();
        
        // Keep running
        try {
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            agent.stop();
        }
    }
}
