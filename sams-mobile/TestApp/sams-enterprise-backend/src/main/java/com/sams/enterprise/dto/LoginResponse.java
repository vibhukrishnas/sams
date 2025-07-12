package com.sams.enterprise.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Login Response DTO
 */
public class LoginResponse {
    
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private LocalDateTime expiresAt;
    private Long userId;
    private String username;
    private String fullName;
    private String email;
    private List<String> roles;
    private List<String> permissions;
    
    // Constructors
    public LoginResponse() {}
    
    public LoginResponse(String accessToken, String refreshToken, String tokenType, 
                        LocalDateTime expiresAt, Long userId, String username, 
                        String fullName, String email, List<String> roles, List<String> permissions) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType;
        this.expiresAt = expiresAt;
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.roles = roles;
        this.permissions = permissions;
    }
    
    // Getters and setters
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
    
    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }
}
