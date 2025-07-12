# 🖥️ SAMS Windows Server Setup Guide

## 🚀 SUPER QUICK SETUP (5 MINUTES)

### **STEP 1: Download Files to Your Windows Server**
Copy these files to your Windows server:
- `windows_sams_server.py`
- `start_windows_monitor.bat`

### **STEP 2: Install Python (if not installed)**
1. Go to: https://www.python.org/downloads/
2. Download Python 3.x
3. **IMPORTANT**: Check "Add Python to PATH" during installation
4. Install normally

### **STEP 3: Run the Monitor**
1. **Right-click** on `start_windows_monitor.bat`
2. **Select "Run as Administrator"** (recommended)
3. The script will:
   - Install required packages automatically
   - Show your Windows server IP address
   - Start monitoring your system

### **STEP 4: Update SAMS App**
The batch file will show you something like:
```
📍 Your Windows server IP: 192.168.1.100
🔧 Update your SAMS app with:
   API_BASE_URL = 'http://192.168.1.100:8080'
```

Copy that IP address!

---

## 🔧 UPDATE SAMS APP

In your SAMS app (`EnhancedApp.tsx`), find this line:
```javascript
const API_BASE_URL = 'http://YOUR_SERVER_IP:PORT';
```

Replace it with your actual Windows server IP:
```javascript
const API_BASE_URL = 'http://192.168.1.100:8080';  // Use YOUR IP here
```

---

## 🖥️ WHAT GETS MONITORED

Your Windows server will now provide:

### **📊 System Metrics**
- **CPU Usage** - Real-time processor utilization
- **Memory Usage** - RAM consumption and availability  
- **Disk Space** - C: drive usage and free space
- **System Uptime** - How long server has been running

### **🔧 Windows Services**
- **Print Spooler** - Printing services
- **Windows Audio** - Audio services
- **DHCP Client** - Network configuration
- **DNS Client** - Name resolution
- **Event Log** - System logging
- **Task Scheduler** - Scheduled tasks
- **Windows Update** - Update services
- **And more critical services...**

### **⚡ Running Processes**
- **Top 10 processes** by CPU usage
- **Memory consumption** per process
- **Process names and IDs**

### **🚨 Smart Alerts**
- **High CPU** (>80% = Warning, >90% = Critical)
- **High Memory** (>85% = Warning, >95% = Critical)  
- **Low Disk Space** (>90% = Warning, >95% = Critical)
- **Stopped Services** - Critical Windows services not running
- **Custom alerts** based on your thresholds

---

## 🌐 API ENDPOINTS AVAILABLE

Once running, your Windows server provides:

- `http://YOUR_IP:8080/api/v1/servers` - Server information
- `http://YOUR_IP:8080/api/v1/alerts` - Current alerts
- `http://YOUR_IP:8080/api/v1/health` - Health status
- `http://YOUR_IP:8080/api/v1/services` - Windows services
- `http://YOUR_IP:8080/api/v1/processes` - Running processes

---

## 🔥 TESTING THE CONNECTION

### **From Your Windows Server:**
Open browser and go to: `http://localhost:8080`
You should see: "SAMS Windows Server Monitor"

### **From SAMS App:**
1. Update the API_BASE_URL with your IP
2. Run the SAMS app
3. Look for logs: "🌐 Connecting to your server"
4. Should see: "✅ Successfully fetched server data from your system"

---

## 🛠️ TROUBLESHOOTING

### **Python Not Found:**
- Install Python from python.org
- Make sure "Add to PATH" was checked
- Restart Command Prompt

### **Permission Denied:**
- Run batch file as Administrator
- Check Windows Firewall settings
- Ensure port 8080 is available

### **Can't Connect from SAMS App:**
- Verify IP address is correct
- Check Windows Firewall (allow port 8080)
- Make sure both devices are on same network
- Try: `telnet YOUR_IP 8080` from SAMS device

### **Services Not Showing:**
- Run as Administrator for full service access
- Some services require elevated permissions

---

## 🎯 READY FOR DEMO!

Once everything is running:

✅ **Your Windows server** is being monitored in real-time
✅ **SAMS app** connects to YOUR actual system  
✅ **Real alerts** based on YOUR server's status
✅ **Live metrics** from YOUR Windows environment
✅ **Professional demo** with YOUR infrastructure

**Perfect for client presentations showing real Windows server monitoring!** 🚀

---

## 📞 NEED HELP?

If you run into any issues:
1. **Check the batch file output** for error messages
2. **Verify your IP address** with `ipconfig`
3. **Test the API** by opening `http://localhost:8080` in browser
4. **Check Windows Firewall** settings for port 8080

**Your Windows server will be fully integrated with SAMS in minutes!** 💪
