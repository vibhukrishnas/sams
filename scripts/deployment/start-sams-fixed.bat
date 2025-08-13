@echo off
echo Starting SAMS Mobile App (Fixed Version)...
cd /d "d:\Projects\SAMS\SAMSMobileExpo"
echo Current directory: %CD%
echo.
echo Contents:
dir package.json App.js
echo.
echo Starting Expo server...
npx expo start --web --clear
pause
