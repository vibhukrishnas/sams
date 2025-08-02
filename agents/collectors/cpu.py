"""CPU metrics collector for SAMS Agent"""

import psutil
import cpuinfo
from typing import Dict, Any

class CPUCollector:
    def collect(self) -> Dict[str, Any]:
        """Collect CPU metrics"""
        cpu_info = cpuinfo.get_cpu_info()
        metrics = {
            "usage_percent": psutil.cpu_percent(interval=1, percpu=True),
            "overall_usage": psutil.cpu_percent(interval=1),
            "cpu_count": psutil.cpu_count(),
            "cpu_freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else {},
            "cpu_stats": psutil.cpu_stats()._asdict(),
            "load_avg": psutil.getloadavg(),
            "cpu_info": {
                "brand": cpu_info["brand_raw"],
                "hz": cpu_info["hz_actual_friendly"],
                "arch": cpu_info["arch"],
                "bits": cpu_info["bits"]
            }
        }
        return metrics
