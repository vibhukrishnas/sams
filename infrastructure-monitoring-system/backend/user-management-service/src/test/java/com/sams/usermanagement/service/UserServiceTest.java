package com.sams.usermanagement.service;

import com.sams.usermanagement.dto.UserCreateRequest;
import com.sams.usermanagement.dto.UserResponse;
import com.sams.usermanagement.entity.Role;
import com.sams.usermanagement.entity.User;
import com.sams.usermanagement.entity.UserStatus;
import com.sams.usermanagement.exception.UserAlreadyExistsException;
import com.sams.usermanagement.exception.UserNotFoundException;
import com.sams.usermanagement.repository.RoleRepository;
import com.sams.usermanagement.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PasswordPolicyService passwordPolicyService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private Role testRole;
    private UserCreateRequest createRequest;

    @BeforeEach
    void setUp() {
        // Setup test role
        testRole = new Role("USER", "Standard user role");
        testRole.setId(1L);

        // Setup test user
        testUser = new User("testuser", "test@example.com", "encodedPassword");
        testUser.setId(1L);
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setStatus(UserStatus.ACTIVE);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.addRole(testRole);

        // Setup create request
        createRequest = new UserCreateRequest();
        createRequest.setUsername("newuser");
        createRequest.setEmail("newuser@example.com");
        createRequest.setPassword("SecurePassword123!");
        createRequest.setFirstName("New");
        createRequest.setLastName("User");
        createRequest.setRoleNames(Set.of("USER"));
    }

    @Test
    void createUser_Success() {
        // Arrange
        when(userRepository.existsByUsernameIgnoreCase(createRequest.getUsername())).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(createRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(createRequest.getPassword())).thenReturn("encodedPassword");
        when(roleRepository.findByNameIgnoreCase("USER")).thenReturn(Optional.of(testRole));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        UserResponse response = userService.createUser(createRequest, "admin");

        // Assert
        assertNotNull(response);
        assertEquals(testUser.getUsername(), response.getUsername());
        assertEquals(testUser.getEmail(), response.getEmail());
        assertEquals(testUser.getFullName(), response.getFullName());
        assertTrue(response.getRoles().contains("USER"));

        verify(passwordPolicyService).validatePassword(createRequest.getPassword());
        verify(userRepository).save(any(User.class));
        verify(auditService).logUserCreated(testUser.getId(), "admin");
    }

    @Test
    void createUser_UsernameExists_ThrowsException() {
        // Arrange
        when(userRepository.existsByUsernameIgnoreCase(createRequest.getUsername())).thenReturn(true);

        // Act & Assert
        assertThrows(UserAlreadyExistsException.class, () -> {
            userService.createUser(createRequest, "admin");
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createUser_EmailExists_ThrowsException() {
        // Arrange
        when(userRepository.existsByUsernameIgnoreCase(createRequest.getUsername())).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase(createRequest.getEmail())).thenReturn(true);

        // Act & Assert
        assertThrows(UserAlreadyExistsException.class, () -> {
            userService.createUser(createRequest, "admin");
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void getUserById_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Act
        UserResponse response = userService.getUserById(1L);

        // Assert
        assertNotNull(response);
        assertEquals(testUser.getId(), response.getId());
        assertEquals(testUser.getUsername(), response.getUsername());
        assertEquals(testUser.getEmail(), response.getEmail());
    }

    @Test
    void getUserById_NotFound_ThrowsException() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUserById(1L);
        });
    }

    @Test
    void getUserByUsername_Success() {
        // Arrange
        when(userRepository.findByUsernameIgnoreCase("testuser")).thenReturn(Optional.of(testUser));

        // Act
        UserResponse response = userService.getUserByUsername("testuser");

        // Assert
        assertNotNull(response);
        assertEquals(testUser.getUsername(), response.getUsername());
    }

    @Test
    void getUserByUsername_NotFound_ThrowsException() {
        // Arrange
        when(userRepository.findByUsernameIgnoreCase("nonexistent")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UserNotFoundException.class, () -> {
            userService.getUserByUsername("nonexistent");
        });
    }

    @Test
    void deleteUser_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.deleteUser(1L, "admin");

        // Assert
        verify(userRepository).save(argThat(user -> 
            user.getStatus() == UserStatus.DELETED && 
            "admin".equals(user.getUpdatedBy())
        ));
        verify(auditService).logUserDeleted(1L, "admin");
    }

    @Test
    void changePassword_Success() {
        // Arrange
        String currentPassword = "currentPassword";
        String newPassword = "NewSecurePassword123!";
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(currentPassword, testUser.getPassword())).thenReturn(true);
        when(passwordEncoder.encode(newPassword)).thenReturn("newEncodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.changePassword(1L, currentPassword, newPassword, "admin");

        // Assert
        verify(passwordPolicyService).validatePassword(newPassword);
        verify(userRepository).save(argThat(user -> 
            user.getPassword().equals("newEncodedPassword") &&
            !user.getMustChangePassword() &&
            user.getPasswordChangedAt() != null
        ));
        verify(auditService).logPasswordChanged(1L, "admin");
    }

    @Test
    void changePassword_WrongCurrentPassword_ThrowsException() {
        // Arrange
        String currentPassword = "wrongPassword";
        String newPassword = "NewSecurePassword123!";
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(currentPassword, testUser.getPassword())).thenReturn(false);

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> {
            userService.changePassword(1L, currentPassword, newPassword, "admin");
        });

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPassword_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordPolicyService.generateTemporaryPassword()).thenReturn("TempPass123!");
        when(passwordEncoder.encode("TempPass123!")).thenReturn("encodedTempPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        String tempPassword = userService.resetPassword(1L, "admin");

        // Assert
        assertEquals("TempPass123!", tempPassword);
        verify(userRepository).save(argThat(user -> 
            user.getPassword().equals("encodedTempPassword") &&
            user.getMustChangePassword() &&
            user.getPasswordChangedAt() != null
        ));
        verify(auditService).logPasswordReset(1L, "admin");
    }

    @Test
    void lockUser_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.lockUser(1L, "admin");

        // Assert
        verify(userRepository).save(argThat(user -> 
            user.getStatus() == UserStatus.LOCKED &&
            user.getAccountLockedUntil() != null &&
            "admin".equals(user.getUpdatedBy())
        ));
        verify(auditService).logUserLocked(1L, "admin");
    }

    @Test
    void unlockUser_Success() {
        // Arrange
        testUser.setStatus(UserStatus.LOCKED);
        testUser.setAccountLockedUntil(LocalDateTime.now().plusDays(1));
        testUser.setFailedLoginAttempts(5);
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.unlockUser(1L, "admin");

        // Assert
        verify(userRepository).save(argThat(user -> 
            user.getStatus() == UserStatus.ACTIVE &&
            user.getAccountLockedUntil() == null &&
            user.getFailedLoginAttempts() == 0 &&
            "admin".equals(user.getUpdatedBy())
        ));
        verify(auditService).logUserUnlocked(1L, "admin");
    }

    @Test
    void assignRoles_Success() {
        // Arrange
        Role adminRole = new Role("ADMIN", "Administrator role");
        adminRole.setId(2L);
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByNameIgnoreCase("ADMIN")).thenReturn(Optional.of(adminRole));
        when(roleRepository.findByNameIgnoreCase("USER")).thenReturn(Optional.of(testRole));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        Set<String> roleNames = Set.of("ADMIN", "USER");

        // Act
        userService.assignRoles(1L, roleNames, "admin");

        // Assert
        verify(userRepository).save(argThat(user -> 
            user.getRoles().size() == 2 &&
            user.hasRole("ADMIN") &&
            user.hasRole("USER")
        ));
        verify(auditService).logRolesAssigned(1L, roleNames, "admin");
    }

    @Test
    void getUserStatistics_Success() {
        // Arrange
        Object[] statsArray = {10L, 8L, 1L, 1L, 2L, 3L}; // total, active, inactive, locked, ldap, 2fa
        when(userRepository.getUserStatistics()).thenReturn(statsArray);

        // Act
        UserService.UserStatistics stats = userService.getUserStatistics();

        // Assert
        assertNotNull(stats);
        assertEquals(10L, stats.getTotalUsers());
        assertEquals(8L, stats.getActiveUsers());
        assertEquals(1L, stats.getInactiveUsers());
        assertEquals(1L, stats.getLockedUsers());
        assertEquals(2L, stats.getLdapUsers());
        assertEquals(3L, stats.getTwoFactorUsers());
    }
}
