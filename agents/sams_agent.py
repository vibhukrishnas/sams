"""SAMS Monitoring Agent - Python Implementation

This module provides real-time system monitoring capabilities with configurable
data collection intervals, retry logic, and secure data transmission.

Supported Metrics:
- CPU Usage and Stats
- Memory Usage
- Disk I/O
- Network Traffic
- Process Monitoring
"""

import psutil
import cpuinfo
import netifaces
import json
import time
import logging
from typing import Dict, Any

from collectors.cpu import CPUCollector
from collectors.memory import MemoryCollector
from collectors.disk import DiskCollector
from collectors.network import NetworkCollector
from collectors.process import ProcessCollector
from utils.auth import AgentAuth
from utils.transport import SecureTransport

class SAMSAgent:
    def __init__(self, config_path: str = "config/agent.config.json"):
        """Initialize SAMS monitoring agent with configuration."""
        self.config = self._load_config(config_path)
        self.auth = AgentAuth(self.config["auth"])
        self.transport = SecureTransport(self.config["transport"])
        
        # Initialize collectors
        self.collectors = {
            "cpu": CPUCollector(),
            "memory": MemoryCollector(),
            "disk": DiskCollector(),
            "network": NetworkCollector(),
            "process": ProcessCollector()
        }
        
        self.collection_interval = self.config.get("collection_interval", 60)
        self.retry_attempts = self.config.get("retry_attempts", 3)
        self.compress_data = self.config.get("compress_data", True)
        
        logging.basicConfig(level=self.config.get("log_level", "INFO"))
        self.logger = logging.getLogger("SAMSAgent")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load agent configuration from file."""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            raise Exception(f"Failed to load config: {str(e)}")

    def collect_metrics(self) -> Dict[str, Any]:
        """Collect all system metrics."""
        metrics = {}
        for name, collector in self.collectors.items():
            try:
                metrics[name] = collector.collect()
            except Exception as e:
                self.logger.error(f"Error collecting {name} metrics: {str(e)}")
        return metrics

    def start(self):
        """Start the monitoring agent."""
        self.logger.info("Starting SAMS monitoring agent...")
        self.auth.authenticate()
        
        while True:
            try:
                metrics = self.collect_metrics()
                if self.compress_data:
                    metrics = self.transport.compress(metrics)
                
                for attempt in range(self.retry_attempts):
                    try:
                        self.transport.send(metrics)
                        break
                    except Exception as e:
                        if attempt == self.retry_attempts - 1:
                            self.logger.error(f"Failed to send metrics after {self.retry_attempts} attempts: {str(e)}")
                        else:
                            self.logger.warning(f"Retry {attempt + 1}/{self.retry_attempts} to send metrics")
                            time.sleep(2 ** attempt)  # Exponential backoff
                
                time.sleep(self.collection_interval)
                
            except Exception as e:
                self.logger.error(f"Error in main loop: {str(e)}")
                time.sleep(5)  # Wait before retrying

if __name__ == "__main__":
    agent = SAMSAgent()
    agent.start()
