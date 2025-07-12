package com.sams.enterprise.service;

import com.sams.enterprise.entity.User;
import com.sams.enterprise.entity.Role;
import com.sams.enterprise.entity.Permission;
import com.sams.enterprise.entity.UserSession;
import com.sams.enterprise.repository.UserRepository;
import com.sams.enterprise.repository.RoleRepository;
import com.sams.enterprise.repository.UserSessionRepository;
import com.sams.enterprise.security.JwtTokenProvider;
import com.sams.enterprise.dto.LoginRequest;
import com.sams.enterprise.dto.LoginResponse;
import com.sams.enterprise.dto.UserRegistrationRequest;
import com.sams.enterprise.exception.UserNotFoundException;
import com.sams.enterprise.exception.InvalidCredentialsException;
import com.sams.enterprise.exception.AccountLockedException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Enterprise User Management Service with RBAC Support
 */
@Service
@Transactional
public class UserManagementService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserSessionRepository userSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private NotificationService notificationService;

    /**
     * Authenticate user and create session
     */
    public LoginResponse authenticateUser(LoginRequest loginRequest, String ipAddress, String userAgent) {
        try {
            // Check if user exists and is not locked
            User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

            if (!user.isAccountNonLocked()) {
                throw new AccountLockedException("Account is locked due to multiple failed login attempts");
            }

            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(),
                    loginRequest.getPassword()
                )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Reset failed login attempts on successful authentication
            user.resetFailedLoginAttempts();
            userRepository.save(user);

            // Create session
            String sessionId = UUID.randomUUID().toString();
            String deviceInfo = jwtTokenProvider.generateDeviceFingerprint(userAgent, ipAddress);
            
            // Generate tokens
            String accessToken = jwtTokenProvider.generateAccessToken(authentication, sessionId, deviceInfo);
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername(), sessionId, deviceInfo);

            // Save session to database
            UserSession session = new UserSession(
                accessToken,
                refreshToken,
                user,
                deviceInfo,
                ipAddress,
                userAgent,
                LocalDateTime.now().plusMinutes(30) // 30 minutes expiry
            );
            userSessionRepository.save(session);

            // Invalidate old sessions if needed (keep only last 5 sessions)
            invalidateOldSessions(user, 5);

            // Send login notification
            notificationService.sendLoginNotification(user, ipAddress, userAgent);

            return new LoginResponse(
                accessToken,
                refreshToken,
                "Bearer",
                jwtTokenProvider.getExpirationFromToken(accessToken),
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getRoles().stream().map(Role::getName).toList(),
                user.getAuthorities().stream().map(auth -> auth.getAuthority()).toList()
            );

        } catch (Exception e) {
            // Increment failed login attempts
            userRepository.findByUsername(loginRequest.getUsername())
                .ifPresent(user -> {
                    user.incrementFailedLoginAttempts();
                    userRepository.save(user);
                });
            
            throw new InvalidCredentialsException("Invalid username or password");
        }
    }

    /**
     * Register new user
     */
    public User registerUser(UserRegistrationRequest request) {
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Create new user
        User user = new User(
            request.getUsername(),
            request.getEmail(),
            passwordEncoder.encode(request.getPassword()),
            request.getFirstName(),
            request.getLastName()
        );

        user.setPhoneNumber(request.getPhoneNumber());

        // Assign default role
        Role defaultRole = roleRepository.findByName(Role.VIEWER)
            .orElseThrow(() -> new IllegalStateException("Default role not found"));
        user.addRole(defaultRole);

        User savedUser = userRepository.save(user);

        // Send welcome notification
        notificationService.sendWelcomeNotification(savedUser);

        return savedUser;
    }

    /**
     * Refresh access token
     */
    public LoginResponse refreshToken(String refreshToken, String ipAddress, String userAgent) {
        if (!jwtTokenProvider.validateToken(refreshToken) || !jwtTokenProvider.isRefreshToken(refreshToken)) {
            throw new SecurityException("Invalid refresh token");
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        String sessionId = jwtTokenProvider.getSessionIdFromToken(refreshToken);

        // Verify session exists and is active
        UserSession session = userSessionRepository.findByRefreshTokenAndStatus(refreshToken, UserSession.SessionStatus.ACTIVE)
            .orElseThrow(() -> new SecurityException("Session not found or expired"));

        User user = session.getUser();

        // Create new authentication
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            user, null, user.getAuthorities()
        );

        // Generate new access token
        String deviceInfo = jwtTokenProvider.generateDeviceFingerprint(userAgent, ipAddress);
        String newAccessToken = jwtTokenProvider.generateAccessToken(authentication, sessionId, deviceInfo);

        // Update session
        session.setToken(newAccessToken);
        session.extendSession(30); // Extend by 30 minutes
        userSessionRepository.save(session);

        return new LoginResponse(
            newAccessToken,
            refreshToken,
            "Bearer",
            jwtTokenProvider.getExpirationFromToken(newAccessToken),
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            user.getEmail(),
            user.getRoles().stream().map(Role::getName).toList(),
            user.getAuthorities().stream().map(auth -> auth.getAuthority()).toList()
        );
    }

    /**
     * Logout user and invalidate session
     */
    public void logout(String accessToken) {
        String sessionId = jwtTokenProvider.getSessionIdFromToken(accessToken);
        
        userSessionRepository.findByToken(accessToken)
            .ifPresent(session -> {
                session.invalidate();
                userSessionRepository.save(session);
            });
    }

    /**
     * Logout from all devices
     */
    public void logoutFromAllDevices(Long userId) {
        List<UserSession> activeSessions = userSessionRepository.findByUserIdAndStatus(
            userId, UserSession.SessionStatus.ACTIVE
        );
        
        activeSessions.forEach(session -> {
            session.invalidate();
            userSessionRepository.save(session);
        });
    }

    /**
     * Assign role to user
     */
    public void assignRole(Long userId, String roleName) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        Role role = roleRepository.findByName(roleName)
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        
        user.addRole(role);
        userRepository.save(user);
    }

    /**
     * Remove role from user
     */
    public void removeRole(Long userId, String roleName) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        Role role = roleRepository.findByName(roleName)
            .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        
        user.removeRole(role);
        userRepository.save(user);
    }

    /**
     * Check if user has permission
     */
    public boolean hasPermission(Long userId, String permissionName) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        return user.hasPermission(permissionName);
    }

    /**
     * Get user by username
     */
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Get user by ID
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Update user profile
     */
    public User updateProfile(Long userId, String firstName, String lastName, String email, String phoneNumber) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        
        return userRepository.save(user);
    }

    /**
     * Change password
     */
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
        
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Invalidate all sessions to force re-login
        logoutFromAllDevices(userId);
    }

    /**
     * Invalidate old sessions (keep only the most recent N sessions)
     */
    private void invalidateOldSessions(User user, int keepCount) {
        List<UserSession> activeSessions = userSessionRepository.findByUserIdAndStatusOrderByCreatedAtDesc(
            user.getId(), UserSession.SessionStatus.ACTIVE
        );
        
        if (activeSessions.size() > keepCount) {
            List<UserSession> sessionsToInvalidate = activeSessions.subList(keepCount, activeSessions.size());
            sessionsToInvalidate.forEach(session -> {
                session.invalidate();
                userSessionRepository.save(session);
            });
        }
    }
}
