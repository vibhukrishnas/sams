package com.sams.enterprise.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Enterprise Permission Entity for RBAC
 */
@Entity
@Table(name = "permissions", indexes = {
    @Index(name = "idx_permission_name", columnList = "name"),
    @Index(name = "idx_permission_resource", columnList = "resource")
})
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 2, max = 100)
    @Column(unique = true, nullable = false)
    private String name;

    @Size(max = 255)
    private String description;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String resource;

    @NotBlank
    @Size(max = 20)
    @Column(nullable = false)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermissionType type = PermissionType.FUNCTIONAL;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToMany(mappedBy = "permissions")
    private Set<Role> roles = new HashSet<>();

    // Constructors
    public Permission() {}

    public Permission(String name, String description, String resource, String action, PermissionType type) {
        this.name = name;
        this.description = description;
        this.resource = resource;
        this.action = action;
        this.type = type;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Lifecycle Callbacks
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
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

    public PermissionType getType() { return type; }
    public void setType(PermissionType type) { this.type = type; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    // Enums
    public enum PermissionType {
        SYSTEM, FUNCTIONAL, DATA
    }

    // Standard Permission Constants
    // User Management
    public static final String USER_CREATE = "USER_CREATE";
    public static final String USER_READ = "USER_READ";
    public static final String USER_UPDATE = "USER_UPDATE";
    public static final String USER_DELETE = "USER_DELETE";
    
    // Server Management
    public static final String SERVER_CREATE = "SERVER_CREATE";
    public static final String SERVER_READ = "SERVER_READ";
    public static final String SERVER_UPDATE = "SERVER_UPDATE";
    public static final String SERVER_DELETE = "SERVER_DELETE";
    public static final String SERVER_CONFIGURE = "SERVER_CONFIGURE";
    public static final String SERVER_RESTART = "SERVER_RESTART";
    
    // Alert Management
    public static final String ALERT_CREATE = "ALERT_CREATE";
    public static final String ALERT_READ = "ALERT_READ";
    public static final String ALERT_UPDATE = "ALERT_UPDATE";
    public static final String ALERT_DELETE = "ALERT_DELETE";
    public static final String ALERT_ACKNOWLEDGE = "ALERT_ACKNOWLEDGE";
    public static final String ALERT_RESOLVE = "ALERT_RESOLVE";
    
    // Report Management
    public static final String REPORT_CREATE = "REPORT_CREATE";
    public static final String REPORT_READ = "REPORT_READ";
    public static final String REPORT_EXPORT = "REPORT_EXPORT";
    public static final String REPORT_SHARE = "REPORT_SHARE";
    
    // System Commands
    public static final String COMMAND_EXECUTE = "COMMAND_EXECUTE";
    public static final String COMMAND_EMERGENCY = "COMMAND_EMERGENCY";
    
    // System Administration
    public static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";
    public static final String SYSTEM_CONFIG = "SYSTEM_CONFIG";
    public static final String SYSTEM_MONITOR = "SYSTEM_MONITOR";
    
    // Role Management
    public static final String ROLE_CREATE = "ROLE_CREATE";
    public static final String ROLE_READ = "ROLE_READ";
    public static final String ROLE_UPDATE = "ROLE_UPDATE";
    public static final String ROLE_DELETE = "ROLE_DELETE";
    public static final String ROLE_ASSIGN = "ROLE_ASSIGN";
}
