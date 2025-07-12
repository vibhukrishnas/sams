package com.sams.monitor.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// Security Vulnerability Model
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityVulnerability {
    private String id;
    private String title;
    private String description;
    private VulnerabilitySeverity severity;
    private String category;
    private String cweId;
    private String cveId;
    private double cvssScore;
    private String impact;
    private String recommendation;
    private boolean exploitable;
    private String proofOfConcept;
    private LocalDateTime discoveredDate;
    private String status;
    private String assignee;
}

// Vulnerability Severity Enum
enum VulnerabilitySeverity {
    CRITICAL,
    HIGH,
    MEDIUM,
    LOW,
    INFO
}

// Penetration Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PenetrationTestResult {
    private String testName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private List<SecurityVulnerability> vulnerabilities;
    private int totalVulnerabilities;
    private int criticalVulnerabilities;
    private int highVulnerabilities;
    private int mediumVulnerabilities;
    private int lowVulnerabilities;
    private String methodology;
    private List<String> toolsUsed;
    private String tester;
    private String environment;
}

// Authentication Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AuthenticationTestResult {
    private String testName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean bruteForceProtection;
    private boolean passwordPolicyEnforced;
    private boolean mfaImplemented;
    private boolean sessionTimeoutConfigured;
    private boolean accountLockoutEnabled;
    private int overallSecurityScore;
    private List<String> recommendations;
}

// Data Protection Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DataProtectionTestResult {
    private String testName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean dataEncryptedAtRest;
    private boolean dataEncryptedInTransit;
    private boolean piiProtected;
    private boolean dataMasked;
    private boolean backupSecured;
    private int complianceScore;
    private List<String> dataProtectionIssues;
}

// API Security Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class APISecurityTestResult {
    private String testName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean rateLimitingEnabled;
    private boolean apiAuthenticationSecure;
    private boolean inputValidationImplemented;
    private boolean outputEncodingImplemented;
    private boolean corsConfiguredSecurely;
    private int securityScore;
    private List<String> apiSecurityIssues;
}

// Compliance Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ComplianceTestResult {
    private String testName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean owaspCompliant;
    private boolean gdprCompliant;
    private boolean soc2Compliant;
    private boolean iso27001Compliant;
    private boolean pciDssCompliant;
    private int overallComplianceScore;
    private Map<String, Integer> complianceScores;
    private List<String> complianceIssues;
}

// Brute Force Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class BruteForceTestResult {
    private boolean protected;
    private int attemptsMade;
    private boolean accountLocked;
    private long lockoutDuration;
    private boolean rateLimited;
    private String protectionMechanism;
}

// Password Policy Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PasswordPolicyTestResult {
    private boolean policyEnforced;
    private int minimumLength;
    private boolean requiresUppercase;
    private boolean requiresLowercase;
    private boolean requiresNumbers;
    private boolean requiresSpecialChars;
    private boolean passwordHistory;
    private int passwordExpiry;
}

// MFA Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class MFATestResult {
    private boolean implemented;
    private List<String> supportedMethods;
    private boolean mandatory;
    private boolean backupCodes;
    private String implementation;
}

// Session Timeout Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SessionTimeoutTestResult {
    private boolean configured;
    private int timeoutMinutes;
    private boolean slidingExpiration;
    private boolean absoluteExpiration;
    private boolean warningBeforeTimeout;
}

// Account Lockout Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class AccountLockoutTestResult {
    private boolean enabled;
    private int maxAttempts;
    private long lockoutDuration;
    private boolean progressiveLockout;
    private boolean adminUnlockRequired;
}

// Encryption Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class EncryptionTestResult {
    private boolean encrypted;
    private String algorithm;
    private int keyLength;
    private String keyManagement;
    private boolean certificateValid;
    private LocalDateTime certificateExpiry;
}

// PII Protection Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PIIProtectionTestResult {
    private boolean protected;
    private List<String> piiFields;
    private boolean dataMinimization;
    private boolean consentManagement;
    private boolean rightToErasure;
    private boolean dataPortability;
}

// Data Masking Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class DataMaskingTestResult {
    private boolean masked;
    private List<String> maskedFields;
    private String maskingMethod;
    private boolean dynamicMasking;
    private boolean staticMasking;
}

// Backup Security Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class BackupSecurityTestResult {
    private boolean secured;
    private boolean encrypted;
    private boolean accessControlled;
    private boolean offsite;
    private boolean tested;
    private LocalDateTime lastBackupTest;
}

// Rate Limiting Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class RateLimitingTestResult {
    private boolean enabled;
    private int requestsPerMinute;
    private String limitingStrategy;
    private boolean burstAllowed;
    private boolean ipBasedLimiting;
    private boolean userBasedLimiting;
}

// API Auth Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class APIAuthTestResult {
    private boolean secure;
    private String authMethod;
    private boolean tokenExpiration;
    private boolean refreshTokens;
    private boolean scopeValidation;
    private boolean audienceValidation;
}

// Input Validation Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class InputValidationTestResult {
    private boolean implemented;
    private boolean serverSideValidation;
    private boolean clientSideValidation;
    private boolean whitelistValidation;
    private boolean lengthValidation;
    private boolean typeValidation;
    private boolean formatValidation;
}

// Output Encoding Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class OutputEncodingTestResult {
    private boolean implemented;
    private boolean htmlEncoding;
    private boolean urlEncoding;
    private boolean jsonEncoding;
    private boolean xmlEncoding;
    private boolean contextAwareEncoding;
}

// CORS Test Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class CORSTestResult {
    private boolean secure;
    private List<String> allowedOrigins;
    private List<String> allowedMethods;
    private List<String> allowedHeaders;
    private boolean credentialsAllowed;
    private boolean wildcardOrigin;
}

// OWASP Compliance Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class OWASPComplianceResult {
    private boolean compliant;
    private int score;
    private Map<String, Boolean> top10Compliance;
    private List<String> failedChecks;
    private String version; // OWASP Top 10 version
}

// GDPR Compliance Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class GDPRComplianceResult {
    private boolean compliant;
    private int score;
    private boolean consentManagement;
    private boolean dataMinimization;
    private boolean rightToErasure;
    private boolean dataPortability;
    private boolean privacyByDesign;
    private boolean dataProtectionOfficer;
    private boolean impactAssessment;
}

// SOC 2 Compliance Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SOC2ComplianceResult {
    private boolean compliant;
    private int score;
    private boolean securityPrinciple;
    private boolean availabilityPrinciple;
    private boolean processingIntegrityPrinciple;
    private boolean confidentialityPrinciple;
    private boolean privacyPrinciple;
    private List<String> controlDeficiencies;
}

// ISO 27001 Compliance Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ISO27001ComplianceResult {
    private boolean compliant;
    private int score;
    private boolean informationSecurityPolicy;
    private boolean riskManagement;
    private boolean assetManagement;
    private boolean accessControl;
    private boolean incidentManagement;
    private boolean businessContinuity;
    private List<String> nonConformities;
}

// PCI DSS Compliance Result
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class PCIDSSComplianceResult {
    private boolean compliant;
    private int score;
    private boolean networkSecurity;
    private boolean dataProtection;
    private boolean vulnerabilityManagement;
    private boolean accessControl;
    private boolean monitoring;
    private boolean informationSecurity;
    private List<String> requirements;
    private List<String> failedRequirements;
}

// Security Test Configuration
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityTestConfiguration {
    private String testSuite;
    private List<String> testCategories;
    private String targetUrl;
    private String environment;
    private boolean aggressiveTesting;
    private int timeoutSeconds;
    private List<String> excludedTests;
    private Map<String, Object> customParameters;
}

// Security Audit Report
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityAuditReport {
    private String reportId;
    private LocalDateTime generatedAt;
    private String version;
    private String environment;
    private PenetrationTestResult penetrationTest;
    private AuthenticationTestResult authenticationTest;
    private DataProtectionTestResult dataProtectionTest;
    private APISecurityTestResult apiSecurityTest;
    private ComplianceTestResult complianceTest;
    private SecurityTestSummary summary;
    private List<String> recommendations;
    private String auditor;
}

// Security Test Summary
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityTestSummary {
    private int totalTests;
    private int passedTests;
    private int failedTests;
    private int totalVulnerabilities;
    private int criticalVulnerabilities;
    private int highVulnerabilities;
    private double overallSecurityScore;
    private String securityGrade; // A, B, C, D, F
    private boolean productionReady;
    private List<String> criticalIssues;
}

// Security Recommendation
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityRecommendation {
    private String id;
    private String title;
    private String description;
    private String priority;
    private String category;
    private String effort; // Low, Medium, High
    private String impact; // Low, Medium, High
    private List<String> steps;
    private String timeline;
}

// Security Metric
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class SecurityMetric {
    private String name;
    private double value;
    private String unit;
    private String category;
    private double threshold;
    private boolean passed;
    private String description;
    private LocalDateTime measuredAt;
}
