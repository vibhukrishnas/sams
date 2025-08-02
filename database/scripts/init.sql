-- Database initialization for SAMS Monitoring System
-- Includes tables for metrics, alerts, and system information

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Create enum types
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'error', 'critical');
CREATE TYPE metric_type AS ENUM ('cpu', 'memory', 'disk', 'network', 'process');

-- Create metrics table with TimescaleDB hypertable
CREATE TABLE metrics (
    id uuid DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    agent_id uuid NOT NULL,
    metric_type metric_type NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    attributes JSONB,
    PRIMARY KEY (id, timestamp)
);

-- Convert metrics to hypertable
SELECT create_hypertable('metrics', 'timestamp');

-- Create agents table
CREATE TABLE agents (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET,
    os_info JSONB,
    status VARCHAR(50) DEFAULT 'active',
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create alerts table
CREATE TABLE alerts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    agent_id uuid NOT NULL,
    severity alert_severity NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    metric_type metric_type,
    metric_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by uuid,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Create metric_aggregates table for historical data
CREATE TABLE metric_aggregates (
    id uuid DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    agent_id uuid NOT NULL,
    metric_type metric_type NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    avg_value DOUBLE PRECISION,
    count INTEGER,
    period VARCHAR(20) NOT NULL, -- '1h', '1d', '1w'
    PRIMARY KEY (id, timestamp),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Convert metric_aggregates to hypertable
SELECT create_hypertable('metric_aggregates', 'timestamp');

-- Create users table for authentication
CREATE TABLE users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_log table
CREATE TABLE audit_log (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id uuid,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id uuid,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create continuous aggregates for different time intervals
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp) AS bucket,
    agent_id,
    metric_type,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM metrics
GROUP BY bucket, agent_id, metric_type, metric_name;

CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', timestamp) AS bucket,
    agent_id,
    metric_type,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM metrics
GROUP BY bucket, agent_id, metric_type, metric_name;

-- Add comments
COMMENT ON TABLE metrics IS 'Real-time system metrics collected from agents';
COMMENT ON TABLE metric_aggregates IS 'Aggregated historical metrics for long-term storage';
COMMENT ON TABLE agents IS 'Registered monitoring agents';
COMMENT ON TABLE alerts IS 'System alerts and notifications';
COMMENT ON TABLE users IS 'System users and authentication';
COMMENT ON TABLE audit_log IS 'Audit trail for system actions';
