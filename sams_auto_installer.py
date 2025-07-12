#!/usr/bin/env python3
"""
🚀 SAMS Auto-Installer
Automatically installs SAMS monitoring on target Windows servers
"""

import os
import sys
import subprocess
import socket
import datetime
import json
import time
import requests
from pathlib import Path

class SAMSAutoInstaller:
    def __init__(self, target_ip, target_name="Unknown Server"):
        self.target_ip = target_ip
        self.target_name = target_name
        self.install_dir = "C:\\SAMS-Monitor"
        self.port = 8080
        
    def log(self, message):
        """Log installation progress"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def check_python(self):
        """Check if Python is installed"""
        try:
            result = subprocess.run([sys.executable, '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.log(f"✅ Python found: {result.stdout.strip()}")
                return True
        except:
            pass
        
        self.log("❌ Python not found - installation required")
        return False
        
    def install_packages(self):
        """Install required Python packages"""
        packages = ['flask', 'flask-cors', 'psutil', 'requests']
        
        for package in packages:
            try:
                self.log(f"📦 Installing {package}...")
                result = subprocess.run([sys.executable, '-m', 'pip', 'install', package], 
                                      capture_output=True, text=True, timeout=60)
                if result.returncode == 0:
                    self.log(f"✅ {package} installed successfully")
                else:
                    self.log(f"⚠️ {package} installation warning: {result.stderr}")
            except Exception as e:
                self.log(f"❌ Failed to install {package}: {e}")
                return False
        return True
        
    def create_monitor_script(self):
        """Create the SAMS monitoring script"""
        monitor_script = f'''#!/usr/bin/env python3
"""
SAMS Windows Server Monitor - Auto-Generated
Target: {self.target_name} ({self.target_ip})
Generated: {datetime.datetime.now().isoformat()}
"""

import flask
import psutil
import socket
import datetime
import json
import subprocess
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Server Information
SERVER_INFO = {{
    "name": "{self.target_name}",
    "ip": "{self.target_ip}",
    "hostname": socket.gethostname(),
    "install_time": "{datetime.datetime.now().isoformat()}",
    "version": "1.0.0"
}}

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({{
        "status": "healthy",
        "hostname": socket.gethostname(),
        "ip": "{self.target_ip}",
        "timestamp": datetime.datetime.now().isoformat(),
        "uptime": get_uptime(),
        "version": "1.0.0"
    }})

@app.route('/api/v1/metrics', methods=['GET'])
def get_metrics():
    """Get system metrics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('C:')
        
        return jsonify({{
            "cpu": cpu_percent,
            "memory": {{
                "used": memory.percent,
                "total": memory.total,
                "available": memory.available
            }},
            "disk": {{
                "used": disk.used,
                "total": disk.total,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            }},
            "timestamp": datetime.datetime.now().isoformat()
        }})
    except Exception as e:
        return jsonify({{"error": str(e)}}), 500

@app.route('/api/v1/services', methods=['GET'])
def get_services():
    """Get Windows services status"""
    try:
        result = subprocess.run(['sc', 'query'], capture_output=True, text=True, timeout=30)
        services = []
        
        if result.returncode == 0:
            # Parse service output (simplified)
            lines = result.stdout.split('\\n')
            current_service = {{}}
            
            for line in lines:
                line = line.strip()
                if line.startswith('SERVICE_NAME:'):
                    if current_service:
                        services.append(current_service)
                    current_service = {{'name': line.split(':', 1)[1].strip()}}
                elif line.startswith('STATE'):
                    state_info = line.split(':', 1)[1].strip()
                    current_service['status'] = state_info.split()[0]
            
            if current_service:
                services.append(current_service)
        
        return jsonify({{"services": services[:20]}})  # Limit to first 20
    except Exception as e:
        return jsonify({{"error": str(e)}}), 500

def get_uptime():
    """Get system uptime"""
    try:
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        return int(uptime_seconds)
    except:
        return 0

if __name__ == '__main__':
    print("🚀 Starting SAMS Monitor for {self.target_name}")
    print(f"📊 Monitoring server: {{SERVER_INFO['hostname']}} ({{SERVER_INFO['ip']}})")
    print(f"🌐 API available at: http://{{SERVER_INFO['ip']}}:{self.port}")
    print("🔗 Ready for SAMS app connection!")
    
    app.run(host='0.0.0.0', port={self.port}, debug=False)
'''
        
        # Create installation directory
        os.makedirs(self.install_dir, exist_ok=True)
        
        # Write monitor script
        script_path = os.path.join(self.install_dir, "sams_monitor.py")
        with open(script_path, 'w') as f:
            f.write(monitor_script)
            
        self.log(f"✅ Monitor script created: {script_path}")
        return script_path
        
    def create_startup_script(self, monitor_script_path):
        """Create Windows startup script"""
        startup_script = f'''@echo off
echo 🚀 Starting SAMS Monitor for {self.target_name}
echo 📊 Target Server: {self.target_ip}
echo 🕐 Start Time: %date% %time%

cd /d "{self.install_dir}"
python "{monitor_script_path}"

pause
'''
        
        startup_path = os.path.join(self.install_dir, "start_sams_monitor.bat")
        with open(startup_path, 'w') as f:
            f.write(startup_script)
            
        self.log(f"✅ Startup script created: {startup_path}")
        return startup_path
        
    def install(self):
        """Perform complete SAMS installation"""
        self.log(f"🚀 Starting SAMS installation on {self.target_name} ({self.target_ip})")
        
        # Step 1: Check Python
        if not self.check_python():
            self.log("❌ Python installation required - please install Python first")
            return False
            
        # Step 2: Install packages
        if not self.install_packages():
            self.log("❌ Package installation failed")
            return False
            
        # Step 3: Create monitor script
        monitor_script = self.create_monitor_script()
        if not monitor_script:
            self.log("❌ Failed to create monitor script")
            return False
            
        # Step 4: Create startup script
        startup_script = self.create_startup_script(monitor_script)
        if not startup_script:
            self.log("❌ Failed to create startup script")
            return False
            
        # Step 5: Start the monitor
        try:
            self.log("🚀 Starting SAMS monitor service...")
            subprocess.Popen([sys.executable, monitor_script], 
                           cwd=self.install_dir, 
                           creationflags=subprocess.CREATE_NEW_CONSOLE)
            
            # Wait a moment for startup
            time.sleep(3)
            
            # Verify installation
            try:
                response = requests.get(f"http://localhost:{self.port}/api/v1/health", timeout=5)
                if response.status_code == 200:
                    self.log("✅ SAMS monitor started successfully!")
                    self.log(f"🌐 API available at: http://{self.target_ip}:{self.port}")
                    return True
                else:
                    self.log("⚠️ Monitor started but API not responding properly")
                    return False
            except:
                self.log("⚠️ Monitor started but verification failed")
                return False
                
        except Exception as e:
            self.log(f"❌ Failed to start monitor: {e}")
            return False

def main():
    """Main installation function"""
    if len(sys.argv) < 2:
        print("Usage: python sams_auto_installer.py <target_ip> [target_name]")
        sys.exit(1)
        
    target_ip = sys.argv[1]
    target_name = sys.argv[2] if len(sys.argv) > 2 else f"Server-{target_ip}"
    
    installer = SAMSAutoInstaller(target_ip, target_name)
    success = installer.install()
    
    if success:
        print(f"\\n🎉 SAMS installation completed successfully!")
        print(f"📊 Monitor running on: http://{target_ip}:8080")
        print(f"🔗 Ready for SAMS app connection!")
        sys.exit(0)
    else:
        print(f"\\n❌ SAMS installation failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
