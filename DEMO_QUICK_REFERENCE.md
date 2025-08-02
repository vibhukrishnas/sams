# 🎯 SAMS Demo Quick Reference - Monday Client Meeting

## 🚀 IMMEDIATE DEMO COMMANDS

### **1. Start Demo Environment**
```powershell
# Start Java Backend (Port 5002)
cd d:\Projects\SAMS\backend\java-spring
mvn spring-boot:run

# Start Python Backend (Port 8080) 
cd d:\Projects\SAMS\backend\python-flask
python app.py

# Launch WebSocket Demo
cd d:\Projects\SAMS\infrastructure-monitoring-system\poc\websocket-communication
npm start
```

### **2. Key Demo URLs**
- **Java Backend API:** http://localhost:5002/api/v1/status
- **Python Backend:** http://localhost:8080/api/v1/health  
- **WebSocket Live Stream:** ws://localhost:3002
- **API Documentation:** d:\Projects\SAMS\docs\api-interactive-documentation.html

## ⚡ LIVE DEMO SCRIPT

### **LOG CAPTURE DEMO (15 min)**

#### **Show Real-Time Monitoring**
```bash
# 1. Display live metrics
curl http://localhost:5002/api/v1/metrics/web01

# 2. Show WebSocket streaming
# Open: http://localhost:3001 (WebSocket dashboard)

# 3. Demonstrate Windows agent
cd d:\Projects\SAMS\sams-agents\windows
powershell -ExecutionPolicy Bypass -File sams-agent.ps1

# 4. Show Linux agent capability  
cd d:\Projects\SAMS\sams-agents\linux
python sams-agent.py
```

#### **Client talking points:**
*"Here's live log capture from Windows and Linux servers streaming directly into our correlation engine. Notice the real-time metrics, alert generation, and centralized log aggregation."*

### **COMMAND EXECUTION DEMO (20 min)**

#### **System Commands**
```bash
# 1. Check system health
curl -X POST http://localhost:5002/api/v1/system/commands/check-cpu

# 2. List running services  
curl -X POST http://localhost:5002/api/v1/system/commands/list-services

# 3. Check disk space
curl -X POST http://localhost:5002/api/v1/system/commands/check-disk-space

# 4. Execute custom command
curl -X POST http://localhost:5002/api/v1/system/commands/custom \
  -H "Content-Type: application/json" \
  -d '{"serverId": 1, "command": "systeminfo"}'
```

#### **Enterprise Commands**
```bash  
# Show Java Enterprise Controller
curl -X POST http://localhost:8080/api/v1/system/commands \
  -H "Content-Type: application/json" \
  -d '{"command": "system_info", "type": "powershell"}'
```

#### **Client talking points:**
*"Our secure command framework executes predefined safe commands with full audit trails. Watch as we execute system health checks across Windows and Linux simultaneously."*

### **CROSS-PLATFORM DEMO (10 min)**

#### **Windows Integration**
```powershell
# Show Windows monitoring capability
cd d:\Projects\SAMS\sams-mobile\TestApp\sams-backend-server\monitoring-agent\scripts
powershell -ExecutionPolicy Bypass -File install-windows.ps1 -ServerUrl http://localhost:8080
```

#### **Linux Integration**  
```bash
# Show Linux installer
cd d:\Projects\SAMS\sams-mobile\TestApp\sams-backend-server\monitoring-agent\scripts
chmod +x install-linux.sh
sudo ./install-linux.sh -s http://localhost:8080
```

#### **Client talking points:**
*"Same interface manages both Windows and Linux. Native OS integration with automatic agent deployment and unified management dashboard."*

## 📊 DEMO DATA POINTS

### **Show These Live Metrics:**
- ✅ **CPU Usage:** Real-time percentages
- ✅ **Memory Utilization:** Used/Free/Total
- ✅ **Disk Space:** Available storage across drives
- ✅ **Network Activity:** Interface statistics  
- ✅ **Service Status:** Running/Stopped services
- ✅ **Process Monitoring:** Top resource consumers

### **Demonstrate These Commands:**
- ✅ `systeminfo` - Complete system information
- ✅ `Get-Service` - Windows service status
- ✅ `df -h` - Linux disk usage
- ✅ `top -n 1` - Process monitoring
- ✅ `netstat -tuln` - Network connections
- ✅ `journalctl -f` - Live log streaming

## 🛠️ BACKUP DEMO OPTIONS

### **If Live Systems Unavailable:**
1. **POC Demonstrations:**
   ```bash
   cd d:\Projects\SAMS\infrastructure-monitoring-system\poc
   run-all-pocs.bat
   ```

2. **Mobile App Demo:**
   ```bash
   cd d:\Projects\SAMS\sams-mobile\TestApp
   npm start
   ```

3. **API Documentation:**
   - Open: `d:\Projects\SAMS\docs\api-interactive-documentation.html`
   - Show comprehensive endpoint documentation

## 🎯 CLIENT REQUIREMENT CHECKLIST

### **✅ Application Log Capture**
- [ ] Show WebSocket live streaming
- [ ] Demonstrate log correlation engine  
- [ ] Display real-time alert generation
- [ ] Show centralized log management

### **✅ Remote Command Execution**
- [ ] Execute system health commands
- [ ] Show command audit trail
- [ ] Demonstrate security framework
- [ ] Display cross-platform commands

### **✅ Windows and Linux Support**  
- [ ] Show Windows PowerShell agent
- [ ] Demonstrate Linux Python agent
- [ ] Display unified management interface
- [ ] Show automatic OS detection

## ⚠️ TROUBLESHOOTING

### **If Java Backend Won't Start:**
```bash
# Check H2 database
cd d:\Projects\SAMS\backend\java-spring
mvn clean compile
java -jar target/sams-java-backend-1.0.0.jar --spring.profiles.active=dev
```

### **If Python Backend Issues:**
```bash
# Use development mode
cd d:\Projects\SAMS\backend\python-flask  
python -m flask run --host=0.0.0.0 --port=8080
```

### **If WebSocket Demo Fails:**
```bash
# Alternative: Show POC monitoring agent
cd d:\Projects\SAMS\infrastructure-monitoring-system\poc\server-monitoring-agent
mvn spring-boot:run
```

## 📝 KEY MESSAGE POINTS

### **Opening Statement:**
*"SAMS delivers enterprise-grade monitoring with the three core capabilities you specified: real-time application log capture, secure remote command execution, and comprehensive Windows/Linux support. Our system is production-ready and operational today."*

### **Technical Highlights:**
- **Multi-backend architecture** ensures reliability
- **Cross-platform agents** provide universal coverage  
- **Secure command framework** with safety validation
- **Real-time streaming** for immediate insights
- **Enterprise APIs** ready for integration

### **Closing Statement:**
*"As you can see, SAMS meets all your requirements with a production-ready system. We can begin deployment immediately after this meeting."*

## 🚀 POST-DEMO FOLLOW-UP

### **Immediate Next Steps:**
1. **Installation Planning** - Agent deployment strategy
2. **Integration Discussion** - API integration requirements  
3. **Security Review** - Command authorization framework
4. **Training Schedule** - Team onboarding plan
5. **Deployment Timeline** - Production rollout schedule

### **Technical Deliverables:**
- [ ] Complete API documentation
- [ ] Agent installation scripts
- [ ] Security configuration guide
- [ ] Integration examples
- [ ] Production deployment checklist

**Result:** Client sees comprehensive SAMS solution addressing all requirements with immediate deployment capability.
