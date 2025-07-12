-- ============================================================================
-- SAMS Mobile - Database Migration 001: Initial Schema
-- Creates the foundational database structure for mobile infrastructure monitoring
-- ============================================================================

-- Migration metadata
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('001', 'Initial schema creation', NOW());

-- ============================================================================
-- EXTENSIONS AND FUNCTIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location features (if needed)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'user', 'readonly')),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User profiles for additional information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_url VARCHAR(500),
    bio TEXT,
    company VARCHAR(255),
    job_title VARCHAR(255),
    location VARCHAR(255),
    website VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- MOBILE DEVICE MANAGEMENT
-- ============================================================================

-- Mobile devices registration
CREATE TABLE mobile_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255), -- User-defined name
    device_type VARCHAR(20) NOT NULL,
    device_model VARCHAR(100),
    device_brand VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    push_token VARCHAR(500), -- FCM/APNs token
    push_token_updated_at TIMESTAMP WITH TIME ZONE,
    biometric_enabled BOOLEAN DEFAULT false,
    biometric_type VARCHAR(50), -- 'touchid', 'faceid', 'fingerprint'
    voice_enabled BOOLEAN DEFAULT false,
    wearable_connected BOOLEAN DEFAULT false,
    wearable_type VARCHAR(50), -- 'apple_watch', 'wear_os'
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_location POINT, -- PostGIS point for location
    battery_level INTEGER, -- 0-100
    network_type VARCHAR(20), -- 'wifi', '4g', '5g', 'ethernet'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT mobile_devices_type_check CHECK (device_type IN ('ios', 'android', 'web')),
    CONSTRAINT mobile_devices_battery_check CHECK (battery_level >= 0 AND battery_level <= 100)
);

-- Device capabilities tracking
CREATE TABLE device_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES mobile_devices(id) ON DELETE CASCADE,
    capability_name VARCHAR(50) NOT NULL,
    is_supported BOOLEAN NOT NULL,
    version VARCHAR(20),
    last_tested TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(device_id, capability_name)
);

-- ============================================================================
-- ORGANIZATION MANAGEMENT
-- ============================================================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(500),
    industry VARCHAR(100),
    size VARCHAR(20), -- 'startup', 'small', 'medium', 'large', 'enterprise'
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_servers INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 10,
    billing_email VARCHAR(255),
    billing_address JSONB,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT organizations_tier_check CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    CONSTRAINT organizations_status_check CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    CONSTRAINT organizations_size_check CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise'))
);

-- User organization membership
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '[]',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT user_organizations_role_check CHECK (role IN ('owner', 'admin', 'manager', 'member', 'readonly')),
    UNIQUE(user_id, organization_id)
);

-- ============================================================================
-- SERVER MANAGEMENT
-- ============================================================================

-- Servers
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER DEFAULT 22,
    server_type VARCHAR(50) DEFAULT 'linux',
    environment VARCHAR(20) DEFAULT 'production',
    location VARCHAR(255),
    datacenter VARCHAR(255),
    status VARCHAR(20) DEFAULT 'unknown',
    agent_version VARCHAR(20),
    agent_last_seen TIMESTAMP WITH TIME ZONE,
    monitoring_enabled BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    maintenance_until TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    last_seen TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT servers_type_check CHECK (server_type IN ('linux', 'windows', 'docker', 'kubernetes', 'cloud')),
    CONSTRAINT servers_env_check CHECK (environment IN ('production', 'staging', 'development', 'test')),
    CONSTRAINT servers_status_check CHECK (status IN ('online', 'offline', 'warning', 'critical', 'unknown', 'maintenance')),
    CONSTRAINT servers_port_check CHECK (port > 0 AND port <= 65535)
);

-- Server groups for organization
CREATE TABLE server_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, name)
);

-- Server group membership
CREATE TABLE server_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_group_id UUID NOT NULL REFERENCES server_groups(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(server_group_id, server_id)
);

-- ============================================================================
-- ALERT MANAGEMENT
-- ============================================================================

-- Alert rules
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE, -- NULL for global rules
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_name VARCHAR(100) NOT NULL,
    condition VARCHAR(20) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    threshold_duration INTEGER DEFAULT 300, -- seconds
    severity VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    notification_channels JSONB DEFAULT '[]',
    escalation_rules JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT alert_rules_condition_check CHECK (condition IN ('>', '<', '>=', '<=', '==', '!=')),
    CONSTRAINT alert_rules_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info'))
);

-- Alert instances
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    metric_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    first_occurred TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_occurred TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_via VARCHAR(50), -- 'mobile', 'web', 'api', 'voice'
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    escalation_level INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT alerts_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    CONSTRAINT alerts_status_check CHECK (status IN ('open', 'acknowledged', 'resolved', 'closed', 'suppressed'))
);

-- Alert actions and history
CREATE TABLE alert_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    device_id UUID REFERENCES mobile_devices(id),
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB DEFAULT '{}',
    voice_command TEXT,
    voice_confidence DECIMAL(3,2),
    device_type VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT alert_actions_type_check CHECK (action_type IN ('created', 'acknowledged', 'resolved', 'escalated', 'commented', 'voice_response', 'auto_resolved'))
);

-- ============================================================================
-- NOTIFICATION MANAGEMENT
-- ============================================================================

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Severity preferences
    severity_critical BOOLEAN DEFAULT true,
    severity_high BOOLEAN DEFAULT true,
    severity_medium BOOLEAN DEFAULT false,
    severity_low BOOLEAN DEFAULT false,
    severity_info BOOLEAN DEFAULT false,
    
    -- Channel preferences
    push_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    voice_alerts BOOLEAN DEFAULT false,
    wearable_notifications BOOLEAN DEFAULT true,
    
    -- Timing preferences
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    weekend_notifications BOOLEAN DEFAULT true,
    
    -- Advanced preferences
    escalation_timeout INTEGER DEFAULT 900, -- 15 minutes
    max_notifications_per_hour INTEGER DEFAULT 10,
    notification_grouping BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, organization_id)
);

-- Notification delivery log
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'push', 'email', 'sms', 'voice'
    status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed', 'bounced'
    provider VARCHAR(50), -- 'fcm', 'apns', 'sendgrid', 'twilio'
    provider_message_id VARCHAR(255),
    error_message TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT notification_deliveries_channel_check CHECK (channel IN ('push', 'email', 'sms', 'voice', 'webhook')),
    CONSTRAINT notification_deliveries_status_check CHECK (status IN ('sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'))
);

-- ============================================================================
-- INDEXES FOR MOBILE PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_last_login ON users(last_login DESC);

-- Mobile devices indexes
CREATE INDEX idx_mobile_devices_user_id ON mobile_devices(user_id);
CREATE INDEX idx_mobile_devices_token ON mobile_devices(device_token);
CREATE INDEX idx_mobile_devices_type ON mobile_devices(device_type);
CREATE INDEX idx_mobile_devices_last_seen ON mobile_devices(last_seen DESC);
CREATE INDEX idx_mobile_devices_active ON mobile_devices(is_active) WHERE is_active = true;
CREATE INDEX idx_mobile_devices_push_token ON mobile_devices(push_token) WHERE push_token IS NOT NULL;

-- Organizations indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_tier ON organizations(subscription_tier);
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = true;

-- User organizations indexes
CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX idx_user_organizations_role ON user_organizations(role);
CREATE INDEX idx_user_organizations_active ON user_organizations(is_active) WHERE is_active = true;

-- Servers indexes
CREATE INDEX idx_servers_org_id ON servers(organization_id);
CREATE INDEX idx_servers_status ON servers(status);
CREATE INDEX idx_servers_type ON servers(server_type);
CREATE INDEX idx_servers_environment ON servers(environment);
CREATE INDEX idx_servers_last_seen ON servers(last_seen DESC);
CREATE INDEX idx_servers_monitoring ON servers(monitoring_enabled) WHERE monitoring_enabled = true;
CREATE INDEX idx_servers_ip ON servers(ip_address);

-- Alerts indexes (critical for mobile performance)
CREATE INDEX idx_alerts_org_id ON alerts(organization_id);
CREATE INDEX idx_alerts_server_id ON alerts(server_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity);
CREATE INDEX idx_alerts_open_critical ON alerts(organization_id, created_at DESC) WHERE status = 'open' AND severity = 'critical';
CREATE INDEX idx_alerts_user_ack ON alerts(acknowledged_by, acknowledged_at DESC) WHERE acknowledged_by IS NOT NULL;

-- Alert actions indexes
CREATE INDEX idx_alert_actions_alert_id ON alert_actions(alert_id);
CREATE INDEX idx_alert_actions_user_id ON alert_actions(user_id);
CREATE INDEX idx_alert_actions_device_id ON alert_actions(device_id);
CREATE INDEX idx_alert_actions_type ON alert_actions(action_type);
CREATE INDEX idx_alert_actions_created_at ON alert_actions(created_at DESC);
CREATE INDEX idx_alert_actions_voice ON alert_actions(alert_id, created_at DESC) WHERE voice_command IS NOT NULL;

-- Notification preferences indexes
CREATE INDEX idx_notification_prefs_user_org ON notification_preferences(user_id, organization_id);
CREATE INDEX idx_notification_prefs_push ON notification_preferences(user_id) WHERE push_notifications = true;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mobile_devices_updated_at BEFORE UPDATE ON mobile_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_server_groups_updated_at BEFORE UPDATE ON server_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default admin user (password: admin123)
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, email_verified) 
VALUES (
    uuid_generate_v4(),
    'admin',
    'admin@sams-mobile.com',
    '$2b$10$rQZ8kHWKQYXyOtP5mXGqKOYvV5h5h5h5h5h5h5h5h5h5h5h5h5h5h5', -- admin123
    'SAMS',
    'Administrator',
    'admin',
    true
);

-- Create default organization
INSERT INTO organizations (id, name, slug, description, subscription_tier, max_servers, max_users)
VALUES (
    uuid_generate_v4(),
    'SAMS Demo Organization',
    'sams-demo',
    'Default organization for SAMS Mobile demonstration',
    'enterprise',
    1000,
    100
);

-- Migration completion
UPDATE schema_migrations SET completed_at = NOW() WHERE version = '001';
