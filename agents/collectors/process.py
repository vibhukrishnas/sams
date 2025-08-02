"""Process metrics collector for SAMS Agent"""

import psutil
from typing import Dict, Any, List

class ProcessCollector:
    def collect(self) -> Dict[str, Any]:
        """Collect process metrics"""
        metrics = {
            "total_processes": len(psutil.pids()),
            "processes": self._get_process_details()
        }
        return metrics
    
    def _get_process_details(self, top_n: int = 10) -> List[Dict[str, Any]]:
        """Get details of top N processes by CPU usage"""
        processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 
                                       'memory_percent', 'status']):
            try:
                pinfo = proc.info
                pinfo['cpu_percent'] = proc.cpu_percent(interval=0.1)
                pinfo['memory_info'] = proc.memory_info()._asdict()
                pinfo['num_threads'] = proc.num_threads()
                pinfo['io_counters'] = proc.io_counters()._asdict() if proc.io_counters() else None
                processes.append(pinfo)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        # Sort by CPU usage and get top N
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return processes[:top_n]
