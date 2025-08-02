"""Authentication utilities for SAMS Agent"""

import os
import json
import time
import hmac
import hashlib
import requests
from typing import Dict, Any

class AgentAuth:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config["api_key"]
        self.server_url = config["server_url"]
        self.agent_id = config["agent_id"]
        self.token = None
        self.token_expiry = 0
    
    def authenticate(self) -> None:
        """Authenticate with the SAMS server"""
        if self.is_token_valid():
            return
        
        timestamp = str(int(time.time()))
        signature = self._generate_signature(timestamp)
        
        auth_data = {
            "agent_id": self.agent_id,
            "timestamp": timestamp,
            "signature": signature
        }
        
        response = requests.post(
            f"{self.server_url}/api/v1/agent/auth",
            json=auth_data,
            verify=self.config.get("verify_ssl", True)
        )
        
        if response.status_code == 200:
            auth_response = response.json()
            self.token = auth_response["token"]
            self.token_expiry = time.time() + auth_response["expires_in"]
        else:
            raise Exception(f"Authentication failed: {response.text}")
    
    def is_token_valid(self) -> bool:
        """Check if the current token is valid"""
        return bool(self.token and time.time() < self.token_expiry)
    
    def get_auth_header(self) -> Dict[str, str]:
        """Get authentication header for API requests"""
        if not self.is_token_valid():
            self.authenticate()
        return {"Authorization": f"Bearer {self.token}"}
    
    def _generate_signature(self, timestamp: str) -> str:
        """Generate HMAC signature for authentication"""
        message = f"{self.agent_id}:{timestamp}"
        signature = hmac.new(
            self.api_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
