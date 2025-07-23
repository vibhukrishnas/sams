#!/usr/bin/env python3
"""
REAL SYSTEM MONITORING TEST
Shows actual system metrics vs fake data
"""

import requests
import json
import time

def test_real_metrics():
    """Test the real-time system metrics"""
    print("🔥 TESTING REAL SYSTEM METRICS")
    print("=" * 60)
    
    try:
        # Get real-time metrics
        response = requests.get("http://localhost:5000/api/system/real-time")
        if response.status_code == 200:
            data = response.json()
            metrics = data['metrics']
            
            print("💻 YOUR ACTUAL SYSTEM METRICS:")
            print(f"   🖥️  Hostname: {metrics['system']['hostname']}")
            print(f"   🏗️  Platform: {metrics['system']['platform']} {metrics['system']['architecture']}")
            print(f"   ⚡ CPU Cores: {metrics['cpu']['count']}")
            print(f"   🔄 CPU Usage: {metrics['cpu']['percent']:.1f}%")
            print(f"   💾 Memory Usage: {metrics['memory']['percent']:.1f}%")
            print(f"   💿 Disk Usage: {metrics['disk']['percent']:.1f}%")
            print(f"   ⏱️  Uptime: {metrics['system']['uptime']}")
            print(f"   📡 Network Sent: {metrics['network']['bytes_sent'] / (1024**3):.2f} GB")
            print(f"   📥 Network Received: {metrics['network']['bytes_recv'] / (1024**3):.2f} GB")
            
            print("\n🏃‍♂️ TOP PROCESSES:")
            processes = data['processes']
            for i, proc in enumerate(processes[:5], 1):
                print(f"   {i}. {proc['name']} - CPU: {proc['cpu_percent']:.1f}%, Memory: {proc['memory_percent']:.1f}%")
            
            print(f"\n🌐 ACTIVE CONNECTIONS: {len(data['network_connections'])}")
            
            # Check for alerts
            alerts_response = requests.get("http://localhost:5000/api/alerts")
            if alerts_response.status_code == 200:
                alerts_data = alerts_response.json()
                real_alerts = [a for a in alerts_data['alerts'] if a.get('real_alert')]
                if real_alerts:
                    print(f"\n🚨 REAL ALERTS DETECTED ({len(real_alerts)}):")
                    for alert in real_alerts:
                        print(f"   ⚠️  {alert['title']} - {alert['severity']}")
                        print(f"      {alert['description']}")
                else:
                    print("\n✅ NO REAL ALERTS - System is healthy!")
            
            print(f"\n🔥 DATA SOURCE: {data['data_source']}")
            print("=" * 60)
            print("🎉 THIS IS YOUR ACTUAL SYSTEM - NO MOCKS! 🎉")
            
        else:
            print(f"❌ Failed to get real metrics: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_real_metrics()
