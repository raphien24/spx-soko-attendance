/**
 * Roster Schedule Handlers
 * Handles roster scheduling and attendance tracking
 */

import {
    insertRoster,
    getRosterByDate,
    getRosterByDateRange,
    deleteRoster,
    deleteRosterByDateAndEmployee,
    getRosterWithAttendance,
    isEmployeeRostered,
    getEmployeeByEmployeeId
} from '../db/queries.js';

import {
    corsResponse,
    corsErrorResponse
} from '../utils/cors.js';

import { getCurrentISOTimestamp, getTodayDateString } from '../utils/time.js';

/**
 * Generate UUID v4
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * POST /api/roster
 * Create roster for a specific date
 * Supports multiple employees in one request
 * 
 * Body: { date: "YYYY-MM-DD", employee_ids: ["123", "456"] }
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function createRoster(request, env) {
    try {
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        const { date, employee_ids } = payload;
        
        // Validate required fields
        if (!date || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
            return corsErrorResponse(
                request,
                'Missing required fields: date (YYYY-MM-DD), employee_ids (array)',
                400
            );
        }
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return corsErrorResponse(
                request,
                'Invalid date format. Use YYYY-MM-DD',
                400
            );
        }
        
        const created_at = getCurrentISOTimestamp();
        const results = {
            success: [],
            failed: [],
            skipped: []
        };
        
        // Process each employee
        for (const employee_id of employee_ids) {
            try {
                // Check if employee exists
                const employee = await getEmployeeByEmployeeId(env.DB, employee_id);
                if (!employee) {
                    results.failed.push({
                        employee_id,
                        reason: 'Employee not found'
                    });
                    continue;
                }
                
                // Check if already rostered
                const alreadyRostered = await isEmployeeRostered(env.DB, date, employee_id);
                if (alreadyRostered) {
                    results.skipped.push({
                        employee_id,
                        name: employee.name,
                        reason: 'Already rostered for this date'
                    });
                    continue;
                }
                
                // Create roster entry
                const rosterData = {
                    id: generateUUID(),
                    date,
                    employee_id,
                    employee_name: employee.name,
                    created_at,
                    created_by: null // TODO: Add admin user tracking
                };
                
                await insertRoster(env.DB, rosterData);
                
                results.success.push({
                    employee_id,
                    name: employee.name
                });
                
                console.log(`[Roster] Added to roster: ${employee_id} - ${employee.name} on ${date}`);
                
            } catch (error) {
                console.error(`[Roster] Failed to add ${employee_id}:`, error);
                results.failed.push({
                    employee_id,
                    reason: error.message
                });
            }
        }
        
        return corsResponse(request, {
            success: true,
            message: `Roster created: ${results.success.length} added, ${results.skipped.length} skipped, ${results.failed.length} failed`,
            data: {
                date,
                total_requested: employee_ids.length,
                added: results.success,
                skipped: results.skipped,
                failed: results.failed
            }
        }, 201);
        
    } catch (error) {
        console.error('[Roster] Create roster failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to create roster',
            500
        );
    }
}

/**
 * GET /api/roster?date=YYYY-MM-DD
 * Get roster for a specific date (with attendance status)
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function getRoster(request, env) {
    try {
        const url = new URL(request.url);
        const date = url.searchParams.get('date');
        const start_date = url.searchParams.get('start_date');
        const end_date = url.searchParams.get('end_date');
        const with_attendance = url.searchParams.get('with_attendance') === 'true';
        
        let roster;
        
        if (date) {
            // Single date query
            if (with_attendance) {
                roster = await getRosterWithAttendance(env.DB, date);
            } else {
                roster = await getRosterByDate(env.DB, date);
            }
        } else if (start_date && end_date) {
            // Date range query
            roster = await getRosterByDateRange(env.DB, start_date, end_date);
        } else {
            // Default: today's roster
            const today = getTodayDateString();
            if (with_attendance) {
                roster = await getRosterWithAttendance(env.DB, today);
            } else {
                roster = await getRosterByDate(env.DB, today);
            }
        }
        
        console.log(`[Roster] Retrieved ${roster.length} roster entries`);
        
        return corsResponse(request, {
            success: true,
            count: roster.length,
            data: roster
        });
        
    } catch (error) {
        console.error('[Roster] Get roster failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to retrieve roster',
            500
        );
    }
}

/**
 * DELETE /api/roster/:roster_id
 * Delete a specific roster entry by ID
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @param {string} rosterId 
 * @returns {Response}
 */
async function removeRoster(request, env, rosterId) {
    try {
        await deleteRoster(env.DB, rosterId);
        
        console.log(`[Roster] Deleted roster entry: ${rosterId}`);
        
        return corsResponse(request, {
            success: true,
            message: 'Roster entry deleted successfully'
        });
        
    } catch (error) {
        console.error('[Roster] Delete roster failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to delete roster entry',
            500
        );
    }
}

/**
 * DELETE /api/roster/by-date-employee
 * Delete roster entry by date and employee_id
 * Body: { date: "YYYY-MM-DD", employee_id: "123" }
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function removeRosterByDateEmployee(request, env) {
    try {
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        const { date, employee_id } = payload;
        
        if (!date || !employee_id) {
            return corsErrorResponse(
                request,
                'Missing required fields: date, employee_id',
                400
            );
        }
        
        await deleteRosterByDateAndEmployee(env.DB, date, employee_id);
        
        console.log(`[Roster] Deleted roster: ${employee_id} on ${date}`);
        
        return corsResponse(request, {
            success: true,
            message: 'Roster entry deleted successfully'
        });
        
    } catch (error) {
        console.error('[Roster] Delete roster by date/employee failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to delete roster entry',
            500
        );
    }
}

/**
 * GET /api/roster/check-attendance?date=YYYY-MM-DD
 * Get list of employees who are rostered but haven't clocked in yet
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function checkAttendance(request, env) {
    try {
        const url = new URL(request.url);
        const date = url.searchParams.get('date') || getTodayDateString();
        
        const roster = await getRosterWithAttendance(env.DB, date);
        
        // Filter: only those who haven't clocked in
        const notClockedIn = roster.filter(r => r.attendance_status === 'not_clocked_in');
        const clockedIn = roster.filter(r => r.attendance_status === 'clocked_in');
        
        console.log(`[Roster] Attendance check for ${date}: ${clockedIn.length}/${roster.length} clocked in`);
        
        return corsResponse(request, {
            success: true,
            date,
            summary: {
                total_rostered: roster.length,
                clocked_in: clockedIn.length,
                not_clocked_in: notClockedIn.length
            },
            data: {
                rostered: roster,
                not_clocked_in: notClockedIn,
                clocked_in: clockedIn
            }
        });
        
    } catch (error) {
        console.error('[Roster] Check attendance failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to check attendance',
            500
        );
    }
}

export {
    createRoster,
    getRoster,
    removeRoster,
    removeRosterByDateEmployee,
    checkAttendance
};
