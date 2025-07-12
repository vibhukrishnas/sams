#!/usr/bin/env python3
"""
🔍 SAMS Installation Verification Script
Verifies that SAMS monitoring is properly installed and functional
"""

import sys
import requests
import socket
import time
import json
from datetime import datetime

class SAMSVerifier:
    def __init__(self, target_ip, port=8080):
        self.target_ip = target_ip
        self.port = port
        self.base_url = f"http://{target_ip}:{port}"
        
    def log(self, message, status="INFO"):
        """Log verification progress"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        status_icon = {"INFO": "ℹ️", "SUCCESS": "✅", "WARNING": "⚠️", "ERROR": "❌"}
        print(f"[{timestamp}] {status_icon.get(status, 'ℹ️')} {message}")
        
    def test_network_connectivity(self):
        """Test basic network connectivity"""
        self.log(f"Testing network connectivity to {self.target_ip}...")
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((self.target_ip, self.port))
            sock.close()
            
            if result == 0:
                self.log(f"Port {self.port} is open and accessible", "SUCCESS")
                return True
            else:
                self.log(f"Port {self.port} is not accessible", "ERROR")
                return False
        except Exception as e:
            self.log(f"Network connectivity test failed: {e}", "ERROR")
            return False
            
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        self.log("Testing health check endpoint...")
        
        try:
            response = requests.get(f"{self.base_url}/api/v1/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log("Health endpoint responding correctly", "SUCCESS")
                self.log(f"  Hostname: {data.get('hostname', 'Unknown')}")
                self.log(f"  Status: {data.get('status', 'Unknown')}")
                self.log(f"  Version: {data.get('version', 'Unknown')}")
                return True, data
            else:
                self.log(f"Health endpoint returned status {response.status_code}", "ERROR")
                return False, None
                
        except requests.exceptions.ConnectionError:
            self.log("Cannot connect to health endpoint - service may not be running", "ERROR")
            return False, None
        except requests.exceptions.Timeout:
            self.log("Health endpoint request timed out", "ERROR")
            return False, None
        except Exception as e:
            self.log(f"Health endpoint test failed: {e}", "ERROR")
            return False, None
            
    def test_metrics_endpoint(self):
        """Test the metrics endpoint"""
        self.log("Testing metrics endpoint...")
        
        try:
            response = requests.get(f"{self.base_url}/api/v1/metrics", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log("Metrics endpoint responding correctly", "SUCCESS")
                self.log(f"  CPU Usage: {data.get('cpu', 'N/A')}%")
                self.log(f"  Memory Usage: {data.get('memory', {}).get('used', 'N/A')}%")
                self.log(f"  Disk Usage: {data.get('disk', {}).get('percent', 'N/A'):.1f}%")
                return True, data
            else:
                self.log(f"Metrics endpoint returned status {response.status_code}", "WARNING")
                return False, None
                
        except Exception as e:
            self.log(f"Metrics endpoint test failed: {e}", "WARNING")
            return False, None
            
    def test_services_endpoint(self):
        """Test the services endpoint"""
        self.log("Testing services endpoint...")
        
        try:
            response = requests.get(f"{self.base_url}/api/v1/services", timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('services', [])
                self.log(f"Services endpoint responding correctly", "SUCCESS")
                self.log(f"  Found {len(services)} services")
                return True, data
            else:
                self.log(f"Services endpoint returned status {response.status_code}", "WARNING")
                return False, None
                
        except Exception as e:
            self.log(f"Services endpoint test failed: {e}", "WARNING")
            return False, None
            
    def test_performance(self):
        """Test API performance"""
        self.log("Testing API performance...")
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/api/v1/health", timeout=5)
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = (end_time - start_time) * 1000
                self.log(f"API response time: {response_time:.2f}ms", "SUCCESS")
                
                if response_time < 1000:
                    self.log("API performance is excellent", "SUCCESS")
                elif response_time < 3000:
                    self.log("API performance is acceptable", "SUCCESS")
                else:
                    self.log("API performance is slow", "WARNING")
                    
                return True, response_time
            else:
                return False, None
                
        except Exception as e:
            self.log(f"Performance test failed: {e}", "ERROR")
            return False, None
            
    def run_full_verification(self):
        """Run complete verification suite"""
        self.log("🔍 Starting SAMS Installation Verification")
        self.log("=" * 50)
        
        results = {
            "network": False,
            "health": False,
            "metrics": False,
            "services": False,
            "performance": False,
            "overall": False
        }
        
        # Test 1: Network Connectivity
        results["network"] = self.test_network_connectivity()
        
        if not results["network"]:
            self.log("❌ Network connectivity failed - cannot proceed with other tests", "ERROR")
            return results
            
        # Test 2: Health Endpoint
        results["health"], health_data = self.test_health_endpoint()
        
        # Test 3: Metrics Endpoint
        results["metrics"], metrics_data = self.test_metrics_endpoint()
        
        # Test 4: Services Endpoint
        results["services"], services_data = self.test_services_endpoint()
        
        # Test 5: Performance
        results["performance"], response_time = self.test_performance()
        
        # Overall Assessment
        critical_tests = ["network", "health"]
        optional_tests = ["metrics", "services", "performance"]
        
        critical_passed = all(results[test] for test in critical_tests)
        optional_passed = sum(results[test] for test in optional_tests)
        
        results["overall"] = critical_passed and optional_passed >= 2
        
        # Summary
        self.log("=" * 50)
        self.log("📊 VERIFICATION SUMMARY")
        self.log("=" * 50)
        
        for test, passed in results.items():
            if test != "overall":
                status = "PASS" if passed else "FAIL"
                icon = "✅" if passed else "❌"
                self.log(f"{icon} {test.upper()}: {status}")
        
        self.log("=" * 50)
        
        if results["overall"]:
            self.log("🎉 SAMS INSTALLATION VERIFICATION SUCCESSFUL!", "SUCCESS")
            self.log(f"🌐 SAMS monitor is fully functional at: {self.base_url}")
            self.log("🔗 Ready for SAMS mobile app connection!")
        else:
            self.log("❌ SAMS INSTALLATION VERIFICATION FAILED!", "ERROR")
            self.log("🔧 Please check the failed tests and resolve issues")
            
        return results

def main():
    """Main verification function"""
    if len(sys.argv) < 2:
        print("Usage: python verify_sams_installation.py <target_ip> [port]")
        print("Example: python verify_sams_installation.py 192.168.1.100")
        sys.exit(1)
        
    target_ip = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    
    verifier = SAMSVerifier(target_ip, port)
    results = verifier.run_full_verification()
    
    # Exit with appropriate code
    sys.exit(0 if results["overall"] else 1)

if __name__ == "__main__":
    main()
