# GitHub Secrets Configuration

This document lists all the secrets that need to be configured in your GitHub repository for the CI/CD workflows to function properly.

## Required Secrets

### Core Application Secrets

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions
- `SONAR_TOKEN` - SonarCloud token for code quality analysis
- `SNYK_TOKEN` - Snyk token for security scanning
- `PERCY_TOKEN` - Percy token for visual regression testing

### Database Secrets

- `DATABASE_URL` - Production database connection string
- `REDIS_URL` - Redis connection string for caching

### Authentication & Security

- `JWT_SECRET` - Secret key for JWT token signing
- `BCRYPT_ROUNDS` - Number of rounds for password hashing (default: 12)

### Email & Notifications

- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `FROM_EMAIL` - Default sender email address

### Push Notifications (Firebase)

- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email

### External Services

- `TWILIO_ACCOUNT_SID` - Twilio account SID for SMS
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

### Slack Integration

- `SLACK_WEBHOOK_URL` - Slack webhook URL for notifications
- `SLACK_CHANNEL` - Default Slack channel for alerts

### AWS Configuration (if using AWS)

- `AWS_ACCESS_KEY_ID` - AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET` - S3 bucket name for file storage

### Frontend Environment Variables

- `REACT_APP_API_URL` - Backend API URL for frontend
- `REACT_APP_WEBSOCKET_URL` - WebSocket server URL
- `REACT_APP_VERSION` - Application version (auto-generated)

## How to Add Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add the secret name and value
6. Click "Add secret"

## Environment-Specific Secrets

### Staging Environment

All secrets should be prefixed with `STAGING_` for staging-specific values:
- `STAGING_DATABASE_URL`
- `STAGING_REDIS_URL`
- etc.

### Production Environment

All secrets should be prefixed with `PROD_` for production-specific values:
- `PROD_DATABASE_URL`
- `PROD_REDIS_URL`
- etc.

## Security Best Practices

1. **Never commit secrets to the repository**
2. **Use different secrets for different environments**
3. **Rotate secrets regularly**
4. **Use least privilege principle for service accounts**
5. **Monitor secret usage and access logs**

## Testing Secrets

For testing purposes, you can use the following test values:

```bash
# Test Database
DATABASE_URL=postgresql://sams_test:sams_test_password@localhost:5433/sams_test

# Test JWT Secret
JWT_SECRET=test_jwt_secret_key_for_testing_only

# Test Redis
REDIS_URL=redis://localhost:6380
```

## Troubleshooting

If workflows are failing due to missing secrets:

1. Check the workflow logs for specific error messages
2. Verify all required secrets are configured
3. Ensure secret names match exactly (case-sensitive)
4. Check that secrets don't contain trailing spaces or newlines
5. For multi-line secrets (like private keys), ensure proper formatting

## Optional Secrets

These secrets are optional and workflows will continue without them:

- `SNYK_TOKEN` - Security scanning will be skipped if not provided
- `PERCY_TOKEN` - Visual regression tests will be skipped if not provided
- `SONAR_TOKEN` - Code quality analysis will be skipped if not provided
