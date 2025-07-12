/**
 * 🤖 SAMS Monitoring Agent - Cross-Platform System Monitor
 * Lightweight Java-based monitoring agent for comprehensive system metrics collection
 */

package com.monitoring.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoring.agent.collectors.*;
import com.monitoring.agent.config.AgentConfiguration;
import com.monitoring.agent.model.MetricData;
import com.monitoring.agent.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

public class MonitoringAgent {

    private static final Logger logger = LoggerFactory.getLogger(MonitoringAgent.class);
    private static final String VERSION = "2.1.0";
    private static final String AGENT_NAME = "SAMS-Agent";

    private final AgentConfiguration config;
    private final List<MetricCollector> collectors;
    private final MetricTransmissionService transmissionService;
    private final ConfigurationService configService;
    private final UpdateService updateService;
    private final HealthCheckService healthCheckService;
    
    private final ScheduledExecutorService scheduler;
    private final ExecutorService executorService;
    private final ObjectMapper objectMapper;
    
    private volatile boolean running = false;
    private volatile boolean shuttingDown = false;

    public MonitoringAgent(String configPath) {
        logger.info("🚀 Initializing {} v{}", AGENT_NAME, VERSION);
        
        this.objectMapper = new ObjectMapper();
        this.configService = new ConfigurationService();
        this.config = configService.loadConfiguration(configPath);
        
        // Initialize services
        this.transmissionService = new MetricTransmissionService(config);
        this.updateService = new UpdateService(config);
        this.healthCheckService = new HealthCheckService(config);
        
        // Initialize thread pools
        this.scheduler = Executors.newScheduledThreadPool(4, 
            r -> new Thread(r, "SAMS-Agent-Scheduler"));
        this.executorService = Executors.newFixedThreadPool(
            config.getMaxConcurrentCollectors(),
            r -> new Thread(r, "SAMS-Agent-Collector"));
        
        // Initialize metric collectors
        this.collectors = initializeCollectors();
        
        // Register shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(this::shutdown));
        
        logger.info("✅ {} v{} initialized successfully", AGENT_NAME, VERSION);
    }

    /**
     * Start the monitoring agent
     */
    public void start() {
        if (running) {
            logger.warn("⚠️ Agent is already running");
            return;
        }

        logger.info("🔄 Starting {} v{}", AGENT_NAME, VERSION);
        running = true;

        try {
            // Start health check service
            healthCheckService.start();
            
            // Register agent with server
            registerAgent();
            
            // Schedule metric collection
            scheduleMetricCollection();
            
            // Schedule configuration updates
            scheduleConfigurationUpdates();
            
            // Schedule agent updates
            scheduleAgentUpdates();
            
            // Schedule health checks
            scheduleHealthChecks();
            
            logger.info("✅ {} v{} started successfully", AGENT_NAME, VERSION);
            
            // Keep agent running
            waitForShutdown();
            
        } catch (Exception e) {
            logger.error("❌ Failed to start agent: {}", e.getMessage(), e);
            shutdown();
        }
    }

    /**
     * Initialize metric collectors based on configuration
     */
    private List<MetricCollector> initializeCollectors() {
        List<MetricCollector> collectorList = new ArrayList<>();
        
        try {
            // System metrics collectors
            if (config.isSystemMetricsEnabled()) {
                collectorList.add(new CpuMetricCollector(config));
                collectorList.add(new MemoryMetricCollector(config));
                collectorList.add(new DiskMetricCollector(config));
                collectorList.add(new NetworkMetricCollector(config));
                collectorList.add(new ProcessMetricCollector(config));
            }
            
            // Application metrics collectors
            if (config.isApplicationMetricsEnabled()) {
                collectorList.add(new JvmMetricCollector(config));
                collectorList.add(new DatabaseMetricCollector(config));
                collectorList.add(new WebServerMetricCollector(config));
                collectorList.add(new CustomApplicationMetricCollector(config));
            }
            
            // Log metrics collectors
            if (config.isLogMetricsEnabled()) {
                collectorList.add(new LogMetricCollector(config));
                collectorList.add(new ErrorMetricCollector(config));
            }
            
            // Security metrics collectors
            if (config.isSecurityMetricsEnabled()) {
                collectorList.add(new SecurityEventCollector(config));
                collectorList.add(new LoginAttemptCollector(config));
            }
            
            logger.info("📊 Initialized {} metric collectors", collectorList.size());
            
        } catch (Exception e) {
            logger.error("❌ Error initializing collectors: {}", e.getMessage(), e);
        }
        
        return collectorList;
    }

    /**
     * Register agent with monitoring server
     */
    private void registerAgent() {
        try {
            AgentRegistrationRequest request = new AgentRegistrationRequest();
            request.setAgentId(config.getAgentId());
            request.setAgentName(AGENT_NAME);
            request.setVersion(VERSION);
            request.setHostname(getHostname());
            request.setIpAddress(getLocalIpAddress());
            request.setOperatingSystem(getOperatingSystem());
            request.setArchitecture(getArchitecture());
            request.setStartTime(LocalDateTime.now());
            request.setCapabilities(getAgentCapabilities());
            request.setConfiguration(config.getPublicConfiguration());
            
            boolean registered = transmissionService.registerAgent(request);
            
            if (registered) {
                logger.info("✅ Agent registered successfully with server");
            } else {
                logger.error("❌ Failed to register agent with server");
            }
            
        } catch (Exception e) {
            logger.error("❌ Error registering agent: {}", e.getMessage(), e);
        }
    }

    /**
     * Schedule metric collection tasks
     */
    private void scheduleMetricCollection() {
        for (MetricCollector collector : collectors) {
            int interval = collector.getCollectionInterval();
            
            scheduler.scheduleAtFixedRate(() -> {
                if (!running || shuttingDown) return;
                
                try {
                    collectAndTransmitMetrics(collector);
                } catch (Exception e) {
                    logger.error("❌ Error in metric collection for {}: {}", 
                               collector.getClass().getSimpleName(), e.getMessage(), e);
                }
            }, 0, interval, TimeUnit.SECONDS);
            
            logger.debug("📅 Scheduled {} with {}s interval", 
                        collector.getClass().getSimpleName(), interval);
        }
    }

    /**
     * Collect and transmit metrics from a collector
     */
    private void collectAndTransmitMetrics(MetricCollector collector) {
        CompletableFuture.supplyAsync(() -> {
            try {
                return collector.collectMetrics();
            } catch (Exception e) {
                logger.error("❌ Error collecting metrics from {}: {}", 
                           collector.getClass().getSimpleName(), e.getMessage());
                return Collections.<MetricData>emptyList();
            }
        }, executorService)
        .thenAccept(metrics -> {
            if (!metrics.isEmpty()) {
                transmissionService.transmitMetrics(metrics);
                logger.debug("📤 Transmitted {} metrics from {}", 
                           metrics.size(), collector.getClass().getSimpleName());
            }
        })
        .exceptionally(throwable -> {
            logger.error("❌ Error in metric transmission: {}", throwable.getMessage());
            return null;
        });
    }

    /**
     * Schedule configuration updates
     */
    private void scheduleConfigurationUpdates() {
        scheduler.scheduleAtFixedRate(() -> {
            if (!running || shuttingDown) return;
            
            try {
                AgentConfiguration newConfig = configService.checkForConfigurationUpdates(config);
                if (newConfig != null) {
                    updateConfiguration(newConfig);
                }
            } catch (Exception e) {
                logger.error("❌ Error checking configuration updates: {}", e.getMessage(), e);
            }
        }, 60, config.getConfigUpdateInterval(), TimeUnit.SECONDS);
    }

    /**
     * Schedule agent updates
     */
    private void scheduleAgentUpdates() {
        scheduler.scheduleAtFixedRate(() -> {
            if (!running || shuttingDown) return;
            
            try {
                if (updateService.checkForUpdates()) {
                    logger.info("🔄 Agent update available, initiating update process");
                    updateService.performUpdate();
                }
            } catch (Exception e) {
                logger.error("❌ Error checking agent updates: {}", e.getMessage(), e);
            }
        }, 300, config.getUpdateCheckInterval(), TimeUnit.SECONDS);
    }

    /**
     * Schedule health checks
     */
    private void scheduleHealthChecks() {
        scheduler.scheduleAtFixedRate(() -> {
            if (!running || shuttingDown) return;
            
            try {
                AgentHealthStatus health = healthCheckService.performHealthCheck();
                transmissionService.transmitHealthStatus(health);
                
                if (!health.isHealthy()) {
                    logger.warn("⚠️ Agent health check failed: {}", health.getIssues());
                }
            } catch (Exception e) {
                logger.error("❌ Error performing health check: {}", e.getMessage(), e);
            }
        }, 30, config.getHealthCheckInterval(), TimeUnit.SECONDS);
    }

    /**
     * Update agent configuration
     */
    private void updateConfiguration(AgentConfiguration newConfig) {
        logger.info("🔄 Updating agent configuration");
        
        try {
            // Validate new configuration
            if (!configService.validateConfiguration(newConfig)) {
                logger.error("❌ Invalid configuration received, ignoring update");
                return;
            }
            
            // Apply configuration changes
            boolean restartRequired = configService.applyConfiguration(config, newConfig);
            
            if (restartRequired) {
                logger.info("🔄 Configuration update requires restart, scheduling restart");
                scheduleRestart();
            } else {
                logger.info("✅ Configuration updated successfully");
            }
            
        } catch (Exception e) {
            logger.error("❌ Error updating configuration: {}", e.getMessage(), e);
        }
    }

    /**
     * Schedule agent restart
     */
    private void scheduleRestart() {
        scheduler.schedule(() -> {
            logger.info("🔄 Restarting agent for configuration changes");
            restart();
        }, 10, TimeUnit.SECONDS);
    }

    /**
     * Restart the agent
     */
    private void restart() {
        logger.info("🔄 Restarting {} v{}", AGENT_NAME, VERSION);
        
        shutdown();
        
        // Wait a moment before restarting
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Restart agent (this would typically involve process restart)
        start();
    }

    /**
     * Wait for shutdown signal
     */
    private void waitForShutdown() {
        try {
            while (running && !shuttingDown) {
                Thread.sleep(1000);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.info("🛑 Agent interrupted, shutting down");
        }
    }

    /**
     * Shutdown the agent gracefully
     */
    public void shutdown() {
        if (shuttingDown) return;
        
        logger.info("🛑 Shutting down {} v{}", AGENT_NAME, VERSION);
        shuttingDown = true;
        running = false;
        
        try {
            // Stop health check service
            healthCheckService.stop();
            
            // Shutdown schedulers
            scheduler.shutdown();
            executorService.shutdown();
            
            // Wait for tasks to complete
            if (!scheduler.awaitTermination(30, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
            if (!executorService.awaitTermination(30, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
            
            // Close transmission service
            transmissionService.close();
            
            // Unregister agent
            unregisterAgent();
            
            logger.info("✅ {} v{} shutdown completed", AGENT_NAME, VERSION);
            
        } catch (Exception e) {
            logger.error("❌ Error during shutdown: {}", e.getMessage(), e);
        }
    }

    /**
     * Unregister agent from server
     */
    private void unregisterAgent() {
        try {
            transmissionService.unregisterAgent(config.getAgentId());
            logger.info("✅ Agent unregistered from server");
        } catch (Exception e) {
            logger.error("❌ Error unregistering agent: {}", e.getMessage(), e);
        }
    }

    // Helper methods
    private String getHostname() {
        try {
            return java.net.InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "unknown";
        }
    }

    private String getLocalIpAddress() {
        try {
            return java.net.InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            return "unknown";
        }
    }

    private String getOperatingSystem() {
        return System.getProperty("os.name") + " " + System.getProperty("os.version");
    }

    private String getArchitecture() {
        return System.getProperty("os.arch");
    }

    private List<String> getAgentCapabilities() {
        List<String> capabilities = new ArrayList<>();
        capabilities.add("system-metrics");
        capabilities.add("application-metrics");
        capabilities.add("log-metrics");
        capabilities.add("security-metrics");
        capabilities.add("auto-update");
        capabilities.add("remote-configuration");
        capabilities.add("health-monitoring");
        return capabilities;
    }

    /**
     * Main entry point
     */
    public static void main(String[] args) {
        String configPath = args.length > 0 ? args[0] : "config/agent.yml";
        
        try {
            MonitoringAgent agent = new MonitoringAgent(configPath);
            agent.start();
        } catch (Exception e) {
            System.err.println("❌ Failed to start monitoring agent: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
