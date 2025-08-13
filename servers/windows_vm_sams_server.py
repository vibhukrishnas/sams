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

import logging
import wmi


app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Global variables for Windows metrics
windows_metrics = {}
dashboard_data = {
    'alerts': [],
    'logs': [],
    'services': {},
    'performance': {},
    'events': []
}
wmi_connection = None

def initialize_wmi():
    """Initialize WMI connection for Windows monitoring"""
    global wmi_connection
    try:
        wmi_connection = wmi.WMI()
        logger.info("✅ WMI connection established")
    except wmi.x_wmi as e:
        logger.error(f"WMI connection failed: {e}", exc_info=True)
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

def generate_dashboard_data():
    """Generate unified dashboard data including alerts, logs, and performance metrics"""
    global dashboard_data
    
    try:
        metrics = get_system_metrics()
        current_time = datetime.datetime.now().isoformat()
        
        # Generate alerts
        alerts = []
        logs = []
        
        # CPU alerts and logs
        cpu_usage = metrics.get('cpu', {}).get('usage_percent', 0)
        if cpu_usage > 80:
            alert = {
                'id': f'cpu_high_{int(time.time())}',
                'title': 'High CPU Usage',
                'message': f"CPU usage is {cpu_usage:.1f}%",
                'severity': 'Critical' if cpu_usage > 90 else 'Warning',
                'status': 'Active',
                'timestamp': current_time,
                'server': socket.gethostname(),
                'type': 'performance',
                'category': 'system'
            }
            alerts.append(alert)
            
            # Add corresponding log entry
            logs.append({
                'id': f'log_cpu_{int(time.time())}',
                'timestamp': current_time,
                'level': 'ERROR' if cpu_usage > 90 else 'WARNING',
                'source': 'System Monitor',
                'message': f'High CPU usage detected: {cpu_usage:.1f}% on {socket.gethostname()}',
                'category': 'performance',
                'details': {
                    'cpu_percent': cpu_usage,
                    'cpu_count': metrics.get('cpu', {}).get('count', 0),
                    'processes': metrics.get('processes', [])[:5]  # Top 5 processes
                }
            })
        
        # Memory alerts and logs
        memory_usage = metrics.get('memory', {}).get('percent', 0)
        if memory_usage > 85:
            alert = {
                'id': f'memory_high_{int(time.time())}',
                'title': 'High Memory Usage',
                'message': f"Memory usage is {memory_usage:.1f}%",
                'severity': 'Critical' if memory_usage > 95 else 'Warning',
                'status': 'Active',
                'timestamp': current_time,
                'server': socket.gethostname(),
                'type': 'performance',
                'category': 'memory'
            }
            alerts.append(alert)
            
            logs.append({
                'id': f'log_memory_{int(time.time())}',
                'timestamp': current_time,
                'level': 'ERROR' if memory_usage > 95 else 'WARNING',
                'source': 'Memory Monitor',
                'message': f'High memory usage: {memory_usage:.1f}% ({metrics.get("memory", {}).get("used", 0) / 1024**3:.1f}GB used)',
                'category': 'memory',
                'details': {
                    'memory_percent': memory_usage,
                    'memory_total': metrics.get('memory', {}).get('total', 0),
                    'memory_used': metrics.get('memory', {}).get('used', 0),
                    'swap_percent': metrics.get('swap', {}).get('percent', 0)
                }
            })
        
        # Disk alerts and logs
        disk_usage = metrics.get('disk', {}).get('percent', 0)
        if disk_usage > 90:
            alert = {
                'id': f'disk_high_{int(time.time())}',
                'title': 'Low Disk Space',
                'message': f"C: drive usage is {disk_usage:.1f}%",
                'severity': 'Critical' if disk_usage > 95 else 'Warning',
                'status': 'Active',
                'timestamp': current_time,
                'server': socket.gethostname(),
                'type': 'storage',
                'category': 'disk'
            }
            alerts.append(alert)
            
            logs.append({
                'id': f'log_disk_{int(time.time())}',
                'timestamp': current_time,
                'level': 'ERROR' if disk_usage > 95 else 'WARNING',
                'source': 'Disk Monitor',
                'message': f'Low disk space on C: drive: {disk_usage:.1f}% used ({metrics.get("disk", {}).get("free", 0) / 1024**3:.1f}GB free)',
                'category': 'storage',
                'details': {
                    'disk_percent': disk_usage,
                    'disk_total': metrics.get('disk', {}).get('total', 0),
                    'disk_free': metrics.get('disk', {}).get('free', 0)
                }
            })
        
        # Service alerts and logs
        services = get_windows_services()
        critical_services = ['EventLog', 'RpcSs', 'Winmgmt', 'Spooler']
        for service_name, service_info in services.items():
            if service_info['status'] == 'stopped' and service_name in critical_services:
                alert = {
                    'id': f'service_{service_name}_{int(time.time())}',
                    'title': f'Service Down: {service_info["display_name"]}',
                    'message': f'{service_info["display_name"]} service is not running',
                    'severity': 'Critical',
                    'status': 'Active',
                    'timestamp': current_time,
                    'server': socket.gethostname(),
                    'type': 'service',
                    'category': 'services'
                }
                alerts.append(alert)
                
                logs.append({
                    'id': f'log_service_{service_name}_{int(time.time())}',
                    'timestamp': current_time,
                    'level': 'ERROR',
                    'source': 'Service Monitor',
                    'message': f'Critical service stopped: {service_info["display_name"]} ({service_name})',
                    'category': 'services',
                    'details': {
                        'service_name': service_name,
                        'display_name': service_info["display_name"],
                        'start_mode': service_info.get('start_mode', 'Unknown')
                    }
                })
        
        # Add some general system logs for dashboard richness
        logs.extend([
            {
                'id': f'log_system_info_{int(time.time())}',
                'timestamp': current_time,
                'level': 'INFO',
                'source': 'System Info',
                'message': f'System status update: CPU {cpu_usage:.1f}%, Memory {memory_usage:.1f}%, Disk {disk_usage:.1f}%',
                'category': 'system',
                'details': {
                    'uptime_hours': metrics.get('system', {}).get('uptime_seconds', 0) / 3600,
                    'platform': metrics.get('system', {}).get('platform', 'Unknown'),
                    'hostname': socket.gethostname()
                }
            },
            {
                'id': f'log_network_{int(time.time())}',
                'timestamp': current_time,
                'level': 'INFO',
                'source': 'Network Monitor',
                'message': f'Network activity: {metrics.get("network", {}).get("bytes_recv", 0) / 1024**2:.1f}MB received, {metrics.get("network", {}).get("bytes_sent", 0) / 1024**2:.1f}MB sent',
                'category': 'network',
                'details': {
                    'bytes_received': metrics.get('network', {}).get('bytes_recv', 0),
                    'bytes_sent': metrics.get('network', {}).get('bytes_sent', 0),
                    'packets_received': metrics.get('network', {}).get('packets_recv', 0),
                    'packets_sent': metrics.get('network', {}).get('packets_sent', 0)
                }
            }
        ])
        
        # Update dashboard data
        dashboard_data.update({
            'alerts': alerts,
            'logs': sorted(logs, key=lambda x: x['timestamp'], reverse=True)[:50],  # Keep last 50 logs
            'services': services,
            'performance': {
                'cpu': metrics.get('cpu', {}),
                'memory': metrics.get('memory', {}),
                'disk': metrics.get('disk', {}),
                'network': metrics.get('network', {}),
                'timestamp': current_time
            },
            'events': [
                {
                    'id': f'event_boot_{int(time.time())}',
                    'timestamp': metrics.get('system', {}).get('boot_time', current_time),
                    'type': 'system',
                    'title': 'System Boot',
                    'description': f'System started - Uptime: {metrics.get("system", {}).get("uptime_seconds", 0) / 3600:.1f} hours'
                },
                {
                    'id': f'event_monitor_{int(time.time())}',
                    'timestamp': current_time,
                    'type': 'monitoring',
                    'title': 'Monitoring Update',
                    'description': f'Dashboard data updated - {len(alerts)} active alerts, {len(services)} services monitored'
                }
            ]
        })
        
    except Exception as e:
        print(f"Error generating dashboard data: {e}")
        # Add error log
        dashboard_data['logs'].append({
            'id': f'log_error_{int(time.time())}',
            'timestamp': datetime.datetime.now().isoformat(),
            'level': 'ERROR',
            'source': 'Dashboard Generator',
            'message': f'Error updating dashboard: {str(e)}',
            'category': 'system'
        })

def update_metrics():
    """Background thread to update metrics"""
    global windows_metrics, dashboard_data
    
    while True:
        try:
            windows_metrics = get_system_metrics()
            dashboard_data['services'] = get_windows_services()
            generate_dashboard_data()
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
            'alerts': len(dashboard_data.get('alerts', [])),
            'services': list(dashboard_data.get('services', {}).keys()),
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
    """Get current alerts from dashboard"""
    try:
        return jsonify({
            'success': True,
            'data': dashboard_data.get('alerts', [])
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
    """Get Windows services status from dashboard"""
    try:
        return jsonify({
            'success': True,
            'data': dashboard_data.get('services', {})
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

@app.route('/api/v1/dashboard')
def get_dashboard():
    """Get unified dashboard data with alerts, logs, and performance metrics"""
    try:
        return jsonify({
            'success': True,
            'data': {
                'alerts': dashboard_data.get('alerts', []),
                'logs': dashboard_data.get('logs', []),
                'performance': dashboard_data.get('performance', {}),
                'services': dashboard_data.get('services', {}),
                'events': dashboard_data.get('events', []),
                'summary': {
                    'total_alerts': len(dashboard_data.get('alerts', [])),
                    'critical_alerts': len([a for a in dashboard_data.get('alerts', []) if a.get('severity') == 'Critical']),
                    'running_services': len([s for s in dashboard_data.get('services', {}).values() if s.get('status') == 'running']),
                    'stopped_services': len([s for s in dashboard_data.get('services', {}).values() if s.get('status') == 'stopped']),
                    'recent_logs': len([l for l in dashboard_data.get('logs', [])[:10]]),  # Last 10 logs
                    'timestamp': datetime.datetime.now().isoformat()
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/v1/logs')
def get_logs():
    """Get system logs from dashboard"""
    try:
        # Support pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category', None)
        level = request.args.get('level', None)
        
        logs = dashboard_data.get('logs', [])
        
        # Filter by category if specified
        if category:
            logs = [log for log in logs if log.get('category') == category]
        
        # Filter by level if specified
        if level:
            logs = [log for log in logs if log.get('level') == level.upper()]
        
        # Pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_logs = logs[start:end]
        
        return jsonify({
            'success': True,
            'data': paginated_logs,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': len(logs),
                'pages': (len(logs) + per_page - 1) // per_page
            },
            'filters': {
                'available_categories': list(set(log.get('category', 'unknown') for log in dashboard_data.get('logs', []))),
                'available_levels': list(set(log.get('level', 'INFO') for log in dashboard_data.get('logs', [])))
            }
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
