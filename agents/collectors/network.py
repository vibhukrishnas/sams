"""Network metrics collector for SAMS Agent"""

import psutil
import netifaces
from typing import Dict, Any

class NetworkCollector:
    def collect(self) -> Dict[str, Any]:
        """Collect network metrics"""
        metrics = {
            "interfaces": {},
            "connections": [],
            "io_counters": {}
        }
        
        # Get network interfaces
        for interface in netifaces.interfaces():
            try:
                addrs = netifaces.ifaddresses(interface)
                interface_info = {
                    "ipv4": addrs.get(netifaces.AF_INET, []),
                    "ipv6": addrs.get(netifaces.AF_INET6, []),
                    "mac": addrs.get(netifaces.AF_LINK, []),
                    "stats": {}
                }
                metrics["interfaces"][interface] = interface_info
            except Exception:
                continue
        
        # Get network I/O counters
        try:
            io_counters = psutil.net_io_counters(pernic=True)
            for nic, counters in io_counters.items():
                metrics["io_counters"][nic] = {
                    "bytes_sent": counters.bytes_sent,
                    "bytes_recv": counters.bytes_recv,
                    "packets_sent": counters.packets_sent,
                    "packets_recv": counters.packets_recv,
                    "errin": counters.errin,
                    "errout": counters.errout,
                    "dropin": counters.dropin,
                    "dropout": counters.dropout
                }
        except Exception:
            pass
        
        # Get network connections
        try:
            connections = psutil.net_connections(kind='inet')
            for conn in connections:
                conn_info = {
                    "fd": conn.fd,
                    "family": conn.family,
                    "type": conn.type,
                    "laddr": conn.laddr._asdict() if conn.laddr else None,
                    "raddr": conn.raddr._asdict() if conn.raddr else None,
                    "status": conn.status,
                    "pid": conn.pid
                }
                metrics["connections"].append(conn_info)
        except Exception:
            pass
        
        return metrics
