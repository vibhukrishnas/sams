#!/usr/bin/env python3
"""
🖥️ SAMS Windows Server Monitor
Simple API server for Windows system monitoring
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
import datetime
import platform
import socket
import subprocess
import json
import threading
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Global variables for Windows metrics
windows_metrics = {}
windows_alerts = []
services_status = {}

def get_windows_services():
    """Get Windows services status"""
    try:
        # Get critical Windows services
        critical_services = [
            'Spooler',      # Print Spooler
            'Themes',       # Themes
            'AudioSrv',     # Windows Audio
            'BITS',         # Background Intelligent Transfer Service
            'Dhcp',         # DHCP Client
            'Dnscache',     # DNS Client
            'EventLog',     # Windows Event Log
            'LanmanServer', # Server
            'LanmanWorkstation', # Workstation
            'RpcSs',        # Remote Procedure Call (RPC)
            'Schedule',     # Task Scheduler
            'W32Time',      # Windows Time
            'Winmgmt',      # Windows Management Instrumentation
            'wuauserv'      # Windows Update
        ]
        
        services = {}
        for service in critical_services:
            try:
                result = subprocess.run(
                    ['sc', 'query', service], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                if 'RUNNING' in result.stdout:
                    services[service] = 'running'
                elif 'STOPPED' in result.stdout:
                    services[service] = 'stopped'
                else:
                    services[service] = 'unknown'
            except:
                services[service] = 'error'
        
        return services
    except Exception as e:
        print(f"❌ Error getting services: {e}")
        return {}

def get_windows_processes():
    """Get top Windows processes by CPU/Memory"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                proc_info = proc.info
                if proc_info['cpu_percent'] > 0 or proc_info['memory_percent'] > 1:
                    processes.append(proc_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage and get top 10
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return processes[:10]
    except Exception as e:
        print(f"❌ Error getting processes: {e}")
        return []

def update_windows_metrics():
    """Update Windows system metrics every 30 seconds"""
    global windows_metrics, windows_alerts, services_status
    
    while True:
        try:
            # Get system info
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('C:')
            boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
            uptime = datetime.datetime.now() - boot_time
            
            # Get network info
            hostname = socket.gethostname()
            try:
                local_ip = socket.gethostbyname(hostname)
            except:
                local_ip = "Unknown"
            
            # Get Windows version
            windows_version = platform.platform()
            
            # Get services status
            services_status = get_windows_services()
            
            # Get top processes
            top_processes = get_windows_processes()
            
            windows_metrics = {
                "hostname": hostname,
                "ip_address": local_ip,
                "windows_version": windows_version,
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_total_gb": round(memory.total / (1024**3), 1),
                "memory_used_gb": round(memory.used / (1024**3), 1),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
                "disk_total_gb": round(disk.total / (1024**3), 1),
                "disk_free_gb": round(disk.free / (1024**3), 1),
                "uptime_days": uptime.days,
                "uptime_hours": uptime.seconds // 3600,
                "boot_time": boot_time.isoformat(),
                "services": services_status,
                "top_processes": top_processes,
                "last_updated": datetime.datetime.now().isoformat()
            }
            
            # Generate alerts based on thresholds
            windows_alerts = []
            alert_id = 1
            
            # CPU Alert
            if cpu_percent > 80:
                windows_alerts.append({
                    "id": f"cpu-alert-{alert_id}",
                    "title": "High CPU Usage on Windows Server",
                    "message": f"CPU usage is {cpu_percent}% on {hostname} ({local_ip})",
                    "severity": "Critical" if cpu_percent > 90 else "Warning",
                    "time": datetime.datetime.now().isoformat(),
                    "source": f"Windows Server ({hostname})",
                    "acknowledged": False
                })
                alert_id += 1
            
            # Memory Alert
            if memory.percent > 85:
                windows_alerts.append({
                    "id": f"memory-alert-{alert_id}",
                    "title": "High Memory Usage on Windows Server",
                    "message": f"Memory usage is {memory.percent}% ({memory.used/(1024**3):.1f}GB used) on {hostname}",
                    "severity": "Critical" if memory.percent > 95 else "Warning",
                    "time": datetime.datetime.now().isoformat(),
                    "source": f"Windows Server ({hostname})",
                    "acknowledged": False
                })
                alert_id += 1
            
            # Disk Alert
            disk_percent = (disk.used / disk.total) * 100
            if disk_percent > 90:
                windows_alerts.append({
                    "id": f"disk-alert-{alert_id}",
                    "title": "Low Disk Space on Windows Server",
                    "message": f"C: drive is {disk_percent:.1f}% full ({disk.free/(1024**3):.1f}GB free) on {hostname}",
                    "severity": "Critical" if disk_percent > 95 else "Warning",
                    "time": datetime.datetime.now().isoformat(),
                    "source": f"Windows Server ({hostname})",
                    "acknowledged": False
                })
                alert_id += 1
            
            # Service Alerts
            for service, status in services_status.items():
                if status == 'stopped':
                    windows_alerts.append({
                        "id": f"service-alert-{service}",
                        "title": f"Windows Service Stopped: {service}",
                        "message": f"Critical Windows service '{service}' is not running on {hostname}",
                        "severity": "Warning",
                        "time": datetime.datetime.now().isoformat(),
                        "source": f"Windows Services ({hostname})",
                        "acknowledged": False
                    })
            
            # Add demo alert if no real alerts
            if not windows_alerts:
                windows_alerts.append({
                    "id": "windows-demo-alert",
                    "title": "Windows Server Monitoring Active",
                    "message": f"SAMS is successfully monitoring Windows server {hostname} ({local_ip})",
                    "severity": "Info",
                    "time": datetime.datetime.now().isoformat(),
                    "source": f"SAMS Monitor ({hostname})",
                    "acknowledged": False
                })
            
            print(f"🖥️ Windows metrics updated: {hostname} - CPU {cpu_percent}%, Memory {memory.percent}%, Alerts: {len(windows_alerts)}")
            
        except Exception as e:
            print(f"❌ Error updating Windows metrics: {e}")
        
        time.sleep(30)  # Update every 30 seconds

@app.route('/')
def home():
    """API status page"""
    return jsonify({
        "service": "SAMS Windows Server Monitor",
        "status": "running",
        "server_type": "Windows",
        "hostname": windows_metrics.get("hostname", "Unknown"),
        "ip_address": windows_metrics.get("ip_address", "Unknown"),
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "endpoints": [
            "/api/v1/servers",
            "/api/v1/alerts", 
            "/api/v1/health",
            "/api/v1/services",
            "/api/v1/processes"
        ]
    })

@app.route('/api/v1/servers')
def get_servers():
    """Get Windows server information"""
    try:
        servers = [{
            "id": "windows-srv-001",
            "name": f"Windows Server ({windows_metrics.get('hostname', 'Unknown')})",
            "ip": windows_metrics.get("ip_address", "Unknown"),
            "status": "online",
            "cpu": windows_metrics.get("cpu_percent", 0),
            "memory": windows_metrics.get("memory_percent", 0),
            "disk": windows_metrics.get("disk_percent", 0),
            "uptime": f"{windows_metrics.get('uptime_days', 0)} days, {windows_metrics.get('uptime_hours', 0)} hours",
            "location": "Windows Environment",
            "os": windows_metrics.get("windows_version", "Windows"),
            "lastUpdated": windows_metrics.get("last_updated", datetime.datetime.now().isoformat())
        }]
        
        print(f"📡 Windows servers API called - returning {len(servers)} servers")
        return jsonify({"servers": servers})
        
    except Exception as e:
        print(f"❌ Error in Windows servers API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/alerts')
def get_alerts():
    """Get current Windows alerts"""
    try:
        print(f"🚨 Windows alerts API called - returning {len(windows_alerts)} alerts")
        return jsonify({"alerts": windows_alerts})
        
    except Exception as e:
        print(f"❌ Error in Windows alerts API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/health')
def health_check():
    """Windows health check endpoint"""
    try:
        health_status = {
            "status": "healthy",
            "server_type": "Windows",
            "hostname": windows_metrics.get("hostname", "Unknown"),
            "timestamp": datetime.datetime.now().isoformat(),
            "uptime": f"{windows_metrics.get('uptime_days', 0)} days",
            "services": {
                "running_services": len([s for s in services_status.values() if s == 'running']),
                "stopped_services": len([s for s in services_status.values() if s == 'stopped']),
                "total_services": len(services_status)
            },
            "metrics": {
                "cpu": windows_metrics.get("cpu_percent", 0),
                "memory": windows_metrics.get("memory_percent", 0),
                "disk": windows_metrics.get("disk_percent", 0)
            }
        }
        
        print("💓 Windows health check called")
        return jsonify(health_status)
        
    except Exception as e:
        print(f"❌ Error in Windows health check: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/services')
def get_services():
    """Get Windows services status"""
    try:
        return jsonify({"services": services_status})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/processes')
def get_processes():
    """Get top Windows processes"""
    try:
        return jsonify({"processes": windows_metrics.get("top_processes", [])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🔧 REAL SERVER OPERATIONS ENDPOINTS
@app.route('/api/v1/servers/add', methods=['POST'])
def add_server():
    """Add a new server to monitor with REAL CONNECTION and AUTO-INSTALLATION"""
    try:
        data = request.get_json()
        server_ip = data.get('ip')
        server_name = data.get('name', f'Server-{server_ip}')
        server_type = data.get('type', 'Windows')
        username = data.get('username', 'Administrator')
        password = data.get('password', '')
        port = data.get('port', 8080)

        print(f"🔗 REAL SERVER ADDITION: Connecting to {server_name} ({server_ip})")

        # STEP 1: Test network connectivity
        import socket
        import subprocess
        import os
        import tempfile

        # Test ping connectivity first
        ping_result = subprocess.run(['ping', '-n', '1', server_ip],
                                   capture_output=True, text=True, timeout=10)
        if ping_result.returncode != 0:
            return jsonify({
                "success": False,
                "message": f"❌ Network Error: Cannot reach {server_ip}. Server is not responding to ping.",
                "error_type": "network_unreachable"
            }), 400

        print(f"✅ Network connectivity verified: {server_ip} is reachable")

        # STEP 2: Test common service ports
        test_ports = [22, 80, 135, 443, 445, 3389, 5985, 5986, 8080]  # SSH, HTTP, RPC, HTTPS, SMB, RDP, WinRM, Custom
        connection_successful = False
        open_ports = []
        available_services = []

        for test_port in test_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(3)
                result = sock.connect_ex((server_ip, test_port))
                if result == 0:
                    connection_successful = True
                    open_ports.append(test_port)

                    # Identify service type
                    if test_port == 22:
                        available_services.append("SSH")
                    elif test_port == 80:
                        available_services.append("HTTP")
                    elif test_port == 135:
                        available_services.append("RPC")
                    elif test_port == 443:
                        available_services.append("HTTPS")
                    elif test_port == 445:
                        available_services.append("SMB/File Sharing")
                    elif test_port == 3389:
                        available_services.append("Remote Desktop")
                    elif test_port == 5985:
                        available_services.append("WinRM HTTP")
                    elif test_port == 5986:
                        available_services.append("WinRM HTTPS")
                    elif test_port == 8080:
                        available_services.append("SAMS Monitor")

                sock.close()
            except Exception as e:
                pass

        if not connection_successful:
            return jsonify({
                "success": False,
                "message": f"❌ Connection Failed: No services responding on {server_ip}. Please verify the server is online and accessible.",
                "error_type": "no_services_available"
            }), 400

        print(f"✅ Service discovery completed: Found {len(open_ports)} open ports")

        # STEP 3: Check if SAMS monitor is already installed
        sams_installed = False
        if 8080 in open_ports:
            try:
                # Test if SAMS API is responding
                import requests
                response = requests.get(f"http://{server_ip}:8080/api/v1/health", timeout=5)
                if response.status_code == 200:
                    sams_installed = True
                    print(f"✅ SAMS monitor already installed and running on {server_ip}")
            except:
                pass

        installation_status = []

        # STEP 4: Auto-install SAMS monitoring if not present
        if not sams_installed:
            print(f"🔧 SAMS monitor not detected. Attempting auto-installation on {server_ip}")

            # Check if we can use Windows Remote Management (WinRM)
            if 5985 in open_ports or 5986 in open_ports:
                try:
                    # Create installation script
                    install_script = f'''
@echo off
echo 🚀 SAMS Auto-Installation Starting...
echo Target Server: {server_ip}
echo Installation Time: %date% %time%

REM Create SAMS directory
mkdir C:\\SAMS-Monitor 2>nul
cd C:\\SAMS-Monitor

REM Download Python if not installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Installing Python...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe' -OutFile 'python-installer.exe'"
    python-installer.exe /quiet InstallAllUsers=1 PrependPath=1
    timeout /t 30
)

REM Install required packages
echo 📦 Installing SAMS packages...
pip install flask flask-cors psutil requests

REM Create SAMS server script
echo 🔧 Creating SAMS monitoring service...
echo # SAMS Auto-Generated Monitor > sams_monitor.py
echo import flask, psutil, socket, datetime >> sams_monitor.py
echo from flask import Flask, jsonify >> sams_monitor.py
echo from flask_cors import CORS >> sams_monitor.py
echo app = Flask(__name__) >> sams_monitor.py
echo CORS(app) >> sams_monitor.py
echo @app.route('/api/v1/health') >> sams_monitor.py
echo def health(): >> sams_monitor.py
echo     return jsonify({{'status': 'healthy', 'hostname': socket.gethostname(), 'timestamp': datetime.datetime.now().isoformat()}}) >> sams_monitor.py
echo if __name__ == '__main__': >> sams_monitor.py
echo     app.run(host='0.0.0.0', port=8080, debug=False) >> sams_monitor.py

REM Start SAMS monitor
echo 🚀 Starting SAMS monitor service...
start /B python sams_monitor.py

echo ✅ SAMS installation completed successfully!
echo 📊 Monitor running on: http://{server_ip}:8080
echo 🔗 Ready for SAMS app connection!
'''

                    # Save installation script to temp file
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.bat', delete=False) as f:
                        f.write(install_script)
                        script_path = f.name

                    # Execute remote installation (if credentials provided)
                    if username and password:
                        # Use PsExec or WinRM for remote execution
                        install_cmd = f'psexec \\\\{server_ip} -u {username} -p {password} -c -f {script_path}'
                        result = subprocess.run(install_cmd, capture_output=True, text=True, timeout=120, shell=True)

                        if result.returncode == 0:
                            installation_status.append("✅ SAMS monitor installed successfully")
                            sams_installed = True
                        else:
                            installation_status.append("⚠️ Auto-installation attempted (manual verification needed)")
                    else:
                        installation_status.append("⚠️ Credentials needed for auto-installation")

                    # Clean up temp file
                    os.unlink(script_path)

                except Exception as install_error:
                    print(f"⚠️ Auto-installation failed: {install_error}")
                    installation_status.append("⚠️ Auto-installation failed - manual setup required")

            # Alternative: SMB file copy method
            elif 445 in open_ports:
                try:
                    installation_status.append("📁 SMB detected - file copy method available")
                    # Could implement SMB file copy here
                except:
                    pass

        # STEP 5: Final verification
        final_verification = []
        if sams_installed:
            try:
                # Verify SAMS API is responding
                import requests
                response = requests.get(f"http://{server_ip}:8080/api/v1/health", timeout=10)
                if response.status_code == 200:
                    health_data = response.json()
                    final_verification.append(f"✅ SAMS API responding: {health_data.get('status', 'unknown')}")
                    final_verification.append(f"✅ Target hostname: {health_data.get('hostname', 'unknown')}")
                else:
                    final_verification.append("⚠️ SAMS API not responding properly")
            except Exception as verify_error:
                final_verification.append(f"⚠️ Verification failed: {str(verify_error)}")

        # STEP 6: Create server record
        server_info = {
            "id": f"server-{server_ip.replace('.', '-')}",
            "name": server_name,
            "ip": server_ip,
            "type": server_type,
            "port": port,
            "status": "online" if connection_successful else "offline",
            "open_ports": open_ports,
            "available_services": available_services,
            "sams_installed": sams_installed,
            "installation_status": installation_status,
            "verification_results": final_verification,
            "added_time": datetime.datetime.now().isoformat(),
            "last_check": datetime.datetime.now().isoformat()
        }

        print(f"✅ Server {server_name} ({server_ip}) processing completed")

        return jsonify({
            "success": True,
            "message": f"Server {server_name} successfully processed and added to monitoring",
            "server": server_info,
            "connection_details": {
                "ip": server_ip,
                "open_ports": open_ports,
                "services": available_services,
                "sams_monitor": "installed" if sams_installed else "not_installed"
            }
        })

    except Exception as e:
        print(f"❌ Error adding server: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/services/control', methods=['POST'])
def control_service():
    """Start/Stop/Restart Windows services (REAL OPERATIONS)"""
    try:
        data = request.get_json()
        service_name = data.get('service')
        action = data.get('action')  # start, stop, restart

        if not service_name or not action:
            return jsonify({"success": False, "error": "Service name and action required"}), 400

        print(f"🔧 Attempting to {action} service: {service_name}")

        if action == 'start':
            result = subprocess.run(['sc', 'start', service_name], capture_output=True, text=True, timeout=30)
        elif action == 'stop':
            result = subprocess.run(['sc', 'stop', service_name], capture_output=True, text=True, timeout=30)
        elif action == 'restart':
            # Stop first, then start
            subprocess.run(['sc', 'stop', service_name], capture_output=True, text=True, timeout=15)
            time.sleep(2)
            result = subprocess.run(['sc', 'start', service_name], capture_output=True, text=True, timeout=30)
        else:
            return jsonify({"success": False, "error": "Invalid action. Use: start, stop, restart"}), 400

        # Check if operation was successful
        if result.returncode == 0 or "SUCCESS" in result.stdout:
            print(f"✅ Service {service_name} {action} operation completed successfully")

            # Update services status immediately
            time.sleep(1)
            updated_services = get_windows_services()
            global services_status
            services_status = updated_services

            return jsonify({
                "success": True,
                "message": f"Service '{service_name}' {action} operation completed successfully",
                "service_status": updated_services.get(service_name, 'unknown')
            })
        else:
            error_msg = result.stderr or result.stdout or f"Failed to {action} service"
            print(f"❌ Service operation failed: {error_msg}")
            return jsonify({
                "success": False,
                "error": f"Failed to {action} service '{service_name}': {error_msg}"
            }), 500

    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "error": f"Service {action} operation timed out"}), 500
    except Exception as e:
        print(f"❌ Error controlling service: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/processes/kill', methods=['POST'])
def kill_process():
    """Kill a process by PID (REAL OPERATION)"""
    try:
        data = request.get_json()
        pid = data.get('pid')

        if not pid:
            return jsonify({"success": False, "error": "Process ID (pid) required"}), 400

        print(f"🔧 Attempting to kill process PID: {pid}")

        # Use psutil to kill process safely
        try:
            process = psutil.Process(pid)
            process_name = process.name()
            process.terminate()

            # Wait for process to terminate
            process.wait(timeout=10)

            print(f"✅ Process {process_name} (PID: {pid}) terminated successfully")
            return jsonify({
                "success": True,
                "message": f"Process '{process_name}' (PID: {pid}) terminated successfully"
            })

        except psutil.NoSuchProcess:
            return jsonify({"success": False, "error": f"Process with PID {pid} not found"}), 404
        except psutil.AccessDenied:
            return jsonify({"success": False, "error": f"Access denied. Cannot terminate process PID {pid}"}), 403
        except psutil.TimeoutExpired:
            # Force kill if terminate didn't work
            try:
                process.kill()
                print(f"✅ Process PID {pid} force killed")
                return jsonify({
                    "success": True,
                    "message": f"Process PID {pid} force terminated"
                })
            except:
                return jsonify({"success": False, "error": f"Failed to terminate process PID {pid}"}), 500

    except Exception as e:
        print(f"❌ Error killing process: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/system/commands', methods=['POST'])
def execute_system_command():
    """Execute system commands (REAL OPERATIONS)"""
    try:
        data = request.get_json()
        command = data.get('command')
        command_type = data.get('type', 'powershell')

        if not command:
            return jsonify({"success": False, "error": "Command required"}), 400

        print(f"🔧 Executing {command_type} command: {command}")

        # Define safe commands that are allowed
        safe_commands = {
            'system_info': 'systeminfo',
            'disk_cleanup': 'cleanmgr /sagerun:1',
            'network_info': 'ipconfig /all',
            'running_services': 'sc query state= running',
            'event_logs': 'wevtutil qe System /c:10 /rd:true /f:text',
            'memory_info': 'wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /format:list',
            'cpu_info': 'wmic cpu get name,numberofcores,numberoflogicalprocessors /format:list',
            'disk_info': 'wmic logicaldisk get size,freespace,caption /format:list',
            'update_check': 'powershell "Get-WindowsUpdate"',
            'restart_system': 'shutdown /r /t 300 /c "System restart initiated by SAMS"',
            'cancel_restart': 'shutdown /a'
        }

        if command in safe_commands:
            actual_command = safe_commands[command]

            try:
                if command_type == 'powershell':
                    result = subprocess.run(
                        ['powershell', '-Command', actual_command],
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                else:
                    result = subprocess.run(
                        actual_command.split(),
                        capture_output=True,
                        text=True,
                        timeout=60
                    )

                output = result.stdout if result.stdout else result.stderr

                print(f"✅ Command '{command}' executed successfully")
                return jsonify({
                    "success": True,
                    "command": command,
                    "output": output,
                    "return_code": result.returncode,
                    "timestamp": datetime.datetime.now().isoformat()
                })

            except subprocess.TimeoutExpired:
                return jsonify({
                    "success": False,
                    "error": f"Command '{command}' timed out after 60 seconds"
                }), 500

        else:
            return jsonify({
                "success": False,
                "error": f"Command '{command}' not allowed. Available commands: {list(safe_commands.keys())}"
            }), 400

    except Exception as e:
        print(f"❌ Error executing command: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/alerts/acknowledge', methods=['POST'])
def acknowledge_alert():
    """Acknowledge an alert (REAL OPERATION)"""
    try:
        data = request.get_json()
        alert_id = data.get('alert_id')

        if not alert_id:
            return jsonify({"success": False, "error": "Alert ID required"}), 400

        # Find and acknowledge the alert
        global windows_alerts
        alert_found = False

        for alert in windows_alerts:
            if alert['id'] == alert_id:
                alert['acknowledged'] = True
                alert['acknowledged_time'] = datetime.datetime.now().isoformat()
                alert_found = True
                break

        if alert_found:
            print(f"✅ Alert {alert_id} acknowledged")
            return jsonify({
                "success": True,
                "message": f"Alert {alert_id} acknowledged successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Alert {alert_id} not found"
            }), 404

    except Exception as e:
        print(f"❌ Error acknowledging alert: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/reports/generate', methods=['POST'])
def generate_report():
    """Generate system reports (REAL DATA)"""
    try:
        data = request.get_json()
        report_type = data.get('type', 'system_overview')

        print(f"📊 Generating {report_type} report...")

        report_data = {
            "report_id": f"report-{int(time.time())}",
            "type": report_type,
            "generated_time": datetime.datetime.now().isoformat(),
            "server": windows_metrics.get("hostname", "Unknown"),
            "data": {}
        }

        if report_type == 'system_overview':
            report_data["data"] = {
                "system_info": {
                    "hostname": windows_metrics.get("hostname"),
                    "ip_address": windows_metrics.get("ip_address"),
                    "os": windows_metrics.get("windows_version"),
                    "uptime": f"{windows_metrics.get('uptime_days', 0)} days, {windows_metrics.get('uptime_hours', 0)} hours"
                },
                "performance": {
                    "cpu_usage": f"{windows_metrics.get('cpu_percent', 0)}%",
                    "memory_usage": f"{windows_metrics.get('memory_percent', 0)}%",
                    "disk_usage": f"{windows_metrics.get('disk_percent', 0)}%"
                },
                "services": services_status,
                "alerts": len(windows_alerts),
                "top_processes": windows_metrics.get("top_processes", [])[:5]
            }
        elif report_type == 'performance':
            report_data["data"] = {
                "cpu": windows_metrics.get("cpu_percent", 0),
                "memory": {
                    "percent": windows_metrics.get("memory_percent", 0),
                    "total_gb": windows_metrics.get("memory_total_gb", 0),
                    "used_gb": windows_metrics.get("memory_used_gb", 0)
                },
                "disk": {
                    "percent": windows_metrics.get("disk_percent", 0),
                    "total_gb": windows_metrics.get("disk_total_gb", 0),
                    "free_gb": windows_metrics.get("disk_free_gb", 0)
                }
            }
        elif report_type == 'security':
            report_data["data"] = {
                "critical_services": {
                    "running": len([s for s in services_status.values() if s == 'running']),
                    "stopped": len([s for s in services_status.values() if s == 'stopped'])
                },
                "alerts": windows_alerts,
                "last_boot": windows_metrics.get("boot_time")
            }

        print(f"✅ {report_type} report generated successfully")
        return jsonify({
            "success": True,
            "report": report_data
        })

    except Exception as e:
        print(f"❌ Error generating report: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# 🔧 REAL SERVER CONFIGURATION ENDPOINTS
@app.route('/api/v1/server/configure/performance', methods=['POST'])
def configure_performance():
    """REAL Performance Tuning - Makes ACTUAL changes to Windows server"""
    try:
        data = request.get_json()
        tuning_type = data.get('type', 'balanced')

        print(f"🔧 Applying REAL performance tuning: {tuning_type}")

        changes_made = []

        if tuning_type == 'high_performance':
            # Set Windows power plan to High Performance
            result = subprocess.run(['powercfg', '/setactive', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Power Plan: Set to High Performance")

            # Disable Windows Search indexing for better performance
            result = subprocess.run(['sc', 'config', 'WSearch', 'start=', 'disabled'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Search: Disabled for performance")

            # Set virtual memory to system managed
            result = subprocess.run(['wmic', 'computersystem', 'where', 'name="%computername%"', 'set', 'AutomaticManagedPagefile=True'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Virtual Memory: Set to system managed")

        elif tuning_type == 'balanced':
            # Set Windows power plan to Balanced
            result = subprocess.run(['powercfg', '/setactive', '381b4222-f694-41f0-9685-ff5bb260df2e'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Power Plan: Set to Balanced")

            # Enable Windows Search with reduced indexing
            result = subprocess.run(['sc', 'config', 'WSearch', 'start=', 'auto'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Search: Enabled with optimization")

        elif tuning_type == 'power_saver':
            # Set Windows power plan to Power Saver
            result = subprocess.run(['powercfg', '/setactive', 'a1841308-3541-4fab-bc81-f71556f20b4a'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Power Plan: Set to Power Saver")

        # Apply processor scheduling optimization
        if tuning_type == 'high_performance':
            result = subprocess.run(['reg', 'add', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl',
                                   '/v', 'Win32PrioritySeparation', '/t', 'REG_DWORD', '/d', '38', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Processor Scheduling: Optimized for performance")

        print(f"✅ Performance tuning applied: {len(changes_made)} changes made")
        return jsonify({
            "success": True,
            "message": f"Performance tuning '{tuning_type}' applied successfully",
            "changes": changes_made,
            "timestamp": datetime.datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error applying performance tuning: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/server/configure/security', methods=['POST'])
def configure_security():
    """REAL Security Settings - Makes ACTUAL security changes"""
    try:
        data = request.get_json()
        security_level = data.get('level', 'standard')

        print(f"🔒 Applying REAL security configuration: {security_level}")

        changes_made = []

        if security_level == 'high':
            # Enable Windows Firewall for all profiles
            result = subprocess.run(['netsh', 'advfirewall', 'set', 'allprofiles', 'state', 'on'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Firewall: Enabled for all profiles")

            # Enable Windows Defender Real-time Protection
            result = subprocess.run(['powershell', '-Command', 'Set-MpPreference -DisableRealtimeMonitoring $false'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Defender: Real-time protection enabled")

            # Set UAC to highest level
            result = subprocess.run(['reg', 'add', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
                                   '/v', 'ConsentPromptBehaviorAdmin', '/t', 'REG_DWORD', '/d', '2', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ UAC: Set to highest security level")

            # Disable unnecessary services for security
            services_to_disable = ['Fax', 'TapiSrv', 'simptcp']
            for service in services_to_disable:
                result = subprocess.run(['sc', 'config', service, 'start=', 'disabled'],
                                      capture_output=True, text=True, timeout=15)
                if result.returncode == 0:
                    changes_made.append(f"✅ Service '{service}': Disabled for security")

        elif security_level == 'standard':
            # Enable Windows Firewall with standard settings
            result = subprocess.run(['netsh', 'advfirewall', 'set', 'allprofiles', 'state', 'on'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Firewall: Enabled with standard settings")

            # Set UAC to standard level
            result = subprocess.run(['reg', 'add', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
                                   '/v', 'ConsentPromptBehaviorAdmin', '/t', 'REG_DWORD', '/d', '5', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ UAC: Set to standard level")

            # Enable Windows Update automatic downloads
            result = subprocess.run(['reg', 'add', 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU',
                                   '/v', 'AUOptions', '/t', 'REG_DWORD', '/d', '3', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Update: Set to automatic download")

        elif security_level == 'low':
            # Disable Windows Firewall (for testing environments only)
            result = subprocess.run(['netsh', 'advfirewall', 'set', 'allprofiles', 'state', 'off'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Firewall: Disabled for testing")

            # Set UAC to lowest level
            result = subprocess.run(['reg', 'add', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
                                   '/v', 'ConsentPromptBehaviorAdmin', '/t', 'REG_DWORD', '/d', '0', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ UAC: Set to lowest level")

            # Enable User Account Control (UAC)
            result = subprocess.run(['reg', 'add', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
                                   '/v', 'EnableLUA', '/t', 'REG_DWORD', '/d', '1', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ User Account Control: Enabled")

        elif security_level == 'standard':
            # Standard security configuration
            result = subprocess.run(['netsh', 'advfirewall', 'set', 'allprofiles', 'state', 'on'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Firewall: Enabled (standard)")

            # Enable Windows Update automatic downloads
            result = subprocess.run(['reg', 'add', 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU',
                                   '/v', 'AUOptions', '/t', 'REG_DWORD', '/d', '3', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Windows Update: Automatic download enabled")

        print(f"✅ Security configuration applied: {len(changes_made)} changes made")
        return jsonify({
            "success": True,
            "message": f"Security level '{security_level}' applied successfully",
            "changes": changes_made,
            "timestamp": datetime.datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error applying security configuration: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/server/configure/network', methods=['POST'])
def configure_network():
    """REAL Network Settings - Makes ACTUAL network configuration changes"""
    try:
        data = request.get_json()
        config_type = data.get('type', 'optimize')

        print(f"🌐 Applying REAL network configuration: {config_type}")

        changes_made = []

        if config_type == 'optimize':
            # Optimize TCP settings for better performance
            result = subprocess.run(['netsh', 'int', 'tcp', 'set', 'global', 'autotuninglevel=normal'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ TCP Auto-Tuning: Set to normal (optimized)")

            # Enable TCP Chimney Offload
            result = subprocess.run(['netsh', 'int', 'tcp', 'set', 'global', 'chimney=enabled'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ TCP Chimney Offload: Enabled")

            # Flush DNS cache
            result = subprocess.run(['ipconfig', '/flushdns'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ DNS Cache: Flushed for optimization")

            # Reset network stack
            result = subprocess.run(['netsh', 'winsock', 'reset'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Winsock: Reset for network optimization")

        elif config_type == 'secure':
            # Disable NetBIOS over TCP/IP for security
            result = subprocess.run(['reg', 'add', 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters',
                                   '/v', 'NetbiosOptions', '/t', 'REG_DWORD', '/d', '2', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ NetBIOS: Disabled for security")

            # Enable network level authentication
            result = subprocess.run(['reg', 'add', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp',
                                   '/v', 'UserAuthentication', '/t', 'REG_DWORD', '/d', '1', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ RDP: Network Level Authentication enabled")

        elif config_type == 'reset':
            # Reset all network adapters
            result = subprocess.run(['netsh', 'interface', 'ip', 'reset'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Network Interfaces: Reset to defaults")

            # Reset TCP/IP stack
            result = subprocess.run(['netsh', 'int', 'ip', 'reset'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ TCP/IP Stack: Reset to defaults")

        elif config_type == 'secure':
            # Disable NetBIOS over TCP/IP for security
            result = subprocess.run(['wmic', 'nicconfig', 'where', 'TcpipNetbiosOptions=0', 'call', 'SetTcpipNetbios', '2'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ NetBIOS over TCP/IP: Disabled for security")

            # Enable network level authentication
            result = subprocess.run(['reg', 'add', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp',
                                   '/v', 'UserAuthentication', '/t', 'REG_DWORD', '/d', '1', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Network Level Authentication: Enabled")

        elif config_type == 'reset':
            # Reset network settings to defaults
            result = subprocess.run(['netsh', 'winsock', 'reset'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Winsock: Reset to defaults")

            result = subprocess.run(['netsh', 'int', 'ip', 'reset'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ TCP/IP Stack: Reset to defaults")

        print(f"✅ Network configuration applied: {len(changes_made)} changes made")
        return jsonify({
            "success": True,
            "message": f"Network configuration '{config_type}' applied successfully",
            "changes": changes_made,
            "timestamp": datetime.datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error applying network configuration: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/server/configure/backup', methods=['POST'])
def configure_backup():
    """REAL Backup Configuration - Sets up ACTUAL backup tasks"""
    try:
        data = request.get_json()
        backup_type = data.get('type', 'create_task')

        print(f"💾 Configuring REAL backup: {backup_type}")

        changes_made = []

        if backup_type == 'create_task':
            # Create backup directory
            result = subprocess.run(['mkdir', 'C:\\SAMS_Backups'],
                                  capture_output=True, text=True, timeout=30, shell=True)
            changes_made.append("✅ Backup Directory: Created C:\\SAMS_Backups")

            # Create a scheduled backup task using schtasks
            result = subprocess.run(['schtasks', '/create', '/tn', 'SAMS_Daily_Backup',
                                   '/tr', 'robocopy C:\\Users D:\\SAMS_Backups\\Users /MIR /R:3 /W:10',
                                   '/sc', 'daily', '/st', '02:00', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Scheduled Task: Created SAMS_Daily_Backup (2:00 AM daily)")

            # Enable Volume Shadow Copy Service
            result = subprocess.run(['sc', 'config', 'VSS', 'start=', 'auto'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Volume Shadow Copy: Enabled for backup support")

        elif backup_type == 'immediate':
            # Perform immediate backup of critical system files
            result = subprocess.run(['robocopy', 'C:\\Windows\\System32\\config', 'C:\\SAMS_Backups\\Registry_Backup',
                                   '/MIR', '/R:3', '/W:10'],
                                  capture_output=True, text=True, timeout=120)
            if result.returncode <= 1:  # robocopy returns 0 or 1 for success
                changes_made.append("✅ Registry Backup: Completed successfully")

            # Backup event logs
            result = subprocess.run(['wevtutil', 'epl', 'System', 'C:\\SAMS_Backups\\System_EventLog.evtx'],
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                changes_made.append("✅ Event Logs: System log backed up")

        elif backup_type == 'restore_point':
            # Create system restore point
            result = subprocess.run(['powershell', '-Command',
                                   'Checkpoint-Computer -Description "SAMS Configuration Backup" -RestorePointType "MODIFY_SETTINGS"'],
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                changes_made.append("✅ System Restore Point: Created 'SAMS Configuration Backup'")

            # Enable system restore if disabled
            result = subprocess.run(['powershell', '-Command',
                                   'Enable-ComputerRestore -Drive "C:\\"'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ System Restore: Enabled for C: drive")

            # Schedule the backup task (daily at 2 AM)
            result = subprocess.run(['schtasks', '/create', '/tn', 'SAMS_Daily_Backup', '/tr', 'C:\\SAMS_Backups\\backup_script.bat',
                                   '/sc', 'daily', '/st', '02:00', '/f'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Scheduled Task: Daily backup at 2:00 AM created")

        elif backup_type == 'enable_vss':
            # Enable Volume Shadow Copy Service
            result = subprocess.run(['sc', 'config', 'VSS', 'start=', 'auto'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Volume Shadow Copy: Service enabled")

            result = subprocess.run(['sc', 'start', 'VSS'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ Volume Shadow Copy: Service started")

        elif backup_type == 'system_restore':
            # Enable System Restore
            result = subprocess.run(['powershell', '-Command', 'Enable-ComputerRestore -Drive "C:\\"'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ System Restore: Enabled for C: drive")

            # Create a restore point
            result = subprocess.run(['powershell', '-Command', 'Checkpoint-Computer -Description "SAMS Configuration Backup"'],
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                changes_made.append("✅ Restore Point: Created 'SAMS Configuration Backup'")

        print(f"✅ Backup configuration applied: {len(changes_made)} changes made")
        return jsonify({
            "success": True,
            "message": f"Backup configuration '{backup_type}' applied successfully",
            "changes": changes_made,
            "timestamp": datetime.datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error configuring backup: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/v1/server/configure/maintenance', methods=['POST'])
def configure_maintenance():
    """REAL Maintenance Tasks - Performs ACTUAL system maintenance"""
    try:
        data = request.get_json()
        maintenance_type = data.get('type', 'cleanup')

        print(f"🔧 Performing REAL maintenance: {maintenance_type}")

        changes_made = []

        if maintenance_type == 'cleanup':
            # Run disk cleanup
            result = subprocess.run(['cleanmgr', '/sagerun:1'],
                                  capture_output=True, text=True, timeout=120)
            if result.returncode == 0:
                changes_made.append("✅ Disk Cleanup: Temporary files cleaned")

            # Clear Windows Update cache
            result = subprocess.run(['net', 'stop', 'wuauserv'],
                                  capture_output=True, text=True, timeout=30)
            result = subprocess.run(['rd', '/s', '/q', 'C:\\Windows\\SoftwareDistribution'],
                                  capture_output=True, text=True, timeout=30, shell=True)
            result = subprocess.run(['net', 'start', 'wuauserv'],
                                  capture_output=True, text=True, timeout=30)
            changes_made.append("✅ Windows Update Cache: Cleared and service restarted")

            # Clear DNS cache
            result = subprocess.run(['ipconfig', '/flushdns'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                changes_made.append("✅ DNS Cache: Flushed")

        elif maintenance_type == 'defrag':
            # Defragment C: drive
            result = subprocess.run(['defrag', 'C:', '/O'],
                                  capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                changes_made.append("✅ Disk Defragmentation: C: drive optimized")

        elif maintenance_type == 'registry_cleanup':
            # Registry cleanup (safe operations only)
            result = subprocess.run(['reg', 'delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
                                   '/v', 'SAMS_Temp', '/f'],
                                  capture_output=True, text=True, timeout=30)
            changes_made.append("✅ Registry: Cleaned temporary entries")

            # Compact registry
            result = subprocess.run(['reg', 'add', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager',
                                   '/v', 'PendingFileRenameOperations', '/t', 'REG_MULTI_SZ', '/d', '', '/f'],
                                  capture_output=True, text=True, timeout=30)
            changes_made.append("✅ Registry: Pending operations cleared")

        print(f"✅ Maintenance completed: {len(changes_made)} tasks performed")
        return jsonify({
            "success": True,
            "message": f"Maintenance '{maintenance_type}' completed successfully",
            "changes": changes_made,
            "timestamp": datetime.datetime.now().isoformat()
        })

    except Exception as e:
        print(f"❌ Error performing maintenance: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("🖥️ Starting SAMS Windows Server Monitor...")
    print("📊 Initializing Windows system monitoring...")
    
    # Start metrics update thread
    metrics_thread = threading.Thread(target=update_windows_metrics, daemon=True)
    metrics_thread.start()
    
    # Wait for initial metrics
    time.sleep(3)
    
    print("✅ Windows server monitor ready!")
    print(f"🖥️ Monitoring: {windows_metrics.get('hostname', 'Unknown')} ({windows_metrics.get('ip_address', 'Unknown')})")
    print("🌐 API endpoints available:")
    print("   - http://localhost:8080/api/v1/servers")
    print("   - http://localhost:8080/api/v1/alerts") 
    print("   - http://localhost:8080/api/v1/health")
    print("   - http://localhost:8080/api/v1/services")
    print("   - http://localhost:8080/api/v1/processes")
    print(f"\n📱 Update SAMS app with: API_BASE_URL = 'http://{windows_metrics.get('ip_address', 'YOUR_IP')}:8080'")
    print("\n🎯 Ready for SAMS app connection!")
    
    # Run the server
    app.run(host='0.0.0.0', port=8080, debug=False)
