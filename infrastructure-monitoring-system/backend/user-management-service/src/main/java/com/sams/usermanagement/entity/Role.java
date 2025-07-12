package com.sams.usermanagement.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * Role Entity for RBAC (Role-Based Access Control)
 * 
 * Defines roles in the SAMS system with hierarchical permissions:
 * - ADMIN: Full system access
 * - MANAGER: Management access to assigned resources
 * - USER: Basic user access
 */
@Entity
@Table(name = "roles", indexes = {
    @Index(name = "idx_role_name", columnList = "name")
})
@EntityListeners(AuditingEntityListener.class)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    @NotBlank(message = "Role name is required")
    @Size(min = 2, max = 50, message = "Role name must be between 2 and 50 characters")
    private String name;

    @Column(length = 200)
    @Size(max = 200, message = "Description cannot exceed 200 characters")
    private String description;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    @ManyToMany(mappedBy = "roles")
    @JsonIgnore
    private Set<User> users = new HashSet<>();

    @Column(name = "is_system_role")
    private Boolean isSystemRole = false;

    @Column(name = "hierarchy_level")
    private Integer hierarchyLevel = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Constructors
    public Role() {}

    public Role(String name) {
        this.name = name;
    }

    public Role(String name, String description) {
        this.name = name;
        this.description = description;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Set<Permission> getPermissions() { return permissions; }
    public void setPermissions(Set<Permission> permissions) { this.permissions = permissions; }

    public Set<User> getUsers() { return users; }
    public void setUsers(Set<User> users) { this.users = users; }

    public Boolean getIsSystemRole() { return isSystemRole; }
    public void setIsSystemRole(Boolean isSystemRole) { this.isSystemRole = isSystemRole; }

    public Integer getHierarchyLevel() { return hierarchyLevel; }
    public void setHierarchyLevel(Integer hierarchyLevel) { this.hierarchyLevel = hierarchyLevel; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    // Utility methods
    public void addPermission(Permission permission) {
        this.permissions.add(permission);
    }

    public void removePermission(Permission permission) {
        this.permissions.remove(permission);
    }

    public boolean hasPermission(String permissionName) {
        return permissions.stream()
                .anyMatch(permission -> permission.getName().equals(permissionName));
    }

    public void addUser(User user) {
        this.users.add(user);
        user.getRoles().add(this);
    }

    public void removeUser(User user) {
        this.users.remove(user);
        user.getRoles().remove(this);
    }

    /**
     * Check if this role has higher or equal hierarchy level than another role
     * @param otherRole the role to compare with
     * @return true if this role has higher or equal hierarchy
     */
    public boolean hasHigherOrEqualHierarchy(Role otherRole) {
        if (otherRole == null) return true;
        return this.hierarchyLevel >= otherRole.hierarchyLevel;
    }

    /**
     * Get all permission names as a set of strings
     * @return set of permission names
     */
    public Set<String> getPermissionNames() {
        Set<String> permissionNames = new HashSet<>();
        for (Permission permission : permissions) {
            permissionNames.add(permission.getName());
        }
        return permissionNames;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Role role = (Role) o;
        return Objects.equals(name, role.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Override
    public String toString() {
        return "Role{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", hierarchyLevel=" + hierarchyLevel +
                ", permissions=" + permissions.size() +
                '}';
    }

    /**
     * Predefined system roles
     */
    public static class SystemRoles {
        public static final String ADMIN = "ADMIN";
        public static final String MANAGER = "MANAGER";
        public static final String USER = "USER";
        public static final String VIEWER = "VIEWER";
        
        /**
         * Create default admin role with highest hierarchy
         */
        public static Role createAdminRole() {
            Role adminRole = new Role(ADMIN, "System Administrator with full access");
            adminRole.setIsSystemRole(true);
            adminRole.setHierarchyLevel(100);
            return adminRole;
        }
        
        /**
         * Create default manager role
         */
        public static Role createManagerRole() {
            Role managerRole = new Role(MANAGER, "Manager with administrative access to assigned resources");
            managerRole.setIsSystemRole(true);
            managerRole.setHierarchyLevel(50);
            return managerRole;
        }
        
        /**
         * Create default user role
         */
        public static Role createUserRole() {
            Role userRole = new Role(USER, "Standard user with basic access");
            userRole.setIsSystemRole(true);
            userRole.setHierarchyLevel(10);
            return userRole;
        }
        
        /**
         * Create default viewer role
         */
        public static Role createViewerRole() {
            Role viewerRole = new Role(VIEWER, "Read-only access to monitoring data");
            viewerRole.setIsSystemRole(true);
            viewerRole.setHierarchyLevel(1);
            return viewerRole;
        }
    }
}
