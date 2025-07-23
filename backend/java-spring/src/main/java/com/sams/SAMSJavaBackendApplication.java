package com.sams;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Value;

/**
 * SAMS Java Backend Application
 * Server & Alert Monitoring System with Spring Boot
 * 
 * Features:
 * - Real-time system monitoring using OSHI
 * - Database connection monitoring with JDBC
 * - Remote server monitoring (HTTP, SSH, Ping)
 * - RESTful APIs with CORS support
 * - JPA for data persistence
 * - Actuator for application metrics
 */
@SpringBootApplication
@EnableScheduling
public class SAMSJavaBackendApplication {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    public static void main(String[] args) {
        System.out.println("===============================================");
        System.out.println("🚀 SAMS Java Backend Starting...");
        System.out.println("🔧 Server & Alert Monitoring System");
        System.out.println("📊 Real-time monitoring with JDBC support");
        System.out.println("===============================================");
        
        SpringApplication.run(SAMSJavaBackendApplication.class, args);
        
        System.out.println("===============================================");
        System.out.println("✅ SAMS Java Backend Started Successfully!");
        System.out.println("🌐 API Server: http://localhost:5002/api");
        System.out.println("📈 Actuator: http://localhost:5002/actuator");
        System.out.println("🗄️ H2 Console: http://localhost:5002/h2-console");
        System.out.println("===============================================");
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                    .allowedOrigins(allowedOrigins.split(","))
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
