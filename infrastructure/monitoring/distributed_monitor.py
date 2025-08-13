#!/usr/bin/env python3
"""
🌐 SAMS Distributed System Manager
Implements enterprise-grade distributed monitoring following best practices
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
import consul
import yaml

# Configure structured logging for observability
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(funcName)s:%(lineno)d',
    handlers=[
        logging.FileHandler('sams-distributed.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ServerNode:
    """Represents a server node in the distributed system"""
    name: str
    host: str
    port: int
    type: str  # windows, linux, docker
    zone: str
    health_status: str = "unknown"
    last_seen: Optional[datetime] = None
    metrics: Optional[Dict] = None

class DistributedMonitoringManager:
    """
    Enterprise-grade distributed monitoring manager
    Follows distributed systems best practices:
    - Service Discovery
    - Health Checking
    - Load Balancing
    - Observability
    - Configuration as Code
    """
    
    def __init__(self, config_path: str = "distributed-config.yml"):
        self.config = self._load_config(config_path)
        self.nodes: Dict[str, ServerNode] = {}
        self.consul_client = None
        self.session = None
        
        # Observability
        self.metrics = {
            "total_nodes": 0,
            "healthy_nodes": 0,
            "unhealthy_nodes": 0,
            "last_discovery": None,
            "alerts_generated": 0
        }
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration as code"""
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
            logger.info(f"Configuration loaded from {config_path}")
            return config
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return self._default_config()
    
    def _default_config(self) -> Dict:
        """Default configuration for distributed monitoring"""
        return {
            "monitoring": {
                "collection_interval": "30s",
                "alerting": {
                    "thresholds": {
                        "cpu_usage": 80,
                        "memory_usage": 90,
                        "disk_usage": 85
                    }
                }
            }
        }
    
    async def initialize(self):
        """Initialize distributed monitoring system"""
        logger.info("🚀 Initializing SAMS Distributed Monitoring System")
        
        # Initialize HTTP session for API calls
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        # Initialize service discovery
        try:
            self.consul_client = consul.Consul()
            logger.info("✅ Service discovery (Consul) initialized")
        except Exception as e:
            logger.warning(f"⚠️ Service discovery unavailable: {e}")
        
        # Discover initial nodes
        await self._discover_nodes()
        
        logger.info(f"✅ Distributed monitoring initialized with {len(self.nodes)} nodes")
    
    async def _discover_nodes(self):
        """Service discovery implementation"""
        logger.info("🔍 Starting service discovery...")
        
        # Method 1: DNS-based discovery
        await self._discover_via_dns()
        
        # Method 2: Consul-based discovery
        await self._discover_via_consul()
        
        # Method 3: Static configuration
        await self._discover_via_config()
        
        self.metrics["total_nodes"] = len(self.nodes)
        self.metrics["last_discovery"] = datetime.now()
        
        logger.info(f"🎯 Service discovery completed: {len(self.nodes)} nodes found")
    
    async def _discover_via_dns(self):
        """DNS-based service discovery"""
        try:
            # Simulate DNS discovery for demo
            dns_nodes = [
                ("sams-win-01.local", 8080, "windows", "zone-a"),
                ("sams-linux-01.local", 8080, "linux", "zone-b"),
                ("localhost", 8080, "demo", "local")  # Our current demo server
            ]
            
            for host, port, node_type, zone in dns_nodes:
                node_name = f"{node_type}-{host.split('.')[0]}"
                self.nodes[node_name] = ServerNode(
                    name=node_name,
                    host=host,
                    port=port,
                    type=node_type,
                    zone=zone
                )
            
            logger.info(f"🌐 DNS discovery: {len(dns_nodes)} nodes discovered")
        except Exception as e:
            logger.error(f"❌ DNS discovery failed: {e}")
    
    async def _discover_via_consul(self):
        """Consul-based service discovery"""
        if not self.consul_client:
            return
        
        try:
            # Discover SAMS services from Consul
            services = self.consul_client.health.service('sams-monitor', passing=True)[1]
            
            for service in services:
                node_name = service['Service']['ID']
                self.nodes[node_name] = ServerNode(
                    name=node_name,
                    host=service['Service']['Address'],
                    port=service['Service']['Port'],
                    type=service['Service']['Tags'][0] if service['Service']['Tags'] else "unknown",
                    zone=service['Node']['Datacenter']
                )
            
            logger.info(f"🔗 Consul discovery: {len(services)} services discovered")
        except Exception as e:
            logger.error(f"❌ Consul discovery failed: {e}")
    
    async def _discover_via_config(self):
        """Static configuration-based discovery"""
        try:
            if 'monitoring' in self.config and 'targets' in self.config['monitoring']:
                for target_group in self.config['monitoring']['targets']:
                    for endpoint in target_group.get('endpoints', []):
                        host, port = endpoint.split(':')
                        node_name = f"{target_group['name']}-{host}"
                        
                        if node_name not in self.nodes:
                            self.nodes[node_name] = ServerNode(
                                name=node_name,
                                host=host,
                                port=int(port),
                                type=target_group['type'],
                                zone="config-defined"
                            )
            
            logger.info("📋 Static configuration discovery completed")
        except Exception as e:
            logger.error(f"❌ Config discovery failed: {e}")
    
    async def health_check_all_nodes(self):
        """Distributed health checking"""
        logger.info("🏥 Starting distributed health checks...")
        
        tasks = []
        for node in self.nodes.values():
            task = asyncio.create_task(self._health_check_node(node))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        healthy_count = sum(1 for result in results if result is True)
        self.metrics["healthy_nodes"] = healthy_count
        self.metrics["unhealthy_nodes"] = len(self.nodes) - healthy_count
        
        logger.info(f"🎯 Health check completed: {healthy_count}/{len(self.nodes)} nodes healthy")
    
    async def _health_check_node(self, node: ServerNode) -> bool:
        """Check health of individual node"""
        try:
            url = f"http://{node.host}:{node.port}/api/v1/health"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    node.health_status = "healthy"
                    node.last_seen = datetime.now()
                    node.metrics = data.get('metrics', {})
                    
                    # Check for alerts based on thresholds
                    await self._check_node_alerts(node, data)
                    
                    return True
                else:
                    node.health_status = "unhealthy"
                    return False
        except Exception as e:
            node.health_status = "unreachable"
            logger.warning(f"⚠️ Node {node.name} unreachable: {e}")
            return False
    
    async def _check_node_alerts(self, node: ServerNode, health_data: Dict):
        """Check for alerting conditions"""
        thresholds = self.config.get('monitoring', {}).get('alerting', {}).get('thresholds', {})
        
        if 'metrics' in health_data:
            metrics = health_data['metrics']
            alerts = []
            
            # CPU threshold check
            if metrics.get('cpu', 0) > thresholds.get('cpu_usage', 80):
                alerts.append(f"High CPU: {metrics['cpu']}%")
            
            # Memory threshold check  
            if metrics.get('memory', 0) > thresholds.get('memory_usage', 90):
                alerts.append(f"High Memory: {metrics['memory']}%")
            
            # Disk threshold check
            if metrics.get('disk', 0) > thresholds.get('disk_usage', 85):
                alerts.append(f"High Disk: {metrics['disk']}%")
            
            if alerts:
                self.metrics["alerts_generated"] += len(alerts)
                logger.warning(f"🚨 ALERTS for {node.name}: {', '.join(alerts)}")
    
    async def collect_distributed_metrics(self) -> Dict:
        """Collect metrics from all nodes in distributed system"""
        logger.info("📊 Collecting distributed metrics...")
        
        all_metrics = {
            "cluster_overview": {
                "total_nodes": len(self.nodes),
                "healthy_nodes": self.metrics["healthy_nodes"],
                "unhealthy_nodes": self.metrics["unhealthy_nodes"],
                "zones": list(set(node.zone for node in self.nodes.values())),
                "node_types": list(set(node.type for node in self.nodes.values()))
            },
            "node_details": []
        }
        
        for node in self.nodes.values():
            node_info = {
                "name": node.name,
                "host": node.host,
                "port": node.port,
                "type": node.type,
                "zone": node.zone,
                "health_status": node.health_status,
                "last_seen": node.last_seen.isoformat() if node.last_seen else None,
                "metrics": node.metrics or {}
            }
            all_metrics["node_details"].append(node_info)
        
        logger.info(f"📈 Distributed metrics collected from {len(self.nodes)} nodes")
        return all_metrics
    
    async def start_monitoring_loop(self):
        """Main monitoring loop for distributed system"""
        logger.info("🔄 Starting distributed monitoring loop...")
        
        while True:
            try:
                # Service discovery refresh
                await self._discover_nodes()
                
                # Health check all nodes
                await self.health_check_all_nodes()
                
                # Collect metrics
                metrics = await self.collect_distributed_metrics()
                
                # Log summary
                healthy = metrics["cluster_overview"]["healthy_nodes"]
                total = metrics["cluster_overview"]["total_nodes"]
                logger.info(f"📊 Monitoring cycle complete: {healthy}/{total} nodes healthy")
                
                # Wait for next cycle
                await asyncio.sleep(30)  # 30 second monitoring interval
                
            except Exception as e:
                logger.error(f"❌ Monitoring loop error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def shutdown(self):
        """Graceful shutdown"""
        logger.info("🛑 Shutting down distributed monitoring...")
        
        if self.session:
            await self.session.close()
        
        logger.info("✅ Shutdown complete")

# Main execution
async def main():
    """Main entry point for distributed monitoring"""
    manager = DistributedMonitoringManager()
    
    try:
        await manager.initialize()
        await manager.start_monitoring_loop()
    except KeyboardInterrupt:
        logger.info("🛑 Received shutdown signal")
    finally:
        await manager.shutdown()

if __name__ == "__main__":
    print("🌐 SAMS Distributed Monitoring System")
    print("Following enterprise distributed systems best practices")
    print("=" * 60)
    
    asyncio.run(main())
