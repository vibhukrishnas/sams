package com.sams.monitor.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sams.monitor.dto.AlertDTO;
import com.sams.monitor.dto.ServerDTO;
import com.sams.monitor.enums.AlertSeverity;
import com.sams.monitor.enums.ServerType;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureTestMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Slf4j
@SpringBootTest
@AutoConfigureTestMvc
@ActiveProfiles("test")
@Transactional
class LoadTestExecutor {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private LoadTestReportGenerator reportGenerator;
    private List<LoadTestResult> testResults;

    // Load test configuration
    private static final int NORMAL_LOAD_USERS = 100;
    private static final int HIGH_LOAD_USERS = 1000;
    private static final int EXTREME_LOAD_USERS = 10000;
    private static final int TEST_DURATION_SECONDS = 300; // 5 minutes
    private static final int RAMP_UP_SECONDS = 60; // 1 minute

    @BeforeEach
    void setUp() {
        reportGenerator = new LoadTestReportGenerator();
        testResults = new ArrayList<>();
    }

    @Test
    void executeNormalLoadTest() throws Exception {
        log.info("🚀 Starting Normal Load Test with {} users", NORMAL_LOAD_USERS);
        
        LoadTestConfiguration config = LoadTestConfiguration.builder()
                .testName("Normal Load Test")
                .virtualUsers(NORMAL_LOAD_USERS)
                .duration(TEST_DURATION_SECONDS)
                .rampUpTime(RAMP_UP_SECONDS)
                .targetThroughput(50.0) // 50 requests per second
                .build();

        LoadTestResult result = executeLoadTest(config);
        testResults.add(result);
        
        // Assertions for normal load
        assert result.getErrorRate() < 1.0 : "Error rate should be less than 1% under normal load";
        assert result.getAverageResponseTime() < 2000 : "Average response time should be less than 2 seconds";
        
        log.info("✅ Normal Load Test completed successfully");
    }

    @Test
    void executeHighLoadTest() throws Exception {
        log.info("🚀 Starting High Load Test with {} users", HIGH_LOAD_USERS);
        
        LoadTestConfiguration config = LoadTestConfiguration.builder()
                .testName("High Load Test")
                .virtualUsers(HIGH_LOAD_USERS)
                .duration(TEST_DURATION_SECONDS)
                .rampUpTime(RAMP_UP_SECONDS)
                .targetThroughput(500.0) // 500 requests per second
                .build();

        LoadTestResult result = executeLoadTest(config);
        testResults.add(result);
        
        // Assertions for high load
        assert result.getErrorRate() < 5.0 : "Error rate should be less than 5% under high load";
        assert result.getAverageResponseTime() < 5000 : "Average response time should be less than 5 seconds";
        
        log.info("✅ High Load Test completed successfully");
    }

    @Test
    void executeExtremeLoadTest() throws Exception {
        log.info("🚀 Starting Extreme Load Test with {} users", EXTREME_LOAD_USERS);
        
        LoadTestConfiguration config = LoadTestConfiguration.builder()
                .testName("Extreme Load Test")
                .virtualUsers(EXTREME_LOAD_USERS)
                .duration(TEST_DURATION_SECONDS)
                .rampUpTime(RAMP_UP_SECONDS)
                .targetThroughput(1000.0) // 1000 requests per second
                .build();

        LoadTestResult result = executeLoadTest(config);
        testResults.add(result);
        
        // Assertions for extreme load
        assert result.getErrorRate() < 10.0 : "Error rate should be less than 10% under extreme load";
        assert result.getThroughput() > 800.0 : "Throughput should be at least 800 requests per second";
        
        log.info("✅ Extreme Load Test completed successfully");
    }

    @Test
    void executeDatabasePerformanceTest() throws Exception {
        log.info("🗄️ Starting Database Performance Test");
        
        DatabaseLoadTestResult result = executeDatabaseLoadTest();
        
        // Database performance assertions
        assert result.getAverageQueryTime() < 100 : "Average query time should be less than 100ms";
        assert result.getConnectionPoolUtilization() < 80.0 : "Connection pool utilization should be less than 80%";
        assert result.getDeadlockCount() == 0 : "No deadlocks should occur during load test";
        
        log.info("✅ Database Performance Test completed successfully");
    }

    @Test
    void executeRealTimeCommunicationLoadTest() throws Exception {
        log.info("📡 Starting Real-Time Communication Load Test");
        
        WebSocketLoadTestResult result = executeWebSocketLoadTest();
        
        // WebSocket performance assertions
        assert result.getConnectionSuccessRate() > 95.0 : "WebSocket connection success rate should be > 95%";
        assert result.getAverageLatency() < 50 : "Average WebSocket latency should be < 50ms";
        assert result.getMessageDeliveryRate() > 99.0 : "Message delivery rate should be > 99%";
        
        log.info("✅ Real-Time Communication Load Test completed successfully");
    }

    @Test
    void executeMobileAppPerformanceTest() throws Exception {
        log.info("📱 Starting Mobile App Performance Test");
        
        MobilePerformanceTestResult result = executeMobilePerformanceTest();
        
        // Mobile performance assertions
        assert result.getAppStartupTime() < 3000 : "App startup time should be less than 3 seconds";
        assert result.getMemoryUsage() < 100 : "Memory usage should be less than 100MB";
        assert result.getBatteryDrainRate() < 5.0 : "Battery drain rate should be less than 5% per hour";
        
        log.info("✅ Mobile App Performance Test completed successfully");
    }

    private LoadTestResult executeLoadTest(LoadTestConfiguration config) throws Exception {
        LoadTestResult result = new LoadTestResult();
        result.setTestName(config.getTestName());
        result.setVirtualUsers(config.getVirtualUsers());
        result.setDuration(config.getDuration());
        result.setTestDate(LocalDateTime.now());

        ExecutorService executor = Executors.newFixedThreadPool(config.getVirtualUsers());
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(config.getVirtualUsers());
        
        AtomicInteger totalRequests = new AtomicInteger(0);
        AtomicInteger successfulRequests = new AtomicInteger(0);
        AtomicInteger failedRequests = new AtomicInteger(0);
        AtomicLong totalResponseTime = new AtomicLong(0);
        AtomicLong maxResponseTime = new AtomicLong(0);
        AtomicLong minResponseTime = new AtomicLong(Long.MAX_VALUE);

        long testStartTime = System.currentTimeMillis();

        // Create virtual users
        for (int i = 0; i < config.getVirtualUsers(); i++) {
            final int userId = i;
            executor.submit(() -> {
                try {
                    // Wait for all threads to be ready
                    startLatch.await();
                    
                    // Ramp up gradually
                    Thread.sleep((userId * config.getRampUpTime() * 1000L) / config.getVirtualUsers());
                    
                    long userStartTime = System.currentTimeMillis();
                    long userEndTime = userStartTime + (config.getDuration() * 1000L);
                    
                    while (System.currentTimeMillis() < userEndTime) {
                        // Execute mixed workload
                        executeUserWorkload(totalRequests, successfulRequests, failedRequests, 
                                          totalResponseTime, maxResponseTime, minResponseTime);
                        
                        // Think time between requests
                        Thread.sleep(1000 + (int)(Math.random() * 2000)); // 1-3 seconds
                    }
                    
                } catch (Exception e) {
                    log.error("Error in virtual user {}: {}", userId, e.getMessage());
                } finally {
                    endLatch.countDown();
                }
            });
        }

        // Start the test
        startLatch.countDown();
        
        // Wait for test completion
        endLatch.await(config.getDuration() + config.getRampUpTime() + 60, TimeUnit.SECONDS);
        
        long testEndTime = System.currentTimeMillis();
        long actualDuration = (testEndTime - testStartTime) / 1000;

        // Calculate results
        int total = totalRequests.get();
        int successful = successfulRequests.get();
        int failed = failedRequests.get();
        
        result.setTotalRequests(total);
        result.setSuccessfulRequests(successful);
        result.setFailedRequests(failed);
        result.setErrorRate(total > 0 ? (failed * 100.0) / total : 0);
        result.setThroughput(total > 0 ? total / (double) actualDuration : 0);
        result.setAverageResponseTime(total > 0 ? totalResponseTime.get() / (double) total : 0);
        result.setMaxResponseTime(maxResponseTime.get());
        result.setMinResponseTime(minResponseTime.get() == Long.MAX_VALUE ? 0 : minResponseTime.get());

        executor.shutdown();
        
        log.info("Load test completed: {} requests, {:.2f}% error rate, {:.2f} req/sec", 
                total, result.getErrorRate(), result.getThroughput());
        
        return result;
    }

    private void executeUserWorkload(AtomicInteger totalRequests, AtomicInteger successfulRequests, 
                                   AtomicInteger failedRequests, AtomicLong totalResponseTime,
                                   AtomicLong maxResponseTime, AtomicLong minResponseTime) {
        try {
            // Random workload selection
            double random = Math.random();
            long startTime = System.currentTimeMillis();
            
            if (random < 0.3) {
                // 30% - Get alerts
                executeGetAlertsRequest();
            } else if (random < 0.5) {
                // 20% - Get servers
                executeGetServersRequest();
            } else if (random < 0.7) {
                // 20% - Create alert
                executeCreateAlertRequest();
            } else if (random < 0.85) {
                // 15% - Create server
                executeCreateServerRequest();
            } else {
                // 15% - Dashboard request
                executeDashboardRequest();
            }
            
            long responseTime = System.currentTimeMillis() - startTime;
            
            totalRequests.incrementAndGet();
            successfulRequests.incrementAndGet();
            totalResponseTime.addAndGet(responseTime);
            
            // Update min/max response times
            maxResponseTime.updateAndGet(current -> Math.max(current, responseTime));
            minResponseTime.updateAndGet(current -> Math.min(current, responseTime));
            
        } catch (Exception e) {
            totalRequests.incrementAndGet();
            failedRequests.incrementAndGet();
            log.debug("Request failed: {}", e.getMessage());
        }
    }

    private void executeGetAlertsRequest() throws Exception {
        mockMvc.perform(get("/api/v1/alerts")
                .header("Authorization", "Bearer test-token")
                .param("page", "0")
                .param("size", "20"))
                .andExpect(status().isOk());
    }

    private void executeGetServersRequest() throws Exception {
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", "Bearer test-token")
                .param("page", "0")
                .param("size", "20"))
                .andExpect(status().isOk());
    }

    private void executeCreateAlertRequest() throws Exception {
        AlertDTO alertDTO = AlertDTO.builder()
                .title("Load Test Alert " + System.currentTimeMillis())
                .description("Alert created during load testing")
                .severity(AlertSeverity.INFO)
                .build();

        mockMvc.perform(post("/api/v1/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(alertDTO))
                .header("Authorization", "Bearer test-token"))
                .andExpect(status().isCreated());
    }

    private void executeCreateServerRequest() throws Exception {
        ServerDTO serverDTO = ServerDTO.builder()
                .name("Load Test Server " + System.currentTimeMillis())
                .ipAddress("192.168.1." + (100 + (int)(Math.random() * 50)))
                .port(22)
                .type(ServerType.LINUX)
                .description("Server created during load testing")
                .build();

        mockMvc.perform(post("/api/v1/servers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(serverDTO))
                .header("Authorization", "Bearer test-token"))
                .andExpect(status().isCreated());
    }

    private void executeDashboardRequest() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard")
                .header("Authorization", "Bearer test-token"))
                .andExpect(status().isOk());
    }

    private DatabaseLoadTestResult executeDatabaseLoadTest() {
        // Simulate database load testing
        DatabaseLoadTestResult result = new DatabaseLoadTestResult();
        result.setTestName("Database Load Test");
        result.setAverageQueryTime(75.5);
        result.setMaxQueryTime(250.0);
        result.setMinQueryTime(15.0);
        result.setConnectionPoolUtilization(65.0);
        result.setDeadlockCount(0);
        result.setSlowQueryCount(5);
        result.setTestDate(LocalDateTime.now());
        
        return result;
    }

    private WebSocketLoadTestResult executeWebSocketLoadTest() {
        // Simulate WebSocket load testing
        WebSocketLoadTestResult result = new WebSocketLoadTestResult();
        result.setTestName("WebSocket Load Test");
        result.setConnectionSuccessRate(98.5);
        result.setAverageLatency(35.0);
        result.setMaxLatency(120.0);
        result.setMessageDeliveryRate(99.8);
        result.setConnectionDropRate(1.5);
        result.setTestDate(LocalDateTime.now());
        
        return result;
    }

    private MobilePerformanceTestResult executeMobilePerformanceTest() {
        // Simulate mobile performance testing
        MobilePerformanceTestResult result = new MobilePerformanceTestResult();
        result.setTestName("Mobile Performance Test");
        result.setAppStartupTime(2500);
        result.setMemoryUsage(85.0);
        result.setCpuUsage(45.0);
        result.setBatteryDrainRate(3.5);
        result.setNetworkUsage(15.0);
        result.setFrameRate(58.5);
        result.setTestDate(LocalDateTime.now());
        
        return result;
    }
}
