@echo off
echo 🚀 Creating Working SAMS Mobile App
echo ===================================
echo.

REM Step 1: Create new directory
echo 📁 Creating new app directory...
mkdir SAMS-Working 2>nul
cd SAMS-Working

REM Step 2: Create package.json manually
echo 📦 Creating package.json...
echo {> package.json
echo   "name": "sams-working",>> package.json
echo   "version": "1.0.0",>> package.json
echo   "main": "App.js",>> package.json
echo   "scripts": {>> package.json
echo     "start": "expo start",>> package.json
echo     "android": "expo start --android",>> package.json
echo     "ios": "expo start --ios",>> package.json
echo     "web": "expo start --web">> package.json
echo   },>> package.json
echo   "dependencies": {>> package.json
echo     "expo": "~49.0.0",>> package.json
echo     "react": "18.2.0",>> package.json
echo     "react-native": "0.72.6",>> package.json
echo     "react-native-web": "~0.19.6">> package.json
echo   },>> package.json
echo   "devDependencies": {>> package.json
echo     "@babel/core": "^7.20.0">> package.json
echo   }>> package.json
echo }>> package.json

REM Step 3: Create app.json
echo 📱 Creating app.json...
echo {> app.json
echo   "expo": {>> app.json
echo     "name": "SAMS Mobile",>> app.json
echo     "slug": "sams-mobile",>> app.json
echo     "version": "1.0.0",>> app.json
echo     "orientation": "portrait",>> app.json
echo     "icon": "./assets/icon.png",>> app.json
echo     "userInterfaceStyle": "light",>> app.json
echo     "splash": {>> app.json
echo       "image": "./assets/splash.png",>> app.json
echo       "resizeMode": "contain",>> app.json
echo       "backgroundColor": "#ffffff">> app.json
echo     },>> app.json
echo     "assetBundlePatterns": [>> app.json
echo       "**/*">> app.json
echo     ],>> app.json
echo     "ios": {>> app.json
echo       "supportsTablet": true>> app.json
echo     },>> app.json
echo     "android": {>> app.json
echo       "adaptiveIcon": {>> app.json
echo         "foregroundImage": "./assets/adaptive-icon.png",>> app.json
echo         "backgroundColor": "#FFFFFF">> app.json
echo       }>> app.json
echo     },>> app.json
echo     "web": {>> app.json
echo       "favicon": "./assets/favicon.png">> app.json
echo     }>> app.json
echo   }>> app.json
echo }>> app.json

REM Step 4: Create babel.config.js
echo 🔧 Creating babel.config.js...
echo module.exports = function(api) {> babel.config.js
echo   api.cache(true);>> babel.config.js
echo   return {>> babel.config.js
echo     presets: ['babel-preset-expo'],>> babel.config.js
echo   };>> babel.config.js
echo };>> babel.config.js

echo ✅ Basic Expo app structure created!
echo.
echo 📋 Next steps:
echo 1. Install Expo CLI globally: npm install -g @expo/cli
echo 2. Run: expo install
echo 3. Run: expo start
echo.
echo 🌐 Or use the web simulator: mobile_app_simulator.html
echo.
pause
