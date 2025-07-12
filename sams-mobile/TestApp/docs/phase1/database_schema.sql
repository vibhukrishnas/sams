-- ============================================================================
-- SAMS Mobile - Database Schema Design
-- Comprehensive database schemas for mobile infrastructure monitoring
-- ============================================================================

-- ============================================================================
-- PostgreSQL Schema for Relational Data
-- ============================================================================

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user', 'readonly'))
);

-- Mobile Device Registration
CREATE TABLE mobile_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    push_token VARCHAR(255),
    biometric_enabled BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT mobile_devices_type_check CHECK (device_type IN ('ios', 'android', 'web'))
);

-- Organizations and Teams
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    max_servers INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT organizations_tier_check CHECK (subscription_tier IN ('free', 'pro', 'enterprise'))
);

-- User Organization Membership
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_organizations_role_check CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
    UNIQUE(user_id, organization_id)
);

-- Server Management
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER DEFAULT 22,
    server_type VARCHAR(50) DEFAULT 'linux',
    environment VARCHAR(20) DEFAULT 'production',
    status VARCHAR(20) DEFAULT 'unknown',
    agent_version VARCHAR(20),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT servers_type_check CHECK (server_type IN ('linux', 'windows', 'docker', 'kubernetes')),
    CONSTRAINT servers_env_check CHECK (environment IN ('production', 'staging', 'development', 'test')),
    CONSTRAINT servers_status_check CHECK (status IN ('online', 'offline', 'warning', 'critical', 'unknown'))
);

-- Alert Rules and Configuration
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_name VARCHAR(100) NOT NULL,
    condition VARCHAR(20) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT alert_rules_condition_check CHECK (condition IN ('>', '<', '>=', '<=', '==', '!=')),
    CONSTRAINT alert_rules_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info'))
);

-- Alert Instances
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    metric_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT alerts_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    CONSTRAINT alerts_status_check CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed'))
);

-- Alert Actions and History
CREATE TABLE alert_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB,
    voice_command TEXT,
    device_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT alert_actions_type_check CHECK (action_type IN ('created', 'acknowledged', 'resolved', 'escalated', 'commented', 'voice_response'))
);

-- Mobile Notification Preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    severity_critical BOOLEAN DEFAULT true,
    severity_high BOOLEAN DEFAULT true,
    severity_medium BOOLEAN DEFAULT false,
    severity_low BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    voice_alerts BOOLEAN DEFAULT false,
    wearable_notifications BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, organization_id)
);

-- Voice Commands and Responses
CREATE TABLE voice_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    command_text TEXT NOT NULL,
    intent VARCHAR(100),
    confidence_score DECIMAL(3,2),
    response_text TEXT,
    audio_file_url VARCHAR(500),
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mobile App Analytics
CREATE TABLE mobile_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    screen_name VARCHAR(100),
    session_id VARCHAR(100),
    app_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- InfluxDB Schema for Time-Series Metrics
-- ============================================================================

-- Server Performance Metrics
-- Measurement: server_metrics
-- Tags: server_id, hostname, metric_type, environment
-- Fields: value, threshold, status
-- Time: timestamp

-- Example InfluxDB Line Protocol:
-- server_metrics,server_id=uuid,hostname=web01,metric_type=cpu,environment=prod value=75.5,threshold=80.0,status="warning" 1640995200000000000
-- server_metrics,server_id=uuid,hostname=web01,metric_type=memory,environment=prod value=8.2,threshold=16.0,status="ok" 1640995200000000000
-- server_metrics,server_id=uuid,hostname=web01,metric_type=disk,environment=prod value=45.8,threshold=90.0,status="ok" 1640995200000000000

-- Mobile App Performance Metrics
-- Measurement: mobile_performance
-- Tags: user_id, device_type, app_version, metric_type
-- Fields: value, duration_ms, success
-- Time: timestamp

-- Example InfluxDB Line Protocol:
-- mobile_performance,user_id=uuid,device_type=ios,app_version=1.0.0,metric_type=app_start value=2.5,success=true 1640995200000000000
-- mobile_performance,user_id=uuid,device_type=android,app_version=1.0.0,metric_type=api_response value=150,success=true 1640995200000000000

-- ============================================================================
-- Redis Schema for Caching and Sessions
-- ============================================================================

-- User Sessions
-- Key: session:{session_id}
-- Value: JSON with user_id, device_id, expires_at, permissions
-- TTL: 7 days

-- Mobile Device Cache
-- Key: device:{device_id}:cache
-- Value: JSON with cached dashboard data, alerts, server status
-- TTL: 5 minutes

-- Real-time Metrics Cache
-- Key: metrics:{server_id}:latest
-- Value: JSON with latest server metrics
-- TTL: 1 minute

-- Alert Correlation Cache
-- Key: alerts:correlation:{alert_id}
-- Value: JSON with related alerts and correlation score
-- TTL: 1 hour

-- Voice Command Cache
-- Key: voice:{user_id}:commands
-- Value: JSON with recent voice commands and learned patterns
-- TTL: 24 hours

-- ============================================================================
-- Database Indexes for Mobile Performance
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Mobile devices indexes
CREATE INDEX idx_mobile_devices_user_id ON mobile_devices(user_id);
CREATE INDEX idx_mobile_devices_token ON mobile_devices(device_token);
CREATE INDEX idx_mobile_devices_type ON mobile_devices(device_type);
CREATE INDEX idx_mobile_devices_last_seen ON mobile_devices(last_seen);

-- Servers indexes
CREATE INDEX idx_servers_org_id ON servers(organization_id);
CREATE INDEX idx_servers_status ON servers(status);
CREATE INDEX idx_servers_type ON servers(server_type);
CREATE INDEX idx_servers_environment ON servers(environment);
CREATE INDEX idx_servers_last_seen ON servers(last_seen);

-- Alerts indexes
CREATE INDEX idx_alerts_org_id ON alerts(organization_id);
CREATE INDEX idx_alerts_server_id ON alerts(server_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity);

-- Alert actions indexes
CREATE INDEX idx_alert_actions_alert_id ON alert_actions(alert_id);
CREATE INDEX idx_alert_actions_user_id ON alert_actions(user_id);
CREATE INDEX idx_alert_actions_type ON alert_actions(action_type);
CREATE INDEX idx_alert_actions_created_at ON alert_actions(created_at);

-- Voice interactions indexes
CREATE INDEX idx_voice_interactions_user_id ON voice_interactions(user_id);
CREATE INDEX idx_voice_interactions_alert_id ON voice_interactions(alert_id);
CREATE INDEX idx_voice_interactions_created_at ON voice_interactions(created_at);

-- Mobile analytics indexes
CREATE INDEX idx_mobile_analytics_user_id ON mobile_analytics(user_id);
CREATE INDEX idx_mobile_analytics_device_id ON mobile_analytics(device_id);
CREATE INDEX idx_mobile_analytics_event_type ON mobile_analytics(event_type);
CREATE INDEX idx_mobile_analytics_created_at ON mobile_analytics(created_at);

-- ============================================================================
-- Database Functions and Triggers
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Data Retention Policies
-- ============================================================================

-- Mobile analytics retention (90 days)
CREATE OR REPLACE FUNCTION cleanup_mobile_analytics()
RETURNS void AS $$
BEGIN
    DELETE FROM mobile_analytics WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Voice interactions retention (1 year)
CREATE OR REPLACE FUNCTION cleanup_voice_interactions()
RETURNS void AS $$
BEGIN
    DELETE FROM voice_interactions WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Resolved alerts retention (6 months)
CREATE OR REPLACE FUNCTION cleanup_resolved_alerts()
RETURNS void AS $$
BEGIN
    DELETE FROM alerts WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;
