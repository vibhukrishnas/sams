# SAMS - Server and Application Monitoring System

A comprehensive enterprise-grade monitoring solution with real-time alerts, mobile app, and advanced analytics.

## 🎉 **PROJECT COMPLETE!**

This is a **FULLY FUNCTIONAL** enterprise monitoring system with:
- ✅ **Complete Backend API** (Node.js/Express with TypeScript)
- ✅ **Real-time WebSocket Communication**
- ✅ **PostgreSQL Database** with full schema
- ✅ **Mobile App** (React Native) with real API integration
- ✅ **Monitoring Agents** (Python/PowerShell) for Linux/Windows
- ✅ **Push Notifications** (Firebase Cloud Messaging)
- ✅ **PDF Report Generation**
- ✅ **Docker Deployment** with full stack
- ✅ **Comprehensive Testing** framework
- ✅ **Production-Ready** configuration

## Project Structure

```
SAMS/
├── sams-mobile/          # React Native mobile application for server monitoring
├── backend/              # Rust backend server
├── mobile-app/           # Additional mobile app components
└── README.md
```

## Features

### Mobile App (sams-mobile/)
- 🔐 **4-Digit PIN Authentication** with account lockout protection
- 📊 **Real-time Dashboard** with server status overview
- 🖥️ **Server Management** - Add, edit, and monitor servers
- 💓 **Infrastructure Health** - System metrics and performance monitoring
- ⚡ **Command Execution** - Remote server command execution
- 📈 **Reports & Queries** - Custom reports and stored queries
- 🚨 **Alerts & Notifications** - Real-time alert management
- 🔄 **Background Monitoring** - Continuous server health checks

### Backend
- Rust-based server infrastructure
- API endpoints for mobile app
- Real-time data processing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- React Native CLI
- Rust (latest stable version)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Mobile App Setup

1. Navigate to the mobile app directory:
   ```bash
   cd sams-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/emulator**
   ```bash
   # Android
   npm run android

   # iOS
   npm run ios
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Build and run the Rust backend:
   ```bash
   cargo build
   cargo run
   ```

## Default Login
- **PIN**: `1234`

## Mobile App Structure (sams-mobile/)
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
- Rust (Backend)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License
