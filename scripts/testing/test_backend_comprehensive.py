#!/usr/bin/env python3
"""
SAMS Backend Test Script
Quick test to verify the backend API is working correctly
"""

import requests
import json
import time

def test_backend():
    """Test all backend endpoints"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing SAMS Backend API...")
    print("=" * 50)
    
    # Test health check
    try:
        response = requests.get(f"{base_url}/api/health")
        if response.status_code == 200:
            print("✅ Health Check: PASSED")
            print(f"   Response: {response.json()['status']}")
        else:
            print("❌ Health Check: FAILED")
    except Exception as e:
        print(f"❌ Health Check: ERROR - {e}")
    
    # Test dashboard
    try:
        response = requests.get(f"{base_url}/api/dashboard")
        if response.status_code == 200:
            data = response.json()
            print("✅ Dashboard API: PASSED")
            print(f"   Servers: {len(data['servers'])}")
            print(f"   Alerts: {len(data['alerts'])}")
        else:
            print("❌ Dashboard API: FAILED")
    except Exception as e:
        print(f"❌ Dashboard API: ERROR - {e}")
    
    # Test servers
    try:
        response = requests.get(f"{base_url}/api/servers")
        if response.status_code == 200:
            data = response.json()
            print("✅ Servers API: PASSED")
            print(f"   Total servers: {data['total']}")
        else:
            print("❌ Servers API: FAILED")
    except Exception as e:
        print(f"❌ Servers API: ERROR - {e}")
    
    # Test alerts
    try:
        response = requests.get(f"{base_url}/api/alerts")
        if response.status_code == 200:
            data = response.json()
            print("✅ Alerts API: PASSED")
            print(f"   Total alerts: {data['total']}")
            print(f"   Unacknowledged: {data['unacknowledged']}")
        else:
            print("❌ Alerts API: FAILED")
    except Exception as e:
        print(f"❌ Alerts API: ERROR - {e}")
    
    # Test reports
    try:
        response = requests.get(f"{base_url}/api/reports")
        if response.status_code == 200:
            data = response.json()
            print("✅ Reports API: PASSED")
            print(f"   Total reports: {data['total']}")
        else:
            print("❌ Reports API: FAILED")
    except Exception as e:
        print(f"❌ Reports API: ERROR - {e}")
    
    # Test stats
    try:
        response = requests.get(f"{base_url}/api/stats")
        if response.status_code == 200:
            data = response.json()
            print("✅ Stats API: PASSED")
            print(f"   Online servers: {data['online_servers']}")
            print(f"   Critical alerts: {data['critical_alerts']}")
        else:
            print("❌ Stats API: FAILED")
    except Exception as e:
        print(f"❌ Stats API: ERROR - {e}")
    
    print("=" * 50)
    print("🎉 Backend test completed!")

if __name__ == "__main__":
    print("⏳ Waiting 3 seconds for backend to start...")
    time.sleep(3)
    test_backend()
