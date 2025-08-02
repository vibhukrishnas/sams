from datetime import datetime, timedelta
from typing import List, Dict, Any

class MetricsRepository:
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
    def save_metric(self, metric_data: Dict[str, Any], db_name: str = 'mysql') -> int:
        """Save real-time metric to specified database"""
        query = """
        INSERT INTO metrics (
            agent_id, cpu_usage, memory_usage, disk_usage,
            network_in, network_out, process_count, 
            load_average, timestamp
        ) VALUES (
            :agent_id, :cpu_usage, :memory_usage, :disk_usage,
            :network_in, :network_out, :process_count,
            :load_average, :timestamp
        )
        """
        
        with self.db_manager.get_session(db_name) as session:
            result = session.execute(query, metric_data)
            return result.lastrowid
    
    def save_metrics_batch(self, metrics: List[Dict[str, Any]], db_name: str = 'mysql'):
        """Batch insert metrics for performance"""
        if not metrics:
            return
        
        query = """
        INSERT INTO metrics (
            agent_id, cpu_usage, memory_usage, disk_usage,
            network_in, network_out, process_count, 
            load_average, timestamp
        ) VALUES (
            :agent_id, :cpu_usage, :memory_usage, :disk_usage,
            :network_in, :network_out, :process_count,
            :load_average, :timestamp
        )
        """
        
        with self.db_manager.get_session(db_name) as session:
            session.execute(query, metrics)
    
    def get_realtime_metrics(self, agent_id: str, minutes: int = 5, db_name: str = 'mysql'):
        """Get real-time metrics for last N minutes"""
        since = datetime.utcnow() - timedelta(minutes=minutes)
        
        query = """
        SELECT * FROM metrics 
        WHERE agent_id = :agent_id 
        AND timestamp > :since 
        ORDER BY timestamp DESC
        """
        
        return self.db_manager.execute_query(
            query, 
            {'agent_id': agent_id, 'since': since}, 
            db_name
        )
    
    def get_aggregated_metrics(self, agent_id: str, hours: int = 24, db_name: str = 'mysql'):
        """Get aggregated metrics for performance"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        query = """
        SELECT 
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
            AVG(cpu_usage) as avg_cpu,
            MAX(cpu_usage) as max_cpu,
            AVG(memory_usage) as avg_memory,
            MAX(memory_usage) as max_memory,
            AVG(disk_usage) as avg_disk,
            SUM(network_in) as total_network_in,
            SUM(network_out) as total_network_out
        FROM metrics
        WHERE agent_id = :agent_id AND timestamp > :since
        GROUP BY hour
        ORDER BY hour DESC
        """
        
        return self.db_manager.execute_query(
            query,
            {'agent_id': agent_id, 'since': since},
            db_name
        )
