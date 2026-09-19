-- SPX Soko Attendance System - Database Schema
-- Cloudflare D1 (SQLite) Database
-- Created: 2026-09-19

-- ============================================
-- Table: users
-- Stores employee data and face descriptors
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID format: '550e8400-e29b-41d4-a716-446655440000'
    employee_id TEXT UNIQUE NOT NULL,       -- Unique ID: 'SPX-001', 'SPX-002', etc.
    name TEXT NOT NULL,                     -- Full name of employee
    role TEXT DEFAULT 'employee',           -- 'admin' or 'employee'
    face_descriptor TEXT NOT NULL,          -- JSON array: '[0.123, -0.456, 0.789, ...]' (128 floats)
    photo_url TEXT NOT NULL,                -- R2 URL: 'https://pub-xxxxx.r2.dev/enrollments/uuid.jpg'
    created_at TEXT NOT NULL,               -- ISO 8601: '2026-09-19T10:30:00.000Z'
    updated_at TEXT                         -- Timestamp for updates (nullable)
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_role ON users(role);

-- ============================================
-- Table: attendance_logs
-- Stores clock in/out attendance records
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,                    -- UUID for each log entry
    user_id TEXT NOT NULL,                  -- Foreign key to users.id
    employee_id TEXT NOT NULL,              -- Denormalized for fast queries
    name TEXT NOT NULL,                     -- Denormalized employee name
    scan_type TEXT NOT NULL,                -- 'IN' or 'OUT'
    timestamp TEXT NOT NULL,                -- ISO 8601 server-side timestamp
    capture_url TEXT NOT NULL,              -- R2 URL: 'https://pub-xxxxx.r2.dev/scans/uuid.jpg'
    created_at TEXT NOT NULL,               -- Record creation timestamp (usually same as timestamp)
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for attendance_logs table
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_date ON attendance_logs(date(timestamp));
CREATE INDEX IF NOT EXISTS idx_attendance_scan_type ON attendance_logs(scan_type);

-- ============================================
-- Table: hub_settings
-- Stores hub location and configuration
-- ============================================
CREATE TABLE IF NOT EXISTS hub_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only 1 row (singleton pattern)
    hub_name TEXT NOT NULL DEFAULT 'SPX Soko Hub',
    latitude REAL NOT NULL,                 -- Hub center latitude: -7.0861707572348545
    longitude REAL NOT NULL,                -- Hub center longitude: 111.97167733649127
    radius_meters INTEGER NOT NULL DEFAULT 500, -- Allowed radius in meters
    updated_at TEXT NOT NULL,               -- Last update timestamp
    updated_by TEXT                         -- Admin user who updated (optional)
);

-- Insert default hub location (SPX Soko Hub coordinates)
INSERT OR IGNORE INTO hub_settings (id, hub_name, latitude, longitude, radius_meters, updated_at)
VALUES (1, 'SPX Soko Hub', -7.0861707572348545, 111.97167733649127, 500, datetime('now'));

-- ============================================
-- Validation Constraints
-- ============================================
-- Note: SQLite doesn't support CHECK constraints in the same way as PostgreSQL
-- We'll enforce these validations in application code:
-- 1. employee_id must match pattern: ^SPX-\d{3}$
-- 2. scan_type must be 'IN' or 'OUT'
-- 3. face_descriptor must be valid JSON array with 128 elements
-- 4. All timestamps must be in ISO 8601 format

-- ============================================
-- Initial Setup Complete
-- ============================================
-- To execute this schema:
-- wrangler d1 execute spx-soko-attendance-db --file=backend/src/db/schema.sql
