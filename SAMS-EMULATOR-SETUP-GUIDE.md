# 🚀 SAMS Mobile App - Emulator Setup & Launch Guide

## 📱 Quick Launch Instructions

### **Option 1: Use Existing Scripts (Recommended)**
```bash
# Navigate to the mobile app directory
cd sams-mobile\TestApp

# Run the existing launch script
run-sams-app.bat
```

### **Option 2: Manual Launch Steps**

#### **Step 1: Start Android Emulator**
```bash
# Check available emulators
emulator -list-avds

# Start SAMS_Local emulator
emulator -avd SAMS_Local -no-snapshot-load

# OR start SAMS_Fast emulator
emulator -avd SAMS_Fast -no-snapshot-load
```

#### **Step 2: Start Backend Server**
```bash
# Navigate to backend server
cd sams-mobile\TestApp\sams-backend-server

# Start the server
node server.js
```

#### **Step 3: Launch Mobile App**
```bash
# Navigate to mobile app
cd sams-mobile\TestApp

# Install dependencies (if needed)
npm install

# Start Metro bundler
npx react-native start --reset-cache

# In a new terminal, run the app
npx react-native run-android
```

---

## 🔧 Android SDK Setup (If Not Installed)

### **1. Install Android Studio**
- Download from: https://developer.android.com/studio
- Install with default settings
- Open Android Studio and complete setup wizard

### **2. Configure Android SDK**
- Open Android Studio
- Go to: File → Settings → Appearance & Behavior → System Settings → Android SDK
- Install required SDK platforms and tools

### **3. Set Environment Variables**
Add to your system PATH:
```
C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools
C:\Users\%USERNAME%\AppData\Local\Android\Sdk\emulator
```

Or if installed on D: drive:
```
D:\Android\Sdk\platform-tools
D:\Android\Sdk\emulator
```

### **4. Create Android Virtual Device (AVD)**
- Open Android Studio
- Go to: Tools → AVD Manager
- Click "Create Virtual Device"
- Choose device (e.g., Pixel 4)
- Select system image (API 30+)
- Name it "SAMS_Local"
- Click "Finish"

---

## 🚀 Automated Launch Scripts

### **Enhanced Launcher (launch-sams-in-emulator.bat)**
```bash
# Run the comprehensive launcher
launch-sams-in-emulator.bat
```

### **Quick Launcher (quick-launch-sams.bat)**
```bash
# Run the quick launcher
quick-launch-sams.bat
```

### **Existing App Launcher**
```bash
# Use the existing script in the mobile app
cd sams-mobile\TestApp
run-sams-app.bat
```

---

## 📱 SAMS Mobile App Features

Once launched, the app includes:

### **🔐 Authentication**
- PIN Authentication (default: 1234)
- Biometric authentication support
- Secure token management

### **📊 Dashboard**
- Real-time server monitoring
- System health overview
- Performance metrics
- Alert summary

### **🖥️ Server Management**
- Server list and status
- Add/remove servers
- Server configuration
- Health checks

### **🚨 Alert Management**
- Real-time alerts
- Alert acknowledgment
- Alert history
- Notification settings

### **📈 Analytics**
- Performance trends
- Usage statistics
- System reports
- Custom dashboards

---

## 🔧 Troubleshooting

### **Emulator Issues**
```bash
# Check if emulator is running
adb devices

# Kill all emulator processes
adb kill-server
adb start-server

# Cold boot emulator
emulator -avd SAMS_Local -wipe-data
```

### **Metro Bundler Issues**
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear npm cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### **Build Issues**
```bash
# Clean build
cd android
./gradlew clean
cd ..

# Rebuild app
npx react-native run-android --reset-cache
```

### **Port Conflicts**
```bash
# Kill processes on port 8081 (Metro)
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Kill processes on port 8080 (Backend)
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

---

## 📋 System Requirements

### **Minimum Requirements**
- Windows 10/11
- 8GB RAM (16GB recommended)
- 10GB free disk space
- Android Studio or Android SDK
- Node.js 16+
- Java 11+

### **Recommended Setup**
- 16GB+ RAM
- SSD storage
- Dedicated graphics card
- Multiple monitors for development

---

## 🎯 Quick Commands Reference

```bash
# Check Android SDK
adb version

# List emulators
emulator -list-avds

# Start specific emulator
emulator -avd SAMS_Local

# Check running devices
adb devices

# Install app on device
adb install app-debug.apk

# View app logs
adb logcat | grep SAMS

# React Native commands
npx react-native doctor
npx react-native info
npx react-native run-android
npx react-native start
```

---

## 📞 Support

If you encounter issues:

1. **Check the logs** in Metro bundler terminal
2. **Verify emulator** is running with `adb devices`
3. **Restart services** if needed
4. **Check network connectivity** to backend server
5. **Review error messages** for specific issues

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

✅ **Emulator**: Android device running and responsive  
✅ **Backend**: Server running on http://localhost:8080  
✅ **Metro**: Bundler running on http://localhost:8081  
✅ **App**: SAMS app installed and running on emulator  
✅ **Connectivity**: App can connect to backend server  

---

**🚀 Ready to launch SAMS in your local emulator!**
