package com.sams.usermanagement.repository;

import com.sams.usermanagement.entity.User;
import com.sams.usermanagement.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * User Repository for SAMS User Management
 * 
 * Provides data access methods for User entity with:
 * - Basic CRUD operations
 * - Custom queries for authentication
 * - User search and filtering
 * - Account management operations
 * - Security-related queries
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by username (case-insensitive)
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    Optional<User> findByUsernameIgnoreCase(@Param("username") String username);

    /**
     * Find user by email (case-insensitive)
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    /**
     * Find user by username or email (case-insensitive)
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:identifier) OR LOWER(u.email) = LOWER(:identifier)")
    Optional<User> findByUsernameOrEmailIgnoreCase(@Param("identifier") String identifier);

    /**
     * Check if username exists (case-insensitive)
     */
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    boolean existsByUsernameIgnoreCase(@Param("username") String username);

    /**
     * Check if email exists (case-insensitive)
     */
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);

    /**
     * Find users by status
     */
    List<User> findByStatus(UserStatus status);

    /**
     * Find users by status with pagination
     */
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    /**
     * Find users by role name
     */
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    List<User> findByRoleName(@Param("roleName") String roleName);

    /**
     * Find users by role name with pagination
     */
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName")
    Page<User> findByRoleName(@Param("roleName") String roleName, Pageable pageable);

    /**
     * Find users by department
     */
    List<User> findByDepartmentIgnoreCase(String department);

    /**
     * Search users by multiple criteria
     */
    @Query("SELECT u FROM User u WHERE " +
           "(:username IS NULL OR LOWER(u.username) LIKE LOWER(CONCAT('%', :username, '%'))) AND " +
           "(:email IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%'))) AND " +
           "(:firstName IS NULL OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :firstName, '%'))) AND " +
           "(:lastName IS NULL OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :lastName, '%'))) AND " +
           "(:department IS NULL OR LOWER(u.department) LIKE LOWER(CONCAT('%', :department, '%'))) AND " +
           "(:status IS NULL OR u.status = :status)")
    Page<User> searchUsers(@Param("username") String username,
                          @Param("email") String email,
                          @Param("firstName") String firstName,
                          @Param("lastName") String lastName,
                          @Param("department") String department,
                          @Param("status") UserStatus status,
                          Pageable pageable);

    /**
     * Find users with failed login attempts
     */
    @Query("SELECT u FROM User u WHERE u.failedLoginAttempts >= :threshold")
    List<User> findUsersWithFailedLoginAttempts(@Param("threshold") Integer threshold);

    /**
     * Find locked users
     */
    @Query("SELECT u FROM User u WHERE u.accountLockedUntil IS NOT NULL AND u.accountLockedUntil > :now")
    List<User> findLockedUsers(@Param("now") LocalDateTime now);

    /**
     * Find users with expired passwords
     */
    @Query("SELECT u FROM User u WHERE u.passwordChangedAt IS NULL OR u.passwordChangedAt < :expirationDate")
    List<User> findUsersWithExpiredPasswords(@Param("expirationDate") LocalDateTime expirationDate);

    /**
     * Find users who must change password
     */
    List<User> findByMustChangePasswordTrue();

    /**
     * Find LDAP users
     */
    List<User> findByIsLdapUserTrue();

    /**
     * Find users with two-factor authentication enabled
     */
    List<User> findByTwoFactorEnabledTrue();

    /**
     * Find users created between dates
     */
    @Query("SELECT u FROM User u WHERE u.createdAt BETWEEN :startDate AND :endDate")
    List<User> findUsersCreatedBetween(@Param("startDate") LocalDateTime startDate,
                                      @Param("endDate") LocalDateTime endDate);

    /**
     * Find users who haven't logged in for a specified period
     */
    @Query("SELECT u FROM User u WHERE u.lastLogin IS NULL OR u.lastLogin < :cutoffDate")
    List<User> findInactiveUsers(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Update user last login time
     */
    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :loginTime WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") Long userId, @Param("loginTime") LocalDateTime loginTime);

    /**
     * Reset failed login attempts
     */
    @Modifying
    @Query("UPDATE User u SET u.failedLoginAttempts = 0, u.accountLockedUntil = NULL WHERE u.id = :userId")
    void resetFailedLoginAttempts(@Param("userId") Long userId);

    /**
     * Increment failed login attempts
     */
    @Modifying
    @Query("UPDATE User u SET u.failedLoginAttempts = COALESCE(u.failedLoginAttempts, 0) + 1 WHERE u.id = :userId")
    void incrementFailedLoginAttempts(@Param("userId") Long userId);

    /**
     * Lock user account
     */
    @Modifying
    @Query("UPDATE User u SET u.accountLockedUntil = :lockUntil WHERE u.id = :userId")
    void lockUserAccount(@Param("userId") Long userId, @Param("lockUntil") LocalDateTime lockUntil);

    /**
     * Unlock user account
     */
    @Modifying
    @Query("UPDATE User u SET u.accountLockedUntil = NULL, u.failedLoginAttempts = 0 WHERE u.id = :userId")
    void unlockUserAccount(@Param("userId") Long userId);

    /**
     * Update user status
     */
    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :userId")
    void updateUserStatus(@Param("userId") Long userId, @Param("status") UserStatus status);

    /**
     * Force password change
     */
    @Modifying
    @Query("UPDATE User u SET u.mustChangePassword = true WHERE u.id = :userId")
    void forcePasswordChange(@Param("userId") Long userId);

    /**
     * Update password and reset flags
     */
    @Modifying
    @Query("UPDATE User u SET u.password = :password, u.passwordChangedAt = :changedAt, " +
           "u.mustChangePassword = false WHERE u.id = :userId")
    void updatePassword(@Param("userId") Long userId, 
                       @Param("password") String password, 
                       @Param("changedAt") LocalDateTime changedAt);

    /**
     * Get user statistics
     */
    @Query("SELECT " +
           "COUNT(u) as totalUsers, " +
           "SUM(CASE WHEN u.status = 'ACTIVE' THEN 1 ELSE 0 END) as activeUsers, " +
           "SUM(CASE WHEN u.status = 'INACTIVE' THEN 1 ELSE 0 END) as inactiveUsers, " +
           "SUM(CASE WHEN u.status = 'LOCKED' THEN 1 ELSE 0 END) as lockedUsers, " +
           "SUM(CASE WHEN u.isLdapUser = true THEN 1 ELSE 0 END) as ldapUsers, " +
           "SUM(CASE WHEN u.twoFactorEnabled = true THEN 1 ELSE 0 END) as twoFactorUsers " +
           "FROM User u")
    Object[] getUserStatistics();

    /**
     * Find users by permission
     */
    @Query("SELECT DISTINCT u FROM User u JOIN u.roles r JOIN r.permissions p WHERE p.name = :permissionName")
    List<User> findUsersByPermission(@Param("permissionName") String permissionName);

    /**
     * Count users by role
     */
    @Query("SELECT r.name, COUNT(u) FROM User u JOIN u.roles r GROUP BY r.name")
    List<Object[]> countUsersByRole();

    /**
     * Find recently created users
     */
    @Query("SELECT u FROM User u WHERE u.createdAt >= :since ORDER BY u.createdAt DESC")
    List<User> findRecentlyCreatedUsers(@Param("since") LocalDateTime since);

    /**
     * Find users by multiple roles
     */
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name IN :roleNames GROUP BY u HAVING COUNT(r) = :roleCount")
    List<User> findUsersByRoles(@Param("roleNames") List<String> roleNames, @Param("roleCount") Long roleCount);
}
