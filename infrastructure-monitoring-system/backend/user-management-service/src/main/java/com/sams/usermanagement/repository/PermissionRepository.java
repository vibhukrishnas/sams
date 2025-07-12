package com.sams.usermanagement.repository;

import com.sams.usermanagement.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Permission Repository for SAMS RBAC System
 */
@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    /**
     * Find permission by name (case-insensitive)
     */
    @Query("SELECT p FROM Permission p WHERE LOWER(p.name) = LOWER(:name)")
    Optional<Permission> findByNameIgnoreCase(@Param("name") String name);

    /**
     * Check if permission name exists (case-insensitive)
     */
    @Query("SELECT COUNT(p) > 0 FROM Permission p WHERE LOWER(p.name) = LOWER(:name)")
    boolean existsByNameIgnoreCase(@Param("name") String name);

    /**
     * Find system permissions
     */
    List<Permission> findByIsSystemPermissionTrue();

    /**
     * Find custom permissions (non-system)
     */
    List<Permission> findByIsSystemPermissionFalse();

    /**
     * Find permissions by resource
     */
    List<Permission> findByResourceIgnoreCase(String resource);

    /**
     * Find permissions by action
     */
    List<Permission> findByActionIgnoreCase(String action);

    /**
     * Find permissions by resource and action
     */
    @Query("SELECT p FROM Permission p WHERE LOWER(p.resource) = LOWER(:resource) AND LOWER(p.action) = LOWER(:action)")
    List<Permission> findByResourceAndActionIgnoreCase(@Param("resource") String resource, @Param("action") String action);

    /**
     * Find permissions assigned to roles
     */
    @Query("SELECT DISTINCT p FROM Permission p JOIN p.roles r")
    List<Permission> findAssignedPermissions();

    /**
     * Find unassigned permissions
     */
    @Query("SELECT p FROM Permission p WHERE p.roles IS EMPTY")
    List<Permission> findUnassignedPermissions();
}
