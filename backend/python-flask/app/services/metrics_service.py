import psutil
import platform
import socket
from datetime import datetime
from typing import Dict, Any, List
import GPUtil
import os

class MetricsService:
    def __init__(self, metrics_repo, cache_service, websocket_service):
        self.metrics_repo = metrics_repo
        self.cache_service = cache_service
        self.websocket_service = websocket_service
    
    def collect_system_metrics(self, agent_id: str) -> Dict[str, Any]:
        """Collect real system metrics - NO MOCKS!"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk metrics
        disk_usage = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
        # Network metrics
        net_io = psutil.net_io_counters()
        
        # Process metrics
        process_count = len(psutil.pids())
        
        # Load average (Unix only)
        try:
            load_avg = os.getloadavg()[0]  # 1-minute load average
        except:
            load_avg = 0.0
        
        # GPU metrics if available
        gpu_data = []
        try:
            gpus = GPUtil.getGPUs()
            for gpu in gpus:
                gpu_data.append({
                    'id': gpu.id,
                    'name': gpu.name,
                    'load': gpu.load * 100,
                    'memory_used': gpu.memoryUsed,
                    'memory_total': gpu.memoryTotal,
                    'temperature': gpu.temperature
                })
        except:
            pass
        
        metrics = {
            'agent_id': agent_id,
            'timestamp': datetime.utcnow(),
            'cpu_usage': cpu_percent,
            'cpu_count': cpu_count,
            'cpu_freq_current': cpu_freq.current if cpu_freq else 0,
            'memory_usage': memory.percent,
            'memory_used': memory.used,
            'memory_total': memory.total,
            'swap_usage': swap.percent,
            'disk_usage': disk_usage.percent,
            'disk_used': disk_usage.used,
            'disk_total': disk_usage.total,
            'disk_read_bytes': disk_io.read_bytes if disk_io else 0,
            'disk_write_bytes': disk_io.write_bytes if disk_io else 0,
            'network_in': net_io.bytes_recv,
            'network_out': net_io.bytes_sent,
            'network_packets_in': net_io.packets_recv,
            'network_packets_out': net_io.packets_sent,
            'process_count': process_count,
            'load_average': load_avg,
            'gpu_data': gpu_data,
            'system_info': {
                'platform': platform.system(),
                'platform_release': platform.release(),
                'platform_version': platform.version(),
                'hostname': socket.gethostname(),
                'ip_address': socket.gethostbyname(socket.gethostname())
            }
        }
        
        return metrics
    
    def save_metrics(self, metrics: Dict[str, Any], db_name: str = 'mysql'):
        """Save metrics to database and cache"""
        # Save to database
        metric_id = self.metrics_repo.save_metric(metrics, db_name)
        
        # Cache latest metrics
        cache_key = f"metrics:latest:{metrics['agent_id']}"
        self.cache_service.set(cache_key, metrics, expire=60)
        
        # Broadcast via WebSocket
        self.websocket_service.emit('metrics_update', {
            'agent_id': metrics['agent_id'],
            'metrics': metrics
        })
        
        return metric_id
    
    def get_process_details(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get detailed process information"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                pinfo = proc.info
                pinfo['cpu_percent'] = proc.cpu_percent(interval=0.1)
                pinfo['memory_mb'] = proc.memory_info().rss / 1024 / 1024
                processes.append(pinfo)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        return processes[:20]  # Top 20 processes
    
    def get_disk_partitions(self) -> List[Dict[str, Any]]:
        """Get all disk partition information"""
        partitions = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                partitions.append({
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'fstype': partition.fstype,
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percent': usage.percent
                })
            except PermissionError:
                continue
        return partitions
    
    def get_network_connections(self) -> List[Dict[str, Any]]:
        """Get active network connections"""
        connections = []
        for conn in psutil.net_connections(kind='inet'):
            if conn.status == 'ESTABLISHED':
                connections.append({
                    'local_address': f"{conn.laddr.ip}:{conn.laddr.port}",
                    'remote_address': f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                    'status': conn.status,
                    'pid': conn.pid
                })
        return connections
