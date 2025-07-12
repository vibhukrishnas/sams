package com.sams.usermanagement.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.sams.usermanagement.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

/**
 * JWT Token Utility for SAMS User Management
 * 
 * Provides comprehensive JWT token management including:
 * - Access token generation and validation
 * - Refresh token generation and validation
 * - Token expiration handling
 * - User claims extraction
 * - Security features (issuer, audience validation)
 */
@Component
public class JwtTokenUtil {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenUtil.class);

    // Token types
    public static final String ACCESS_TOKEN_TYPE = "access";
    public static final String REFRESH_TOKEN_TYPE = "refresh";

    // Claim names
    public static final String CLAIM_USER_ID = "userId";
    public static final String CLAIM_USERNAME = "username";
    public static final String CLAIM_EMAIL = "email";
    public static final String CLAIM_ROLES = "roles";
    public static final String CLAIM_PERMISSIONS = "permissions";
    public static final String CLAIM_TOKEN_TYPE = "tokenType";
    public static final String CLAIM_FULL_NAME = "fullName";

    @Value("${sams.jwt.secret:sams-secret-key-change-in-production}")
    private String jwtSecret;

    @Value("${sams.jwt.issuer:sams-user-management}")
    private String jwtIssuer;

    @Value("${sams.jwt.audience:sams-infrastructure-monitoring}")
    private String jwtAudience;

    @Value("${sams.jwt.access-token-expiration:900}") // 15 minutes
    private Long accessTokenExpiration;

    @Value("${sams.jwt.refresh-token-expiration:604800}") // 7 days
    private Long refreshTokenExpiration;

    /**
     * Generate access token for authenticated user
     */
    public String generateAccessToken(User user) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            
            List<String> roles = user.getRoles().stream()
                    .map(role -> role.getName())
                    .collect(Collectors.toList());
            
            List<String> permissions = user.getRoles().stream()
                    .flatMap(role -> role.getPermissions().stream())
                    .map(permission -> permission.getName())
                    .distinct()
                    .collect(Collectors.toList());

            return JWT.create()
                    .withIssuer(jwtIssuer)
                    .withAudience(jwtAudience)
                    .withSubject(user.getUsername())
                    .withClaim(CLAIM_USER_ID, user.getId())
                    .withClaim(CLAIM_USERNAME, user.getUsername())
                    .withClaim(CLAIM_EMAIL, user.getEmail())
                    .withClaim(CLAIM_FULL_NAME, user.getFullName())
                    .withClaim(CLAIM_ROLES, roles)
                    .withClaim(CLAIM_PERMISSIONS, permissions)
                    .withClaim(CLAIM_TOKEN_TYPE, ACCESS_TOKEN_TYPE)
                    .withIssuedAt(new Date())
                    .withExpiresAt(new Date(System.currentTimeMillis() + accessTokenExpiration * 1000))
                    .sign(algorithm);
                    
        } catch (JWTCreationException e) {
            logger.error("Error creating access token for user: {}", user.getUsername(), e);
            throw new RuntimeException("Failed to create access token", e);
        }
    }

    /**
     * Generate refresh token for authenticated user
     */
    public String generateRefreshToken(User user) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);

            return JWT.create()
                    .withIssuer(jwtIssuer)
                    .withAudience(jwtAudience)
                    .withSubject(user.getUsername())
                    .withClaim(CLAIM_USER_ID, user.getId())
                    .withClaim(CLAIM_USERNAME, user.getUsername())
                    .withClaim(CLAIM_TOKEN_TYPE, REFRESH_TOKEN_TYPE)
                    .withIssuedAt(new Date())
                    .withExpiresAt(new Date(System.currentTimeMillis() + refreshTokenExpiration * 1000))
                    .sign(algorithm);
                    
        } catch (JWTCreationException e) {
            logger.error("Error creating refresh token for user: {}", user.getUsername(), e);
            throw new RuntimeException("Failed to create refresh token", e);
        }
    }

    /**
     * Validate and decode JWT token
     */
    public DecodedJWT validateToken(String token) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(jwtIssuer)
                    .withAudience(jwtAudience)
                    .build();
            
            return verifier.verify(token);
            
        } catch (JWTVerificationException e) {
            logger.debug("Token validation failed: {}", e.getMessage());
            throw new RuntimeException("Invalid token", e);
        }
    }

    /**
     * Extract username from token
     */
    public String getUsernameFromToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return decodedJWT.getSubject();
        } catch (Exception e) {
            logger.debug("Failed to extract username from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extract user ID from token
     */
    public Long getUserIdFromToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return decodedJWT.getClaim(CLAIM_USER_ID).asLong();
        } catch (Exception e) {
            logger.debug("Failed to extract user ID from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extract roles from token
     */
    public List<String> getRolesFromToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return decodedJWT.getClaim(CLAIM_ROLES).asList(String.class);
        } catch (Exception e) {
            logger.debug("Failed to extract roles from token: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Extract permissions from token
     */
    public List<String> getPermissionsFromToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return decodedJWT.getClaim(CLAIM_PERMISSIONS).asList(String.class);
        } catch (Exception e) {
            logger.debug("Failed to extract permissions from token: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Get token type (access or refresh)
     */
    public String getTokenType(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return decodedJWT.getClaim(CLAIM_TOKEN_TYPE).asString();
        } catch (Exception e) {
            logger.debug("Failed to extract token type: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return decodedJWT.getExpiresAt().before(new Date());
        } catch (Exception e) {
            return true; // Consider invalid tokens as expired
        }
    }

    /**
     * Get token expiration date
     */
    public LocalDateTime getExpirationDateFromToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return LocalDateTime.ofInstant(
                decodedJWT.getExpiresAt().toInstant(), 
                ZoneId.systemDefault()
            );
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Get token issued date
     */
    public LocalDateTime getIssuedDateFromToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            return LocalDateTime.ofInstant(
                decodedJWT.getIssuedAt().toInstant(), 
                ZoneId.systemDefault()
            );
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Check if token can be refreshed (not expired and is refresh token)
     */
    public boolean canTokenBeRefreshed(String token) {
        try {
            return !isTokenExpired(token) && REFRESH_TOKEN_TYPE.equals(getTokenType(token));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Validate access token specifically
     */
    public boolean isValidAccessToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            String tokenType = decodedJWT.getClaim(CLAIM_TOKEN_TYPE).asString();
            return ACCESS_TOKEN_TYPE.equals(tokenType) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Validate refresh token specifically
     */
    public boolean isValidRefreshToken(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            String tokenType = decodedJWT.getClaim(CLAIM_TOKEN_TYPE).asString();
            return REFRESH_TOKEN_TYPE.equals(tokenType) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extract all claims from token as a readable format
     */
    public TokenClaims extractAllClaims(String token) {
        try {
            DecodedJWT decodedJWT = validateToken(token);
            
            return TokenClaims.builder()
                    .userId(decodedJWT.getClaim(CLAIM_USER_ID).asLong())
                    .username(decodedJWT.getClaim(CLAIM_USERNAME).asString())
                    .email(decodedJWT.getClaim(CLAIM_EMAIL).asString())
                    .fullName(decodedJWT.getClaim(CLAIM_FULL_NAME).asString())
                    .roles(decodedJWT.getClaim(CLAIM_ROLES).asList(String.class))
                    .permissions(decodedJWT.getClaim(CLAIM_PERMISSIONS).asList(String.class))
                    .tokenType(decodedJWT.getClaim(CLAIM_TOKEN_TYPE).asString())
                    .issuedAt(LocalDateTime.ofInstant(decodedJWT.getIssuedAt().toInstant(), ZoneId.systemDefault()))
                    .expiresAt(LocalDateTime.ofInstant(decodedJWT.getExpiresAt().toInstant(), ZoneId.systemDefault()))
                    .build();
                    
        } catch (Exception e) {
            logger.debug("Failed to extract claims from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Token Claims Data Transfer Object
     */
    public static class TokenClaims {
        private Long userId;
        private String username;
        private String email;
        private String fullName;
        private List<String> roles;
        private List<String> permissions;
        private String tokenType;
        private LocalDateTime issuedAt;
        private LocalDateTime expiresAt;

        // Builder pattern
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private TokenClaims claims = new TokenClaims();

            public Builder userId(Long userId) { claims.userId = userId; return this; }
            public Builder username(String username) { claims.username = username; return this; }
            public Builder email(String email) { claims.email = email; return this; }
            public Builder fullName(String fullName) { claims.fullName = fullName; return this; }
            public Builder roles(List<String> roles) { claims.roles = roles; return this; }
            public Builder permissions(List<String> permissions) { claims.permissions = permissions; return this; }
            public Builder tokenType(String tokenType) { claims.tokenType = tokenType; return this; }
            public Builder issuedAt(LocalDateTime issuedAt) { claims.issuedAt = issuedAt; return this; }
            public Builder expiresAt(LocalDateTime expiresAt) { claims.expiresAt = expiresAt; return this; }

            public TokenClaims build() { return claims; }
        }

        // Getters
        public Long getUserId() { return userId; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getFullName() { return fullName; }
        public List<String> getRoles() { return roles; }
        public List<String> getPermissions() { return permissions; }
        public String getTokenType() { return tokenType; }
        public LocalDateTime getIssuedAt() { return issuedAt; }
        public LocalDateTime getExpiresAt() { return expiresAt; }
    }
}
