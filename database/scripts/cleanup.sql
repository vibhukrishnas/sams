-- Data retention and cleanup policies for SAMS Monitoring System

-- Create retention policy function
CREATE OR REPLACE FUNCTION create_retention_policy(
    table_name text,
    interval_str text,
    chunk_interval_str text DEFAULT '7 days'
)
RETURNS void AS $$
BEGIN
    -- Set chunk time interval
    PERFORM set_chunk_time_interval(table_name, chunk_interval_str::interval);
    
    -- Add retention policy
    PERFORM add_retention_policy(table_name, interval_str::interval);
END;
$$ LANGUAGE plpgsql;

-- Set retention policies for different tables

-- Detailed metrics: Keep for 7 days
SELECT create_retention_policy('metrics', '7 days');

-- Hourly aggregates: Keep for 30 days
SELECT create_retention_policy('metrics_hourly', '30 days');

-- Daily aggregates: Keep for 365 days
SELECT create_retention_policy('metrics_daily', '365 days');

-- Alerts: Keep for 90 days
CREATE OR REPLACE FUNCTION cleanup_old_alerts() RETURNS void AS $$
BEGIN
    -- Archive acknowledged alerts older than 90 days
    INSERT INTO alerts_archive
    SELECT *
    FROM alerts
    WHERE timestamp < NOW() - INTERVAL '90 days'
    AND acknowledged = true;

    -- Delete archived alerts
    DELETE FROM alerts
    WHERE timestamp < NOW() - INTERVAL '90 days'
    AND acknowledged = true;
    
    -- Keep unacknowledged alerts for review
END;
$$ LANGUAGE plpgsql;

-- Audit log cleanup: Keep for 1 year
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
BEGIN
    -- Archive old audit logs
    INSERT INTO audit_log_archive
    SELECT *
    FROM audit_log
    WHERE timestamp < NOW() - INTERVAL '1 year';

    -- Delete archived logs
    DELETE FROM audit_log
    WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create automated cleanup jobs
CREATE OR REPLACE FUNCTION schedule_cleanup_jobs() RETURNS void AS $$
BEGIN
    -- Schedule metric aggregation (runs every hour)
    PERFORM cron.schedule(
        'aggregate_metrics_hourly',
        '0 * * * *',
        $$
        INSERT INTO metric_aggregates (
            timestamp, agent_id, metric_type, metric_name,
            min_value, max_value, avg_value, count, period
        )
        SELECT
            time_bucket('1 hour', timestamp),
            agent_id,
            metric_type,
            metric_name,
            MIN(metric_value),
            MAX(metric_value),
            AVG(metric_value),
            COUNT(*),
            '1h'
        FROM metrics
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY 1, 2, 3, 4;
        $$
    );

    -- Schedule alert cleanup (runs daily)
    PERFORM cron.schedule(
        'cleanup_old_alerts',
        '0 0 * * *',
        'SELECT cleanup_old_alerts();'
    );

    -- Schedule audit log cleanup (runs weekly)
    PERFORM cron.schedule(
        'cleanup_old_audit_logs',
        '0 0 * * 0',
        'SELECT cleanup_old_audit_logs();'
    );
END;
$$ LANGUAGE plpgsql;

-- Configure continuous aggregates refresh policies
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

SELECT add_continuous_aggregate_policy('metrics_daily',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Create compression policies for older chunks
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'agent_id,metric_type',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('metrics', INTERVAL '2 days');

-- Initialize the cleanup jobs
SELECT schedule_cleanup_jobs();
