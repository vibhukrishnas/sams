#!/usr/bin/env python3
"""
SAMS Database Schema Generator
Generates actual database schemas, migration scripts, and data models
"""

import os
import json
import yaml
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SAMSDatabaseSchemaGenerator:
    def __init__(self):
        self.output_dir = "database_output"
        os.makedirs(self.output_dir, exist_ok=True)
        self.schemas = {}
        self.migrations = []
        self.data_models = {}

    def generate_postgresql_schemas(self) -> Dict[str, str]:
        """Generate PostgreSQL schemas for relational data"""

        # User Management Schema
        user_schema = """
-- SAMS User Management Schema
-- Generated on: {timestamp}

-- Users table for authentication and profile management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    access_token_jti VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false
);

-- User preferences and notification settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_email BOOLEAN DEFAULT true,
    notification_sms BOOLEAN DEFAULT false,
    notification_push BOOLEAN DEFAULT true,
    notification_slack BOOLEAN DEFAULT false,
    alert_frequency VARCHAR(20) DEFAULT 'immediate',
    dashboard_theme VARCHAR(20) DEFAULT 'light',
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_preferences_frequency_check CHECK (alert_frequency IN ('immediate', 'digest_hourly', 'digest_daily')),
    CONSTRAINT user_preferences_theme_check CHECK (dashboard_theme IN ('light', 'dark', 'auto'))
);

-- Audit log for user actions
CREATE TABLE user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_audit_log_user_id ON user_audit_log(user_id);
CREATE INDEX idx_user_audit_log_created_at ON user_audit_log(created_at);
CREATE INDEX idx_user_audit_log_action ON user_audit_log(action);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
""".format(timestamp=datetime.now().isoformat())

        # Server Management Schema
        server_schema = """
-- SAMS Server Management Schema
-- Generated on: {timestamp}

-- Servers table for monitored infrastructure
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER DEFAULT 22,
    server_type VARCHAR(50) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    region VARCHAR(100),
    datacenter VARCHAR(100),
    operating_system VARCHAR(100),
    os_version VARCHAR(50),
    cpu_cores INTEGER,
    memory_gb INTEGER,
    disk_gb INTEGER,
    tags JSONB DEFAULT '{{}}',
    monitoring_enabled BOOLEAN DEFAULT true,
    agent_version VARCHAR(20),
    agent_last_seen TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT servers_server_type_check CHECK (server_type IN ('web', 'database', 'cache', 'queue', 'load_balancer', 'application', 'other')),
    CONSTRAINT servers_environment_check CHECK (environment IN ('production', 'staging', 'development', 'testing')),
    CONSTRAINT servers_port_check CHECK (port > 0 AND port <= 65535)
);

-- Server groups for logical organization
CREATE TABLE server_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between servers and groups
CREATE TABLE server_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES server_groups(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(server_id, group_id)
);

-- Server health checks configuration
CREATE TABLE server_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL,
    check_config JSONB NOT NULL,
    interval_seconds INTEGER DEFAULT 300,
    timeout_seconds INTEGER DEFAULT 30,
    retry_count INTEGER DEFAULT 3,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT health_checks_type_check CHECK (check_type IN ('ping', 'tcp', 'http', 'https', 'ssh', 'custom')),
    CONSTRAINT health_checks_interval_check CHECK (interval_seconds >= 60),
    CONSTRAINT health_checks_timeout_check CHECK (timeout_seconds > 0 AND timeout_seconds < interval_seconds)
);

-- Indexes for server management
CREATE INDEX idx_servers_hostname ON servers(hostname);
CREATE INDEX idx_servers_ip_address ON servers(ip_address);
CREATE INDEX idx_servers_environment ON servers(environment);
CREATE INDEX idx_servers_server_type ON servers(server_type);
CREATE INDEX idx_servers_monitoring_enabled ON servers(monitoring_enabled);
CREATE INDEX idx_servers_agent_last_seen ON servers(agent_last_seen);
CREATE INDEX idx_servers_tags ON servers USING GIN(tags);
CREATE INDEX idx_server_groups_name ON server_groups(name);
CREATE INDEX idx_server_group_memberships_server_id ON server_group_memberships(server_id);
CREATE INDEX idx_server_group_memberships_group_id ON server_group_memberships(group_id);
CREATE INDEX idx_server_health_checks_server_id ON server_health_checks(server_id);

-- Triggers for server management
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_server_groups_updated_at BEFORE UPDATE ON server_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_server_health_checks_updated_at BEFORE UPDATE ON server_health_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
""".format(timestamp=datetime.now().isoformat())

        # Alert Management Schema
        alert_schema = """
-- SAMS Alert Management Schema
-- Generated on: {timestamp}

-- Alert rules for defining monitoring conditions
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_name VARCHAR(255) NOT NULL,
    condition_operator VARCHAR(20) NOT NULL,
    threshold_value DECIMAL(15,6) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    evaluation_window_minutes INTEGER DEFAULT 5,
    evaluation_frequency_minutes INTEGER DEFAULT 1,
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    server_group_id UUID REFERENCES server_groups(id) ON DELETE CASCADE,
    tags_filter JSONB DEFAULT '{{}}',
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT alert_rules_operator_check CHECK (condition_operator IN ('>', '>=', '<', '<=', '==', '!=')),
    CONSTRAINT alert_rules_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT alert_rules_target_check CHECK ((server_id IS NOT NULL) OR (server_group_id IS NOT NULL)),
    CONSTRAINT alert_rules_evaluation_check CHECK (evaluation_frequency_minutes <= evaluation_window_minutes)
);

-- Alerts generated from rule evaluations
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    metric_name VARCHAR(255) NOT NULL,
    current_value DECIMAL(15,6) NOT NULL,
    threshold_value DECIMAL(15,6) NOT NULL,
    evaluation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    first_occurrence TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INTEGER DEFAULT 1,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    tags JSONB DEFAULT '{{}}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT alerts_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT alerts_status_check CHECK (status IN ('open', 'acknowledged', 'resolved', 'suppressed'))
);

-- Alert escalation policies
CREATE TABLE alert_escalation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Escalation steps within policies
CREATE TABLE alert_escalation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES alert_escalation_policies(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    delay_minutes INTEGER NOT NULL,
    notification_channels JSONB NOT NULL,
    target_users JSONB,
    target_groups JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT escalation_steps_order_check CHECK (step_order > 0),
    CONSTRAINT escalation_steps_delay_check CHECK (delay_minutes >= 0),
    UNIQUE(policy_id, step_order)
);

-- Alert suppression rules for maintenance windows
CREATE TABLE alert_suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    server_group_id UUID REFERENCES server_groups(id) ON DELETE CASCADE,
    alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT suppressions_time_check CHECK (end_time > start_time),
    CONSTRAINT suppressions_target_check CHECK (
        (server_id IS NOT NULL) OR
        (server_group_id IS NOT NULL) OR
        (alert_rule_id IS NOT NULL)
    )
);

-- Indexes for alert management
CREATE INDEX idx_alert_rules_metric_name ON alert_rules(metric_name);
CREATE INDEX idx_alert_rules_server_id ON alert_rules(server_id);
CREATE INDEX idx_alert_rules_server_group_id ON alert_rules(server_group_id);
CREATE INDEX idx_alert_rules_enabled ON alert_rules(is_enabled);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX idx_alerts_server_id ON alerts(server_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_evaluation_timestamp ON alerts(evaluation_timestamp);
CREATE INDEX idx_alert_escalation_steps_policy_id ON alert_escalation_steps(policy_id);
CREATE INDEX idx_alert_suppressions_server_id ON alert_suppressions(server_id);
CREATE INDEX idx_alert_suppressions_time_range ON alert_suppressions(start_time, end_time);

-- Triggers for alert management
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_escalation_policies_updated_at BEFORE UPDATE ON alert_escalation_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
""".format(timestamp=datetime.now().isoformat())

        # Notification Management Schema
        notification_schema = """
-- SAMS Notification Management Schema
-- Generated on: {timestamp}

-- Notification channels configuration
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notification_channels_type_check CHECK (type IN ('email', 'sms', 'slack', 'webhook', 'push', 'teams'))
);

-- Notification templates for different alert types
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notification_templates_channel_check CHECK (channel_type IN ('email', 'sms', 'slack', 'webhook', 'push', 'teams'))
);

-- Notification delivery log
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    external_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notification_deliveries_status_check CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced'))
);

-- Indexes for notification management
CREATE INDEX idx_notification_channels_type ON notification_channels(type);
CREATE INDEX idx_notification_channels_enabled ON notification_channels(is_enabled);
CREATE INDEX idx_notification_templates_channel_type ON notification_templates(channel_type);
CREATE INDEX idx_notification_templates_default ON notification_templates(is_default);
CREATE INDEX idx_notification_deliveries_alert_id ON notification_deliveries(alert_id);
CREATE INDEX idx_notification_deliveries_channel_id ON notification_deliveries(channel_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_created_at ON notification_deliveries(created_at);

-- Triggers for notification management
CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
""".format(timestamp=datetime.now().isoformat())

        self.schemas = {
            "user_management": user_schema,
            "server_management": server_schema,
            "alert_management": alert_schema,
            "notification_management": notification_schema
        }

        return self.schemas

    def generate_influxdb_schemas(self) -> Dict[str, str]:
        """Generate InfluxDB schemas for time-series metrics data"""

        # Metrics measurement schema
        metrics_schema = """
# SAMS InfluxDB Metrics Schema
# Generated on: {timestamp}

# Server Metrics Measurement
# Measurement: server_metrics
# Tags: server_id, metric_type, environment, region
# Fields: value (float), status (string), metadata (string)

# Example data points:
# server_metrics,server_id=srv-001,metric_type=cpu_usage,environment=production,region=us-east-1 value=75.5,status="normal" {timestamp}
# server_metrics,server_id=srv-001,metric_type=memory_usage,environment=production,region=us-east-1 value=82.3,status="warning" {timestamp}
# server_metrics,server_id=srv-001,metric_type=disk_usage,environment=production,region=us-east-1 value=45.2,status="normal" {timestamp}

# Network Metrics Measurement
# Measurement: network_metrics
# Tags: server_id, interface, direction, environment
# Fields: bytes_per_second (float), packets_per_second (float), errors (integer)

# Application Metrics Measurement
# Measurement: application_metrics
# Tags: server_id, application, service, environment
# Fields: response_time (float), throughput (float), error_rate (float)

# Database Metrics Measurement
# Measurement: database_metrics
# Tags: server_id, database_type, database_name, environment
# Fields: connections (integer), query_time (float), cache_hit_ratio (float)

# Custom Metrics Measurement
# Measurement: custom_metrics
# Tags: server_id, metric_name, source, environment
# Fields: value (float), unit (string), description (string)

# Retention Policies
CREATE RETENTION POLICY "realtime" ON "sams" DURATION 7d REPLICATION 1 DEFAULT
CREATE RETENTION POLICY "hourly" ON "sams" DURATION 30d REPLICATION 1
CREATE RETENTION POLICY "daily" ON "sams" DURATION 365d REPLICATION 1
CREATE RETENTION POLICY "monthly" ON "sams" DURATION 1095d REPLICATION 1

# Continuous Queries for Downsampling
CREATE CONTINUOUS QUERY "cq_hourly_avg" ON "sams"
BEGIN
  SELECT mean(*) INTO "sams"."hourly"."server_metrics_hourly"
  FROM "sams"."realtime"."server_metrics"
  GROUP BY time(1h), *
END

CREATE CONTINUOUS QUERY "cq_daily_avg" ON "sams"
BEGIN
  SELECT mean(*) INTO "sams"."daily"."server_metrics_daily"
  FROM "sams"."hourly"."server_metrics_hourly"
  GROUP BY time(1d), *
END

CREATE CONTINUOUS QUERY "cq_monthly_avg" ON "sams"
BEGIN
  SELECT mean(*) INTO "sams"."monthly"."server_metrics_monthly"
  FROM "sams"."daily"."server_metrics_daily"
  GROUP BY time(30d), *
END
""".format(timestamp=datetime.now().isoformat())

        # Alert metrics schema
        alert_metrics_schema = """
# SAMS Alert Metrics Schema for InfluxDB
# Generated on: {timestamp}

# Alert Events Measurement
# Measurement: alert_events
# Tags: alert_id, rule_id, server_id, severity, status, environment
# Fields: duration (integer), escalation_level (integer), resolution_time (integer)

# Alert Performance Measurement
# Measurement: alert_performance
# Tags: rule_id, server_id, environment
# Fields: evaluation_time (float), false_positive_rate (float), detection_accuracy (float)

# System Health Measurement
# Measurement: system_health
# Tags: server_id, component, environment
# Fields: health_score (float), availability (float), performance_score (float)

# Retention Policy for Alert Metrics
CREATE RETENTION POLICY "alert_realtime" ON "sams_alerts" DURATION 30d REPLICATION 1 DEFAULT
CREATE RETENTION POLICY "alert_historical" ON "sams_alerts" DURATION 1095d REPLICATION 1

# Continuous Queries for Alert Analytics
CREATE CONTINUOUS QUERY "cq_alert_summary" ON "sams_alerts"
BEGIN
  SELECT count(*) as alert_count, mean(duration) as avg_duration
  INTO "sams_alerts"."alert_historical"."alert_summary_daily"
  FROM "sams_alerts"."alert_realtime"."alert_events"
  GROUP BY time(1d), severity, server_id
END
""".format(timestamp=datetime.now().isoformat())

        influx_schemas = {
            "metrics_schema": metrics_schema,
            "alert_metrics_schema": alert_metrics_schema
        }

        return influx_schemas

    def generate_migration_scripts(self) -> List[Dict[str, Any]]:
        """Generate database migration scripts"""

        migrations = [
            {
                "version": "001",
                "name": "initial_user_management",
                "description": "Create initial user management tables",
                "up_script": """
-- Migration 001: Initial User Management
-- Create users table and related structures

BEGIN;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Insert default admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES ('admin@sams.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'System', 'Administrator', 'admin', true);

COMMIT;
""",
                "down_script": """
-- Migration 001 Rollback: Remove User Management
BEGIN;
DROP TABLE IF EXISTS users CASCADE;
COMMIT;
""",
                "dependencies": [],
                "estimated_time": "30 seconds"
            },
            {
                "version": "002",
                "name": "add_user_sessions",
                "description": "Add user session management",
                "up_script": """
-- Migration 002: Add User Sessions
BEGIN;

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    access_token_jti VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);

COMMIT;
""",
                "down_script": """
-- Migration 002 Rollback: Remove User Sessions
BEGIN;
DROP TABLE IF EXISTS user_sessions CASCADE;
COMMIT;
""",
                "dependencies": ["001"],
                "estimated_time": "15 seconds"
            },
            {
                "version": "003",
                "name": "create_server_management",
                "description": "Create server management tables",
                "up_script": """
-- Migration 003: Create Server Management
BEGIN;

CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    server_type VARCHAR(50) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    monitoring_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE server_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_servers_hostname ON servers(hostname);
CREATE INDEX idx_servers_environment ON servers(environment);

COMMIT;
""",
                "down_script": """
-- Migration 003 Rollback: Remove Server Management
BEGIN;
DROP TABLE IF EXISTS servers CASCADE;
DROP TABLE IF EXISTS server_groups CASCADE;
COMMIT;
""",
                "dependencies": ["001"],
                "estimated_time": "20 seconds"
            },
            {
                "version": "004",
                "name": "create_alert_management",
                "description": "Create alert management tables",
                "up_script": """
-- Migration 004: Create Alert Management
BEGIN;

CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    condition_operator VARCHAR(20) NOT NULL,
    threshold_value DECIMAL(15,6) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    current_value DECIMAL(15,6) NOT NULL,
    threshold_value DECIMAL(15,6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_rules_server_id ON alert_rules(server_id);
CREATE INDEX idx_alerts_status ON alerts(status);

COMMIT;
""",
                "down_script": """
-- Migration 004 Rollback: Remove Alert Management
BEGIN;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
COMMIT;
""",
                "dependencies": ["003"],
                "estimated_time": "25 seconds"
            }
        ]

        self.migrations = migrations
        return migrations

    def generate_data_models(self) -> Dict[str, Any]:
        """Generate data model definitions for application use"""

        data_models = {
            "user_models": {
                "User": {
                    "table": "users",
                    "fields": {
                        "id": {"type": "UUID", "primary_key": True},
                        "email": {"type": "String", "unique": True, "required": True},
                        "password_hash": {"type": "String", "required": True},
                        "first_name": {"type": "String", "required": True},
                        "last_name": {"type": "String", "required": True},
                        "role": {"type": "Enum", "values": ["admin", "manager", "user", "viewer"]},
                        "is_active": {"type": "Boolean", "default": True},
                        "email_verified": {"type": "Boolean", "default": False},
                        "created_at": {"type": "DateTime", "auto_now_add": True},
                        "updated_at": {"type": "DateTime", "auto_now": True}
                    },
                    "relationships": {
                        "sessions": {"type": "OneToMany", "model": "UserSession"},
                        "preferences": {"type": "OneToOne", "model": "UserPreferences"},
                        "created_servers": {"type": "OneToMany", "model": "Server"},
                        "audit_logs": {"type": "OneToMany", "model": "UserAuditLog"}
                    },
                    "methods": {
                        "check_password": "Verify password against hash",
                        "set_password": "Hash and set new password",
                        "get_full_name": "Return first_name + last_name",
                        "has_permission": "Check if user has specific permission"
                    }
                },
                "UserSession": {
                    "table": "user_sessions",
                    "fields": {
                        "id": {"type": "UUID", "primary_key": True},
                        "user_id": {"type": "UUID", "foreign_key": "users.id"},
                        "refresh_token": {"type": "String", "unique": True},
                        "access_token_jti": {"type": "String", "unique": True},
                        "expires_at": {"type": "DateTime", "required": True},
                        "created_at": {"type": "DateTime", "auto_now_add": True},
                        "ip_address": {"type": "IPAddress"},
                        "user_agent": {"type": "Text"},
                        "is_revoked": {"type": "Boolean", "default": False}
                    },
                    "relationships": {
                        "user": {"type": "ManyToOne", "model": "User"}
                    },
                    "methods": {
                        "is_expired": "Check if session is expired",
                        "revoke": "Mark session as revoked"
                    }
                }
            },
            "server_models": {
                "Server": {
                    "table": "servers",
                    "fields": {
                        "id": {"type": "UUID", "primary_key": True},
                        "name": {"type": "String", "required": True},
                        "hostname": {"type": "String", "required": True},
                        "ip_address": {"type": "IPAddress", "required": True},
                        "port": {"type": "Integer", "default": 22},
                        "server_type": {"type": "Enum", "values": ["web", "database", "cache", "queue", "load_balancer", "application", "other"]},
                        "environment": {"type": "Enum", "values": ["production", "staging", "development", "testing"]},
                        "monitoring_enabled": {"type": "Boolean", "default": True},
                        "agent_version": {"type": "String"},
                        "agent_last_seen": {"type": "DateTime"},
                        "created_at": {"type": "DateTime", "auto_now_add": True},
                        "updated_at": {"type": "DateTime", "auto_now": True}
                    },
                    "relationships": {
                        "alert_rules": {"type": "OneToMany", "model": "AlertRule"},
                        "alerts": {"type": "OneToMany", "model": "Alert"},
                        "health_checks": {"type": "OneToMany", "model": "ServerHealthCheck"},
                        "group_memberships": {"type": "OneToMany", "model": "ServerGroupMembership"}
                    },
                    "methods": {
                        "get_latest_metrics": "Get most recent metrics for server",
                        "get_health_status": "Calculate overall health status",
                        "is_agent_online": "Check if monitoring agent is online"
                    }
                },
                "ServerGroup": {
                    "table": "server_groups",
                    "fields": {
                        "id": {"type": "UUID", "primary_key": True},
                        "name": {"type": "String", "required": True},
                        "description": {"type": "Text"},
                        "color": {"type": "String", "default": "#007bff"},
                        "created_at": {"type": "DateTime", "auto_now_add": True}
                    },
                    "relationships": {
                        "memberships": {"type": "OneToMany", "model": "ServerGroupMembership"},
                        "servers": {"type": "ManyToMany", "model": "Server", "through": "ServerGroupMembership"}
                    }
                }
            },
            "alert_models": {
                "AlertRule": {
                    "table": "alert_rules",
                    "fields": {
                        "id": {"type": "UUID", "primary_key": True},
                        "name": {"type": "String", "required": True},
                        "description": {"type": "Text"},
                        "metric_name": {"type": "String", "required": True},
                        "condition_operator": {"type": "Enum", "values": [">", ">=", "<", "<=", "==", "!="]},
                        "threshold_value": {"type": "Decimal", "precision": 15, "scale": 6},
                        "severity": {"type": "Enum", "values": ["critical", "high", "medium", "low"]},
                        "evaluation_window_minutes": {"type": "Integer", "default": 5},
                        "is_enabled": {"type": "Boolean", "default": True},
                        "created_at": {"type": "DateTime", "auto_now_add": True}
                    },
                    "relationships": {
                        "server": {"type": "ManyToOne", "model": "Server"},
                        "alerts": {"type": "OneToMany", "model": "Alert"}
                    },
                    "methods": {
                        "evaluate": "Evaluate rule against current metrics",
                        "get_alert_count": "Get number of alerts generated by this rule"
                    }
                },
                "Alert": {
                    "table": "alerts",
                    "fields": {
                        "id": {"type": "UUID", "primary_key": True},
                        "rule_id": {"type": "UUID", "foreign_key": "alert_rules.id"},
                        "server_id": {"type": "UUID", "foreign_key": "servers.id"},
                        "title": {"type": "String", "required": True},
                        "description": {"type": "Text"},
                        "severity": {"type": "Enum", "values": ["critical", "high", "medium", "low"]},
                        "status": {"type": "Enum", "values": ["open", "acknowledged", "resolved", "suppressed"]},
                        "current_value": {"type": "Decimal", "precision": 15, "scale": 6},
                        "threshold_value": {"type": "Decimal", "precision": 15, "scale": 6},
                        "created_at": {"type": "DateTime", "auto_now_add": True}
                    },
                    "relationships": {
                        "rule": {"type": "ManyToOne", "model": "AlertRule"},
                        "server": {"type": "ManyToOne", "model": "Server"},
                        "notifications": {"type": "OneToMany", "model": "NotificationDelivery"}
                    },
                    "methods": {
                        "acknowledge": "Mark alert as acknowledged",
                        "resolve": "Mark alert as resolved",
                        "get_duration": "Calculate alert duration"
                    }
                }
            }
        }

        self.data_models = data_models
        return data_models

    def generate_retention_policies(self) -> Dict[str, Any]:
        """Generate data retention and archival policies"""

        retention_policies = {
            "postgresql_retention": {
                "user_audit_log": {
                    "retention_period": "2 years",
                    "archive_after": "1 year",
                    "cleanup_script": """
-- Clean up old audit logs (older than 2 years)
DELETE FROM user_audit_log
WHERE created_at < NOW() - INTERVAL '2 years';
""",
                    "archive_script": """
-- Archive audit logs older than 1 year
INSERT INTO user_audit_log_archive
SELECT * FROM user_audit_log
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM user_audit_log
WHERE created_at < NOW() - INTERVAL '1 year';
"""
                },
                "alerts": {
                    "retention_period": "1 year",
                    "archive_after": "6 months",
                    "cleanup_script": """
-- Clean up resolved alerts older than 1 year
DELETE FROM alerts
WHERE status = 'resolved'
AND resolved_at < NOW() - INTERVAL '1 year';
""",
                    "archive_script": """
-- Archive old alerts
INSERT INTO alerts_archive
SELECT * FROM alerts
WHERE created_at < NOW() - INTERVAL '6 months'
AND status IN ('resolved', 'suppressed');
"""
                },
                "notification_deliveries": {
                    "retention_period": "90 days",
                    "cleanup_script": """
-- Clean up old notification delivery logs
DELETE FROM notification_deliveries
WHERE created_at < NOW() - INTERVAL '90 days';
"""
                },
                "user_sessions": {
                    "retention_period": "30 days",
                    "cleanup_script": """
-- Clean up expired and old sessions
DELETE FROM user_sessions
WHERE expires_at < NOW()
OR created_at < NOW() - INTERVAL '30 days';
"""
                }
            },
            "influxdb_retention": {
                "realtime_metrics": {
                    "retention_period": "7 days",
                    "shard_duration": "1 hour",
                    "policy": "CREATE RETENTION POLICY realtime ON sams DURATION 7d REPLICATION 1 DEFAULT"
                },
                "hourly_aggregates": {
                    "retention_period": "30 days",
                    "shard_duration": "1 day",
                    "policy": "CREATE RETENTION POLICY hourly ON sams DURATION 30d REPLICATION 1"
                },
                "daily_aggregates": {
                    "retention_period": "365 days",
                    "shard_duration": "7 days",
                    "policy": "CREATE RETENTION POLICY daily ON sams DURATION 365d REPLICATION 1"
                },
                "monthly_aggregates": {
                    "retention_period": "3 years",
                    "shard_duration": "30 days",
                    "policy": "CREATE RETENTION POLICY monthly ON sams DURATION 1095d REPLICATION 1"
                }
            },
            "automated_cleanup": {
                "schedule": "Daily at 2:00 AM UTC",
                "cleanup_order": [
                    "user_sessions",
                    "notification_deliveries",
                    "user_audit_log",
                    "alerts"
                ],
                "monitoring": {
                    "alert_on_failure": True,
                    "log_cleanup_stats": True,
                    "max_execution_time": "30 minutes"
                }
            }
        }

        return retention_policies

    def save_all_schemas(self):
        """Save all generated schemas to files"""

        # Save PostgreSQL schemas
        postgres_schemas = self.generate_postgresql_schemas()
        for schema_name, schema_sql in postgres_schemas.items():
            with open(f"{self.output_dir}/{schema_name}_schema.sql", "w") as f:
                f.write(schema_sql)

        # Save InfluxDB schemas
        influx_schemas = self.generate_influxdb_schemas()
        for schema_name, schema_content in influx_schemas.items():
            with open(f"{self.output_dir}/{schema_name}.influx", "w") as f:
                f.write(schema_content)

        # Save migration scripts
        migrations = self.generate_migration_scripts()
        migrations_dir = f"{self.output_dir}/migrations"
        os.makedirs(migrations_dir, exist_ok=True)

        for migration in migrations:
            migration_file = f"{migrations_dir}/{migration['version']}_{migration['name']}.sql"
            with open(migration_file, "w") as f:
                f.write(f"-- Migration {migration['version']}: {migration['description']}\n")
                f.write(f"-- Dependencies: {', '.join(migration['dependencies']) if migration['dependencies'] else 'None'}\n")
                f.write(f"-- Estimated time: {migration['estimated_time']}\n\n")
                f.write("-- UP MIGRATION\n")
                f.write(migration['up_script'])
                f.write("\n\n-- DOWN MIGRATION\n")
                f.write(migration['down_script'])

        # Save data models
        data_models = self.generate_data_models()
        with open(f"{self.output_dir}/data_models.json", "w") as f:
            json.dump(data_models, f, indent=2)

        # Save retention policies
        retention_policies = self.generate_retention_policies()
        with open(f"{self.output_dir}/retention_policies.json", "w") as f:
            json.dump(retention_policies, f, indent=2)

        # Generate master schema file
        master_schema = {
            "database_design": {
                "postgresql_schemas": list(postgres_schemas.keys()),
                "influxdb_schemas": list(influx_schemas.keys()),
                "migrations_count": len(migrations),
                "data_models": list(data_models.keys()),
                "retention_policies": list(retention_policies.keys())
            },
            "generation_info": {
                "generated_at": datetime.now().isoformat(),
                "generator_version": "1.0.0",
                "database_versions": {
                    "postgresql": "15+",
                    "influxdb": "2.7+",
                    "redis": "7+"
                }
            }
        }

        with open(f"{self.output_dir}/database_design_summary.json", "w") as f:
            json.dump(master_schema, f, indent=2)

    def run_schema_generation(self):
        """Run complete database schema generation"""
        logger.info("🗄️ Generating SAMS Database Schemas...")

        # Generate all schemas and save to files
        self.save_all_schemas()

        logger.info(f"✅ Database schema generation complete!")
        logger.info(f"📁 Output directory: {self.output_dir}")
        logger.info(f"🔧 Generated PostgreSQL schemas: {len(self.schemas)}")
        logger.info(f"📊 Generated InfluxDB schemas: 2")
        logger.info(f"🔄 Generated migration scripts: {len(self.migrations)}")
        logger.info(f"📋 Generated data models: {len(self.data_models)}")

        return {
            "schemas_generated": len(self.schemas),
            "migrations_generated": len(self.migrations),
            "output_directory": self.output_dir
        }

if __name__ == "__main__":
    generator = SAMSDatabaseSchemaGenerator()
    result = generator.run_schema_generation()
    print("🎉 SAMS Database Schema Generation Complete!")
    print(f"📁 Check the '{generator.output_dir}' directory for all generated files")