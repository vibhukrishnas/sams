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
 * Permission Entity for Fine-Grained Access Control
 * 
 * Defines specific permissions that can be assigned to roles.
 * Follows the pattern: RESOURCE_ACTION (e.g., USER_CREATE, SERVER_READ, ALERT_DELETE)
 */
@Entity
@Table(name = "permissions", indexes = {
    @Index(name = "idx_permission_name", columnList = "name"),
    @Index(name = "idx_permission_resource", columnList = "resource"),
    @Index(name = "idx_permission_action", columnList = "action")
})
@EntityListeners(AuditingEntityListener.class)
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    @NotBlank(message = "Permission name is required")
    @Size(min = 3, max = 100, message = "Permission name must be between 3 and 100 characters")
    private String name;

    @Column(length = 200)
    @Size(max = 200, message = "Description cannot exceed 200 characters")
    private String description;

    @Column(nullable = false, length = 50)
    @NotBlank(message = "Resource is required")
    private String resource;

    @Column(nullable = false, length = 50)
    @NotBlank(message = "Action is required")
    private String action;

    @ManyToMany(mappedBy = "permissions")
    @JsonIgnore
    private Set<Role> roles = new HashSet<>();

    @Column(name = "is_system_permission")
    private Boolean isSystemPermission = false;

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
    public Permission() {}

    public Permission(String name, String resource, String action) {
        this.name = name;
        this.resource = resource;
        this.action = action;
    }

    public Permission(String name, String description, String resource, String action) {
        this.name = name;
        this.description = description;
        this.resource = resource;
        this.action = action;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getResource() { return resource; }
    public void setResource(String resource) { this.resource = resource; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    public Boolean getIsSystemPermission() { return isSystemPermission; }
    public void setIsSystemPermission(Boolean isSystemPermission) { this.isSystemPermission = isSystemPermission; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Permission that = (Permission) o;
        return Objects.equals(name, that.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    @Override
    public String toString() {
        return "Permission{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", resource='" + resource + '\'' +
                ", action='" + action + '\'' +
                '}';
    }

    /**
     * System Permissions for SAMS
     */
    public static class SystemPermissions {
        
        // User Management Permissions
        public static final String USER_CREATE = "USER_CREATE";
        public static final String USER_READ = "USER_READ";
        public static final String USER_UPDATE = "USER_UPDATE";
        public static final String USER_DELETE = "USER_DELETE";
        public static final String USER_MANAGE_ROLES = "USER_MANAGE_ROLES";
        
        // Server Management Permissions
        public static final String SERVER_CREATE = "SERVER_CREATE";
        public static final String SERVER_READ = "SERVER_READ";
        public static final String SERVER_UPDATE = "SERVER_UPDATE";
        public static final String SERVER_DELETE = "SERVER_DELETE";
        public static final String SERVER_MANAGE = "SERVER_MANAGE";
        
        // Alert Management Permissions
        public static final String ALERT_CREATE = "ALERT_CREATE";
        public static final String ALERT_READ = "ALERT_READ";
        public static final String ALERT_UPDATE = "ALERT_UPDATE";
        public static final String ALERT_DELETE = "ALERT_DELETE";
        public static final String ALERT_ACKNOWLEDGE = "ALERT_ACKNOWLEDGE";
        public static final String ALERT_RESOLVE = "ALERT_RESOLVE";
        
        // Monitoring Permissions
        public static final String METRICS_READ = "METRICS_READ";
        public static final String METRICS_EXPORT = "METRICS_EXPORT";
        public static final String DASHBOARD_CREATE = "DASHBOARD_CREATE";
        public static final String DASHBOARD_READ = "DASHBOARD_READ";
        public static final String DASHBOARD_UPDATE = "DASHBOARD_UPDATE";
        public static final String DASHBOARD_DELETE = "DASHBOARD_DELETE";
        
        // System Administration Permissions
        public static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";
        public static final String SYSTEM_CONFIG = "SYSTEM_CONFIG";
        public static final String SYSTEM_LOGS = "SYSTEM_LOGS";
        public static final String SYSTEM_BACKUP = "SYSTEM_BACKUP";
        
        // Role and Permission Management
        public static final String ROLE_CREATE = "ROLE_CREATE";
        public static final String ROLE_READ = "ROLE_READ";
        public static final String ROLE_UPDATE = "ROLE_UPDATE";
        public static final String ROLE_DELETE = "ROLE_DELETE";
        public static final String PERMISSION_MANAGE = "PERMISSION_MANAGE";

        /**
         * Create all system permissions
         */
        public static Set<Permission> createSystemPermissions() {
            Set<Permission> permissions = new HashSet<>();
            
            // User Management
            permissions.add(createPermission(USER_CREATE, "Create new users", "USER", "CREATE"));
            permissions.add(createPermission(USER_READ, "View user information", "USER", "READ"));
            permissions.add(createPermission(USER_UPDATE, "Update user information", "USER", "UPDATE"));
            permissions.add(createPermission(USER_DELETE, "Delete users", "USER", "DELETE"));
            permissions.add(createPermission(USER_MANAGE_ROLES, "Manage user roles", "USER", "MANAGE_ROLES"));
            
            // Server Management
            permissions.add(createPermission(SERVER_CREATE, "Add new servers", "SERVER", "CREATE"));
            permissions.add(createPermission(SERVER_READ, "View server information", "SERVER", "READ"));
            permissions.add(createPermission(SERVER_UPDATE, "Update server configuration", "SERVER", "UPDATE"));
            permissions.add(createPermission(SERVER_DELETE, "Remove servers", "SERVER", "DELETE"));
            permissions.add(createPermission(SERVER_MANAGE, "Full server management", "SERVER", "MANAGE"));
            
            // Alert Management
            permissions.add(createPermission(ALERT_CREATE, "Create alerts", "ALERT", "CREATE"));
            permissions.add(createPermission(ALERT_READ, "View alerts", "ALERT", "READ"));
            permissions.add(createPermission(ALERT_UPDATE, "Update alerts", "ALERT", "UPDATE"));
            permissions.add(createPermission(ALERT_DELETE, "Delete alerts", "ALERT", "DELETE"));
            permissions.add(createPermission(ALERT_ACKNOWLEDGE, "Acknowledge alerts", "ALERT", "ACKNOWLEDGE"));
            permissions.add(createPermission(ALERT_RESOLVE, "Resolve alerts", "ALERT", "RESOLVE"));
            
            // Monitoring
            permissions.add(createPermission(METRICS_READ, "View metrics", "METRICS", "READ"));
            permissions.add(createPermission(METRICS_EXPORT, "Export metrics", "METRICS", "EXPORT"));
            permissions.add(createPermission(DASHBOARD_CREATE, "Create dashboards", "DASHBOARD", "CREATE"));
            permissions.add(createPermission(DASHBOARD_READ, "View dashboards", "DASHBOARD", "READ"));
            permissions.add(createPermission(DASHBOARD_UPDATE, "Update dashboards", "DASHBOARD", "UPDATE"));
            permissions.add(createPermission(DASHBOARD_DELETE, "Delete dashboards", "DASHBOARD", "DELETE"));
            
            // System Administration
            permissions.add(createPermission(SYSTEM_ADMIN, "System administration", "SYSTEM", "ADMIN"));
            permissions.add(createPermission(SYSTEM_CONFIG, "System configuration", "SYSTEM", "CONFIG"));
            permissions.add(createPermission(SYSTEM_LOGS, "View system logs", "SYSTEM", "LOGS"));
            permissions.add(createPermission(SYSTEM_BACKUP, "System backup/restore", "SYSTEM", "BACKUP"));
            
            // Role Management
            permissions.add(createPermission(ROLE_CREATE, "Create roles", "ROLE", "CREATE"));
            permissions.add(createPermission(ROLE_READ, "View roles", "ROLE", "READ"));
            permissions.add(createPermission(ROLE_UPDATE, "Update roles", "ROLE", "UPDATE"));
            permissions.add(createPermission(ROLE_DELETE, "Delete roles", "ROLE", "DELETE"));
            permissions.add(createPermission(PERMISSION_MANAGE, "Manage permissions", "PERMISSION", "MANAGE"));
            
            return permissions;
        }
        
        private static Permission createPermission(String name, String description, String resource, String action) {
            Permission permission = new Permission(name, description, resource, action);
            permission.setIsSystemPermission(true);
            return permission;
        }
    }
}
