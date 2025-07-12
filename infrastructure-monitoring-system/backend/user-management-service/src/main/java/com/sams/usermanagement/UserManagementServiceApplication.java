package com.sams.usermanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * SAMS User Management Service Application
 * 
 * This microservice provides comprehensive user management functionality including:
 * - JWT-based authentication with refresh tokens
 * - Role-Based Access Control (RBAC) with Admin, Manager, User roles
 * - User registration, login, and profile management
 * - LDAP/Active Directory integration
 * - Password policies and security measures
 * - Comprehensive audit logging
 * 
 * @author SAMS Development Team
 * @version 1.0.0
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableTransactionManagement
public class UserManagementServiceApplication {

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("  SAMS User Management Service Starting");
        System.out.println("=================================================");
        System.out.println("  Version: 1.0.0");
        System.out.println("  Environment: " + System.getProperty("spring.profiles.active", "default"));
        System.out.println("  Port: " + System.getProperty("server.port", "8081"));
        System.out.println("=================================================");
        
        SpringApplication.run(UserManagementServiceApplication.class, args);
        
        System.out.println("=================================================");
        System.out.println("  SAMS User Management Service Started");
        System.out.println("  API Documentation: http://localhost:8081/swagger-ui.html");
        System.out.println("  Health Check: http://localhost:8081/actuator/health");
        System.out.println("  Metrics: http://localhost:8081/actuator/metrics");
        System.out.println("=================================================");
    }
}
