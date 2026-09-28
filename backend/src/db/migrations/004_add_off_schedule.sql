-- Migration 004: Add off_schedule table
-- Created: 2026-09-27
-- Purpose: Store weekly day-off schedule for employees

-- Create off_schedule table
CREATE TABLE IF NOT EXISTS off_schedule (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    created_at TEXT NOT NULL,
    created_by TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Create index for faster queries by employee
CREATE INDEX IF NOT EXISTS idx_off_schedule_employee ON off_schedule(employee_id);

-- Create index for faster queries by day of week
CREATE INDEX IF NOT EXISTS idx_off_schedule_day ON off_schedule(day_of_week);

-- Create composite index for employee + day lookups
CREATE INDEX IF NOT EXISTS idx_off_schedule_employee_day ON off_schedule(employee_id, day_of_week);

-- Note: day_of_week values: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
