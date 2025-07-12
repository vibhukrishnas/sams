package com.sams.usermanagement.service;

import com.sams.usermanagement.dto.UserCreateRequest;
import com.sams.usermanagement.dto.UserResponse;
import com.sams.usermanagement.dto.UserSearchRequest;
import com.sams.usermanagement.dto.UserUpdateRequest;
import com.sams.usermanagement.entity.Role;
import com.sams.usermanagement.entity.User;
import com.sams.usermanagement.entity.UserStatus;
import com.sams.usermanagement.exception.UserAlreadyExistsException;
import com.sams.usermanagement.exception.UserNotFoundException;
import com.sams.usermanagement.repository.RoleRepository;
import com.sams.usermanagement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * User Service for SAMS User Management
 * 
 * Provides comprehensive user management functionality including:
 * - User CRUD operations
 * - Password management with policies
 * - Account status management
 * - Role assignment
 * - User search and filtering
 * - Security operations (lock/unlock, password reset)
 */
@Service
@Transactional
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordPolicyService passwordPolicyService;

    @Autowired
    private AuditService auditService;

    /**
     * Create a new user
     */
    public UserResponse createUser(UserCreateRequest request, String createdBy) {
        logger.info("Creating new user: {}", request.getUsername());

        // Validate user doesn't exist
        if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
            throw new UserAlreadyExistsException("Username already exists: " + request.getUsername());
        }

        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already exists: " + request.getEmail());
        }

        // Validate password policy
        passwordPolicyService.validatePassword(request.getPassword());

        // Create user entity
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setDepartment(request.getDepartment());
        user.setJobTitle(request.getJobTitle());
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedBy(createdBy);
        user.setMustChangePassword(request.getMustChangePassword() != null ? request.getMustChangePassword() : false);

        // Assign default role if no roles specified
        if (request.getRoleNames() == null || request.getRoleNames().isEmpty()) {
            Optional<Role> defaultRole = roleRepository.findByNameIgnoreCase("USER");
            if (defaultRole.isPresent()) {
                user.addRole(defaultRole.get());
            }
        } else {
            // Assign specified roles
            for (String roleName : request.getRoleNames()) {
                Optional<Role> role = roleRepository.findByNameIgnoreCase(roleName);
                if (role.isPresent()) {
                    user.addRole(role.get());
                } else {
                    logger.warn("Role not found: {}", roleName);
                }
            }
        }

        // Save user
        user = userRepository.save(user);

        // Audit log
        auditService.logUserCreated(user.getId(), createdBy);

        logger.info("User created successfully: {} (ID: {})", user.getUsername(), user.getId());
        return convertToUserResponse(user);
    }

    /**
     * Update existing user
     */
    public UserResponse updateUser(Long userId, UserUpdateRequest request, String updatedBy) {
        logger.info("Updating user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Check for username conflicts (if changing)
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
                throw new UserAlreadyExistsException("Username already exists: " + request.getUsername());
            }
            user.setUsername(request.getUsername());
        }

        // Check for email conflicts (if changing)
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
                throw new UserAlreadyExistsException("Email already exists: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }

        // Update other fields
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getJobTitle() != null) user.setJobTitle(request.getJobTitle());
        if (request.getStatus() != null) user.setStatus(request.getStatus());

        user.setUpdatedBy(updatedBy);

        // Update roles if specified
        if (request.getRoleNames() != null) {
            user.getRoles().clear();
            for (String roleName : request.getRoleNames()) {
                Optional<Role> role = roleRepository.findByNameIgnoreCase(roleName);
                if (role.isPresent()) {
                    user.addRole(role.get());
                } else {
                    logger.warn("Role not found: {}", roleName);
                }
            }
        }

        user = userRepository.save(user);

        // Audit log
        auditService.logUserUpdated(user.getId(), updatedBy);

        logger.info("User updated successfully: {} (ID: {})", user.getUsername(), user.getId());
        return convertToUserResponse(user);
    }

    /**
     * Get user by ID
     */
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));
        return convertToUserResponse(user);
    }

    /**
     * Get user by username
     */
    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        return convertToUserResponse(user);
    }

    /**
     * Search users with pagination
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(UserSearchRequest request, Pageable pageable) {
        Page<User> users = userRepository.searchUsers(
                request.getUsername(),
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getDepartment(),
                request.getStatus(),
                pageable
        );

        return users.map(this::convertToUserResponse);
    }

    /**
     * Get all users with pagination
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        Page<User> users = userRepository.findAll(pageable);
        return users.map(this::convertToUserResponse);
    }

    /**
     * Delete user (soft delete by setting status to DELETED)
     */
    public void deleteUser(Long userId, String deletedBy) {
        logger.info("Deleting user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        user.setStatus(UserStatus.DELETED);
        user.setUpdatedBy(deletedBy);
        userRepository.save(user);

        // Audit log
        auditService.logUserDeleted(user.getId(), deletedBy);

        logger.info("User deleted successfully: {} (ID: {})", user.getUsername(), user.getId());
    }

    /**
     * Change user password
     */
    public void changePassword(Long userId, String currentPassword, String newPassword, String changedBy) {
        logger.info("Changing password for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Verify current password (unless it's an admin reset)
        if (currentPassword != null && !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        // Validate new password policy
        passwordPolicyService.validatePassword(newPassword);

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setMustChangePassword(false);
        user.setUpdatedBy(changedBy);

        userRepository.save(user);

        // Audit log
        auditService.logPasswordChanged(user.getId(), changedBy);

        logger.info("Password changed successfully for user: {} (ID: {})", user.getUsername(), user.getId());
    }

    /**
     * Reset user password (admin function)
     */
    public String resetPassword(Long userId, String resetBy) {
        logger.info("Resetting password for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Generate temporary password
        String tempPassword = passwordPolicyService.generateTemporaryPassword();

        // Update password
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setMustChangePassword(true);
        user.setUpdatedBy(resetBy);

        userRepository.save(user);

        // Audit log
        auditService.logPasswordReset(user.getId(), resetBy);

        logger.info("Password reset successfully for user: {} (ID: {})", user.getUsername(), user.getId());
        return tempPassword;
    }

    /**
     * Lock user account
     */
    public void lockUser(Long userId, String lockedBy) {
        logger.info("Locking user account: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        user.setStatus(UserStatus.LOCKED);
        user.setAccountLockedUntil(LocalDateTime.now().plusDays(30)); // Lock for 30 days
        user.setUpdatedBy(lockedBy);

        userRepository.save(user);

        // Audit log
        auditService.logUserLocked(user.getId(), lockedBy);

        logger.info("User account locked: {} (ID: {})", user.getUsername(), user.getId());
    }

    /**
     * Unlock user account
     */
    public void unlockUser(Long userId, String unlockedBy) {
        logger.info("Unlocking user account: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        user.setStatus(UserStatus.ACTIVE);
        user.setAccountLockedUntil(null);
        user.setFailedLoginAttempts(0);
        user.setUpdatedBy(unlockedBy);

        userRepository.save(user);

        // Audit log
        auditService.logUserUnlocked(user.getId(), unlockedBy);

        logger.info("User account unlocked: {} (ID: {})", user.getUsername(), user.getId());
    }

    /**
     * Assign roles to user
     */
    public void assignRoles(Long userId, Set<String> roleNames, String assignedBy) {
        logger.info("Assigning roles to user: {} - Roles: {}", userId, roleNames);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        // Clear existing roles
        user.getRoles().clear();

        // Assign new roles
        for (String roleName : roleNames) {
            Optional<Role> role = roleRepository.findByNameIgnoreCase(roleName);
            if (role.isPresent()) {
                user.addRole(role.get());
            } else {
                logger.warn("Role not found: {}", roleName);
            }
        }

        user.setUpdatedBy(assignedBy);
        userRepository.save(user);

        // Audit log
        auditService.logRolesAssigned(user.getId(), roleNames, assignedBy);

        logger.info("Roles assigned successfully to user: {} (ID: {})", user.getUsername(), user.getId());
    }

    /**
     * Get users by role
     */
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRole(String roleName) {
        List<User> users = userRepository.findByRoleName(roleName);
        return users.stream()
                .map(this::convertToUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get user statistics
     */
    @Transactional(readOnly = true)
    public UserStatistics getUserStatistics() {
        Object[] stats = userRepository.getUserStatistics();
        
        return UserStatistics.builder()
                .totalUsers(((Number) stats[0]).longValue())
                .activeUsers(((Number) stats[1]).longValue())
                .inactiveUsers(((Number) stats[2]).longValue())
                .lockedUsers(((Number) stats[3]).longValue())
                .ldapUsers(((Number) stats[4]).longValue())
                .twoFactorUsers(((Number) stats[5]).longValue())
                .build();
    }

    /**
     * Convert User entity to UserResponse DTO
     */
    private UserResponse convertToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setDepartment(user.getDepartment());
        response.setJobTitle(user.getJobTitle());
        response.setStatus(user.getStatus());
        response.setLastLogin(user.getLastLogin());
        response.setAccountLocked(user.isAccountLocked());
        response.setPasswordExpired(user.isPasswordExpired());
        response.setMustChangePassword(user.getMustChangePassword());
        response.setLdapUser(user.getIsLdapUser());
        response.setTwoFactorEnabled(user.getTwoFactorEnabled());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        response.setCreatedBy(user.getCreatedBy());
        response.setUpdatedBy(user.getUpdatedBy());

        // Convert roles
        response.setRoles(user.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toSet()));

        // Convert permissions
        response.setPermissions(user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(permission -> permission.getName())
                .collect(Collectors.toSet()));

        return response;
    }

    /**
     * User Statistics DTO
     */
    public static class UserStatistics {
        private Long totalUsers;
        private Long activeUsers;
        private Long inactiveUsers;
        private Long lockedUsers;
        private Long ldapUsers;
        private Long twoFactorUsers;

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private UserStatistics stats = new UserStatistics();
            public Builder totalUsers(Long totalUsers) { stats.totalUsers = totalUsers; return this; }
            public Builder activeUsers(Long activeUsers) { stats.activeUsers = activeUsers; return this; }
            public Builder inactiveUsers(Long inactiveUsers) { stats.inactiveUsers = inactiveUsers; return this; }
            public Builder lockedUsers(Long lockedUsers) { stats.lockedUsers = lockedUsers; return this; }
            public Builder ldapUsers(Long ldapUsers) { stats.ldapUsers = ldapUsers; return this; }
            public Builder twoFactorUsers(Long twoFactorUsers) { stats.twoFactorUsers = twoFactorUsers; return this; }
            public UserStatistics build() { return stats; }
        }

        // Getters
        public Long getTotalUsers() { return totalUsers; }
        public Long getActiveUsers() { return activeUsers; }
        public Long getInactiveUsers() { return inactiveUsers; }
        public Long getLockedUsers() { return lockedUsers; }
        public Long getLdapUsers() { return ldapUsers; }
        public Long getTwoFactorUsers() { return twoFactorUsers; }
    }
}
