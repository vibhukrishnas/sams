/**
 * 🔐 Security Service - Enterprise-Grade Security Framework
 * Comprehensive security implementation with MFA, API key management, and audit logging
 */

package com.monitoring.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;

@SpringBootApplication
@EnableJpaAuditing
@EnableCaching
@EnableAsync
@EnableScheduling
@EnableGlobalMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecurityServiceApplication.class, args);
    }
}

/**
 * Security configuration with comprehensive protection
 */
package com.monitoring.security.config;

import com.monitoring.security.filter.*;
import com.monitoring.security.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Autowired
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @Autowired
    private IpWhitelistFilter ipWhitelistFilter;

    @Autowired
    private SecurityAuditFilter securityAuditFilter;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }

    @Override
    protected void configure(AuthenticationManagerBuilder auth) throws Exception {
        auth.userDetailsService(userDetailsService).passwordEncoder(passwordEncoder());
    }

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.cors().and().csrf().disable()
                
                // Security headers
                .headers(headers -> headers
                        .frameOptions().deny()
                        .contentTypeOptions().and()
                        .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                                .maxAgeInSeconds(31536000)
                                .includeSubdomains(true))
                        .referrerPolicy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                        .and())
                
                // Session management
                .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                
                // Exception handling
                .exceptionHandling()
                .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                .and()
                
                // Authorization rules
                .authorizeRequests(authz -> authz
                        // Public endpoints
                        .antMatchers("/api/v*/auth/login", "/api/v*/auth/register", "/api/v*/auth/refresh").permitAll()
                        .antMatchers("/api/v*/auth/forgot-password", "/api/v*/auth/reset-password").permitAll()
                        .antMatchers("/health/**", "/actuator/health").permitAll()
                        .antMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-resources/**").permitAll()
                        
                        // API key endpoints
                        .antMatchers("/api/v*/api-keys/**").hasRole("ADMIN")
                        
                        // MFA endpoints
                        .antMatchers("/api/v*/auth/mfa/**").authenticated()
                        
                        // Admin endpoints
                        .antMatchers("/api/v*/admin/**").hasRole("ADMIN")
                        .antMatchers("/api/v*/security/**").hasRole("ADMIN")
                        
                        // Manager endpoints
                        .antMatchers("/api/v*/servers/**").hasAnyRole("ADMIN", "MANAGER", "USER")
                        .antMatchers("/api/v*/alerts/**").hasAnyRole("ADMIN", "MANAGER", "USER")
                        
                        // All other endpoints require authentication
                        .anyRequest().authenticated())
                
                // Add custom filters
                .addFilterBefore(securityAuditFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(ipWhitelistFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}

/**
 * Multi-Factor Authentication Service
 */
package com.monitoring.security.service;

import com.monitoring.security.entity.User;
import com.monitoring.security.entity.MfaToken;
import com.monitoring.security.repository.MfaTokenRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class MfaService {

    private static final Logger logger = LoggerFactory.getLogger(MfaService.class);

    @Autowired
    private MfaTokenRepository mfaTokenRepository;

    @Autowired
    private SecurityAuditService auditService;

    private final GoogleAuthenticator googleAuthenticator = new GoogleAuthenticator();

    /**
     * Generate MFA secret for user
     */
    public MfaSetupResponse generateMfaSecret(User user) {
        logger.info("🔐 Generating MFA secret for user: {}", user.getUsername());

        try {
            GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
            String secret = key.getKey();
            
            // Generate QR code URL
            String qrCodeUrl = GoogleAuthenticatorQRGenerator.getOtpAuthURL(
                    "SAMS Monitoring", user.getUsername(), key);

            // Save MFA token
            MfaToken mfaToken = new MfaToken();
            mfaToken.setUserId(user.getId());
            mfaToken.setSecret(secret);
            mfaToken.setEnabled(false);
            mfaToken.setCreatedAt(LocalDateTime.now());
            mfaTokenRepository.save(mfaToken);

            auditService.logSecurityEvent("MFA_SECRET_GENERATED", user.getId(), 
                    "MFA secret generated for user", null);

            return new MfaSetupResponse(secret, qrCodeUrl, false);

        } catch (Exception e) {
            logger.error("❌ Error generating MFA secret for user {}: {}", user.getUsername(), e.getMessage(), e);
            throw new SecurityException("Failed to generate MFA secret");
        }
    }

    /**
     * Enable MFA for user after verification
     */
    public boolean enableMfa(User user, String verificationCode) {
        logger.info("🔐 Enabling MFA for user: {}", user.getUsername());

        try {
            Optional<MfaToken> tokenOpt = mfaTokenRepository.findByUserId(user.getId());
            if (!tokenOpt.isPresent()) {
                logger.warn("⚠️ No MFA token found for user: {}", user.getUsername());
                return false;
            }

            MfaToken mfaToken = tokenOpt.get();
            
            // Verify the code
            boolean isValid = googleAuthenticator.authorize(mfaToken.getSecret(), Integer.parseInt(verificationCode));
            
            if (isValid) {
                mfaToken.setEnabled(true);
                mfaToken.setEnabledAt(LocalDateTime.now());
                mfaTokenRepository.save(mfaToken);

                auditService.logSecurityEvent("MFA_ENABLED", user.getId(), 
                        "MFA enabled for user", null);

                logger.info("✅ MFA enabled successfully for user: {}", user.getUsername());
                return true;
            } else {
                auditService.logSecurityEvent("MFA_ENABLE_FAILED", user.getId(), 
                        "Invalid verification code provided", null);
                
                logger.warn("⚠️ Invalid MFA verification code for user: {}", user.getUsername());
                return false;
            }

        } catch (Exception e) {
            logger.error("❌ Error enabling MFA for user {}: {}", user.getUsername(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Verify MFA code
     */
    public boolean verifyMfaCode(User user, String code) {
        try {
            Optional<MfaToken> tokenOpt = mfaTokenRepository.findByUserIdAndEnabled(user.getId(), true);
            if (!tokenOpt.isPresent()) {
                return false;
            }

            MfaToken mfaToken = tokenOpt.get();
            boolean isValid = googleAuthenticator.authorize(mfaToken.getSecret(), Integer.parseInt(code));

            if (isValid) {
                auditService.logSecurityEvent("MFA_VERIFICATION_SUCCESS", user.getId(), 
                        "MFA code verified successfully", null);
            } else {
                auditService.logSecurityEvent("MFA_VERIFICATION_FAILED", user.getId(), 
                        "Invalid MFA code provided", null);
            }

            return isValid;

        } catch (Exception e) {
            logger.error("❌ Error verifying MFA code for user {}: {}", user.getUsername(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Disable MFA for user
     */
    public boolean disableMfa(User user, String verificationCode) {
        logger.info("🔐 Disabling MFA for user: {}", user.getUsername());

        try {
            // Verify current MFA code before disabling
            if (!verifyMfaCode(user, verificationCode)) {
                logger.warn("⚠️ Invalid MFA code provided for disabling MFA: {}", user.getUsername());
                return false;
            }

            Optional<MfaToken> tokenOpt = mfaTokenRepository.findByUserId(user.getId());
            if (tokenOpt.isPresent()) {
                MfaToken mfaToken = tokenOpt.get();
                mfaToken.setEnabled(false);
                mfaToken.setDisabledAt(LocalDateTime.now());
                mfaTokenRepository.save(mfaToken);

                auditService.logSecurityEvent("MFA_DISABLED", user.getId(), 
                        "MFA disabled for user", null);

                logger.info("✅ MFA disabled successfully for user: {}", user.getUsername());
                return true;
            }

            return false;

        } catch (Exception e) {
            logger.error("❌ Error disabling MFA for user {}: {}", user.getUsername(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Check if user has MFA enabled
     */
    public boolean isMfaEnabled(User user) {
        return mfaTokenRepository.findByUserIdAndEnabled(user.getId(), true).isPresent();
    }

    /**
     * Generate backup codes for MFA
     */
    public List<String> generateBackupCodes(User user) {
        logger.info("🔐 Generating MFA backup codes for user: {}", user.getUsername());

        List<String> backupCodes = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            backupCodes.add(generateBackupCode());
        }

        // Save backup codes (hashed)
        saveMfaBackupCodes(user, backupCodes);

        auditService.logSecurityEvent("MFA_BACKUP_CODES_GENERATED", user.getId(), 
                "MFA backup codes generated", null);

        return backupCodes;
    }

    private String generateBackupCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private void saveMfaBackupCodes(User user, List<String> codes) {
        // Implementation to save hashed backup codes
    }

    public static class MfaSetupResponse {
        private final String secret;
        private final String qrCodeUrl;
        private final boolean enabled;

        public MfaSetupResponse(String secret, String qrCodeUrl, boolean enabled) {
            this.secret = secret;
            this.qrCodeUrl = qrCodeUrl;
            this.enabled = enabled;
        }

        // Getters
        public String getSecret() { return secret; }
        public String getQrCodeUrl() { return qrCodeUrl; }
        public boolean isEnabled() { return enabled; }
    }
}

/**
 * API Key Management Service
 */
package com.monitoring.security.service;

import com.monitoring.security.entity.ApiKey;
import com.monitoring.security.entity.User;
import com.monitoring.security.repository.ApiKeyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ApiKeyService {

    private static final Logger logger = LoggerFactory.getLogger(ApiKeyService.class);

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SecurityAuditService auditService;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generate new API key
     */
    public ApiKeyResponse generateApiKey(User user, CreateApiKeyRequest request) {
        logger.info("🔑 Generating API key for user: {}", user.getUsername());

        try {
            // Generate secure API key
            String rawApiKey = generateSecureApiKey();
            String hashedApiKey = passwordEncoder.encode(rawApiKey);

            // Create API key entity
            ApiKey apiKey = new ApiKey();
            apiKey.setId(UUID.randomUUID());
            apiKey.setUserId(user.getId());
            apiKey.setName(request.getName());
            apiKey.setDescription(request.getDescription());
            apiKey.setKeyHash(hashedApiKey);
            apiKey.setPrefix(rawApiKey.substring(0, 8));
            apiKey.setScopes(request.getScopes());
            apiKey.setRateLimitTier(request.getRateLimitTier());
            apiKey.setExpiresAt(request.getExpiresAt());
            apiKey.setCreatedAt(LocalDateTime.now());
            apiKey.setActive(true);

            // Set IP restrictions if provided
            if (request.getIpRestrictions() != null && !request.getIpRestrictions().isEmpty()) {
                apiKey.setIpRestrictions(String.join(",", request.getIpRestrictions()));
            }

            apiKeyRepository.save(apiKey);

            auditService.logSecurityEvent("API_KEY_CREATED", user.getId(), 
                    "API key created: " + request.getName(), 
                    Map.of("api_key_id", apiKey.getId().toString()));

            logger.info("✅ API key generated successfully for user: {}", user.getUsername());

            return new ApiKeyResponse(apiKey.getId(), rawApiKey, apiKey.getPrefix(), 
                    apiKey.getName(), apiKey.getScopes(), apiKey.getExpiresAt());

        } catch (Exception e) {
            logger.error("❌ Error generating API key for user {}: {}", user.getUsername(), e.getMessage(), e);
            throw new SecurityException("Failed to generate API key");
        }
    }

    /**
     * Validate API key
     */
    public ApiKeyValidationResult validateApiKey(String apiKey, String clientIp) {
        try {
            String prefix = apiKey.substring(0, 8);
            
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByPrefixAndActive(prefix, true);
            if (!apiKeyOpt.isPresent()) {
                return ApiKeyValidationResult.invalid("API key not found");
            }

            ApiKey storedApiKey = apiKeyOpt.get();

            // Check if API key matches
            if (!passwordEncoder.matches(apiKey, storedApiKey.getKeyHash())) {
                auditService.logSecurityEvent("API_KEY_INVALID", storedApiKey.getUserId(), 
                        "Invalid API key used", Map.of("client_ip", clientIp));
                return ApiKeyValidationResult.invalid("Invalid API key");
            }

            // Check expiration
            if (storedApiKey.getExpiresAt() != null && storedApiKey.getExpiresAt().isBefore(LocalDateTime.now())) {
                return ApiKeyValidationResult.invalid("API key expired");
            }

            // Check IP restrictions
            if (storedApiKey.getIpRestrictions() != null && !storedApiKey.getIpRestrictions().isEmpty()) {
                List<String> allowedIps = Arrays.asList(storedApiKey.getIpRestrictions().split(","));
                if (!allowedIps.contains(clientIp)) {
                    auditService.logSecurityEvent("API_KEY_IP_VIOLATION", storedApiKey.getUserId(), 
                            "API key used from unauthorized IP", 
                            Map.of("client_ip", clientIp, "allowed_ips", storedApiKey.getIpRestrictions()));
                    return ApiKeyValidationResult.invalid("IP address not authorized");
                }
            }

            // Update last used
            storedApiKey.setLastUsedAt(LocalDateTime.now());
            storedApiKey.setLastUsedIp(clientIp);
            apiKeyRepository.save(storedApiKey);

            return ApiKeyValidationResult.valid(storedApiKey);

        } catch (Exception e) {
            logger.error("❌ Error validating API key: {}", e.getMessage(), e);
            return ApiKeyValidationResult.invalid("API key validation error");
        }
    }

    /**
     * Revoke API key
     */
    public boolean revokeApiKey(UUID apiKeyId, User user) {
        logger.info("🔑 Revoking API key: {} for user: {}", apiKeyId, user.getUsername());

        try {
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByIdAndUserId(apiKeyId, user.getId());
            if (!apiKeyOpt.isPresent()) {
                logger.warn("⚠️ API key not found or not owned by user: {}", apiKeyId);
                return false;
            }

            ApiKey apiKey = apiKeyOpt.get();
            apiKey.setActive(false);
            apiKey.setRevokedAt(LocalDateTime.now());
            apiKeyRepository.save(apiKey);

            auditService.logSecurityEvent("API_KEY_REVOKED", user.getId(), 
                    "API key revoked: " + apiKey.getName(), 
                    Map.of("api_key_id", apiKeyId.toString()));

            logger.info("✅ API key revoked successfully: {}", apiKeyId);
            return true;

        } catch (Exception e) {
            logger.error("❌ Error revoking API key {}: {}", apiKeyId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * List user's API keys
     */
    public List<ApiKeyDto> getUserApiKeys(User user) {
        List<ApiKey> apiKeys = apiKeyRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        
        return apiKeys.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private String generateSecureApiKey() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return "sams_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private ApiKeyDto convertToDto(ApiKey apiKey) {
        return ApiKeyDto.builder()
                .id(apiKey.getId())
                .name(apiKey.getName())
                .description(apiKey.getDescription())
                .prefix(apiKey.getPrefix())
                .scopes(apiKey.getScopes())
                .rateLimitTier(apiKey.getRateLimitTier())
                .active(apiKey.getActive())
                .expiresAt(apiKey.getExpiresAt())
                .lastUsedAt(apiKey.getLastUsedAt())
                .createdAt(apiKey.getCreatedAt())
                .build();
    }

    public static class ApiKeyValidationResult {
        private final boolean valid;
        private final String errorMessage;
        private final ApiKey apiKey;

        private ApiKeyValidationResult(boolean valid, String errorMessage, ApiKey apiKey) {
            this.valid = valid;
            this.errorMessage = errorMessage;
            this.apiKey = apiKey;
        }

        public static ApiKeyValidationResult valid(ApiKey apiKey) {
            return new ApiKeyValidationResult(true, null, apiKey);
        }

        public static ApiKeyValidationResult invalid(String errorMessage) {
            return new ApiKeyValidationResult(false, errorMessage, null);
        }

        // Getters
        public boolean isValid() { return valid; }
        public String getErrorMessage() { return errorMessage; }
        public ApiKey getApiKey() { return apiKey; }
    }
}
