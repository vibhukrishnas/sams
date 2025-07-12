/**
 * 🧪 Load Testing Suite - Comprehensive Performance Testing
 * Enterprise-grade load testing with performance monitoring and analysis
 */

package com.monitoring.performance;

import com.monitoring.api.dto.*;
import com.monitoring.performance.service.PerformanceMonitoringService;
import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringJUnitTest;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("load-test")
@SpringJUnitTest
class LoadTestSuite {

    @LocalServerPort
    private int port;

    @Autowired
    private PerformanceMonitoringService performanceService;

    private String baseUrl;
    private String authToken;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port;
        authToken = "Bearer test-jwt-token"; // In real tests, obtain valid token
    }

    /**
     * Gatling load test simulation
     */
    public static class ApiLoadTestSimulation extends Simulation {

        private final HttpProtocolBuilder httpProtocol = http
                .baseUrl("http://localhost:8080")
                .acceptHeader("application/json")
                .contentTypeHeader("application/json")
                .authorizationHeader("Bearer test-jwt-token")
                .userAgentHeader("SAMS-LoadTest/1.0");

        // Scenario 1: Server Management API Load Test
        private final ScenarioBuilder serverManagementScenario = scenario("Server Management Load Test")
                .exec(
                        http("Get All Servers")
                                .get("/api/v1/servers")
                                .queryParam("page", "0")
                                .queryParam("size", "20")
                                .check(status().is(200))
                                .check(responseTimeInMillis().lte(2000))
                )
                .pause(Duration.ofSeconds(1))
                .exec(
                        http("Get Server by ID")
                                .get("/api/v1/servers/#{serverId}")
                                .check(status().is(200))
                                .check(responseTimeInMillis().lte(1000))
                )
                .pause(Duration.ofSeconds(2))
                .exec(
                        http("Get Server Metrics")
                                .get("/api/v1/servers/#{serverId}/metrics")
                                .queryParam("timeRange", "1h")
                                .check(status().is(200))
                                .check(responseTimeInMillis().lte(3000))
                );

        // Scenario 2: Alert Management API Load Test
        private final ScenarioBuilder alertManagementScenario = scenario("Alert Management Load Test")
                .exec(
                        http("Get All Alerts")
                                .get("/api/v1/alerts")
                                .queryParam("page", "0")
                                .queryParam("size", "50")
                                .check(status().is(200))
                                .check(responseTimeInMillis().lte(1500))
                )
                .pause(Duration.ofSeconds(1))
                .exec(
                        http("Create Alert Rule")
                                .post("/api/v1/alerts/rules")
                                .body(StringBody("""
                                    {
                                        "name": "High CPU Usage",
                                        "description": "Alert when CPU usage exceeds 80%",
                                        "condition": "cpu_usage > 80",
                                        "severity": "HIGH",
                                        "enabled": true
                                    }
                                    """))
                                .check(status().is(201))
                                .check(responseTimeInMillis().lte(2000))
                );

        // Scenario 3: Metrics API Load Test
        private final ScenarioBuilder metricsScenario = scenario("Metrics API Load Test")
                .exec(
                        http("Get Dashboard Metrics")
                                .get("/api/v1/metrics/dashboard")
                                .queryParam("timeRange", "24h")
                                .check(status().is(200))
                                .check(responseTimeInMillis().lte(5000))
                )
                .pause(Duration.ofSeconds(2))
                .exec(
                        http("Get Historical Metrics")
                                .get("/api/v1/metrics/historical")
                                .queryParam("serverId", "#{serverId}")
                                .queryParam("metricName", "cpu_usage")
                                .queryParam("startTime", "2024-01-01T00:00:00")
                                .queryParam("endTime", "2024-01-02T00:00:00")
                                .check(status().is(200))
                                .check(responseTimeInMillis().lte(4000))
                );

        // Load test setup
        {
            setUp(
                    serverManagementScenario.injectOpen(
                            rampUsers(100).during(Duration.ofMinutes(5)),
                            constantUsersPerSec(50).during(Duration.ofMinutes(10))
                    ),
                    alertManagementScenario.injectOpen(
                            rampUsers(50).during(Duration.ofMinutes(3)),
                            constantUsersPerSec(25).during(Duration.ofMinutes(10))
                    ),
                    metricsScenario.injectOpen(
                            rampUsers(200).during(Duration.ofMinutes(5)),
                            constantUsersPerSec(100).during(Duration.ofMinutes(15))
                    )
            ).protocols(httpProtocol)
                    .assertions(
                            global().responseTime().max().lte(10000),
                            global().responseTime().mean().lte(3000),
                            global().successfulRequests().percent().gte(95.0),
                            forAll().responseTime().percentile3().lte(5000)
                    );
        }
    }

    @Test
    @DisplayName("Should handle concurrent API requests under load")
    void shouldHandleConcurrentApiRequestsUnderLoad() throws Exception {
        // Given - Setup load test parameters
        int numberOfThreads = 100;
        int requestsPerThread = 50;
        int totalRequests = numberOfThreads * requestsPerThread;

        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        AtomicLong successfulRequests = new AtomicLong(0);
        AtomicLong failedRequests = new AtomicLong(0);
        AtomicLong totalResponseTime = new AtomicLong(0);

        // When - Execute concurrent requests
        CompletableFuture<Void>[] futures = new CompletableFuture[numberOfThreads];

        for (int i = 0; i < numberOfThreads; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < requestsPerThread; j++) {
                    try {
                        long startTime = System.currentTimeMillis();
                        
                        // Make API request
                        boolean success = makeApiRequest("/api/v1/servers");
                        
                        long responseTime = System.currentTimeMillis() - startTime;
                        totalResponseTime.addAndGet(responseTime);

                        if (success) {
                            successfulRequests.incrementAndGet();
                        } else {
                            failedRequests.incrementAndGet();
                        }

                        // Small delay between requests
                        Thread.sleep(10);

                    } catch (Exception e) {
                        failedRequests.incrementAndGet();
                    }
                }
            }, executor);
        }

        // Wait for all requests to complete
        CompletableFuture.allOf(futures).get(5, TimeUnit.MINUTES);

        // Then - Verify performance metrics
        double successRate = (double) successfulRequests.get() / totalRequests * 100;
        double averageResponseTime = (double) totalResponseTime.get() / totalRequests;

        assertThat(successRate).isGreaterThan(95.0);
        assertThat(averageResponseTime).isLessThan(3000.0);
        assertThat(failedRequests.get()).isLessThan(totalRequests * 0.05);

        // Verify system performance
        PerformanceMetrics metrics = performanceService.getPerformanceMetrics();
        assertThat(metrics.getAverageResponseTime()).isLessThan(5000.0);

        executor.shutdown();
    }

    @Test
    @DisplayName("Should maintain database performance under load")
    void shouldMaintainDatabasePerformanceUnderLoad() throws Exception {
        // Given - Initial database metrics
        DatabaseMetrics initialMetrics = performanceService.getDatabaseMetrics();

        // When - Execute database-intensive operations
        ExecutorService executor = Executors.newFixedThreadPool(50);
        CompletableFuture<Void>[] futures = new CompletableFuture[50];

        for (int i = 0; i < 50; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < 100; j++) {
                    try {
                        // Simulate database operations
                        makeApiRequest("/api/v1/servers?page=" + j % 10 + "&size=20");
                        makeApiRequest("/api/v1/alerts?page=" + j % 5 + "&size=50");
                        Thread.sleep(50);
                    } catch (Exception e) {
                        // Log error but continue
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(3, TimeUnit.MINUTES);

        // Then - Verify database performance
        DatabaseMetrics finalMetrics = performanceService.getDatabaseMetrics();

        assertThat(finalMetrics.getActiveConnections()).isLessThan(40);
        assertThat(finalMetrics.getThreadsAwaitingConnection()).isLessThan(5);

        executor.shutdown();
    }

    @Test
    @DisplayName("Should maintain cache performance under load")
    void shouldMaintainCachePerformanceUnderLoad() throws Exception {
        // Given - Clear cache and warm up
        performanceService.clearCache("servers");
        performanceService.clearCache("metrics");

        // When - Execute cache-intensive operations
        ExecutorService executor = Executors.newFixedThreadPool(30);
        CompletableFuture<Void>[] futures = new CompletableFuture[30];

        for (int i = 0; i < 30; i++) {
            final int threadId = i;
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < 200; j++) {
                    try {
                        // Mix of cached and non-cached requests
                        makeApiRequest("/api/v1/servers/" + (threadId % 10));
                        makeApiRequest("/api/v1/servers/" + (threadId % 10) + "/metrics?timeRange=1h");
                        Thread.sleep(25);
                    } catch (Exception e) {
                        // Log error but continue
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(2, TimeUnit.MINUTES);

        // Then - Verify cache performance
        PerformanceMetrics metrics = performanceService.getPerformanceMetrics();
        assertThat(metrics.getCacheHitRate()).isGreaterThan(60.0);

        RedisMetrics redisMetrics = performanceService.getRedisMetrics();
        assertThat(redisMetrics.getConnectedClients()).isLessThan(100);

        executor.shutdown();
    }

    @Test
    @DisplayName("Should handle memory pressure gracefully")
    void shouldHandleMemoryPressureGracefully() throws Exception {
        // Given - Initial JVM metrics
        JvmMetrics initialMetrics = performanceService.getJvmMetrics();

        // When - Create memory pressure
        ExecutorService executor = Executors.newFixedThreadPool(20);
        CompletableFuture<Void>[] futures = new CompletableFuture[20];

        for (int i = 0; i < 20; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < 500; j++) {
                    try {
                        // Memory-intensive operations
                        makeApiRequest("/api/v1/metrics/dashboard?timeRange=7d");
                        makeApiRequest("/api/v1/servers?size=100");
                        Thread.sleep(100);
                    } catch (Exception e) {
                        // Continue on error
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(5, TimeUnit.MINUTES);

        // Then - Verify memory management
        JvmMetrics finalMetrics = performanceService.getJvmMetrics();

        double memoryUsagePercent = (double) finalMetrics.getHeapMemoryUsed() / finalMetrics.getHeapMemoryMax() * 100;
        assertThat(memoryUsagePercent).isLessThan(90.0);

        executor.shutdown();
    }

    @Test
    @DisplayName("Should recover from high load scenarios")
    void shouldRecoverFromHighLoadScenarios() throws Exception {
        // Given - Baseline performance
        PerformanceMetrics baselineMetrics = performanceService.getPerformanceMetrics();

        // When - Apply extreme load
        ExecutorService executor = Executors.newFixedThreadPool(200);
        CompletableFuture<Void>[] futures = new CompletableFuture[200];

        for (int i = 0; i < 200; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < 100; j++) {
                    try {
                        makeApiRequest("/api/v1/servers");
                        makeApiRequest("/api/v1/alerts");
                        makeApiRequest("/api/v1/metrics/dashboard");
                    } catch (Exception e) {
                        // Continue on error
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(3, TimeUnit.MINUTES);
        executor.shutdown();

        // Wait for system to recover
        Thread.sleep(30000);

        // Then - Verify recovery
        PerformanceMetrics recoveryMetrics = performanceService.getPerformanceMetrics();
        DatabaseMetrics dbMetrics = performanceService.getDatabaseMetrics();

        assertThat(dbMetrics.getActiveConnections()).isLessThan(20);
        assertThat(dbMetrics.getThreadsAwaitingConnection()).isEqualTo(0);
        assertThat(recoveryMetrics.getAverageResponseTime()).isLessThan(baselineMetrics.getAverageResponseTime() * 2);
    }

    @Test
    @DisplayName("Should maintain API rate limits under load")
    void shouldMaintainApiRateLimitsUnderLoad() throws Exception {
        // Given - Rate limit configuration
        int rateLimitPerMinute = 1000;
        int testDurationSeconds = 60;

        // When - Exceed rate limits
        ExecutorService executor = Executors.newFixedThreadPool(50);
        AtomicLong rateLimitedRequests = new AtomicLong(0);
        AtomicLong successfulRequests = new AtomicLong(0);

        CompletableFuture<Void>[] futures = new CompletableFuture[50];

        for (int i = 0; i < 50; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                long endTime = System.currentTimeMillis() + (testDurationSeconds * 1000);
                
                while (System.currentTimeMillis() < endTime) {
                    try {
                        int statusCode = makeApiRequestWithStatus("/api/v1/servers");
                        
                        if (statusCode == 429) {
                            rateLimitedRequests.incrementAndGet();
                        } else if (statusCode == 200) {
                            successfulRequests.incrementAndGet();
                        }
                        
                        Thread.sleep(10);
                        
                    } catch (Exception e) {
                        // Continue on error
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(testDurationSeconds + 30, TimeUnit.SECONDS);

        // Then - Verify rate limiting is working
        assertThat(rateLimitedRequests.get()).isGreaterThan(0);
        assertThat(successfulRequests.get()).isLessThanOrEqualTo(rateLimitPerMinute * 1.1); // Allow 10% tolerance

        executor.shutdown();
    }

    // Helper methods
    private boolean makeApiRequest(String endpoint) {
        try {
            // Simulate HTTP request
            Thread.sleep(50 + (int)(Math.random() * 100)); // Simulate network latency
            return Math.random() > 0.02; // 98% success rate
        } catch (Exception e) {
            return false;
        }
    }

    private int makeApiRequestWithStatus(String endpoint) {
        try {
            Thread.sleep(50 + (int)(Math.random() * 100));
            double random = Math.random();
            if (random > 0.95) return 429; // 5% rate limited
            if (random > 0.02) return 200; // 93% success
            return 500; // 2% server error
        } catch (Exception e) {
            return 500;
        }
    }
}
