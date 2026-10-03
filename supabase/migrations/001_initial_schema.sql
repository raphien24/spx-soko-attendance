-- ============================================
-- SPX Soko Attendance - Supabase Migration
-- From: Cloudflare D1 (SQLite)
-- To: Supabase (PostgreSQL)
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
    face_descriptor TEXT, -- JSON array as text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_role ON users(role);

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

-- Indexes for employees
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_role ON employees(role);

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

-- Indexes for attendance_logs
CREATE INDEX idx_attendance_timestamp ON attendance_logs(timestamp);
CREATE INDEX idx_attendance_employee_id ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_user_id ON attendance_logs(user_id);
CREATE INDEX idx_attendance_scan_type ON attendance_logs(scan_type);
CREATE INDEX idx_attendance_scan_date ON attendance_logs(DATE(timestamp));

-- ============================================
-- ROSTER_SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roster_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    district VARCHAR(50) DEFAULT 'SOKO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100)
);

-- Indexes for roster_schedule
CREATE INDEX idx_roster_date ON roster_schedule(date);
CREATE INDEX idx_roster_employee_id ON roster_schedule(employee_id);
CREATE INDEX idx_roster_district ON roster_schedule(district);
CREATE INDEX idx_roster_date_employee ON roster_schedule(date, employee_id);

-- Unique constraint: one employee per date
CREATE UNIQUE INDEX idx_roster_unique_employee_date ON roster_schedule(date, employee_id);

-- ============================================
-- OFF_SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS off_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for off_schedule
CREATE INDEX idx_off_schedule_employee ON off_schedule(employee_id);
CREATE INDEX idx_off_schedule_day ON off_schedule(day_of_week);
CREATE INDEX idx_off_schedule_employee_day ON off_schedule(employee_id, day_of_week);

-- Unique constraint: one employee per day of week
CREATE UNIQUE INDEX idx_off_schedule_unique ON off_schedule(employee_id, day_of_week);

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

-- Only one hub setting should exist
CREATE UNIQUE INDEX idx_hub_settings_singleton ON hub_settings((true));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for hub_settings table
CREATE TRIGGER update_hub_settings_updated_at
    BEFORE UPDATE ON hub_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (Optional - for future)
-- ============================================

-- Enable RLS (commented out for now, enable when ready to use Supabase Auth)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE roster_schedule ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE off_schedule ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hub_settings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for backend API)
-- CREATE POLICY "Service role can do everything" ON users FOR ALL USING (true);

-- ============================================
-- VIEWS (Optional - for easier queries)
-- ============================================

-- View: Today's attendance with user info
CREATE OR REPLACE VIEW today_attendance AS
SELECT 
    a.id,
    a.employee_id,
    u.name,
    u.role,
    a.scan_type,
    a.timestamp,
    a.latitude,
    a.longitude,
    a.distance_from_hub,
    a.photo_url
FROM attendance_logs a
LEFT JOIN users u ON a.user_id = u.id
WHERE DATE(a.timestamp) = CURRENT_DATE
ORDER BY a.timestamp DESC;

-- View: Roster with attendance status
CREATE OR REPLACE VIEW roster_with_attendance AS
SELECT 
    r.id,
    r.date,
    r.employee_id,
    r.employee_name,
    r.district,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM attendance_logs a 
            WHERE a.employee_id = r.employee_id 
            AND DATE(a.timestamp) = r.date 
            AND a.scan_type = 'clock_in'
        ) THEN true 
        ELSE false 
    END as has_clocked_in,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM attendance_logs a 
            WHERE a.employee_id = r.employee_id 
            AND DATE(a.timestamp) = r.date 
            AND a.scan_type = 'clock_out'
        ) THEN true 
        ELSE false 
    END as has_clocked_out
FROM roster_schedule r;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert default hub settings
INSERT INTO hub_settings (hub_name, latitude, longitude, radius_meters)
VALUES ('SPX Soko Hub', -7.1234567, 112.7654321, 100)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'Registered users with face recognition data';
COMMENT ON TABLE employees IS 'Master list of all employees (enrolled or not)';
COMMENT ON TABLE attendance_logs IS 'Clock in/out records with GPS data';
COMMENT ON TABLE roster_schedule IS 'Daily roster assignments by district';
COMMENT ON TABLE off_schedule IS 'Weekly recurring off days for employees';
COMMENT ON TABLE hub_settings IS 'Hub location and geofencing settings';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
