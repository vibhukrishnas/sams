package com.sams;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * SAMS Java Backend Application
 * 
 * Enterprise-grade Server Alert Management System
 * - Real-time system monitoring
 * - Distributed architecture with service discovery
 * - Reactive programming with WebFlux
 * - Comprehensive observability
 */
@SpringBootApplication
@EnableDiscoveryClient
@EnableAsync
@EnableScheduling
@EnableTransactionManagement
public class SamsJavaBackendApplication {

    public static void main(String[] args) {
        System.out.println("🚀 Starting SAMS Java Backend Server...");
        System.out.println("⚡ Enterprise Spring Boot Application");
        System.out.println("🔧 Real-time System Monitoring");
        System.out.println("🌐 Distributed Architecture");
        
        SpringApplication.run(SamsJavaBackendApplication.class, args);
        
        System.out.println("✅ SAMS Java Backend Ready!");
        System.out.println("🔗 API Documentation: http://localhost:8080/swagger-ui.html");
        System.out.println("📊 Health Check: http://localhost:8080/actuator/health");
        System.out.println("📈 Metrics: http://localhost:8080/actuator/prometheus");
    }
}
