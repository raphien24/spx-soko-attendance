-- Migration 005: Add Database Indexes for Performance Optimization
-- Purpose: Speed up frequently queried columns to reduce row reads
-- Created: 2026-09-24

-- ============================================
-- ATTENDANCE LOGS INDEXES
-- ============================================
-- Most frequently queried table - optimize by timestamp and employee_id

-- Index for date-based queries (getTodayAttendance, getAllTodayLogs)
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp 
ON attendance_logs(timestamp);

-- Index for employee + date queries (getTodayAttendance, countUserLogsOnDate)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_timestamp 
ON attendance_logs(employee_id, timestamp);

-- Index for employee_id only (getUserAttendanceHistory)
CREATE INDEX IF NOT EXISTS idx_attendance_employee 
ON attendance_logs(employee_id);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Index for employee_id lookups (getUserByEmployeeId)
CREATE INDEX IF NOT EXISTS idx_users_employee_id 
ON users(employee_id);

-- ============================================
-- ROSTERS TABLE INDEXES
-- ============================================

-- Index for date-based queries (getRosterByDate, getRosterWithAttendance)
CREATE INDEX IF NOT EXISTS idx_roster_date 
ON rosters(date);

-- Index for date + district queries (district-based roster filtering)
CREATE INDEX IF NOT EXISTS idx_roster_date_district 
ON rosters(date, district);

-- Index for employee roster lookups (isEmployeeRostered)
CREATE INDEX IF NOT EXISTS idx_roster_employee 
ON rosters(employee_id);

-- Composite index for date + employee (deleteRosterByDateAndEmployee)
CREATE INDEX IF NOT EXISTS idx_roster_date_employee 
ON rosters(date, employee_id);

-- ============================================
-- OFF_SCHEDULE TABLE INDEXES
-- ============================================

-- Index for date-based queries (checkEmployeeOffOnDate)
CREATE INDEX IF NOT EXISTS idx_off_schedule_date 
ON off_schedule(off_date);

-- Index for employee lookups (getOffScheduleByEmployee)
CREATE INDEX IF NOT EXISTS idx_off_schedule_employee 
ON off_schedule(employee_id);

-- Composite index for employee + date (checkEmployeeOffOnDate)
CREATE INDEX IF NOT EXISTS idx_off_schedule_employee_date 
ON off_schedule(employee_id, off_date);

-- ============================================
-- EMPLOYEES TABLE INDEXES
-- ============================================

-- Index for employee_id lookups (getEmployeeByEmployeeId)
CREATE INDEX IF NOT EXISTS idx_employees_employee_id 
ON employees(employee_id);

-- Index for role filtering (roster and off-schedule role filters)
CREATE INDEX IF NOT EXISTS idx_employees_role 
ON employees(role);

-- ============================================
-- NOTES
-- ============================================
-- These indexes will:
-- 1. Speed up date-range queries on attendance_logs (most common query)
-- 2. Improve employee lookups across all tables
-- 3. Optimize roster and off_schedule date-based filtering
-- 4. Reduce full table scans, thus reducing row reads
-- 
-- Expected impact: 30-50% faster queries = less row reads per query
-- No impact on existing functionality - indexes are transparent to queries
