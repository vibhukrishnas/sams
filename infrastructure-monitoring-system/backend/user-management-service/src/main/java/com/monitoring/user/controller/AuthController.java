/**
 * 🔐 Authentication Controller - Enterprise Authentication API
 * Comprehensive authentication endpoints with JWT, MFA, and security features
 */

package com.monitoring.user.controller;

import com.monitoring.user.dto.*;
import com.monitoring.user.entity.User;
import com.monitoring.user.security.JwtTokenProvider;
import com.monitoring.user.service.AuthService;
import com.monitoring.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "User authentication and authorization endpoints")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    /**
     * User registration endpoint
     */
    @PostMapping("/register")
    @Operation(summary = "Register new user", description = "Register a new user account")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "User registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid registration data"),
        @ApiResponse(responseCode = "409", description = "User already exists")
    })
    public ResponseEntity<ApiResponse<UserDto>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        
        logger.info("User registration attempt for email: {}", request.getEmail());
        
        try {
            User user = authService.register(request, getClientIp(httpRequest));
            UserDto userDto = UserDto.fromEntity(user);
            
            logger.info("User registered successfully: {}", user.getUsername());
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("User registered successfully", userDto));
                    
        } catch (Exception e) {
            logger.error("Registration failed for email {}: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT tokens")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "423", description = "Account locked")
    })
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        
        logger.info("Login attempt for username: {}", request.getUsername());
        
        try {
            LoginResponse response = authService.login(request, getClientIp(httpRequest), getUserAgent(httpRequest));
            
            logger.info("Login successful for user: {}", request.getUsername());
            
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));
            
        } catch (Exception e) {
            logger.error("Login failed for username {}: {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Login failed: " + e.getMessage()));
        }
    }

    /**
     * Refresh token endpoint
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Generate new access token using refresh token")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
        @ApiResponse(responseCode = "401", description = "Invalid refresh token")
    })
    public ResponseEntity<ApiResponse<JwtTokenProvider.TokenResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        
        logger.info("Token refresh attempt");
        
        try {
            JwtTokenProvider.TokenResponse response = authService.refreshToken(request.getRefreshToken());
            
            logger.info("Token refreshed successfully");
            
            return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
            
        } catch (Exception e) {
            logger.error("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Token refresh failed: " + e.getMessage()));
        }
    }

    /**
     * Logout endpoint
     */
    @PostMapping("/logout")
    @Operation(summary = "User logout", description = "Invalidate user session and tokens")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logout successful"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<String>> logout(
            HttpServletRequest request) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal();
            String token = tokenProvider.extractTokenFromHeader(request.getHeader("Authorization"));
            
            logger.info("Logout attempt for user: {}", user.getUsername());
            
            try {
                authService.logout(user.getId(), token);
                
                logger.info("Logout successful for user: {}", user.getUsername());
                
                return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
                
            } catch (Exception e) {
                logger.error("Logout failed for user {}: {}", user.getUsername(), e.getMessage());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Logout failed: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("User not authenticated"));
    }

    /**
     * Forgot password endpoint
     */
    @PostMapping("/forgot-password")
    @Operation(summary = "Forgot password", description = "Send password reset email")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password reset email sent"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        
        logger.info("Password reset request for email: {}", request.getEmail());
        
        try {
            authService.forgotPassword(request.getEmail());
            
            logger.info("Password reset email sent for: {}", request.getEmail());
            
            return ResponseEntity.ok(ApiResponse.success("Password reset email sent", null));
            
        } catch (Exception e) {
            logger.error("Password reset failed for email {}: {}", request.getEmail(), e.getMessage());
            // Don't reveal if email exists or not for security
            return ResponseEntity.ok(ApiResponse.success("If the email exists, a password reset link has been sent", null));
        }
    }

    /**
     * Reset password endpoint
     */
    @PostMapping("/reset-password")
    @Operation(summary = "Reset password", description = "Reset password using reset token")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password reset successful"),
        @ApiResponse(responseCode = "400", description = "Invalid reset token")
    })
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        
        logger.info("Password reset attempt with token");
        
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword());
            
            logger.info("Password reset successful");
            
            return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
            
        } catch (Exception e) {
            logger.error("Password reset failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Password reset failed: " + e.getMessage()));
        }
    }

    /**
     * Change password endpoint
     */
    @PostMapping("/change-password")
    @Operation(summary = "Change password", description = "Change user password")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password changed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid current password"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal();
            
            logger.info("Password change attempt for user: {}", user.getUsername());
            
            try {
                authService.changePassword(user.getId(), request.getCurrentPassword(), request.getNewPassword());
                
                logger.info("Password changed successfully for user: {}", user.getUsername());
                
                return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
                
            } catch (Exception e) {
                logger.error("Password change failed for user {}: {}", user.getUsername(), e.getMessage());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Password change failed: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("User not authenticated"));
    }

    /**
     * Verify email endpoint
     */
    @PostMapping("/verify-email")
    @Operation(summary = "Verify email", description = "Verify user email address")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Email verified successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid verification token")
    })
    public ResponseEntity<ApiResponse<String>> verifyEmail(
            @RequestParam("token") String token) {
        
        logger.info("Email verification attempt with token");
        
        try {
            authService.verifyEmail(token);
            
            logger.info("Email verified successfully");
            
            return ResponseEntity.ok(ApiResponse.success("Email verified successfully", null));
            
        } catch (Exception e) {
            logger.error("Email verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email verification failed: " + e.getMessage()));
        }
    }

    /**
     * Get current user profile
     */
    @GetMapping("/profile")
    @Operation(summary = "Get current user profile", description = "Get authenticated user's profile information")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<UserDto>> getProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal();
            UserDto userDto = UserDto.fromEntity(user);
            
            return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", userDto));
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("User not authenticated"));
    }

    /**
     * Update user profile
     */
    @PutMapping("/profile")
    @Operation(summary = "Update user profile", description = "Update authenticated user's profile information")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid profile data"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal();
            
            logger.info("Profile update attempt for user: {}", user.getUsername());
            
            try {
                User updatedUser = userService.updateProfile(user.getId(), request);
                UserDto userDto = UserDto.fromEntity(updatedUser);
                
                logger.info("Profile updated successfully for user: {}", user.getUsername());
                
                return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", userDto));
                
            } catch (Exception e) {
                logger.error("Profile update failed for user {}: {}", user.getUsername(), e.getMessage());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Profile update failed: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("User not authenticated"));
    }

    /**
     * Get user sessions
     */
    @GetMapping("/sessions")
    @Operation(summary = "Get user sessions", description = "Get all active sessions for the authenticated user")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Sessions retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<ApiResponse<Object>> getSessions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal();
            
            try {
                Object sessions = authService.getUserSessions(user.getId());
                
                return ResponseEntity.ok(ApiResponse.success("Sessions retrieved successfully", sessions));
                
            } catch (Exception e) {
                logger.error("Failed to retrieve sessions for user {}: {}", user.getUsername(), e.getMessage());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Failed to retrieve sessions: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("User not authenticated"));
    }

    /**
     * Revoke session
     */
    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Revoke session", description = "Revoke a specific user session")
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Session revoked successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Session not found")
    })
    public ResponseEntity<ApiResponse<String>> revokeSession(
            @PathVariable UUID sessionId) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            User user = (User) authentication.getPrincipal();
            
            try {
                authService.revokeSession(user.getId(), sessionId);
                
                return ResponseEntity.ok(ApiResponse.success("Session revoked successfully", null));
                
            } catch (Exception e) {
                logger.error("Failed to revoke session {} for user {}: {}", sessionId, user.getUsername(), e.getMessage());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Failed to revoke session: " + e.getMessage()));
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("User not authenticated"));
    }

    // Helper methods
    private String getClientIp(HttpServletRequest request) {
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

    private String getUserAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
