/**
 * 🌐 SAMS API Gateway - Enterprise RESTful API Framework
 * Comprehensive API gateway with versioning, rate limiting, and security
 */

package com.monitoring.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableScheduling
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

    /**
     * API Gateway routing configuration
     */
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // API v1 routes
                .route("api-v1-users", r -> r.path("/api/v1/users/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v1")
                                .addRequestHeader("X-Gateway", "SAMS-API-Gateway")
                                .circuitBreaker(config -> config.setName("user-service-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://user-management-service"))
                
                .route("api-v1-servers", r -> r.path("/api/v1/servers/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v1")
                                .circuitBreaker(config -> config.setName("server-service-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://server-management-service"))
                
                .route("api-v1-alerts", r -> r.path("/api/v1/alerts/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v1")
                                .circuitBreaker(config -> config.setName("alert-service-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://alert-processing-service"))
                
                .route("api-v1-metrics", r -> r.path("/api/v1/metrics/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v1")
                                .circuitBreaker(config -> config.setName("metrics-service-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://timeseries-service"))
                
                .route("api-v1-integrations", r -> r.path("/api/v1/integrations/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v1")
                                .circuitBreaker(config -> config.setName("integration-service-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://integration-service"))
                
                .route("api-v1-cloud", r -> r.path("/api/v1/cloud/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v1")
                                .circuitBreaker(config -> config.setName("cloud-service-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://cloud-integration-service"))
                
                // API v2 routes with enhanced features
                .route("api-v2-users", r -> r.path("/api/v2/users/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v2")
                                .addRequestHeader("X-Gateway", "SAMS-API-Gateway")
                                .circuitBreaker(config -> config.setName("user-service-v2-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://user-management-service-v2"))
                
                .route("api-v2-servers", r -> r.path("/api/v2/servers/**")
                        .filters(f -> f
                                .addRequestHeader("API-Version", "v2")
                                .circuitBreaker(config -> config.setName("server-service-v2-cb"))
                                .retry(config -> config.setRetries(3)))
                        .uri("lb://server-management-service-v2"))
                
                // WebSocket routes
                .route("websocket", r -> r.path("/ws/**")
                        .filters(f -> f
                                .addRequestHeader("X-Gateway", "SAMS-WebSocket-Gateway"))
                        .uri("lb://websocket-service"))
                
                // Health check routes
                .route("health", r -> r.path("/health/**")
                        .filters(f -> f
                                .addRequestHeader("X-Gateway", "SAMS-Health-Check"))
                        .uri("lb://health-service"))
                
                .build();
    }
}

/**
 * API versioning configuration
 */
package com.monitoring.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ApiVersioningConfig implements WebMvcConfigurer {

    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
                .favorParameter(true)
                .parameterName("version")
                .favorPathExtension(false)
                .ignoreAcceptHeader(false)
                .useRegisteredExtensionsOnly(false)
                .defaultContentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .mediaType("v1", org.springframework.http.MediaType.APPLICATION_JSON)
                .mediaType("v2", org.springframework.http.MediaType.APPLICATION_JSON);
    }

    @Bean
    public ApiVersionRequestMappingHandlerMapping apiVersionRequestMappingHandlerMapping() {
        return new ApiVersionRequestMappingHandlerMapping();
    }
}

/**
 * Custom request mapping handler for API versioning
 */
package com.monitoring.api.config;

import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.web.servlet.mvc.condition.RequestCondition;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;

public class ApiVersionRequestMappingHandlerMapping extends RequestMappingHandlerMapping {

    @Override
    protected RequestCondition<ApiVersionCondition> getCustomTypeCondition(Class<?> handlerType) {
        ApiVersion apiVersion = AnnotationUtils.findAnnotation(handlerType, ApiVersion.class);
        return createCondition(apiVersion);
    }

    @Override
    protected RequestCondition<ApiVersionCondition> getCustomMethodCondition(Method method) {
        ApiVersion apiVersion = AnnotationUtils.findAnnotation(method, ApiVersion.class);
        return createCondition(apiVersion);
    }

    private RequestCondition<ApiVersionCondition> createCondition(ApiVersion apiVersion) {
        return apiVersion == null ? null : new ApiVersionCondition(apiVersion.value());
    }
}

/**
 * API version annotation
 */
package com.monitoring.api.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiVersion {
    String value() default "v1";
}

/**
 * API version condition for request mapping
 */
package com.monitoring.api.config;

import org.springframework.web.servlet.mvc.condition.RequestCondition;

import javax.servlet.http.HttpServletRequest;

public class ApiVersionCondition implements RequestCondition<ApiVersionCondition> {

    private final String version;

    public ApiVersionCondition(String version) {
        this.version = version;
    }

    @Override
    public ApiVersionCondition combine(ApiVersionCondition other) {
        return new ApiVersionCondition(other.version);
    }

    @Override
    public ApiVersionCondition getMatchingCondition(HttpServletRequest request) {
        String requestVersion = extractVersionFromRequest(request);
        if (version.equals(requestVersion)) {
            return this;
        }
        return null;
    }

    @Override
    public int compareTo(ApiVersionCondition other, HttpServletRequest request) {
        return other.version.compareTo(this.version);
    }

    private String extractVersionFromRequest(HttpServletRequest request) {
        // Extract version from header
        String headerVersion = request.getHeader("API-Version");
        if (headerVersion != null) {
            return headerVersion;
        }

        // Extract version from path
        String path = request.getRequestURI();
        if (path.contains("/v1/")) {
            return "v1";
        } else if (path.contains("/v2/")) {
            return "v2";
        }

        // Extract version from parameter
        String paramVersion = request.getParameter("version");
        if (paramVersion != null) {
            return paramVersion;
        }

        // Default to v1
        return "v1";
    }

    public String getVersion() {
        return version;
    }
}

/**
 * Rate limiting configuration
 */
package com.monitoring.api.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitingConfig {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Bean
    public RateLimitingService rateLimitingService() {
        return new RateLimitingService(this);
    }

    public Bucket createBucket(String key, RateLimitTier tier) {
        return buckets.computeIfAbsent(key, k -> {
            Bandwidth bandwidth = getBandwidthForTier(tier);
            return Bucket4j.builder()
                    .addLimit(bandwidth)
                    .build();
        });
    }

    private Bandwidth getBandwidthForTier(RateLimitTier tier) {
        switch (tier) {
            case FREE:
                return Bandwidth.classic(100, Refill.intervally(100, Duration.ofHours(1)));
            case BASIC:
                return Bandwidth.classic(1000, Refill.intervally(1000, Duration.ofHours(1)));
            case PREMIUM:
                return Bandwidth.classic(10000, Refill.intervally(10000, Duration.ofHours(1)));
            case ENTERPRISE:
                return Bandwidth.classic(100000, Refill.intervally(100000, Duration.ofHours(1)));
            default:
                return Bandwidth.classic(100, Refill.intervally(100, Duration.ofHours(1)));
        }
    }

    public enum RateLimitTier {
        FREE, BASIC, PREMIUM, ENTERPRISE
    }
}

/**
 * Rate limiting service
 */
package com.monitoring.api.service;

import com.monitoring.api.config.RateLimitingConfig;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class RateLimitingService {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingService.class);

    private final RateLimitingConfig config;

    public RateLimitingService(RateLimitingConfig config) {
        this.config = config;
    }

    public RateLimitResult checkRateLimit(String clientId, RateLimitingConfig.RateLimitTier tier) {
        Bucket bucket = config.createBucket(clientId, tier);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            logger.debug("Rate limit check passed for client: {} (remaining: {})", 
                        clientId, probe.getRemainingTokens());
            return RateLimitResult.allowed(probe.getRemainingTokens());
        } else {
            logger.warn("Rate limit exceeded for client: {} (retry after: {}s)", 
                       clientId, probe.getNanosToWaitForRefill() / 1_000_000_000);
            return RateLimitResult.denied(probe.getNanosToWaitForRefill() / 1_000_000_000);
        }
    }

    public static class RateLimitResult {
        private final boolean allowed;
        private final long remainingTokens;
        private final long retryAfterSeconds;

        private RateLimitResult(boolean allowed, long remainingTokens, long retryAfterSeconds) {
            this.allowed = allowed;
            this.remainingTokens = remainingTokens;
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public static RateLimitResult allowed(long remainingTokens) {
            return new RateLimitResult(true, remainingTokens, 0);
        }

        public static RateLimitResult denied(long retryAfterSeconds) {
            return new RateLimitResult(false, 0, retryAfterSeconds);
        }

        // Getters
        public boolean isAllowed() { return allowed; }
        public long getRemainingTokens() { return remainingTokens; }
        public long getRetryAfterSeconds() { return retryAfterSeconds; }
    }
}

/**
 * Rate limiting filter
 */
package com.monitoring.api.filter;

import com.monitoring.api.config.RateLimitingConfig;
import com.monitoring.api.service.RateLimitingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Autowired
    private RateLimitingService rateLimitingService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {

        // Skip rate limiting for health checks and internal endpoints
        if (isExcludedPath(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientId = extractClientId(request);
        RateLimitingConfig.RateLimitTier tier = extractRateLimitTier(request);

        RateLimitingService.RateLimitResult result = rateLimitingService.checkRateLimit(clientId, tier);

        // Add rate limit headers
        response.setHeader("X-RateLimit-Limit", getTierLimit(tier));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemainingTokens()));
        response.setHeader("X-RateLimit-Reset", String.valueOf(System.currentTimeMillis() / 1000 + 3600));

        if (result.isAllowed()) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.getRetryAfterSeconds()));
            response.setContentType("application/json");
            response.getWriter().write(String.format(
                "{\"error\":\"Rate limit exceeded\",\"message\":\"Too many requests. Retry after %d seconds.\"}",
                result.getRetryAfterSeconds()));
        }
    }

    private boolean isExcludedPath(String path) {
        return path.startsWith("/health") || 
               path.startsWith("/actuator") || 
               path.startsWith("/swagger") ||
               path.startsWith("/api-docs");
    }

    private String extractClientId(HttpServletRequest request) {
        // Try API key first
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null) {
            return "api-key:" + apiKey;
        }

        // Try JWT token
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // Extract user ID from JWT token
            return "user:" + extractUserIdFromToken(authHeader.substring(7));
        }

        // Fall back to IP address
        return "ip:" + getClientIpAddress(request);
    }

    private RateLimitingConfig.RateLimitTier extractRateLimitTier(HttpServletRequest request) {
        // Extract tier from API key or user subscription
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null) {
            return getRateLimitTierForApiKey(apiKey);
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return getRateLimitTierForUser(extractUserIdFromToken(authHeader.substring(7)));
        }

        return RateLimitingConfig.RateLimitTier.FREE;
    }

    private String extractUserIdFromToken(String token) {
        // JWT token parsing logic would go here
        return "anonymous";
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private RateLimitingConfig.RateLimitTier getRateLimitTierForApiKey(String apiKey) {
        // API key tier lookup logic
        return RateLimitingConfig.RateLimitTier.BASIC;
    }

    private RateLimitingConfig.RateLimitTier getRateLimitTierForUser(String userId) {
        // User subscription tier lookup logic
        return RateLimitingConfig.RateLimitTier.PREMIUM;
    }

    private String getTierLimit(RateLimitingConfig.RateLimitTier tier) {
        switch (tier) {
            case FREE: return "100";
            case BASIC: return "1000";
            case PREMIUM: return "10000";
            case ENTERPRISE: return "100000";
            default: return "100";
        }
    }
}
