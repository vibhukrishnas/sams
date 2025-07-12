package com.sams.usermanagement.dto;

import java.util.List;

/**
 * Login Response DTO
 */
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserInfo user;

    // Constructors
    public LoginResponse() {}

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private LoginResponse response = new LoginResponse();

        public Builder accessToken(String accessToken) {
            response.accessToken = accessToken;
            return this;
        }

        public Builder refreshToken(String refreshToken) {
            response.refreshToken = refreshToken;
            return this;
        }

        public Builder tokenType(String tokenType) {
            response.tokenType = tokenType;
            return this;
        }

        public Builder expiresIn(Long expiresIn) {
            response.expiresIn = expiresIn;
            return this;
        }

        public Builder user(UserInfo user) {
            response.user = user;
            return this;
        }

        public LoginResponse build() {
            return response;
        }
    }

    // Getters and Setters
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public Long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(Long expiresIn) { this.expiresIn = expiresIn; }

    public UserInfo getUser() { return user; }
    public void setUser(UserInfo user) { this.user = user; }

    /**
     * User Info nested class
     */
    public static class UserInfo {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private List<String> roles;
        private List<String> permissions;
        private Boolean mustChangePassword;
        private Boolean twoFactorEnabled;

        // Builder pattern
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private UserInfo userInfo = new UserInfo();

            public Builder id(Long id) {
                userInfo.id = id;
                return this;
            }

            public Builder username(String username) {
                userInfo.username = username;
                return this;
            }

            public Builder email(String email) {
                userInfo.email = email;
                return this;
            }

            public Builder fullName(String fullName) {
                userInfo.fullName = fullName;
                return this;
            }

            public Builder roles(List<String> roles) {
                userInfo.roles = roles;
                return this;
            }

            public Builder permissions(List<String> permissions) {
                userInfo.permissions = permissions;
                return this;
            }

            public Builder mustChangePassword(Boolean mustChangePassword) {
                userInfo.mustChangePassword = mustChangePassword;
                return this;
            }

            public Builder twoFactorEnabled(Boolean twoFactorEnabled) {
                userInfo.twoFactorEnabled = twoFactorEnabled;
                return this;
            }

            public UserInfo build() {
                return userInfo;
            }
        }

        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public List<String> getRoles() { return roles; }
        public void setRoles(List<String> roles) { this.roles = roles; }

        public List<String> getPermissions() { return permissions; }
        public void setPermissions(List<String> permissions) { this.permissions = permissions; }

        public Boolean getMustChangePassword() { return mustChangePassword; }
        public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

        public Boolean getTwoFactorEnabled() { return twoFactorEnabled; }
        public void setTwoFactorEnabled(Boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }
    }
}
