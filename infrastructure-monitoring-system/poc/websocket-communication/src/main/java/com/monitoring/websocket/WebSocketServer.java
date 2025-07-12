/**
 * 🔄 Real-time WebSocket Communication - POC Implementation
 * Demonstrates real-time data streaming for monitoring dashboards
 */

package com.monitoring.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

@SpringBootApplication
@EnableScheduling
public class WebSocketServer {
    
    private static final Logger logger = LoggerFactory.getLogger(WebSocketServer.class);
    
    public static void main(String[] args) {
        logger.info("🚀 Starting WebSocket Communication POC...");
        SpringApplication.run(WebSocketServer.class, args);
    }
}

/**
 * WebSocket configuration
 */
@Configuration
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {
    
    private final MonitoringWebSocketHandler webSocketHandler;
    
    public WebSocketConfig(MonitoringWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/ws/monitoring")
                .setAllowedOrigins("*"); // In production, specify allowed origins
    }
}

/**
 * WebSocket handler for monitoring data
 */
@Component
class MonitoringWebSocketHandler implements WebSocketHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(MonitoringWebSocketHandler.class);
    
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> subscriptions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicLong messagesSent = new AtomicLong(0);
    private final AtomicLong connectionsCount = new AtomicLong(0);
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        connectionsCount.incrementAndGet();
        
        logger.info("🔗 WebSocket connection established: {} (Total: {})", 
                   sessionId, connectionsCount.get());
        
        // Send welcome message
        Map<String, Object> welcomeMessage = new HashMap<>();
        welcomeMessage.put("type", "welcome");
        welcomeMessage.put("sessionId", sessionId);
        welcomeMessage.put("timestamp", Instant.now().toString());
        welcomeMessage.put("message", "Connected to monitoring WebSocket");
        
        sendMessage(session, welcomeMessage);
    }
    
    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        String sessionId = session.getId();
        String payload = message.getPayload().toString();
        
        logger.debug("📨 Received message from {}: {}", sessionId, payload);
        
        try {
            Map<String, Object> messageData = objectMapper.readValue(payload, Map.class);
            String messageType = (String) messageData.get("type");
            
            switch (messageType) {
                case "subscribe":
                    handleSubscription(sessionId, messageData);
                    break;
                case "unsubscribe":
                    handleUnsubscription(sessionId, messageData);
                    break;
                case "ping":
                    handlePing(session);
                    break;
                default:
                    logger.warn("⚠️ Unknown message type: {}", messageType);
            }
            
        } catch (Exception e) {
            logger.error("❌ Error handling message: {}", e.getMessage(), e);
            sendErrorMessage(session, "Invalid message format");
        }
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        logger.error("❌ WebSocket transport error for session {}: {}", 
                    sessionId, exception.getMessage(), exception);
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        subscriptions.remove(sessionId);
        connectionsCount.decrementAndGet();
        
        logger.info("🔌 WebSocket connection closed: {} - {} (Total: {})", 
                   sessionId, closeStatus.toString(), connectionsCount.get());
    }
    
    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
    
    /**
     * Handle subscription requests
     */
    private void handleSubscription(String sessionId, Map<String, Object> messageData) {
        List<String> topics = (List<String>) messageData.get("topics");
        if (topics != null) {
            Set<String> sessionSubscriptions = subscriptions.computeIfAbsent(sessionId, k -> new HashSet<>());
            sessionSubscriptions.addAll(topics);
            
            logger.info("📡 Session {} subscribed to topics: {}", sessionId, topics);
            
            // Send confirmation
            Map<String, Object> confirmation = new HashMap<>();
            confirmation.put("type", "subscription_confirmed");
            confirmation.put("topics", topics);
            confirmation.put("timestamp", Instant.now().toString());
            
            WebSocketSession session = sessions.get(sessionId);
            if (session != null) {
                sendMessage(session, confirmation);
            }
        }
    }
    
    /**
     * Handle unsubscription requests
     */
    private void handleUnsubscription(String sessionId, Map<String, Object> messageData) {
        List<String> topics = (List<String>) messageData.get("topics");
        if (topics != null) {
            Set<String> sessionSubscriptions = subscriptions.get(sessionId);
            if (sessionSubscriptions != null) {
                sessionSubscriptions.removeAll(topics);
                logger.info("📡 Session {} unsubscribed from topics: {}", sessionId, topics);
            }
        }
    }
    
    /**
     * Handle ping messages
     */
    private void handlePing(WebSocketSession session) {
        Map<String, Object> pong = new HashMap<>();
        pong.put("type", "pong");
        pong.put("timestamp", Instant.now().toString());
        sendMessage(session, pong);
    }
    
    /**
     * Send message to specific session
     */
    private void sendMessage(WebSocketSession session, Map<String, Object> message) {
        try {
            if (session.isOpen()) {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
                messagesSent.incrementAndGet();
            }
        } catch (IOException e) {
            logger.error("❌ Failed to send message: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Send error message to session
     */
    private void sendErrorMessage(WebSocketSession session, String error) {
        Map<String, Object> errorMessage = new HashMap<>();
        errorMessage.put("type", "error");
        errorMessage.put("message", error);
        errorMessage.put("timestamp", Instant.now().toString());
        sendMessage(session, errorMessage);
    }
    
    /**
     * Broadcast message to all subscribers of a topic
     */
    public void broadcastToTopic(String topic, Map<String, Object> message) {
        message.put("topic", topic);
        message.put("timestamp", Instant.now().toString());
        
        subscriptions.entrySet().stream()
                .filter(entry -> entry.getValue().contains(topic))
                .forEach(entry -> {
                    String sessionId = entry.getKey();
                    WebSocketSession session = sessions.get(sessionId);
                    if (session != null && session.isOpen()) {
                        sendMessage(session, message);
                    }
                });
    }
    
    /**
     * Get connection statistics
     */
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("activeConnections", connectionsCount.get());
        stats.put("totalMessagesSent", messagesSent.get());
        stats.put("subscriptions", subscriptions.size());
        stats.put("timestamp", Instant.now().toString());
        return stats;
    }
}

/**
 * Simulated metrics broadcaster
 */
@Component
class MetricsBroadcaster {
    
    private static final Logger logger = LoggerFactory.getLogger(MetricsBroadcaster.class);
    
    private final MonitoringWebSocketHandler webSocketHandler;
    private final List<String> serverIds = Arrays.asList("server-1", "server-2", "server-3", "server-4");
    
    public MetricsBroadcaster(MonitoringWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }
    
    @PostConstruct
    public void initialize() {
        logger.info("🔧 Initializing Metrics Broadcaster");
    }
    
    /**
     * Broadcast real-time metrics every 5 seconds
     */
    @Scheduled(fixedRate = 5000) // 5 seconds
    public void broadcastMetrics() {
        try {
            for (String serverId : serverIds) {
                Map<String, Object> metrics = generateRandomMetrics(serverId);
                webSocketHandler.broadcastToTopic("metrics." + serverId, metrics);
            }
            
            // Broadcast system-wide metrics
            Map<String, Object> systemMetrics = generateSystemMetrics();
            webSocketHandler.broadcastToTopic("system.metrics", systemMetrics);
            
        } catch (Exception e) {
            logger.error("❌ Error broadcasting metrics: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Broadcast alerts every 30 seconds (simulated)
     */
    @Scheduled(fixedRate = 30000) // 30 seconds
    public void broadcastAlerts() {
        try {
            // Simulate random alerts
            if (ThreadLocalRandom.current().nextDouble() < 0.3) { // 30% chance
                Map<String, Object> alert = generateRandomAlert();
                webSocketHandler.broadcastToTopic("alerts", alert);
                logger.info("🚨 Broadcasting alert: {}", alert.get("message"));
            }
            
        } catch (Exception e) {
            logger.error("❌ Error broadcasting alerts: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Broadcast connection statistics every minute
     */
    @Scheduled(fixedRate = 60000) // 1 minute
    public void broadcastStatistics() {
        try {
            Map<String, Object> stats = webSocketHandler.getStatistics();
            webSocketHandler.broadcastToTopic("system.stats", stats);
            logger.info("📊 Broadcasting statistics: {} active connections", 
                       stats.get("activeConnections"));
            
        } catch (Exception e) {
            logger.error("❌ Error broadcasting statistics: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Generate random server metrics
     */
    private Map<String, Object> generateRandomMetrics(String serverId) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("type", "metrics");
        metrics.put("serverId", serverId);
        metrics.put("cpu", ThreadLocalRandom.current().nextDouble(0, 100));
        metrics.put("memory", ThreadLocalRandom.current().nextDouble(20, 90));
        metrics.put("disk", ThreadLocalRandom.current().nextDouble(10, 80));
        metrics.put("network", ThreadLocalRandom.current().nextDouble(0, 1000));
        metrics.put("timestamp", Instant.now().toString());
        return metrics;
    }
    
    /**
     * Generate system-wide metrics
     */
    private Map<String, Object> generateSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("type", "system_metrics");
        metrics.put("totalServers", serverIds.size());
        metrics.put("activeServers", ThreadLocalRandom.current().nextInt(3, serverIds.size() + 1));
        metrics.put("totalAlerts", ThreadLocalRandom.current().nextInt(0, 10));
        metrics.put("criticalAlerts", ThreadLocalRandom.current().nextInt(0, 3));
        metrics.put("avgResponseTime", ThreadLocalRandom.current().nextDouble(50, 200));
        metrics.put("timestamp", Instant.now().toString());
        return metrics;
    }
    
    /**
     * Generate random alert
     */
    private Map<String, Object> generateRandomAlert() {
        String[] alertTypes = {"CPU High", "Memory Low", "Disk Full", "Network Error", "Service Down"};
        String[] severities = {"low", "medium", "high", "critical"};
        
        Map<String, Object> alert = new HashMap<>();
        alert.put("type", "alert");
        alert.put("id", UUID.randomUUID().toString());
        alert.put("serverId", serverIds.get(ThreadLocalRandom.current().nextInt(serverIds.size())));
        alert.put("alertType", alertTypes[ThreadLocalRandom.current().nextInt(alertTypes.length)]);
        alert.put("severity", severities[ThreadLocalRandom.current().nextInt(severities.length)]);
        alert.put("message", "Simulated alert for demonstration");
        alert.put("timestamp", Instant.now().toString());
        return alert;
    }
}
