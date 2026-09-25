-- Migration: Add Roster Schedule and Employee Management Tables
-- Created: 2026-09-26
-- Description: Add tables for roster scheduling and employee data management

-- ============================================
-- Table: employees
-- Stores all employee data (enrolled + not enrolled)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,                    -- UUID format
    employee_id TEXT UNIQUE NOT NULL,       -- Employee ID (can be any format, not just SPX-XXX)
    name TEXT NOT NULL,                     -- Full name
    role TEXT DEFAULT 'rider',              -- Role: rider, driver, admin, etc.
    phone TEXT,                             -- Phone number (optional)
    enrolled_status TEXT DEFAULT 'not_enrolled', -- 'enrolled' or 'not_enrolled'
    user_id TEXT,                           -- Link to users table if enrolled (nullable)
    created_at TEXT NOT NULL,               -- ISO 8601 timestamp
    updated_at TEXT,                        -- Last update timestamp
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for employees table
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_enrolled_status ON employees(enrolled_status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- ============================================
-- Table: roster_schedule
-- Stores daily roster schedules
-- ============================================
CREATE TABLE IF NOT EXISTS roster_schedule (
    id TEXT PRIMARY KEY,                    -- UUID format
    date TEXT NOT NULL,                     -- Date in YYYY-MM-DD format (WIB timezone)
    employee_id TEXT NOT NULL,              -- Employee ID from employees table
    employee_name TEXT NOT NULL,            -- Denormalized name for fast queries
    created_at TEXT NOT NULL,               -- ISO 8601 timestamp
    created_by TEXT,                        -- Admin user who created this roster
    
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Ensure one employee can only be rostered once per day
    UNIQUE(date, employee_id)
);

-- Indexes for roster_schedule table
CREATE INDEX IF NOT EXISTS idx_roster_date ON roster_schedule(date);
CREATE INDEX IF NOT EXISTS idx_roster_employee_id ON roster_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_roster_date_employee ON roster_schedule(date, employee_id);

-- ============================================
-- Migration Notes
-- ============================================
-- To execute this migration:
-- wrangler d1 execute spx-soko-attendance-production --remote --file=backend/src/db/migrations/001_add_roster_tables.sql
-- 
-- After migration, you can:
-- 1. Add employees to the employees table (enrolled or not)
-- 2. Create roster schedules by selecting employees and dates
-- 3. Compare roster with attendance_logs to track who hasn't clocked in
