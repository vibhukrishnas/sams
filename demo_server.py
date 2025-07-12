#!/usr/bin/env python3
"""
🚀 SAMS Demo Server - Quick API Server for Testing
Run this to test SAMS app with real API integration
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import psutil
import datetime
import random
import time
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native

# Global variables for demo data
server_metrics = {}
alerts_list = []
last_update = datetime.datetime.now()

def update_metrics():
    """Update server metrics every 30 seconds"""
    global server_metrics, alerts_list, last_update
    
    while True:
        try:
            # Get real system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            server_metrics = {
                "cpu": round(cpu_percent, 1),
                "memory": round(memory.percent, 1),
                "disk": round((disk.used / disk.total) * 100, 1),
                "uptime": str(datetime.datetime.now() - datetime.datetime.fromtimestamp(psutil.boot_time())),
                "last_updated": datetime.datetime.now().isoformat()
            }
            
            # Generate alerts based on thresholds
            alerts_list = []
            alert_id = 1
            
            if cpu_percent > 80:
                alerts_list.append({
                    "id": f"alert-{alert_id}",
                    "title": "High CPU Usage",
                    "message": f"CPU usage is {cpu_percent}% - exceeds 80% threshold",
                    "severity": "Critical" if cpu_percent > 90 else "Warning",
                    "time": datetime.datetime.now().isoformat(),
                    "source": "System Monitor",
                    "acknowledged": False
                })
                alert_id += 1
            
            if memory.percent > 85:
                alerts_list.append({
                    "id": f"alert-{alert_id}",
                    "title": "High Memory Usage",
                    "message": f"Memory usage is {memory.percent}% - exceeds 85% threshold",
                    "severity": "Critical" if memory.percent > 95 else "Warning",
                    "time": datetime.datetime.now().isoformat(),
                    "source": "Memory Monitor",
                    "acknowledged": False
                })
                alert_id += 1
            
            # Add a demo alert if no real alerts
            if not alerts_list:
                alerts_list.append({
                    "id": "demo-alert",
                    "title": "SAMS Demo Alert",
                    "message": "This is a demonstration alert from your SAMS demo server",
                    "severity": "Info",
                    "time": datetime.datetime.now().isoformat(),
                    "source": "Demo Server",
                    "acknowledged": False
                })
            
            last_update = datetime.datetime.now()
            print(f"📊 Metrics updated: CPU {cpu_percent}%, Memory {memory.percent}%, Alerts: {len(alerts_list)}")
            
        except Exception as e:
            print(f"❌ Error updating metrics: {e}")
        
        time.sleep(30)  # Update every 30 seconds

@app.route('/')
def home():
    """API status page"""
    return jsonify({
        "service": "SAMS Demo API Server",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat(),
        "endpoints": [
            "/api/v1/servers",
            "/api/v1/alerts", 
            "/api/v1/health"
        ]
    })

@app.route('/api/v1/servers')
def get_servers():
    """Get server information"""
    try:
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        servers = [{
            "id": "srv-001",
            "name": f"Demo Server ({hostname})",
            "ip": local_ip,
            "status": "online",
            "cpu": server_metrics.get("cpu", 0),
            "memory": server_metrics.get("memory", 0),
            "disk": server_metrics.get("disk", 0),
            "uptime": server_metrics.get("uptime", "Unknown"),
            "location": "Demo Environment",
            "lastUpdated": server_metrics.get("last_updated", datetime.datetime.now().isoformat())
        }]
        
        print(f"📡 Servers API called - returning {len(servers)} servers")
        return jsonify({"servers": servers})
        
    except Exception as e:
        print(f"❌ Error in servers API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/alerts')
def get_alerts():
    """Get current alerts"""
    try:
        print(f"🚨 Alerts API called - returning {len(alerts_list)} alerts")
        return jsonify({"alerts": alerts_list})
        
    except Exception as e:
        print(f"❌ Error in alerts API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/health')
def health_check():
    """Health check endpoint"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.datetime.now().isoformat(),
            "uptime": server_metrics.get("uptime", "Unknown"),
            "services": {
                "api": "online",
                "monitoring": "online",
                "database": "online"
            },
            "metrics": {
                "cpu": server_metrics.get("cpu", 0),
                "memory": server_metrics.get("memory", 0),
                "disk": server_metrics.get("disk", 0)
            }
        }
        
        print("💓 Health check called")
        return jsonify(health_status)
        
    except Exception as e:
        print(f"❌ Error in health check: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/notifications', methods=['POST'])
def send_notification():
    """Handle notification requests from SAMS"""
    try:
        data = request.get_json()
        print(f"📬 Notification received: {data}")
        
        # Simulate notification processing
        response = {
            "success": True,
            "messageId": f"msg-{int(time.time())}",
            "timestamp": datetime.datetime.now().isoformat(),
            "recipient": data.get("recipient", "unknown"),
            "type": data.get("type", "unknown")
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error processing notification: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting SAMS Demo API Server...")
    print("📊 Initializing system monitoring...")
    
    # Start metrics update thread
    metrics_thread = threading.Thread(target=update_metrics, daemon=True)
    metrics_thread.start()
    
    # Wait a moment for initial metrics
    time.sleep(2)
    
    print("✅ Demo server ready!")
    print("🌐 API endpoints available:")
    print("   - http://localhost:8080/api/v1/servers")
    print("   - http://localhost:8080/api/v1/alerts") 
    print("   - http://localhost:8080/api/v1/health")
    print("\n📱 Update SAMS app with: API_BASE_URL = 'http://YOUR_IP:8080'")
    print("🔧 Replace YOUR_IP with your actual IP address")
    print("\n🎯 Ready for SAMS app connection!")
    
    # Run the server
    app.run(host='0.0.0.0', port=8080, debug=False)
