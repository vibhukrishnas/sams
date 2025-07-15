-- Enhanced Alert Management System Migration
-- Creates tables for advanced alert lifecycle management, correlation, and automation

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alert_correlations CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS alert_templates CASCADE;
DROP TABLE IF EXISTS alert_escalation_policies CASCADE;
DROP TABLE IF EXISTS alert_notifications CASCADE;

-- Enhanced alerts table (modify existing or create new)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in-progress', 'resolved')),
    source VARCHAR(100),
    source_type VARCHAR(50), -- server, application, network, database, etc.
    
    -- Assignment and ownership
    assigned_to VARCHAR(100),
    assigned_at TIMESTAMP,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,
    
    -- Escalation
    escalation_level INTEGER DEFAULT 0,
    escalation_policy_id UUID,
    
    -- Correlation
    parent_alert_id UUID REFERENCES alerts(id),
    correlation_key VARCHAR(255),
    
    -- Metadata
    tags JSONB,
    metadata JSONB,
    resolution TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_alerts_severity (severity),
    INDEX idx_alerts_status (status),
    INDEX idx_alerts_source (source),
    INDEX idx_alerts_created_at (created_at),
    INDEX idx_alerts_correlation_key (correlation_key),
    INDEX idx_alerts_tags USING GIN (tags)
);

-- Alert history for audit trail
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, updated, acknowledged, assigned, escalated, resolved
    details TEXT,
    old_values JSONB,
    new_values JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_alert_history_alert_id (alert_id),
    INDEX idx_alert_history_created_at (created_at)
);

-- Alert correlations for grouping related alerts
CREATE TABLE alert_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    correlated_alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    correlation_type VARCHAR(50) NOT NULL, -- duplicate, related, caused_by, symptom_of
    correlation_score DECIMAL(3,2), -- 0.00 to 1.00
    correlation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(primary_alert_id, correlated_alert_id),
    INDEX idx_alert_correlations_primary (primary_alert_id),
    INDEX idx_alert_correlations_correlated (correlated_alert_id)
);

-- Alert automation rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    
    -- Rule conditions (JSON format)
    conditions JSONB NOT NULL, -- {severity: 'critical', source: 'server-*', tags: ['database']}
    
    -- Rule actions (JSON format)
    actions JSONB NOT NULL, -- {assign_to: 'dba-team', escalate_after: 300, notify: ['email', 'slack']}
    
    -- Rule metadata
    priority INTEGER DEFAULT 0, -- Higher priority rules execute first
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_alert_rules_enabled (enabled),
    INDEX idx_alert_rules_priority (priority)
);

-- Alert templates for quick alert creation
CREATE TABLE alert_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- system, application, network, security
    
    -- Template data
    template_data JSONB NOT NULL, -- {title: 'High CPU Usage', severity: 'high', tags: ['performance']}
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_alert_templates_category (category)
);

-- Escalation policies
CREATE TABLE alert_escalation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    
    -- Escalation rules (JSON format)
    escalation_rules JSONB NOT NULL, -- [{level: 1, delay_minutes: 15, notify: ['team-lead']}, {level: 2, delay_minutes: 30, notify: ['manager']}]
    
    -- Conditions for applying this policy
    conditions JSONB, -- {severity: ['critical', 'high'], source_type: 'server'}
    
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_escalation_policies_enabled (enabled)
);

-- Alert notifications tracking
CREATE TABLE alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- email, sms, slack, webhook, push
    recipient VARCHAR(255) NOT NULL,
    
    -- Notification details
    subject VARCHAR(500),
    message TEXT,
    
    -- Delivery status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_alert_notifications_alert_id (alert_id),
    INDEX idx_alert_notifications_status (status),
    INDEX idx_alert_notifications_type (notification_type)
);

-- Alert metrics for reporting and analytics
CREATE TABLE alert_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    
    -- Metrics by severity
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    
    -- Metrics by status
    open_count INTEGER DEFAULT 0,
    acknowledged_count INTEGER DEFAULT 0,
    in_progress_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_resolution_time_minutes INTEGER,
    avg_acknowledgment_time_minutes INTEGER,
    escalation_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, hour),
    INDEX idx_alert_metrics_date (date),
    INDEX idx_alert_metrics_date_hour (date, hour)
);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_templates_updated_at BEFORE UPDATE ON alert_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_policies_updated_at BEFORE UPDATE ON alert_escalation_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_notifications_updated_at BEFORE UPDATE ON alert_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for automatic alert history logging
CREATE OR REPLACE FUNCTION log_alert_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO alert_history (alert_id, action, details, new_values, created_by)
        VALUES (NEW.id, 'created', 'Alert created', to_jsonb(NEW), 'system');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO alert_history (alert_id, action, details, old_values, new_values, created_by)
        VALUES (NEW.id, 'updated', 'Alert updated', to_jsonb(OLD), to_jsonb(NEW), 'system');
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_alert_changes_trigger
    AFTER INSERT OR UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION log_alert_changes();

-- Insert sample alert templates
INSERT INTO alert_templates (name, description, category, template_data) VALUES
('High CPU Usage', 'Server CPU usage exceeds threshold', 'system', '{"title": "High CPU Usage on {server}", "severity": "high", "tags": ["performance", "cpu"], "description": "CPU usage has exceeded 80% for more than 5 minutes"}'),
('Database Connection Error', 'Database connection failure', 'database', '{"title": "Database Connection Error", "severity": "critical", "tags": ["database", "connectivity"], "description": "Unable to connect to database server"}'),
('Disk Space Low', 'Disk space running low', 'system', '{"title": "Low Disk Space on {server}", "severity": "medium", "tags": ["storage", "disk"], "description": "Disk space is below 10% on {mount_point}"}'),
('Application Error', 'Application error detected', 'application', '{"title": "Application Error in {application}", "severity": "high", "tags": ["application", "error"], "description": "Application error detected: {error_message}"}'),
('Network Connectivity Issue', 'Network connectivity problem', 'network', '{"title": "Network Connectivity Issue", "severity": "high", "tags": ["network", "connectivity"], "description": "Network connectivity issue detected between {source} and {destination}"}');

-- Insert sample escalation policy
INSERT INTO alert_escalation_policies (name, description, escalation_rules, conditions) VALUES
('Default Critical Escalation', 'Default escalation policy for critical alerts', 
'[{"level": 1, "delay_minutes": 15, "notify": ["team-lead"]}, {"level": 2, "delay_minutes": 30, "notify": ["manager"]}, {"level": 3, "delay_minutes": 60, "notify": ["director"]}]',
'{"severity": ["critical"]}'),
('High Priority Escalation', 'Escalation policy for high priority alerts',
'[{"level": 1, "delay_minutes": 30, "notify": ["team-lead"]}, {"level": 2, "delay_minutes": 60, "notify": ["manager"]}]',
'{"severity": ["high"]}');

-- Insert sample automation rules
INSERT INTO alert_rules (name, description, conditions, actions) VALUES
('Auto-assign Database Alerts', 'Automatically assign database alerts to DBA team', 
'{"tags": ["database"]}', 
'{"assign_to": "dba-team", "notify": ["email"]}'),
('Critical Alert Escalation', 'Auto-escalate critical alerts after 15 minutes',
'{"severity": "critical", "status": "open"}',
'{"escalate_after": 900, "notify": ["slack", "email"]}'),
('Duplicate Alert Suppression', 'Suppress duplicate alerts within 5 minutes',
'{"correlation_key": "*"}',
'{"suppress_duplicates": true, "suppress_window": 300}');

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_composite_status_severity ON alerts(status, severity, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_composite_source_created ON alerts(source, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_full_text ON alerts USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Grant permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sams_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sams_app_user;
