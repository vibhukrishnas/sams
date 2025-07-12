package com.sams.monitoring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;

/**
 * SAMS Server Monitoring Agent - POC Application
 * 
 * This is a proof of concept for the SAMS infrastructure monitoring system.
 * It demonstrates basic server monitoring capabilities using Spring Boot.
 * 
 * Features:
 * - Real-time system metrics collection (CPU, Memory, Disk, Network)
 * - REST API endpoints for metrics retrieval
 * - WebSocket support for real-time data streaming
 * - Basic security configuration
 * - Health check endpoints
 * 
 * @author SAMS Development Team
 * @version 1.0.0
 */
@SpringBootApplication
@EnableScheduling
@EnableWebSocket
public class ServerMonitoringAgentApplication {

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("  SAMS Server Monitoring Agent - POC Starting");
        System.out.println("=================================================");
        System.out.println("  Version: 1.0.0");
        System.out.println("  Environment: Development");
        System.out.println("  Port: 8080");
        System.out.println("=================================================");
        
        SpringApplication.run(ServerMonitoringAgentApplication.class, args);
        
        System.out.println("=================================================");
        System.out.println("  SAMS Server Monitoring Agent - POC Started");
        System.out.println("  Access URLs:");
        System.out.println("  - API: http://localhost:8080/api/v1/metrics");
        System.out.println("  - Health: http://localhost:8080/actuator/health");
        System.out.println("  - WebSocket: ws://localhost:8080/ws/metrics");
        System.out.println("=================================================");
    }
}
