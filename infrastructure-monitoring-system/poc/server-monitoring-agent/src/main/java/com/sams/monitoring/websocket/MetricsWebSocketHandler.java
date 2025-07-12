package com.sams.monitoring.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sams.monitoring.model.SystemMetrics;
import com.sams.monitoring.service.SystemMetricsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * WebSocket Handler for Real-time Metrics Streaming
 * 
 * Handles WebSocket connections and streams real-time system metrics
 * to connected clients at configurable intervals.
 */
@Component
public class MetricsWebSocketHandler implements WebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(MetricsWebSocketHandler.class);
    
    @Autowired
    private SystemMetricsService systemMetricsService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    
    // Default streaming interval: 5 seconds
    private static final int DEFAULT_INTERVAL_SECONDS = 5;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        
        logger.info("WebSocket connection established: {} (Total connections: {})", 
                   sessionId, sessions.size());
        
        // Send welcome message with connection info
        sendWelcomeMessage(session);
        
        // Send initial metrics immediately
        sendMetricsToSession(session);
        
        // Start periodic metrics streaming for this session
        startMetricsStreaming(session);
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        String sessionId = session.getId();
        String payload = message.getPayload().toString();
        
        logger.info("Received message from {}: {}", sessionId, payload);
        
        try {
            // Parse message as JSON to handle client requests
            if (payload.contains("\"type\":\"request_metrics\"")) {
                // Client requesting immediate metrics update
                sendMetricsToSession(session);
            } else if (payload.contains("\"type\":\"ping\"")) {
                // Handle ping/pong for connection keep-alive
                sendPongMessage(session);
            } else {
                // Echo unknown messages back to client
                session.sendMessage(new TextMessage("{\"type\":\"echo\",\"message\":\"" + payload + "\"}"));
            }
            
        } catch (Exception e) {
            logger.error("Error handling message from {}: {}", sessionId, e.getMessage());
            sendErrorMessage(session, "Error processing message: " + e.getMessage());
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        logger.error("WebSocket transport error for session {}: {}", sessionId, exception.getMessage());
        
        // Try to send error message to client if session is still open
        if (session.isOpen()) {
            try {
                sendErrorMessage(session, "Transport error: " + exception.getMessage());
            } catch (Exception e) {
                logger.error("Failed to send error message to client: {}", e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        
        logger.info("WebSocket connection closed: {} - {} (Remaining connections: {})", 
                   sessionId, closeStatus.toString(), sessions.size());
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    /**
     * Send welcome message to newly connected client
     */
    private void sendWelcomeMessage(WebSocketSession session) {
        try {
            String welcomeMessage = objectMapper.writeValueAsString(new Object() {
                public final String type = "welcome";
                public final String message = "Connected to SAMS Server Monitoring Agent";
                public final String version = "1.0.0";
                public final int streamingInterval = DEFAULT_INTERVAL_SECONDS;
                public final String timestamp = java.time.LocalDateTime.now().toString();
            });
            
            session.sendMessage(new TextMessage(welcomeMessage));
            
        } catch (Exception e) {
            logger.error("Error sending welcome message: {}", e.getMessage());
        }
    }

    /**
     * Send pong response to ping message
     */
    private void sendPongMessage(WebSocketSession session) {
        try {
            String pongMessage = objectMapper.writeValueAsString(new Object() {
                public final String type = "pong";
                public final String timestamp = java.time.LocalDateTime.now().toString();
            });
            
            session.sendMessage(new TextMessage(pongMessage));
            
        } catch (Exception e) {
            logger.error("Error sending pong message: {}", e.getMessage());
        }
    }

    /**
     * Send error message to client
     */
    private void sendErrorMessage(WebSocketSession session, String error) {
        try {
            String errorMessage = objectMapper.writeValueAsString(new Object() {
                public final String type = "error";
                public final String message = error;
                public final String timestamp = java.time.LocalDateTime.now().toString();
            });
            
            session.sendMessage(new TextMessage(errorMessage));
            
        } catch (Exception e) {
            logger.error("Error sending error message: {}", e.getMessage());
        }
    }

    /**
     * Send current system metrics to a specific session
     */
    private void sendMetricsToSession(WebSocketSession session) {
        if (!session.isOpen()) {
            return;
        }
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            // Wrap metrics in a message envelope
            String metricsMessage = objectMapper.writeValueAsString(new Object() {
                public final String type = "metrics";
                public final SystemMetrics data = metrics;
                public final String timestamp = java.time.LocalDateTime.now().toString();
            });
            
            session.sendMessage(new TextMessage(metricsMessage));
            
        } catch (Exception e) {
            logger.error("Error sending metrics to session {}: {}", session.getId(), e.getMessage());
        }
    }

    /**
     * Start periodic metrics streaming for a session
     */
    private void startMetricsStreaming(WebSocketSession session) {
        scheduler.scheduleAtFixedRate(() -> {
            if (session.isOpen() && sessions.containsKey(session.getId())) {
                sendMetricsToSession(session);
            } else {
                // Session is closed, remove from tracking
                sessions.remove(session.getId());
            }
        }, DEFAULT_INTERVAL_SECONDS, DEFAULT_INTERVAL_SECONDS, TimeUnit.SECONDS);
    }

    /**
     * Broadcast metrics to all connected sessions
     */
    public void broadcastMetrics() {
        if (sessions.isEmpty()) {
            return;
        }
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            String metricsMessage = objectMapper.writeValueAsString(new Object() {
                public final String type = "metrics";
                public final SystemMetrics data = metrics;
                public final String timestamp = java.time.LocalDateTime.now().toString();
            });
            
            TextMessage message = new TextMessage(metricsMessage);
            
            // Send to all connected sessions
            sessions.values().parallelStream().forEach(session -> {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                    } catch (IOException e) {
                        logger.error("Error broadcasting to session {}: {}", session.getId(), e.getMessage());
                        sessions.remove(session.getId());
                    }
                }
            });
            
        } catch (Exception e) {
            logger.error("Error broadcasting metrics: {}", e.getMessage());
        }
    }

    /**
     * Get number of active WebSocket connections
     */
    public int getActiveConnectionCount() {
        return sessions.size();
    }
}
