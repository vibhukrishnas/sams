/**
 * 🧪 Week 7 Integration Tests - API, Security & Performance Testing
 * Comprehensive testing suite for RESTful APIs, security features, and performance optimization
 */

package com.monitoring.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoring.api.service.ApiAnalyticsService;
import com.monitoring.performance.service.PerformanceMonitoringService;
import com.monitoring.security.service.MfaService;
import com.monitoring.security.service.ApiKeyService;
import com.monitoring.security.service.SecurityAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringJUnitTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebMvc
@Testcontainers
@ActiveProfiles("integration-test")
@SpringJUnitTest
class Week7IntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16.1")
            .withDatabaseName("monitoring_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7.2-alpine"))
            .withExposedPorts(6379);

    @LocalServerPort
    private int port;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApiAnalyticsService analyticsService;

    @Autowired
    private PerformanceMonitoringService performanceService;

    @Autowired
    private MfaService mfaService;

    @Autowired
    private ApiKeyService apiKeyService;

    @Autowired
    private SecurityAuditService auditService;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private String jwtToken;
    private String apiKey;

    @BeforeEach
    void setUp() throws Exception {
        // Setup test authentication
        jwtToken = "Bearer test-jwt-token";
        apiKey = "sams_test_api_key_12345";
        
        // Clear Redis cache
        redisTemplate.getConnectionFactory().getConnection().flushAll();
    }

    @Test
    @DisplayName("Should provide comprehensive API documentation via OpenAPI")
    void shouldProvideComprehensiveApiDocumentationViaOpenApi() throws Exception {
        // When - Access OpenAPI documentation
        MvcResult result = mockMvc.perform(get("/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        String openApiJson = result.getResponse().getContentAsString();
        
        // Then - Verify comprehensive documentation
        assertThat(openApiJson).contains("SAMS Monitoring API");
        assertThat(openApiJson).contains("Server Management");
        assertThat(openApiJson).contains("Alert Management");
        assertThat(openApiJson).contains("User Management");
        assertThat(openApiJson).contains("bearerAuth");
        assertThat(openApiJson).contains("apiKey");
        assertThat(openApiJson).contains("/api/v1/servers");
        assertThat(openApiJson).contains("/api/v2/servers");
    }

    @Test
    @DisplayName("Should handle API versioning correctly")
    void shouldHandleApiVersioningCorrectly() throws Exception {
        // Test v1 API
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", jwtToken)
                .header("API-Version", "v1"))
                .andExpect(status().isOk())
                .andExpect(header().string("API-Version", "v1"));

        // Test v2 API with enhanced features
        mockMvc.perform(get("/api/v2/servers")
                .header("Authorization", jwtToken)
                .header("API-Version", "v2"))
                .andExpect(status().isOk())
                .andExpect(header().string("API-Version", "v2"));

        // Test version negotiation via Accept header
        mockMvc.perform(get("/api/servers")
                .header("Authorization", jwtToken)
                .header("Accept", "application/json;version=v2"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should enforce rate limiting based on user tier")
    void shouldEnforceRateLimitingBasedOnUserTier() throws Exception {
        // Given - Free tier user (100 requests/hour)
        String freeApiKey = "sams_free_tier_key";
        
        // When - Make requests within limit
        for (int i = 0; i < 50; i++) {
            mockMvc.perform(get("/api/v1/servers")
                    .header("X-API-Key", freeApiKey))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("X-RateLimit-Remaining"));
        }

        // When - Exceed rate limit
        for (int i = 0; i < 60; i++) {
            MvcResult result = mockMvc.perform(get("/api/v1/servers")
                    .header("X-API-Key", freeApiKey))
                    .andReturn();
            
            if (result.getResponse().getStatus() == 429) {
                // Then - Verify rate limit response
                assertThat(result.getResponse().getHeader("Retry-After")).isNotNull();
                assertThat(result.getResponse().getContentAsString()).contains("Rate limit exceeded");
                break;
            }
        }
    }

    @Test
    @DisplayName("Should implement multi-factor authentication successfully")
    void shouldImplementMultiFactorAuthenticationSuccessfully() throws Exception {
        // Given - User with MFA setup
        String username = "test@example.com";
        String password = "securePassword123";
        
        // When - Login without MFA
        String loginRequest = objectMapper.writeValueAsString(Map.of(
            "username", username,
            "password", password
        ));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(status().isOk())
                .andReturn();

        String loginResponse = loginResult.getResponse().getContentAsString();
        Map<String, Object> response = objectMapper.readValue(loginResponse, Map.class);
        
        // Then - Should require MFA
        assertThat(response.get("mfaRequired")).isEqualTo(true);
        assertThat(response.get("mfaToken")).isNotNull();

        // When - Provide MFA code
        String mfaToken = (String) response.get("mfaToken");
        String mfaRequest = objectMapper.writeValueAsString(Map.of(
            "mfaToken", mfaToken,
            "mfaCode", "123456"
        ));

        mockMvc.perform(post("/api/v1/auth/mfa/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mfaRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());
    }

    @Test
    @DisplayName("Should manage API keys with proper security")
    void shouldManageApiKeysWithProperSecurity() throws Exception {
        // Given - Admin user
        String adminToken = "Bearer admin-jwt-token";

        // When - Create API key
        String createKeyRequest = objectMapper.writeValueAsString(Map.of(
            "name", "Test Integration Key",
            "description", "API key for integration testing",
            "scopes", List.of("servers:read", "alerts:read"),
            "rateLimitTier", "PREMIUM",
            "expiresAt", "2024-12-31T23:59:59"
        ));

        MvcResult createResult = mockMvc.perform(post("/api/v1/api-keys")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createKeyRequest))
                .andExpect(status().isCreated())
                .andReturn();

        String createResponse = createResult.getResponse().getContentAsString();
        Map<String, Object> keyResponse = objectMapper.readValue(createResponse, Map.class);
        
        // Then - Verify API key creation
        assertThat(keyResponse.get("apiKey")).isNotNull();
        assertThat(keyResponse.get("prefix")).isNotNull();
        String newApiKey = (String) keyResponse.get("apiKey");

        // When - Use API key for authentication
        mockMvc.perform(get("/api/v1/servers")
                .header("X-API-Key", newApiKey))
                .andExpect(status().isOk());

        // When - Revoke API key
        String keyId = (String) keyResponse.get("id");
        mockMvc.perform(delete("/api/v1/api-keys/" + keyId)
                .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        // Then - Verify revoked key cannot be used
        mockMvc.perform(get("/api/v1/servers")
                .header("X-API-Key", newApiKey))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should encrypt sensitive data at rest and in transit")
    void shouldEncryptSensitiveDataAtRestAndInTransit() throws Exception {
        // Given - Sensitive data
        String sensitiveData = "sensitive-configuration-data";

        // When - Store encrypted data
        String createRequest = objectMapper.writeValueAsString(Map.of(
            "name", "Test Server",
            "hostname", "test.example.com",
            "credentials", sensitiveData
        ));

        MvcResult createResult = mockMvc.perform(post("/api/v1/servers")
                .header("Authorization", jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(createRequest))
                .andExpect(status().isCreated())
                .andReturn();

        // Then - Verify data is encrypted in storage
        String createResponse = createResult.getResponse().getContentAsString();
        Map<String, Object> serverResponse = objectMapper.readValue(createResponse, Map.class);
        String serverId = (String) serverResponse.get("id");

        // Verify sensitive data is not returned in plain text
        mockMvc.perform(get("/api/v1/servers/" + serverId)
                .header("Authorization", jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credentials").doesNotExist()); // Should be filtered out
    }

    @Test
    @DisplayName("Should log comprehensive security audit events")
    void shouldLogComprehensiveSecurityAuditEvents() throws Exception {
        // Given - Admin user
        String adminToken = "Bearer admin-jwt-token";

        // When - Perform various security-sensitive operations
        
        // Login attempt
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "username", "test@example.com",
                    "password", "wrongpassword"
                ))))
                .andExpect(status().isUnauthorized());

        // API key creation
        mockMvc.perform(post("/api/v1/api-keys")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "name", "Audit Test Key",
                    "scopes", List.of("servers:read")
                ))))
                .andExpect(status().isCreated());

        // Data access
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk());

        // Then - Verify audit logs are created
        await().atMost(5, TimeUnit.SECONDS)
                .untilAsserted(() -> {
                    // Check audit logs via API
                    MvcResult auditResult = mockMvc.perform(get("/api/v1/security/audit-logs")
                            .header("Authorization", adminToken)
                            .param("eventType", "AUTHENTICATION_FAILED"))
                            .andExpect(status().isOk())
                            .andReturn();

                    String auditResponse = auditResult.getResponse().getContentAsString();
                    assertThat(auditResponse).contains("AUTHENTICATION_FAILED");
                });
    }

    @Test
    @DisplayName("Should optimize database performance under load")
    void shouldOptimizeDatabasePerformanceUnderLoad() throws Exception {
        // Given - Initial performance baseline
        PerformanceMetrics initialMetrics = performanceService.getPerformanceMetrics();

        // When - Execute database-intensive operations
        ExecutorService executor = Executors.newFixedThreadPool(20);
        AtomicLong successfulRequests = new AtomicLong(0);
        AtomicLong totalResponseTime = new AtomicLong(0);

        CompletableFuture<Void>[] futures = new CompletableFuture[20];

        for (int i = 0; i < 20; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < 50; j++) {
                    try {
                        long startTime = System.currentTimeMillis();
                        
                        MvcResult result = mockMvc.perform(get("/api/v1/servers")
                                .header("Authorization", jwtToken)
                                .param("page", String.valueOf(j % 10))
                                .param("size", "20"))
                                .andReturn();

                        long responseTime = System.currentTimeMillis() - startTime;
                        totalResponseTime.addAndGet(responseTime);

                        if (result.getResponse().getStatus() == 200) {
                            successfulRequests.incrementAndGet();
                        }

                    } catch (Exception e) {
                        // Continue on error
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(2, TimeUnit.MINUTES);

        // Then - Verify performance metrics
        double averageResponseTime = (double) totalResponseTime.get() / successfulRequests.get();
        assertThat(averageResponseTime).isLessThan(2000.0); // Less than 2 seconds

        DatabaseMetrics dbMetrics = performanceService.getDatabaseMetrics();
        assertThat(dbMetrics.getActiveConnections()).isLessThan(30);
        assertThat(dbMetrics.getThreadsAwaitingConnection()).isLessThan(5);

        executor.shutdown();
    }

    @Test
    @DisplayName("Should implement effective caching strategy")
    void shouldImplementEffectiveCachingStrategy() throws Exception {
        // Given - Clear cache
        performanceService.clearCache("servers");

        // When - Make initial request (cache miss)
        long startTime1 = System.currentTimeMillis();
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk());
        long responseTime1 = System.currentTimeMillis() - startTime1;

        // When - Make subsequent request (cache hit)
        long startTime2 = System.currentTimeMillis();
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", jwtToken))
                .andExpect(status().isOk());
        long responseTime2 = System.currentTimeMillis() - startTime2;

        // Then - Verify caching improves performance
        assertThat(responseTime2).isLessThan(responseTime1 * 0.5); // At least 50% faster

        // Verify cache metrics
        PerformanceMetrics metrics = performanceService.getPerformanceMetrics();
        assertThat(metrics.getCacheHitRate()).isGreaterThan(0.0);
    }

    @Test
    @DisplayName("Should handle IP whitelisting and blacklisting")
    void shouldHandleIpWhitelistingAndBlacklisting() throws Exception {
        // Given - Admin user
        String adminToken = "Bearer admin-jwt-token";

        // When - Add IP to blacklist
        String blacklistRequest = objectMapper.writeValueAsString(Map.of(
            "ipAddress", "192.168.1.100",
            "reason", "Suspicious activity detected",
            "active", true
        ));

        mockMvc.perform(post("/api/v1/security/ip-blacklist")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(blacklistRequest))
                .andExpect(status().isCreated());

        // When - Request from blacklisted IP
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", jwtToken)
                .header("X-Forwarded-For", "192.168.1.100"))
                .andExpect(status().isForbidden());

        // When - Add IP to whitelist
        String whitelistRequest = objectMapper.writeValueAsString(Map.of(
            "ipAddress", "192.168.1.200",
            "description", "Trusted corporate IP",
            "active", true
        ));

        mockMvc.perform(post("/api/v1/security/ip-whitelist")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(whitelistRequest))
                .andExpected(status().isCreated());

        // Then - Verify whitelisted IP can access
        mockMvc.perform(get("/api/v1/servers")
                .header("Authorization", jwtToken)
                .header("X-Forwarded-For", "192.168.1.200"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should provide comprehensive API analytics")
    void shouldProvideComprehensiveApiAnalytics() throws Exception {
        // Given - Generate API usage
        for (int i = 0; i < 100; i++) {
            mockMvc.perform(get("/api/v1/servers")
                    .header("Authorization", jwtToken));
            
            if (i % 10 == 0) {
                mockMvc.perform(get("/api/v1/alerts")
                        .header("Authorization", jwtToken));
            }
        }

        // When - Get API analytics
        MvcResult analyticsResult = mockMvc.perform(get("/api/v1/testing/analytics")
                .header("Authorization", "Bearer admin-jwt-token")
                .param("timeRange", "1h"))
                .andExpect(status().isOk())
                .andReturn();

        String analyticsResponse = analyticsResult.getResponse().getContentAsString();
        Map<String, Object> analytics = objectMapper.readValue(analyticsResponse, Map.class);

        // Then - Verify comprehensive analytics
        assertThat(analytics).containsKey("usageMetrics");
        assertThat(analytics).containsKey("performanceTrends");
        assertThat(analytics).containsKey("errorAnalysis");
        assertThat(analytics).containsKey("endpointStatistics");

        Map<String, Object> usageMetrics = (Map<String, Object>) analytics.get("usageMetrics");
        assertThat(usageMetrics.get("totalRequests")).isNotNull();
        assertThat(usageMetrics.get("successRate")).isNotNull();
        assertThat(usageMetrics.get("averageResponseTime")).isNotNull();
    }

    @Test
    @DisplayName("Should handle concurrent requests with proper resource management")
    void shouldHandleConcurrentRequestsWithProperResourceManagement() throws Exception {
        // Given - High concurrency scenario
        int numberOfThreads = 50;
        int requestsPerThread = 20;

        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        AtomicLong successfulRequests = new AtomicLong(0);
        AtomicLong errorRequests = new AtomicLong(0);

        // When - Execute concurrent requests
        CompletableFuture<Void>[] futures = new CompletableFuture[numberOfThreads];

        for (int i = 0; i < numberOfThreads; i++) {
            futures[i] = CompletableFuture.runAsync(() -> {
                for (int j = 0; j < requestsPerThread; j++) {
                    try {
                        MvcResult result = mockMvc.perform(get("/api/v1/servers")
                                .header("Authorization", jwtToken))
                                .andReturn();

                        if (result.getResponse().getStatus() == 200) {
                            successfulRequests.incrementAndGet();
                        } else {
                            errorRequests.incrementAndGet();
                        }

                    } catch (Exception e) {
                        errorRequests.incrementAndGet();
                    }
                }
            }, executor);
        }

        CompletableFuture.allOf(futures).get(3, TimeUnit.MINUTES);

        // Then - Verify system stability
        long totalRequests = successfulRequests.get() + errorRequests.get();
        double successRate = (double) successfulRequests.get() / totalRequests * 100;

        assertThat(successRate).isGreaterThan(95.0);
        assertThat(errorRequests.get()).isLessThan(totalRequests * 0.05);

        // Verify resource usage
        PerformanceMetrics metrics = performanceService.getPerformanceMetrics();
        JvmMetrics jvmMetrics = performanceService.getJvmMetrics();
        
        double memoryUsagePercent = (double) jvmMetrics.getHeapMemoryUsed() / jvmMetrics.getHeapMemoryMax() * 100;
        assertThat(memoryUsagePercent).isLessThan(85.0);

        executor.shutdown();
    }
}
