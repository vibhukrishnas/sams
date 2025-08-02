package com.sams.repository;

import com.sams.models.Metric;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;

@Repository
public class MetricsRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;  // Use default auto-configured JdbcTemplate
    
    public void saveMetric(Metric metric, String dbType) {
        String sql = """
            INSERT INTO metrics (
                id, agent_id, metric_type, metric_name, value, unit,
                timestamp, host_id, host_name, tags, threshold_warning,
                threshold_critical, status, source, additional_info
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """;
        
        JdbcTemplate template = getJdbcTemplate(dbType);
        template.update(sql,
            metric.getId(),
            metric.getAgentId(),
            metric.getMetricType(),
            metric.getMetricName(),
            metric.getValue(),
            metric.getUnit(),
            Timestamp.from(metric.getTimestamp()),
            metric.getHostId(),
            metric.getHostName(),
            metric.getTags(),
            metric.getThresholdWarning(),
            metric.getThresholdCritical(),
            metric.getStatus(),
            metric.getSource(),
            metric.getAdditionalInfo()
        );
    }
    
    public List<Metric> getRealtimeMetrics(UUID agentId, int minutes) {
        String sql = """
            SELECT * FROM metrics 
            WHERE agent_id = ? 
            AND timestamp > ? 
            ORDER BY timestamp DESC
        """;
        
        Timestamp since = new Timestamp(System.currentTimeMillis() - (minutes * 60 * 1000));
        
        return jdbcTemplate.query(
            sql,
            new Object[]{agentId, since},
            new BeanPropertyRowMapper<>(Metric.class)
        );
    }
    
    public List<Metric> getAggregatedMetrics(UUID agentId, String metricType, String interval) {
        String sql = switch(interval.toLowerCase()) {
            case "hourly" -> """
                SELECT 
                    DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as timestamp,
                    metric_type,
                    AVG(value) as value,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    COUNT(*) as sample_count
                FROM metrics
                WHERE agent_id = ? AND metric_type = ?
                GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00'), metric_type
                ORDER BY timestamp DESC
            """;
            case "daily" -> """
                SELECT 
                    DATE(timestamp) as timestamp,
                    metric_type,
                    AVG(value) as value,
                    MIN(value) as min_value,
                    MAX(value) as max_value,
                    COUNT(*) as sample_count
                FROM metrics
                WHERE agent_id = ? AND metric_type = ?
                GROUP BY DATE(timestamp), metric_type
                ORDER BY timestamp DESC
            """;
            default -> "SELECT * FROM metrics WHERE agent_id = ? AND metric_type = ?";
        };
        
        return jdbcTemplate.query(
            sql,
            new Object[]{agentId, metricType},
            new BeanPropertyRowMapper<>(Metric.class)
        );
    }
    
    private JdbcTemplate getJdbcTemplate(String dbType) {
        // Use the default JdbcTemplate for all database types
        return jdbcTemplate;
    }
}
