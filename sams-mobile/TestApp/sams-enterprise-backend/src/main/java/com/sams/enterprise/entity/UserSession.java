package com.sams.enterprise.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * Enterprise User Session Entity for Session Management
 */
@Entity
@Table(name = "user_sessions", indexes = {
    @Index(name = "idx_session_token", columnList = "token"),
    @Index(name = "idx_session_user", columnList = "user_id"),
    @Index(name = "idx_session_expires", columnList = "expires_at")
})
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false, length = 255)
    private String token;

    @NotBlank
    @Column(name = "refresh_token", unique = true, nullable = false, length = 255)
    private String refreshToken;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status = SessionStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;

    @Column(name = "invalidated_at")
    private LocalDateTime invalidatedAt;

    // Constructors
    public UserSession() {}

    public UserSession(String token, String refreshToken, User user, String deviceInfo, 
                      String ipAddress, String userAgent, LocalDateTime expiresAt) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.user = user;
        this.deviceInfo = deviceInfo;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
        this.lastAccessedAt = LocalDateTime.now();
    }

    // Business Methods
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isActive() {
        return status == SessionStatus.ACTIVE && !isExpired();
    }

    public void invalidate() {
        this.status = SessionStatus.INVALIDATED;
        this.invalidatedAt = LocalDateTime.now();
    }

    public void updateLastAccessed() {
        this.lastAccessedAt = LocalDateTime.now();
    }

    public void extendSession(long minutes) {
        this.expiresAt = LocalDateTime.now().plusMinutes(minutes);
        updateLastAccessed();
    }

    // Lifecycle Callbacks
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (lastAccessedAt == null) {
            lastAccessedAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getLastAccessedAt() { return lastAccessedAt; }
    public void setLastAccessedAt(LocalDateTime lastAccessedAt) { this.lastAccessedAt = lastAccessedAt; }

    public LocalDateTime getInvalidatedAt() { return invalidatedAt; }
    public void setInvalidatedAt(LocalDateTime invalidatedAt) { this.invalidatedAt = invalidatedAt; }

    // Enums
    public enum SessionStatus {
        ACTIVE, EXPIRED, INVALIDATED, REVOKED
    }
}
