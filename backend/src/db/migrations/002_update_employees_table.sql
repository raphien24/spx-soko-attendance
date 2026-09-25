-- Migration: Update employees table - remove phone, add role constraints
-- Created: 2026-09-19
-- Purpose: Remove phone field and enforce valid role values for mass upload feature

-- Step 1: Create new table without phone and with role constraint
CREATE TABLE employees_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Rider Dedicated', 'Rider Plus', 'Rider Mitra', 'Driver Dedicated', 'Driver Mitra')),
  enrolled_status TEXT DEFAULT 'not_enrolled',
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Step 2: Copy data from old table (excluding phone)
INSERT INTO employees_new (id, employee_id, name, role, enrolled_status, user_id, created_at, updated_at)
SELECT id, employee_id, name, 
  CASE 
    WHEN role IN ('Rider Dedicated', 'Rider Plus', 'Rider Mitra', 'Driver Dedicated', 'Driver Mitra') THEN role
    WHEN role LIKE '%Rider%' THEN 'Rider Dedicated'
    WHEN role LIKE '%Driver%' THEN 'Driver Dedicated'
    ELSE 'Rider Dedicated'
  END as role,
  enrolled_status, user_id, created_at, updated_at
FROM employees;

-- Step 3: Drop old table
DROP TABLE employees;

-- Step 4: Rename new table
ALTER TABLE employees_new RENAME TO employees;
