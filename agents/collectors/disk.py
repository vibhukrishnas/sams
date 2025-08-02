"""Disk metrics collector for SAMS Agent"""

import psutil
from typing import Dict, Any

class DiskCollector:
    def collect(self) -> Dict[str, Any]:
        """Collect disk metrics"""
        metrics = {
            "partitions": [],
            "io_counters": {}
        }
        
        # Get disk partitions
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                partition_info = {
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "opts": partition.opts,
                    "usage": {
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": usage.percent
                    }
                }
                metrics["partitions"].append(partition_info)
            except (PermissionError, OSError):
                continue
        
        # Get disk I/O counters
        try:
            io_counters = psutil.disk_io_counters(perdisk=True)
            for disk, counters in io_counters.items():
                metrics["io_counters"][disk] = {
                    "read_count": counters.read_count,
                    "write_count": counters.write_count,
                    "read_bytes": counters.read_bytes,
                    "write_bytes": counters.write_bytes,
                    "read_time": counters.read_time,
                    "write_time": counters.write_time
                }
        except Exception:
            pass
        
        return metrics
