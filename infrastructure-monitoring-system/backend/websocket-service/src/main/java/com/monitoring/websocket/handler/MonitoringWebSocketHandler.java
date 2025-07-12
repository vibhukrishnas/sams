/**
 * 🔄 Monitoring WebSocket Handler - Advanced Connection Management
 * Enterprise WebSocket handler with subscription management, heartbeat, and fallback mechanisms
 */

package com.monitoring.websocket.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoring.websocket.entity.WebSocketSession;
import com.monitoring.websocket.model.*;
import com.monitoring.websocket.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class MonitoringWebSocketHandler implements WebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(MonitoringWebSocketHandler.class);

    @Autowired
    private WebSocketSessionService sessionService;

    @Autowired
    private WebSocketSubscriptionService subscriptionService;

    @Autowired
    private WebSocketMessageQueueService messageQueueService;

    @Autowired
    private ObjectMapper objectMapper;

    // Active WebSocket sessions
    private final Map<String, org.springframework.web.socket.WebSocketSession> activeSessions = new ConcurrentHashMap<>();
    
    // Session metadata
    private final Map<String, WebSocketSessionInfo> sessionMetadata = new ConcurrentHashMap<>();
    
    // Performance metrics
    private final AtomicLong totalConnections = new AtomicLong(0);
    private final AtomicLong activeConnections = new AtomicLong(0);
    private final AtomicLong totalMessages = new AtomicLong(0);
    private final AtomicLong failedMessages = new AtomicLong(0);

    @Override
    public void afterConnectionEstablished(org.springframework.web.socket.WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        UUID userId = (UUID) session.getAttributes().get("userId");
        String username = (String) session.getAttributes().get("username");
        UUID organizationId = (UUID) session.getAttributes().get("organizationId");

        logger.info("🔗 WebSocket connection established: {} for user: {}", sessionId, username);

        try {
            // Store active session
            activeSessions.put(sessionId, session);
            activeConnections.incrementAndGet();
            totalConnections.incrementAndGet();

            // Create session metadata
            WebSocketSessionInfo sessionInfo = new WebSocketSessionInfo();
            sessionInfo.setSessionId(sessionId);
            sessionInfo.setUserId(userId);
            sessionInfo.setUsername(username);
            sessionInfo.setOrganizationId(organizationId);
            sessionInfo.setConnectedAt(LocalDateTime.now());
            sessionInfo.setLastHeartbeat(LocalDateTime.now());
            sessionMetadata.put(sessionId, sessionInfo);

            // Persist session to database
            sessionService.createSession(sessionInfo);

            // Send welcome message
            WebSocketMessage welcomeMessage = new WebSocketMessage();
            welcomeMessage.setType(WebSocketMessageType.WELCOME);
            welcomeMessage.setData(Map.of(
                "sessionId", sessionId,
                "username", username,
                "connectedAt", LocalDateTime.now().toString(),
                "serverTime", LocalDateTime.now().toString()
            ));

            sendMessage(session, welcomeMessage);

            // Process any queued messages for this user
            processQueuedMessages(userId, session);

            logger.info("✅ WebSocket session initialized successfully: {}", sessionId);

        } catch (Exception e) {
            logger.error("❌ Error establishing WebSocket connection for session {}: {}", sessionId, e.getMessage(), e);
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void handleMessage(org.springframework.web.socket.WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        String sessionId = session.getId();
        String payload = message.getPayload().toString();

        logger.debug("📨 Received message from session {}: {}", sessionId, payload);

        try {
            totalMessages.incrementAndGet();

            // Update session activity
            WebSocketSessionInfo sessionInfo = sessionMetadata.get(sessionId);
            if (sessionInfo != null) {
                sessionInfo.setLastActivity(LocalDateTime.now());
                sessionInfo.incrementMessageCount();
            }

            // Parse message
            WebSocketMessage incomingMessage = objectMapper.readValue(payload, WebSocketMessage.class);
            
            // Handle different message types
            switch (incomingMessage.getType()) {
                case SUBSCRIBE:
                    handleSubscription(session, incomingMessage);
                    break;
                case UNSUBSCRIBE:
                    handleUnsubscription(session, incomingMessage);
                    break;
                case HEARTBEAT:
                    handleHeartbeat(session, incomingMessage);
                    break;
                case PING:
                    handlePing(session, incomingMessage);
                    break;
                case GET_SUBSCRIPTIONS:
                    handleGetSubscriptions(session);
                    break;
                case UPDATE_PREFERENCES:
                    handleUpdatePreferences(session, incomingMessage);
                    break;
                default:
                    logger.warn("⚠️ Unknown message type: {} from session: {}", incomingMessage.getType(), sessionId);
                    sendErrorMessage(session, "Unknown message type: " + incomingMessage.getType());
            }

        } catch (Exception e) {
            logger.error("❌ Error handling message from session {}: {}", sessionId, e.getMessage(), e);
            failedMessages.incrementAndGet();
            sendErrorMessage(session, "Error processing message: " + e.getMessage());
        }
    }

    @Override
    public void handleTransportError(org.springframework.web.socket.WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        String username = getUsername(session);

        logger.error("❌ WebSocket transport error for session {} (user: {}): {}", 
                    sessionId, username, exception.getMessage(), exception);

        // Update session status
        WebSocketSessionInfo sessionInfo = sessionMetadata.get(sessionId);
        if (sessionInfo != null) {
            sessionInfo.setStatus(WebSocketSessionStatus.FAILED);
            sessionInfo.setLastError(exception.getMessage());
        }

        // Attempt to send error message if session is still open
        if (session.isOpen()) {
            try {
                sendErrorMessage(session, "Connection error occurred. Please refresh the page.");
            } catch (Exception e) {
                logger.error("Failed to send error message to session {}: {}", sessionId, e.getMessage());
            }
        }
    }

    @Override
    public void afterConnectionClosed(org.springframework.web.socket.WebSocketSession session, CloseStatus closeStatus) throws Exception {
        String sessionId = session.getId();
        String username = getUsername(session);
        UUID userId = getUserId(session);

        logger.info("🔌 WebSocket connection closed: {} (user: {}) - Status: {}", 
                   sessionId, username, closeStatus.toString());

        try {
            // Remove from active sessions
            activeSessions.remove(sessionId);
            activeConnections.decrementAndGet();

            // Update session metadata
            WebSocketSessionInfo sessionInfo = sessionMetadata.remove(sessionId);
            if (sessionInfo != null) {
                sessionInfo.setStatus(WebSocketSessionStatus.DISCONNECTED);
                sessionInfo.setDisconnectedAt(LocalDateTime.now());
                sessionInfo.setCloseReason(closeStatus.toString());
            }

            // Remove all subscriptions for this session
            subscriptionService.removeAllSubscriptions(sessionId);

            // Update session in database
            sessionService.updateSessionStatus(sessionId, WebSocketSessionStatus.DISCONNECTED, closeStatus.toString());

            logger.info("✅ WebSocket session cleanup completed: {}", sessionId);

        } catch (Exception e) {
            logger.error("❌ Error during WebSocket connection cleanup for session {}: {}", sessionId, e.getMessage(), e);
        }
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    /**
     * Handle subscription requests
     */
    private void handleSubscription(org.springframework.web.socket.WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();
        UUID userId = getUserId(session);
        UUID organizationId = getOrganizationId(session);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) message.getData();
            @SuppressWarnings("unchecked")
            List<String> topics = (List<String>) data.get("topics");

            if (topics != null && !topics.isEmpty()) {
                // Validate subscription permissions
                List<String> allowedTopics = subscriptionService.validateSubscriptions(userId, organizationId, topics);
                
                // Add subscriptions
                for (String topic : allowedTopics) {
                    subscriptionService.addSubscription(sessionId, userId, topic);
                }

                // Send confirmation
                WebSocketMessage confirmation = new WebSocketMessage();
                confirmation.setType(WebSocketMessageType.SUBSCRIPTION_CONFIRMED);
                confirmation.setData(Map.of(
                    "subscribedTopics", allowedTopics,
                    "rejectedTopics", topics.stream()
                        .filter(topic -> !allowedTopics.contains(topic))
                        .toList(),
                    "timestamp", LocalDateTime.now().toString()
                ));

                sendMessage(session, confirmation);

                logger.info("📡 User {} subscribed to {} topics", getUserId(session), allowedTopics.size());
            }

        } catch (Exception e) {
            logger.error("Error handling subscription for session {}: {}", sessionId, e.getMessage(), e);
            sendErrorMessage(session, "Failed to process subscription: " + e.getMessage());
        }
    }

    /**
     * Handle unsubscription requests
     */
    private void handleUnsubscription(org.springframework.web.socket.WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) message.getData();
            @SuppressWarnings("unchecked")
            List<String> topics = (List<String>) data.get("topics");

            if (topics != null && !topics.isEmpty()) {
                // Remove subscriptions
                for (String topic : topics) {
                    subscriptionService.removeSubscription(sessionId, topic);
                }

                // Send confirmation
                WebSocketMessage confirmation = new WebSocketMessage();
                confirmation.setType(WebSocketMessageType.UNSUBSCRIPTION_CONFIRMED);
                confirmation.setData(Map.of(
                    "unsubscribedTopics", topics,
                    "timestamp", LocalDateTime.now().toString()
                ));

                sendMessage(session, confirmation);

                logger.info("📡 Session {} unsubscribed from {} topics", sessionId, topics.size());
            }

        } catch (Exception e) {
            logger.error("Error handling unsubscription for session {}: {}", sessionId, e.getMessage(), e);
            sendErrorMessage(session, "Failed to process unsubscription: " + e.getMessage());
        }
    }

    /**
     * Handle heartbeat messages
     */
    private void handleHeartbeat(org.springframework.web.socket.WebSocketSession session, WebSocketMessage message) {
        String sessionId = session.getId();

        try {
            // Update heartbeat timestamp
            WebSocketSessionInfo sessionInfo = sessionMetadata.get(sessionId);
            if (sessionInfo != null) {
                sessionInfo.setLastHeartbeat(LocalDateTime.now());
            }

            // Update in database
            sessionService.updateHeartbeat(sessionId);

            // Send heartbeat response
            WebSocketMessage response = new WebSocketMessage();
            response.setType(WebSocketMessageType.HEARTBEAT_ACK);
            response.setData(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "serverTime", LocalDateTime.now().toString()
            ));

            sendMessage(session, response);

        } catch (Exception e) {
            logger.error("Error handling heartbeat for session {}: {}", sessionId, e.getMessage(), e);
        }
    }

    /**
     * Handle ping messages
     */
    private void handlePing(org.springframework.web.socket.WebSocketSession session, WebSocketMessage message) {
        try {
            WebSocketMessage pong = new WebSocketMessage();
            pong.setType(WebSocketMessageType.PONG);
            pong.setData(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "originalTimestamp", message.getData()
            ));

            sendMessage(session, pong);

        } catch (Exception e) {
            logger.error("Error handling ping for session {}: {}", session.getId(), e.getMessage(), e);
        }
    }

    /**
     * Handle get subscriptions request
     */
    private void handleGetSubscriptions(org.springframework.web.socket.WebSocketSession session) {
        String sessionId = session.getId();

        try {
            List<String> subscriptions = subscriptionService.getSubscriptions(sessionId);

            WebSocketMessage response = new WebSocketMessage();
            response.setType(WebSocketMessageType.SUBSCRIPTIONS_LIST);
            response.setData(Map.of(
                "subscriptions", subscriptions,
                "count", subscriptions.size(),
                "timestamp", LocalDateTime.now().toString()
            ));

            sendMessage(session, response);

        } catch (Exception e) {
            logger.error("Error getting subscriptions for session {}: {}", sessionId, e.getMessage(), e);
            sendErrorMessage(session, "Failed to get subscriptions: " + e.getMessage());
        }
    }

    /**
     * Handle update preferences request
     */
    private void handleUpdatePreferences(org.springframework.web.socket.WebSocketSession session, WebSocketMessage message) {
        UUID userId = getUserId(session);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> preferences = (Map<String, Object>) message.getData();

            // Update user preferences
            sessionService.updateUserPreferences(userId, preferences);

            WebSocketMessage response = new WebSocketMessage();
            response.setType(WebSocketMessageType.PREFERENCES_UPDATED);
            response.setData(Map.of(
                "preferences", preferences,
                "timestamp", LocalDateTime.now().toString()
            ));

            sendMessage(session, response);

        } catch (Exception e) {
            logger.error("Error updating preferences for user {}: {}", userId, e.getMessage(), e);
            sendErrorMessage(session, "Failed to update preferences: " + e.getMessage());
        }
    }

    /**
     * Broadcast message to topic subscribers
     */
    public void broadcastToTopic(String topic, Object data) {
        List<String> subscribedSessions = subscriptionService.getSubscribersForTopic(topic);

        logger.debug("📢 Broadcasting to topic '{}' - {} subscribers", topic, subscribedSessions.size());

        WebSocketMessage message = new WebSocketMessage();
        message.setType(WebSocketMessageType.BROADCAST);
        message.setData(Map.of(
            "topic", topic,
            "data", data,
            "timestamp", LocalDateTime.now().toString()
        ));

        int successCount = 0;
        int failureCount = 0;

        for (String sessionId : subscribedSessions) {
            org.springframework.web.socket.WebSocketSession session = activeSessions.get(sessionId);
            if (session != null && session.isOpen()) {
                try {
                    sendMessage(session, message);
                    successCount++;
                } catch (Exception e) {
                    logger.error("Failed to send broadcast to session {}: {}", sessionId, e.getMessage());
                    failureCount++;
                }
            } else {
                // Session is not active, queue message for later delivery
                UUID userId = sessionMetadata.get(sessionId) != null ? 
                    sessionMetadata.get(sessionId).getUserId() : null;
                if (userId != null) {
                    messageQueueService.queueMessage(userId, message);
                }
                failureCount++;
            }
        }

        logger.debug("📢 Broadcast completed - Success: {}, Failed: {}", successCount, failureCount);
    }

    /**
     * Send message to specific user
     */
    public void sendToUser(UUID userId, Object data) {
        List<String> userSessions = sessionMetadata.entrySet().stream()
                .filter(entry -> userId.equals(entry.getValue().getUserId()))
                .map(Map.Entry::getKey)
                .toList();

        WebSocketMessage message = new WebSocketMessage();
        message.setType(WebSocketMessageType.DIRECT_MESSAGE);
        message.setData(data);

        boolean delivered = false;

        for (String sessionId : userSessions) {
            org.springframework.web.socket.WebSocketSession session = activeSessions.get(sessionId);
            if (session != null && session.isOpen()) {
                try {
                    sendMessage(session, message);
                    delivered = true;
                } catch (Exception e) {
                    logger.error("Failed to send direct message to session {}: {}", sessionId, e.getMessage());
                }
            }
        }

        // If not delivered to any active session, queue for later
        if (!delivered) {
            messageQueueService.queueMessage(userId, message);
            logger.debug("📬 Message queued for offline user: {}", userId);
        }
    }

    /**
     * Process queued messages for user
     */
    private void processQueuedMessages(UUID userId, org.springframework.web.socket.WebSocketSession session) {
        try {
            List<WebSocketMessage> queuedMessages = messageQueueService.getQueuedMessages(userId);
            
            if (!queuedMessages.isEmpty()) {
                logger.info("📬 Processing {} queued messages for user: {}", queuedMessages.size(), userId);
                
                for (WebSocketMessage message : queuedMessages) {
                    sendMessage(session, message);
                }
                
                // Clear processed messages
                messageQueueService.clearQueuedMessages(userId);
            }
            
        } catch (Exception e) {
            logger.error("Error processing queued messages for user {}: {}", userId, e.getMessage(), e);
        }
    }

    /**
     * Send message to WebSocket session
     */
    private void sendMessage(org.springframework.web.socket.WebSocketSession session, WebSocketMessage message) throws IOException {
        if (session.isOpen()) {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
            
            // Update session message count
            WebSocketSessionInfo sessionInfo = sessionMetadata.get(session.getId());
            if (sessionInfo != null) {
                sessionInfo.incrementMessageCount();
            }
        }
    }

    /**
     * Send error message to session
     */
    private void sendErrorMessage(org.springframework.web.socket.WebSocketSession session, String error) {
        try {
            WebSocketMessage errorMessage = new WebSocketMessage();
            errorMessage.setType(WebSocketMessageType.ERROR);
            errorMessage.setData(Map.of(
                "error", error,
                "timestamp", LocalDateTime.now().toString()
            ));
            
            sendMessage(session, errorMessage);
        } catch (Exception e) {
            logger.error("Failed to send error message to session {}: {}", session.getId(), e.getMessage());
        }
    }

    /**
     * Get connection statistics
     */
    public WebSocketStatistics getStatistics() {
        WebSocketStatistics stats = new WebSocketStatistics();
        stats.setTotalConnections(totalConnections.get());
        stats.setActiveConnections(activeConnections.get());
        stats.setTotalMessages(totalMessages.get());
        stats.setFailedMessages(failedMessages.get());
        stats.setActiveSubscriptions(subscriptionService.getTotalSubscriptions());
        stats.setQueuedMessages(messageQueueService.getTotalQueuedMessages());
        stats.setTimestamp(LocalDateTime.now());
        return stats;
    }

    // Helper methods
    private UUID getUserId(org.springframework.web.socket.WebSocketSession session) {
        return (UUID) session.getAttributes().get("userId");
    }

    private String getUsername(org.springframework.web.socket.WebSocketSession session) {
        return (String) session.getAttributes().get("username");
    }

    private UUID getOrganizationId(org.springframework.web.socket.WebSocketSession session) {
        return (UUID) session.getAttributes().get("organizationId");
    }
}
