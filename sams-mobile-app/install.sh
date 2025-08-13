#!/bin/bash

# SAMS Mobile App Installation Script
# This script sets up the React Native mobile app for SAMS

echo "🚀 SAMS Mobile App Setup"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Navigate to mobile app directory
cd "$(dirname "$0")"

echo "📦 Installing dependencies..."
npm install

# Install Expo CLI globally if not already installed
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI globally..."
    npm install -g @expo/cli
fi

echo "✅ Expo CLI ready"

# Create assets directory if it doesn't exist
if [ ! -d "assets" ]; then
    echo "📁 Creating assets directory..."
    mkdir -p assets
    
    # Create placeholder icon files
    echo "🎨 Creating placeholder assets..."
    # You would normally have actual icon files here
    touch assets/icon.png
    touch assets/splash.png
    touch assets/adaptive-icon.png
    touch assets/favicon.png
fi

echo ""
echo "🎉 SAMS Mobile App setup complete!"
echo ""
echo "📱 To start the app:"
echo "   npm start          - Start Expo development server"
echo "   npm run android    - Run on Android emulator"
echo "   npm run ios        - Run on iOS simulator"
echo "   npm run web        - Run in web browser"
echo ""
echo "📋 Quick Setup Commands:"
echo "   cd sams-mobile-app"
echo "   npm start"
echo ""
echo "📱 Scan the QR code with Expo Go app on your phone"
echo "   or press 'w' to open in web browser"
echo ""
echo "🔧 Backend Configuration:"
echo "   Make sure your SAMS backend is running on:"
echo "   - Java Backend: http://localhost:8080"
echo "   - Python Backend: http://localhost:8081"
echo ""
echo "✅ Setup complete! Ready to run SAMS mobile app."
