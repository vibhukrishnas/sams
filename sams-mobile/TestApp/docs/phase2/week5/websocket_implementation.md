# 🔄 **SAMS Mobile - WebSocket Implementation**

## **Executive Summary**

This document presents the robust real-time communication system for SAMS Mobile, featuring WebSocket server implementation with Spring Boot, comprehensive user subscription management, connection state management with heartbeat, fallback mechanisms, message queuing for offline users, and real-time alert broadcasting.

## **🏗️ WebSocket Architecture**

### **WebSocket Service Structure**
```
websocket-service/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/sams/websocket/
│   │   │       ├── WebSocketApplication.java
│   │   │       ├── config/
│   │   │       │   ├── WebSocketConfig.java
│   │   │       │   └── SecurityConfig.java
│   │   │       ├── handlers/
│   │   │       │   ├── SAMSWebSocketHandler.java
│   │   │       │   └── ConnectionManager.java
│   │   │       ├── services/
│   │   │       │   ├── SubscriptionService.java
│   │   │       │   ├── MessageQueueService.java
│   │   │       │   └── BroadcastService.java
│   │   │       ├── models/
│   │   │       │   ├── WebSocketSession.java
│   │   │       │   ├── Subscription.java
│   │   │       │   └── Message.java
│   │   │       └── utils/
│   │   │           ├── MessageUtils.java
│   │   │           └── ConnectionUtils.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── static/
├── tests/
└── docs/
```

## **🔌 Spring Boot WebSocket Implementation**

### **WebSocket Configuration**
```java
// config/WebSocketConfig.java
@Configuration
@EnableWebSocket
@EnableConfigurationProperties(WebSocketProperties.class)
public class WebSocketConfig implements WebSocketConfigurer {
    
    private final SAMSWebSocketHandler webSocketHandler;
    private final WebSocketProperties properties;
    
    public WebSocketConfig(SAMSWebSocketHandler webSocketHandler, 
                          WebSocketProperties properties) {
        this.webSocketHandler = webSocketHandler;
        this.properties = properties;
    }
    
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/ws/sams")
                .setAllowedOrigins(properties.getAllowedOrigins())
                .addInterceptors(new WebSocketAuthInterceptor())
                .withSockJS()
                .setHeartbeatTime(properties.getHeartbeatInterval())
                .setDisconnectDelay(properties.getDisconnectDelay())
                .setSessionCookieNeeded(false);
    }
    
    @Bean
    public WebSocketAuthInterceptor webSocketAuthInterceptor() {
        return new WebSocketAuthInterceptor();
    }
    
    @Bean
    public TaskScheduler webSocketTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(properties.getSchedulerPoolSize());
        scheduler.setThreadNamePrefix("websocket-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(60);
        return scheduler;
    }
}

// WebSocket Properties Configuration
@ConfigurationProperties(prefix = "sams.websocket")
@Data
public class WebSocketProperties {
    private String[] allowedOrigins = {"*"};
    private int heartbeatInterval = 25000; // 25 seconds
    private int disconnectDelay = 5000; // 5 seconds
    private int schedulerPoolSize = 10;
    private int maxConnections = 10000;
    private int messageQueueSize = 1000;
    private boolean enableCompression = true;
    private int maxMessageSize = 64 * 1024; // 64KB
}
```

### **WebSocket Handler Implementation**
```java
// handlers/SAMSWebSocketHandler.java
@Component
@Slf4j
public class SAMSWebSocketHandler extends TextWebSocketHandler {
    
    private final ConnectionManager connectionManager;
    private final SubscriptionService subscriptionService;
    private final MessageQueueService messageQueueService;
    private final BroadcastService broadcastService;
    private final ObjectMapper objectMapper;
    
    public SAMSWebSocketHandler(ConnectionManager connectionManager,
                               SubscriptionService subscriptionService,
                               MessageQueueService messageQueueService,
                               BroadcastService broadcastService,
                               ObjectMapper objectMapper) {
        this.connectionManager = connectionManager;
        this.subscriptionService = subscriptionService;
        this.messageQueueService = messageQueueService;
        this.broadcastService = broadcastService;
        this.objectMapper = objectMapper;
    }
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            // Extract user information from session attributes
            String userId = (String) session.getAttributes().get("userId");
            String organizationId = (String) session.getAttributes().get("organizationId");
            String deviceId = (String) session.getAttributes().get("deviceId");
            
            if (userId == null || organizationId == null) {
                log.warn("WebSocket connection rejected: missing user information");
                session.close(CloseStatus.NOT_ACCEPTABLE);
                return;
            }
            
            // Create and register connection
            SAMSWebSocketSession samsSession = SAMSWebSocketSession.builder()
                .sessionId(session.getId())
                .userId(userId)
                .organizationId(organizationId)
                .deviceId(deviceId)
                .webSocketSession(session)
                .connectedAt(Instant.now())
                .lastHeartbeat(Instant.now())
                .subscriptions(new ConcurrentHashMap<>())
                .build();
            
            connectionManager.addConnection(samsSession);
            
            // Send connection confirmation
            WebSocketMessage welcomeMessage = WebSocketMessage.builder()
                .type(MessageType.CONNECTION_ESTABLISHED)
                .data(Map.of(
                    "sessionId", session.getId(),
                    "serverTime", Instant.now().toString(),
                    "capabilities", getServerCapabilities()
                ))
                .timestamp(Instant.now())
                .build();
            
            sendMessage(session, welcomeMessage);
            
            // Deliver queued messages for offline user
            messageQueueService.deliverQueuedMessages(userId, session);
            
            log.info("WebSocket connection established for user: {} (session: {})", 
                    userId, session.getId());
            
        } catch (Exception e) {
            log.error("Error establishing WebSocket connection", e);
            session.close(CloseStatus.SERVER_ERROR);
        }
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            WebSocketMessage wsMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            SAMSWebSocketSession samsSession = connectionManager.getConnection(session.getId());
            
            if (samsSession == null) {
                log.warn("Received message from unregistered session: {}", session.getId());
                return;
            }
            
            // Update last activity
            samsSession.setLastHeartbeat(Instant.now());
            
            // Handle message based on type
            switch (wsMessage.getType()) {
                case HEARTBEAT:
                    handleHeartbeat(session, samsSession);
                    break;
                case SUBSCRIBE:
                    handleSubscription(session, samsSession, wsMessage);
                    break;
                case UNSUBSCRIBE:
                    handleUnsubscription(session, samsSession, wsMessage);
                    break;
                case ALERT_ACKNOWLEDGE:
                    handleAlertAcknowledgment(session, samsSession, wsMessage);
                    break;
                case ALERT_RESOLVE:
                    handleAlertResolution(session, samsSession, wsMessage);
                    break;
                case VOICE_COMMAND:
                    handleVoiceCommand(session, samsSession, wsMessage);
                    break;
                default:
                    log.warn("Unknown message type: {} from session: {}", 
                            wsMessage.getType(), session.getId());
            }
            
        } catch (Exception e) {
            log.error("Error handling WebSocket message from session: {}", session.getId(), e);
            sendErrorMessage(session, "Message processing error: " + e.getMessage());
        }
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket transport error for session: {}", session.getId(), exception);
        
        SAMSWebSocketSession samsSession = connectionManager.getConnection(session.getId());
        if (samsSession != null) {
            // Mark connection as having transport error
            samsSession.setHasTransportError(true);
            samsSession.setLastError(exception.getMessage());
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        try {
            SAMSWebSocketSession samsSession = connectionManager.removeConnection(session.getId());
            
            if (samsSession != null) {
                // Clean up subscriptions
                subscriptionService.removeAllSubscriptions(samsSession.getUserId(), session.getId());
                
                log.info("WebSocket connection closed for user: {} (session: {}, status: {})", 
                        samsSession.getUserId(), session.getId(), closeStatus);
            }
            
        } catch (Exception e) {
            log.error("Error cleaning up WebSocket connection", e);
        }
    }
    
    private void handleHeartbeat(WebSocketSession session, SAMSWebSocketSession samsSession) throws Exception {
        WebSocketMessage pongMessage = WebSocketMessage.builder()
            .type(MessageType.HEARTBEAT_RESPONSE)
            .data(Map.of(
                "serverTime", Instant.now().toString(),
                "connectionUptime", Duration.between(samsSession.getConnectedAt(), Instant.now()).toSeconds()
            ))
            .timestamp(Instant.now())
            .build();
        
        sendMessage(session, pongMessage);
    }
    
    private void handleSubscription(WebSocketSession session, SAMSWebSocketSession samsSession, 
                                  WebSocketMessage message) throws Exception {
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) message.getData();
        
        String subscriptionType = (String) data.get("type");
        Map<String, Object> filters = (Map<String, Object>) data.getOrDefault("filters", Map.of());
        
        Subscription subscription = subscriptionService.createSubscription(
            samsSession.getUserId(),
            samsSession.getOrganizationId(),
            session.getId(),
            subscriptionType,
            filters
        );
        
        samsSession.getSubscriptions().put(subscription.getId(), subscription);
        
        WebSocketMessage response = WebSocketMessage.builder()
            .type(MessageType.SUBSCRIPTION_CONFIRMED)
            .data(Map.of(
                "subscriptionId", subscription.getId(),
                "type", subscriptionType,
                "filters", filters
            ))
            .timestamp(Instant.now())
            .build();
        
        sendMessage(session, response);
        
        log.debug("Created subscription {} for user {} (session: {})", 
                subscription.getId(), samsSession.getUserId(), session.getId());
    }
    
    private void handleUnsubscription(WebSocketSession session, SAMSWebSocketSession samsSession, 
                                    WebSocketMessage message) throws Exception {
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) message.getData();
        String subscriptionId = (String) data.get("subscriptionId");
        
        if (subscriptionId != null) {
            subscriptionService.removeSubscription(subscriptionId);
            samsSession.getSubscriptions().remove(subscriptionId);
            
            WebSocketMessage response = WebSocketMessage.builder()
                .type(MessageType.UNSUBSCRIPTION_CONFIRMED)
                .data(Map.of("subscriptionId", subscriptionId))
                .timestamp(Instant.now())
                .build();
            
            sendMessage(session, response);
        }
    }
    
    private void handleAlertAcknowledgment(WebSocketSession session, SAMSWebSocketSession samsSession, 
                                         WebSocketMessage message) throws Exception {
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) message.getData();
        String alertId = (String) data.get("alertId");
        String notes = (String) data.get("notes");
        
        // Process alert acknowledgment through alert service
        broadcastService.processAlertAcknowledgment(alertId, samsSession.getUserId(), notes);
        
        WebSocketMessage response = WebSocketMessage.builder()
            .type(MessageType.ALERT_ACKNOWLEDGED)
            .data(Map.of(
                "alertId", alertId,
                "acknowledgedBy", samsSession.getUserId(),
                "acknowledgedAt", Instant.now().toString()
            ))
            .timestamp(Instant.now())
            .build();
        
        sendMessage(session, response);
    }
    
    private void handleVoiceCommand(WebSocketSession session, SAMSWebSocketSession samsSession, 
                                  WebSocketMessage message) throws Exception {
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) message.getData();
        String command = (String) data.get("command");
        String audioData = (String) data.get("audioData");
        
        // Process voice command through voice service
        broadcastService.processVoiceCommand(samsSession.getUserId(), command, audioData);
        
        WebSocketMessage response = WebSocketMessage.builder()
            .type(MessageType.VOICE_COMMAND_RECEIVED)
            .data(Map.of(
                "commandId", UUID.randomUUID().toString(),
                "status", "processing"
            ))
            .timestamp(Instant.now())
            .build();
        
        sendMessage(session, response);
    }
    
    private void sendMessage(WebSocketSession session, WebSocketMessage message) throws Exception {
        if (session.isOpen()) {
            String messageJson = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(messageJson));
        }
    }
    
    private void sendErrorMessage(WebSocketSession session, String error) throws Exception {
        WebSocketMessage errorMessage = WebSocketMessage.builder()
            .type(MessageType.ERROR)
            .data(Map.of("error", error))
            .timestamp(Instant.now())
            .build();
        
        sendMessage(session, errorMessage);
    }
    
    private Map<String, Object> getServerCapabilities() {
        return Map.of(
            "realTimeAlerts", true,
            "voiceCommands", true,
            "fileTransfer", false,
            "videoStreaming", false,
            "maxMessageSize", 64 * 1024,
            "supportedSubscriptions", List.of("alerts", "servers", "metrics", "system_events")
        );
    }
}
```

## **👥 User Subscription Management**

### **Subscription Service**
```java
// services/SubscriptionService.java
@Service
@Slf4j
public class SubscriptionService {
    
    private final Map<String, Subscription> subscriptions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> userSubscriptions = new ConcurrentHashMap<>();
    private final RedisTemplate<String, Object> redisTemplate;
    
    public SubscriptionService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    public Subscription createSubscription(String userId, String organizationId, 
                                         String sessionId, String type, 
                                         Map<String, Object> filters) {
        String subscriptionId = UUID.randomUUID().toString();
        
        Subscription subscription = Subscription.builder()
            .id(subscriptionId)
            .userId(userId)
            .organizationId(organizationId)
            .sessionId(sessionId)
            .type(SubscriptionType.valueOf(type.toUpperCase()))
            .filters(filters)
            .createdAt(Instant.now())
            .isActive(true)
            .build();
        
        // Store subscription
        subscriptions.put(subscriptionId, subscription);
        
        // Track user subscriptions
        userSubscriptions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet())
                        .add(subscriptionId);
        
        // Store in Redis for persistence
        storeSubscriptionInRedis(subscription);
        
        log.debug("Created subscription {} for user {} with type {} and filters {}", 
                subscriptionId, userId, type, filters);
        
        return subscription;
    }
    
    public void removeSubscription(String subscriptionId) {
        Subscription subscription = subscriptions.remove(subscriptionId);
        
        if (subscription != null) {
            // Remove from user subscriptions
            Set<String> userSubs = userSubscriptions.get(subscription.getUserId());
            if (userSubs != null) {
                userSubs.remove(subscriptionId);
                if (userSubs.isEmpty()) {
                    userSubscriptions.remove(subscription.getUserId());
                }
            }
            
            // Remove from Redis
            removeSubscriptionFromRedis(subscriptionId);
            
            log.debug("Removed subscription {} for user {}", 
                    subscriptionId, subscription.getUserId());
        }
    }
    
    public void removeAllSubscriptions(String userId, String sessionId) {
        Set<String> userSubs = userSubscriptions.get(userId);
        if (userSubs != null) {
            List<String> toRemove = userSubs.stream()
                .filter(subId -> {
                    Subscription sub = subscriptions.get(subId);
                    return sub != null && sub.getSessionId().equals(sessionId);
                })
                .collect(Collectors.toList());
            
            toRemove.forEach(this::removeSubscription);
        }
    }
    
    public List<Subscription> getMatchingSubscriptions(String organizationId, 
                                                      SubscriptionType type, 
                                                      Map<String, Object> eventData) {
        return subscriptions.values().stream()
            .filter(sub -> sub.isActive())
            .filter(sub -> sub.getOrganizationId().equals(organizationId))
            .filter(sub -> sub.getType() == type)
            .filter(sub -> matchesFilters(sub.getFilters(), eventData))
            .collect(Collectors.toList());
    }
    
    private boolean matchesFilters(Map<String, Object> filters, Map<String, Object> eventData) {
        if (filters == null || filters.isEmpty()) {
            return true; // No filters means match all
        }
        
        for (Map.Entry<String, Object> filter : filters.entrySet()) {
            String filterKey = filter.getKey();
            Object filterValue = filter.getValue();
            Object eventValue = eventData.get(filterKey);
            
            if (!matchesFilter(filterValue, eventValue)) {
                return false;
            }
        }
        
        return true;
    }
    
    private boolean matchesFilter(Object filterValue, Object eventValue) {
        if (filterValue == null) {
            return true;
        }
        
        if (eventValue == null) {
            return false;
        }
        
        // Handle different filter types
        if (filterValue instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> filterList = (List<Object>) filterValue;
            return filterList.contains(eventValue);
        }
        
        if (filterValue instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> filterMap = (Map<String, Object>) filterValue;
            
            // Handle range filters
            if (filterMap.containsKey("min") || filterMap.containsKey("max")) {
                return matchesRangeFilter(filterMap, eventValue);
            }
            
            // Handle regex filters
            if (filterMap.containsKey("regex")) {
                String regex = (String) filterMap.get("regex");
                return Pattern.matches(regex, eventValue.toString());
            }
        }
        
        // Default equality check
        return filterValue.equals(eventValue);
    }
    
    private boolean matchesRangeFilter(Map<String, Object> rangeFilter, Object eventValue) {
        if (!(eventValue instanceof Number)) {
            return false;
        }
        
        double value = ((Number) eventValue).doubleValue();
        
        if (rangeFilter.containsKey("min")) {
            double min = ((Number) rangeFilter.get("min")).doubleValue();
            if (value < min) {
                return false;
            }
        }
        
        if (rangeFilter.containsKey("max")) {
            double max = ((Number) rangeFilter.get("max")).doubleValue();
            if (value > max) {
                return false;
            }
        }
        
        return true;
    }
    
    private void storeSubscriptionInRedis(Subscription subscription) {
        try {
            String key = "subscription:" + subscription.getId();
            redisTemplate.opsForValue().set(key, subscription, Duration.ofHours(24));
        } catch (Exception e) {
            log.warn("Failed to store subscription in Redis: {}", subscription.getId(), e);
        }
    }
    
    private void removeSubscriptionFromRedis(String subscriptionId) {
        try {
            String key = "subscription:" + subscriptionId;
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.warn("Failed to remove subscription from Redis: {}", subscriptionId, e);
        }
    }
    
    public SubscriptionStats getSubscriptionStats() {
        Map<SubscriptionType, Long> typeStats = subscriptions.values().stream()
            .filter(Subscription::isActive)
            .collect(Collectors.groupingBy(
                Subscription::getType,
                Collectors.counting()
            ));
        
        return SubscriptionStats.builder()
            .totalSubscriptions(subscriptions.size())
            .activeSubscriptions(subscriptions.values().stream()
                .mapToInt(sub -> sub.isActive() ? 1 : 0)
                .sum())
            .uniqueUsers(userSubscriptions.size())
            .subscriptionsByType(typeStats)
            .build();
    }
}
```

---

*This comprehensive WebSocket implementation provides robust real-time communication with Spring Boot, featuring advanced subscription management, connection state handling, heartbeat mechanisms, fallback strategies, and message queuing for offline users with enterprise-grade reliability and performance.*
