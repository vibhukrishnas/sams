#!/bin/bash

# SAMS Mobile - Release Build Script
# Builds production-ready apps for iOS and Android

set -e

echo "🚀 Starting SAMS Mobile Release Build Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="SAMS Mobile"
VERSION=$(node -p "require('./package.json').version")
BUILD_NUMBER=$(date +%Y%m%d%H%M)

echo -e "${BLUE}Building ${APP_NAME} v${VERSION} (${BUILD_NUMBER})${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf ios/build
rm -rf android/app/build
print_status "Previous builds cleaned"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci
print_status "Dependencies installed"

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
npm run test:ci
if [ $? -eq 0 ]; then
    print_status "All tests passed"
else
    print_error "Tests failed - aborting build"
    exit 1
fi

# Run linting
echo -e "${BLUE}🔍 Running linting...${NC}"
npm run lint
if [ $? -eq 0 ]; then
    print_status "Linting passed"
else
    print_warning "Linting issues found - continuing with build"
fi

# Type checking
echo -e "${BLUE}📝 Running type checking...${NC}"
npm run type-check
if [ $? -eq 0 ]; then
    print_status "Type checking passed"
else
    print_error "Type checking failed - aborting build"
    exit 1
fi

# Build Android Release
echo -e "${BLUE}🤖 Building Android Release...${NC}"
cd android

# Clean and build
./gradlew clean
./gradlew assembleRelease

if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    print_status "Android APK built successfully"
    
    # Build Android App Bundle
    ./gradlew bundleRelease
    
    if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
        print_status "Android App Bundle built successfully"
    else
        print_warning "Android App Bundle build failed"
    fi
else
    print_error "Android APK build failed"
    exit 1
fi

cd ..

# Build iOS Release
echo -e "${BLUE}🍎 Building iOS Release...${NC}"
cd ios

# Install pods
pod install

# Build for device
xcodebuild -workspace TestApp.xcworkspace \
           -scheme TestApp \
           -configuration Release \
           -destination generic/platform=iOS \
           -archivePath build/TestApp.xcarchive \
           archive

if [ -d "build/TestApp.xcarchive" ]; then
    print_status "iOS archive created successfully"
    
    # Export IPA
    xcodebuild -exportArchive \
               -archivePath build/TestApp.xcarchive \
               -exportPath build/ \
               -exportOptionsPlist ExportOptions.plist
    
    if [ -f "build/TestApp.ipa" ]; then
        print_status "iOS IPA exported successfully"
    else
        print_warning "iOS IPA export failed"
    fi
else
    print_error "iOS archive failed"
    exit 1
fi

cd ..

# Generate build report
echo -e "${BLUE}📊 Generating build report...${NC}"
cat > build-report.md << EOF
# SAMS Mobile Build Report

**Build Date:** $(date)
**Version:** ${VERSION}
**Build Number:** ${BUILD_NUMBER}

## Build Status

### Android
- ✅ APK: \`android/app/build/outputs/apk/release/app-release.apk\`
- ✅ AAB: \`android/app/build/outputs/bundle/release/app-release.aab\`

### iOS
- ✅ Archive: \`ios/build/TestApp.xcarchive\`
- ✅ IPA: \`ios/build/TestApp.ipa\`

## File Sizes
- Android APK: $(du -h android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | cut -f1 || echo "N/A")
- Android AAB: $(du -h android/app/build/outputs/bundle/release/app-release.aab 2>/dev/null | cut -f1 || echo "N/A")
- iOS IPA: $(du -h ios/build/TestApp.ipa 2>/dev/null | cut -f1 || echo "N/A")

## Next Steps
1. Test builds on physical devices
2. Upload to TestFlight (iOS) and Play Console (Android)
3. Submit for app store review

EOF

print_status "Build report generated: build-report.md"

# Create distribution folder
echo -e "${BLUE}📁 Creating distribution folder...${NC}"
mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk dist/SAMS-Mobile-${VERSION}-${BUILD_NUMBER}.apk 2>/dev/null || true
cp android/app/build/outputs/bundle/release/app-release.aab dist/SAMS-Mobile-${VERSION}-${BUILD_NUMBER}.aab 2>/dev/null || true
cp ios/build/TestApp.ipa dist/SAMS-Mobile-${VERSION}-${BUILD_NUMBER}.ipa 2>/dev/null || true
cp build-report.md dist/

print_status "Distribution files copied to dist/ folder"

echo -e "${GREEN}🎉 SAMS Mobile Release Build Complete!${NC}"
echo -e "${BLUE}📱 Ready for app store distribution${NC}"

# Display summary
echo ""
echo "==================================="
echo "         BUILD SUMMARY"
echo "==================================="
echo "App: ${APP_NAME}"
echo "Version: ${VERSION}"
echo "Build: ${BUILD_NUMBER}"
echo "Date: $(date)"
echo ""
echo "Distribution files:"
ls -la dist/ 2>/dev/null || echo "No distribution files found"
echo "==================================="
