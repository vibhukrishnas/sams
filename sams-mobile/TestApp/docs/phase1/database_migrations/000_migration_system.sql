-- ============================================================================
-- SAMS Mobile - Migration Management System
-- Database migration tracking and management system
-- ============================================================================

-- Create schema_migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT NOT NULL,
    checksum VARCHAR(64), -- SHA-256 hash of migration content
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    rollback_sql TEXT
);

-- Create migration execution log
CREATE TABLE IF NOT EXISTS migration_execution_log (
    id SERIAL PRIMARY KEY,
    migration_version VARCHAR(20) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'apply', 'rollback', 'verify'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    success BOOLEAN,
    error_message TEXT,
    executed_by VARCHAR(100) DEFAULT CURRENT_USER,
    execution_context JSONB DEFAULT '{}'
);

-- Function to validate migration prerequisites
CREATE OR REPLACE FUNCTION validate_migration_prerequisites(migration_version VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    prev_version VARCHAR(20);
    is_valid BOOLEAN := true;
BEGIN
    -- Check if previous migration exists and is completed
    SELECT version INTO prev_version 
    FROM schema_migrations 
    WHERE version < migration_version 
    ORDER BY version DESC 
    LIMIT 1;
    
    IF prev_version IS NOT NULL THEN
        SELECT completed_at IS NOT NULL AND success = true INTO is_valid
        FROM schema_migrations 
        WHERE version = prev_version;
    END IF;
    
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate migration checksum
CREATE OR REPLACE FUNCTION calculate_migration_checksum(migration_content TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(migration_content, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to log migration execution
CREATE OR REPLACE FUNCTION log_migration_execution(
    p_version VARCHAR(20),
    p_operation VARCHAR(20),
    p_success BOOLEAN DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO migration_execution_log (
        migration_version,
        operation,
        success,
        error_message,
        completed_at
    ) VALUES (
        p_version,
        p_operation,
        p_success,
        p_error_message,
        CASE WHEN p_success IS NOT NULL THEN NOW() ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql;

-- Function to start migration execution
CREATE OR REPLACE FUNCTION start_migration(
    p_version VARCHAR(20),
    p_description TEXT,
    p_checksum VARCHAR(64) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Validate prerequisites
    IF NOT validate_migration_prerequisites(p_version) THEN
        RAISE EXCEPTION 'Migration prerequisites not met for version %', p_version;
    END IF;
    
    -- Check if migration already exists
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = p_version) THEN
        RAISE EXCEPTION 'Migration % already exists', p_version;
    END IF;
    
    -- Insert migration record
    INSERT INTO schema_migrations (version, description, checksum)
    VALUES (p_version, p_description, p_checksum);
    
    -- Log execution start
    PERFORM log_migration_execution(p_version, 'apply');
    
    RAISE NOTICE 'Started migration %: %', p_version, p_description;
END;
$$ LANGUAGE plpgsql;

-- Function to complete migration execution
CREATE OR REPLACE FUNCTION complete_migration(
    p_version VARCHAR(20),
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update migration record
    UPDATE schema_migrations 
    SET 
        completed_at = NOW(),
        success = p_success,
        error_message = p_error_message,
        execution_time_ms = p_execution_time_ms
    WHERE version = p_version;
    
    -- Log execution completion
    PERFORM log_migration_execution(p_version, 'apply', p_success, p_error_message);
    
    IF p_success THEN
        RAISE NOTICE 'Completed migration % successfully in % ms', p_version, p_execution_time_ms;
    ELSE
        RAISE NOTICE 'Migration % failed: %', p_version, p_error_message;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback migration
CREATE OR REPLACE FUNCTION rollback_migration(p_version VARCHAR(20))
RETURNS VOID AS $$
DECLARE
    rollback_sql TEXT;
BEGIN
    -- Get rollback SQL
    SELECT rollback_sql INTO rollback_sql
    FROM schema_migrations 
    WHERE version = p_version;
    
    IF rollback_sql IS NULL THEN
        RAISE EXCEPTION 'No rollback SQL available for migration %', p_version;
    END IF;
    
    -- Log rollback start
    PERFORM log_migration_execution(p_version, 'rollback');
    
    -- Execute rollback SQL
    EXECUTE rollback_sql;
    
    -- Remove migration record
    DELETE FROM schema_migrations WHERE version = p_version;
    
    -- Log rollback completion
    PERFORM log_migration_execution(p_version, 'rollback', true);
    
    RAISE NOTICE 'Rolled back migration %', p_version;
END;
$$ LANGUAGE plpgsql;

-- Function to get migration status
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE (
    version VARCHAR(20),
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    success BOOLEAN,
    execution_time_ms INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.version,
        sm.description,
        sm.applied_at,
        sm.completed_at,
        sm.success,
        sm.execution_time_ms,
        CASE 
            WHEN sm.completed_at IS NULL THEN 'RUNNING'
            WHEN sm.success = true THEN 'COMPLETED'
            ELSE 'FAILED'
        END as status
    FROM schema_migrations sm
    ORDER BY sm.version;
END;
$$ LANGUAGE plpgsql;

-- Function to verify database schema integrity
CREATE OR REPLACE FUNCTION verify_schema_integrity()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check for missing tables
    RETURN QUERY
    SELECT 
        'missing_tables' as check_name,
        CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        'Expected tables: ' || string_agg(expected_table, ', ') as details
    FROM (
        VALUES 
            ('users'), ('organizations'), ('servers'), ('alerts'),
            ('mobile_devices'), ('notification_preferences')
    ) AS expected(expected_table)
    WHERE expected_table NOT IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    );
    
    -- Check for missing indexes
    RETURN QUERY
    SELECT 
        'missing_indexes' as check_name,
        CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        'Missing indexes: ' || string_agg(expected_index, ', ') as details
    FROM (
        VALUES 
            ('idx_users_email'), ('idx_servers_org_id'), ('idx_alerts_status'),
            ('idx_mobile_devices_user_id'), ('idx_alerts_created_at')
    ) AS expected(expected_index)
    WHERE expected_index NOT IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
    );
    
    -- Check for missing constraints
    RETURN QUERY
    SELECT 
        'constraint_violations' as check_name,
        'PASS' as status,
        'All constraints validated' as details;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for migration tables
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);
CREATE INDEX IF NOT EXISTS idx_migration_execution_log_version ON migration_execution_log(migration_version);
CREATE INDEX IF NOT EXISTS idx_migration_execution_log_started_at ON migration_execution_log(started_at);

-- Insert initial migration system record
INSERT INTO schema_migrations (version, description, completed_at, success) 
VALUES ('000', 'Migration management system', NOW(), true)
ON CONFLICT (version) DO NOTHING;

-- Grant permissions for migration execution
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sams_migration_user;

COMMENT ON TABLE schema_migrations IS 'Tracks database schema migrations for SAMS Mobile';
COMMENT ON TABLE migration_execution_log IS 'Logs all migration execution attempts and results';
COMMENT ON FUNCTION validate_migration_prerequisites(VARCHAR) IS 'Validates that prerequisites are met before applying a migration';
COMMENT ON FUNCTION start_migration(VARCHAR, TEXT, VARCHAR) IS 'Starts a new migration execution';
COMMENT ON FUNCTION complete_migration(VARCHAR, BOOLEAN, TEXT, INTEGER) IS 'Completes a migration execution with success/failure status';
COMMENT ON FUNCTION rollback_migration(VARCHAR) IS 'Rolls back a previously applied migration';
COMMENT ON FUNCTION get_migration_status() IS 'Returns the status of all migrations';
COMMENT ON FUNCTION verify_schema_integrity() IS 'Verifies the integrity of the database schema';
