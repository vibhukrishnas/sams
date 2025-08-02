"""Data transport utilities for SAMS Agent"""

import json
import gzip
import base64
import time
from typing import Dict, Any
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

class SecureTransport:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.compression_level = config.get("compression_level", 6)
        self.max_buffer_size = config.get("max_buffer_size", 1000)
        self.timeout = config.get("timeout", 30)
        
        # Configure session with retries
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504]
        )
        self.session.mount('http://', HTTPAdapter(max_retries=retries))
        self.session.mount('https://', HTTPAdapter(max_retries=retries))
    
    def compress(self, data: Dict[str, Any]) -> str:
        """Compress data using gzip"""
        json_str = json.dumps(data)
        compressed = gzip.compress(
            json_str.encode(),
            compresslevel=self.compression_level
        )
        return base64.b64encode(compressed).decode()
    
    def decompress(self, compressed_data: str) -> Dict[str, Any]:
        """Decompress data"""
        decoded = base64.b64decode(compressed_data)
        decompressed = gzip.decompress(decoded)
        return json.loads(decompressed)
    
    def send(self, data: Dict[str, Any], endpoint: str = "/api/v1/metrics") -> None:
        """Send data to the server"""
        headers = {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
            "User-Agent": "SAMS-Agent/1.0"
        }
        
        try:
            response = self.session.post(
                endpoint,
                data=self.compress(data),
                headers=headers,
                timeout=self.timeout
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to send data: {str(e)}")
    
    def receive(self, endpoint: str) -> Dict[str, Any]:
        """Receive data from the server"""
        try:
            response = self.session.get(
                endpoint,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            if response.headers.get("Content-Encoding") == "gzip":
                return self.decompress(response.text)
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to receive data: {str(e)}")
