package com.sams.usermanagement.repository;

import com.sams.usermanagement.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Role Repository for SAMS RBAC System
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    /**
     * Find role by name (case-insensitive)
     */
    @Query("SELECT r FROM Role r WHERE LOWER(r.name) = LOWER(:name)")
    Optional<Role> findByNameIgnoreCase(@Param("name") String name);

    /**
     * Check if role name exists (case-insensitive)
     */
    @Query("SELECT COUNT(r) > 0 FROM Role r WHERE LOWER(r.name) = LOWER(:name)")
    boolean existsByNameIgnoreCase(@Param("name") String name);

    /**
     * Find system roles
     */
    List<Role> findByIsSystemRoleTrue();

    /**
     * Find custom roles (non-system)
     */
    List<Role> findByIsSystemRoleFalse();

    /**
     * Find roles by hierarchy level
     */
    List<Role> findByHierarchyLevelGreaterThanEqual(Integer hierarchyLevel);

    /**
     * Find roles with specific permission
     */
    @Query("SELECT r FROM Role r JOIN r.permissions p WHERE p.name = :permissionName")
    List<Role> findRolesWithPermission(@Param("permissionName") String permissionName);

    /**
     * Find roles by user count
     */
    @Query("SELECT r, COUNT(u) as userCount FROM Role r LEFT JOIN r.users u GROUP BY r ORDER BY userCount DESC")
    List<Object[]> findRolesWithUserCount();
}

