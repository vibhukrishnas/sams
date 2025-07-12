# 🔐 iOS Code Signing Setup Guide

## Overview

This guide explains how to set up code signing for the SAMS Monitor iOS app for development, testing, and production distribution.

## Prerequisites

1. **Apple Developer Account**: Active Apple Developer Program membership
2. **Xcode**: Latest version installed on macOS
3. **Certificates**: Development and Distribution certificates
4. **Provisioning Profiles**: App-specific provisioning profiles

## Development Setup

### 1. Development Certificate

1. Open Xcode
2. Go to **Xcode > Preferences > Accounts**
3. Add your Apple ID
4. Select your team
5. Click **Manage Certificates**
6. Click **+** and select **iOS Development**

### 2. Development Provisioning Profile

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Profiles** > **+**
4. Select **iOS App Development**
5. Choose your App ID: `com.sams.monitor`
6. Select your development certificate
7. Select test devices
8. Download and install the profile

### 3. Xcode Project Configuration

1. Open `TestApp.xcworkspace` in Xcode
2. Select the **TestApp** project
3. Select the **TestApp** target
4. Go to **Signing & Capabilities**
5. Configure the following:

```
Team: [Your Development Team]
Bundle Identifier: com.sams.monitor
Provisioning Profile: [Your Development Profile]
Signing Certificate: iOS Development
```

## Production Setup

### 1. Distribution Certificate

1. In Xcode Preferences > Accounts
2. Click **Manage Certificates**
3. Click **+** and select **iOS Distribution**

### 2. App Store Provisioning Profile

1. In Apple Developer Portal
2. Create new profile
3. Select **App Store**
4. Choose App ID: `com.sams.monitor`
5. Select distribution certificate
6. Download and install

### 3. Production Build Configuration

1. In Xcode, select **TestApp** target
2. Go to **Build Settings**
3. Set **Code Signing Identity**:
   - Debug: `iOS Development`
   - Release: `iOS Distribution`

## Automated Code Signing

### Enable Automatic Signing

1. In Xcode project settings
2. Check **Automatically manage signing**
3. Select your team
4. Xcode will handle certificates and profiles

### Manual Signing (Recommended for CI/CD)

1. Uncheck **Automatically manage signing**
2. Manually select certificates and profiles
3. Ensure consistency across team members

## CI/CD Configuration

### Fastlane Setup

Create `ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build for development"
  lane :dev do
    match(type: "development")
    build_app(
      scheme: "TestApp",
      configuration: "Debug",
      export_method: "development"
    )
  end

  desc "Build for App Store"
  lane :release do
    match(type: "appstore")
    build_app(
      scheme: "TestApp",
      configuration: "Release",
      export_method: "app-store"
    )
  end
end
```

### Match Configuration

Create `ios/fastlane/Matchfile`:

```ruby
git_url("https://github.com/your-org/certificates")
storage_mode("git")
type("development")
app_identifier(["com.sams.monitor"])
username("your-apple-id@example.com")
team_id("YOUR_TEAM_ID")
```

## Environment Variables

Set these environment variables for CI/CD:

```bash
# Apple Developer
APPLE_ID=your-apple-id@example.com
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password

# Fastlane
FASTLANE_USER=your-apple-id@example.com
FASTLANE_TEAM_ID=YOUR_TEAM_ID
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=your-app-specific-password

# Match
MATCH_PASSWORD=your-match-password
MATCH_GIT_URL=https://github.com/your-org/certificates
```

## Capabilities Configuration

### Required Capabilities

1. **Push Notifications**
2. **Background App Refresh**
3. **Background Processing**
4. **Associated Domains** (for deep linking)
5. **App Groups** (for widget support)
6. **HealthKit** (if health monitoring is added)
7. **Location Services**
8. **Camera**
9. **Microphone**

### Adding Capabilities in Xcode

1. Select **TestApp** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability**
4. Add required capabilities

## Troubleshooting

### Common Issues

1. **Certificate Expired**
   - Renew certificate in Apple Developer Portal
   - Update in Xcode

2. **Provisioning Profile Mismatch**
   - Ensure bundle ID matches
   - Check device registration
   - Regenerate profile if needed

3. **Team ID Issues**
   - Verify team membership
   - Check team ID in project settings

4. **Keychain Access Issues**
   - Reset keychain if needed
   - Re-import certificates

### Debug Commands

```bash
# List available certificates
security find-identity -v -p codesigning

# List provisioning profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Verify code signing
codesign -dv --verbose=4 /path/to/TestApp.app

# Check entitlements
codesign -d --entitlements :- /path/to/TestApp.app
```

## Security Best Practices

1. **Never commit certificates or private keys**
2. **Use environment variables for sensitive data**
3. **Rotate certificates regularly**
4. **Use separate certificates for development and production**
5. **Implement certificate pinning in the app**
6. **Monitor certificate expiration dates**

## App Store Connect Configuration

### App Information

1. **Bundle ID**: `com.sams.monitor`
2. **App Name**: SAMS Monitor
3. **SKU**: sams-monitor-ios
4. **Primary Language**: English (U.S.)

### Version Information

1. **Version**: 1.0.0
2. **Build**: Auto-increment
3. **Copyright**: © 2024 SAMS Technologies

### App Review Information

1. **Contact Information**: Provide valid contact details
2. **Demo Account**: Create test account for review
3. **Notes**: Explain enterprise features and requirements

## TestFlight Setup

### Beta Testing

1. **Internal Testing**: Add team members
2. **External Testing**: Add beta testers
3. **Test Information**: Provide clear test instructions
4. **Feedback**: Monitor and respond to feedback

### Beta Build Process

```bash
# Build and upload to TestFlight
fastlane ios beta

# Or manually in Xcode
# Product > Archive > Distribute App > App Store Connect
```

## Production Release

### Pre-Release Checklist

- [ ] All tests passing
- [ ] Performance optimized
- [ ] Security audit completed
- [ ] App Store guidelines compliance
- [ ] Metadata and screenshots ready
- [ ] Privacy policy updated
- [ ] Terms of service updated

### Release Process

1. **Create Release Build**
2. **Upload to App Store Connect**
3. **Submit for Review**
4. **Monitor Review Status**
5. **Release to App Store**

## Maintenance

### Regular Tasks

1. **Certificate Renewal**: Monitor expiration dates
2. **Profile Updates**: Keep provisioning profiles current
3. **Xcode Updates**: Stay current with Xcode versions
4. **iOS Updates**: Test with new iOS versions
5. **Security Updates**: Apply security patches promptly

### Monitoring

1. **Certificate Expiration Alerts**
2. **Build Failure Notifications**
3. **App Store Review Status**
4. **Crash Reports**
5. **Performance Metrics**
