package com.sams.enterprise.controller;

import com.sams.enterprise.dto.LoginRequest;
import com.sams.enterprise.dto.LoginResponse;
import com.sams.enterprise.dto.UserRegistrationRequest;
import com.sams.enterprise.dto.RefreshTokenRequest;
import com.sams.enterprise.entity.User;
import com.sams.enterprise.service.UserManagementService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * Enterprise Authentication REST Controller
 */
@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserManagementService userManagementService;

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest,
                                             HttpServletRequest request) {
        try {
            String ipAddress = getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");
            
            LoginResponse response = userManagementService.authenticateUser(loginRequest, ipAddress, userAgent);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * User registration endpoint
     */
    @PostMapping("/register")
    public ResponseEntity<User> register(@Valid @RequestBody UserRegistrationRequest registrationRequest) {
        try {
            User user = userManagementService.registerUser(registrationRequest);
            return ResponseEntity.ok(user);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Refresh token endpoint
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshRequest,
                                                    HttpServletRequest request) {
        try {
            String ipAddress = getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");
            
            LoginResponse response = userManagementService.refreshToken(
                refreshRequest.getRefreshToken(), ipAddress, userAgent);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Logout endpoint
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractTokenFromHeader(authHeader);
            userManagementService.logout(token);
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Logout from all devices endpoint
     */
    @PostMapping("/logout-all")
    public ResponseEntity<Void> logoutFromAllDevices(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract user ID from token and logout from all devices
            // Implementation would require token parsing
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Validate token endpoint
     */
    @PostMapping("/validate")
    public ResponseEntity<Boolean> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractTokenFromHeader(authHeader);
            // Validate token logic here
            return ResponseEntity.ok(true);
            
        } catch (Exception e) {
            return ResponseEntity.ok(false);
        }
    }

    /**
     * Get current user info
     */
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract user from token and return user info
            // Implementation would require token parsing and user lookup
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Change password endpoint
     */
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestHeader("Authorization") String authHeader,
                                             @RequestBody ChangePasswordRequest request) {
        try {
            // Extract user ID from token
            // userManagementService.changePassword(userId, request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Extract token from Authorization header
     */
    private String extractTokenFromHeader(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new IllegalArgumentException("Invalid authorization header");
    }

    /**
     * Get client IP address
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    /**
     * Change password request DTO
     */
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        // Getters and setters
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}
