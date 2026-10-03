-- ============================================
-- SPX Soko Attendance - Supabase Migration
-- From: Cloudflare D1 (SQLite)
-- To: Supabase (PostgreSQL)
-- Safe to re-run (uses IF NOT EXISTS)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    photo_url TEXT,
    face_descriptor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- ============================================
-- ATTENDANCE_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_id VARCHAR(50) NOT NULL,
    scan_type VARCHAR(20) NOT NULL CHECK (scan_type IN ('clock_in', 'clock_out')),
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    distance_from_hub NUMERIC(10, 2),
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_type ON attendance_logs(scan_type);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_date ON attendance_logs(((timestamp AT TIME ZONE 'Asia/Jakarta')::date));

-- ============================================
-- ROSTER_SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roster_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    district VARCHAR(50) DEFAULT 'SOKO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    CONSTRAINT unique_roster_employee_date UNIQUE (date, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_roster_date ON roster_schedule(date);
CREATE INDEX IF NOT EXISTS idx_roster_employee_id ON roster_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_roster_district ON roster_schedule(district);

-- ============================================
-- OFF_SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS off_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_off_schedule UNIQUE (employee_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_off_schedule_employee ON off_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_off_schedule_day ON off_schedule(day_of_week);

-- ============================================
-- HUB_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hub_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_name VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hub_settings_updated_at ON hub_settings;
CREATE TRIGGER update_hub_settings_updated_at
    BEFORE UPDATE ON hub_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY TABLES CREATED
-- ============================================
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
