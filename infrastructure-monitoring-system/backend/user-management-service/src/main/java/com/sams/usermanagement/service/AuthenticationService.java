package com.sams.usermanagement.service;

import com.sams.usermanagement.dto.LoginRequest;
import com.sams.usermanagement.dto.LoginResponse;
import com.sams.usermanagement.dto.RefreshTokenRequest;
import com.sams.usermanagement.entity.User;
import com.sams.usermanagement.entity.UserStatus;
import com.sams.usermanagement.exception.AuthenticationException;
import com.sams.usermanagement.exception.UserNotFoundException;
import com.sams.usermanagement.repository.UserRepository;
import com.sams.usermanagement.security.JwtTokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

/**
 * Authentication Service for SAMS User Management
 * 
 * Provides comprehensive authentication functionality including:
 * - User login with JWT token generation
 * - Token refresh mechanism
 * - Account lockout protection
 * - Login attempt tracking
 * - Session management with Redis
 * - LDAP authentication support
 */
@Service
@Transactional
public class AuthenticationService {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationService.class);

    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final String BLACKLIST_TOKEN_PREFIX = "blacklist_token:";
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 30;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenUtil jwtTokenUtil;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private AuditService auditService;

    @Autowired
    private LdapAuthenticationService ldapAuthenticationService;

    /**
     * Authenticate user and generate JWT tokens
     */
    public LoginResponse login(LoginRequest request) {
        logger.info("Login attempt for user: {}", request.getUsername());

        // Find user by username or email
        User user = userRepository.findByUsernameOrEmailIgnoreCase(request.getUsername())
                .orElseThrow(() -> new UserNotFoundException("User not found: " + request.getUsername()));

        // Check account status
        validateUserAccount(user);

        // Authenticate user
        boolean authenticated = false;
        
        if (user.getIsLdapUser()) {
            // LDAP authentication
            authenticated = ldapAuthenticationService.authenticate(user.getUsername(), request.getPassword());
        } else {
            // Local authentication
            authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        }

        if (!authenticated) {
            handleFailedLogin(user);
            throw new AuthenticationException("Invalid credentials");
        }

        // Handle successful login
        handleSuccessfulLogin(user);

        // Generate tokens
        String accessToken = jwtTokenUtil.generateAccessToken(user);
        String refreshToken = jwtTokenUtil.generateRefreshToken(user);

        // Store refresh token in Redis
        storeRefreshToken(user.getId(), refreshToken);

        // Audit log
        auditService.logUserLogin(user.getId(), request.getIpAddress(), request.getUserAgent());

        logger.info("User logged in successfully: {} (ID: {})", user.getUsername(), user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(900L) // 15 minutes
                .user(convertToUserInfo(user))
                .build();
    }

    /**
     * Refresh access token using refresh token
     */
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        logger.info("Token refresh attempt");

        // Validate refresh token
        if (!jwtTokenUtil.isValidRefreshToken(request.getRefreshToken())) {
            throw new AuthenticationException("Invalid refresh token");
        }

        // Extract user information from token
        String username = jwtTokenUtil.getUsernameFromToken(request.getRefreshToken());
        Long userId = jwtTokenUtil.getUserIdFromToken(request.getRefreshToken());

        // Verify refresh token exists in Redis
        String storedToken = redisTemplate.opsForValue().get(REFRESH_TOKEN_PREFIX + userId);
        if (storedToken == null || !storedToken.equals(request.getRefreshToken())) {
            throw new AuthenticationException("Refresh token not found or expired");
        }

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Check account status
        validateUserAccount(user);

        // Generate new tokens
        String newAccessToken = jwtTokenUtil.generateAccessToken(user);
        String newRefreshToken = jwtTokenUtil.generateRefreshToken(user);

        // Update refresh token in Redis
        storeRefreshToken(user.getId(), newRefreshToken);

        // Audit log
        auditService.logTokenRefresh(user.getId());

        logger.info("Token refreshed successfully for user: {} (ID: {})", user.getUsername(), user.getId());

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(900L) // 15 minutes
                .user(convertToUserInfo(user))
                .build();
    }

    /**
     * Logout user and invalidate tokens
     */
    public void logout(String accessToken, String refreshToken, Long userId) {
        logger.info("Logout for user: {}", userId);

        // Blacklist access token
        if (accessToken != null) {
            blacklistToken(accessToken);
        }

        // Remove refresh token from Redis
        if (refreshToken != null && userId != null) {
            redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);
        }

        // Audit log
        if (userId != null) {
            auditService.logUserLogout(userId);
        }

        logger.info("User logged out successfully: {}", userId);
    }

    /**
     * Logout from all devices (invalidate all refresh tokens for user)
     */
    public void logoutFromAllDevices(Long userId) {
        logger.info("Logout from all devices for user: {}", userId);

        // Remove all refresh tokens for this user
        redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);

        // Audit log
        auditService.logUserLogoutAllDevices(userId);

        logger.info("User logged out from all devices: {}", userId);
    }

    /**
     * Check if token is blacklisted
     */
    public boolean isTokenBlacklisted(String token) {
        return redisTemplate.hasKey(BLACKLIST_TOKEN_PREFIX + token);
    }

    /**
     * Validate user account status and constraints
     */
    private void validateUserAccount(User user) {
        // Check if account is active
        if (!user.getStatus().canLogin()) {
            throw new AuthenticationException("Account is " + user.getStatus().getDisplayName().toLowerCase());
        }

        // Check if account is locked
        if (user.isAccountLocked()) {
            throw new AuthenticationException("Account is temporarily locked due to multiple failed login attempts");
        }

        // Check if password is expired (for local users)
        if (!user.getIsLdapUser() && user.isPasswordExpired()) {
            throw new AuthenticationException("Password has expired. Please contact administrator.");
        }
    }

    /**
     * Handle failed login attempt
     */
    private void handleFailedLogin(User user) {
        user.incrementFailedLoginAttempts();
        
        if (user.getFailedLoginAttempts() >= MAX_LOGIN_ATTEMPTS) {
            user.setAccountLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
            logger.warn("Account locked due to {} failed login attempts: {} (ID: {})", 
                       MAX_LOGIN_ATTEMPTS, user.getUsername(), user.getId());
        }

        userRepository.save(user);

        // Audit log
        auditService.logFailedLogin(user.getId());
    }

    /**
     * Handle successful login
     */
    private void handleSuccessfulLogin(User user) {
        // Reset failed login attempts
        user.resetFailedLoginAttempts();
        user.setLastLogin(LocalDateTime.now());
        
        userRepository.save(user);
    }

    /**
     * Store refresh token in Redis with expiration
     */
    private void storeRefreshToken(Long userId, String refreshToken) {
        String key = REFRESH_TOKEN_PREFIX + userId;
        redisTemplate.opsForValue().set(key, refreshToken, 7, TimeUnit.DAYS); // 7 days expiration
    }

    /**
     * Blacklist access token
     */
    private void blacklistToken(String token) {
        LocalDateTime expirationDate = jwtTokenUtil.getExpirationDateFromToken(token);
        if (expirationDate != null) {
            long ttlSeconds = java.time.Duration.between(LocalDateTime.now(), expirationDate).getSeconds();
            if (ttlSeconds > 0) {
                redisTemplate.opsForValue().set(BLACKLIST_TOKEN_PREFIX + token, "blacklisted", ttlSeconds, TimeUnit.SECONDS);
            }
        }
    }

    /**
     * Convert User entity to UserInfo for response
     */
    private LoginResponse.UserInfo convertToUserInfo(User user) {
        return LoginResponse.UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(user.getRoles().stream()
                        .map(role -> role.getName())
                        .toList())
                .permissions(user.getRoles().stream()
                        .flatMap(role -> role.getPermissions().stream())
                        .map(permission -> permission.getName())
                        .distinct()
                        .toList())
                .mustChangePassword(user.getMustChangePassword())
                .twoFactorEnabled(user.getTwoFactorEnabled())
                .build();
    }
}
