/**
 * 🔄 WebSocket Service - Enterprise Real-Time Communication
 * Robust WebSocket implementation with connection management and real-time broadcasting
 */

package com.monitoring.websocket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableScheduling
public class WebSocketApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebSocketApplication.class, args);
    }
}

/**
 * WebSocket configuration with security and CORS
 */
package com.monitoring.websocket.config;

import com.monitoring.websocket.handler.MonitoringWebSocketHandler;
import com.monitoring.websocket.interceptor.WebSocketAuthInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private MonitoringWebSocketHandler webSocketHandler;

    @Autowired
    private WebSocketAuthInterceptor authInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/ws/monitoring")
                .addInterceptors(authInterceptor)
                .setAllowedOriginPatterns("*") // Configure properly for production
                .withSockJS(); // Enable SockJS fallback
    }
}

/**
 * WebSocket authentication interceptor
 */
package com.monitoring.websocket.interceptor;

import com.monitoring.websocket.service.WebSocketAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    @Autowired
    private WebSocketAuthService authService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                 WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        
        logger.debug("WebSocket handshake attempt from: {}", request.getRemoteAddress());

        try {
            // Extract token from query parameters or headers
            String token = extractToken(request);
            
            if (token != null) {
                // Validate token and get user information
                WebSocketUserInfo userInfo = authService.validateTokenAndGetUser(token);
                
                if (userInfo != null) {
                    // Store user information in session attributes
                    attributes.put("userId", userInfo.getUserId());
                    attributes.put("username", userInfo.getUsername());
                    attributes.put("organizationId", userInfo.getOrganizationId());
                    attributes.put("roles", userInfo.getRoles());
                    
                    logger.info("WebSocket authentication successful for user: {}", userInfo.getUsername());
                    return true;
                }
            }
            
            logger.warn("WebSocket authentication failed for request from: {}", request.getRemoteAddress());
            return false;
            
        } catch (Exception e) {
            logger.error("Error during WebSocket authentication: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                             WebSocketHandler wsHandler, Exception exception) {
        if (exception != null) {
            logger.error("WebSocket handshake failed: {}", exception.getMessage(), exception);
        }
    }

    private String extractToken(ServerHttpRequest request) {
        // Try to get token from query parameter
        String token = request.getURI().getQuery();
        if (token != null && token.startsWith("token=")) {
            return token.substring(6);
        }
        
        // Try to get token from Authorization header
        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        
        return null;
    }
}

/**
 * WebSocket user information
 */
package com.monitoring.websocket.model;

import java.util.List;
import java.util.UUID;

public class WebSocketUserInfo {
    private UUID userId;
    private String username;
    private UUID organizationId;
    private List<String> roles;

    // Constructors
    public WebSocketUserInfo() {}

    public WebSocketUserInfo(UUID userId, String username, UUID organizationId, List<String> roles) {
        this.userId = userId;
        this.username = username;
        this.organizationId = organizationId;
        this.roles = roles;
    }

    // Getters and Setters
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
}

/**
 * WebSocket session management
 */
package com.monitoring.websocket.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "websocket_sessions", indexes = {
    @Index(name = "idx_ws_session_user", columnList = "user_id"),
    @Index(name = "idx_ws_session_status", columnList = "status"),
    @Index(name = "idx_ws_session_last_seen", columnList = "last_seen_at")
})
@EntityListeners(AuditingEntityListener.class)
public class WebSocketSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", unique = true, nullable = false)
    private String sessionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Enumerated(EnumType.STRING)
    private WebSocketSessionStatus status = WebSocketSessionStatus.CONNECTED;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "last_heartbeat_at")
    private LocalDateTime lastHeartbeatAt;

    @Column(name = "connection_count")
    private Integer connectionCount = 0;

    @Column(name = "message_count")
    private Long messageCount = 0L;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Business methods
    public void updateLastSeen() {
        this.lastSeenAt = LocalDateTime.now();
    }

    public void updateHeartbeat() {
        this.lastHeartbeatAt = LocalDateTime.now();
        this.lastSeenAt = LocalDateTime.now();
    }

    public void incrementMessageCount() {
        this.messageCount++;
    }

    public void incrementConnectionCount() {
        this.connectionCount++;
    }

    public boolean isActive() {
        return status == WebSocketSessionStatus.CONNECTED && 
               lastHeartbeatAt != null && 
               lastHeartbeatAt.isAfter(LocalDateTime.now().minusMinutes(2));
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public UUID getOrganizationId() { return organizationId; }
    public void setOrganizationId(UUID organizationId) { this.organizationId = organizationId; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public WebSocketSessionStatus getStatus() { return status; }
    public void setStatus(WebSocketSessionStatus status) { this.status = status; }

    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }

    public LocalDateTime getLastHeartbeatAt() { return lastHeartbeatAt; }
    public void setLastHeartbeatAt(LocalDateTime lastHeartbeatAt) { this.lastHeartbeatAt = lastHeartbeatAt; }

    public Integer getConnectionCount() { return connectionCount; }
    public void setConnectionCount(Integer connectionCount) { this.connectionCount = connectionCount; }

    public Long getMessageCount() { return messageCount; }
    public void setMessageCount(Long messageCount) { this.messageCount = messageCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

/**
 * WebSocket session status enumeration
 */
enum WebSocketSessionStatus {
    CONNECTED("Connected"),
    DISCONNECTED("Disconnected"),
    RECONNECTING("Reconnecting"),
    FAILED("Failed");

    private final String displayName;

    WebSocketSessionStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() { return displayName; }
}
