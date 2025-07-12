/**
 * 🧪 Authentication Controller Tests - Comprehensive Test Suite
 * Complete test coverage for authentication endpoints and security features
 */

package com.monitoring.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoring.user.dto.*;
import com.monitoring.user.entity.User;
import com.monitoring.user.security.JwtTokenProvider;
import com.monitoring.user.service.AuthService;
import com.monitoring.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@WebMvcTest(AuthController.class)
@SpringJUnitTest
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtTokenProvider tokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private LoginResponse loginResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        // Setup test data
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setIsActive(true);
        testUser.setIsVerified(true);

        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("SecurePassword123!");
        registerRequest.setFirstName("Test");
        registerRequest.setLastName("User");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("SecurePassword123!");

        JwtTokenProvider.TokenResponse tokenResponse = new JwtTokenProvider.TokenResponse(
                "access-token",
                "refresh-token",
                "Bearer",
                3600,
                LocalDateTime.now().plusHours(1)
        );

        loginResponse = new LoginResponse();
        loginResponse.setUser(UserDto.fromEntity(testUser));
        loginResponse.setTokens(tokenResponse);
    }

    @Test
    @DisplayName("Should register user successfully")
    void shouldRegisterUserSuccessfully() throws Exception {
        // Given
        when(authService.register(any(RegisterRequest.class), anyString()))
                .thenReturn(testUser);

        // When & Then
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.data.username").value("testuser"))
                .andExpect(jsonPath("$.data.email").value("test@example.com"));

        verify(authService).register(any(RegisterRequest.class), anyString());
    }

    @Test
    @DisplayName("Should fail registration with invalid data")
    void shouldFailRegistrationWithInvalidData() throws Exception {
        // Given
        RegisterRequest invalidRequest = new RegisterRequest();
        invalidRequest.setUsername(""); // Invalid: empty username
        invalidRequest.setEmail("invalid-email"); // Invalid: malformed email
        invalidRequest.setPassword("123"); // Invalid: weak password

        // When & Then
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(authService, never()).register(any(RegisterRequest.class), anyString());
    }

    @Test
    @DisplayName("Should login user successfully")
    void shouldLoginUserSuccessfully() throws Exception {
        // Given
        when(authService.login(any(LoginRequest.class), anyString(), anyString()))
                .thenReturn(loginResponse);

        // When & Then
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.user.username").value("testuser"))
                .andExpect(jsonPath("$.data.tokens.accessToken").value("access-token"));

        verify(authService).login(any(LoginRequest.class), anyString(), anyString());
    }

    @Test
    @DisplayName("Should fail login with invalid credentials")
    void shouldFailLoginWithInvalidCredentials() throws Exception {
        // Given
        when(authService.login(any(LoginRequest.class), anyString(), anyString()))
                .thenThrow(new RuntimeException("Invalid credentials"));

        // When & Then
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Login failed: Invalid credentials"));

        verify(authService).login(any(LoginRequest.class), anyString(), anyString());
    }

    @Test
    @DisplayName("Should refresh token successfully")
    void shouldRefreshTokenSuccessfully() throws Exception {
        // Given
        RefreshTokenRequest refreshRequest = new RefreshTokenRequest();
        refreshRequest.setRefreshToken("valid-refresh-token");

        JwtTokenProvider.TokenResponse tokenResponse = new JwtTokenProvider.TokenResponse(
                "new-access-token",
                "new-refresh-token",
                "Bearer",
                3600,
                LocalDateTime.now().plusHours(1)
        );

        when(authService.refreshToken(anyString())).thenReturn(tokenResponse);

        // When & Then
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpected(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"));

        verify(authService).refreshToken("valid-refresh-token");
    }

    @Test
    @DisplayName("Should fail refresh with invalid token")
    void shouldFailRefreshWithInvalidToken() throws Exception {
        // Given
        RefreshTokenRequest refreshRequest = new RefreshTokenRequest();
        refreshRequest.setRefreshToken("invalid-refresh-token");

        when(authService.refreshToken(anyString()))
                .thenThrow(new RuntimeException("Invalid refresh token"));

        // When & Then
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        verify(authService).refreshToken("invalid-refresh-token");
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("Should logout user successfully")
    void shouldLogoutUserSuccessfully() throws Exception {
        // Given
        when(tokenProvider.extractTokenFromHeader(anyString())).thenReturn("valid-token");
        doNothing().when(authService).logout(any(UUID.class), anyString());

        // When & Then
        mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Logout successful"));

        verify(authService).logout(any(UUID.class), anyString());
    }

    @Test
    @DisplayName("Should handle forgot password request")
    void shouldHandleForgotPasswordRequest() throws Exception {
        // Given
        ForgotPasswordRequest forgotRequest = new ForgotPasswordRequest();
        forgotRequest.setEmail("test@example.com");

        doNothing().when(authService).forgotPassword(anyString());

        // When & Then
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(forgotRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Password reset email sent"));

        verify(authService).forgotPassword("test@example.com");
    }

    @Test
    @DisplayName("Should reset password successfully")
    void shouldResetPasswordSuccessfully() throws Exception {
        // Given
        ResetPasswordRequest resetRequest = new ResetPasswordRequest();
        resetRequest.setToken("valid-reset-token");
        resetRequest.setNewPassword("NewSecurePassword123!");

        doNothing().when(authService).resetPassword(anyString(), anyString());

        // When & Then
        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Password reset successful"));

        verify(authService).resetPassword("valid-reset-token", "NewSecurePassword123!");
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("Should change password successfully")
    void shouldChangePasswordSuccessfully() throws Exception {
        // Given
        ChangePasswordRequest changeRequest = new ChangePasswordRequest();
        changeRequest.setCurrentPassword("OldPassword123!");
        changeRequest.setNewPassword("NewPassword123!");

        doNothing().when(authService).changePassword(any(UUID.class), anyString(), anyString());

        // When & Then
        mockMvc.perform(post("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(changeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Password changed successfully"));

        verify(authService).changePassword(any(UUID.class), eq("OldPassword123!"), eq("NewPassword123!"));
    }

    @Test
    @DisplayName("Should verify email successfully")
    void shouldVerifyEmailSuccessfully() throws Exception {
        // Given
        doNothing().when(authService).verifyEmail(anyString());

        // When & Then
        mockMvc.perform(post("/api/auth/verify-email")
                .param("token", "valid-verification-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Email verified successfully"));

        verify(authService).verifyEmail("valid-verification-token");
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("Should get user profile successfully")
    void shouldGetUserProfileSuccessfully() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Profile retrieved successfully"));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("Should update user profile successfully")
    void shouldUpdateUserProfileSuccessfully() throws Exception {
        // Given
        UpdateProfileRequest updateRequest = new UpdateProfileRequest();
        updateRequest.setFirstName("Updated");
        updateRequest.setLastName("Name");
        updateRequest.setPhone("+1234567890");

        when(userService.updateProfile(any(UUID.class), any(UpdateProfileRequest.class)))
                .thenReturn(testUser);

        // When & Then
        mockMvc.perform(put("/api/auth/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Profile updated successfully"));

        verify(userService).updateProfile(any(UUID.class), any(UpdateProfileRequest.class));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("Should get user sessions successfully")
    void shouldGetUserSessionsSuccessfully() throws Exception {
        // Given
        when(authService.getUserSessions(any(UUID.class))).thenReturn("session-data");

        // When & Then
        mockMvc.perform(get("/api/auth/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Sessions retrieved successfully"));

        verify(authService).getUserSessions(any(UUID.class));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("Should revoke session successfully")
    void shouldRevokeSessionSuccessfully() throws Exception {
        // Given
        UUID sessionId = UUID.randomUUID();
        doNothing().when(authService).revokeSession(any(UUID.class), eq(sessionId));

        // When & Then
        mockMvc.perform(delete("/api/auth/sessions/" + sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Session revoked successfully"));

        verify(authService).revokeSession(any(UUID.class), eq(sessionId));
    }

    @Test
    @DisplayName("Should require authentication for protected endpoints")
    void shouldRequireAuthenticationForProtectedEndpoints() throws Exception {
        // Test logout endpoint without authentication
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());

        // Test profile endpoint without authentication
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isUnauthorized());

        // Test change password endpoint without authentication
        mockMvc.perform(post("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should validate request data")
    void shouldValidateRequestData() throws Exception {
        // Test registration with missing required fields
        RegisterRequest invalidRegister = new RegisterRequest();
        
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRegister)))
                .andExpect(status().isBadRequest());

        // Test login with missing credentials
        LoginRequest invalidLogin = new LoginRequest();
        
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidLogin)))
                .andExpect(status().isBadRequest());
    }
}
