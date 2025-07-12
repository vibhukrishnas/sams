@echo off
echo 🚀 Creating Simple React Native SAMS App
echo ==========================================
echo.

echo 📱 Creating minimal React Native structure...
mkdir SAMSMobileSimple 2>nul
cd SAMSMobileSimple

echo 📦 Creating package.json...
echo {> package.json
echo   "name": "SAMSMobileSimple",>> package.json
echo   "version": "1.0.0",>> package.json
echo   "main": "index.js",>> package.json
echo   "scripts": {>> package.json
echo     "start": "react-native start --port 8081",>> package.json
echo     "android": "react-native run-android --port 8081">> package.json
echo   },>> package.json
echo   "dependencies": {>> package.json
echo     "react": "18.2.0",>> package.json
echo     "react-native": "0.72.6">> package.json
echo   }>> package.json
echo }>> package.json

echo 📱 Creating index.js...
echo import {AppRegistry} from 'react-native';> index.js
echo import App from './App';>> index.js
echo import {name as appName} from './app.json';>> index.js
echo AppRegistry.registerComponent(appName, () =^> App);>> index.js

echo 📱 Creating app.json...
echo {> app.json
echo   "name": "SAMSMobileSimple",>> app.json
echo   "displayName": "SAMS Mobile">> app.json
echo }>> app.json

echo ✅ Simple React Native app structure created!
echo.
echo 📋 Next steps:
echo 1. Use the web-based mobile app (already working)
echo 2. Or try: npx react-native run-android --port 8081
echo 3. Or use Expo: npx create-expo-app SAMSExpo
echo.
echo 🌐 RECOMMENDED: Use the web app for immediate testing
echo The production-ready web app is fully functional!
echo.
cd ..
pause
