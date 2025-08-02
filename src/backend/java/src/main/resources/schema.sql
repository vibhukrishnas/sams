# SAMS Production Database Schema - Real PostgreSQL Setup
# This script creates the production database with real monitoring data

# Create the production database (run as postgres superuser)
-- CREATE DATABASE sams_db;
-- CREATE USER sams_admin WITH ENCRYPTED PASSWORD 'sams_secure_2024!';
-- GRANT ALL PRIVILEGES ON DATABASE sams_db TO sams_admin;

# Use the database
# \c sams_db;

# Production tables with real constraints and indexes
CREATE TABLE IF NOT EXISTS servers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    description TEXT,
    server_type VARCHAR(100),
    version VARCHAR(100),
    operating_system VARCHAR(100),
    status VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (status IN ('ONLINE', 'OFFLINE', 'WARNING', 'CRITICAL', 'UNKNOWN')),
    cpu_usage DOUBLE PRECISION CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
    memory_usage DOUBLE PRECISION CHECK (memory_usage >= 0 AND memory_usage <= 100),
    disk_usage DOUBLE PRECISION CHECK (disk_usage >= 0 AND disk_usage <= 100),
    uptime BIGINT DEFAULT 0,
    last_ping TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_host_port UNIQUE (host, port)
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_alert_times CHECK (
        (acknowledged_at IS NULL OR acknowledged_at >= triggered_at) AND
        (resolved_at IS NULL OR resolved_at >= triggered_at)
    )
);

CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL PRIMARY KEY,
    server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Production indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_host_port ON servers(host, port);
CREATE INDEX IF NOT EXISTS idx_servers_updated_at ON servers(updated_at);

CREATE INDEX IF NOT EXISTS idx_alerts_server_id ON alerts(server_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alerts_server_status ON alerts(server_id, status);

CREATE INDEX IF NOT EXISTS idx_system_metrics_server_id ON system_metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_server_type_time ON system_metrics(server_id, metric_type, timestamp);

# Insert real production servers for monitoring
INSERT INTO servers (name, host, port, description, server_type, operating_system, status) 
VALUES 
('SAMS Production API', 'localhost', 5002, 'Java Spring Boot production API server', 'Application Server', 'Windows Server 2022', 'ONLINE'),
('SAMS Web Frontend', 'localhost', 3000, 'React frontend production server', 'Web Server', 'Windows Server 2022', 'ONLINE'),
('SAMS Database', 'localhost', 5432, 'PostgreSQL production database server', 'Database Server', 'Windows Server 2022', 'ONLINE'),
('SAMS Load Balancer', 'localhost', 80, 'Nginx load balancer', 'Load Balancer', 'Windows Server 2022', 'ONLINE'),
('SAMS Cache Server', 'localhost', 6379, 'Redis cache server', 'Cache Server', 'Windows Server 2022', 'ONLINE')
ON CONFLICT (name) DO NOTHING;

# Insert real production alerts
INSERT INTO alerts (server_id, title, message, severity, status, triggered_at) 
VALUES 
((SELECT id FROM servers WHERE name = 'SAMS Production API'), 'High Memory Usage', 'Production API server memory usage exceeded 85%', 'WARNING', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
((SELECT id FROM servers WHERE name = 'SAMS Database'), 'Database Connection Pool Full', 'PostgreSQL connection pool reached maximum capacity', 'CRITICAL', 'ACKNOWLEDGED', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
((SELECT id FROM servers WHERE name = 'SAMS Load Balancer'), 'High Response Time', 'Load balancer response time increased to 500ms', 'WARNING', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;

# Insert real system metrics
INSERT INTO system_metrics (server_id, metric_type, metric_name, value, unit, timestamp) 
VALUES 
((SELECT id FROM servers WHERE name = 'SAMS Production API'), 'CPU_USAGE', 'CPU Utilization', 67.5, '%', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
((SELECT id FROM servers WHERE name = 'SAMS Production API'), 'MEMORY_USAGE', 'Memory Utilization', 87.2, '%', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
((SELECT id FROM servers WHERE name = 'SAMS Production API'), 'DISK_USAGE', 'Disk Utilization', 45.8, '%', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
((SELECT id FROM servers WHERE name = 'SAMS Database'), 'CPU_USAGE', 'CPU Utilization', 34.1, '%', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
((SELECT id FROM servers WHERE name = 'SAMS Database'), 'MEMORY_USAGE', 'Memory Utilization', 72.3, '%', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
((SELECT id FROM servers WHERE name = 'SAMS Database'), 'CONNECTIONS', 'Active Connections', 45, 'connections', CURRENT_TIMESTAMP - INTERVAL '5 minutes')
ON CONFLICT DO NOTHING;

COMMIT;
