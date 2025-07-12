package com.sams.usermanagement.controller;

import com.sams.usermanagement.dto.*;
import com.sams.usermanagement.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Set;

/**
 * User Management Controller for SAMS
 * 
 * Provides REST endpoints for:
 * - User CRUD operations
 * - User search and filtering
 * - Password management
 * - Account management (lock/unlock)
 * - Role assignment
 * - User statistics
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Management", description = "User management operations")
@SecurityRequirement(name = "bearerAuth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    /**
     * Create new user
     */
    @PostMapping
    @PreAuthorize("hasAuthority('USER_CREATE')")
    @Operation(summary = "Create user", description = "Create a new user account")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "User created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "409", description = "User already exists"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody UserCreateRequest request,
            Principal principal) {
        
        logger.info("Creating user: {} by {}", request.getUsername(), principal.getName());

        UserResponse response = userService.createUser(request, principal.getName());

        logger.info("User created successfully: {} (ID: {})", response.getUsername(), response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_READ') or #id == authentication.principal.userId")
    @Operation(summary = "Get user by ID", description = "Retrieve user information by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User found"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<UserResponse> getUserById(
            @Parameter(description = "User ID") @PathVariable Long id) {
        
        logger.debug("Getting user by ID: {}", id);

        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get user by username
     */
    @GetMapping("/username/{username}")
    @PreAuthorize("hasAuthority('USER_READ') or #username == authentication.principal.username")
    @Operation(summary = "Get user by username", description = "Retrieve user information by username")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User found"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<UserResponse> getUserByUsername(
            @Parameter(description = "Username") @PathVariable String username) {
        
        logger.debug("Getting user by username: {}", username);

        UserResponse response = userService.getUserByUsername(username);
        return ResponseEntity.ok(response);
    }

    /**
     * Search users with pagination
     */
    @PostMapping("/search")
    @PreAuthorize("hasAuthority('USER_READ')")
    @Operation(summary = "Search users", description = "Search users with filtering and pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Search completed"),
        @ApiResponse(responseCode = "400", description = "Invalid search criteria"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Page<UserResponse>> searchUsers(
            @RequestBody(required = false) UserSearchRequest searchRequest,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "username") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "asc") String sortDir) {
        
        logger.debug("Searching users with criteria: {}", searchRequest);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        if (searchRequest == null) {
            searchRequest = new UserSearchRequest();
        }

        Page<UserResponse> response = userService.searchUsers(searchRequest, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all users with pagination
     */
    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    @Operation(summary = "Get all users", description = "Retrieve all users with pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Users retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "username") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "asc") String sortDir) {
        
        logger.debug("Getting all users - page: {}, size: {}", page, size);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<UserResponse> response = userService.getAllUsers(pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Update user
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_UPDATE') or (#id == authentication.principal.userId and @userService.canUserUpdateSelf(#request))")
    @Operation(summary = "Update user", description = "Update user information")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "409", description = "Conflict with existing data"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<UserResponse> updateUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request,
            Principal principal) {
        
        logger.info("Updating user: {} by {}", id, principal.getName());

        UserResponse response = userService.updateUser(id, request, principal.getName());

        logger.info("User updated successfully: {} (ID: {})", response.getUsername(), response.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Delete user
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    @Operation(summary = "Delete user", description = "Delete user account (soft delete)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "User deleted successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            Principal principal) {
        
        logger.info("Deleting user: {} by {}", id, principal.getName());

        userService.deleteUser(id, principal.getName());

        logger.info("User deleted successfully: {}", id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Change user password
     */
    @PostMapping("/{id}/change-password")
    @PreAuthorize("hasAuthority('USER_UPDATE') or #id == authentication.principal.userId")
    @Operation(summary = "Change password", description = "Change user password")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password changed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid password or current password incorrect"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ApiResponse> changePassword(
            @Parameter(description = "User ID") @PathVariable Long id,
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal) {
        
        logger.info("Changing password for user: {} by {}", id, principal.getName());

        userService.changePassword(id, request.getCurrentPassword(), request.getNewPassword(), principal.getName());

        logger.info("Password changed successfully for user: {}", id);
        return ResponseEntity.ok(new ApiResponse("Password changed successfully", true));
    }

    /**
     * Reset user password (admin function)
     */
    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Reset password", description = "Reset user password (admin function)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Password reset successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<PasswordResetResponse> resetPassword(
            @Parameter(description = "User ID") @PathVariable Long id,
            Principal principal) {
        
        logger.info("Resetting password for user: {} by {}", id, principal.getName());

        String tempPassword = userService.resetPassword(id, principal.getName());

        logger.info("Password reset successfully for user: {}", id);
        return ResponseEntity.ok(new PasswordResetResponse("Password reset successfully", tempPassword));
    }

    /**
     * Lock user account
     */
    @PostMapping("/{id}/lock")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Lock user account", description = "Lock user account")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User account locked"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ApiResponse> lockUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            Principal principal) {
        
        logger.info("Locking user: {} by {}", id, principal.getName());

        userService.lockUser(id, principal.getName());

        logger.info("User locked successfully: {}", id);
        return ResponseEntity.ok(new ApiResponse("User account locked", true));
    }

    /**
     * Unlock user account
     */
    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    @Operation(summary = "Unlock user account", description = "Unlock user account")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User account unlocked"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ApiResponse> unlockUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            Principal principal) {
        
        logger.info("Unlocking user: {} by {}", id, principal.getName());

        userService.unlockUser(id, principal.getName());

        logger.info("User unlocked successfully: {}", id);
        return ResponseEntity.ok(new ApiResponse("User account unlocked", true));
    }

    /**
     * Assign roles to user
     */
    @PostMapping("/{id}/roles")
    @PreAuthorize("hasAuthority('USER_MANAGE_ROLES')")
    @Operation(summary = "Assign roles", description = "Assign roles to user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Roles assigned successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ApiResponse> assignRoles(
            @Parameter(description = "User ID") @PathVariable Long id,
            @RequestBody RoleAssignmentRequest request,
            Principal principal) {
        
        logger.info("Assigning roles to user: {} - Roles: {} by {}", id, request.getRoleNames(), principal.getName());

        userService.assignRoles(id, request.getRoleNames(), principal.getName());

        logger.info("Roles assigned successfully to user: {}", id);
        return ResponseEntity.ok(new ApiResponse("Roles assigned successfully", true));
    }

    /**
     * Get users by role
     */
    @GetMapping("/role/{roleName}")
    @PreAuthorize("hasAuthority('USER_READ')")
    @Operation(summary = "Get users by role", description = "Get all users with specific role")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Users retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<UserResponse>> getUsersByRole(
            @Parameter(description = "Role name") @PathVariable String roleName) {
        
        logger.debug("Getting users by role: {}", roleName);

        List<UserResponse> response = userService.getUsersByRole(roleName);
        return ResponseEntity.ok(response);
    }

    /**
     * Get user statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('USER_READ')")
    @Operation(summary = "Get user statistics", description = "Get user statistics and metrics")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<UserService.UserStatistics> getUserStatistics() {
        logger.debug("Getting user statistics");

        UserService.UserStatistics statistics = userService.getUserStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Change Password Request DTO
     */
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    /**
     * Password Reset Response DTO
     */
    public static class PasswordResetResponse {
        private String message;
        private String temporaryPassword;

        public PasswordResetResponse(String message, String temporaryPassword) {
            this.message = message;
            this.temporaryPassword = temporaryPassword;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public String getTemporaryPassword() { return temporaryPassword; }
        public void setTemporaryPassword(String temporaryPassword) { this.temporaryPassword = temporaryPassword; }
    }

    /**
     * Role Assignment Request DTO
     */
    public static class RoleAssignmentRequest {
        private Set<String> roleNames;

        public Set<String> getRoleNames() { return roleNames; }
        public void setRoleNames(Set<String> roleNames) { this.roleNames = roleNames; }
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
