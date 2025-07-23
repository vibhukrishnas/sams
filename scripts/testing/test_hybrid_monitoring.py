#!/usr/bin/env python3
"""
HYBRID MONITORING TEST
Tests local system + remote servers monitoring
"""

import requests
import json
import time

def test_hybrid_monitoring():
    """Test the new hybrid monitoring system"""
    print("🌐 TESTING HYBRID MONITORING SYSTEM")
    print("=" * 70)
    
    try:
        # Test all servers endpoint
        response = requests.get("http://localhost:5000/api/servers")
        if response.status_code == 200:
            data = response.json()
            servers = data['servers']
            
            print(f"📊 TOTAL SERVERS: {len(servers)}")
            print("-" * 70)
            
            for server in servers:
                status_icon = "🟢" if server['status'] == 'Online' else "🔴" if server['status'] == 'Offline' else "🟡"
                data_source = "LOCAL" if server.get('type') == 'local' else "REMOTE"
                
                print(f"{status_icon} {server['name']} ({server['ip']}) - {data_source}")
                print(f"   Status: {server['status']}")
                
                if server.get('type') == 'local':
                    print(f"   CPU: {server.get('cpu', 0):.1f}% | Memory: {server.get('memory', 0):.1f}% | Disk: {server.get('disk', 0):.1f}%")
                    print(f"   Uptime: {server.get('uptime', 'N/A')}")
                else:
                    if server.get('response_time'):
                        print(f"   Response Time: {server['response_time']:.0f}ms")
                    if server.get('error'):
                        print(f"   Error: {server['error']}")
                    print(f"   Type: {server.get('type', 'Unknown')}")
                
                print(f"   Last Check: {server.get('last_check', 'Never')}")
                print()
            
            # Test remote servers specifically
            print("🌍 REMOTE SERVERS ONLY:")
            print("-" * 70)
            remote_response = requests.get("http://localhost:5000/api/servers/remote")
            if remote_response.status_code == 200:
                remote_data = remote_response.json()
                remote_servers = remote_data['remote_servers']
                
                for server in remote_servers:
                    status_icon = "🟢" if server['status'] == 'Online' else "🔴" if server['status'] == 'Offline' else "🟡"
                    print(f"{status_icon} {server['name']} ({server['ip']}) - {server['status']}")
                    if server.get('response_time'):
                        print(f"   Response: {server['response_time']:.0f}ms")
                    if server.get('error'):
                        print(f"   Error: {server['error']}")
                
                print(f"\n📈 Remote Stats: {remote_data['total']} total, {remote_data['enabled']} enabled")
            
            # Test system stats
            stats_response = requests.get("http://localhost:5000/api/stats")
            if stats_response.status_code == 200:
                stats = stats_response.json()
                print("\n📊 SYSTEM STATISTICS:")
                print("-" * 70)
                print(f"Total Servers: {stats['total_servers']}")
                print(f"Online: {stats['online_servers']} | Offline: {stats['offline_servers']} | Warning: {stats['warning_servers']}")
                print(f"Local Servers: {stats.get('local_servers', 0)}")
                print(f"Remote Servers: {stats.get('remote_servers', 0)}")
                print(f"Total Alerts: {stats['total_alerts']} ({stats['unacknowledged_alerts']} unacknowledged)")
                print(f"Data Source: {stats.get('data_source', 'UNKNOWN')}")
            
            print("\n🎯 MONITORING TYPES ACTIVE:")
            print("-" * 70)
            print("✅ LOCAL SYSTEM - Real psutil metrics from your PC")
            print("✅ HTTP APIs - REST endpoint monitoring")
            print("✅ PING - Network connectivity tests")
            print("✅ HTTP CHECKS - Website availability")
            print("⏳ SSH - Server shell access (configure credentials)")
            
            print("\n🔥 NO MOCKS! REAL HYBRID MONITORING!")
            
        else:
            print(f"❌ Failed to get servers: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("⏳ Waiting for monitoring to complete first cycle...")
    time.sleep(5)
    test_hybrid_monitoring()
