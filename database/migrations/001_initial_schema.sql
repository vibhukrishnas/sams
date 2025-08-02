-- Migration: 001_initial_schema.sql
-- Description: Initial database schema setup

BEGIN;

-- Version tracking table
CREATE TABLE IF NOT EXISTS schema_versions (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT
);

-- Record this migration
INSERT INTO schema_versions (version, description, applied_by)
VALUES (1, 'Initial schema setup', current_user);

-- Include initialization scripts
\i '../scripts/init.sql'
\i '../scripts/indexes.sql'
\i '../scripts/cleanup.sql'

COMMIT;
