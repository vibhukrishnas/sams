package com.sams.enterprise.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.sams.enterprise.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Enterprise JWT Token Provider with Advanced Security Features
 */
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration}")
    private long jwtRefreshExpirationMs;

    private static final String AUTHORITIES_KEY = "authorities";
    private static final String USER_ID_KEY = "userId";
    private static final String SESSION_ID_KEY = "sessionId";
    private static final String TOKEN_TYPE_KEY = "tokenType";
    private static final String DEVICE_INFO_KEY = "deviceInfo";

    /**
     * Generate JWT access token
     */
    public String generateAccessToken(Authentication authentication, String sessionId, String deviceInfo) {
        User user = (User) authentication.getPrincipal();
        
        List<String> authorities = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

        Date expiryDate = new Date(System.currentTimeMillis() + jwtExpirationMs);

        return JWT.create()
            .withSubject(user.getUsername())
            .withClaim(USER_ID_KEY, user.getId())
            .withClaim(SESSION_ID_KEY, sessionId)
            .withClaim(TOKEN_TYPE_KEY, "ACCESS")
            .withClaim(AUTHORITIES_KEY, authorities)
            .withClaim(DEVICE_INFO_KEY, deviceInfo)
            .withIssuedAt(new Date())
            .withExpiresAt(expiryDate)
            .withIssuer("SAMS-Enterprise")
            .withJWTId(UUID.randomUUID().toString())
            .sign(Algorithm.HMAC512(jwtSecret));
    }

    /**
     * Generate JWT refresh token
     */
    public String generateRefreshToken(String username, String sessionId, String deviceInfo) {
        Date expiryDate = new Date(System.currentTimeMillis() + jwtRefreshExpirationMs);

        return JWT.create()
            .withSubject(username)
            .withClaim(SESSION_ID_KEY, sessionId)
            .withClaim(TOKEN_TYPE_KEY, "REFRESH")
            .withClaim(DEVICE_INFO_KEY, deviceInfo)
            .withIssuedAt(new Date())
            .withExpiresAt(expiryDate)
            .withIssuer("SAMS-Enterprise")
            .withJWTId(UUID.randomUUID().toString())
            .sign(Algorithm.HMAC512(jwtSecret));
    }

    /**
     * Get username from JWT token
     */
    public String getUsernameFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getSubject();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Get user ID from JWT token
     */
    public Long getUserIdFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getClaim(USER_ID_KEY).asLong();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Get session ID from JWT token
     */
    public String getSessionIdFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getClaim(SESSION_ID_KEY).asString();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Get authorities from JWT token
     */
    @SuppressWarnings("unchecked")
    public List<String> getAuthoritiesFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getClaim(AUTHORITIES_KEY).asList(String.class);
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Get token type from JWT token
     */
    public String getTokenTypeFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getClaim(TOKEN_TYPE_KEY).asString();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Get device info from JWT token
     */
    public String getDeviceInfoFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getClaim(DEVICE_INFO_KEY).asString();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Get expiration date from JWT token
     */
    public LocalDateTime getExpirationFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getExpiresAt().toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Validate JWT token
     */
    public boolean validateToken(String token) {
        try {
            verifyToken(token);
            return true;
        } catch (JWTVerificationException e) {
            return false;
        }
    }

    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getExpiresAt().before(new Date());
        } catch (JWTVerificationException e) {
            return true;
        }
    }

    /**
     * Check if token is access token
     */
    public boolean isAccessToken(String token) {
        try {
            return "ACCESS".equals(getTokenTypeFromToken(token));
        } catch (SecurityException e) {
            return false;
        }
    }

    /**
     * Check if token is refresh token
     */
    public boolean isRefreshToken(String token) {
        try {
            return "REFRESH".equals(getTokenTypeFromToken(token));
        } catch (SecurityException e) {
            return false;
        }
    }

    /**
     * Get JWT ID from token
     */
    public String getJwtIdFromToken(String token) {
        try {
            DecodedJWT jwt = verifyToken(token);
            return jwt.getId();
        } catch (JWTVerificationException e) {
            throw new SecurityException("Invalid JWT token", e);
        }
    }

    /**
     * Verify and decode JWT token
     */
    private DecodedJWT verifyToken(String token) throws JWTVerificationException {
        Algorithm algorithm = Algorithm.HMAC512(jwtSecret);
        JWTVerifier verifier = JWT.require(algorithm)
            .withIssuer("SAMS-Enterprise")
            .build();
        
        return verifier.verify(token);
    }

    /**
     * Extract token from Authorization header
     */
    public String extractTokenFromHeader(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    /**
     * Generate device fingerprint
     */
    public String generateDeviceFingerprint(String userAgent, String ipAddress) {
        return UUID.nameUUIDFromBytes((userAgent + ipAddress).getBytes()).toString();
    }
}
