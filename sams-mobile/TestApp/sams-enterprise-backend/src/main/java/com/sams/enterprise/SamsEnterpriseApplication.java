package com.sams.enterprise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * SAMS Enterprise Backend Application
 * 
 * Enterprise-grade Server Alert Management System with:
 * - JWT Authentication & RBAC
 * - Real-time WebSocket communication
 * - Kafka message processing
 * - InfluxDB time-series data
 * - Third-party integrations (Slack, Teams, SMS, Email)
 * - LDAP integration
 * - Redis caching
 * - Comprehensive monitoring
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableTransactionManagement
public class SamsEnterpriseApplication {

    public static void main(String[] args) {
        SpringApplication.run(SamsEnterpriseApplication.class, args);
    }
}
