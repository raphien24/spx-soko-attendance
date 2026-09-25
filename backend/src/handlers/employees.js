/**
 * Employee Management Handlers
 * Handles employee CRUD operations (enrolled + not enrolled)
 */

import {
    insertEmployee,
    getAllEmployees,
    getEmployeeByEmployeeId,
    updateEmployee,
    deleteEmployee
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
 * POST /api/employees
 * Add new employee (enrolled or not enrolled)
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function addEmployee(request, env) {
    try {
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        // Validate required fields
        const { employee_id, name, role, phone } = payload;
        
        if (!employee_id || !name) {
            return corsErrorResponse(
                request,
                'Missing required fields: employee_id, name',
                400
            );
        }
        
        // Check if employee_id already exists
        const existing = await getEmployeeByEmployeeId(env.DB, employee_id);
        if (existing) {
            return corsErrorResponse(
                request,
                `Employee ID ${employee_id} already exists`,
                409
            );
        }
        
        // Create employee data
        const employeeData = {
            id: generateUUID(),
            employee_id,
            name,
            role: role || 'rider',
            phone: phone || null,
            enrolled_status: 'not_enrolled', // Default to not enrolled
            user_id: null, // Will be set when user enrolls face
            created_at: getCurrentISOTimestamp()
        };
        
        // Insert to database
        await insertEmployee(env.DB, employeeData);
        
        console.log(`[Employee] Added new employee: ${employee_id} - ${name}`);
        
        return corsResponse(request, {
            success: true,
            message: 'Employee added successfully',
            data: {
                id: employeeData.id,
                employee_id: employeeData.employee_id,
                name: employeeData.name,
                role: employeeData.role,
                phone: employeeData.phone,
                enrolled_status: employeeData.enrolled_status,
                created_at: employeeData.created_at
            }
        }, 201);
        
    } catch (error) {
        console.error('[Employee] Add employee failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to add employee',
            500
        );
    }
}

/**
 * GET /api/employees
 * Get all employees (enrolled + not enrolled)
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @returns {Response}
 */
async function listEmployees(request, env) {
    try {
        const employees = await getAllEmployees(env.DB);
        
        console.log(`[Employee] Retrieved ${employees.length} employees`);
        
        return corsResponse(request, {
            success: true,
            count: employees.length,
            data: employees
        });
        
    } catch (error) {
        console.error('[Employee] List employees failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to retrieve employees',
            500
        );
    }
}

/**
 * PUT /api/employees/:employee_id
 * Update employee data
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @param {string} employeeId 
 * @returns {Response}
 */
async function updateEmployeeData(request, env, employeeId) {
    try {
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        // Check if employee exists
        const existing = await getEmployeeByEmployeeId(env.DB, employeeId);
        if (!existing) {
            return corsErrorResponse(request, 'Employee not found', 404);
        }
        
        // Update employee
        const updates = {};
        if (payload.name) updates.name = payload.name;
        if (payload.role) updates.role = payload.role;
        if (payload.phone !== undefined) updates.phone = payload.phone;
        if (payload.enrolled_status) updates.enrolled_status = payload.enrolled_status;
        if (payload.user_id !== undefined) updates.user_id = payload.user_id;
        
        await updateEmployee(env.DB, employeeId, updates);
        
        console.log(`[Employee] Updated employee: ${employeeId}`);
        
        return corsResponse(request, {
            success: true,
            message: 'Employee updated successfully'
        });
        
    } catch (error) {
        console.error('[Employee] Update employee failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to update employee',
            500
        );
    }
}

/**
 * DELETE /api/employees/:employee_id
 * Delete employee
 * 
 * @param {Request} request 
 * @param {Object} env 
 * @param {string} employeeId 
 * @returns {Response}
 */
async function removeEmployee(request, env, employeeId) {
    try {
        // Check if employee exists
        const existing = await getEmployeeByEmployeeId(env.DB, employeeId);
        if (!existing) {
            return corsErrorResponse(request, 'Employee not found', 404);
        }
        
        // Delete employee
        await deleteEmployee(env.DB, employeeId);
        
        console.log(`[Employee] Deleted employee: ${employeeId}`);
        
        return corsResponse(request, {
            success: true,
            message: 'Employee deleted successfully'
        });
        
    } catch (error) {
        console.error('[Employee] Delete employee failed:', error);
        return corsErrorResponse(
            request,
            error.message || 'Failed to delete employee',
            500
        );
    }
}

export {
    addEmployee,
    listEmployees,
    updateEmployeeData,
    removeEmployee
};
