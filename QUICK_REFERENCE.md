# 🚀 SAMS Quick Reference

## Most Common Commands

### 🏗️ Development
- **Start Backend**: `cd sams-backend && mvn spring-boot:run`
- **Start Web Frontend**: `cd web && npm start`
- **Start Mobile App**: `cd sams-mobile/TestApp && npx react-native run-android`

### 📜 Use Scripts
- **Quick Launch**: `.\scripts\launch\quick-launch-sams.bat`
- **Android Setup**: `.\scripts\android\quick-android-setup.bat`  
- **Deploy**: `.\scripts\deployment\deploy_sams_to_server.bat`

### 🖥️ Servers
- **Windows Monitor**: `python servers\windows_sams_server.py`
- **Demo Server**: `python servers\demo_server.py`

### 🐳 Docker
- **Start All Services**: `docker-compose up -d`
- **View Logs**: `docker-compose logs -f`

## 📁 Key Directories
- `sams-backend/` - Spring Boot API
- `sams-mobile/TestApp/` - React Native app  
- `web/` - React web frontend
- `scripts/` - All automation scripts
- `servers/` - Python monitoring servers
- `documentation/` - All docs and guides
