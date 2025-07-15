# 🔐 SAMS GitHub Actions Environment Variables Configuration

This document outlines all required environment variables and secrets for the SAMS project GitHub Actions workflows.

## 📋 Required Secrets

### **Core Authentication**
```bash
GITHUB_TOKEN                    # Automatically provided by GitHub Actions
```

### **Container Registry**
```bash
REGISTRY_USERNAME               # GitHub username for container registry
REGISTRY_PASSWORD               # GitHub token for container registry
```

### **Database Connections**
```bash
# PostgreSQL
POSTGRES_HOST                   # PostgreSQL host (default: localhost)
POSTGRES_PORT                   # PostgreSQL port (default: 5432)
POSTGRES_DB                     # Database name (default: sams_db)
POSTGRES_USER                   # Database user (default: postgres)
POSTGRES_PASSWORD               # Database password

# MySQL
MYSQL_HOST                      # MySQL host
MYSQL_PORT                      # MySQL port (default: 3306)
MYSQL_DATABASE                  # MySQL database name
MYSQL_USER                      # MySQL user
MYSQL_PASSWORD                  # MySQL password

# MongoDB
MONGODB_URI                     # MongoDB connection string
MONGODB_DATABASE                # MongoDB database name

# Redis
REDIS_URL                       # Redis connection URL (default: redis://localhost:6379)
REDIS_PASSWORD                  # Redis password (if required)
```

### **API Keys & External Services**
```bash
# Security Scanning
SNYK_TOKEN                      # Snyk security scanning token
SONAR_TOKEN                     # SonarCloud analysis token

# Visual Testing
PERCY_TOKEN                     # Percy visual testing token

# Monitoring & Analytics
SENTRY_DSN                      # Sentry error tracking DSN
DATADOG_API_KEY                 # Datadog monitoring API key
NEW_RELIC_LICENSE_KEY           # New Relic monitoring license key

# Notification Services
SLACK_WEBHOOK_URL               # Slack notifications webhook
DISCORD_WEBHOOK_URL             # Discord notifications webhook
TEAMS_WEBHOOK_URL               # Microsoft Teams webhook
```

### **Cloud Provider Credentials**
```bash
# AWS
AWS_ACCESS_KEY_ID               # AWS access key
AWS_SECRET_ACCESS_KEY           # AWS secret key
AWS_REGION                      # AWS region (default: us-east-1)

# Azure
AZURE_CLIENT_ID                 # Azure client ID
AZURE_CLIENT_SECRET             # Azure client secret
AZURE_TENANT_ID                 # Azure tenant ID

# Google Cloud
GCP_SERVICE_ACCOUNT_KEY         # GCP service account JSON key
GCP_PROJECT_ID                  # GCP project ID
```

### **Kubernetes & Docker**
```bash
# Kubernetes
KUBE_CONFIG                     # Kubernetes config file content
KUBE_NAMESPACE                  # Kubernetes namespace (default: sams)

# Docker
DOCKER_REGISTRY                 # Docker registry URL
DOCKER_USERNAME                 # Docker registry username
DOCKER_PASSWORD                 # Docker registry password
```

### **Mobile App Signing**
```bash
# Android
ANDROID_KEYSTORE                # Android keystore file (base64 encoded)
ANDROID_KEYSTORE_PASSWORD       # Android keystore password
ANDROID_KEY_ALIAS               # Android key alias
ANDROID_KEY_PASSWORD            # Android key password

# iOS
IOS_CERTIFICATE                 # iOS distribution certificate (base64 encoded)
IOS_PROVISIONING_PROFILE        # iOS provisioning profile (base64 encoded)
IOS_CERTIFICATE_PASSWORD        # iOS certificate password
```

## 🌍 Environment Variables

### **Application Configuration**
```bash
NODE_ENV                        # Environment (development/staging/production)
API_BASE_URL                    # Backend API base URL
FRONTEND_URL                    # Frontend application URL
MOBILE_API_URL                  # Mobile app API URL
```

### **Feature Flags**
```bash
SONAR_ENABLED                   # Enable SonarCloud scanning (true/false)
PERCY_ENABLED                   # Enable Percy visual testing (true/false)
E2E_TESTS_ENABLED              # Enable E2E testing (true/false)
PERFORMANCE_TESTS_ENABLED      # Enable performance testing (true/false)
SECURITY_SCANS_ENABLED         # Enable security scanning (true/false)
```

### **Build Configuration**
```bash
NODE_VERSION                    # Node.js version (default: 18)
GO_VERSION                      # Go version (default: 1.21)
PYTHON_VERSION                  # Python version (default: 3.11)
JAVA_VERSION                    # Java version (default: 17)
RUBY_VERSION                    # Ruby version (default: 3.1)
```

### **Testing Configuration**
```bash
TEST_TIMEOUT                    # Test timeout in milliseconds (default: 30000)
COVERAGE_THRESHOLD              # Code coverage threshold (default: 80)
E2E_BROWSER                     # E2E testing browser (default: chrome)
PARALLEL_TESTS                  # Number of parallel test processes (default: 2)
```

## 🔧 Setup Instructions

### **1. Repository Secrets**
Navigate to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:
```bash
# Required for all workflows
GITHUB_TOKEN                    # Automatically available
SNYK_TOKEN                      # Get from https://snyk.io/
SONAR_TOKEN                     # Get from https://sonarcloud.io/

# Database secrets (for testing)
POSTGRES_PASSWORD               # Set to: postgres
REDIS_PASSWORD                  # Leave empty for local testing

# Optional but recommended
SLACK_WEBHOOK_URL               # For deployment notifications
PERCY_TOKEN                     # For visual regression testing
```

### **2. Repository Variables**
Navigate to your GitHub repository → Settings → Secrets and variables → Actions → Variables

Add the following variables:
```bash
# Feature flags
SONAR_ENABLED=true
PERCY_ENABLED=false
E2E_TESTS_ENABLED=true
PERFORMANCE_TESTS_ENABLED=false
SECURITY_SCANS_ENABLED=true

# Configuration
NODE_VERSION=18
GO_VERSION=1.21
COVERAGE_THRESHOLD=80
```

### **3. Environment-Specific Secrets**

#### **Staging Environment**
```bash
STAGING_DATABASE_URL            # Staging database connection
STAGING_REDIS_URL               # Staging Redis connection
STAGING_API_URL                 # Staging API URL
```

#### **Production Environment**
```bash
PRODUCTION_DATABASE_URL         # Production database connection
PRODUCTION_REDIS_URL            # Production Redis connection
PRODUCTION_API_URL              # Production API URL
```

## 🚀 Quick Setup Script

Create these secrets with default values for testing:

```bash
# GitHub CLI setup (run in your repository)
gh secret set POSTGRES_PASSWORD --body "postgres"
gh secret set REDIS_PASSWORD --body ""
gh secret set SNYK_TOKEN --body "your-snyk-token-here"

# Set variables
gh variable set SONAR_ENABLED --body "false"
gh variable set E2E_TESTS_ENABLED --body "true"
gh variable set NODE_VERSION --body "18"
```

## 🔍 Validation

To validate your environment variables are set correctly, check the workflow runs:

1. Go to Actions tab in your repository
2. Run any workflow manually
3. Check the logs for missing environment variables
4. Update secrets/variables as needed

## 📚 Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions Variables Documentation](https://docs.github.com/en/actions/learn-github-actions/variables)
- [SAMS Deployment Guide](../docs/production-deployment-guide.md)

## 🆘 Troubleshooting

### **Common Issues:**

1. **Missing GITHUB_TOKEN**: This is automatically provided by GitHub Actions
2. **Database connection failures**: Ensure database services are running in workflow
3. **Docker build failures**: Check DOCKER_* credentials and registry access
4. **Test failures**: Verify test scripts exist in package.json files

### **Debug Steps:**

1. Check workflow logs for specific error messages
2. Verify secret names match exactly (case-sensitive)
3. Ensure secrets are available in the correct environment
4. Test locally with same environment variables
