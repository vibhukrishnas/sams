#!/usr/bin/env python3
"""
SAMS Python Flask Backend Server
Real-time System Monitoring API with Application-Specific Logs
Port: 8081 (Python) vs Port: 8080 (Java)
"""

import json
import time
import logging
import re
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
import os
import glob

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def get_system_metrics():
    """Get comprehensive system metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk_usage = []
        for partition in psutil.disk_partitions():
            try:
                partition_usage = psutil.disk_usage(partition.mountpoint)
                disk_usage.append({
                    'mountPoint': partition.mountpoint,
                    'fileSystem': partition.fstype,
                    'totalSpace': partition_usage.total,
                    'usedSpace': partition_usage.used,
                    'availableSpace': partition_usage.free,
                    'usagePercent': round((partition_usage.used / partition_usage.total) * 100, 1)
                })
            except PermissionError:
                continue
        
        # Network metrics
        network_io = psutil.net_io_counters()
        network_connections = len(psutil.net_connections())
        
        # Network interfaces
        network_interfaces = []
        for interface, addrs in psutil.net_if_addrs().items():
            if_stats = psutil.net_if_stats().get(interface)
            for addr in addrs:
                if addr.family == 2:  # IPv4
                    network_interfaces.append({
                        'interface': interface,
                        'ip_address': addr.address,
                        'is_up': if_stats.isup if if_stats else False,
                        'speed': if_stats.speed if if_stats else 0
                    })
                    break
        
        # System info
        boot_time = psutil.boot_time()
        uptime = time.time() - boot_time
        
        return {
            'cpuUsage': round(cpu_percent, 1),
            'loadAverage1m': round(load_avg[0], 2) if load_avg[0] != 0 else round(cpu_percent / 100, 2),
            'loadAverage5m': round(load_avg[1], 2) if load_avg[1] != 0 else round(cpu_percent / 100, 2),
            'loadAverage15m': round(load_avg[2], 2) if load_avg[2] != 0 else round(cpu_percent / 100, 2),
            'cpuCores': cpu_count,
            'memoryTotal': memory.total,
            'memoryUsed': memory.used,
            'memoryAvailable': memory.available,
            'memoryUsagePercent': round(memory.percent, 1),
            'diskUsage': disk_usage,
            'networkBytesSent': network_io.bytes_sent,
            'networkBytesReceived': network_io.bytes_recv,
            'networkPacketsSent': network_io.packets_sent,
            'networkPacketsReceived': network_io.packets_recv,
            'networkConnections': network_connections,
            'networkInterfaces': network_interfaces,
            'hostname': psutil.Process().name(),
            'uptime': int(uptime),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return None

def get_system_alerts():
    """Generate system alerts based on thresholds"""
    try:
        alerts = []
        metrics = get_system_metrics()
        
        if metrics:
            # CPU alert
            if metrics['cpuUsage'] > 80:
                alerts.append({
                    'id': 'HIGH_CPU_USAGE',
                    'title': 'High CPU Usage',
                    'message': f"CPU usage is {metrics['cpuUsage']}% (threshold: 80%)",
                    'severity': 'WARNING',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
            
            # Memory alert
            if metrics['memoryUsagePercent'] > 85:
                alerts.append({
                    'id': 'HIGH_MEMORY_USAGE',
                    'title': 'High Memory Usage',
                    'message': f"Memory usage is {metrics['memoryUsagePercent']}% (threshold: 85%)",
                    'severity': 'WARNING',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
            
            # Disk alerts
            for disk in metrics['diskUsage']:
                if disk['usagePercent'] > 90:
                    alerts.append({
                        'id': 'HIGH_DISK_USAGE',
                        'title': 'High Disk Usage',
                        'message': f"Disk {disk['mountPoint']} usage is {disk['usagePercent']}% (threshold: 90%)",
                        'severity': 'CRITICAL',
                        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        return alerts
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return []

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    logger.info("🔍 Health check requested")
    return jsonify({
        'status': 'UP',
        'service': 'SAMS Python Backend',
        'version': '1.0.0',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'message': '🐍 SAMS Python is running perfectly!',
        'port': 8081
    })

@app.route('/api/v1/metrics', methods=['GET'])
def get_metrics():
    """Get comprehensive system metrics"""
    logger.info("📊 System metrics requested")
    metrics = get_system_metrics()
    if metrics:
        return jsonify(metrics)
    else:
        return jsonify({'error': 'Failed to get system metrics'}), 500

@app.route('/api/v1/alerts', methods=['GET'])
def get_alerts():
    """Get system alerts"""
    logger.info("🚨 System alerts requested")
    alerts = get_system_alerts()
    return jsonify({
        'alerts': alerts,
        'count': len(alerts),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'status': 'ALL_CLEAR' if len(alerts) == 0 else 'ALERTS_PRESENT'
    })

@app.route('/api/v1/servers', methods=['GET'])
def get_servers():
    """Get server information"""
    logger.info("🖥️ Server information requested")
    metrics = get_system_metrics()
    
    servers = [{
        'id': 'sams-python-001',
        'name': 'SAMS Python Backend',
        'host': 'localhost',
        'port': 8081,
        'status': 'RUNNING',
        'version': '1.0.0',
        'lastChecked': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'cpuUsage': metrics['cpuUsage'] if metrics else 0,
        'memoryUsage': metrics['memoryUsagePercent'] if metrics else 0,
        'uptime': metrics['uptime'] if metrics else 0
    }]
    
    return jsonify({
        'servers': servers,
        'count': len(servers),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'cluster_status': 'HEALTHY'
    })

@app.route('/api/v1/cpu', methods=['GET'])
def get_cpu():
    """Get CPU usage specifically"""
    logger.info("⚡ CPU usage requested")
    metrics = get_system_metrics()
    if metrics:
        return jsonify({
            'cpu_usage': metrics['cpuUsage'],
            'load_average_1m': metrics['loadAverage1m'],
            'load_average_5m': metrics['loadAverage5m'],
            'load_average_15m': metrics['loadAverage15m'],
            'cpu_cores': metrics['cpuCores'],
            'timestamp': metrics['timestamp']
        })
    else:
        return jsonify({'error': 'Failed to get CPU metrics'}), 500

@app.route('/api/v1/memory', methods=['GET'])
def get_memory():
    """Get memory usage specifically"""
    logger.info("💾 Memory usage requested")
    metrics = get_system_metrics()
    if metrics:
        return jsonify({
            'memory_usage_percent': metrics['memoryUsagePercent'],
            'memory_total': metrics['memoryTotal'],
            'memory_used': metrics['memoryUsed'],
            'memory_available': metrics['memoryAvailable'],
            'timestamp': metrics['timestamp']
        })
    else:
        return jsonify({'error': 'Failed to get memory metrics'}), 500

@app.route('/api/v1/disk', methods=['GET'])
def get_disk():
    """Get disk usage specifically"""
    logger.info("💽 Disk usage requested")
    metrics = get_system_metrics()
    if metrics:
        return jsonify({
            'disk_usage': metrics['diskUsage'],
            'timestamp': metrics['timestamp']
        })
    else:
        return jsonify({'error': 'Failed to get disk metrics'}), 500

@app.route('/api/v1/status', methods=['GET'])
def get_status():
    """System status overview"""
    logger.info("📈 System status overview requested")
    metrics = get_system_metrics()
    alerts = get_system_alerts()
    
    if metrics:
        overall_status = 'HEALTHY'
        if len(alerts) > 0:
            overall_status = 'WARNING'
            if any(alert['severity'] == 'CRITICAL' for alert in alerts):
                overall_status = 'CRITICAL'
        
        return jsonify({
            'overall_status': overall_status,
            'cpu_usage': metrics['cpuUsage'],
            'memory_usage': metrics['memoryUsagePercent'],
            'alerts_count': len(alerts),
            'servers_count': 1,
            'uptime': metrics['uptime'],
            'hostname': metrics['hostname'],
            'backend': 'Python Flask',
            'port': 8081,
            'timestamp': metrics['timestamp']
        })
    else:
        return jsonify({'error': 'Failed to get system status'}), 500

# ========================= APPLICATION LOG MONITORING =========================

# Application log storage
application_logs = {
    'cisco-anyconnect': [],
    'reporting-services': [],
    'winbeat-monitor': [],
    'fortinet-vpn': [],
    'sams-backend': [],
    'database-server': []
}

# Log file paths for various applications
log_file_paths = {
    'cisco-anyconnect': [
        r'C:\ProgramData\Cisco\Cisco AnyConnect Secure Mobility Client\Logs\*.log',
        r'C:\Users\*\AppData\Local\Cisco\Cisco AnyConnect Secure Mobility Client\Logs\*.log'
    ],
    'reporting-services': [
        r'C:\Program Files\Microsoft SQL Server\MSRS*.MSSQLSERVER\Reporting Services\LogFiles\*.log'
    ],
    'winbeat-monitor': [
        r'C:\ProgramData\WinBeat\Logs\*.log',
        r'C:\Windows\Logs\WinBeat\*.log'
    ],
    'fortinet-vpn': [
        r'C:\Program Files\Fortinet\FortiClient\logs\*.log',
        r'C:\ProgramData\Fortinet\FortiClient\logs\*.log'
    ],
    'sams-backend': [
        r'logs\*.log',
        r'.\logs\*.log'
    ],
    'database-server': [
        r'C:\Program Files\Microsoft SQL Server\MSSQL*.MSSQLSERVER\MSSQL\Log\*.log'
    ]
}

def parse_application_logs():
    """Parse and collect logs from various applications"""
    try:
        # Generate sample logs for demonstration
        generate_sample_application_logs()
        
        # In a real implementation, you would parse actual log files here
        # for app_id, paths in log_file_paths.items():
        #     parse_log_files(app_id, paths)
        
        logger.info("📋 Application logs parsed successfully")
    except Exception as e:
        logger.error(f"❌ Error parsing application logs: {e}")

def generate_sample_application_logs():
    """Generate sample logs for demonstration purposes"""
    import random
    from datetime import datetime, timedelta
    
    # Sample log messages for each application
    sample_logs = {
        'cisco-anyconnect': [
            {'severity': 'INFO', 'message': 'VPN Connection Established Successfully'},
            {'severity': 'WARNING', 'message': '[WARNING] Certificate expiring in 30 days'},
            {'severity': 'CRITICAL', 'message': 'Connection Failed - Authentication Error'},
            {'severity': 'INFO', 'message': 'AnyConnect Service Started'}
        ],
        'reporting-services': [
            {'severity': 'INFO', 'message': 'Report Generation Completed (Report_001.pdf)'},
            {'severity': 'WARNING', 'message': '[WARNING] Report queue processing slow'},
            {'severity': 'CRITICAL', 'message': 'Out Of Memory Error - Check CrashDumps'},
            {'severity': 'INFO', 'message': 'Reporting Services Started Successfully'}
        ],
        'winbeat-monitor': [
            {'severity': 'INFO', 'message': 'System metrics collected successfully'},
            {'severity': 'WARNING', 'message': '[WARNING] High CPU usage detected (85%)'},
            {'severity': 'CRITICAL', 'message': 'Disk space critically low (C: Drive 95% full)'},
            {'severity': 'INFO', 'message': 'WinBeat Monitor Service Started'}
        ],
        'fortinet-vpn': [
            {'severity': 'INFO', 'message': 'VPN Tunnel Established (10.0.1.100)'},
            {'severity': 'WARNING', 'message': '[WARNING] Slow in n/w transactions'},
            {'severity': 'CRITICAL', 'message': 'VPN Connection Timeout - Check Network Settings'},
            {'severity': 'INFO', 'message': 'FortiClient VPN Service Initialized'}
        ],
        'sams-backend': [
            {'severity': 'INFO', 'message': 'Server Startup Complete'},
            {'severity': 'INFO', 'message': 'Database connection established'},
            {'severity': 'WARNING', 'message': '[WARNING] Slow in n/w transactions'},
            {'severity': 'INFO', 'message': 'Queue Process Completed'}
        ],
        'database-server': [
            {'severity': 'INFO', 'message': 'Database backup completed successfully'},
            {'severity': 'WARNING', 'message': '[WARNING] Transaction log growing large (2.1GB)'},
            {'severity': 'CRITICAL', 'message': 'Database connection pool exhausted'},
            {'severity': 'INFO', 'message': 'SQL Server Database Engine started'}
        ]
    }
    
    # Generate logs for each application
    for app_id, messages in sample_logs.items():
        application_logs[app_id] = []
        
        for i, log_msg in enumerate(messages):
            timestamp = datetime.now() - timedelta(minutes=random.randint(1, 60))
            log_entry = {
                'applicationId': app_id,
                'severity': log_msg['severity'],
                'message': log_msg['message'],
                'timestamp': timestamp.isoformat(),
                'formattedTimestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
            }
            application_logs[app_id].append(log_entry)

def add_real_time_log(app_id, severity, message):
    """Add a new real-time log entry"""
    timestamp = datetime.now()
    log_entry = {
        'applicationId': app_id,
        'severity': severity,
        'message': message,
        'timestamp': timestamp.isoformat(),
        'formattedTimestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    if app_id in application_logs:
        application_logs[app_id].insert(0, log_entry)
        
        # Keep only last 100 entries per application
        if len(application_logs[app_id]) > 100:
            application_logs[app_id] = application_logs[app_id][:100]
    
    logger.info(f"📝 New log entry added for {app_id}: [{severity}] {message}")

@app.route('/api/v1/applications', methods=['GET'])
def get_applications():
    """Get list of monitored applications"""
    try:
        applications = []
        app_names = {
            'cisco-anyconnect': 'Cisco AnyConnect',
            'reporting-services': 'Reporting Services',
            'winbeat-monitor': 'WinBeat Monitor',
            'fortinet-vpn': 'Fortinet VPN',
            'sams-backend': 'SAMS Backend',
            'database-server': 'Database Server'
        }
        
        for app_id in application_logs.keys():
            logs = application_logs[app_id]
            stats = {
                'total': len(logs),
                'critical': len([l for l in logs if l['severity'].upper() in ['CRITICAL', 'ERROR']]),
                'warning': len([l for l in logs if l['severity'].upper() == 'WARNING']),
                'info': len([l for l in logs if l['severity'].upper() == 'INFO']),
                'error': len([l for l in logs if l['severity'].upper() == 'ERROR'])
            }
            
            applications.append({
                'id': app_id,
                'name': app_names.get(app_id, app_id),
                'statistics': stats
            })
        
        return jsonify({
            'applications': applications,
            'count': len(applications),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error getting applications: {e}")
        return jsonify({'error': 'Failed to get applications'}), 500

@app.route('/api/v1/applications/<app_id>/logs', methods=['GET'])
def get_application_logs(app_id):
    """Get logs for a specific application"""
    try:
        if app_id not in application_logs:
            return jsonify({'error': 'Application not found'}), 404
        
        severity = request.args.get('severity', 'all')
        limit = int(request.args.get('limit', 50))
        
        logs = application_logs[app_id]
        
        # Filter by severity if specified
        if severity != 'all':
            logs = [log for log in logs if log['severity'].lower() == severity.lower()]
        
        # Limit results
        if len(logs) > limit:
            logs = logs[:limit]
        
        app_names = {
            'cisco-anyconnect': 'Cisco AnyConnect',
            'reporting-services': 'Reporting Services',
            'winbeat-monitor': 'WinBeat Monitor',
            'fortinet-vpn': 'Fortinet VPN',
            'sams-backend': 'SAMS Backend',
            'database-server': 'Database Server'
        }
        
        # Calculate statistics
        all_logs = application_logs[app_id]
        statistics = {
            'total': len(all_logs),
            'critical': len([l for l in all_logs if l['severity'].upper() in ['CRITICAL', 'ERROR']]),
            'warning': len([l for l in all_logs if l['severity'].upper() == 'WARNING']),
            'info': len([l for l in all_logs if l['severity'].upper() == 'INFO']),
            'error': len([l for l in all_logs if l['severity'].upper() == 'ERROR'])
        }
        
        return jsonify({
            'application_id': app_id,
            'application_name': app_names.get(app_id, app_id),
            'logs': logs,
            'count': len(logs),
            'severity_filter': severity,
            'statistics': statistics,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error getting application logs for {app_id}: {e}")
        return jsonify({'error': 'Failed to get application logs'}), 500

@app.route('/api/v1/applications/<app_id>/logs', methods=['POST'])
def add_application_log(app_id):
    """Add a new log entry for an application"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        severity = data.get('severity', 'INFO')
        message = data.get('message', '')
        
        add_real_time_log(app_id, severity, message)
        
        return jsonify({
            'status': 'success',
            'message': 'Log entry added successfully',
            'application_id': app_id,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error adding log entry for {app_id}: {e}")
        return jsonify({'error': 'Failed to add log entry'}), 500

@app.route('/api/v1/applications/statistics', methods=['GET'])
def get_application_statistics():
    """Get log statistics for all applications"""
    try:
        stats = {}
        for app_id, logs in application_logs.items():
            stats[app_id] = {
                'total': len(logs),
                'critical': len([l for l in logs if l['severity'].upper() in ['CRITICAL', 'ERROR']]),
                'warning': len([l for l in logs if l['severity'].upper() == 'WARNING']),
                'info': len([l for l in logs if l['severity'].upper() == 'INFO']),
                'error': len([l for l in logs if l['severity'].upper() == 'ERROR'])
            }
        
        return jsonify({
            'statistics': stats,
            'applications_count': len(application_logs),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error getting application statistics: {e}")
        return jsonify({'error': 'Failed to get application statistics'}), 500

@app.route('/api/v1/applications/refresh', methods=['POST'])
def refresh_application_logs():
    """Refresh application logs (trigger log file parsing)"""
    try:
        parse_application_logs()
        return jsonify({
            'status': 'success',
            'message': 'Application logs refreshed successfully',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"❌ Error refreshing application logs: {e}")
        return jsonify({'error': 'Failed to refresh application logs'}), 500

@app.route('/api/v1/execute', methods=['POST'])
def execute_command():
    """Execute system commands"""
    try:
        data = request.get_json()
        
        if not data or 'command' not in data:
            return jsonify({'error': 'Command is required'}), 400
        
        command = data.get('command', '')
        timeout = data.get('timeout', 30)
        
        logger.info(f"🚀 Executing command: {command}")
        
        # Import subprocess module
        import subprocess
        import threading
        
        # Execute the command with timeout
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            response = {
                'status': 'success' if result.returncode == 0 else 'error',
                'command': command,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"✅ Command executed successfully: {command}")
            return jsonify(response)
            
        except subprocess.TimeoutExpired:
            logger.error(f"⏰ Command timeout: {command}")
            return jsonify({
                'status': 'timeout',
                'command': command,
                'error': f'Command timed out after {timeout} seconds',
                'timestamp': datetime.now().isoformat()
            }), 408
            
        except Exception as cmd_error:
            logger.error(f"❌ Command execution error: {cmd_error}")
            return jsonify({
                'status': 'error',
                'command': command,
                'error': str(cmd_error),
                'timestamp': datetime.now().isoformat()
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Error processing command request: {e}")
        return jsonify({'error': 'Failed to process command request'}), 500

if __name__ == '__main__':
    logger.info("🐍 Starting SAMS Python Backend Server...")
    logger.info("⚡ Flask + psutil for system monitoring")
    logger.info("🚀 Real-time metrics collection")
    logger.info("🌐 CORS enabled for web access")
    logger.info("📋 Application log monitoring enabled")
    
    # Initialize application logs
    parse_application_logs()
    
    print("✅ SAMS Python Backend Ready!")
    print("🔗 API Base URL: http://localhost:8082/api/v1")
    print("📊 Health Check: http://localhost:8082/api/v1/health")
    print("📈 Metrics: http://localhost:8082/api/v1/metrics")
    print("🚨 Alerts: http://localhost:8082/api/v1/alerts")
    print("🖥️ Servers: http://localhost:8082/api/v1/servers")
    print("📋 Applications: http://localhost:8082/api/v1/applications")
    print("🚀 Execute Commands: http://localhost:8082/api/v1/execute")
    print("")
    
    app.run(host='0.0.0.0', port=8082, debug=False)
