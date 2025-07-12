#!/usr/bin/env python3
"""
🖥️ SAMS Linux Server Monitor (VirtualBox Demo)
API server for Linux system monitoring - Perfect for client demos
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

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Global variables for Linux metrics
linux_metrics = {}
linux_alerts = []
services_status = {}

def get_linux_services():
    """Get Linux services status"""
    try:
        # Common Linux services to monitor
        critical_services = [
            'ssh',          # SSH daemon
            'cron',         # Cron daemon
            'rsyslog',      # System logging
            'networkd',     # Network management
            'systemd',      # System manager
            'dbus',         # D-Bus system
            'ufw',          # Firewall
            'apache2',      # Web server (if installed)
            'nginx',        # Web server (if installed)
            'mysql',        # Database (if installed)
            'postgresql',   # Database (if installed)
        ]
        
        services = {}
        for service in critical_services:
            try:
                # Check service status using systemctl
                result = subprocess.run(
                    ['systemctl', 'is-active', service],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                if result.returncode == 0:
                    services[service] = {
                        'name': service,
                        'status': 'running',
                        'display_name': service.title()
                    }
                else:
                    services[service] = {
                        'name': service,
                        'status': 'stopped',
                        'display_name': service.title()
                    }
                    
            except (subprocess.TimeoutExpired, FileNotFoundError):
                services[service] = {
                    'name': service,
                    'status': 'unknown',
                    'display_name': service.title()
                }
                
        return services
        
    except Exception as e:
        print(f"Error getting Linux services: {e}")
        return {}

def get_system_metrics():
    """Get comprehensive system metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
        # Network metrics
        network = psutil.net_io_counters()
        
        # System info
        boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.datetime.now() - boot_time
        
        # Top processes
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage and get top 10
        top_processes = sorted(processes, key=lambda x: x['cpu_percent'] or 0, reverse=True)[:10]
        
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
                'platform': platform.platform(),
                'hostname': socket.gethostname()
            },
            'processes': top_processes
        }
        
        return metrics
        
    except Exception as e:
        print(f"Error getting system metrics: {e}")
        return {}

def generate_alerts():
    """Generate alerts based on system metrics"""
    global linux_alerts
    
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
                'message': f"Disk usage is {metrics['disk']['percent']:.1f}%",
                'severity': 'Critical' if metrics['disk']['percent'] > 95 else 'Warning',
                'status': 'Active',
                'timestamp': datetime.datetime.now().isoformat(),
                'server': socket.gethostname(),
                'type': 'storage'
            })
        
        # Service alerts
        services = get_linux_services()
        for service_name, service_info in services.items():
            if service_info['status'] == 'stopped' and service_name in ['ssh', 'cron', 'rsyslog']:
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
        
        linux_alerts = alerts
        
    except Exception as e:
        print(f"Error generating alerts: {e}")

def update_metrics():
    """Background thread to update metrics"""
    global linux_metrics, services_status
    
    while True:
        try:
            linux_metrics = get_system_metrics()
            services_status = get_linux_services()
            generate_alerts()
            time.sleep(30)  # Update every 30 seconds
        except Exception as e:
            print(f"Error in metrics update: {e}")
            time.sleep(60)

# API Routes
@app.route('/')
def home():
    return "🖥️ SAMS Linux Server Monitor (VirtualBox Demo) - Ready for Client Demo!"

@app.route('/api/v1/servers')
def get_servers():
    """Get server information"""
    try:
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        
        server_data = {
            'id': 'vm-server-001',
            'name': f'{hostname} (VirtualBox Demo)',
            'ip': ip_address,
            'status': 'online',
            'cpu': linux_metrics.get('cpu', {}).get('usage_percent', 0),
            'memory': linux_metrics.get('memory', {}).get('percent', 0),
            'disk': linux_metrics.get('disk', {}).get('percent', 0),
            'uptime': f"{linux_metrics.get('system', {}).get('uptime_seconds', 0) / 3600:.1f} hours",
            'lastCheck': 'Just now',
            'alerts': len(linux_alerts),
            'services': list(services_status.keys()),
            'location': 'VirtualBox VM',
            'os': linux_metrics.get('system', {}).get('platform', 'Linux'),
            'type': 'virtual_machine',
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
            'data': linux_alerts
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
        'server': 'SAMS Linux Monitor (VirtualBox)',
        'demo_mode': True
    })

@app.route('/api/v1/services')
def get_services():
    """Get services status"""
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
        processes = linux_metrics.get('processes', [])
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
    print("="*60)
    print("🖥️  SAMS Linux Server Monitor (VirtualBox Demo)")
    print("="*60)
    print("🚀 Perfect for client demonstrations!")
    print("📊 Monitoring Linux system metrics...")
    print("🌐 Starting API server...")
    
    # Get IP address
    try:
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        print(f"📍 VM IP Address: {ip_address}")
        print(f"🔧 Update SAMS app with: API_BASE_URL = 'http://{ip_address}:8080'")
    except:
        print("📍 VM IP Address: localhost")
        print("🔧 Update SAMS app with: API_BASE_URL = 'http://localhost:8080'")
    
    print("="*60)
    print("🎯 Ready for client demo!")
    print("⏹️  Press Ctrl+C to stop")
    print("="*60)
    
    # Start metrics update thread
    metrics_thread = threading.Thread(target=update_metrics, daemon=True)
    metrics_thread.start()
    
    # Start Flask server
    app.run(host='0.0.0.0', port=8080, debug=False)
