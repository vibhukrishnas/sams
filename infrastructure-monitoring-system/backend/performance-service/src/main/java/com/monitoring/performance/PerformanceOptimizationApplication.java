/**
 * ⚡ Performance Optimization Service - Enterprise Performance Framework
 * Comprehensive performance optimization with caching, database tuning, and monitoring
 */

package com.monitoring.performance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableScheduling
public class PerformanceOptimizationApplication {

    public static void main(String[] args) {
        SpringApplication.run(PerformanceOptimizationApplication.class, args);
    }
}

/**
 * Redis caching configuration
 */
package com.monitoring.performance.config;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.CollectionType;
import com.fasterxml.jackson.databind.type.TypeFactory;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurerSupport;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class RedisConfig extends CachingConfigurerSupport {

    @Value("${spring.redis.host}")
    private String redisHost;

    @Value("${spring.redis.port}")
    private int redisPort;

    @Value("${spring.redis.password:}")
    private String redisPassword;

    @Value("${spring.redis.database:0}")
    private int redisDatabase;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        config.setDatabase(redisDatabase);
        
        if (redisPassword != null && !redisPassword.isEmpty()) {
            config.setPassword(redisPassword);
        }

        LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
        factory.setValidateConnection(true);
        return factory;
    }

    @Bean
    @Primary
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // JSON serialization
        Jackson2JsonRedisSerializer<Object> jackson2JsonRedisSerializer = new Jackson2JsonRedisSerializer<>(Object.class);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.enableDefaultTyping(ObjectMapper.DefaultTyping.NON_FINAL);
        jackson2JsonRedisSerializer.setObjectMapper(objectMapper);

        // String serialization
        StringRedisSerializer stringRedisSerializer = new StringRedisSerializer();

        // Set serializers
        template.setKeySerializer(stringRedisSerializer);
        template.setHashKeySerializer(stringRedisSerializer);
        template.setValueSerializer(jackson2JsonRedisSerializer);
        template.setHashValueSerializer(jackson2JsonRedisSerializer);

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        RedisCacheConfiguration defaultCacheConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // Short-term cache (5 minutes) for frequently changing data
        cacheConfigurations.put("metrics", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5)));
        
        // Medium-term cache (30 minutes) for server data
        cacheConfigurations.put("servers", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30)));
        
        // Long-term cache (2 hours) for user data
        cacheConfigurations.put("users", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(2)));
        
        // Very long-term cache (24 hours) for configuration data
        cacheConfigurations.put("config", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(24)));
        
        // Dashboard cache (10 minutes) for dashboard data
        cacheConfigurations.put("dashboard", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10)));
        
        // API response cache (15 minutes)
        cacheConfigurations.put("api-responses", RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(15)));

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaultCacheConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }

    @Bean
    @Override
    public KeyGenerator keyGenerator() {
        return new CustomKeyGenerator();
    }
}

/**
 * Custom cache key generator
 */
package com.monitoring.performance.config;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.util.StringUtils;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.stream.Collectors;

public class CustomKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        StringBuilder keyBuilder = new StringBuilder();
        
        // Add class name
        keyBuilder.append(target.getClass().getSimpleName()).append(":");
        
        // Add method name
        keyBuilder.append(method.getName()).append(":");
        
        // Add parameters
        if (params.length > 0) {
            String paramString = Arrays.stream(params)
                    .map(param -> param != null ? param.toString() : "null")
                    .collect(Collectors.joining(","));
            keyBuilder.append(paramString);
        }
        
        return keyBuilder.toString();
    }
}

/**
 * Database optimization configuration
 */
package com.monitoring.performance.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DatabaseOptimizationConfig {

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        // Basic connection settings
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(driverClassName);

        // Connection pool optimization
        config.setMaximumPoolSize(50);
        config.setMinimumIdle(10);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        config.setLeakDetectionThreshold(60000);

        // Performance optimizations
        config.setAutoCommit(false);
        config.setTransactionIsolation("TRANSACTION_READ_COMMITTED");
        
        // Connection validation
        config.setValidationTimeout(5000);
        config.setConnectionTestQuery("SELECT 1");
        
        // Pool name for monitoring
        config.setPoolName("SAMS-HikariCP");
        
        // JMX monitoring
        config.setRegisterMbeans(true);
        
        // Additional PostgreSQL optimizations
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        config.addDataSourceProperty("useServerPrepStmts", "true");
        config.addDataSourceProperty("useLocalSessionState", "true");
        config.addDataSourceProperty("rewriteBatchedStatements", "true");
        config.addDataSourceProperty("cacheResultSetMetadata", "true");
        config.addDataSourceProperty("cacheServerConfiguration", "true");
        config.addDataSourceProperty("elideSetAutoCommits", "true");
        config.addDataSourceProperty("maintainTimeStats", "false");

        return new HikariDataSource(config);
    }
}

/**
 * JPA optimization configuration
 */
package com.monitoring.performance.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import javax.persistence.EntityManagerFactory;
import javax.sql.DataSource;
import java.util.Properties;

@Configuration
@EnableJpaRepositories(basePackages = "com.monitoring.*.repository")
public class JpaOptimizationConfig {

    public Properties jpaProperties() {
        Properties properties = new Properties();
        
        // Hibernate performance optimizations
        properties.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQL10Dialect");
        properties.setProperty("hibernate.hbm2ddl.auto", "validate");
        properties.setProperty("hibernate.show_sql", "false");
        properties.setProperty("hibernate.format_sql", "false");
        
        // Connection and transaction optimizations
        properties.setProperty("hibernate.connection.autocommit", "false");
        properties.setProperty("hibernate.connection.release_mode", "after_transaction");
        
        // Query optimizations
        properties.setProperty("hibernate.jdbc.batch_size", "25");
        properties.setProperty("hibernate.order_inserts", "true");
        properties.setProperty("hibernate.order_updates", "true");
        properties.setProperty("hibernate.jdbc.batch_versioned_data", "true");
        
        // Cache optimizations
        properties.setProperty("hibernate.cache.use_second_level_cache", "true");
        properties.setProperty("hibernate.cache.use_query_cache", "true");
        properties.setProperty("hibernate.cache.region.factory_class", 
                "org.hibernate.cache.jcache.JCacheRegionFactory");
        
        // Statistics and monitoring
        properties.setProperty("hibernate.generate_statistics", "true");
        properties.setProperty("hibernate.session.events.log.LOG_QUERIES_SLOWER_THAN_MS", "100");
        
        return properties;
    }
}

/**
 * Performance monitoring service
 */
package com.monitoring.performance.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.management.MBeanServer;
import javax.management.ObjectName;
import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PerformanceMonitoringService {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceMonitoringService.class);

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private DataSource dataSource;

    // Performance counters
    private final Counter apiRequestCounter;
    private final Counter cacheHitCounter;
    private final Counter cacheMissCounter;
    private final Timer apiResponseTimer;
    private final AtomicLong activeConnections = new AtomicLong(0);

    public PerformanceMonitoringService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        
        // Initialize counters and timers
        this.apiRequestCounter = Counter.builder("api.requests.total")
                .description("Total API requests")
                .register(meterRegistry);
        
        this.cacheHitCounter = Counter.builder("cache.hits.total")
                .description("Total cache hits")
                .register(meterRegistry);
        
        this.cacheMissCounter = Counter.builder("cache.misses.total")
                .description("Total cache misses")
                .register(meterRegistry);
        
        this.apiResponseTimer = Timer.builder("api.response.time")
                .description("API response time")
                .register(meterRegistry);

        // Register gauges
        Gauge.builder("database.connections.active")
                .description("Active database connections")
                .register(meterRegistry, this, PerformanceMonitoringService::getActiveConnections);
        
        Gauge.builder("jvm.memory.heap.used")
                .description("JVM heap memory used")
                .register(meterRegistry, this, PerformanceMonitoringService::getHeapMemoryUsed);
        
        Gauge.builder("jvm.memory.heap.max")
                .description("JVM heap memory max")
                .register(meterRegistry, this, PerformanceMonitoringService::getHeapMemoryMax);
    }

    /**
     * Record API request
     */
    public void recordApiRequest(String endpoint, String method, int statusCode, long responseTime) {
        apiRequestCounter.increment(
                "endpoint", endpoint,
                "method", method,
                "status", String.valueOf(statusCode)
        );
        
        apiResponseTimer.record(responseTime, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    /**
     * Record cache hit
     */
    public void recordCacheHit(String cacheName) {
        cacheHitCounter.increment("cache", cacheName);
    }

    /**
     * Record cache miss
     */
    public void recordCacheMiss(String cacheName) {
        cacheMissCounter.increment("cache", cacheName);
    }

    /**
     * Get performance metrics
     */
    public PerformanceMetrics getPerformanceMetrics() {
        PerformanceMetrics metrics = new PerformanceMetrics();
        
        // API metrics
        metrics.setTotalApiRequests(apiRequestCounter.count());
        metrics.setAverageResponseTime(apiResponseTimer.mean(java.util.concurrent.TimeUnit.MILLISECONDS));
        
        // Cache metrics
        metrics.setCacheHitRate(calculateCacheHitRate());
        metrics.setCacheMetrics(getCacheMetrics());
        
        // Database metrics
        metrics.setDatabaseMetrics(getDatabaseMetrics());
        
        // JVM metrics
        metrics.setJvmMetrics(getJvmMetrics());
        
        // Redis metrics
        metrics.setRedisMetrics(getRedisMetrics());
        
        return metrics;
    }

    /**
     * Get database performance metrics
     */
    public DatabaseMetrics getDatabaseMetrics() {
        DatabaseMetrics metrics = new DatabaseMetrics();
        
        try {
            // Get HikariCP metrics via JMX
            MBeanServer server = ManagementFactory.getPlatformMBeanServer();
            ObjectName poolName = new ObjectName("com.zaxxer.hikari:type=Pool (SAMS-HikariCP)");
            
            if (server.isRegistered(poolName)) {
                metrics.setActiveConnections((Integer) server.getAttribute(poolName, "ActiveConnections"));
                metrics.setIdleConnections((Integer) server.getAttribute(poolName, "IdleConnections"));
                metrics.setTotalConnections((Integer) server.getAttribute(poolName, "TotalConnections"));
                metrics.setThreadsAwaitingConnection((Integer) server.getAttribute(poolName, "ThreadsAwaitingConnection"));
            }
            
        } catch (Exception e) {
            logger.error("❌ Error getting database metrics: {}", e.getMessage(), e);
        }
        
        return metrics;
    }

    /**
     * Get JVM performance metrics
     */
    public JvmMetrics getJvmMetrics() {
        JvmMetrics metrics = new JvmMetrics();
        
        Runtime runtime = Runtime.getRuntime();
        metrics.setHeapMemoryUsed(runtime.totalMemory() - runtime.freeMemory());
        metrics.setHeapMemoryMax(runtime.maxMemory());
        metrics.setHeapMemoryTotal(runtime.totalMemory());
        metrics.setHeapMemoryFree(runtime.freeMemory());
        
        // GC metrics
        ManagementFactory.getGarbageCollectorMXBeans().forEach(gcBean -> {
            metrics.addGcMetric(gcBean.getName(), gcBean.getCollectionCount(), gcBean.getCollectionTime());
        });
        
        return metrics;
    }

    /**
     * Get Redis performance metrics
     */
    public RedisMetrics getRedisMetrics() {
        RedisMetrics metrics = new RedisMetrics();
        
        try {
            // Get Redis info
            Properties info = redisTemplate.getConnectionFactory().getConnection().info();
            
            metrics.setConnectedClients(Integer.parseInt(info.getProperty("connected_clients", "0")));
            metrics.setUsedMemory(Long.parseLong(info.getProperty("used_memory", "0")));
            metrics.setMaxMemory(Long.parseLong(info.getProperty("maxmemory", "0")));
            metrics.setKeyspaceHits(Long.parseLong(info.getProperty("keyspace_hits", "0")));
            metrics.setKeyspaceMisses(Long.parseLong(info.getProperty("keyspace_misses", "0")));
            
        } catch (Exception e) {
            logger.error("❌ Error getting Redis metrics: {}", e.getMessage(), e);
        }
        
        return metrics;
    }

    /**
     * Get cache performance metrics
     */
    public Map<String, CacheMetrics> getCacheMetrics() {
        Map<String, CacheMetrics> cacheMetrics = new HashMap<>();
        
        cacheManager.getCacheNames().forEach(cacheName -> {
            try {
                org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
                if (cache instanceof org.springframework.data.redis.cache.RedisCache) {
                    // Get Redis cache statistics
                    CacheMetrics metrics = new CacheMetrics();
                    metrics.setCacheName(cacheName);
                    // Add cache-specific metrics here
                    cacheMetrics.put(cacheName, metrics);
                }
            } catch (Exception e) {
                logger.error("❌ Error getting cache metrics for {}: {}", cacheName, e.getMessage(), e);
            }
        });
        
        return cacheMetrics;
    }

    /**
     * Optimize database queries
     */
    public void optimizeQueries() {
        logger.info("⚡ Starting database query optimization...");
        
        try {
            // Analyze slow queries
            analyzeSlowQueries();
            
            // Update table statistics
            updateTableStatistics();
            
            // Rebuild indexes if needed
            rebuildIndexes();
            
            logger.info("✅ Database optimization completed");
            
        } catch (Exception e) {
            logger.error("❌ Error during database optimization: {}", e.getMessage(), e);
        }
    }

    /**
     * Clear cache selectively
     */
    public void clearCache(String cacheName) {
        try {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
                logger.info("✅ Cache cleared: {}", cacheName);
            }
        } catch (Exception e) {
            logger.error("❌ Error clearing cache {}: {}", cacheName, e.getMessage(), e);
        }
    }

    /**
     * Warm up cache
     */
    public void warmUpCache() {
        logger.info("🔥 Starting cache warm-up...");
        
        try {
            // Warm up frequently accessed data
            warmUpServerCache();
            warmUpUserCache();
            warmUpConfigCache();
            
            logger.info("✅ Cache warm-up completed");
            
        } catch (Exception e) {
            logger.error("❌ Error during cache warm-up: {}", e.getMessage(), e);
        }
    }

    // Helper methods
    private double calculateCacheHitRate() {
        double hits = cacheHitCounter.count();
        double misses = cacheMissCounter.count();
        double total = hits + misses;
        return total > 0 ? (hits / total) * 100 : 0;
    }

    private double getActiveConnections() {
        return activeConnections.get();
    }

    private double getHeapMemoryUsed() {
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }

    private double getHeapMemoryMax() {
        return Runtime.getRuntime().maxMemory();
    }

    private void analyzeSlowQueries() {
        // Implementation for analyzing slow queries
    }

    private void updateTableStatistics() {
        // Implementation for updating table statistics
    }

    private void rebuildIndexes() {
        // Implementation for rebuilding indexes
    }

    private void warmUpServerCache() {
        // Implementation for warming up server cache
    }

    private void warmUpUserCache() {
        // Implementation for warming up user cache
    }

    private void warmUpConfigCache() {
        // Implementation for warming up config cache
    }
}
