"""Memory metrics collector for SAMS Agent"""

import psutil
from typing import Dict, Any

class MemoryCollector:
    def collect(self) -> Dict[str, Any]:
        """Collect memory metrics"""
        virtual_memory = psutil.virtual_memory()
        swap_memory = psutil.swap_memory()
        
        metrics = {
            "virtual_memory": {
                "total": virtual_memory.total,
                "available": virtual_memory.available,
                "used": virtual_memory.used,
                "free": virtual_memory.free,
                "percent": virtual_memory.percent,
                "cached": getattr(virtual_memory, 'cached', None),
                "buffers": getattr(virtual_memory, 'buffers', None)
            },
            "swap_memory": {
                "total": swap_memory.total,
                "used": swap_memory.used,
                "free": swap_memory.free,
                "percent": swap_memory.percent,
                "sin": swap_memory.sin,
                "sout": swap_memory.sout
            }
        }
        return metrics
