/**
 * Off Schedule Handlers
 * Handles employee weekly day-off scheduling
 */

import {
    insertOffSchedule,
    getOffScheduleByEmployee,
    getAllOffSchedules,
    deleteOffSchedule,
    checkEmployeeOffOnDate,
    getOffSchedulesByDay,
    getEmployeeByEmployeeId
} from '../db/queries.js';

import {
    corsResponse,
    corsErrorResponse
} from '../utils/cors.js';

import { getCurrentISOTimestamp } from '../utils/time.js';

/**
 * Generate UUID v4
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * POST /api/off-schedule
 * Create off schedule entry for an employee
 * Supports bulk creation for multiple days
 * 
 * Body: { 
 *   employee_id: "123",
 *   days_of_week: [1, 2, 3]  // 1=Monday to 7=Sunday
 * }
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function createOffSchedule(request, env) {
    try {
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        const { employee_id, days_of_week } = payload;
        
        // Validate required fields
        if (!employee_id || !days_of_week || !Array.isArray(days_of_week) || days_of_week.length === 0) {
            return corsErrorResponse(
                request,
                'Missing required fields: employee_id, days_of_week (array of 1-7)',
                400
            );
        }
        
        // Validate days_of_week values (1-7)
        const invalidDays = days_of_week.filter(day => day < 1 || day > 7);
        if (invalidDays.length > 0) {
            return corsErrorResponse(
                request,
                `Invalid day_of_week values: ${invalidDays.join(', ')}. Must be 1-7 (1=Monday, 7=Sunday)`,
                400
            );
        }
        
        // Check if employee exists
        const employee = await getEmployeeByEmployeeId(env.DB, employee_id);
        if (!employee) {
            return corsErrorResponse(request, 'Employee not found', 404);
        }
        
        const created_at = getCurrentISOTimestamp();
        const results = {
            success: [],
            failed: [],
            skipped: []
        };
        
        // Process each day
        for (const day_of_week of days_of_week) {
            try {
                // Check if already exists
                const existing = await env.DB.prepare(
                    `SELECT id FROM off_schedule WHERE employee_id = ? AND day_of_week = ?`
                ).bind(employee_id, day_of_week).first();
                
                if (existing) {
                    results.skipped.push({
                        day_of_week,
                        reason: 'Already has off schedule for this day'
                    });
                    continue;
                }
                
                // Create off schedule entry
                const offData = {
                    id: generateUUID(),
                    employee_id,
                    day_of_week,
                    created_at,
                    created_by: null // TODO: Add admin user tracking
                };
                
                await insertOffSchedule(env.DB, offData);
                
                results.success.push({
                    day_of_week,
                    id: offData.id
                });
                
                console.log(`[OffSchedule] Added: ${employee.name} (${employee_id}) - Day ${day_of_week}`);
                
            } catch (error) {
                console.error(`[OffSchedule] Failed to add day ${day_of_week}:`, error);
                results.failed.push({
                    day_of_week,
                    reason: error.message
                });
            }
        }
        
        return corsResponse(request, {
            success: true,
            message: `Off schedule created: ${results.success.length} added, ${results.skipped.length} skipped, ${results.failed.length} failed`,
            data: {
                employee_id,
                employee_name: employee.name,
                total_requested: days_of_week.length,
                added: results.success,
                skipped: results.skipped,
                failed: results.failed
            }
        }, 201);
        
    } catch (error) {
        console.error('[OffSchedule] Create off schedule failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to create off schedule',
            500
        );
    }
}

/**
 * GET /api/off-schedule?employee_id=123
 * Get off schedule entries
 * Query params:
 * - employee_id: get for specific employee
 * - day_of_week: get for specific day (1-7)
 * - none: get all off schedules
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function getOffSchedule(request, env) {
    try {
        const url = new URL(request.url);
        const employee_id = url.searchParams.get('employee_id');
        const day_of_week = url.searchParams.get('day_of_week');
        
        let offSchedules;
        
        if (employee_id) {
            // Get for specific employee
            offSchedules = await getOffScheduleByEmployee(env.DB, employee_id);
        } else if (day_of_week) {
            // Get for specific day
            const day = parseInt(day_of_week);
            if (day < 1 || day > 7) {
                return corsErrorResponse(request, 'Invalid day_of_week. Must be 1-7', 400);
            }
            offSchedules = await getOffSchedulesByDay(env.DB, day);
        } else {
            // Get all
            offSchedules = await getAllOffSchedules(env.DB);
        }
        
        console.log(`[OffSchedule] Retrieved ${offSchedules.length} off schedule entries`);
        
        return corsResponse(request, {
            success: true,
            count: offSchedules.length,
            data: offSchedules
        });
        
    } catch (error) {
        console.error('[OffSchedule] Get off schedule failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to retrieve off schedule',
            500
        );
    }
}

/**
 * DELETE /api/off-schedule/:id
 * Delete a specific off schedule entry by ID
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @param {string} offScheduleId 
 * @returns {Response}
 */
async function removeOffSchedule(request, env, offScheduleId) {
    try {
        await deleteOffSchedule(env.DB, offScheduleId);
        
        console.log(`[OffSchedule] Deleted off schedule entry: ${offScheduleId}`);
        
        return corsResponse(request, {
            success: true,
            message: 'Off schedule entry deleted successfully'
        });
        
    } catch (error) {
        console.error('[OffSchedule] Delete off schedule failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to delete off schedule entry',
            500
        );
    }
}

/**
 * GET /api/off-schedule/check?employee_id=123&date=2026-09-27
 * Check if employee has off schedule on specific date
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function checkOffScheduleOnDate(request, env) {
    try {
        const url = new URL(request.url);
        const employee_id = url.searchParams.get('employee_id');
        const date = url.searchParams.get('date');
        
        if (!employee_id || !date) {
            return corsErrorResponse(
                request,
                'Missing required parameters: employee_id, date',
                400
            );
        }
        
        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return corsErrorResponse(request, 'Invalid date format. Use YYYY-MM-DD', 400);
        }
        
        const offSchedule = await checkEmployeeOffOnDate(env.DB, employee_id, date);
        
        const isOff = !!offSchedule;
        
        console.log(`[OffSchedule] Check for ${employee_id} on ${date}: ${isOff ? 'OFF' : 'WORKING'}`);
        
        return corsResponse(request, {
            success: true,
            data: {
                employee_id,
                date,
                is_off: isOff,
                off_schedule: offSchedule
            }
        });
        
    } catch (error) {
        console.error('[OffSchedule] Check off schedule on date failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to check off schedule',
            500
        );
    }
}

export {
    createOffSchedule,
    getOffSchedule,
    removeOffSchedule,
    checkOffScheduleOnDate
};
