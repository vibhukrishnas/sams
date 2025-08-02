-- Seed: 001_initial_data.sql
-- Description: Initial required data for SAMS

BEGIN;

-- Insert default admin user
INSERT INTO users (
    username,
    email,
    password_hash,
    role,
    is_active
) VALUES (
    'admin',
    'admin@sams-monitoring.com',
    -- Default password: change-me-immediately (should be changed on first login)
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFyGQQX6BGhBFWi',
    'admin',
    true
);

-- Insert default metric thresholds
INSERT INTO metric_thresholds (
    metric_type,
    metric_name,
    warning_threshold,
    critical_threshold,
    created_by
) VALUES
    ('cpu', 'usage', 80.0, 90.0, (SELECT id FROM users WHERE username = 'admin')),
    ('memory', 'usage', 85.0, 95.0, (SELECT id FROM users WHERE username = 'admin')),
    ('disk', 'usage', 85.0, 95.0, (SELECT id FROM users WHERE username = 'admin')),
    ('network', 'error_rate', 5.0, 10.0, (SELECT id FROM users WHERE username = 'admin'));

-- Insert default notification settings
INSERT INTO notification_settings (
    name,
    description,
    severity_threshold,
    enabled,
    created_by
) VALUES
    ('Critical Alerts', 'Immediate notification for critical issues', 'critical', true, (SELECT id FROM users WHERE username = 'admin')),
    ('Warning Digest', 'Hourly digest of warning alerts', 'warning', true, (SELECT id FROM users WHERE username = 'admin')),
    ('Daily Summary', 'Daily summary of all system alerts', 'info', true, (SELECT id FROM users WHERE username = 'admin'));

COMMIT;
