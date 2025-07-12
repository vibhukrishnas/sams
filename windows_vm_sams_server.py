#!/usr/bin/env python3
"""
🖥️ SAMS Windows Server Monitor (VirtualBox VM Demo)
Professional Windows server monitoring for client demonstrations
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
import os
import wmi

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Global variables for Windows metrics
windows_metrics = {}
windows_alerts = []
services_status = {}
wmi_connection = None

def initialize_wmi():
    """Initialize WMI connection for Windows monitoring"""
    global wmi_connection
    try:
        wmi_connection = wmi.WMI()
        print("✅ WMI connection established")
    except Exception as e:
        print(f"❌ WMI connection failed: {e}")
        wmi_connection = None

def get_windows_services():
    """Get Windows services status"""
    try:
        # Critical Windows services to monitor
        critical_services = [
            'Spooler',          # Print Spooler
            'Themes',           # Themes
            'AudioSrv',         # Windows Audio
            'BITS',             # Background Intelligent Transfer
            'EventLog',         # Windows Event Log
            'PlugPlay',         # Plug and Play
            'RpcSs',            # Remote Procedure Call
            'Schedule',         # Task Scheduler
            'W32Time',          # Windows Time
            'Winmgmt',          # Windows Management Instrumentation
            'wuauserv',         # Windows Update
            'LanmanServer',     # Server (file sharing)
            'LanmanWorkstation', # Workstation
            'Dhcp',             # DHCP Client
            'Dnscache',         # DNS Client
        ]
        
        services = {}
        
        if wmi_connection:
            # Use WMI for detailed service information
            for service in wmi_connection.Win32_Service():
                if service.Name in critical_services:
                    services[service.Name] = {
                        'name': service.Name,
                        'status': 'running' if service.State == 'Running' else 'stopped',
                        'display_name': service.DisplayName,
                        'start_mode': service.StartMode
                    }
        else:
            # Fallback to subprocess
            for service_name in critical_services:
                try:
                    result = subprocess.run(
                        ['sc', 'query', service_name],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    
                    if 'RUNNING' in result.stdout:
                        status = 'running'
                    elif 'STOPPED' in result.stdout:
                        status = 'stopped'
                    else:
                        status = 'unknown'
                    
                    services[service_name] = {
                        'name': service_name,
                        'status': status,
                        'display_name': service_name.replace('Srv', ' Service')
                    }
                    
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    services[service_name] = {
                        'name': service_name,
                        'status': 'unknown',
                        'display_name': service_name
                    }
        
        return services
        
    except Exception as e:
        print(f"Error getting Windows services: {e}")
        return {}

def get_system_metrics():
    """Get comprehensive Windows system metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('C:')
        disk_io = psutil.disk_io_counters()
        
        # Network metrics
        network = psutil.net_io_counters()
        
        # System info
        boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.datetime.now() - boot_time
        
        # Windows-specific info
        windows_version = platform.platform()
        
        # Top processes
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage and get top 10
        top_processes = sorted(processes, key=lambda x: x['cpu_percent'] or 0, reverse=True)[:10]
        
        # Get Windows event logs count (simplified)
        event_logs = {'system': 0, 'application': 0, 'security': 0}
        try:
            if wmi_connection:
                system_events = len(list(wmi_connection.Win32_NTLogEvent(LogFile='System')))
                event_logs['system'] = min(system_events, 1000)  # Limit for demo
        except:
            event_logs['system'] = 156  # Demo value
        
        metrics = {
            'timestamp': datetime.datetime.now().isoformat(),
            'cpu': {
                'usage_percent': cpu_percent,
                'count': cpu_count,
                'frequency': cpu_freq.current if cpu_freq else 0
            },
            'memory': {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'percent': memory.percent
            },
            'swap': {
                'total': swap.total,
                'used': swap.used,
                'percent': swap.percent
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': disk.percent
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            },
            'system': {
                'boot_time': boot_time.isoformat(),
                'uptime_seconds': uptime.total_seconds(),
                'platform': windows_version,
                'hostname': socket.gethostname(),
                'os_version': platform.version()
            },
            'processes': top_processes,
            'event_logs': event_logs
        }
        
        return metrics
        
    except Exception as e:
        print(f"Error getting system metrics: {e}")
        return {}

def generate_alerts():
    """Generate alerts based on Windows system metrics"""
    global windows_alerts
    
    try:
        metrics = get_system_metrics()
        alerts = []
        
        # CPU alerts
        if metrics.get('cpu', {}).get('usage_percent', 0) > 80:
            alerts.append({
                'id': f'cpu_high_{int(time.time())}',
                'title': 'High CPU Usage',
                'message': f"CPU usage is {metrics['cpu']['usage_percent']:.1f}%",
                'severity': 'Critical' if metrics['cpu']['usage_percent'] > 90 else 'Warning',
                'status': 'Active',
                'timestamp': datetime.datetime.now().isoformat(),
                'server': socket.gethostname(),
                'type': 'performance'
            })
        
        # Memory alerts
        if metrics.get('memory', {}).get('percent', 0) > 85:
            alerts.append({
                'id': f'memory_high_{int(time.time())}',
                'title': 'High Memory Usage',
                'message': f"Memory usage is {metrics['memory']['percent']:.1f}%",
                'severity': 'Critical' if metrics['memory']['percent'] > 95 else 'Warning',
                'status': 'Active',
                'timestamp': datetime.datetime.now().isoformat(),
                'server': socket.gethostname(),
                'type': 'performance'
            })
        
        # Disk alerts
        if metrics.get('disk', {}).get('percent', 0) > 90:
            alerts.append({
                'id': f'disk_high_{int(time.time())}',
                'title': 'Low Disk Space',
                'message': f"C: drive usage is {metrics['disk']['percent']:.1f}%",
                'severity': 'Critical' if metrics['disk']['percent'] > 95 else 'Warning',
                'status': 'Active',
                'timestamp': datetime.datetime.now().isoformat(),
                'server': socket.gethostname(),
                'type': 'storage'
            })
        
        # Service alerts
        services = get_windows_services()
        critical_services = ['EventLog', 'RpcSs', 'Winmgmt']
        for service_name, service_info in services.items():
            if service_info['status'] == 'stopped' and service_name in critical_services:
                alerts.append({
                    'id': f'service_{service_name}_{int(time.time())}',
                    'title': f'Service Down: {service_info["display_name"]}',
                    'message': f'{service_info["display_name"]} service is not running',
                    'severity': 'Critical',
                    'status': 'Active',
                    'timestamp': datetime.datetime.now().isoformat(),
                    'server': socket.gethostname(),
                    'type': 'service'
                })
        
        windows_alerts = alerts
        
    except Exception as e:
        print(f"Error generating alerts: {e}")

def update_metrics():
    """Background thread to update metrics"""
    global windows_metrics, services_status
    
    while True:
        try:
            windows_metrics = get_system_metrics()
            services_status = get_windows_services()
            generate_alerts()
            time.sleep(30)  # Update every 30 seconds
        except Exception as e:
            print(f"Error in metrics update: {e}")
            time.sleep(60)

# API Routes
@app.route('/')
def home():
    return "🖥️ SAMS Windows Server Monitor (VirtualBox VM Demo) - Ready for Client Demo!"

@app.route('/api/v1/servers')
def get_servers():
    """Get server information"""
    try:
        hostname = socket.gethostname()
        
        # Try to get VM IP address
        try:
            # Get all network interfaces
            for interface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                        ip_address = addr.address
                        break
            else:
                ip_address = socket.gethostbyname(hostname)
        except:
            ip_address = '10.0.2.15'  # Default VirtualBox NAT IP
        
        server_data = {
            'id': 'windows-vm-001',
            'name': f'{hostname} (Windows VM Demo)',
            'ip': ip_address,
            'status': 'online',
            'cpu': windows_metrics.get('cpu', {}).get('usage_percent', 0),
            'memory': windows_metrics.get('memory', {}).get('percent', 0),
            'disk': windows_metrics.get('disk', {}).get('percent', 0),
            'uptime': f"{windows_metrics.get('system', {}).get('uptime_seconds', 0) / 3600:.1f} hours",
            'lastCheck': 'Just now',
            'alerts': len(windows_alerts),
            'services': list(services_status.keys()),
            'location': 'VirtualBox Windows VM',
            'os': windows_metrics.get('system', {}).get('platform', 'Windows Server'),
            'type': 'windows_server',
            'demo_mode': True
        }
        
        return jsonify({
            'success': True,
            'data': [server_data]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/v1/alerts')
def get_alerts():
    """Get current alerts"""
    try:
        return jsonify({
            'success': True,
            'data': windows_alerts
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/v1/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.now().isoformat(),
        'server': 'SAMS Windows Monitor (VirtualBox VM)',
        'demo_mode': True
    })

@app.route('/api/v1/services')
def get_services():
    """Get Windows services status"""
    try:
        return jsonify({
            'success': True,
            'data': services_status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/v1/processes')
def get_processes():
    """Get running processes"""
    try:
        processes = windows_metrics.get('processes', [])
        return jsonify({
            'success': True,
            'data': processes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("="*70)
    print("🖥️  SAMS Windows Server Monitor (VirtualBox VM Demo)")
    print("="*70)
    print("🚀 Professional Windows server monitoring for client demos!")
    print("📊 Monitoring Windows system metrics...")
    print("🌐 Starting API server...")
    
    # Initialize WMI
    initialize_wmi()
    
    # Get IP address
    try:
        hostname = socket.gethostname()
        # Try to get actual VM IP
        for interface, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                    ip_address = addr.address
                    break
        else:
            ip_address = socket.gethostbyname(hostname)
        
        print(f"📍 Windows VM IP Address: {ip_address}")
        print(f"🔧 Update SAMS app with: API_BASE_URL = 'http://{ip_address}:8080'")
    except:
        print("📍 Windows VM IP Address: 10.0.2.15 (default)")
        print("🔧 Update SAMS app with: API_BASE_URL = 'http://10.0.2.15:8080'")
    
    print("="*70)
    print("🎯 Ready for professional client demo!")
    print("⏹️  Press Ctrl+C to stop")
    print("="*70)
    
    # Start metrics update thread
    metrics_thread = threading.Thread(target=update_metrics, daemon=True)
    metrics_thread.start()
    
    # Start Flask server
    app.run(host='0.0.0.0', port=8080, debug=False)
