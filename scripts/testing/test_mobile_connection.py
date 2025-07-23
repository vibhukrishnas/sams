#!/usr/bin/env python3
"""
Test Mobile App Backend Connection
Quick test to ensure mobile app can connect to backend
"""

import requests
import json

def test_mobile_backend_connection():
    """Test all endpoints the mobile app will use"""
    base_url = "http://192.168.0.101:5000/api"
    
    print("📱 TESTING MOBILE APP BACKEND CONNECTION")
    print("=" * 60)
    
    endpoints = [
        ("Dashboard", "/dashboard"),
        ("All Servers", "/servers"),
        ("All Alerts", "/alerts"),
        ("Reports", "/reports"),
        ("System Stats", "/stats"),
        ("Real-time Metrics", "/system/real-time")
    ]
    
    for name, endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {name}: OK")
                
                # Show some key data
                if 'servers' in data:
                    print(f"   📊 Servers: {len(data['servers'])}")
                if 'alerts' in data:
                    print(f"   🚨 Alerts: {len(data['alerts'])}")
                if 'total_servers' in data:
                    print(f"   📈 Stats: {data['total_servers']} servers, {data.get('total_alerts', 0)} alerts")
                if 'metrics' in data:
                    cpu = data['metrics']['cpu']['percent']
                    memory = data['metrics']['memory']['percent']
                    print(f"   💻 Live: CPU {cpu:.1f}%, Memory {memory:.1f}%")
                    
            else:
                print(f"❌ {name}: HTTP {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"⏰ {name}: Timeout")
        except Exception as e:
            print(f"❌ {name}: Error - {e}")
    
    print("\n🔗 CORS Headers Check:")
    try:
        response = requests.get(f"{base_url}/dashboard")
        cors_header = response.headers.get('Access-Control-Allow-Origin', 'Not Found')
        print(f"   Access-Control-Allow-Origin: {cors_header}")
        if cors_header == '*':
            print("   ✅ CORS enabled for mobile app")
        else:
            print("   ⚠️ CORS might not be properly configured")
    except Exception as e:
        print(f"   ❌ CORS check failed: {e}")
    
    print("\n📱 Mobile App Connection Status:")
    print(f"   Backend URL: {base_url}")
    print(f"   Web App: http://localhost:8082")
    print(f"   Mobile URL: exp://192.168.0.101:8082")
    print("   🚀 Ready for mobile app integration!")

if __name__ == "__main__":
    test_mobile_backend_connection()
