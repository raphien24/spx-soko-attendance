/**
 * Health Check Handler
 * Provides system health and status information
 */

import { getCurrentISOTimestamp } from '../utils/time.js';
import { corsResponse, corsErrorResponse } from '../utils/cors.js';

/**
 * GET /api/health
 * Check system health (Worker, D1, R2)
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function healthCheck(request, env) {
    const health = {
        worker: 'unknown',
        database: 'unknown',
        storage: 'unknown'
    };
    
    let overallStatus = 'healthy';
    
    try {
        // Check Worker (if we got here, worker is running)
        health.worker = 'ok';
        
        // Check D1 Database
        try {
            const result = await env.DB.prepare('SELECT 1 as test').first();
            if (result && result.test === 1) {
                health.database = 'ok';
            } else {
                health.database = 'error';
                overallStatus = 'degraded';
            }
        } catch (error) {
            health.database = 'error';
            overallStatus = 'degraded';
            console.error('Database health check failed:', error);
        }
        
        // Check R2 Bucket
        try {
            // Try to list objects (limit 1 for minimal overhead)
            const listed = await env.ATTENDANCE_BUCKET.list({ limit: 1 });
            health.storage = 'ok';
        } catch (error) {
            health.storage = 'error';
            overallStatus = 'degraded';
            console.error('R2 health check failed:', error);
        }
        
        return corsResponse(request, {
            success: true,
            status: overallStatus,
            timestamp: getCurrentISOTimestamp(),
            services: health
        }, 200);
        
    } catch (error) {
        console.error('Health check error:', error);
        return corsErrorResponse(
            request,
            'Health check failed',
            500
        );
    }
}

/**
 * GET /api/info
 * Get API information
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function getInfo(request, env) {
    return corsResponse(request, {
        success: true,
        api: {
            name: 'SPX Soko Attendance API',
            version: '1.0.0',
            description: 'Face recognition attendance system',
            endpoints: {
                users: {
                    register: 'POST /api/users/register',
                    list: 'GET /api/users',
                    descriptors: 'GET /api/users/descriptors',
                    get: 'GET /api/users/:id',
                    delete: 'DELETE /api/users/:id'
                },
                attendance: {
                    scan: 'POST /api/attendance/scan',
                    today: 'GET /api/attendance/today',
                    records: 'GET /api/attendance/records',
                    userHistory: 'GET /api/attendance/user/:user_id',
                    userStatus: 'GET /api/attendance/status/:user_id'
                },
                system: {
                    health: 'GET /api/health',
                    info: 'GET /api/info'
                }
            }
        },
        timestamp: getCurrentISOTimestamp()
    }, 200);
}

// Export functions
export {
    healthCheck,
    getInfo
};
