package com.sams.enterprise.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.entity.User;
import com.sams.enterprise.security.JwtTokenProvider;
import com.sams.enterprise.service.UserManagementService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Enterprise WebSocket Handler for Real-time Alert Notifications
 */
@Component
public class AlertWebSocketHandler implements WebSocketHandler {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserManagementService userManagementService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Store active WebSocket sessions
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, UserSession> userSessions = new ConcurrentHashMap<>();
    private final CopyOnWriteArraySet<String> subscribedSessions = new CopyOnWriteArraySet<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        
        // Send welcome message
        sendMessage(session, createMessage("CONNECTION_ESTABLISHED", 
            "WebSocket connection established successfully", null));
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        if (message instanceof TextMessage) {
            handleTextMessage(session, (TextMessage) message);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        removeSession(sessionId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        String sessionId = session.getId();
        removeSession(sessionId);
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    /**
     * Handle incoming text messages
     */
    private void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
            String action = (String) payload.get("action");
            
            switch (action) {
                case "AUTHENTICATE":
                    handleAuthentication(session, payload);
                    break;
                case "SUBSCRIBE_ALERTS":
                    handleAlertSubscription(session, payload);
                    break;
                case "UNSUBSCRIBE_ALERTS":
                    handleAlertUnsubscription(session);
                    break;
                case "PING":
                    handlePing(session);
                    break;
                default:
                    sendError(session, "Unknown action: " + action);
            }
        } catch (Exception e) {
            sendError(session, "Invalid message format");
        }
    }

    /**
     * Handle user authentication
     */
    private void handleAuthentication(WebSocketSession session, Map<String, Object> payload) throws Exception {
        String token = (String) payload.get("token");
        
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            sendError(session, "Invalid or missing authentication token");
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        String username = jwtTokenProvider.getUsernameFromToken(token);
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        
        User user = userManagementService.findById(userId).orElse(null);
        if (user == null) {
            sendError(session, "User not found");
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        // Store user session
        UserSession userSession = new UserSession(userId, username, token);
        userSessions.put(session.getId(), userSession);
        
        sendMessage(session, createMessage("AUTHENTICATED", 
            "Authentication successful", Map.of("userId", userId, "username", username)));
    }

    /**
     * Handle alert subscription
     */
    private void handleAlertSubscription(WebSocketSession session, Map<String, Object> payload) throws Exception {
        if (!isAuthenticated(session)) {
            sendError(session, "Authentication required");
            return;
        }

        subscribedSessions.add(session.getId());
        sendMessage(session, createMessage("SUBSCRIBED", 
            "Successfully subscribed to alert notifications", null));
    }

    /**
     * Handle alert unsubscription
     */
    private void handleAlertUnsubscription(WebSocketSession session) throws Exception {
        subscribedSessions.remove(session.getId());
        sendMessage(session, createMessage("UNSUBSCRIBED", 
            "Successfully unsubscribed from alert notifications", null));
    }

    /**
     * Handle ping message
     */
    private void handlePing(WebSocketSession session) throws Exception {
        sendMessage(session, createMessage("PONG", "Pong", Map.of("timestamp", LocalDateTime.now())));
    }

    /**
     * Broadcast alert to all subscribed sessions
     */
    public void broadcastAlert(Alert alert, String eventType) {
        Map<String, Object> alertData = Map.of(
            "id", alert.getId(),
            "title", alert.getTitle(),
            "description", alert.getDescription(),
            "severity", alert.getSeverity(),
            "status", alert.getStatus(),
            "serverId", alert.getServer() != null ? alert.getServer().getId() : null,
            "serverName", alert.getServer() != null ? alert.getServer().getHostname() : null,
            "createdAt", alert.getCreatedAt(),
            "eventType", eventType
        );

        Map<String, Object> message = createMessage("ALERT_NOTIFICATION", 
            "New alert notification", alertData);

        broadcastToSubscribed(message);
    }

    /**
     * Broadcast server status update
     */
    public void broadcastServerStatus(Long serverId, String hostname, String status, Map<String, Object> metrics) {
        Map<String, Object> statusData = Map.of(
            "serverId", serverId,
            "hostname", hostname,
            "status", status,
            "metrics", metrics,
            "timestamp", LocalDateTime.now()
        );

        Map<String, Object> message = createMessage("SERVER_STATUS_UPDATE", 
            "Server status update", statusData);

        broadcastToSubscribed(message);
    }

    /**
     * Broadcast system event
     */
    public void broadcastSystemEvent(String eventType, String message, Map<String, Object> data) {
        Map<String, Object> eventData = Map.of(
            "eventType", eventType,
            "message", message,
            "data", data != null ? data : Map.of(),
            "timestamp", LocalDateTime.now()
        );

        Map<String, Object> wsMessage = createMessage("SYSTEM_EVENT", message, eventData);
        broadcastToSubscribed(wsMessage);
    }

    /**
     * Send message to specific session
     */
    private void sendMessage(WebSocketSession session, Map<String, Object> message) {
        try {
            if (session.isOpen()) {
                String json = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException e) {
            removeSession(session.getId());
        }
    }

    /**
     * Send error message
     */
    private void sendError(WebSocketSession session, String error) {
        Map<String, Object> message = createMessage("ERROR", error, null);
        sendMessage(session, message);
    }

    /**
     * Broadcast message to all subscribed sessions
     */
    private void broadcastToSubscribed(Map<String, Object> message) {
        subscribedSessions.forEach(sessionId -> {
            WebSocketSession session = sessions.get(sessionId);
            if (session != null && session.isOpen()) {
                sendMessage(session, message);
            } else {
                subscribedSessions.remove(sessionId);
                sessions.remove(sessionId);
                userSessions.remove(sessionId);
            }
        });
    }

    /**
     * Create message object
     */
    private Map<String, Object> createMessage(String type, String message, Object data) {
        return Map.of(
            "type", type,
            "message", message,
            "data", data != null ? data : Map.of(),
            "timestamp", LocalDateTime.now()
        );
    }

    /**
     * Check if session is authenticated
     */
    private boolean isAuthenticated(WebSocketSession session) {
        return userSessions.containsKey(session.getId());
    }

    /**
     * Remove session and cleanup
     */
    private void removeSession(String sessionId) {
        sessions.remove(sessionId);
        userSessions.remove(sessionId);
        subscribedSessions.remove(sessionId);
    }

    /**
     * Get active session count
     */
    public int getActiveSessionCount() {
        return sessions.size();
    }

    /**
     * Get subscribed session count
     */
    public int getSubscribedSessionCount() {
        return subscribedSessions.size();
    }

    /**
     * User session data
     */
    private static class UserSession {
        private final Long userId;
        private final String username;
        private final String token;
        private final LocalDateTime connectedAt;

        public UserSession(Long userId, String username, String token) {
            this.userId = userId;
            this.username = username;
            this.token = token;
            this.connectedAt = LocalDateTime.now();
        }

        // Getters
        public Long getUserId() { return userId; }
        public String getUsername() { return username; }
        public String getToken() { return token; }
        public LocalDateTime getConnectedAt() { return connectedAt; }
    }
}
