# SAMS - Student Attendance Management System

A comprehensive student attendance management system built with React Native for mobile and Rust for the backend.

## Project Structure

```
SAMS/
├── sams-mobile/          # React Native mobile application
├── backend/              # Rust backend server
├── mobile-app/           # Additional mobile app components
└── README.md
```

## Features

- Mobile-first attendance tracking
- Student and teacher management
- Real-time attendance monitoring
- Cross-platform mobile support (iOS & Android)

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

3. Run the app:
   ```bash
   # For Android
   npx react-native run-android
   
   # For iOS
   npx react-native run-ios
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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
