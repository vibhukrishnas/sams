#!/usr/bin/env python3
"""
SAMS Python Monitoring Agent
Lightweight monitoring agent for system metrics collection
"""

import asyncio
import json
import logging
import platform
import psutil
import time
import aiohttp
import argparse
from datetime import datetime
from typing import Dict, Any, Optional
import signal
import sys
import os

class SAMSAgent:
    """SAMS Python Monitoring Agent"""
    
    def __init__(self, config_file: str = "agent_config.json"):
        self.config = self.load_config(config_file)
        self.running = False
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Setup logging
        logging.basicConfig(
            level=getattr(logging, self.config.get('log_level', 'INFO')),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.config.get('log_file', 'sams_agent.log')),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('SAMSAgent')
        
        # Agent info
        self.agent_id = self.config.get('agent_id', f"python-agent-{platform.node()}")
        self.server_url = self.config.get('server_url', 'http://localhost:8080')
        self.collection_interval = self.config.get('collection_interval', 30)
        self.api_key = self.config.get('api_key', '')
        
        self.logger.info(f"SAMS Python Agent initialized: {self.agent_id}")

    def load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        default_config = {
            "server_url": "http://localhost:8080",
            "collection_interval": 30,
            "log_level": "INFO",
            "log_file": "sams_agent.log",
            "metrics": {
                "cpu": True,
                "memory": True,
                "disk": True,
                "network": True,
                "processes": True
            }
        }
        
        try:
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    default_config.update(config)
        except Exception as e:
            print(f"Warning: Could not load config file {config_file}: {e}")
            print("Using default configuration")
        
        return default_config

    async def start(self):
        """Start the monitoring agent"""
        self.logger.info("Starting SAMS Python Agent...")
        self.running = True
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Create HTTP session
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(timeout=timeout)
        
        try:
            # Register agent with server
            await self.register_agent()
            
            # Start metrics collection loop
            await self.metrics_collection_loop()
            
        except Exception as e:
            self.logger.error(f"Agent error: {e}")
        finally:
            await self.cleanup()

    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        self.running = False

    async def register_agent(self):
        """Register agent with SAMS server"""
        registration_data = {
            "agentId": self.agent_id,
            "agentType": "python",
            "hostname": platform.node(),
            "platform": platform.platform(),
            "pythonVersion": platform.python_version(),
            "capabilities": list(self.config.get('metrics', {}).keys()),
            "registeredAt": datetime.utcnow().isoformat()
        }
        
        try:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.post(
                f"{self.server_url}/api/v1/agents/register",
                json=registration_data,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    self.logger.info(f"Agent registered successfully: {result}")
                else:
                    self.logger.error(f"Failed to register agent: {response.status}")
                    
        except Exception as e:
            self.logger.error(f"Registration error: {e}")

    async def metrics_collection_loop(self):
        """Main metrics collection loop"""
        self.logger.info("Starting metrics collection loop...")
        
        while self.running:
            try:
                # Collect metrics
                metrics = await self.collect_metrics()
                
                # Send metrics to server
                await self.send_metrics(metrics)
                
                # Wait for next collection interval
                await asyncio.sleep(self.collection_interval)
                
            except Exception as e:
                self.logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(5)  # Short delay before retry

    async def collect_metrics(self) -> Dict[str, Any]:
        """Collect system metrics"""
        metrics = {
            "agentId": self.agent_id,
            "timestamp": datetime.utcnow().isoformat(),
            "hostname": platform.node(),
            "metrics": {}
        }
        
        enabled_metrics = self.config.get('metrics', {})
        
        try:
            # CPU metrics
            if enabled_metrics.get('cpu', True):
                cpu_percent = psutil.cpu_percent(interval=1)
                cpu_count = psutil.cpu_count()
                load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
                
                metrics["metrics"]["cpu"] = {
                    "usage_percent": cpu_percent,
                    "count": cpu_count,
                    "load_average": {
                        "1min": load_avg[0],
                        "5min": load_avg[1],
                        "15min": load_avg[2]
                    }
                }
            
            # Memory metrics
            if enabled_metrics.get('memory', True):
                memory = psutil.virtual_memory()
                swap = psutil.swap_memory()
                
                metrics["metrics"]["memory"] = {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "usage_percent": memory.percent,
                    "swap_total": swap.total,
                    "swap_used": swap.used,
                    "swap_percent": swap.percent
                }
            
            # Disk metrics
            if enabled_metrics.get('disk', True):
                disk_usage = psutil.disk_usage('/')
                disk_io = psutil.disk_io_counters()
                
                metrics["metrics"]["disk"] = {
                    "total": disk_usage.total,
                    "used": disk_usage.used,
                    "free": disk_usage.free,
                    "usage_percent": (disk_usage.used / disk_usage.total) * 100,
                    "io": {
                        "read_bytes": disk_io.read_bytes if disk_io else 0,
                        "write_bytes": disk_io.write_bytes if disk_io else 0,
                        "read_count": disk_io.read_count if disk_io else 0,
                        "write_count": disk_io.write_count if disk_io else 0
                    }
                }
            
            # Network metrics
            if enabled_metrics.get('network', True):
                network_io = psutil.net_io_counters()
                network_connections = len(psutil.net_connections())
                
                metrics["metrics"]["network"] = {
                    "bytes_sent": network_io.bytes_sent,
                    "bytes_recv": network_io.bytes_recv,
                    "packets_sent": network_io.packets_sent,
                    "packets_recv": network_io.packets_recv,
                    "connections": network_connections
                }
            
            # Process metrics
            if enabled_metrics.get('processes', True):
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        proc_info = proc.info
                        if proc_info['cpu_percent'] > 1.0 or proc_info['memory_percent'] > 1.0:
                            processes.append(proc_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                # Sort by CPU usage and take top 10
                processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
                
                metrics["metrics"]["processes"] = {
                    "total_count": len(psutil.pids()),
                    "top_processes": processes[:10]
                }
            
            self.logger.debug(f"Collected metrics: {json.dumps(metrics, indent=2)}")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting metrics: {e}")
            return metrics

    async def send_metrics(self, metrics: Dict[str, Any]):
        """Send metrics to SAMS server"""
        try:
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.post(
                f"{self.server_url}/api/v1/metrics",
                json=metrics,
                headers=headers
            ) as response:
                if response.status == 200:
                    self.logger.debug("Metrics sent successfully")
                else:
                    self.logger.error(f"Failed to send metrics: {response.status}")
                    error_text = await response.text()
                    self.logger.error(f"Error response: {error_text}")
                    
        except Exception as e:
            self.logger.error(f"Error sending metrics: {e}")

    async def cleanup(self):
        """Cleanup resources"""
        self.logger.info("Cleaning up agent resources...")
        
        if self.session:
            await self.session.close()
        
        self.logger.info("SAMS Python Agent stopped")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='SAMS Python Monitoring Agent')
    parser.add_argument('--config', '-c', default='agent_config.json',
                       help='Configuration file path')
    parser.add_argument('--daemon', '-d', action='store_true',
                       help='Run as daemon')
    
    args = parser.parse_args()
    
    # Create agent
    agent = SAMSAgent(args.config)
    
    try:
        # Run agent
        asyncio.run(agent.start())
    except KeyboardInterrupt:
        print("\nAgent stopped by user")
    except Exception as e:
        print(f"Agent error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
