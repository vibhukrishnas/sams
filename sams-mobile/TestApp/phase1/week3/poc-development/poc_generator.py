#!/usr/bin/env python3
"""
SAMS POC Development Generator
Generates 4 critical proof of concept applications with working code
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SAMSPOCGenerator:
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.output_dir = self.base_dir / "poc_output"
        self.output_dir.mkdir(exist_ok=True)
        self.pocs = {}
        
    def generate_monitoring_agent_poc(self):
        """Generate POC 1: Basic server monitoring agent (Java + Spring Boot)"""
        
        poc_dir = self.output_dir / "poc1-monitoring-agent"
        poc_dir.mkdir(exist_ok=True)
        
        # Maven pom.xml for monitoring agent
        pom_xml = """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.sams.poc</groupId>
    <artifactId>monitoring-agent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>
    
    <name>SAMS Monitoring Agent POC</name>
    <description>Proof of concept for server monitoring agent</description>
    
    <properties>
        <java.version>17</java.version>
        <micrometer.version>1.12.0</micrometer.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
            <version>${micrometer.version}</version>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.apache.httpcomponents.client5</groupId>
            <artifactId>httpclient5</artifactId>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>"""
        
        # Main Application class
        main_app = """package com.sams.poc.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MonitoringAgentApplication {
    public static void main(String[] args) {
        SpringApplication.run(MonitoringAgentApplication.class, args);
    }
}"""
        
        # System Metrics Collector
        metrics_collector = """package com.sams.poc.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class SystemMetricsCollector {
    
    private static final Logger logger = LoggerFactory.getLogger(SystemMetricsCollector.class);
    
    @Value("${sams.server.url:http://localhost:8080}")
    private String serverUrl;
    
    @Value("${sams.agent.id:agent-001}")
    private String agentId;
    
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final OperatingSystemMXBean osBean;
    private final MemoryMXBean memoryBean;
    
    public SystemMetricsCollector() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.osBean = ManagementFactory.getOperatingSystemMXBean();
        this.memoryBean = ManagementFactory.getMemoryMXBean();
    }
    
    @Scheduled(fixedRate = 15000) // Every 15 seconds
    public void collectAndSendMetrics() {
        try {
            Map<String, Object> metrics = collectSystemMetrics();
            sendMetricsToServer(metrics);
            logger.info("Metrics collected and sent successfully");
        } catch (Exception e) {
            logger.error("Failed to collect or send metrics", e);
        }
    }
    
    private Map<String, Object> collectSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Basic system info
        metrics.put("timestamp", Instant.now().toString());
        metrics.put("agentId", agentId);
        
        // CPU metrics
        double cpuUsage = osBean.getProcessCpuLoad() * 100;
        metrics.put("cpuUsage", Math.max(0, cpuUsage)); // Ensure non-negative
        metrics.put("availableProcessors", osBean.getAvailableProcessors());
        
        // Memory metrics
        long totalMemory = memoryBean.getHeapMemoryUsage().getMax();
        long usedMemory = memoryBean.getHeapMemoryUsage().getUsed();
        double memoryUsage = totalMemory > 0 ? (double) usedMemory / totalMemory * 100 : 0;
        
        metrics.put("memoryUsage", memoryUsage);
        metrics.put("totalMemory", totalMemory);
        metrics.put("usedMemory", usedMemory);
        metrics.put("freeMemory", totalMemory - usedMemory);
        
        // System load
        double systemLoad = osBean.getSystemLoadAverage();
        if (systemLoad >= 0) {
            metrics.put("systemLoad", systemLoad);
        }
        
        // JVM metrics
        Runtime runtime = Runtime.getRuntime();
        metrics.put("jvmTotalMemory", runtime.totalMemory());
        metrics.put("jvmFreeMemory", runtime.freeMemory());
        metrics.put("jvmMaxMemory", runtime.maxMemory());
        
        return metrics;
    }
    
    private void sendMetricsToServer(Map<String, Object> metrics) throws IOException, InterruptedException {
        String jsonPayload = objectMapper.writeValueAsString(metrics);
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(serverUrl + "/api/v1/metrics"))
                .header("Content-Type", "application/json")
                .header("User-Agent", "SAMS-Agent/" + agentId)
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();
        
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            logger.debug("Metrics sent successfully. Response: {}", response.body());
        } else {
            logger.warn("Failed to send metrics. Status: {}, Response: {}", 
                       response.statusCode(), response.body());
        }
    }
    
    public Map<String, Object> getCurrentMetrics() {
        return collectSystemMetrics();
    }
}"""
        
        # REST Controller for agent API
        agent_controller = """package com.sams.poc.agent.controller;

import com.sams.poc.agent.service.SystemMetricsCollector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {
    
    @Autowired
    private SystemMetricsCollector metricsCollector;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());
        health.put("version", "1.0.0-POC");
        return ResponseEntity.ok(health);
    }
    
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getCurrentMetrics() {
        try {
            Map<String, Object> metrics = metricsCollector.getCurrentMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to collect metrics");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    @PostMapping("/config")
    public ResponseEntity<Map<String, String>> updateConfig(@RequestBody Map<String, Object> config) {
        // POC: Simple config update acknowledgment
        Map<String, String> response = new HashMap<>();
        response.put("status", "Config update received");
        response.put("timestamp", String.valueOf(System.currentTimeMillis()));
        return ResponseEntity.ok(response);
    }
}"""
        
        # Application properties
        app_properties = """# SAMS Monitoring Agent POC Configuration
server.port=8090
spring.application.name=sams-monitoring-agent

# SAMS Server Configuration
sams.server.url=http://localhost:8080
sams.agent.id=agent-poc-001

# Actuator Configuration
management.endpoints.web.exposure.include=health,metrics,prometheus,info
management.endpoint.health.show-details=always
management.metrics.export.prometheus.enabled=true

# Logging Configuration
logging.level.com.sams.poc=DEBUG
logging.level.org.springframework.web=INFO
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n
"""
        
        # Test class
        test_class = """package com.sams.poc.agent.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "sams.server.url=http://localhost:8080",
    "sams.agent.id=test-agent"
})
class SystemMetricsCollectorTest {
    
    @Autowired
    private SystemMetricsCollector metricsCollector;
    
    @Test
    void testMetricsCollection() {
        Map<String, Object> metrics = metricsCollector.getCurrentMetrics();
        
        assertNotNull(metrics);
        assertTrue(metrics.containsKey("timestamp"));
        assertTrue(metrics.containsKey("agentId"));
        assertTrue(metrics.containsKey("cpuUsage"));
        assertTrue(metrics.containsKey("memoryUsage"));
        
        // Verify metric values are reasonable
        Double cpuUsage = (Double) metrics.get("cpuUsage");
        assertNotNull(cpuUsage);
        assertTrue(cpuUsage >= 0 && cpuUsage <= 100);
        
        Double memoryUsage = (Double) metrics.get("memoryUsage");
        assertNotNull(memoryUsage);
        assertTrue(memoryUsage >= 0 && memoryUsage <= 100);
    }
    
    @Test
    void testAgentIdConfiguration() {
        Map<String, Object> metrics = metricsCollector.getCurrentMetrics();
        assertEquals("test-agent", metrics.get("agentId"));
    }
}"""
        
        # Create directory structure and save files
        src_main_java = poc_dir / "src" / "main" / "java" / "com" / "sams" / "poc" / "agent"
        src_main_resources = poc_dir / "src" / "main" / "resources"
        src_test_java = poc_dir / "src" / "test" / "java" / "com" / "sams" / "poc" / "agent"
        
        for dir_path in [src_main_java, src_main_resources, src_test_java]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Create service and controller directories
        (src_main_java / "service").mkdir(exist_ok=True)
        (src_main_java / "controller").mkdir(exist_ok=True)
        (src_test_java / "service").mkdir(exist_ok=True)
        
        # Save all files
        with open(poc_dir / "pom.xml", "w") as f:
            f.write(pom_xml)
        
        with open(src_main_java / "MonitoringAgentApplication.java", "w") as f:
            f.write(main_app)
        
        with open(src_main_java / "service" / "SystemMetricsCollector.java", "w") as f:
            f.write(metrics_collector)
        
        with open(src_main_java / "controller" / "AgentController.java", "w") as f:
            f.write(agent_controller)
        
        with open(src_main_resources / "application.properties", "w") as f:
            f.write(app_properties)
        
        with open(src_test_java / "service" / "SystemMetricsCollectorTest.java", "w") as f:
            f.write(test_class)
        
        # Create README for POC
        readme = """# SAMS Monitoring Agent POC

## Overview
This POC demonstrates a basic server monitoring agent that collects system metrics and sends them to a SAMS server.

## Features
- System metrics collection (CPU, memory, load)
- Automatic metric transmission every 15 seconds
- REST API for health checks and manual metric retrieval
- Prometheus metrics export
- Configurable server endpoint

## Running the POC
```bash
mvn spring-boot:run
```

## Testing
```bash
mvn test
```

## API Endpoints
- GET /api/v1/agent/health - Agent health check
- GET /api/v1/agent/metrics - Current system metrics
- POST /api/v1/agent/config - Update agent configuration
- GET /actuator/prometheus - Prometheus metrics

## Configuration
Edit `application.properties` to configure:
- `sams.server.url` - SAMS server endpoint
- `sams.agent.id` - Unique agent identifier
"""
        
        with open(poc_dir / "README.md", "w") as f:
            f.write(readme)
        
        return {
            "name": "Monitoring Agent POC",
            "directory": str(poc_dir),
            "description": "Java Spring Boot monitoring agent that collects and transmits system metrics",
            "features": [
                "System metrics collection",
                "Automatic transmission",
                "REST API",
                "Prometheus integration",
                "Health checks"
            ],
            "test_coverage": "Unit tests for metrics collection and configuration"
        }

    def generate_websocket_poc(self):
        """Generate POC 2: Real-time WebSocket communication prototype"""

        poc_dir = self.output_dir / "poc2-websocket-communication"
        poc_dir.mkdir(exist_ok=True)

        # Package.json for WebSocket server
        package_json = {
            "name": "sams-websocket-poc",
            "version": "1.0.0",
            "description": "SAMS WebSocket communication POC",
            "main": "server.js",
            "scripts": {
                "start": "node server.js",
                "dev": "nodemon server.js",
                "test": "jest",
                "test:watch": "jest --watch"
            },
            "dependencies": {
                "express": "^4.18.2",
                "socket.io": "^4.7.4",
                "cors": "^2.8.5",
                "uuid": "^9.0.1",
                "redis": "^4.6.10"
            },
            "devDependencies": {
                "nodemon": "^3.0.2",
                "jest": "^29.7.0",
                "socket.io-client": "^4.7.4",
                "supertest": "^6.3.3"
            },
            "engines": {
                "node": ">=18.0.0"
            }
        }

        # WebSocket Server
        websocket_server = """const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const redis = require('redis');

class WebSocketServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: ["http://localhost:3000", "http://localhost:3001"],
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.connections = new Map();
        this.rooms = new Map();
        this.messageQueue = [];

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.setupRedis();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'UP',
                timestamp: new Date().toISOString(),
                connections: this.connections.size,
                rooms: this.rooms.size,
                version: '1.0.0-POC'
            });
        });

        // Get connection statistics
        this.app.get('/api/stats', (req, res) => {
            const stats = {
                totalConnections: this.connections.size,
                activeRooms: this.rooms.size,
                messageQueueSize: this.messageQueue.length,
                connectionsByRoom: {}
            };

            this.rooms.forEach((clients, room) => {
                stats.connectionsByRoom[room] = clients.size;
            });

            res.json(stats);
        });

        // Broadcast message to room
        this.app.post('/api/broadcast/:room', (req, res) => {
            const { room } = req.params;
            const { message, type = 'broadcast' } = req.body;

            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }

            const messageData = {
                id: uuidv4(),
                type,
                message,
                timestamp: new Date().toISOString(),
                room
            };

            this.broadcastToRoom(room, 'message', messageData);
            this.messageQueue.push(messageData);

            res.json({ success: true, messageId: messageData.id });
        });

        // Send alert to specific user
        this.app.post('/api/alert/:userId', (req, res) => {
            const { userId } = req.params;
            const { alert, severity = 'medium' } = req.body;

            if (!alert) {
                return res.status(400).json({ error: 'Alert is required' });
            }

            const alertData = {
                id: uuidv4(),
                type: 'alert',
                alert,
                severity,
                timestamp: new Date().toISOString(),
                userId
            };

            this.sendToUser(userId, 'alert', alertData);

            res.json({ success: true, alertId: alertData.id });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Store connection info
            this.connections.set(socket.id, {
                id: socket.id,
                connectedAt: new Date(),
                userId: null,
                rooms: new Set()
            });

            // Handle user authentication
            socket.on('authenticate', (data) => {
                const { userId, userRole } = data;
                const connection = this.connections.get(socket.id);
                if (connection) {
                    connection.userId = userId;
                    connection.userRole = userRole;
                    console.log(`User authenticated: ${userId} (${userRole})`);

                    socket.emit('authenticated', {
                        success: true,
                        userId,
                        socketId: socket.id
                    });
                }
            });

            // Handle room joining
            socket.on('join-room', (data) => {
                const { room } = data;
                socket.join(room);

                const connection = this.connections.get(socket.id);
                if (connection) {
                    connection.rooms.add(room);
                }

                if (!this.rooms.has(room)) {
                    this.rooms.set(room, new Set());
                }
                this.rooms.get(room).add(socket.id);

                console.log(`Client ${socket.id} joined room: ${room}`);

                socket.emit('room-joined', { room, success: true });
                socket.to(room).emit('user-joined', {
                    socketId: socket.id,
                    userId: connection?.userId,
                    room
                });
            });

            // Handle room leaving
            socket.on('leave-room', (data) => {
                const { room } = data;
                socket.leave(room);

                const connection = this.connections.get(socket.id);
                if (connection) {
                    connection.rooms.delete(room);
                }

                if (this.rooms.has(room)) {
                    this.rooms.get(room).delete(socket.id);
                    if (this.rooms.get(room).size === 0) {
                        this.rooms.delete(room);
                    }
                }

                console.log(`Client ${socket.id} left room: ${room}`);

                socket.emit('room-left', { room, success: true });
                socket.to(room).emit('user-left', {
                    socketId: socket.id,
                    userId: connection?.userId,
                    room
                });
            });

            // Handle real-time metrics
            socket.on('metrics-update', (data) => {
                const { serverId, metrics } = data;
                const enrichedMetrics = {
                    ...metrics,
                    serverId,
                    timestamp: new Date().toISOString(),
                    socketId: socket.id
                };

                // Broadcast to monitoring room
                this.broadcastToRoom('monitoring', 'metrics-update', enrichedMetrics);
            });

            // Handle alert acknowledgment
            socket.on('alert-ack', (data) => {
                const { alertId, userId } = data;
                const ackData = {
                    alertId,
                    userId,
                    acknowledgedAt: new Date().toISOString(),
                    socketId: socket.id
                };

                // Broadcast acknowledgment to alert room
                this.broadcastToRoom('alerts', 'alert-acknowledged', ackData);
            });

            // Handle ping/pong for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: new Date().toISOString() });
            });

            // Handle disconnection
            socket.on('disconnect', (reason) => {
                console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);

                const connection = this.connections.get(socket.id);
                if (connection) {
                    // Remove from all rooms
                    connection.rooms.forEach(room => {
                        if (this.rooms.has(room)) {
                            this.rooms.get(room).delete(socket.id);
                            if (this.rooms.get(room).size === 0) {
                                this.rooms.delete(room);
                            }
                        }

                        socket.to(room).emit('user-left', {
                            socketId: socket.id,
                            userId: connection.userId,
                            room
                        });
                    });
                }

                this.connections.delete(socket.id);
            });
        });
    }

    setupRedis() {
        // POC: Simple in-memory storage, but structure for Redis
        this.redisClient = null; // Would be redis.createClient() in production
        console.log('Redis setup (POC: using in-memory storage)');
    }

    broadcastToRoom(room, event, data) {
        this.io.to(room).emit(event, data);
        console.log(`Broadcasted ${event} to room ${room}:`, data);
    }

    sendToUser(userId, event, data) {
        // Find socket by userId
        for (const [socketId, connection] of this.connections) {
            if (connection.userId === userId) {
                this.io.to(socketId).emit(event, data);
                console.log(`Sent ${event} to user ${userId}:`, data);
                return true;
            }
        }
        console.log(`User ${userId} not found for event ${event}`);
        return false;
    }

    start(port = 3002) {
        this.server.listen(port, () => {
            console.log(`SAMS WebSocket Server running on port ${port}`);
            console.log(`Health check: http://localhost:${port}/health`);
            console.log(`Test client: http://localhost:${port}/test.html`);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new WebSocketServer();
    server.start(process.env.PORT || 3002);
}

module.exports = WebSocketServer;"""

        # Test HTML client
        test_client = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SAMS WebSocket POC Test Client</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 3px; }
        .connected { background-color: #d4edda; color: #155724; }
        .disconnected { background-color: #f8d7da; color: #721c24; }
        button { padding: 8px 16px; margin: 5px; cursor: pointer; }
        input, select { padding: 5px; margin: 5px; }
        #messages { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9; }
        .message { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; }
        .alert { border-left-color: #dc3545; background: #fff5f5; }
        .metrics { border-left-color: #28a745; background: #f5fff5; }
    </style>
</head>
<body>
    <div class="container">
        <h1>SAMS WebSocket POC Test Client</h1>

        <div class="section">
            <h3>Connection Status</h3>
            <div id="status" class="status disconnected">Disconnected</div>
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()">Disconnect</button>
        </div>

        <div class="section">
            <h3>Authentication</h3>
            <input type="text" id="userId" placeholder="User ID" value="test-user">
            <select id="userRole">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
            </select>
            <button onclick="authenticate()">Authenticate</button>
        </div>

        <div class="section">
            <h3>Room Management</h3>
            <input type="text" id="roomName" placeholder="Room name" value="monitoring">
            <button onclick="joinRoom()">Join Room</button>
            <button onclick="leaveRoom()">Leave Room</button>
        </div>

        <div class="section">
            <h3>Send Test Data</h3>
            <button onclick="sendMetrics()">Send Metrics</button>
            <button onclick="sendAlert()">Send Alert</button>
            <button onclick="sendPing()">Send Ping</button>
        </div>

        <div class="section">
            <h3>Messages</h3>
            <div id="messages"></div>
            <button onclick="clearMessages()">Clear Messages</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        let socket = null;

        function connect() {
            socket = io('http://localhost:3002');

            socket.on('connect', () => {
                updateStatus('Connected', true);
                addMessage('Connected to server', 'info');
            });

            socket.on('disconnect', () => {
                updateStatus('Disconnected', false);
                addMessage('Disconnected from server', 'info');
            });

            socket.on('authenticated', (data) => {
                addMessage(`Authenticated as ${data.userId}`, 'info');
            });

            socket.on('room-joined', (data) => {
                addMessage(`Joined room: ${data.room}`, 'info');
            });

            socket.on('room-left', (data) => {
                addMessage(`Left room: ${data.room}`, 'info');
            });

            socket.on('message', (data) => {
                addMessage(`Message: ${data.message}`, 'message');
            });

            socket.on('alert', (data) => {
                addMessage(`Alert [${data.severity}]: ${data.alert}`, 'alert');
            });

            socket.on('metrics-update', (data) => {
                addMessage(`Metrics from ${data.serverId}: CPU ${data.cpuUsage}%`, 'metrics');
            });

            socket.on('pong', (data) => {
                addMessage(`Pong received at ${data.timestamp}`, 'info');
            });

            socket.on('user-joined', (data) => {
                addMessage(`User ${data.userId} joined room ${data.room}`, 'info');
            });

            socket.on('user-left', (data) => {
                addMessage(`User ${data.userId} left room ${data.room}`, 'info');
            });
        }

        function disconnect() {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        }

        function authenticate() {
            if (!socket) return;
            const userId = document.getElementById('userId').value;
            const userRole = document.getElementById('userRole').value;
            socket.emit('authenticate', { userId, userRole });
        }

        function joinRoom() {
            if (!socket) return;
            const room = document.getElementById('roomName').value;
            socket.emit('join-room', { room });
        }

        function leaveRoom() {
            if (!socket) return;
            const room = document.getElementById('roomName').value;
            socket.emit('leave-room', { room });
        }

        function sendMetrics() {
            if (!socket) return;
            const metrics = {
                cpuUsage: Math.random() * 100,
                memoryUsage: Math.random() * 100,
                diskUsage: Math.random() * 100,
                timestamp: new Date().toISOString()
            };
            socket.emit('metrics-update', { serverId: 'test-server-001', metrics });
        }

        function sendAlert() {
            if (!socket) return;
            const alertId = 'alert-' + Date.now();
            socket.emit('alert-ack', { alertId, userId: document.getElementById('userId').value });
        }

        function sendPing() {
            if (!socket) return;
            socket.emit('ping');
        }

        function updateStatus(text, connected) {
            const status = document.getElementById('status');
            status.textContent = text;
            status.className = 'status ' + (connected ? 'connected' : 'disconnected');
        }

        function addMessage(text, type) {
            const messages = document.getElementById('messages');
            const message = document.createElement('div');
            message.className = 'message ' + type;
            message.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
            messages.appendChild(message);
            messages.scrollTop = messages.scrollHeight;
        }

        function clearMessages() {
            document.getElementById('messages').innerHTML = '';
        }
    </script>
</body>
</html>"""

        # Jest test file
        test_file = """const WebSocketServer = require('../server');
const Client = require('socket.io-client');
const request = require('supertest');

describe('WebSocket Server POC', () => {
    let server;
    let app;
    let clientSocket;

    beforeAll((done) => {
        server = new WebSocketServer();
        app = server.app;
        server.start(3003);

        setTimeout(() => {
            clientSocket = new Client('http://localhost:3003');
            clientSocket.on('connect', done);
        }, 100);
    });

    afterAll(() => {
        if (clientSocket) clientSocket.close();
        if (server.server) server.server.close();
    });

    test('should respond to health check', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('UP');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('connections');
    });

    test('should handle client connection', (done) => {
        const testClient = new Client('http://localhost:3003');
        testClient.on('connect', () => {
            expect(testClient.connected).toBe(true);
            testClient.close();
            done();
        });
    });

    test('should handle authentication', (done) => {
        clientSocket.emit('authenticate', { userId: 'test-user', userRole: 'admin' });
        clientSocket.on('authenticated', (data) => {
            expect(data.success).toBe(true);
            expect(data.userId).toBe('test-user');
            done();
        });
    });

    test('should handle room joining', (done) => {
        clientSocket.emit('join-room', { room: 'test-room' });
        clientSocket.on('room-joined', (data) => {
            expect(data.success).toBe(true);
            expect(data.room).toBe('test-room');
            done();
        });
    });

    test('should broadcast messages to room', async () => {
        const response = await request(app)
            .post('/api/broadcast/test-room')
            .send({ message: 'Test broadcast message', type: 'test' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('messageId');
    });

    test('should handle metrics updates', (done) => {
        const metrics = {
            cpuUsage: 75.5,
            memoryUsage: 60.2,
            timestamp: new Date().toISOString()
        };

        clientSocket.emit('metrics-update', { serverId: 'test-server', metrics });
        clientSocket.on('metrics-update', (data) => {
            expect(data.serverId).toBe('test-server');
            expect(data.cpuUsage).toBe(75.5);
            done();
        });
    });

    test('should handle ping/pong', (done) => {
        clientSocket.emit('ping');
        clientSocket.on('pong', (data) => {
            expect(data).toHaveProperty('timestamp');
            done();
        });
    });
});"""

        # Create directory structure and save files
        src_dir = poc_dir / "src"
        public_dir = poc_dir / "public"
        test_dir = poc_dir / "__tests__"

        for dir_path in [src_dir, public_dir, test_dir]:
            dir_path.mkdir(exist_ok=True)

        # Save all files
        with open(poc_dir / "package.json", "w") as f:
            json.dump(package_json, f, indent=2)

        with open(poc_dir / "server.js", "w") as f:
            f.write(websocket_server)

        with open(public_dir / "test.html", "w") as f:
            f.write(test_client)

        with open(test_dir / "websocket.test.js", "w") as f:
            f.write(test_file)

        # Create README
        readme = """# SAMS WebSocket Communication POC

## Overview
This POC demonstrates real-time WebSocket communication for SAMS monitoring system.

## Features
- Real-time bidirectional communication
- Room-based message broadcasting
- User authentication and session management
- Metrics streaming
- Alert delivery
- Connection health monitoring
- REST API for external integration

## Running the POC
```bash
npm install
npm start
```

## Testing
```bash
npm test
```

## Test Client
Open http://localhost:3002/test.html in your browser to test WebSocket functionality.

## API Endpoints
- GET /health - Server health check
- GET /api/stats - Connection statistics
- POST /api/broadcast/:room - Broadcast message to room
- POST /api/alert/:userId - Send alert to specific user

## WebSocket Events
- authenticate - User authentication
- join-room / leave-room - Room management
- metrics-update - Real-time metrics
- alert-ack - Alert acknowledgment
- ping/pong - Connection health
"""

        with open(poc_dir / "README.md", "w") as f:
            f.write(readme)

        return {
            "name": "WebSocket Communication POC",
            "directory": str(poc_dir),
            "description": "Real-time WebSocket server for bidirectional communication",
            "features": [
                "Real-time messaging",
                "Room-based broadcasting",
                "User authentication",
                "Metrics streaming",
                "Alert delivery",
                "Connection management"
            ],
            "test_coverage": "Jest tests for WebSocket functionality and API endpoints"
        }

    def generate_mobile_background_poc(self):
        """Generate POC 3: React Native background processing demo"""

        poc_dir = self.output_dir / "poc3-mobile-background"
        poc_dir.mkdir(exist_ok=True)

        # Package.json for React Native POC
        package_json = {
            "name": "sams-mobile-background-poc",
            "version": "1.0.0",
            "description": "SAMS React Native background processing POC",
            "main": "index.js",
            "scripts": {
                "android": "react-native run-android",
                "ios": "react-native run-ios",
                "start": "react-native start",
                "test": "jest",
                "lint": "eslint . --ext .js,.jsx,.ts,.tsx"
            },
            "dependencies": {
                "react": "18.2.0",
                "react-native": "0.73.0",
                "@react-native-async-storage/async-storage": "^1.21.0",
                "@react-native-community/netinfo": "^11.2.1",
                "react-native-background-job": "^0.2.9",
                "react-native-background-timer": "^2.4.1",
                "@react-native-firebase/app": "^18.6.2",
                "@react-native-firebase/messaging": "^18.6.2",
                "axios": "^1.6.2"
            },
            "devDependencies": {
                "@babel/core": "^7.23.5",
                "@babel/preset-env": "^7.23.5",
                "@babel/runtime": "^7.23.5",
                "@react-native/eslint-config": "^0.73.1",
                "@react-native/metro-config": "^0.73.2",
                "@react-native/typescript-config": "^0.73.1",
                "@testing-library/react-native": "^12.4.2",
                "jest": "^29.7.0",
                "metro-react-native-babel-preset": "^0.77.0"
            },
            "jest": {
                "preset": "react-native"
            }
        }

        # Main App component
        app_component = """import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import BackgroundService from './src/services/BackgroundService';
import MetricsCollector from './src/services/MetricsCollector';
import NotificationService from './src/services/NotificationService';

const App = () => {
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.10:8080');
  const [lastSync, setLastSync] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    initializeApp();
    setupNetworkListener();
    loadSettings();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize notification service
      await NotificationService.initialize();

      // Initialize metrics collector
      MetricsCollector.initialize();

      addLog('App initialized successfully');
    } catch (error) {
      addLog(`Initialization error: ${error.message}`);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnectionStatus(state.isConnected ? 'connected' : 'disconnected');
      addLog(`Network status: ${state.isConnected ? 'Connected' : 'Disconnected'}`);

      if (state.isConnected && isBackgroundEnabled) {
        // Sync pending data when connection is restored
        syncPendingData();
      }
    });

    return unsubscribe;
  };

  const loadSettings = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('serverUrl');
      const backgroundEnabled = await AsyncStorage.getItem('backgroundEnabled');

      if (savedUrl) setServerUrl(savedUrl);
      if (backgroundEnabled) setIsBackgroundEnabled(JSON.parse(backgroundEnabled));
    } catch (error) {
      addLog(`Failed to load settings: ${error.message}`);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('serverUrl', serverUrl);
      await AsyncStorage.setItem('backgroundEnabled', JSON.stringify(isBackgroundEnabled));
      addLog('Settings saved');
    } catch (error) {
      addLog(`Failed to save settings: ${error.message}`);
    }
  };

  const toggleBackgroundService = async () => {
    try {
      if (!isBackgroundEnabled) {
        // Start background service
        await BackgroundService.start({
          serverUrl,
          interval: 30000, // 30 seconds
          onMetricsCollected: (data) => {
            setMetrics(data);
            setLastSync(new Date().toLocaleTimeString());
          },
          onError: (error) => {
            addLog(`Background error: ${error.message}`);
          }
        });

        setIsBackgroundEnabled(true);
        addLog('Background service started');

        // Show notification
        NotificationService.showNotification(
          'SAMS Monitoring Active',
          'Background monitoring has been enabled'
        );
      } else {
        // Stop background service
        await BackgroundService.stop();
        setIsBackgroundEnabled(false);
        addLog('Background service stopped');
      }

      await saveSettings();
    } catch (error) {
      addLog(`Failed to toggle background service: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  const collectMetricsNow = async () => {
    try {
      addLog('Collecting metrics manually...');
      const data = await MetricsCollector.collectMetrics();
      setMetrics(data);

      // Send to server if connected
      if (connectionStatus === 'connected') {
        await sendMetricsToServer(data);
      } else {
        await storeMetricsLocally(data);
        addLog('Metrics stored locally (offline)');
      }
    } catch (error) {
      addLog(`Failed to collect metrics: ${error.message}`);
    }
  };

  const sendMetricsToServer = async (data) => {
    try {
      const response = await fetch(`${serverUrl}/api/v1/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        timeout: 10000,
      });

      if (response.ok) {
        addLog('Metrics sent to server successfully');
        setLastSync(new Date().toLocaleTimeString());
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      addLog(`Failed to send metrics: ${error.message}`);
      await storeMetricsLocally(data);
    }
  };

  const storeMetricsLocally = async (data) => {
    try {
      const stored = await AsyncStorage.getItem('pendingMetrics');
      const pending = stored ? JSON.parse(stored) : [];
      pending.push({ ...data, timestamp: Date.now() });

      // Keep only last 100 entries
      if (pending.length > 100) {
        pending.splice(0, pending.length - 100);
      }

      await AsyncStorage.setItem('pendingMetrics', JSON.stringify(pending));
    } catch (error) {
      addLog(`Failed to store metrics locally: ${error.message}`);
    }
  };

  const syncPendingData = async () => {
    try {
      const stored = await AsyncStorage.getItem('pendingMetrics');
      if (!stored) return;

      const pending = JSON.parse(stored);
      if (pending.length === 0) return;

      addLog(`Syncing ${pending.length} pending metrics...`);

      for (const data of pending) {
        try {
          await sendMetricsToServer(data);
        } catch (error) {
          addLog(`Failed to sync metric: ${error.message}`);
          break; // Stop syncing if server is unreachable
        }
      }

      // Clear synced data
      await AsyncStorage.removeItem('pendingMetrics');
      addLog('Pending metrics synced successfully');
    } catch (error) {
      addLog(`Failed to sync pending data: ${error.message}`);
    }
  };

  const testNotification = () => {
    NotificationService.showNotification(
      'Test Alert',
      'This is a test notification from SAMS mobile app',
      'high'
    );
    addLog('Test notification sent');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>

        <View style={styles.header}>
          <Text style={styles.title}>SAMS Mobile POC</Text>
          <Text style={styles.subtitle}>Background Processing Demo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator,
              connectionStatus === 'connected' ? styles.connected : styles.disconnected]} />
            <Text style={styles.statusText}>
              {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Configuration</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="Server URL"
            onBlur={saveSettings}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Service</Text>
          <View style={styles.switchContainer}>
            <Text>Enable Background Monitoring</Text>
            <Switch
              value={isBackgroundEnabled}
              onValueChange={toggleBackgroundService}
            />
          </View>
          {lastSync && (
            <Text style={styles.lastSync}>Last sync: {lastSync}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Metrics</Text>
          <Text style={styles.metricsText}>
            {JSON.stringify(metrics, null, 2) || 'No metrics collected yet'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Button title="Collect Metrics Now" onPress={collectMetricsNow} />
          <View style={styles.buttonSpacing} />
          <Button title="Sync Pending Data" onPress={syncPendingData} />
          <View style={styles.buttonSpacing} />
          <Button title="Test Notification" onPress={testNotification} />
        </View>

        <View style={styles.section}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Activity Logs</Text>
            <Button title="Clear" onPress={clearLogs} />
          </View>
          <ScrollView style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#007bff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#28a745',
  },
  disconnected: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSync: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  metricsText: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
  },
  buttonSpacing: {
    height: 10,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logsContainer: {
    maxHeight: 200,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
    color: '#333',
  },
});

export default App;"""

        # Background Service
        background_service = """import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import MetricsCollector from './MetricsCollector';

class BackgroundService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.config = null;
  }

  async start(config) {
    if (this.isRunning) {
      throw new Error('Background service is already running');
    }

    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:8080',
      interval: config.interval || 30000, // 30 seconds default
      onMetricsCollected: config.onMetricsCollected || (() => {}),
      onError: config.onError || (() => {}),
      ...config
    };

    this.isRunning = true;

    // Start background timer
    this.intervalId = BackgroundTimer.setInterval(() => {
      this.collectAndSendMetrics();
    }, this.config.interval);

    console.log('Background service started with interval:', this.config.interval);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      BackgroundTimer.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.config = null;

    console.log('Background service stopped');
  }

  async collectAndSendMetrics() {
    try {
      if (!this.isRunning) return;

      console.log('Background: Collecting metrics...');

      // Collect device metrics
      const metrics = await MetricsCollector.collectMetrics();

      // Notify callback
      if (this.config.onMetricsCollected) {
        this.config.onMetricsCollected(metrics);
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Send to server
        await this.sendToServer(metrics);
      } else {
        // Store locally for later sync
        await this.storeLocally(metrics);
        console.log('Background: Stored metrics locally (offline)');
      }

    } catch (error) {
      console.error('Background service error:', error);
      if (this.config.onError) {
        this.config.onError(error);
      }
    }
  }

  async sendToServer(metrics) {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/v1/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SAMS-Mobile-POC/1.0.0',
        },
        body: JSON.stringify({
          ...metrics,
          source: 'mobile-background',
          timestamp: new Date().toISOString(),
        }),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      console.log('Background: Metrics sent to server successfully');

      // Try to sync any pending data
      await this.syncPendingData();

    } catch (error) {
      console.error('Background: Failed to send metrics to server:', error);
      await this.storeLocally(metrics);
      throw error;
    }
  }

  async storeLocally(metrics) {
    try {
      const key = 'pendingBackgroundMetrics';
      const stored = await AsyncStorage.getItem(key);
      const pending = stored ? JSON.parse(stored) : [];

      pending.push({
        ...metrics,
        timestamp: Date.now(),
        source: 'mobile-background'
      });

      // Keep only last 50 entries to prevent storage bloat
      if (pending.length > 50) {
        pending.splice(0, pending.length - 50);
      }

      await AsyncStorage.setItem(key, JSON.stringify(pending));
      console.log(`Background: Stored metrics locally. Pending count: ${pending.length}`);

    } catch (error) {
      console.error('Background: Failed to store metrics locally:', error);
    }
  }

  async syncPendingData() {
    try {
      const key = 'pendingBackgroundMetrics';
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return;

      const pending = JSON.parse(stored);
      if (pending.length === 0) return;

      console.log(`Background: Syncing ${pending.length} pending metrics...`);

      // Send pending metrics one by one
      for (let i = 0; i < pending.length; i++) {
        const metrics = pending[i];

        try {
          const response = await fetch(`${this.config.serverUrl}/api/v1/metrics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'SAMS-Mobile-POC/1.0.0',
            },
            body: JSON.stringify(metrics),
            timeout: 5000,
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

        } catch (error) {
          console.error(`Background: Failed to sync metric ${i + 1}:`, error);
          // Keep remaining metrics for next sync attempt
          const remaining = pending.slice(i);
          await AsyncStorage.setItem(key, JSON.stringify(remaining));
          return;
        }
      }

      // All metrics synced successfully
      await AsyncStorage.removeItem(key);
      console.log('Background: All pending metrics synced successfully');

    } catch (error) {
      console.error('Background: Failed to sync pending data:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      intervalId: this.intervalId
    };
  }
}

export default new BackgroundService();"""

        # Create directory structure and save files
        src_dir = poc_dir / "src"
        services_dir = src_dir / "services"

        for dir_path in [src_dir, services_dir]:
            dir_path.mkdir(exist_ok=True)

        # Save files
        with open(poc_dir / "package.json", "w") as f:
            json.dump(package_json, f, indent=2)

        with open(poc_dir / "App.js", "w") as f:
            f.write(app_component)

        with open(services_dir / "BackgroundService.js", "w") as f:
            f.write(background_service)

        # Create additional service files (simplified for POC)
        metrics_collector = """import { Platform } from 'react-native';

class MetricsCollector {
  initialize() {
    console.log('MetricsCollector initialized');
  }

  async collectMetrics() {
    // Simulate collecting device metrics
    const metrics = {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: new Date().toISOString(),
      deviceId: 'mobile-device-001',

      // Simulated metrics (in real app, would use actual device APIs)
      battery: {
        level: Math.random() * 100,
        isCharging: Math.random() > 0.5
      },
      memory: {
        used: Math.random() * 4000,
        total: 4000,
        available: Math.random() * 2000
      },
      network: {
        type: 'wifi', // or 'cellular'
        strength: Math.random() * 100
      },
      app: {
        version: '1.0.0-POC',
        buildNumber: '1',
        isBackground: true
      }
    };

    console.log('Metrics collected:', metrics);
    return metrics;
  }
}

export default new MetricsCollector();"""

        notification_service = """import { Platform, Alert } from 'react-native';

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // In a real app, would initialize Firebase Cloud Messaging
      console.log('NotificationService initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  showNotification(title, body, priority = 'normal') {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized');
      return;
    }

    // For POC, use Alert instead of actual push notifications
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Alert.alert(title, body);
    }

    console.log(`Notification: ${title} - ${body} (${priority})`);
  }

  async scheduleNotification(title, body, delay = 0) {
    setTimeout(() => {
      this.showNotification(title, body);
    }, delay);
  }
}

export default new NotificationService();"""

        with open(services_dir / "MetricsCollector.js", "w") as f:
            f.write(metrics_collector)

        with open(services_dir / "NotificationService.js", "w") as f:
            f.write(notification_service)

        # Create README
        readme = """# SAMS React Native Background Processing POC

## Overview
This POC demonstrates React Native background processing capabilities for the SAMS mobile app.

## Features
- Background metrics collection
- Offline data storage and sync
- Network connectivity monitoring
- Push notifications simulation
- Real-time server communication
- Automatic retry and error handling

## Setup
```bash
npm install
# For iOS
cd ios && pod install && cd ..
# For Android, ensure Android SDK is configured
```

## Running
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Testing Background Processing
1. Enable background monitoring in the app
2. Put the app in background
3. Monitor logs to see background metrics collection
4. Test offline/online scenarios

## Key Components
- **BackgroundService**: Manages background task execution
- **MetricsCollector**: Collects device and app metrics
- **NotificationService**: Handles push notifications
- **Offline Storage**: AsyncStorage for pending data

## Configuration
- Server URL: Configurable in app settings
- Collection interval: 30 seconds (configurable)
- Offline storage: Last 50 metrics retained
"""

        with open(poc_dir / "README.md", "w") as f:
            f.write(readme)

        return {
            "name": "React Native Background Processing POC",
            "directory": str(poc_dir),
            "description": "React Native app demonstrating background processing and offline capabilities",
            "features": [
                "Background task execution",
                "Offline data storage",
                "Network monitoring",
                "Push notifications",
                "Automatic sync",
                "Error handling"
            ],
            "test_coverage": "Manual testing for background processing scenarios"
        }
