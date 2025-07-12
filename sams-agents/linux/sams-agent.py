#!/usr/bin/env python3
"""
SAMS Linux Monitoring Agent
Collects system metrics and sends them to SAMS backend
"""

import os
import sys
import time
import json
import psutil
import requests
import logging
import socket
import subprocess
import threading
from datetime import datetime
from typing import Dict, Any, Optional

class SAMSAgent:
    def __init__(self, config_file: str = '/etc/sams/agent.conf'):
        self.config = self.load_config(config_file)
        self.setup_logging()
        self.server_id = self.config.get('server_id')
        self.backend_url = self.config.get('backend_url', 'http://localhost:8080')
        self.api_token = self.config.get('api_token')
        self.collection_interval = self.config.get('collection_interval', 30)
        self.running = False
        
        # Metrics cache
        self.last_network_stats = None
        self.last_disk_stats = None
        
        self.logger.info(f"SAMS Agent initialized for server {self.server_id}")

    def load_config(self, config_file: str) -> Dict[str, Any]:
        """Load configuration from file"""
        default_config = {
            'server_id': socket.gethostname(),
            'backend_url': 'http://192.168.1.10:8080',
            'api_token': '',
            'collection_interval': 30,
            'log_level': 'INFO',
            'log_file': '/var/log/sams-agent.log'
        }
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    file_config = json.load(f)
                default_config.update(file_config)
            except Exception as e:
                print(f"Error loading config file: {e}")
        
        return default_config

    def setup_logging(self):
        """Setup logging configuration"""
        log_level = getattr(logging, self.config.get('log_level', 'INFO'))
        log_file = self.config.get('log_file', '/var/log/sams-agent.log')
        
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('sams-agent')

    def collect_system_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive system metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            load_avg = os.getloadavg()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Disk metrics
            disk_usage = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            # Network metrics
            network_io = psutil.net_io_counters()
            
            # Process metrics
            process_count = len(psutil.pids())
            
            # System info
            boot_time = psutil.boot_time()
            uptime = time.time() - boot_time
            
            # Additional system info
            uname = os.uname()
            
            metrics = {
                'timestamp': datetime.utcnow().isoformat(),
                'server_id': self.server_id,
                'hostname': socket.gethostname(),
                'cpu': {
                    'usage_percent': cpu_percent,
                    'count': cpu_count,
                    'load_average': list(load_avg)
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'used': memory.used,
                    'free': memory.free,
                    'percent': memory.percent,
                    'swap_total': swap.total,
                    'swap_used': swap.used,
                    'swap_percent': swap.percent
                },
                'disk': {
                    'total': disk_usage.total,
                    'used': disk_usage.used,
                    'free': disk_usage.free,
                    'percent': (disk_usage.used / disk_usage.total) * 100,
                    'read_bytes': disk_io.read_bytes if disk_io else 0,
                    'write_bytes': disk_io.write_bytes if disk_io else 0,
                    'read_count': disk_io.read_count if disk_io else 0,
                    'write_count': disk_io.write_count if disk_io else 0
                },
                'network': {
                    'bytes_sent': network_io.bytes_sent,
                    'bytes_recv': network_io.bytes_recv,
                    'packets_sent': network_io.packets_sent,
                    'packets_recv': network_io.packets_recv,
                    'errin': network_io.errin,
                    'errout': network_io.errout,
                    'dropin': network_io.dropin,
                    'dropout': network_io.dropout
                },
                'processes': {
                    'total': process_count,
                    'running': len([p for p in psutil.process_iter(['status']) if p.info['status'] == 'running']),
                    'sleeping': len([p for p in psutil.process_iter(['status']) if p.info['status'] == 'sleeping'])
                },
                'system': {
                    'uptime': uptime,
                    'boot_time': boot_time,
                    'os': uname.sysname,
                    'kernel': uname.release,
                    'architecture': uname.machine
                }
            }
            
            # Add custom metrics if configured
            custom_metrics = self.collect_custom_metrics()
            if custom_metrics:
                metrics['custom'] = custom_metrics
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            return {}

    def collect_custom_metrics(self) -> Dict[str, Any]:
        """Collect custom application-specific metrics"""
        custom_metrics = {}
        
        try:
            # Check if specific services are running
            services = self.config.get('monitor_services', [])
            for service in services:
                try:
                    result = subprocess.run(['systemctl', 'is-active', service], 
                                          capture_output=True, text=True)
                    custom_metrics[f'service_{service}_status'] = result.stdout.strip()
                except Exception as e:
                    self.logger.warning(f"Failed to check service {service}: {e}")
            
            # Check specific ports
            ports = self.config.get('monitor_ports', [])
            for port in ports:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(1)
                    result = sock.connect_ex(('localhost', port))
                    custom_metrics[f'port_{port}_open'] = result == 0
                    sock.close()
                except Exception as e:
                    self.logger.warning(f"Failed to check port {port}: {e}")
            
            # Custom commands
            commands = self.config.get('custom_commands', {})
            for name, command in commands.items():
                try:
                    result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=10)
                    custom_metrics[f'custom_{name}'] = {
                        'exit_code': result.returncode,
                        'stdout': result.stdout.strip(),
                        'stderr': result.stderr.strip()
                    }
                except Exception as e:
                    self.logger.warning(f"Failed to execute custom command {name}: {e}")
            
        except Exception as e:
            self.logger.error(f"Error collecting custom metrics: {e}")
        
        return custom_metrics

    def send_metrics(self, metrics: Dict[str, Any]) -> bool:
        """Send metrics to SAMS backend"""
        try:
            url = f"{self.backend_url}/api/metrics/collect"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_token}' if self.api_token else ''
            }
            
            response = requests.post(url, json=metrics, headers=headers, timeout=30)
            
            if response.status_code == 200:
                self.logger.debug("Metrics sent successfully")
                return True
            else:
                self.logger.error(f"Failed to send metrics: HTTP {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Network error sending metrics: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Error sending metrics: {e}")
            return False

    def register_agent(self) -> bool:
        """Register this agent with the SAMS backend"""
        try:
            url = f"{self.backend_url}/api/agents/register"
            
            # Collect system information for registration
            uname = os.uname()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            registration_data = {
                'server_id': self.server_id,
                'hostname': socket.gethostname(),
                'ip_address': self.get_local_ip(),
                'os': uname.sysname,
                'os_version': uname.release,
                'architecture': uname.machine,
                'cpu_cores': psutil.cpu_count(),
                'memory_total': memory.total,
                'disk_total': disk.total,
                'agent_version': '1.0.0',
                'capabilities': ['metrics', 'logs', 'commands']
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_token}' if self.api_token else ''
            }
            
            response = requests.post(url, json=registration_data, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                self.logger.info("Agent registered successfully")
                return True
            else:
                self.logger.error(f"Failed to register agent: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error registering agent: {e}")
            return False

    def get_local_ip(self) -> str:
        """Get the local IP address"""
        try:
            # Connect to a remote address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return '127.0.0.1'

    def heartbeat(self):
        """Send periodic heartbeat to backend"""
        while self.running:
            try:
                url = f"{self.backend_url}/api/agents/heartbeat"
                data = {
                    'server_id': self.server_id,
                    'timestamp': datetime.utcnow().isoformat(),
                    'status': 'online'
                }
                
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_token}' if self.api_token else ''
                }
                
                response = requests.post(url, json=data, headers=headers, timeout=10)
                
                if response.status_code != 200:
                    self.logger.warning(f"Heartbeat failed: HTTP {response.status_code}")
                    
            except Exception as e:
                self.logger.error(f"Heartbeat error: {e}")
            
            time.sleep(60)  # Send heartbeat every minute

    def run(self):
        """Main agent loop"""
        self.logger.info("Starting SAMS agent...")
        self.running = True
        
        # Register agent on startup
        if not self.register_agent():
            self.logger.error("Failed to register agent, continuing anyway...")
        
        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=self.heartbeat, daemon=True)
        heartbeat_thread.start()
        
        # Main metrics collection loop
        while self.running:
            try:
                # Collect metrics
                metrics = self.collect_system_metrics()
                
                if metrics:
                    # Send metrics to backend
                    success = self.send_metrics(metrics)
                    
                    if success:
                        self.logger.debug(f"Metrics collected and sent at {metrics['timestamp']}")
                    else:
                        self.logger.warning("Failed to send metrics to backend")
                else:
                    self.logger.warning("No metrics collected")
                
                # Wait for next collection interval
                time.sleep(self.collection_interval)
                
            except KeyboardInterrupt:
                self.logger.info("Received interrupt signal, shutting down...")
                break
            except Exception as e:
                self.logger.error(f"Error in main loop: {e}")
                time.sleep(self.collection_interval)
        
        self.running = False
        self.logger.info("SAMS agent stopped")

    def stop(self):
        """Stop the agent"""
        self.running = False


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SAMS Linux Monitoring Agent')
    parser.add_argument('--config', '-c', default='/etc/sams/agent.conf',
                       help='Configuration file path')
    parser.add_argument('--daemon', '-d', action='store_true',
                       help='Run as daemon')
    
    args = parser.parse_args()
    
    # Create agent instance
    agent = SAMSAgent(args.config)
    
    if args.daemon:
        # TODO: Implement proper daemon mode
        agent.logger.info("Daemon mode not yet implemented, running in foreground")
    
    try:
        agent.run()
    except Exception as e:
        agent.logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
