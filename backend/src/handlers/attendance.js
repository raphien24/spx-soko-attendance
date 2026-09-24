/**
 * Attendance Management Handlers
 * Handles attendance scanning, logging, and records retrieval
 */

import {
    getUserById,
    insertAttendanceLog,
    getTodayAttendance,
    getAllTodayLogs,
    getAttendanceByDateRange,
    getUserAttendanceHistory,
    getLastScanTypeToday
} from '../db/queries.js';

import {
    uploadBase64Image,
    generateBackendImageUrl,
    validateImageData,
    deleteImage
} from '../storage/r2.js';

import {
    validateAttendanceScan,
    validateUUID,
    validateDateRange
} from '../utils/validation.js';

import {
    getCurrentISOTimestamp,
    getTodayDateString
} from '../utils/time.js';

import {
    corsResponse,
    corsErrorResponse
} from '../utils/cors.js';

/**
 * POST /api/attendance/scan
 * Record attendance (clock in only)
 * Always records as IN - no automatic IN/OUT logic
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function recordAttendance(request, env) {
    try {
        // Parse request body
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        // Validate payload
        const validation = validateAttendanceScan(payload);
        if (!validation.valid) {
            return corsErrorResponse(
                request,
                validation.errors.join(', '),
                400
            );
        }
        
        const { user_id, capture_base64 } = validation.data;
        
        // Fetch user data
        const user = await getUserById(env.DB, user_id);
        if (!user) {
            return corsErrorResponse(request, 'User not found', 404);
        }
        
        // Block duplicate attendance on the same day — keep the earliest scan
        const existingToday = await getTodayAttendance(env.DB, user_id);
        console.log(`[Duplicate Check] User ${user_id} - Existing records today:`, existingToday.length);
        
        if (existingToday.length > 0) {
            // Return the earliest existing record so the frontend can display it
            const earliest = existingToday[0]; // already sorted ASC by timestamp
            console.log(`[Duplicate Block] Rejecting duplicate scan for user ${user_id}. First scan at: ${earliest.timestamp}`);
            return corsErrorResponse(
                request,
                `Absensi hari ini sudah tercatat pada ${earliest.timestamp}. Hanya absensi pertama yang diterima.`,
                409
            );
        }

        console.log(`[Duplicate Check] User ${user_id} - No existing records, proceeding with scan`);
        
        // Always set scan type to IN (Clock In only)
        const scanType = 'IN';
        
        // Validate capture image
        const imageValidation = validateImageData(capture_base64);
        if (!imageValidation.valid) {
            return corsErrorResponse(request, imageValidation.error, 400);
        }
        
        // Generate UUID for log entry
        const logId = crypto.randomUUID();
        
        // Generate server-side timestamp (CRITICAL!)
        const serverTimestamp = getCurrentISOTimestamp();
        
        // Upload capture photo to R2
        const r2Key = `scans/${logId}.jpg`;
        try {
            await uploadBase64Image(
                env.ATTENDANCE_BUCKET,
                r2Key,
                capture_base64,
                {
                    'log-id': logId,
                    'user-id': user_id,
                    'employee-id': user.employee_id,
                    'scan-type': scanType,
                    'timestamp': serverTimestamp
                }
            );
        } catch (error) {
            return corsErrorResponse(
                request,
                `Failed to upload capture photo: ${error.message}`,
                500
            );
        }
        
        // Generate backend API URL for capture photo
        const captureUrl = generateBackendImageUrl(r2Key);
        
        // Prepare attendance log data
        const logData = {
            id: logId,
            user_id: user_id,
            employee_id: user.employee_id,
            name: user.name,
            scan_type: scanType,
            timestamp: serverTimestamp,
            capture_url: captureUrl,
            created_at: serverTimestamp
        };
        
        // Insert attendance log into database
        try {
            await insertAttendanceLog(env.DB, logData);
        } catch (error) {
            // Rollback: delete uploaded photo
            await deleteImage(env.ATTENDANCE_BUCKET, r2Key);
            
            return corsErrorResponse(
                request,
                `Failed to save attendance log: ${error.message}`,
                500
            );
        }
        
        // Return success response with user role for frontend logic
        return corsResponse(request, {
            success: true,
            message: `Clock ${scanType} recorded successfully`,
            data: {
                id: logId,
                user_id: user_id,
                employee_id: user.employee_id,
                name: user.name,
                role: user.role, // Include role for frontend warning logic
                scan_type: scanType,
                timestamp: serverTimestamp,
                capture_url: captureUrl
            }
        }, 201);
        
    } catch (error) {
        console.error('Error in recordAttendance:', error);
        return corsErrorResponse(
            request,
            'Internal server error',
            500
        );
    }
}

/**
 * GET /api/attendance/today
 * Get all attendance logs for today
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function getTodayLogs(request, env) {
    try {
        // Fetch today's logs
        const logs = await getAllTodayLogs(env.DB);
        
        return corsResponse(request, {
            success: true,
            date: getTodayDateString(),
            count: logs.length,
            data: logs
        }, 200);
        
    } catch (error) {
        console.error('Error in getTodayLogs:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch today\'s attendance logs',
            500
        );
    }
}

/**
 * GET /api/attendance/records?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * Get attendance logs within a date range
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function getAttendanceRecords(request, env) {
    try {
        // Parse query parameters
        const url = new URL(request.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        
        // Validate required parameters
        if (!startDate || !endDate) {
            return corsErrorResponse(
                request,
                'start_date and end_date query parameters are required',
                400
            );
        }
        
        // Validate date range
        const dateValidation = validateDateRange(startDate, endDate);
        if (!dateValidation.valid) {
            return corsErrorResponse(request, dateValidation.error, 400);
        }
        
        // Fetch logs within date range
        const logs = await getAttendanceByDateRange(env.DB, startDate, endDate);
        
        return corsResponse(request, {
            success: true,
            start_date: startDate,
            end_date: endDate,
            count: logs.length,
            data: logs
        }, 200);
        
    } catch (error) {
        console.error('Error in getAttendanceRecords:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch attendance records',
            500
        );
    }
}

/**
 * GET /api/attendance/user/:user_id
 * Get attendance history for a specific user
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @param {string} userId - User UUID from URL params
 * @returns {Response} JSON response
 */
async function getUserLogs(request, env, userId) {
    try {
        // Validate UUID
        const uuidValidation = validateUUID(userId);
        if (!uuidValidation.valid) {
            return corsErrorResponse(request, uuidValidation.error, 400);
        }
        
        // Fetch user
        const user = await getUserById(env.DB, userId);
        if (!user) {
            return corsErrorResponse(request, 'User not found', 404);
        }
        
        // Fetch user's attendance history
        const logs = await getUserAttendanceHistory(env.DB, userId);
        
        return corsResponse(request, {
            success: true,
            user: {
                id: user.id,
                employee_id: user.employee_id,
                name: user.name
            },
            count: logs.length,
            data: logs
        }, 200);
        
    } catch (error) {
        console.error('Error in getUserLogs:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch user attendance history',
            500
        );
    }
}

/**
 * GET /api/attendance/status/:user_id
 * Get current attendance status for a user today
 * Returns whether user can clock IN or OUT
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @param {string} userId - User UUID from URL params
 * @returns {Response} JSON response
 */
async function getUserStatus(request, env, userId) {
    try {
        // Validate UUID
        const uuidValidation = validateUUID(userId);
        if (!uuidValidation.valid) {
            return corsErrorResponse(request, uuidValidation.error, 400);
        }
        
        // Fetch user
        const user = await getUserById(env.DB, userId);
        if (!user) {
            return corsErrorResponse(request, 'User not found', 404);
        }
        
        // Get today's logs
        const todayLogs = await getTodayAttendance(env.DB, userId);
        
        let status;
        let nextAction;
        
        if (todayLogs.length === 0) {
            status = 'not_started';
            nextAction = 'IN';
        } else if (todayLogs.length === 1) {
            status = 'clocked_in';
            nextAction = 'OUT';
        } else {
            status = 'completed';
            nextAction = null;
        }
        
        return corsResponse(request, {
            success: true,
            user: {
                id: user.id,
                employee_id: user.employee_id,
                name: user.name
            },
            status: status,
            next_action: nextAction,
            today_logs: todayLogs
        }, 200);
        
    } catch (error) {
        console.error('Error in getUserStatus:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch user status',
            500
        );
    }
}

// Export handler functions
export {
    recordAttendance,
    getTodayLogs,
    getAttendanceRecords,
    getUserLogs,
    getUserStatus
};
