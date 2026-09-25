/**
 * Database Query Helpers
 * Reusable prepared statement functions for Cloudflare D1
 */

// ============================================
// USER QUERIES
// ============================================

/**
 * Insert a new user into the database
 * @param {D1Database} db - D1 database binding
 * @param {Object} userData - User data object
 * @param {string} userData.id - UUID
 * @param {string} userData.employee_id - SPX-XXX format
 * @param {string} userData.name - Full name
 * @param {string} userData.role - 'admin' or 'employee'
 * @param {string} userData.face_descriptor - JSON stringified array
 * @param {string} userData.photo_url - R2 URL
 * @param {string} userData.created_at - ISO 8601 timestamp
 * @returns {Promise<Object>} Result object
 */
async function insertUser(db, userData) {
    const stmt = db.prepare(
        `INSERT INTO users (id, employee_id, name, role, face_descriptor, photo_url, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    
    return await stmt
        .bind(
            userData.id,
            userData.employee_id,
            userData.name,
            userData.role || 'employee',
            userData.face_descriptor,
            userData.photo_url,
            userData.created_at
        )
        .run();
}

/**
 * Get user by ID
 * @param {D1Database} db 
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserById(db, userId) {
    const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
    const result = await stmt.bind(userId).first();
    return result;
}

/**
 * Get user by employee ID
 * @param {D1Database} db 
 * @param {string} employeeId - Employee ID (SPX-XXX)
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserByEmployeeId(db, employeeId) {
    const stmt = db.prepare(`SELECT * FROM users WHERE employee_id = ?`);
    const result = await stmt.bind(employeeId).first();
    return result;
}

/**
 * Get all users (without face descriptors for performance)
 * @param {D1Database} db 
 * @returns {Promise<Array>} Array of user objects
 */
async function getAllUsers(db) {
    const stmt = db.prepare(
        `SELECT id, employee_id, name, role, photo_url, created_at, updated_at 
         FROM users 
         ORDER BY created_at DESC`
    );
    const result = await stmt.all();
    return result.results || [];
}

/**
 * Get all face descriptors (for scanner matching)
 * @param {D1Database} db 
 * @returns {Promise<Array>} Array of objects with id, employee_id, name, face_descriptor
 */
async function getAllFaceDescriptors(db) {
    const stmt = db.prepare(
        `SELECT id, employee_id, name, face_descriptor 
         FROM users 
         ORDER BY name ASC`
    );
    const result = await stmt.all();
    return result.results || [];
}

/**
 * Delete user by ID (cascade will delete attendance logs)
 * @param {D1Database} db 
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Result object
 */
async function deleteUser(db, userId) {
    const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
    return await stmt.bind(userId).run();
}

/**
 * Update user data
 * @param {D1Database} db 
 * @param {string} userId 
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Result object
 */
async function updateUser(db, userId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.role) {
        fields.push('role = ?');
        values.push(updates.role);
    }
    if (updates.face_descriptor) {
        fields.push('face_descriptor = ?');
        values.push(updates.face_descriptor);
    }
    if (updates.photo_url) {
        fields.push('photo_url = ?');
        values.push(updates.photo_url);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);
    
    const stmt = db.prepare(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
    );
    
    return await stmt.bind(...values).run();
}

// ============================================
// ATTENDANCE QUERIES
// ============================================

/**
 * Insert attendance log
 * @param {D1Database} db 
 * @param {Object} logData 
 * @param {string} logData.id - UUID
 * @param {string} logData.user_id - User UUID
 * @param {string} logData.employee_id - Employee ID
 * @param {string} logData.name - Employee name
 * @param {string} logData.scan_type - 'IN' or 'OUT'
 * @param {string} logData.timestamp - ISO 8601 server timestamp
 * @param {string} logData.capture_url - R2 URL
 * @param {string} logData.created_at - ISO 8601 timestamp
 * @returns {Promise<Object>} Result object
 */
async function insertAttendanceLog(db, logData) {
    const stmt = db.prepare(
        `INSERT INTO attendance_logs (id, user_id, employee_id, name, scan_type, timestamp, capture_url, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    return await stmt
        .bind(
            logData.id,
            logData.user_id,
            logData.employee_id,
            logData.name,
            logData.scan_type,
            logData.timestamp,
            logData.capture_url,
            logData.created_at
        )
        .run();
}

/**
 * Get today's attendance for a specific user
 * Uses WIB (UTC+7) timezone for date matching
 * 
 * @param {D1Database} db 
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of attendance logs for today
 */
async function getTodayAttendance(db, userId) {
    // Get current date in WIB timezone
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const today = wibTime.toISOString().split('T')[0]; // YYYY-MM-DD in WIB
    
    console.log(`[getTodayAttendance] Checking for user: ${userId}`);
    console.log(`[getTodayAttendance] WIB Today date: ${today}`);
    console.log(`[getTodayAttendance] Query: SELECT * FROM attendance_logs WHERE user_id = ? AND substr(timestamp, 1, 10) = ?`);
    
    // Extract date from timestamp using substr (first 10 characters = YYYY-MM-DD)
    const stmt = db.prepare(
        `SELECT * FROM attendance_logs 
         WHERE user_id = ? AND substr(timestamp, 1, 10) = ? 
         ORDER BY timestamp ASC`
    );
    
    const result = await stmt.bind(userId, today).all();
    console.log(`[getTodayAttendance] Query result count: ${result.results ? result.results.length : 0}`);
    
    if (result.results && result.results.length > 0) {
        console.log(`[getTodayAttendance] First record timestamp: ${result.results[0].timestamp}`);
        console.log(`[getTodayAttendance] First record timestamp substr(1,10): ${result.results[0].timestamp.substring(0, 10)}`);
    }
    
    return result.results || [];
}

/**
 * Get all attendance logs for today
 * Uses WIB (UTC+7) timezone for date matching
 * Joins with users table to get role information
 * 
 * @param {D1Database} db 
 * @returns {Promise<Array>} Array of all today's logs
 */
async function getAllTodayLogs(db) {
    // Get current date in WIB timezone
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const today = wibTime.toISOString().split('T')[0]; // YYYY-MM-DD in WIB
    
    console.log(`[getAllTodayLogs] Current UTC time: ${now.toISOString()}`);
    console.log(`[getAllTodayLogs] WIB time: ${wibTime.toISOString()}`);
    console.log(`[getAllTodayLogs] Today (WIB): ${today}`);
    console.log(`[getAllTodayLogs] Query: WHERE substr(timestamp, 1, 10) = '${today}'`);
    
    const stmt = db.prepare(
        `SELECT 
            attendance_logs.*,
            users.role
         FROM attendance_logs 
         LEFT JOIN users ON attendance_logs.user_id = users.id
         WHERE substr(attendance_logs.timestamp, 1, 10) = ? 
         ORDER BY attendance_logs.timestamp DESC`
    );
    
    const result = await stmt.bind(today).all();
    console.log(`[getAllTodayLogs] Found ${result.results ? result.results.length : 0} records`);
    
    if (result.results && result.results.length > 0) {
        console.log(`[getAllTodayLogs] Sample timestamps:`);
        result.results.slice(0, 3).forEach(r => {
            console.log(`  - ${r.name}: ${r.timestamp} (date part: ${r.timestamp.substring(0, 10)})`);
        });
    }
    
    return result.results || [];
}

/**
 * Get attendance logs within date range
 * Uses substr for date extraction to work with WIB timestamps
 * Joins with users table to get role information
 * 
 * @param {D1Database} db 
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>} Array of logs
 */
async function getAttendanceByDateRange(db, startDate, endDate) {
    const stmt = db.prepare(
        `SELECT 
            attendance_logs.*,
            users.role
         FROM attendance_logs 
         LEFT JOIN users ON attendance_logs.user_id = users.id
         WHERE substr(attendance_logs.timestamp, 1, 10) >= ? 
           AND substr(attendance_logs.timestamp, 1, 10) <= ? 
         ORDER BY attendance_logs.timestamp DESC`
    );
    
    const result = await stmt.bind(startDate, endDate).all();
    return result.results || [];
}

/**
 * Get all attendance history for a specific user
 * @param {D1Database} db 
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of user's attendance logs
 */
async function getUserAttendanceHistory(db, userId) {
    const stmt = db.prepare(
        `SELECT * FROM attendance_logs 
         WHERE user_id = ? 
         ORDER BY timestamp DESC`
    );
    
    const result = await stmt.bind(userId).all();
    return result.results || [];
}

/**
 * Count attendance logs for user on specific date
 * @param {D1Database} db 
 * @param {string} userId 
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<number>} Count of logs
 */
async function countUserLogsOnDate(db, userId, date) {
    const stmt = db.prepare(
        `SELECT COUNT(*) as count FROM attendance_logs 
         WHERE user_id = ? AND substr(timestamp, 1, 10) = ?`
    );
    
    const result = await stmt.bind(userId, date).first();
    return result ? result.count : 0;
}

/**
 * Get user's last scan type for today
 * Uses WIB timezone
 * @param {D1Database} db 
 * @param {string} userId 
 * @returns {Promise<string|null>} 'IN', 'OUT', or null
 */
async function getLastScanTypeToday(db, userId) {
    // Get current date in WIB timezone
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const today = wibTime.toISOString().split('T')[0];
    
    const stmt = db.prepare(
        `SELECT scan_type FROM attendance_logs 
         WHERE user_id = ? AND substr(timestamp, 1, 10) = ? 
         ORDER BY timestamp DESC 
         LIMIT 1`
    );
    
    const result = await stmt.bind(userId, today).first();
    return result ? result.scan_type : null;
}

// ============================================
// HUB SETTINGS QUERIES
// ============================================

/**
 * Get hub location settings
 * @param {D1Database} db 
 * @returns {Promise<Object>} Hub settings object
 */
async function getHubSettings(db) {
    const stmt = db.prepare(
        `SELECT id, hub_name, latitude, longitude, radius_meters, updated_at, updated_by 
         FROM hub_settings 
         WHERE id = 1`
    );
    const result = await stmt.first();
    return result;
}

/**
 * Update hub location settings
 * @param {D1Database} db 
 * @param {Object} settings - { latitude, longitude, radius_meters, hub_name, updated_by }
 * @returns {Promise<Object>} Result object
 */
async function updateHubSettings(db, settings) {
    const { latitude, longitude, radius_meters, hub_name, updated_by } = settings;
    
    const stmt = db.prepare(
        `UPDATE hub_settings 
         SET latitude = ?, 
             longitude = ?, 
             radius_meters = ?,
             hub_name = ?,
             updated_at = datetime('now'),
             updated_by = ?
         WHERE id = 1`
    );
    
    return await stmt.bind(
        latitude,
        longitude,
        radius_meters || 500,
        hub_name || 'SPX Soko Hub',
        updated_by || null
    ).run();
}

// ============================================
// EXPORTS (SINGLE EXPORT BLOCK)
// ============================================

export {
    // User queries
    insertUser,
    getUserById,
    getUserByEmployeeId,
    getAllUsers,
    getAllFaceDescriptors,
    deleteUser,
    updateUser,
    
    // Attendance queries
    insertAttendanceLog,
    getTodayAttendance,
    getAllTodayLogs,
    getAttendanceByDateRange,
    getUserAttendanceHistory,
    countUserLogsOnDate,
    getLastScanTypeToday,
    
    // Hub settings queries
    getHubSettings,
    updateHubSettings,
    
    // Employee queries
    insertEmployee,
    getAllEmployees,
    getEmployeeByEmployeeId,
    updateEmployee,
    deleteEmployee,
    
    // Roster schedule queries
    insertRoster,
    getRosterByDate,
    getRosterByDateRange,
    deleteRoster,
    deleteRosterByDateAndEmployee,
    getRosterWithAttendance,
    isEmployeeRostered
};

// ============================================
// EMPLOYEE QUERIES
// ============================================

/**
 * Insert a new employee (enrolled or not enrolled)
 * @param {D1Database} db 
 * @param {Object} employeeData 
 * @param {string} employeeData.id - UUID
 * @param {string} employeeData.employee_id - Employee ID
 * @param {string} employeeData.name - Full name
 * @param {string} employeeData.role - Role (rider, driver, admin, etc.)
 * @param {string} employeeData.phone - Phone number (optional)
 * @param {string} employeeData.enrolled_status - 'enrolled' or 'not_enrolled'
 * @param {string} employeeData.user_id - Link to users table if enrolled (nullable)
 * @param {string} employeeData.created_at - ISO 8601 timestamp
 * @returns {Promise<Object>} Result object
 */
async function insertEmployee(db, employeeData) {
    const stmt = db.prepare(
        `INSERT INTO employees (id, employee_id, name, role, phone, enrolled_status, user_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    return await stmt
        .bind(
            employeeData.id,
            employeeData.employee_id,
            employeeData.name,
            employeeData.role || 'rider',
            employeeData.phone || null,
            employeeData.enrolled_status || 'not_enrolled',
            employeeData.user_id || null,
            employeeData.created_at
        )
        .run();
}

/**
 * Get all employees (enrolled + not enrolled)
 * @param {D1Database} db 
 * @returns {Promise<Array>} Array of employee objects
 */
async function getAllEmployees(db) {
    const stmt = db.prepare(
        `SELECT * FROM employees ORDER BY created_at DESC`
    );
    const result = await stmt.all();
    return result.results || [];
}

/**
 * Get employee by employee_id
 * @param {D1Database} db 
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object|null>} Employee object or null
 */
async function getEmployeeByEmployeeId(db, employeeId) {
    const stmt = db.prepare(`SELECT * FROM employees WHERE employee_id = ?`);
    const result = await stmt.bind(employeeId).first();
    return result;
}

/**
 * Update employee data
 * @param {D1Database} db 
 * @param {string} employeeId - Employee ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Result object
 */
async function updateEmployee(db, employeeId, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.role) {
        fields.push('role = ?');
        values.push(updates.role);
    }
    if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone);
    }
    if (updates.enrolled_status) {
        fields.push('enrolled_status = ?');
        values.push(updates.enrolled_status);
    }
    if (updates.user_id !== undefined) {
        fields.push('user_id = ?');
        values.push(updates.user_id);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(employeeId);
    
    const stmt = db.prepare(
        `UPDATE employees SET ${fields.join(', ')} WHERE employee_id = ?`
    );
    
    return await stmt.bind(...values).run();
}

/**
 * Delete employee
 * @param {D1Database} db 
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} Result object
 */
async function deleteEmployee(db, employeeId) {
    const stmt = db.prepare(`DELETE FROM employees WHERE employee_id = ?`);
    return await stmt.bind(employeeId).run();
}

// ============================================
// ROSTER SCHEDULE QUERIES
// ============================================

/**
 * Insert roster entry
 * @param {D1Database} db 
 * @param {Object} rosterData 
 * @param {string} rosterData.id - UUID
 * @param {string} rosterData.date - YYYY-MM-DD format
 * @param {string} rosterData.employee_id - Employee ID
 * @param {string} rosterData.employee_name - Employee name
 * @param {string} rosterData.created_at - ISO 8601 timestamp
 * @param {string} rosterData.created_by - Admin user (optional)
 * @returns {Promise<Object>} Result object
 */
async function insertRoster(db, rosterData) {
    const stmt = db.prepare(
        `INSERT INTO roster_schedule (id, date, employee_id, employee_name, created_at, created_by) 
         VALUES (?, ?, ?, ?, ?, ?)`
    );
    
    return await stmt
        .bind(
            rosterData.id,
            rosterData.date,
            rosterData.employee_id,
            rosterData.employee_name,
            rosterData.created_at,
            rosterData.created_by || null
        )
        .run();
}

/**
 * Get roster by date
 * @param {D1Database} db 
 * @param {string} date - YYYY-MM-DD format
 * @returns {Promise<Array>} Array of roster entries
 */
async function getRosterByDate(db, date) {
    const stmt = db.prepare(
        `SELECT * FROM roster_schedule WHERE date = ? ORDER BY employee_name ASC`
    );
    const result = await stmt.bind(date).all();
    return result.results || [];
}

/**
 * Get roster by date range
 * @param {D1Database} db 
 * @param {string} startDate - YYYY-MM-DD format
 * @param {string} endDate - YYYY-MM-DD format
 * @returns {Promise<Array>} Array of roster entries
 */
async function getRosterByDateRange(db, startDate, endDate) {
    const stmt = db.prepare(
        `SELECT * FROM roster_schedule 
         WHERE date >= ? AND date <= ? 
         ORDER BY date DESC, employee_name ASC`
    );
    const result = await stmt.bind(startDate, endDate).all();
    return result.results || [];
}

/**
 * Delete roster entry
 * @param {D1Database} db 
 * @param {string} rosterId - Roster UUID
 * @returns {Promise<Object>} Result object
 */
async function deleteRoster(db, rosterId) {
    const stmt = db.prepare(`DELETE FROM roster_schedule WHERE id = ?`);
    return await stmt.bind(rosterId).run();
}

/**
 * Delete roster by date and employee
 * @param {D1Database} db 
 * @param {string} date - YYYY-MM-DD
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} Result object
 */
async function deleteRosterByDateAndEmployee(db, date, employeeId) {
    const stmt = db.prepare(
        `DELETE FROM roster_schedule WHERE date = ? AND employee_id = ?`
    );
    return await stmt.bind(date, employeeId).run();
}

/**
 * Get roster with attendance status for a specific date
 * Returns roster with attendance info (clocked in or not)
 * @param {D1Database} db 
 * @param {string} date - YYYY-MM-DD format
 * @returns {Promise<Array>} Array of roster entries with attendance status
 */
async function getRosterWithAttendance(db, date) {
    const stmt = db.prepare(
        `SELECT 
            r.id as roster_id,
            r.date,
            r.employee_id,
            r.employee_name,
            e.role,
            e.phone,
            e.enrolled_status,
            CASE 
                WHEN a.id IS NOT NULL THEN 'clocked_in'
                ELSE 'not_clocked_in'
            END as attendance_status,
            a.timestamp as clock_in_time
         FROM roster_schedule r
         LEFT JOIN employees e ON r.employee_id = e.employee_id
         LEFT JOIN attendance_logs a ON r.employee_id = a.employee_id 
             AND substr(a.timestamp, 1, 10) = r.date
         WHERE r.date = ?
         ORDER BY r.employee_name ASC`
    );
    
    const result = await stmt.bind(date).all();
    return result.results || [];
}

/**
 * Check if employee is already in roster for a specific date
 * @param {D1Database} db 
 * @param {string} date - YYYY-MM-DD
 * @param {string} employeeId - Employee ID
 * @returns {Promise<boolean>} True if already rostered
 */
async function isEmployeeRostered(db, date, employeeId) {
    const stmt = db.prepare(
        `SELECT id FROM roster_schedule WHERE date = ? AND employee_id = ?`
    );
    const result = await stmt.bind(date, employeeId).first();
    return !!result;
}
