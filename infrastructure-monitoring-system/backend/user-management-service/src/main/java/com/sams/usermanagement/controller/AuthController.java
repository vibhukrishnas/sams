package com.sams.usermanagement.controller;

import com.sams.usermanagement.dto.LoginRequest;
import com.sams.usermanagement.dto.LoginResponse;
import com.sams.usermanagement.dto.RefreshTokenRequest;
import com.sams.usermanagement.service.AuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller for SAMS User Management
 * 
 * Provides REST endpoints for:
 * - User login with JWT token generation
 * - Token refresh
 * - User logout
 * - Session management
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "User authentication and session management")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationService authenticationService;

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and generate JWT tokens")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "423", description = "Account locked"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request) {
        
        logger.info("Login request for user: {}", loginRequest.getUsername());

        // Set IP address and user agent
        loginRequest.setIpAddress(getClientIpAddress(request));
        loginRequest.setUserAgent(request.getHeader("User-Agent"));

        LoginResponse response = authenticationService.login(loginRequest);

        logger.info("Login successful for user: {}", loginRequest.getUsername());
        return ResponseEntity.ok(response);
    }

    /**
     * Token refresh endpoint
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", description = "Generate new access token using refresh token")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
        @ApiResponse(responseCode = "401", description = "Invalid refresh token"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<LoginResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        logger.info("Token refresh request");

        LoginResponse response = authenticationService.refreshToken(refreshRequest);

        logger.info("Token refreshed successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * User logout endpoint
     */
    @PostMapping("/logout")
    @Operation(summary = "User logout", description = "Invalidate user tokens and end session")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logout successful"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<ApiResponse> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) LogoutRequest logoutRequest) {
        
        logger.info("Logout request");

        String accessToken = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            accessToken = authHeader.substring(7);
        }

        String refreshToken = null;
        Long userId = null;
        if (logoutRequest != null) {
            refreshToken = logoutRequest.getRefreshToken();
            userId = logoutRequest.getUserId();
        }

        authenticationService.logout(accessToken, refreshToken, userId);

        logger.info("Logout successful");
        return ResponseEntity.ok(new ApiResponse("Logout successful", true));
    }

    /**
     * Logout from all devices endpoint
     */
    @PostMapping("/logout-all")
    @Operation(summary = "Logout from all devices", description = "Invalidate all user sessions across all devices")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logout from all devices successful"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<ApiResponse> logoutFromAllDevices(@RequestBody LogoutAllRequest request) {
        logger.info("Logout from all devices request for user: {}", request.getUserId());

        authenticationService.logoutFromAllDevices(request.getUserId());

        logger.info("Logout from all devices successful for user: {}", request.getUserId());
        return ResponseEntity.ok(new ApiResponse("Logout from all devices successful", true));
    }

    /**
     * Check token validity endpoint
     */
    @PostMapping("/validate")
    @Operation(summary = "Validate token", description = "Check if access token is valid and not blacklisted")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Token validation result"),
        @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    public ResponseEntity<TokenValidationResponse> validateToken(@RequestBody TokenValidationRequest request) {
        logger.debug("Token validation request");

        boolean isValid = !authenticationService.isTokenBlacklisted(request.getToken());
        
        TokenValidationResponse response = new TokenValidationResponse();
        response.setValid(isValid);
        response.setMessage(isValid ? "Token is valid" : "Token is blacklisted");

        return ResponseEntity.ok(response);
    }

    /**
     * Get client IP address from request
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
     * Logout Request DTO
     */
    public static class LogoutRequest {
        private String refreshToken;
        private Long userId;

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
    }

    /**
     * Logout All Request DTO
     */
    public static class LogoutAllRequest {
        private Long userId;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
    }

    /**
     * Token Validation Request DTO
     */
    public static class TokenValidationRequest {
        private String token;

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
    }

    /**
     * Token Validation Response DTO
     */
    public static class TokenValidationResponse {
        private boolean valid;
        private String message;

        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    /**
     * Generic API Response DTO
     */
    public static class ApiResponse {
        private String message;
        private boolean success;

        public ApiResponse(String message, boolean success) {
            this.message = message;
            this.success = success;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
    }
}
