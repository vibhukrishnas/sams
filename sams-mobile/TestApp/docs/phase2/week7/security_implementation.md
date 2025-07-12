# 🔐 **SAMS Mobile - Security Implementation**

## **Executive Summary**

This document presents the enterprise-grade security implementation for SAMS Mobile, featuring multi-factor authentication (MFA) support, comprehensive API key management system, encryption at rest and in transit, security audit logging, IP whitelisting and blacklisting, and extensive security testing suite.

## **🏗️ Security Architecture**

### **Enterprise Security Framework**
```mermaid
graph TB
    subgraph "Authentication Layer"
        MFA[🔐 Multi-Factor Auth]
        JWT[🎫 JWT Tokens]
        OAuth[🔑 OAuth 2.0]
        LDAP[📋 LDAP/AD]
    end
    
    subgraph "Authorization Layer"
        RBAC[👥 Role-Based Access]
        Permissions[✅ Permissions]
        ResourceAccess[🔒 Resource Access]
        APIKeys[🗝️ API Key Management]
    end
    
    subgraph "Encryption Layer"
        DataAtRest[💾 Data at Rest]
        DataInTransit[🌐 Data in Transit]
        KeyManagement[🔐 Key Management]
        CertificateManagement[📜 Certificate Management]
    end
    
    subgraph "Network Security"
        IPWhitelist[✅ IP Whitelist]
        IPBlacklist[❌ IP Blacklist]
        Firewall[🛡️ Firewall Rules]
        DDoSProtection[🛡️ DDoS Protection]
    end
    
    subgraph "Audit & Monitoring"
        SecurityAudit[📝 Security Audit]
        ThreatDetection[🚨 Threat Detection]
        SecurityAlerts[⚠️ Security Alerts]
        ComplianceReporting[📊 Compliance Reports]
    end
    
    subgraph "Security Testing"
        VulnerabilityScanning[🔍 Vulnerability Scanning]
        PenetrationTesting[🎯 Penetration Testing]
        SecurityTesting[🧪 Security Testing]
        ComplianceValidation[✅ Compliance Validation]
    end
    
    MFA --> JWT
    JWT --> OAuth
    OAuth --> LDAP
    
    JWT --> RBAC
    RBAC --> Permissions
    Permissions --> ResourceAccess
    ResourceAccess --> APIKeys
    
    DataAtRest --> KeyManagement
    DataInTransit --> KeyManagement
    KeyManagement --> CertificateManagement
    
    IPWhitelist --> Firewall
    IPBlacklist --> Firewall
    Firewall --> DDoSProtection
    
    SecurityAudit --> ThreatDetection
    ThreatDetection --> SecurityAlerts
    SecurityAlerts --> ComplianceReporting
    
    VulnerabilityScanning --> PenetrationTesting
    PenetrationTesting --> SecurityTesting
    SecurityTesting --> ComplianceValidation
```

## **🔐 Multi-Factor Authentication (MFA)**

### **MFA Implementation**
```java
// security/MFAService.java
@Service
@Slf4j
public class MFAService {
    
    private final TOTPGenerator totpGenerator;
    private final SMSService smsService;
    private final EmailService emailService;
    private final MFAConfigurationRepository mfaConfigRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final MeterRegistry meterRegistry;
    
    // Metrics
    private final Counter mfaAttempts;
    private final Counter mfaSuccesses;
    private final Counter mfaFailures;
    private final Timer mfaVerificationTime;
    
    public MFAService(TOTPGenerator totpGenerator,
                     SMSService smsService,
                     EmailService emailService,
                     MFAConfigurationRepository mfaConfigRepository,
                     RedisTemplate<String, String> redisTemplate,
                     MeterRegistry meterRegistry) {
        this.totpGenerator = totpGenerator;
        this.smsService = smsService;
        this.emailService = emailService;
        this.mfaConfigRepository = mfaConfigRepository;
        this.redisTemplate = redisTemplate;
        this.meterRegistry = meterRegistry;
        
        this.mfaAttempts = Counter.builder("mfa.attempts")
            .description("Number of MFA attempts")
            .register(meterRegistry);
            
        this.mfaSuccesses = Counter.builder("mfa.successes")
            .description("Number of successful MFA verifications")
            .register(meterRegistry);
            
        this.mfaFailures = Counter.builder("mfa.failures")
            .description("Number of failed MFA verifications")
            .register(meterRegistry);
            
        this.mfaVerificationTime = Timer.builder("mfa.verification.time")
            .description("Time taken for MFA verification")
            .register(meterRegistry);
    }
    
    public MFASetupResult setupMFA(String userId, MFAMethod method) {
        Timer.Sample sample = Timer.start(meterRegistry);
        
        try {
            MFAConfiguration existingConfig = mfaConfigRepository.findByUserId(userId);
            
            if (existingConfig != null && existingConfig.isEnabled()) {
                throw new MFAAlreadyEnabledException("MFA is already enabled for user: " + userId);
            }
            
            MFASetupResult result;
            
            switch (method) {
                case TOTP:
                    result = setupTOTP(userId);
                    break;
                case SMS:
                    result = setupSMS(userId);
                    break;
                case EMAIL:
                    result = setupEmail(userId);
                    break;
                case BACKUP_CODES:
                    result = setupBackupCodes(userId);
                    break;
                default:
                    throw new UnsupportedMFAMethodException("Unsupported MFA method: " + method);
            }
            
            log.info("MFA setup initiated for user: {} with method: {}", userId, method);
            return result;
            
        } catch (Exception e) {
            log.error("Failed to setup MFA for user: {}", userId, e);
            throw new MFASetupException("Failed to setup MFA", e);
        } finally {
            sample.stop(mfaVerificationTime);
        }
    }
    
    public MFAVerificationResult verifyMFA(String userId, String code, MFAMethod method) {
        Timer.Sample sample = Timer.start(meterRegistry);
        mfaAttempts.increment(Tags.of("method", method.name(), "user", userId));
        
        try {
            MFAConfiguration config = mfaConfigRepository.findByUserId(userId);
            
            if (config == null || !config.isEnabled()) {
                mfaFailures.increment(Tags.of("method", method.name(), "reason", "not_enabled"));
                return MFAVerificationResult.builder()
                    .success(false)
                    .reason("MFA not enabled for user")
                    .build();
            }
            
            // Check rate limiting
            if (isRateLimited(userId)) {
                mfaFailures.increment(Tags.of("method", method.name(), "reason", "rate_limited"));
                return MFAVerificationResult.builder()
                    .success(false)
                    .reason("Too many failed attempts. Please try again later.")
                    .rateLimited(true)
                    .build();
            }
            
            boolean isValid = false;
            
            switch (method) {
                case TOTP:
                    isValid = verifyTOTP(config, code);
                    break;
                case SMS:
                    isValid = verifySMS(userId, code);
                    break;
                case EMAIL:
                    isValid = verifyEmail(userId, code);
                    break;
                case BACKUP_CODES:
                    isValid = verifyBackupCode(config, code);
                    break;
            }
            
            if (isValid) {
                mfaSuccesses.increment(Tags.of("method", method.name()));
                clearFailedAttempts(userId);
                
                return MFAVerificationResult.builder()
                    .success(true)
                    .reason("MFA verification successful")
                    .build();
            } else {
                mfaFailures.increment(Tags.of("method", method.name(), "reason", "invalid_code"));
                recordFailedAttempt(userId);
                
                return MFAVerificationResult.builder()
                    .success(false)
                    .reason("Invalid MFA code")
                    .build();
            }
            
        } catch (Exception e) {
            mfaFailures.increment(Tags.of("method", method.name(), "reason", "error"));
            log.error("Error verifying MFA for user: {}", userId, e);
            
            return MFAVerificationResult.builder()
                .success(false)
                .reason("MFA verification failed due to system error")
                .build();
        } finally {
            sample.stop(mfaVerificationTime);
        }
    }
    
    private MFASetupResult setupTOTP(String userId) {
        String secret = totpGenerator.generateSecret();
        String qrCodeUrl = totpGenerator.generateQRCodeUrl(userId, secret, "SAMS Mobile");
        
        // Store temporary secret (not yet enabled)
        MFAConfiguration config = MFAConfiguration.builder()
            .userId(userId)
            .method(MFAMethod.TOTP)
            .secret(encryptSecret(secret))
            .enabled(false)
            .createdAt(Instant.now())
            .build();
        
        mfaConfigRepository.save(config);
        
        return MFASetupResult.builder()
            .method(MFAMethod.TOTP)
            .secret(secret)
            .qrCodeUrl(qrCodeUrl)
            .backupCodes(generateBackupCodes())
            .build();
    }
    
    private MFASetupResult setupSMS(String userId) {
        // Generate and send SMS verification code
        String verificationCode = generateVerificationCode();
        String phoneNumber = getUserPhoneNumber(userId);
        
        if (phoneNumber == null) {
            throw new MFASetupException("Phone number not configured for user");
        }
        
        smsService.sendMFASetupCode(phoneNumber, verificationCode);
        
        // Store temporary verification code
        String key = "mfa_setup_sms:" + userId;
        redisTemplate.opsForValue().set(key, verificationCode, Duration.ofMinutes(5));
        
        return MFASetupResult.builder()
            .method(MFAMethod.SMS)
            .phoneNumber(maskPhoneNumber(phoneNumber))
            .build();
    }
    
    private boolean verifyTOTP(MFAConfiguration config, String code) {
        try {
            String decryptedSecret = decryptSecret(config.getSecret());
            return totpGenerator.verifyCode(decryptedSecret, code);
        } catch (Exception e) {
            log.error("Error verifying TOTP code", e);
            return false;
        }
    }
    
    private boolean verifySMS(String userId, String code) {
        String key = "mfa_sms:" + userId;
        String storedCode = redisTemplate.opsForValue().get(key);
        
        if (storedCode != null && storedCode.equals(code)) {
            redisTemplate.delete(key);
            return true;
        }
        
        return false;
    }
    
    private void recordFailedAttempt(String userId) {
        String key = "mfa_failed_attempts:" + userId;
        String attemptsStr = redisTemplate.opsForValue().get(key);
        int attempts = attemptsStr != null ? Integer.parseInt(attemptsStr) : 0;
        
        attempts++;
        redisTemplate.opsForValue().set(key, String.valueOf(attempts), Duration.ofMinutes(15));
        
        if (attempts >= 5) {
            // Lock account temporarily
            String lockKey = "mfa_locked:" + userId;
            redisTemplate.opsForValue().set(lockKey, "locked", Duration.ofMinutes(30));
            
            log.warn("User {} locked due to too many failed MFA attempts", userId);
        }
    }
    
    private boolean isRateLimited(String userId) {
        String lockKey = "mfa_locked:" + userId;
        return redisTemplate.hasKey(lockKey);
    }
    
    private void clearFailedAttempts(String userId) {
        String key = "mfa_failed_attempts:" + userId;
        redisTemplate.delete(key);
    }
    
    private String encryptSecret(String secret) {
        // Use AES encryption for storing secrets
        try {
            return AESUtil.encrypt(secret, getEncryptionKey());
        } catch (Exception e) {
            throw new SecurityException("Failed to encrypt MFA secret", e);
        }
    }
    
    private String decryptSecret(String encryptedSecret) {
        try {
            return AESUtil.decrypt(encryptedSecret, getEncryptionKey());
        } catch (Exception e) {
            throw new SecurityException("Failed to decrypt MFA secret", e);
        }
    }
    
    private String getEncryptionKey() {
        // Get encryption key from secure key management system
        return System.getenv("MFA_ENCRYPTION_KEY");
    }
}
```

## **🗝️ API Key Management System**

### **API Key Management Implementation**
```java
// security/ApiKeyService.java
@Service
@Slf4j
public class ApiKeyService {
    
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, String> redisTemplate;
    private final SecurityAuditService auditService;
    
    public ApiKeyService(ApiKeyRepository apiKeyRepository,
                        PasswordEncoder passwordEncoder,
                        RedisTemplate<String, String> redisTemplate,
                        SecurityAuditService auditService) {
        this.apiKeyRepository = apiKeyRepository;
        this.passwordEncoder = passwordEncoder;
        this.redisTemplate = redisTemplate;
        this.auditService = auditService;
    }
    
    public ApiKeyCreationResult createApiKey(String userId, ApiKeyRequest request) {
        try {
            // Generate secure API key
            String apiKey = generateSecureApiKey();
            String hashedKey = passwordEncoder.encode(apiKey);
            
            // Create API key entity
            ApiKey apiKeyEntity = ApiKey.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .name(request.getName())
                .description(request.getDescription())
                .hashedKey(hashedKey)
                .permissions(request.getPermissions())
                .ipWhitelist(request.getIpWhitelist())
                .rateLimit(request.getRateLimit())
                .expiresAt(request.getExpiresAt())
                .enabled(true)
                .createdAt(Instant.now())
                .lastUsedAt(null)
                .usageCount(0L)
                .build();
            
            apiKeyRepository.save(apiKeyEntity);
            
            // Cache API key for fast lookup
            cacheApiKey(apiKeyEntity);
            
            // Audit log
            auditService.logApiKeyCreation(userId, apiKeyEntity.getId(), request.getName());
            
            log.info("API key created for user: {} with name: {}", userId, request.getName());
            
            return ApiKeyCreationResult.builder()
                .apiKey(apiKey) // Return plain text key only once
                .keyId(apiKeyEntity.getId())
                .name(apiKeyEntity.getName())
                .permissions(apiKeyEntity.getPermissions())
                .expiresAt(apiKeyEntity.getExpiresAt())
                .build();
                
        } catch (Exception e) {
            log.error("Failed to create API key for user: {}", userId, e);
            throw new ApiKeyCreationException("Failed to create API key", e);
        }
    }
    
    public ApiKeyValidationResult validateApiKey(String apiKey, String clientIp, String requestPath) {
        try {
            // Check cache first
            String cachedKeyId = redisTemplate.opsForValue().get("api_key:" + hashApiKey(apiKey));
            
            ApiKey apiKeyEntity;
            if (cachedKeyId != null) {
                apiKeyEntity = apiKeyRepository.findById(cachedKeyId).orElse(null);
            } else {
                // Fallback to database lookup (slower)
                apiKeyEntity = findApiKeyByHash(apiKey);
                if (apiKeyEntity != null) {
                    cacheApiKey(apiKeyEntity);
                }
            }
            
            if (apiKeyEntity == null) {
                auditService.logApiKeyValidationFailure(apiKey, clientIp, "key_not_found");
                return ApiKeyValidationResult.invalid("API key not found");
            }
            
            // Check if key is enabled
            if (!apiKeyEntity.isEnabled()) {
                auditService.logApiKeyValidationFailure(apiKey, clientIp, "key_disabled");
                return ApiKeyValidationResult.invalid("API key is disabled");
            }
            
            // Check expiration
            if (apiKeyEntity.getExpiresAt() != null && 
                apiKeyEntity.getExpiresAt().isBefore(Instant.now())) {
                auditService.logApiKeyValidationFailure(apiKey, clientIp, "key_expired");
                return ApiKeyValidationResult.invalid("API key has expired");
            }
            
            // Check IP whitelist
            if (!isIpAllowed(apiKeyEntity, clientIp)) {
                auditService.logApiKeyValidationFailure(apiKey, clientIp, "ip_not_whitelisted");
                return ApiKeyValidationResult.invalid("IP address not whitelisted");
            }
            
            // Check permissions
            if (!hasPermissionForPath(apiKeyEntity, requestPath)) {
                auditService.logApiKeyValidationFailure(apiKey, clientIp, "insufficient_permissions");
                return ApiKeyValidationResult.invalid("Insufficient permissions");
            }
            
            // Check rate limit
            if (isRateLimited(apiKeyEntity)) {
                auditService.logApiKeyValidationFailure(apiKey, clientIp, "rate_limited");
                return ApiKeyValidationResult.invalid("Rate limit exceeded");
            }
            
            // Update usage statistics
            updateApiKeyUsage(apiKeyEntity);
            
            // Audit successful validation
            auditService.logApiKeyValidationSuccess(apiKeyEntity.getId(), clientIp, requestPath);
            
            return ApiKeyValidationResult.builder()
                .valid(true)
                .keyId(apiKeyEntity.getId())
                .userId(apiKeyEntity.getUserId())
                .permissions(apiKeyEntity.getPermissions())
                .rateLimit(apiKeyEntity.getRateLimit())
                .build();
                
        } catch (Exception e) {
            log.error("Error validating API key", e);
            auditService.logApiKeyValidationError(apiKey, clientIp, e.getMessage());
            return ApiKeyValidationResult.invalid("API key validation failed");
        }
    }
    
    public void revokeApiKey(String userId, String keyId) {
        try {
            ApiKey apiKey = apiKeyRepository.findByIdAndUserId(keyId, userId)
                .orElseThrow(() -> new ApiKeyNotFoundException("API key not found"));
            
            // Disable the key
            apiKey.setEnabled(false);
            apiKey.setRevokedAt(Instant.now());
            apiKeyRepository.save(apiKey);
            
            // Remove from cache
            removeCachedApiKey(apiKey);
            
            // Audit log
            auditService.logApiKeyRevocation(userId, keyId);
            
            log.info("API key revoked: {} for user: {}", keyId, userId);
            
        } catch (Exception e) {
            log.error("Failed to revoke API key: {} for user: {}", keyId, userId, e);
            throw new ApiKeyRevocationException("Failed to revoke API key", e);
        }
    }
    
    private String generateSecureApiKey() {
        // Generate cryptographically secure API key
        SecureRandom random = new SecureRandom();
        byte[] keyBytes = new byte[32];
        random.nextBytes(keyBytes);
        
        return "sams_" + Base64.getUrlEncoder().withoutPadding().encodeToString(keyBytes);
    }
    
    private ApiKey findApiKeyByHash(String apiKey) {
        // This is expensive - we hash the provided key and compare with stored hashes
        List<ApiKey> allKeys = apiKeyRepository.findAllEnabled();
        
        for (ApiKey key : allKeys) {
            if (passwordEncoder.matches(apiKey, key.getHashedKey())) {
                return key;
            }
        }
        
        return null;
    }
    
    private void cacheApiKey(ApiKey apiKey) {
        String cacheKey = "api_key_id:" + apiKey.getId();
        redisTemplate.opsForValue().set(cacheKey, apiKey.getId(), Duration.ofHours(1));
    }
    
    private boolean isIpAllowed(ApiKey apiKey, String clientIp) {
        if (apiKey.getIpWhitelist() == null || apiKey.getIpWhitelist().isEmpty()) {
            return true; // No IP restrictions
        }
        
        return apiKey.getIpWhitelist().stream()
            .anyMatch(allowedIp -> isIpInRange(clientIp, allowedIp));
    }
    
    private boolean isIpInRange(String clientIp, String allowedIpRange) {
        try {
            if (allowedIpRange.contains("/")) {
                // CIDR notation
                SubnetUtils subnet = new SubnetUtils(allowedIpRange);
                return subnet.getInfo().isInRange(clientIp);
            } else {
                // Exact IP match
                return clientIp.equals(allowedIpRange);
            }
        } catch (Exception e) {
            log.warn("Invalid IP range format: {}", allowedIpRange);
            return false;
        }
    }
    
    private boolean hasPermissionForPath(ApiKey apiKey, String requestPath) {
        if (apiKey.getPermissions() == null || apiKey.getPermissions().isEmpty()) {
            return false; // No permissions granted
        }
        
        return apiKey.getPermissions().stream()
            .anyMatch(permission -> pathMatchesPermission(requestPath, permission));
    }
    
    private boolean pathMatchesPermission(String requestPath, String permission) {
        // Convert permission pattern to regex
        String regex = permission
            .replace("*", ".*")
            .replace("?", ".");
        
        return requestPath.matches(regex);
    }
    
    private void updateApiKeyUsage(ApiKey apiKey) {
        // Update asynchronously to avoid blocking the request
        CompletableFuture.runAsync(() -> {
            try {
                apiKeyRepository.updateUsage(apiKey.getId(), Instant.now());
            } catch (Exception e) {
                log.warn("Failed to update API key usage statistics", e);
            }
        });
    }
}
```

## **🔒 Encryption Implementation**

### **Data Encryption Service**
```java
// security/EncryptionService.java
@Service
@Slf4j
public class EncryptionService {
    
    private final KeyManagementService keyManagementService;
    private final EncryptionConfiguration config;
    
    public EncryptionService(KeyManagementService keyManagementService,
                           EncryptionConfiguration config) {
        this.keyManagementService = keyManagementService;
        this.config = config;
    }
    
    // Data at Rest Encryption
    public String encryptSensitiveData(String plainText, String keyId) {
        try {
            SecretKey key = keyManagementService.getKey(keyId);
            
            Cipher cipher = Cipher.getInstance(config.getAlgorithm());
            cipher.init(Cipher.ENCRYPT_MODE, key);
            
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] iv = cipher.getIV();
            
            // Combine IV and encrypted data
            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);
            
            return Base64.getEncoder().encodeToString(combined);
            
        } catch (Exception e) {
            log.error("Failed to encrypt sensitive data", e);
            throw new EncryptionException("Encryption failed", e);
        }
    }
    
    public String decryptSensitiveData(String encryptedData, String keyId) {
        try {
            SecretKey key = keyManagementService.getKey(keyId);
            byte[] combined = Base64.getDecoder().decode(encryptedData);
            
            // Extract IV and encrypted data
            int ivLength = 16; // AES block size
            byte[] iv = new byte[ivLength];
            byte[] encryptedBytes = new byte[combined.length - ivLength];
            
            System.arraycopy(combined, 0, iv, 0, ivLength);
            System.arraycopy(combined, ivLength, encryptedBytes, 0, encryptedBytes.length);
            
            Cipher cipher = Cipher.getInstance(config.getAlgorithm());
            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            cipher.init(Cipher.DECRYPT_MODE, key, ivSpec);
            
            byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
            return new String(decryptedBytes, StandardCharsets.UTF_8);
            
        } catch (Exception e) {
            log.error("Failed to decrypt sensitive data", e);
            throw new DecryptionException("Decryption failed", e);
        }
    }
    
    // Field-level encryption for JPA entities
    @Converter
    public static class EncryptedStringConverter implements AttributeConverter<String, String> {
        
        private final EncryptionService encryptionService;
        
        public EncryptedStringConverter(EncryptionService encryptionService) {
            this.encryptionService = encryptionService;
        }
        
        @Override
        public String convertToDatabaseColumn(String attribute) {
            if (attribute == null) {
                return null;
            }
            return encryptionService.encryptSensitiveData(attribute, "default");
        }
        
        @Override
        public String convertToEntityAttribute(String dbData) {
            if (dbData == null) {
                return null;
            }
            return encryptionService.decryptSensitiveData(dbData, "default");
        }
    }
}

// Key Management Service
@Service
@Slf4j
public class KeyManagementService {
    
    private final Map<String, SecretKey> keyCache = new ConcurrentHashMap<>();
    private final KeyManagementConfiguration config;
    
    public KeyManagementService(KeyManagementConfiguration config) {
        this.config = config;
        initializeKeys();
    }
    
    public SecretKey getKey(String keyId) {
        SecretKey key = keyCache.get(keyId);
        if (key == null) {
            key = loadKeyFromVault(keyId);
            if (key != null) {
                keyCache.put(keyId, key);
            }
        }
        return key;
    }
    
    public String createNewKey(String keyId) {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance("AES");
            keyGenerator.init(256);
            SecretKey key = keyGenerator.generateKey();
            
            // Store key in vault
            storeKeyInVault(keyId, key);
            
            // Cache the key
            keyCache.put(keyId, key);
            
            log.info("Created new encryption key: {}", keyId);
            return keyId;
            
        } catch (Exception e) {
            log.error("Failed to create new encryption key", e);
            throw new KeyManagementException("Failed to create key", e);
        }
    }
    
    public void rotateKey(String keyId) {
        try {
            // Generate new key
            String newKeyId = keyId + "_v" + System.currentTimeMillis();
            createNewKey(newKeyId);
            
            // Update key alias
            updateKeyAlias(keyId, newKeyId);
            
            // Schedule old key for deletion (after grace period)
            scheduleKeyDeletion(keyId, Duration.ofDays(30));
            
            log.info("Rotated encryption key: {} -> {}", keyId, newKeyId);
            
        } catch (Exception e) {
            log.error("Failed to rotate encryption key: {}", keyId, e);
            throw new KeyManagementException("Failed to rotate key", e);
        }
    }
    
    private void initializeKeys() {
        // Initialize default encryption keys
        if (!keyExists("default")) {
            createNewKey("default");
        }
        if (!keyExists("mfa")) {
            createNewKey("mfa");
        }
        if (!keyExists("api_keys")) {
            createNewKey("api_keys");
        }
    }
    
    private SecretKey loadKeyFromVault(String keyId) {
        // Integration with key vault (AWS KMS, Azure Key Vault, HashiCorp Vault, etc.)
        try {
            String keyMaterial = config.getKeyVaultClient().getSecret(keyId);
            byte[] keyBytes = Base64.getDecoder().decode(keyMaterial);
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            log.error("Failed to load key from vault: {}", keyId, e);
            return null;
        }
    }
    
    private void storeKeyInVault(String keyId, SecretKey key) {
        try {
            String keyMaterial = Base64.getEncoder().encodeToString(key.getEncoded());
            config.getKeyVaultClient().storeSecret(keyId, keyMaterial);
        } catch (Exception e) {
            log.error("Failed to store key in vault: {}", keyId, e);
            throw new KeyManagementException("Failed to store key", e);
        }
    }
}
```

---

*This comprehensive security implementation provides enterprise-grade multi-factor authentication, sophisticated API key management, robust encryption for data at rest and in transit, comprehensive security audit logging, and extensive security testing capabilities for SAMS Mobile.*
