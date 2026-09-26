-- Migration 003: Add district column to roster_schedule table
-- Created: 2024-09-20

-- Add district column to roster_schedule
ALTER TABLE roster_schedule ADD COLUMN district TEXT DEFAULT 'SOKO';

-- Create index for faster queries by district
CREATE INDEX IF NOT EXISTS idx_roster_district ON roster_schedule(district);

-- Note: Existing records will have 'SOKO' as default district
