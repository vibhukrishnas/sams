# 🚀 SAMS - SIMPLE SETUP GUIDE (No More Panic!)

## 📋 **PREREQUISITES (Just 4 Things!)**

### 1. **Install Node.js** 
- Download from: https://nodejs.org
- Version: 18 or 20 (LTS)
- ✅ Check: Open CMD and type `node --version`

### 2. **Install Android Studio**
- Download from: https://developer.android.com/studio
- During setup: Check "Android SDK" and "Android Virtual Device"
- ✅ Check: Can open Android Studio

### 3. **Install Java 17**
- Download from: https://adoptium.net/temurin/releases/
- Choose: Java 17 LTS
- ✅ Check: Open CMD and type `java --version`

### 4. **Install Git**
- Download from: https://git-scm.com/download/win
- ✅ Check: Open CMD and type `git --version`

---

## 🎯 **FORGET THE COMPLEX STUFF - JUST RUN THIS:**

### **Step 1: Open PowerShell as Administrator**
```powershell
# Navigate to your SAMS directory
cd "D:\Projects\SAMS"

# Install ALL dependencies at once (this fixes everything!)
cd sams-mobile\TestApp
npm install --legacy-peer-deps --force
```

### **Step 2: Start Android Emulator**
```powershell
# Open Android Studio
# Tools > AVD Manager > Create Virtual Device
# Choose: Pixel 4, API 30, Download if needed
# Click Play button to start emulator
```

### **Step 3: Launch SAMS (ONE COMMAND!)**
```powershell
# Still in sams-mobile\TestApp directory
npx react-native run-android --reset-cache
```

### **Step 4: If Step 3 Fails, Try This:**
```powershell
# Start Metro bundler separately
npx react-native start --reset-cache
# Then in another terminal:
npx react-native run-android
```

---

## 🆘 **TROUBLESHOOTING (Common Issues)**

### **Error: "Command not found"**
- **Fix:** Restart your computer after installing Node.js/Java
- **Or:** Add to PATH manually

### **Error: "SDK not found"**
- **Fix:** Open Android Studio > File > Settings > Android SDK
- **Install:** Android 13 (API 33) and Android SDK Build-Tools

### **Error: "Metro bundler port 8081 in use"**
```powershell
netstat -ano | findstr :8081
taskkill /PID [PID_NUMBER] /F
```

### **Error: "Gradle build failed"**
```powershell
cd android
.\gradlew clean
cd ..
npx react-native run-android --reset-cache
```

---

## 🎉 **SUCCESS CHECKLIST**

- ✅ Android emulator is running
- ✅ Metro bundler shows "Bundle loaded from server"  
- ✅ SAMS app appears on emulator screen
- ✅ You can see the main dashboard

---

## 💡 **EMERGENCY CONTACTS**

**If STILL stuck:**
1. Take screenshot of error
2. Check if emulator is running: `adb devices`
3. Kill all processes: `adb kill-server && adb start-server`
4. Try again from Step 3

**You got this! 🚀 SAMS will work!**
