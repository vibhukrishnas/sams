-- Performance indexes for SAMS Monitoring System

-- Metrics table indexes
CREATE INDEX idx_metrics_agent_timestamp
    ON metrics (agent_id, timestamp DESC);

CREATE INDEX idx_metrics_type_timestamp
    ON metrics (metric_type, timestamp DESC);

CREATE INDEX idx_metrics_name_timestamp
    ON metrics (metric_name, timestamp DESC);

CREATE INDEX idx_metrics_attributes
    ON metrics USING GIN (attributes);

-- Metric aggregates indexes
CREATE INDEX idx_metric_aggregates_agent_period
    ON metric_aggregates (agent_id, period, timestamp DESC);

CREATE INDEX idx_metric_aggregates_type_period
    ON metric_aggregates (metric_type, period, timestamp DESC);

-- Alerts table indexes
CREATE INDEX idx_alerts_agent_severity
    ON alerts (agent_id, severity, timestamp DESC);

CREATE INDEX idx_alerts_unacknowledged
    ON alerts (acknowledged, severity)
    WHERE NOT acknowledged;

CREATE INDEX idx_alerts_timestamp
    ON alerts (timestamp DESC);

-- Agents table indexes
CREATE INDEX idx_agents_status_last_seen
    ON agents (status, last_seen DESC);

CREATE INDEX idx_agents_hostname
    ON agents (hostname);

-- Users table indexes
CREATE INDEX idx_users_email
    ON users (email);

CREATE INDEX idx_users_username
    ON users (username);

CREATE INDEX idx_users_role
    ON users (role);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_timestamp
    ON audit_log (user_id, timestamp DESC);

CREATE INDEX idx_audit_log_action_entity
    ON audit_log (action, entity_type, entity_id);

CREATE INDEX idx_audit_log_timestamp
    ON audit_log (timestamp DESC);

-- Create indexes on foreign keys
CREATE INDEX idx_alerts_agent_id
    ON alerts (agent_id);

CREATE INDEX idx_metric_aggregates_agent_id
    ON metric_aggregates (agent_id);

CREATE INDEX idx_audit_log_user_id
    ON audit_log (user_id);

-- Create indexes for JSON fields
CREATE INDEX idx_agents_os_info
    ON agents USING GIN (os_info);

CREATE INDEX idx_audit_log_changes
    ON audit_log USING GIN (changes);

-- Add index comments
COMMENT ON INDEX idx_metrics_agent_timestamp IS 'Optimize queries for specific agent metrics over time';
COMMENT ON INDEX idx_metrics_type_timestamp IS 'Optimize queries for specific metric types over time';
COMMENT ON INDEX idx_alerts_unacknowledged IS 'Optimize queries for active alerts';
COMMENT ON INDEX idx_agents_status_last_seen IS 'Optimize queries for active/inactive agents';
