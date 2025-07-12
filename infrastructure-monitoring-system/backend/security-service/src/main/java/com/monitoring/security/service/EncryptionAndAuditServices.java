/**
 * 🔒 Encryption and Audit Services - Enterprise Security Framework
 * Comprehensive encryption at rest/transit and security audit logging
 */

package com.monitoring.security.service;

import com.monitoring.security.entity.SecurityAuditLog;
import com.monitoring.security.repository.SecurityAuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * Encryption service for data at rest and in transit
 */
@Service
public class EncryptionService {

    private static final Logger logger = LoggerFactory.getLogger(EncryptionService.class);
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;

    @Value("${security.encryption.master-key}")
    private String masterKeyBase64;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Encrypt sensitive data
     */
    public EncryptedData encrypt(String plaintext) {
        try {
            SecretKey secretKey = new SecretKeySpec(Base64.getDecoder().decode(masterKeyBase64), ALGORITHM);
            
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);
            
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);
            
            byte[] encryptedData = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            
            String encryptedBase64 = Base64.getEncoder().encodeToString(encryptedData);
            String ivBase64 = Base64.getEncoder().encodeToString(iv);
            
            return new EncryptedData(encryptedBase64, ivBase64);
            
        } catch (Exception e) {
            logger.error("❌ Error encrypting data: {}", e.getMessage(), e);
            throw new SecurityException("Failed to encrypt data", e);
        }
    }

    /**
     * Decrypt sensitive data
     */
    public String decrypt(EncryptedData encryptedData) {
        try {
            SecretKey secretKey = new SecretKeySpec(Base64.getDecoder().decode(masterKeyBase64), ALGORITHM);
            
            byte[] iv = Base64.getDecoder().decode(encryptedData.getIv());
            byte[] encrypted = Base64.getDecoder().decode(encryptedData.getData());
            
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);
            
            byte[] decryptedData = cipher.doFinal(encrypted);
            
            return new String(decryptedData, StandardCharsets.UTF_8);
            
        } catch (Exception e) {
            logger.error("❌ Error decrypting data: {}", e.getMessage(), e);
            throw new SecurityException("Failed to decrypt data", e);
        }
    }

    /**
     * Generate new encryption key
     */
    public String generateEncryptionKey() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(ALGORITHM);
            keyGenerator.init(256);
            SecretKey secretKey = keyGenerator.generateKey();
            return Base64.getEncoder().encodeToString(secretKey.getEncoded());
        } catch (Exception e) {
            logger.error("❌ Error generating encryption key: {}", e.getMessage(), e);
            throw new SecurityException("Failed to generate encryption key", e);
        }
    }

    /**
     * Encrypt database field
     */
    public String encryptField(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        
        EncryptedData encrypted = encrypt(value);
        return encrypted.getData() + ":" + encrypted.getIv();
    }

    /**
     * Decrypt database field
     */
    public String decryptField(String encryptedValue) {
        if (encryptedValue == null || encryptedValue.isEmpty() || !encryptedValue.contains(":")) {
            return encryptedValue;
        }
        
        String[] parts = encryptedValue.split(":", 2);
        EncryptedData encrypted = new EncryptedData(parts[0], parts[1]);
        return decrypt(encrypted);
    }

    /**
     * Hash sensitive data for comparison
     */
    public String hashData(String data, String salt) {
        try {
            // Use PBKDF2 for secure hashing
            javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
                    data.toCharArray(), salt.getBytes(), 100000, 256);
            javax.crypto.SecretKeyFactory factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] hash = factory.generateSecret(spec).getEncoded();
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            logger.error("❌ Error hashing data: {}", e.getMessage(), e);
            throw new SecurityException("Failed to hash data", e);
        }
    }

    public static class EncryptedData {
        private final String data;
        private final String iv;

        public EncryptedData(String data, String iv) {
            this.data = data;
            this.iv = iv;
        }

        public String getData() { return data; }
        public String getIv() { return iv; }
    }
}

/**
 * Security audit logging service
 */
@Service
public class SecurityAuditService {

    private static final Logger logger = LoggerFactory.getLogger(SecurityAuditService.class);

    @Autowired
    private SecurityAuditLogRepository auditLogRepository;

    @Autowired
    private EncryptionService encryptionService;

    /**
     * Log security event
     */
    public void logSecurityEvent(String eventType, UUID userId, String description, Map<String, String> metadata) {
        try {
            SecurityAuditLog auditLog = new SecurityAuditLog();
            auditLog.setId(UUID.randomUUID());
            auditLog.setEventType(eventType);
            auditLog.setUserId(userId);
            auditLog.setDescription(description);
            auditLog.setTimestamp(LocalDateTime.now());
            auditLog.setIpAddress(getCurrentUserIpAddress());
            auditLog.setUserAgent(getCurrentUserAgent());
            auditLog.setSessionId(getCurrentSessionId());

            // Encrypt sensitive metadata
            if (metadata != null && !metadata.isEmpty()) {
                String metadataJson = convertMapToJson(metadata);
                auditLog.setMetadata(encryptionService.encryptField(metadataJson));
            }

            auditLogRepository.save(auditLog);

            logger.info("🔍 Security event logged: {} for user: {}", eventType, userId);

        } catch (Exception e) {
            logger.error("❌ Error logging security event: {}", e.getMessage(), e);
            // Don't throw exception to avoid breaking the main flow
        }
    }

    /**
     * Log authentication event
     */
    public void logAuthenticationEvent(String eventType, String username, boolean success, String reason) {
        try {
            SecurityAuditLog auditLog = new SecurityAuditLog();
            auditLog.setId(UUID.randomUUID());
            auditLog.setEventType(eventType);
            auditLog.setUsername(username);
            auditLog.setDescription(success ? "Authentication successful" : "Authentication failed: " + reason);
            auditLog.setTimestamp(LocalDateTime.now());
            auditLog.setIpAddress(getCurrentUserIpAddress());
            auditLog.setUserAgent(getCurrentUserAgent());
            auditLog.setSuccess(success);

            auditLogRepository.save(auditLog);

            logger.info("🔍 Authentication event logged: {} for username: {} (success: {})", 
                       eventType, username, success);

        } catch (Exception e) {
            logger.error("❌ Error logging authentication event: {}", e.getMessage(), e);
        }
    }

    /**
     * Log API access event
     */
    public void logApiAccess(String method, String endpoint, UUID userId, int responseCode, long responseTime) {
        try {
            SecurityAuditLog auditLog = new SecurityAuditLog();
            auditLog.setId(UUID.randomUUID());
            auditLog.setEventType("API_ACCESS");
            auditLog.setUserId(userId);
            auditLog.setDescription(String.format("%s %s - %d (%dms)", method, endpoint, responseCode, responseTime));
            auditLog.setTimestamp(LocalDateTime.now());
            auditLog.setIpAddress(getCurrentUserIpAddress());
            auditLog.setUserAgent(getCurrentUserAgent());
            auditLog.setSuccess(responseCode < 400);

            Map<String, String> metadata = Map.of(
                "method", method,
                "endpoint", endpoint,
                "response_code", String.valueOf(responseCode),
                "response_time_ms", String.valueOf(responseTime)
            );
            
            String metadataJson = convertMapToJson(metadata);
            auditLog.setMetadata(encryptionService.encryptField(metadataJson));

            auditLogRepository.save(auditLog);

        } catch (Exception e) {
            logger.error("❌ Error logging API access: {}", e.getMessage(), e);
        }
    }

    /**
     * Log data access event
     */
    public void logDataAccess(String operation, String resourceType, String resourceId, UUID userId) {
        try {
            SecurityAuditLog auditLog = new SecurityAuditLog();
            auditLog.setId(UUID.randomUUID());
            auditLog.setEventType("DATA_ACCESS");
            auditLog.setUserId(userId);
            auditLog.setDescription(String.format("%s %s: %s", operation, resourceType, resourceId));
            auditLog.setTimestamp(LocalDateTime.now());
            auditLog.setIpAddress(getCurrentUserIpAddress());

            Map<String, String> metadata = Map.of(
                "operation", operation,
                "resource_type", resourceType,
                "resource_id", resourceId
            );
            
            String metadataJson = convertMapToJson(metadata);
            auditLog.setMetadata(encryptionService.encryptField(metadataJson));

            auditLogRepository.save(auditLog);

        } catch (Exception e) {
            logger.error("❌ Error logging data access: {}", e.getMessage(), e);
        }
    }

    /**
     * Log security violation
     */
    public void logSecurityViolation(String violationType, String description, UUID userId, String severity) {
        try {
            SecurityAuditLog auditLog = new SecurityAuditLog();
            auditLog.setId(UUID.randomUUID());
            auditLog.setEventType("SECURITY_VIOLATION");
            auditLog.setUserId(userId);
            auditLog.setDescription(description);
            auditLog.setTimestamp(LocalDateTime.now());
            auditLog.setIpAddress(getCurrentUserIpAddress());
            auditLog.setUserAgent(getCurrentUserAgent());
            auditLog.setSuccess(false);

            Map<String, String> metadata = Map.of(
                "violation_type", violationType,
                "severity", severity
            );
            
            String metadataJson = convertMapToJson(metadata);
            auditLog.setMetadata(encryptionService.encryptField(metadataJson));

            auditLogRepository.save(auditLog);

            logger.warn("⚠️ Security violation logged: {} - {}", violationType, description);

        } catch (Exception e) {
            logger.error("❌ Error logging security violation: {}", e.getMessage(), e);
        }
    }

    /**
     * Get audit logs with filtering
     */
    public Page<SecurityAuditLogDto> getAuditLogs(AuditLogFilterRequest filter, Pageable pageable) {
        try {
            Page<SecurityAuditLog> auditLogs = auditLogRepository.findWithFilters(
                filter.getEventType(),
                filter.getUserId(),
                filter.getStartDate(),
                filter.getEndDate(),
                filter.getSuccess(),
                pageable
            );

            return auditLogs.map(this::convertToDto);

        } catch (Exception e) {
            logger.error("❌ Error retrieving audit logs: {}", e.getMessage(), e);
            throw new SecurityException("Failed to retrieve audit logs", e);
        }
    }

    /**
     * Export audit logs for compliance
     */
    public byte[] exportAuditLogs(AuditLogExportRequest request) {
        try {
            List<SecurityAuditLog> auditLogs = auditLogRepository.findForExport(
                request.getStartDate(),
                request.getEndDate(),
                request.getEventTypes()
            );

            return generateAuditReport(auditLogs, request.getFormat());

        } catch (Exception e) {
            logger.error("❌ Error exporting audit logs: {}", e.getMessage(), e);
            throw new SecurityException("Failed to export audit logs", e);
        }
    }

    private SecurityAuditLogDto convertToDto(SecurityAuditLog auditLog) {
        SecurityAuditLogDto dto = new SecurityAuditLogDto();
        dto.setId(auditLog.getId());
        dto.setEventType(auditLog.getEventType());
        dto.setUserId(auditLog.getUserId());
        dto.setUsername(auditLog.getUsername());
        dto.setDescription(auditLog.getDescription());
        dto.setTimestamp(auditLog.getTimestamp());
        dto.setIpAddress(auditLog.getIpAddress());
        dto.setUserAgent(auditLog.getUserAgent());
        dto.setSuccess(auditLog.getSuccess());

        // Decrypt metadata if present
        if (auditLog.getMetadata() != null) {
            try {
                String decryptedMetadata = encryptionService.decryptField(auditLog.getMetadata());
                dto.setMetadata(convertJsonToMap(decryptedMetadata));
            } catch (Exception e) {
                logger.warn("⚠️ Failed to decrypt audit log metadata: {}", e.getMessage());
            }
        }

        return dto;
    }

    private byte[] generateAuditReport(List<SecurityAuditLog> auditLogs, String format) {
        // Implementation for generating audit reports in different formats (PDF, CSV, JSON)
        switch (format.toLowerCase()) {
            case "csv":
                return generateCsvReport(auditLogs);
            case "json":
                return generateJsonReport(auditLogs);
            case "pdf":
                return generatePdfReport(auditLogs);
            default:
                throw new IllegalArgumentException("Unsupported export format: " + format);
        }
    }

    private byte[] generateCsvReport(List<SecurityAuditLog> auditLogs) {
        // CSV generation implementation
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Event Type,User ID,Username,Description,Timestamp,IP Address,Success\n");
        
        for (SecurityAuditLog log : auditLogs) {
            csv.append(String.format("%s,%s,%s,%s,\"%s\",%s,%s,%s\n",
                log.getId(),
                log.getEventType(),
                log.getUserId(),
                log.getUsername(),
                log.getDescription().replace("\"", "\"\""),
                log.getTimestamp(),
                log.getIpAddress(),
                log.getSuccess()
            ));
        }
        
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] generateJsonReport(List<SecurityAuditLog> auditLogs) {
        // JSON generation implementation
        return "[]".getBytes(StandardCharsets.UTF_8); // Placeholder
    }

    private byte[] generatePdfReport(List<SecurityAuditLog> auditLogs) {
        // PDF generation implementation
        return new byte[0]; // Placeholder
    }

    private String getCurrentUserIpAddress() {
        // Get IP address from current request context
        return "127.0.0.1"; // Placeholder
    }

    private String getCurrentUserAgent() {
        // Get user agent from current request context
        return "Unknown"; // Placeholder
    }

    private String getCurrentSessionId() {
        // Get session ID from current request context
        return UUID.randomUUID().toString(); // Placeholder
    }

    private String convertMapToJson(Map<String, String> map) {
        // Simple JSON conversion - in production, use Jackson or similar
        StringBuilder json = new StringBuilder("{");
        map.forEach((key, value) -> json.append("\"").append(key).append("\":\"").append(value).append("\","));
        if (json.length() > 1) {
            json.setLength(json.length() - 1); // Remove last comma
        }
        json.append("}");
        return json.toString();
    }

    private Map<String, String> convertJsonToMap(String json) {
        // Simple JSON parsing - in production, use Jackson or similar
        Map<String, String> map = new HashMap<>();
        // Placeholder implementation
        return map;
    }
}

/**
 * IP whitelist/blacklist service
 */
@Service
public class IpSecurityService {

    private static final Logger logger = LoggerFactory.getLogger(IpSecurityService.class);

    @Autowired
    private IpWhitelistRepository ipWhitelistRepository;

    @Autowired
    private IpBlacklistRepository ipBlacklistRepository;

    @Autowired
    private SecurityAuditService auditService;

    /**
     * Check if IP is allowed
     */
    public IpCheckResult checkIpAccess(String ipAddress, UUID userId) {
        try {
            // Check blacklist first
            if (isIpBlacklisted(ipAddress)) {
                auditService.logSecurityViolation("IP_BLACKLISTED", 
                    "Access attempt from blacklisted IP: " + ipAddress, userId, "HIGH");
                return IpCheckResult.denied("IP address is blacklisted");
            }

            // Check whitelist
            if (hasWhitelistEntries() && !isIpWhitelisted(ipAddress)) {
                auditService.logSecurityViolation("IP_NOT_WHITELISTED", 
                    "Access attempt from non-whitelisted IP: " + ipAddress, userId, "MEDIUM");
                return IpCheckResult.denied("IP address is not whitelisted");
            }

            return IpCheckResult.allowed();

        } catch (Exception e) {
            logger.error("❌ Error checking IP access for {}: {}", ipAddress, e.getMessage(), e);
            return IpCheckResult.denied("IP check failed");
        }
    }

    private boolean isIpBlacklisted(String ipAddress) {
        return ipBlacklistRepository.existsByIpAddressAndActive(ipAddress, true);
    }

    private boolean isIpWhitelisted(String ipAddress) {
        return ipWhitelistRepository.existsByIpAddressAndActive(ipAddress, true);
    }

    private boolean hasWhitelistEntries() {
        return ipWhitelistRepository.countByActive(true) > 0;
    }

    public static class IpCheckResult {
        private final boolean allowed;
        private final String reason;

        private IpCheckResult(boolean allowed, String reason) {
            this.allowed = allowed;
            this.reason = reason;
        }

        public static IpCheckResult allowed() {
            return new IpCheckResult(true, null);
        }

        public static IpCheckResult denied(String reason) {
            return new IpCheckResult(false, reason);
        }

        public boolean isAllowed() { return allowed; }
        public String getReason() { return reason; }
    }
}
