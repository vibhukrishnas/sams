# SAMS Mobile - Server Alert Management System

A React Native mobile application for monitoring server infrastructure and managing system alerts.

## Features

- 🔐 **4-Digit PIN Authentication** with account lockout protection
- 📊 **Real-time Dashboard** with server status overview
- 🖥️ **Server Management** - Add, edit, and monitor servers
- 💓 **Infrastructure Health** - System metrics and performance monitoring
- ⚡ **Command Execution** - Remote server command execution
- 📈 **Reports & Queries** - Custom reports and stored queries
- 🚨 **Alerts & Notifications** - Real-time alert management
- 🔄 **Background Monitoring** - Continuous server health checks

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Run on device/emulator**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

## Default Login
- **PIN**: `1234`

## Project Structure
```
sams-mobile/
├── components/          # Reusable UI components
├── screens/            # App screens
├── navigation/         # Navigation setup
├── context/           # Authentication context
├── utils/             # Utility functions
├── services/          # API services
└── assets/            # Images, icons, fonts
```

## Technology Stack
- React Native 0.73.6
- React Navigation 6
- React Native Paper
- AsyncStorage
- React Context

## License
MIT License 