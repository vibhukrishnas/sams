# SAMS Security Guide
## Server and Application Monitoring System - Security Implementation

### 🔒 Security Overview

SAMS implements enterprise-grade security measures to protect sensitive monitoring data, ensure secure communications, and maintain compliance with industry standards. This guide covers all security aspects of the system.

---

## 🛡️ Authentication & Authorization

### **Multi-Factor Authentication (MFA)**

#### **Implementation**
- **Primary**: Username/password authentication
- **Secondary**: Time-based One-Time Password (TOTP)
- **Biometric**: Mobile app supports fingerprint/face recognition
- **Backup**: Recovery codes for account recovery

#### **Configuration**
```yaml
security:
  mfa:
    enabled: true
    issuer: "SAMS Monitoring"
    algorithm: "SHA1"
    digits: 6
    period: 30
    backup_codes: 10
```

### **JWT Token Security**

#### **Token Configuration**
- **Access Token**: 15-minute expiration
- **Refresh Token**: 7-day expiration with rotation
- **Algorithm**: RS256 with 2048-bit RSA keys
- **Claims**: Minimal user information only

#### **Token Security Measures**
```java
@Configuration
public class JwtConfig {
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration:900}") // 15 minutes
    private int accessTokenExpiration;
    
    @Value("${jwt.refresh-expiration:604800}") // 7 days
    private int refreshTokenExpiration;
}
```

### **Role-Based Access Control (RBAC)**

#### **Role Hierarchy**
```
SUPER_ADMIN
├── ADMIN
│   ├── MANAGER
│   │   ├── OPERATOR
│   │   └── USER
│   └── AUDITOR (read-only)
└── SERVICE_ACCOUNT
```

#### **Permission Matrix**
| Resource | SUPER_ADMIN | ADMIN | MANAGER | OPERATOR | USER | AUDITOR |
|----------|-------------|-------|---------|----------|------|---------|
| Users | CRUD | CRUD | R | R | R (self) | R |
| Servers | CRUD | CRUD | CRUD | RU | R | R |
| Alerts | CRUD | CRUD | CRUD | CRUD | RU | R |
| Config | CRUD | CRUD | R | R | R | R |
| Audit Logs | R | R | R | - | - | R |

---

## 🔐 Data Protection

### **Encryption at Rest**

#### **Database Encryption**
- **PostgreSQL**: Transparent Data Encryption (TDE)
- **InfluxDB**: Encryption at rest with AES-256
- **Redis**: RDB and AOF encryption
- **S3**: Server-side encryption with KMS

#### **Configuration Example**
```yaml
datasource:
  postgresql:
    url: jdbc:postgresql://localhost:5432/sams?ssl=true&sslmode=require
    encryption:
      algorithm: AES-256-GCM
      key-rotation: 90d
```

### **Encryption in Transit**

#### **TLS Configuration**
- **Minimum Version**: TLS 1.2
- **Preferred Version**: TLS 1.3
- **Cipher Suites**: ECDHE-RSA-AES256-GCM-SHA384, ECDHE-RSA-CHACHA20-POLY1305
- **Certificate**: Let's Encrypt with auto-renewal

#### **Nginx TLS Configuration**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
```

### **Data Masking & Anonymization**

#### **Sensitive Data Handling**
- **PII**: Automatic detection and masking
- **Passwords**: Bcrypt hashing with salt rounds 12
- **API Keys**: Encrypted storage with key rotation
- **Logs**: Sensitive data scrubbing before storage

#### **Data Classification**
```java
@Entity
public class User {
    @Sensitive(level = SensitiveLevel.HIGH)
    private String email;
    
    @Sensitive(level = SensitiveLevel.CRITICAL)
    private String password;
    
    @Auditable
    private String lastLogin;
}
```

---

## 🚫 Input Validation & Sanitization

### **API Input Validation**

#### **Validation Rules**
```java
@RestController
@Validated
public class ServerController {
    
    @PostMapping("/servers")
    public ResponseEntity<Server> createServer(
        @Valid @RequestBody CreateServerRequest request) {
        
        // Validation annotations
        @NotBlank(message = "Hostname is required")
        @Pattern(regexp = "^[a-zA-Z0-9.-]+$", message = "Invalid hostname format")
        private String hostname;
        
        @NotNull(message = "IP address is required")
        @Pattern(regexp = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", message = "Invalid IP format")
        private String ipAddress;
    }
}
```

### **SQL Injection Prevention**
- **Prepared Statements**: All database queries use parameterized queries
- **ORM**: JPA/Hibernate with parameter binding
- **Input Sanitization**: HTML encoding and SQL escaping
- **Query Validation**: Static analysis for SQL injection patterns

### **XSS Prevention**
```java
@Component
public class XSSFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        XSSRequestWrapper wrappedRequest = new XSSRequestWrapper((HttpServletRequest) request);
        chain.doFilter(wrappedRequest, response);
    }
}
```

---

## 🔍 Security Monitoring & Auditing

### **Audit Logging**

#### **Audit Events**
- User authentication and authorization
- Data access and modifications
- Configuration changes
- Alert acknowledgments and resolutions
- System administration actions

#### **Audit Log Format**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "eventType": "USER_LOGIN",
  "userId": "uuid",
  "username": "admin@sams.com",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "resource": "/api/v1/auth/login",
  "action": "LOGIN",
  "result": "SUCCESS",
  "details": {
    "mfaUsed": true,
    "sessionId": "uuid"
  }
}
```

### **Security Event Detection**

#### **Anomaly Detection**
- **Failed Login Attempts**: Account lockout after 5 failed attempts
- **Unusual Access Patterns**: Geographic and time-based anomalies
- **Privilege Escalation**: Unauthorized access attempts
- **Data Exfiltration**: Large data downloads or exports

#### **Real-time Alerting**
```yaml
security_rules:
  - name: "Multiple Failed Logins"
    condition: "failed_logins > 5 in 5m"
    action: "lock_account"
    notification: ["security-team@sams.com"]
  
  - name: "Unusual Access Location"
    condition: "login_location != user.usual_locations"
    action: "require_mfa"
    notification: ["user", "security-team@sams.com"]
```

---

## 🛡️ Network Security

### **Firewall Configuration**

#### **Security Groups (AWS)**
```terraform
resource "aws_security_group" "web_tier" {
  name = "sams-web-tier"
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/8"]
  }
}
```

### **DDoS Protection**
- **AWS Shield**: Standard DDoS protection
- **Rate Limiting**: API rate limiting with Redis
- **WAF Rules**: Web Application Firewall with custom rules
- **CDN**: CloudFront for DDoS mitigation

### **VPN & Private Access**
```yaml
vpn_config:
  type: "OpenVPN"
  encryption: "AES-256-CBC"
  authentication: "SHA256"
  certificate_authority: "internal-ca"
  client_certificates: true
  two_factor: true
```

---

## 🔒 API Security

### **Rate Limiting**

#### **Implementation**
```java
@Component
public class RateLimitingFilter implements Filter {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    private static final int REQUESTS_PER_HOUR = 1000;
    private static final int BURST_LIMIT = 100;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        String clientId = getClientId(request);
        String key = "rate_limit:" + clientId;
        
        Long currentRequests = redisTemplate.opsForValue().increment(key);
        
        if (currentRequests == 1) {
            redisTemplate.expire(key, Duration.ofHours(1));
        }
        
        if (currentRequests > REQUESTS_PER_HOUR) {
            ((HttpServletResponse) response).setStatus(429);
            return;
        }
        
        chain.doFilter(request, response);
    }
}
```

### **API Key Management**
- **Generation**: Cryptographically secure random keys
- **Storage**: Encrypted storage with key rotation
- **Scoping**: API keys with specific permissions
- **Monitoring**: API key usage tracking and alerting

### **CORS Configuration**
```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("https://*.sams.com"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

---

## 🔐 Secrets Management

### **HashiCorp Vault Integration**

#### **Configuration**
```yaml
vault:
  host: "vault.sams.internal"
  port: 8200
  scheme: "https"
  authentication: "kubernetes"
  namespace: "sams"
  
secrets:
  database:
    path: "secret/sams/database"
    keys: ["username", "password", "url"]
  
  external_apis:
    path: "secret/sams/integrations"
    keys: ["slack_webhook", "email_api_key"]
```

### **Secret Rotation**
```java
@Component
@Scheduled(fixedRate = 86400000) // 24 hours
public class SecretRotationService {
    
    public void rotateSecrets() {
        // Rotate database passwords
        rotateServiceCredentials("database");
        
        // Rotate API keys
        rotateApiKeys();
        
        // Rotate encryption keys
        rotateEncryptionKeys();
    }
}
```

---

## 🛡️ Container Security

### **Docker Security**

#### **Base Image Security**
```dockerfile
# Use minimal base images
FROM openjdk:17-jre-alpine

# Create non-root user
RUN addgroup -g 1001 sams && \
    adduser -D -s /bin/sh -u 1001 -G sams sams

# Set security options
USER sams
WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
```

### **Kubernetes Security**

#### **Pod Security Standards**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sams-backend
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  
  containers:
  - name: sams-backend
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

---

## 📋 Compliance & Standards

### **Compliance Frameworks**
- **SOC 2 Type II**: Security, availability, processing integrity
- **GDPR**: Data protection and privacy
- **HIPAA**: Healthcare data protection (if applicable)
- **ISO 27001**: Information security management

### **Security Controls**
```yaml
controls:
  access_control:
    - multi_factor_authentication
    - role_based_access_control
    - privileged_access_management
  
  data_protection:
    - encryption_at_rest
    - encryption_in_transit
    - data_loss_prevention
  
  monitoring:
    - security_event_logging
    - intrusion_detection
    - vulnerability_scanning
```

---

## 🔍 Security Testing

### **Automated Security Testing**

#### **SAST (Static Application Security Testing)**
```yaml
# .github/workflows/security.yml
- name: Run SAST
  uses: github/super-linter@v4
  env:
    DEFAULT_BRANCH: main
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    VALIDATE_JAVA: true
    VALIDATE_JAVASCRIPT: true
```

#### **DAST (Dynamic Application Security Testing)**
```bash
# OWASP ZAP scanning
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.sams.production.com \
  -r zap-report.html
```

### **Penetration Testing**
- **Frequency**: Quarterly external penetration testing
- **Scope**: Web applications, APIs, infrastructure
- **Methodology**: OWASP Testing Guide
- **Reporting**: Detailed findings with remediation plans

---

## 🚨 Incident Response

### **Security Incident Response Plan**

#### **Incident Classification**
- **P1 - Critical**: Data breach, system compromise
- **P2 - High**: Unauthorized access, service disruption
- **P3 - Medium**: Security policy violation
- **P4 - Low**: Security awareness issue

#### **Response Procedures**
1. **Detection & Analysis**: Identify and assess the incident
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove the threat
4. **Recovery**: Restore normal operations
5. **Lessons Learned**: Post-incident review

---

## 📞 Security Contacts

### **Security Team**
- **Security Officer**: security@sams.com
- **Incident Response**: incident@sams.com
- **Vulnerability Reports**: security-reports@sams.com

### **Emergency Contacts**
- **24/7 Security Hotline**: +1-555-SECURITY
- **Incident Response Team**: On-call rotation
- **Management Escalation**: CTO, CISO

---

*This security guide is reviewed and updated quarterly to ensure compliance with evolving security standards and threat landscape.*
