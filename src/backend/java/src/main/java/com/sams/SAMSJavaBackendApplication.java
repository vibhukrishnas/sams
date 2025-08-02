package com.sams;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * SAMS Java Backend Application
 * Server and Application Monitoring System
 */
@SpringBootApplication
@EnableScheduling
@EnableTransactionManagement
public class SAMSJavaBackendApplication {

    public static void main(String[] args) {
        System.out.println("🚀 Starting SAMS Java Backend...");
        SpringApplication.run(SAMSJavaBackendApplication.class, args);
        System.out.println("✅ SAMS Java Backend Started Successfully!");
        System.out.println("📊 API Documentation: http://localhost:5002/swagger-ui.html");
        System.out.println("🔍 Health Check: http://localhost:5002/actuator/health");
    }
}
