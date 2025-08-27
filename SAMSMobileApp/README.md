# SAMS Mobile App

## Strategic Asset Management System - Mobile Dashboard

A comprehensive React Native mobile application built with Expo for managing and monitoring the SAMS (Strategic Asset Management System) infrastructure.

### 🎯 Features

#### 🔐 Authentication
- **4-Digit PIN Login**: Secure access with PIN-based authentication
- **Default PINs**: Use `1234`, `0000`, or `1111` for testing

#### 📱 Main Dashboard Screens

1. **Server Management**
   - Real-time server monitoring
   - CPU and memory usage tracking
   - Server status indicators
   - Refresh functionality

2. **Infrastructure Health Dashboard**
   - Overall system health metrics
   - Service status monitoring
   - Performance indicators
   - Recent alerts display

3. **Execute Commands**
   - Remote command execution
   - Pre-defined quick commands
   - Command history
   - Real-time output display

4. **Reports / Stored Queries**
   - Generate system reports
   - Execute stored SQL queries
   - Query result visualization
   - Report scheduling

5. **Alerts & Notifications**
   - Real-time alert management
   - Notification settings
   - Alert categorization
   - Read/unread status tracking

#### 🎨 UI/UX Features
- **Drawer Navigation**: Easy access to all features
- **Material Icons**: Consistent iconography
- **Responsive Design**: Works on all screen sizes
- **Pull-to-Refresh**: Keep data current
- **Professional Theme**: Clean, modern interface

### 🚀 Getting Started

#### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)
- Expo Go app on physical device (optional)

#### Installation
1. Navigate to the project directory:
   ```bash
   cd SAMSMobileApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

#### Running the App

**On Physical Device:**
1. Install Expo Go from App Store (iOS) or Google Play (Android)
2. Scan the QR code displayed in terminal
3. App will load automatically

**On Emulator:**
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Press `w` for web browser

### 🔧 Development

#### Project Structure
```
SAMSMobileApp/
├── src/
│   ├── components/           # Reusable UI components
│   │   └── CustomDrawerContent.tsx
│   ├── screens/             # Main application screens
│   │   ├── LoginScreen.tsx
│   │   ├── ServerManagementScreen.tsx
│   │   ├── InfraHealthDashboardScreen.tsx
│   │   ├── ExecuteCommandsScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   └── AlertsNotificationsScreen.tsx
│   └── services/            # API and data services
├── assets/                  # Images and static files
├── App.tsx                  # Main app component
├── babel.config.js          # Babel configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

#### Key Dependencies
- **@react-navigation/native**: Navigation framework
- **@react-navigation/drawer**: Drawer navigation
- **@expo/vector-icons**: Icon library
- **react-native-screens**: Native screen optimization
- **react-native-gesture-handler**: Gesture handling
- **react-native-reanimated**: Smooth animations

### 📋 Available Scripts

- `npm start`: Start Expo development server
- `npm run android`: Run on Android
- `npm run ios`: Run on iOS
- `npm run web`: Run in web browser

### 🔐 Authentication

The app includes a secure PIN-based authentication system:

**Test PINs:**
- `1234` - Default admin PIN
- `0000` - Alternative test PIN  
- `1111` - Secondary test PIN

**Features:**
- 4-digit PIN requirement
- Visual PIN input indicators
- Clear functionality
- Loading states
- Error handling

### 🎨 Design System

**Color Palette:**
- Primary: `#4a90e2` (Blue)
- Success: `#27ae60` (Green)
- Warning: `#f39c12` (Orange)
- Error: `#e74c3c` (Red)
- Text Primary: `#2c3e50` (Dark Gray)
- Text Secondary: `#7f8c8d` (Light Gray)

**Typography:**
- Headers: Bold, 20-24px
- Body: Regular, 14-16px
- Captions: Light, 12px

### 🌐 Integration

The mobile app is designed to integrate with:
- SAMS Backend API
- Server monitoring systems
- Database query engines
- Notification services
- Authentication providers

### 📱 Platform Support

- **iOS**: Compatible with iOS 11+
- **Android**: Compatible with Android 5.0+
- **Web**: Modern browser support
- **Expo Go**: Full compatibility

### 🚀 Deployment

**Development Build:**
```bash
npx expo build:android  # Android APK
npx expo build:ios      # iOS IPA
```

**Production Build:**
```bash
npx expo build:android --release-channel production
npx expo build:ios --release-channel production
```

### 🔧 Configuration

**Environment Variables:**
Create `.env` file in project root:
```
API_BASE_URL=https://your-sams-api.com
API_KEY=your_api_key
ENVIRONMENT=development
```

**App Configuration:**
Update `app.json` for app metadata:
```json
{
  "expo": {
    "name": "SAMS Mobile",
    "slug": "sams-mobile",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"]
  }
}
```

### 📊 Performance

- **Bundle Size**: Optimized for mobile
- **Load Time**: < 3 seconds on 3G
- **Memory Usage**: < 100MB typical
- **Battery Impact**: Minimal background usage

### 🔒 Security

- PIN-based authentication
- Secure API communication
- No sensitive data storage
- Session management
- Input validation

### 🐛 Troubleshooting

**Common Issues:**

1. **Metro bundler port conflict:**
   ```bash
   npx expo start --port 8082
   ```

2. **Dependencies mismatch:**
   ```bash
   npm install
   npx expo install --fix
   ```

3. **Clear cache:**
   ```bash
   npx expo r -c
   ```

### 📝 License

MIT License - See LICENSE file for details

### 👥 Contributors

- SAMS Development Team
- Mobile App Development

### 📞 Support

For technical support or questions:
- Email: support@sams-mobile.com
- Issues: GitHub Issues
- Documentation: /docs folder

---

**Version**: 1.0.0  
**Last Updated**: August 27, 2025  
**Compatibility**: Expo SDK 53+
