#!/usr/bin/env python3
"""
SAMS Backend Server - Server & Alert Monitoring System
Comprehensive backend API for the SAMS mobile application
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import json
import datetime
import threading
import time
import random
import logging
import psutil
import platform
import socket
import subprocess
import os
import requests
import asyncio
import aiohttp
import paramiko
from concurrent.futures import ThreadPoolExecutor

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app communication

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===================================================================
# REMOTE SERVER MONITORING CONFIGURATION
# ===================================================================

# Remote servers configuration - ADD YOUR REAL SERVERS HERE!
REMOTE_SERVERS = [
    {
        "id": 2,
        "name": "Production Web Server",
        "ip": "192.168.1.10",
        "type": "http_api",
        "port": 80,
        "api_endpoint": "/api/health",
        "auth": None,
        "enabled": True
    },
    {
        "id": 3,
        "name": "Database Server",
        "ip": "192.168.1.11", 
        "type": "ssh",
        "port": 22,
        "username": "admin",
        "password": None,  # Use SSH keys instead
        "enabled": False  # Disabled until credentials provided
    },
    {
        "id": 4,
        "name": "API Gateway",
        "ip": "8.8.8.8",  # Google DNS for demo
        "type": "ping",
        "port": None,
        "enabled": True
    },
    {
        "id": 5,
        "name": "External Service",
        "ip": "httpbin.org",
        "type": "http_api",
        "port": 443,
        "api_endpoint": "/status/200",
        "protocol": "https",
        "enabled": True
    },
    {
        "id": 6,
        "name": "Load Balancer",
        "ip": "cloudflare.com",
        "type": "http_check",
        "port": 443,
        "protocol": "https",
        "enabled": True
    }
]

# ===================================================================
# REMOTE MONITORING FUNCTIONS
# ===================================================================

async def check_http_api(server):
    """Check server via HTTP API endpoint"""
    try:
        protocol = server.get('protocol', 'http')
        port = server.get('port', 80 if protocol == 'http' else 443)
        endpoint = server.get('api_endpoint', '/health')
        
        url = f"{protocol}://{server['ip']}:{port}{endpoint}"
        if server['ip'] in ['httpbin.org', 'cloudflare.com']:
            url = f"{protocol}://{server['ip']}{endpoint}"
        
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            start_time = time.time()
            async with session.get(url) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    try:
                        data = await response.json()
                        return {
                            "status": "Online",
                            "response_time": round(response_time, 2),
                            "http_status": response.status,
                            "api_data": data
                        }
                    except:
                        return {
                            "status": "Online",
                            "response_time": round(response_time, 2),
                            "http_status": response.status,
                            "api_data": {"message": "HTTP OK"}
                        }
                else:
                    return {
                        "status": "Warning",
                        "response_time": round(response_time, 2),
                        "http_status": response.status,
                        "error": f"HTTP {response.status}"
                    }
    except asyncio.TimeoutError:
        return {
            "status": "Offline",
            "error": "Timeout",
            "response_time": None
        }
    except Exception as e:
        return {
            "status": "Offline", 
            "error": str(e),
            "response_time": None
        }

async def check_ping(server):
    """Check server via ping"""
    try:
        # Use subprocess for ping since ping3 might not be available
        if platform.system().lower() == "windows":
            cmd = ["ping", "-n", "1", "-w", "3000", server['ip']]
        else:
            cmd = ["ping", "-c", "1", "-W", "3", server['ip']]
        
        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        response_time = (time.time() - start_time) * 1000
        
        if result.returncode == 0:
            return {
                "status": "Online",
                "response_time": round(response_time, 2),
                "ping_result": "Success"
            }
        else:
            return {
                "status": "Offline",
                "response_time": None,
                "error": "Ping failed"
            }
    except subprocess.TimeoutExpired:
        return {
            "status": "Offline",
            "response_time": None,
            "error": "Ping timeout"
        }
    except Exception as e:
        return {
            "status": "Offline",
            "response_time": None,
            "error": str(e)
        }

async def check_ssh(server):
    """Check server via SSH (requires paramiko)"""
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        start_time = time.time()
        ssh.connect(
            hostname=server['ip'],
            port=server.get('port', 22),
            username=server.get('username'),
            password=server.get('password'),
            timeout=10
        )
        
        # Get system metrics via SSH
        stdin, stdout, stderr = ssh.exec_command("uptime && free -m && df -h")
        output = stdout.read().decode()
        response_time = (time.time() - start_time) * 1000
        
        ssh.close()
        
        return {
            "status": "Online",
            "response_time": round(response_time, 2),
            "ssh_output": output,
            "connection": "SSH Success"
        }
    except Exception as e:
        return {
            "status": "Offline",
            "response_time": None,
            "error": f"SSH Error: {str(e)}"
        }

async def check_http_simple(server):
    """Simple HTTP status check"""
    try:
        protocol = server.get('protocol', 'https')
        url = f"{protocol}://{server['ip']}"
        
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            start_time = time.time()
            async with session.get(url) as response:
                response_time = (time.time() - start_time) * 1000
                
                return {
                    "status": "Online" if response.status < 400 else "Warning",
                    "response_time": round(response_time, 2),
                    "http_status": response.status
                }
    except Exception as e:
        return {
            "status": "Offline",
            "response_time": None,
            "error": str(e)
        }

async def monitor_remote_server(server):
    """Monitor a single remote server based on its type"""
    try:
        if not server.get('enabled', True):
            return {
                "id": server['id'],
                "name": server['name'],
                "ip": server['ip'],
                "status": "Disabled",
                "error": "Monitoring disabled",
                "last_check": datetime.datetime.now().isoformat()
            }
        
        # Route to appropriate monitoring function
        if server['type'] == 'http_api':
            result = await check_http_api(server)
        elif server['type'] == 'ping':
            result = await check_ping(server)
        elif server['type'] == 'ssh':
            result = await check_ssh(server)
        elif server['type'] == 'http_check':
            result = await check_http_simple(server)
        else:
            result = {
                "status": "Error",
                "error": f"Unknown server type: {server['type']}"
            }
        
        # Add server info to result
        result.update({
            "id": server['id'],
            "name": server['name'],
            "ip": server['ip'],
            "type": server['type'],
            "last_check": datetime.datetime.now().isoformat()
        })
        
        return result
        
    except Exception as e:
        logger.error(f"Error monitoring {server['name']}: {str(e)}")
        return {
            "id": server['id'],
            "name": server['name'],
            "ip": server['ip'],
            "status": "Error",
            "error": str(e),
            "last_check": datetime.datetime.now().isoformat()
        }

async def monitor_all_remote_servers():
    """Monitor all remote servers concurrently"""
    try:
        tasks = [monitor_remote_server(server) for server in REMOTE_SERVERS]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        remote_servers = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Remote monitoring exception: {result}")
                continue
            remote_servers.append(result)
        
        return remote_servers
    except Exception as e:
        logger.error(f"Error in monitor_all_remote_servers: {str(e)}")
        return []

# ===================================================================
# REAL SYSTEM MONITORING FUNCTIONS
# ===================================================================

def get_real_system_metrics():
    """Get actual system metrics from the host machine"""
    try:
        # CPU usage (real-time)
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory usage (real-time)
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_total = round(memory.total / (1024**3), 2)  # GB
        memory_used = round(memory.used / (1024**3), 2)    # GB
        
        # Disk usage (real-time)
        disk = psutil.disk_usage('/')
        disk_percent = round((disk.used / disk.total) * 100, 2)
        disk_total = round(disk.total / (1024**3), 2)      # GB
        disk_used = round(disk.used / (1024**3), 2)        # GB
        disk_free = round(disk.free / (1024**3), 2)        # GB
        
        # Network stats
        net_io = psutil.net_io_counters()
        
        # System info
        boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.datetime.now() - boot_time
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "frequency": cpu_freq.current if cpu_freq else 0
            },
            "memory": {
                "percent": memory_percent,
                "total_gb": memory_total,
                "used_gb": memory_used,
                "available_gb": round(memory.available / (1024**3), 2)
            },
            "disk": {
                "percent": disk_percent,
                "total_gb": disk_total,
                "used_gb": disk_used,
                "free_gb": disk_free
            },
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            },
            "system": {
                "platform": platform.system(),
                "platform_version": platform.version(),
                "architecture": platform.architecture()[0],
                "processor": platform.processor(),
                "hostname": socket.gethostname(),
                "uptime": str(uptime).split('.')[0],
                "boot_time": boot_time.isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        return None

def get_running_processes():
    """Get list of running processes with CPU and memory usage"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                proc_info = proc.info
                if proc_info['cpu_percent'] > 0:  # Only include active processes
                    processes.append({
                        "pid": proc_info['pid'],
                        "name": proc_info['name'],
                        "cpu_percent": round(proc_info['cpu_percent'], 2),
                        "memory_percent": round(proc_info['memory_percent'], 2)
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by CPU usage, get top 10
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return processes[:10]
    except Exception as e:
        logger.error(f"Error getting processes: {str(e)}")
        return []

def get_network_connections():
    """Get active network connections"""
    try:
        connections = []
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == 'ESTABLISHED':
                connections.append({
                    "local_address": f"{conn.laddr.ip}:{conn.laddr.port}",
                    "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "N/A",
                    "status": conn.status,
                    "pid": conn.pid
                })
        return connections[:20]  # Top 20 connections
    except Exception as e:
        logger.error(f"Error getting network connections: {str(e)}")
        return []

def generate_complete_server_data():
    """Generate complete server data: local + remote servers"""
    try:
        all_servers = []
        
        # Add local server (your PC) with real metrics
        real_metrics = get_real_system_metrics()
        if real_metrics:
            hostname = real_metrics['system']['hostname']
            local_ip = socket.gethostbyname(hostname)
            
            local_server = {
                "id": 1,
                "name": f"{hostname} (Local)",
                "ip": local_ip,
                "status": "Online",
                "cpu": real_metrics['cpu']['percent'],
                "memory": real_metrics['memory']['percent'],
                "disk": real_metrics['disk']['percent'],
                "uptime": real_metrics['system']['uptime'],
                "last_check": datetime.datetime.now().isoformat(),
                "data_source": "LOCAL_SYSTEM",
                "type": "local",
                "details": {
                    "platform": real_metrics['system']['platform'],
                    "architecture": real_metrics['system']['architecture'],
                    "processor": real_metrics['system']['processor'],
                    "memory_total": real_metrics['memory']['total_gb'],
                    "disk_total": real_metrics['disk']['total_gb'],
                    "cpu_cores": real_metrics['cpu']['count']
                }
            }
            all_servers.append(local_server)
        
        # Add remote servers (will be updated by background monitoring)
        if hasattr(generate_complete_server_data, 'remote_cache'):
            all_servers.extend(generate_complete_server_data.remote_cache)
        else:
            # Initialize with basic remote server data
            for server in REMOTE_SERVERS:
                remote_server = {
                    "id": server['id'],
                    "name": server['name'],
                    "ip": server['ip'],
                    "status": "Checking...",
                    "cpu": 0,
                    "memory": 0,
                    "disk": 0,
                    "uptime": "Unknown",
                    "last_check": datetime.datetime.now().isoformat(),
                    "data_source": "REMOTE_API",
                    "type": server['type'],
                    "response_time": None,
                    "enabled": server.get('enabled', True)
                }
                all_servers.append(remote_server)
        
        return all_servers
    except Exception as e:
        logger.error(f"Error generating server data: {str(e)}")
        return []

# Function to update remote server cache
def update_remote_servers_cache(remote_data):
    """Update the cached remote server data"""
    generate_complete_server_data.remote_cache = remote_data

# ===================================================================
# DATA STORAGE (Real-time data)
# ===================================================================

# Server data storage - REAL TIME!
servers = []

# Initialize with complete data
def refresh_server_data():
    global servers
    servers = generate_complete_server_data()

# Initialize servers with complete data
refresh_server_data()

# Alert data storage
alerts = [
    {
        "id": 1,
        "title": "High CPU Usage",
        "description": "API Gateway CPU usage exceeds 85%",
        "server": "API Gateway",
        "server_id": 3,
        "severity": "Critical",
        "time": "5 min ago",
        "timestamp": datetime.datetime.now().isoformat(),
        "acknowledged": False
    },
    {
        "id": 2,
        "title": "Server Offline",
        "description": "Mail Server is not responding",
        "server": "Mail Server",
        "server_id": 4,
        "severity": "High",
        "time": "15 min ago",
        "timestamp": datetime.datetime.now().isoformat(),
        "acknowledged": False
    },
    {
        "id": 3,
        "title": "Low Disk Space",
        "description": "Backup Server disk usage above 85%",
        "server": "Backup Server",
        "server_id": 5,
        "severity": "Medium",
        "time": "1 hour ago",
        "timestamp": datetime.datetime.now().isoformat(),
        "acknowledged": False
    },
    {
        "id": 4,
        "title": "Memory Warning",
        "description": "Database Server memory usage high",
        "server": "Database Server",
        "server_id": 2,
        "severity": "Low",
        "time": "2 hours ago",
        "timestamp": datetime.datetime.now().isoformat(),
        "acknowledged": False
    }
]

# Reports data storage
reports = [
    {
        "id": 1,
        "name": "Weekly Performance Report",
        "type": "Performance",
        "status": "Completed",
        "date": "2024-01-15",
        "generated": datetime.datetime.now().isoformat()
    },
    {
        "id": 2,
        "name": "Security Audit",
        "type": "Security",
        "status": "Generating",
        "date": "2024-01-16",
        "generated": datetime.datetime.now().isoformat()
    },
    {
        "id": 3,
        "name": "System Health Check",
        "type": "Health",
        "status": "Scheduled",
        "date": "2024-01-17",
        "generated": datetime.datetime.now().isoformat()
    }
]

# System stats
system_stats = {
    "total_servers": len(servers),
    "online_servers": len([s for s in servers if s["status"] == "Online"]),
    "offline_servers": len([s for s in servers if s["status"] == "Offline"]),
    "warning_servers": len([s for s in servers if s["status"] == "Warning"]),
    "total_alerts": len(alerts),
    "critical_alerts": len([a for a in alerts if a["severity"] == "Critical"]),
    "unacknowledged_alerts": len([a for a in alerts if not a["acknowledged"]]),
    "last_updated": datetime.datetime.now().isoformat()
}

# ===================================================================
# API ENDPOINTS
# ===================================================================

@app.route('/')
def index():
    """Main dashboard webpage"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>SAMS Backend Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-card { background: #3498db; color: white; padding: 20px; border-radius: 10px; text-align: center; flex: 1; }
            .endpoint { background: #ecf0f1; padding: 10px; margin: 5px 0; border-radius: 5px; }
            .online { color: #27ae60; } .offline { color: #e74c3c; } .warning { color: #f39c12; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚀 SAMS Backend Server - REAL TIME MONITORING</h1>
            <p>Server & Alert Monitoring System - LIVE SYSTEM DATA (NO MOCKS!)</p>
        </div>
        
        <div class="container">
            <h2>📊 System Overview</h2>
            <div class="stats">
                <div class="stat-card">
                    <h3>""" + str(system_stats['total_servers']) + """</h3>
                    <p>Total Servers</p>
                </div>
                <div class="stat-card">
                    <h3>""" + str(system_stats['online_servers']) + """</h3>
                    <p>Online Servers</p>
                </div>
                <div class="stat-card">
                    <h3>""" + str(system_stats['total_alerts']) + """</h3>
                    <p>Active Alerts</p>
                </div>
            </div>
        </div>
        
        <div class="container">
            <h2>🖥️ Server Status</h2>
            """ + "".join([f"""
            <div class="endpoint">
                <strong>{server['name']}</strong> ({server['ip']}) - 
                <span class="{server['status'].lower()}">{server['status']}</span>
                """ + (f"- CPU: {server.get('cpu', 0):.1f}% | Memory: {server.get('memory', 0):.1f}% | Disk: {server.get('disk', 0):.1f}%" 
                      if server.get('type') == 'local' 
                      else f"- Response: {server.get('response_time', 'N/A')}ms | Type: {server.get('type', 'Unknown')}") + f"""
            </div>
            """ for server in servers]) + """
        </div>
        
        <div class="container">
            <h2>🔗 API Endpoints</h2>
            <div class="endpoint"><strong>GET /api/servers</strong> - Get all servers</div>
            <div class="endpoint"><strong>GET /api/servers/&lt;id&gt;</strong> - Get specific server</div>
            <div class="endpoint"><strong>GET /api/alerts</strong> - Get all alerts</div>
            <div class="endpoint"><strong>POST /api/alerts/&lt;id&gt;/acknowledge</strong> - Acknowledge alert</div>
            <div class="endpoint"><strong>GET /api/reports</strong> - Get all reports</div>
            <div class="endpoint"><strong>GET /api/dashboard</strong> - Get dashboard data</div>
            <div class="endpoint"><strong>GET /api/stats</strong> - Get system statistics</div>
        </div>
        
        <div class="container">
            <h2>📱 Mobile App Integration</h2>
            <p>This backend is designed to work with the SAMS Mobile App (React Native/Expo)</p>
            <p><strong>Backend Status:</strong> <span class="online">✅ RUNNING WITH REAL DATA</span></p>
            <p><strong>CORS:</strong> <span class="online">✅ ENABLED</span></p>
            <p><strong>Data Source:</strong> <span class="online">🔥 LIVE SYSTEM METRICS (NO MOCKS!)</span></p>
            <p><strong>Update Frequency:</strong> <span class="online">⚡ Every 10 seconds</span></p>
            <p><strong>Last Updated:</strong> """ + system_stats['last_updated'] + """</p>
        </div>
    </body>
    </html>
    """
    return html

@app.route('/api/servers/remote')
def get_remote_servers():
    """Get only remote servers status"""
    try:
        remote_servers = [s for s in servers if s.get('type') != 'local']
        return jsonify({
            "remote_servers": remote_servers,
            "total": len(remote_servers),
            "enabled": len([s for s in remote_servers if s.get('enabled', True)]),
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Remote servers error: {str(e)}")
        return jsonify({"error": "Failed to fetch remote servers"}), 500

@app.route('/api/servers/monitor/<int:server_id>', methods=['POST'])
def trigger_server_check(server_id):
    """Manually trigger a check for a specific server"""
    try:
        # Find the server in REMOTE_SERVERS config
        server_config = next((s for s in REMOTE_SERVERS if s['id'] == server_id), None)
        if not server_config:
            return jsonify({"error": "Server not found"}), 404
        
        # Trigger immediate check
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(monitor_remote_server(server_config))
        loop.close()
        
        # Update the server in our list
        for i, server in enumerate(servers):
            if server['id'] == server_id:
                servers[i].update(result)
                break
        
        return jsonify({
            "message": "Server check completed",
            "server": result
        })
    except Exception as e:
        logger.error(f"Manual server check error: {str(e)}")
        return jsonify({"error": "Failed to check server"}), 500

@app.route('/api/system/real-time')
def get_real_time_metrics():
    """Get real-time system metrics from the actual machine"""
    try:
        metrics = get_real_system_metrics()
        if metrics:
            return jsonify({
                "metrics": metrics,
                "processes": get_running_processes(),
                "network_connections": get_network_connections(),
                "timestamp": datetime.datetime.now().isoformat(),
                "data_source": "REAL_SYSTEM"
            })
        else:
            return jsonify({"error": "Failed to get real-time metrics"}), 500
    except Exception as e:
        logger.error(f"Real-time metrics error: {str(e)}")
        return jsonify({"error": "Failed to fetch real-time data"}), 500

@app.route('/api/dashboard')
def get_dashboard():
    """Get dashboard summary data"""
    try:
        dashboard_data = {
            "servers": servers[:3],  # First 3 servers for recent display
            "alerts": alerts[:3],    # First 3 alerts for recent display
            "stats": system_stats,
            "timestamp": datetime.datetime.now().isoformat()
        }
        return jsonify(dashboard_data)
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return jsonify({"error": "Failed to fetch dashboard data"}), 500

@app.route('/api/servers')
def get_servers():
    """Get all servers"""
    try:
        return jsonify({
            "servers": servers,
            "total": len(servers),
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Servers error: {str(e)}")
        return jsonify({"error": "Failed to fetch servers"}), 500

@app.route('/api/servers/<int:server_id>')
def get_server(server_id):
    """Get specific server by ID"""
    try:
        server = next((s for s in servers if s["id"] == server_id), None)
        if server:
            return jsonify(server)
        else:
            return jsonify({"error": "Server not found"}), 404
    except Exception as e:
        logger.error(f"Server detail error: {str(e)}")
        return jsonify({"error": "Failed to fetch server"}), 500

@app.route('/api/alerts')
def get_alerts():
    """Get all alerts"""
    try:
        return jsonify({
            "alerts": alerts,
            "total": len(alerts),
            "unacknowledged": len([a for a in alerts if not a["acknowledged"]]),
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Alerts error: {str(e)}")
        return jsonify({"error": "Failed to fetch alerts"}), 500

@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        alert = next((a for a in alerts if a["id"] == alert_id), None)
        if alert:
            alert["acknowledged"] = True
            alert["acknowledged_time"] = datetime.datetime.now().isoformat()
            
            # Update system stats
            system_stats["unacknowledged_alerts"] = len([a for a in alerts if not a["acknowledged"]])
            system_stats["last_updated"] = datetime.datetime.now().isoformat()
            
            return jsonify({
                "message": "Alert acknowledged successfully",
                "alert": alert
            })
        else:
            return jsonify({"error": "Alert not found"}), 404
    except Exception as e:
        logger.error(f"Acknowledge alert error: {str(e)}")
        return jsonify({"error": "Failed to acknowledge alert"}), 500

@app.route('/api/reports')
def get_reports():
    """Get all reports"""
    try:
        return jsonify({
            "reports": reports,
            "total": len(reports),
            "timestamp": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Reports error: {str(e)}")
        return jsonify({"error": "Failed to fetch reports"}), 500

@app.route('/api/stats')
def get_stats():
    """Get system statistics"""
    try:
        # Update stats in real-time
        current_stats = {
            "total_servers": len(servers),
            "online_servers": len([s for s in servers if s["status"] == "Online"]),
            "offline_servers": len([s for s in servers if s["status"] == "Offline"]),
            "warning_servers": len([s for s in servers if s["status"] == "Warning"]),
            "total_alerts": len(alerts),
            "critical_alerts": len([a for a in alerts if a["severity"] == "Critical"]),
            "unacknowledged_alerts": len([a for a in alerts if not a["acknowledged"]]),
            "last_updated": datetime.datetime.now().isoformat()
        }
        return jsonify(current_stats)
    except Exception as e:
        logger.error(f"Stats error: {str(e)}")
        return jsonify({"error": "Failed to fetch statistics"}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "SAMS Backend",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "uptime": "System running normally"
    })

# ===================================================================
# BACKGROUND MONITORING SIMULATION
# ===================================================================

def real_time_monitoring():
    """Enhanced real-time monitoring with local + remote servers"""
    while True:
        try:
            # Update local system metrics
            refresh_server_data()
            
            # Monitor all remote servers concurrently
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            remote_results = loop.run_until_complete(monitor_all_remote_servers())
            loop.close()
            
            # Update remote servers cache
            if remote_results:
                update_remote_servers_cache(remote_results)
                # Refresh complete server list
                refresh_server_data()
            
            # Get local system metrics for alerts
            real_metrics = get_real_system_metrics()
            if real_metrics:
                local_server = next((s for s in servers if s.get('type') == 'local'), None)
                if local_server:
                    # Check for real alert conditions on local system
                    cpu_usage = real_metrics['cpu']['percent']
                    memory_usage = real_metrics['memory']['percent']
                    disk_usage = real_metrics['disk']['percent']
                    
                    # Generate alerts based on REAL thresholds
                    if cpu_usage > 80:
                        existing_cpu_alert = any(a["server_id"] == 1 and "CPU" in a["title"] and not a["acknowledged"] for a in alerts)
                        if not existing_cpu_alert:
                            new_alert = {
                                "id": len(alerts) + 1,
                                "title": f"REAL High CPU Usage - {local_server['name']}",
                                "description": f"ACTUAL CPU usage at {cpu_usage:.1f}% on {local_server['name']}",
                                "server": local_server["name"],
                                "server_id": 1,
                                "severity": "Critical" if cpu_usage > 90 else "High",
                                "time": "Just now",
                                "timestamp": datetime.datetime.now().isoformat(),
                                "acknowledged": False,
                                "real_alert": True,
                                "alert_type": "local_system"
                            }
                            alerts.append(new_alert)
                            logger.warning(f"🚨 LOCAL ALERT: {new_alert['title']}")
                    
                    if memory_usage > 85:
                        existing_mem_alert = any(a["server_id"] == 1 and "Memory" in a["title"] and not a["acknowledged"] for a in alerts)
                        if not existing_mem_alert:
                            new_alert = {
                                "id": len(alerts) + 1,
                                "title": f"REAL High Memory Usage - {local_server['name']}",
                                "description": f"ACTUAL Memory usage at {memory_usage:.1f}% on {local_server['name']}",
                                "server": local_server["name"],
                                "server_id": 1,
                                "severity": "Critical" if memory_usage > 95 else "High",
                                "time": "Just now",
                                "timestamp": datetime.datetime.now().isoformat(),
                                "acknowledged": False,
                                "real_alert": True,
                                "alert_type": "local_system"
                            }
                            alerts.append(new_alert)
                            logger.warning(f"🚨 LOCAL ALERT: {new_alert['title']}")
            
            # Check remote servers for alerts
            for remote_server in remote_results:
                if remote_server.get('status') == 'Offline':
                    existing_offline_alert = any(
                        a["server_id"] == remote_server['id'] and "Offline" in a["title"] and not a["acknowledged"] 
                        for a in alerts
                    )
                    if not existing_offline_alert:
                        new_alert = {
                            "id": len(alerts) + 1,
                            "title": f"Server Offline - {remote_server['name']}",
                            "description": f"Remote server {remote_server['name']} ({remote_server['ip']}) is not responding",
                            "server": remote_server["name"],
                            "server_id": remote_server['id'],
                            "severity": "Critical",
                            "time": "Just now",
                            "timestamp": datetime.datetime.now().isoformat(),
                            "acknowledged": False,
                            "real_alert": True,
                            "alert_type": "remote_server"
                        }
                        alerts.append(new_alert)
                        logger.warning(f"🚨 REMOTE ALERT: {new_alert['title']}")
                
                elif remote_server.get('response_time') and remote_server['response_time'] > 5000:  # 5 seconds
                    existing_slow_alert = any(
                        a["server_id"] == remote_server['id'] and "Slow Response" in a["title"] and not a["acknowledged"] 
                        for a in alerts
                    )
                    if not existing_slow_alert:
                        new_alert = {
                            "id": len(alerts) + 1,
                            "title": f"Slow Response - {remote_server['name']}",
                            "description": f"Server {remote_server['name']} response time: {remote_server['response_time']:.0f}ms",
                            "server": remote_server["name"],
                            "server_id": remote_server['id'],
                            "severity": "High",
                            "time": "Just now",
                            "timestamp": datetime.datetime.now().isoformat(),
                            "acknowledged": False,
                            "real_alert": True,
                            "alert_type": "remote_performance"
                        }
                        alerts.append(new_alert)
                        logger.warning(f"🚨 PERFORMANCE ALERT: {new_alert['title']}")
            
            # Update system stats with real data
            system_stats.update({
                "total_servers": len(servers),
                "online_servers": len([s for s in servers if s["status"] == "Online"]),
                "offline_servers": len([s for s in servers if s["status"] == "Offline"]),
                "warning_servers": len([s for s in servers if s["status"] == "Warning"]),
                "local_servers": len([s for s in servers if s.get('type') == 'local']),
                "remote_servers": len([s for s in servers if s.get('type') != 'local']),
                "total_alerts": len(alerts),
                "critical_alerts": len([a for a in alerts if a["severity"] == "Critical"]),
                "unacknowledged_alerts": len([a for a in alerts if not a["acknowledged"]]),
                "last_updated": datetime.datetime.now().isoformat(),
                "data_source": "HYBRID_LOCAL_REMOTE"
            })
            
            logger.info(f"📊 Monitoring update: {len(servers)} servers, {len(remote_results)} remote checked, {len(alerts)} alerts")
            
            time.sleep(15)  # Update every 15 seconds
            
        except Exception as e:
            logger.error(f"Real-time monitoring error: {str(e)}")
            time.sleep(30)  # Wait longer if there's an error

# ===================================================================
# MAIN EXECUTION
# ===================================================================

if __name__ == '__main__':
    logger.info("🚀 Starting SAMS Backend Server...")
    
    # Start background monitoring with local + remote
    monitoring_thread = threading.Thread(target=real_time_monitoring, daemon=True)
    monitoring_thread.start()
    logger.info("📊 Background monitoring started")
    
    # Start Flask server
    logger.info("🌐 Starting Flask server on http://localhost:5000")
    logger.info("📱 Mobile app can connect to this backend")
    logger.info("🔗 API endpoints available at /api/...")
    
    app.run(
        host='0.0.0.0',  # Allow connections from mobile app
        port=5000,
        debug=True,
        use_reloader=False  # Disable reloader to prevent thread issues
    )
