# 🖥️ SAMS Desktop Demo Setup Guide

## 🎯 **GOAL: Run SAMS on Your Desktop for Client Demos**

### **Option 1: React Native Web (Recommended for Desktop)**
### **Option 2: Android Emulator on Desktop**
### **Option 3: Expo Web Version**

---

## 🚀 **OPTION 1: REACT NATIVE WEB (BEST FOR DESKTOP DEMOS)**

### **Step 1: Install React Native Web Dependencies**

```bash
cd sams-mobile/TestApp
npm install react-native-web react-dom
npm install --save-dev @babel/preset-react webpack webpack-cli webpack-dev-server html-webpack-plugin babel-loader
```

### **Step 2: Create Web Configuration**

Create `webpack.config.js`:
```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './index.web.js',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web'
    },
    extensions: ['.web.js', '.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  devServer: {
    port: 3001,
    hot: true
  }
};
```

### **Step 3: Create Web Entry Point**

Create `index.web.js`:
```javascript
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('TestApp', () => App);
AppRegistry.runApplication('TestApp', {
  rootTag: document.getElementById('root')
});
```

### **Step 4: Create HTML Template**

Create `public/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>SAMS - System Alert Management System</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        #root { height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

### **Step 5: Update package.json**

Add to scripts section:
```json
{
  "scripts": {
    "web": "webpack serve --config webpack.config.js",
    "build-web": "webpack --config webpack.config.js"
  }
}
```

---

## 🚀 **OPTION 2: ANDROID EMULATOR (CURRENT SETUP)**

### **Step 1: Ensure Android Studio is Running**

1. **Open Android Studio**
2. **Start AVD Manager** (Tools → AVD Manager)
3. **Launch an emulator** (Pixel 4 or similar)
4. **Wait for emulator to fully boot**

### **Step 2: Start Backend Server**

```bash
cd sams-backend-server
node simple-server.js
```

### **Step 3: Start React Native Metro**

```bash
cd sams-mobile/TestApp
npx react-native start --reset-cache
```

### **Step 4: Run on Android**

```bash
npx react-native run-android
```

---

## 🚀 **OPTION 3: EXPO SETUP (EASIEST)**

### **Step 1: Convert to Expo**

```bash
cd sams-mobile
npx create-expo-app SAMSExpo --template blank
cd SAMSExpo
```

### **Step 2: Copy Your App Code**

```bash
# Copy App.tsx content to SAMSExpo/App.js
# Update imports for Expo compatibility
```

### **Step 3: Install Dependencies**

```bash
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
```

### **Step 4: Run on Web**

```bash
npx expo start --web
```

---

## 🎯 **RECOMMENDED: QUICK DESKTOP SETUP**

### **For Immediate Demo (5 minutes):**

1. **Keep backend running:**
   ```bash
   cd sams-backend-server
   node simple-server.js
   ```

2. **Use browser demo:**
   - Open `api-demo.html` in browser
   - Show live API functionality
   - Demonstrate real-time updates

3. **Use Android emulator for mobile demo:**
   - Keep current React Native app running
   - Show mobile interface
   - Demonstrate touch interactions

---

## 🖥️ **DESKTOP OPTIMIZATION TIPS**

### **For Client Presentations:**

1. **Dual Monitor Setup:**
   - **Monitor 1:** Browser with API demo
   - **Monitor 2:** Android emulator with mobile app

2. **Screen Recording:**
   ```bash
   # Record demo for later playback
   # Use OBS Studio or similar
   ```

3. **Presentation Mode:**
   - **Full screen browser** for API demo
   - **Full screen emulator** for mobile demo
   - **Smooth transitions** between views

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues:**

1. **Metro bundler conflicts:**
   ```bash
   npx react-native start --reset-cache --port 8082
   ```

2. **Android emulator not connecting:**
   ```bash
   adb devices
   adb reverse tcp:3000 tcp:3000
   ```

3. **Web version styling issues:**
   - React Native Web has some limitations
   - Test thoroughly before client demo

---

## 🎯 **DEMO SCRIPT FOR DESKTOP**

### **5-Minute Client Demo:**

1. **"Let me show you our backend APIs"** (2 minutes)
   - Open browser with `api-demo.html`
   - Click through all endpoints
   - Show real-time data updates

2. **"Here's the mobile interface"** (3 minutes)
   - Switch to Android emulator
   - Navigate through all sections
   - Demonstrate reliability features
   - Show custom report creation

### **Extended Demo (10 minutes):**
- Add server management features
- Show alert acknowledgment
- Demonstrate report generation
- Explain integration capabilities

---

## 🚀 **NEXT STEPS**

### **Choose your preferred option:**

1. **Quick Demo:** Use current Android emulator + browser
2. **Professional Demo:** Set up React Native Web
3. **Flexible Demo:** Convert to Expo for multi-platform

### **For Production:**
- Deploy backend to cloud
- Build web version for browser demos
- Create APK for device testing

**Ready to impress clients with a professional desktop demo!** 🎯💼
