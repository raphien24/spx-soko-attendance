/**
 * SPX Soko Attendance System - Main Worker Entry Point
 * Cloudflare Workers API
 */

// Import handlers
import {
    registerUser,
    getUsers,
    getUserDescriptors,
    removeUser,
    getUser
} from './handlers/users.js';

import {
    recordAttendance,
    getTodayLogs,
    getAttendanceRecords,
    getUserLogs,
    getUserStatus
} from './handlers/attendance.js';

import {
    healthCheck,
    getInfo
} from './handlers/health.js';

import {
    serveImage
} from './handlers/images.js';

import {
    getHubLocation,
    updateHubLocation
} from './handlers/settings.js';

// Import CORS utilities
import {
    handleCorsPreFlight,
    addCorsHeaders,
    isOriginAllowed,
    corsErrorResponse
} from './utils/cors.js';

/**
 * Main request router
 * Routes incoming requests to appropriate handlers
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings (DB, ATTENDANCE_BUCKET)
 * @param {Object} ctx - Execution context
 * @returns {Response} Response object
 */
async function handleRequest(request, env, ctx) {
    // Parse URL
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    
    // Handle CORS preflight (OPTIONS)
    if (method === 'OPTIONS') {
        return handleCorsPreFlight(request);
    }
    
    // Check if origin is allowed
    if (!isOriginAllowed(request)) {
        return corsErrorResponse(request, 'Origin not allowed', 403);
    }
    
    try {
        // Route handling
        let response;
        
        // Health & Info endpoints
        if (pathname === '/api/health' && method === 'GET') {
            response = await healthCheck(request, env);
        }
        else if (pathname === '/api/info' && method === 'GET') {
            response = await getInfo(request, env);
        }
        
        // User endpoints
        else if (pathname === '/api/users/register' && method === 'POST') {
            response = await registerUser(request, env);
        }
        else if (pathname === '/api/users' && method === 'GET') {
            response = await getUsers(request, env);
        }
        else if (pathname === '/api/users/descriptors' && method === 'GET') {
            response = await getUserDescriptors(request, env);
        }
        else if (pathname.startsWith('/api/users/') && method === 'GET') {
            // GET /api/users/:id
            const userId = pathname.split('/')[3];
            if (userId) {
                response = await getUser(request, env, userId);
            } else {
                response = corsErrorResponse(request, 'User ID is required', 400);
            }
        }
        else if (pathname.startsWith('/api/users/') && method === 'DELETE') {
            // DELETE /api/users/:id
            const userId = pathname.split('/')[3];
            if (userId) {
                response = await removeUser(request, env, userId);
            } else {
                response = corsErrorResponse(request, 'User ID is required', 400);
            }
        }
        
        // Attendance endpoints
        else if (pathname === '/api/attendance/scan' && method === 'POST') {
            response = await recordAttendance(request, env);
        }
        else if (pathname === '/api/attendance/today' && method === 'GET') {
            response = await getTodayLogs(request, env);
        }
        else if (pathname === '/api/attendance/records' && method === 'GET') {
            response = await getAttendanceRecords(request, env);
        }
        else if (pathname.startsWith('/api/attendance/user/') && method === 'GET') {
            // GET /api/attendance/user/:user_id
            const userId = pathname.split('/')[4];
            if (userId) {
                response = await getUserLogs(request, env, userId);
            } else {
                response = corsErrorResponse(request, 'User ID is required', 400);
            }
        }
        else if (pathname.startsWith('/api/attendance/status/') && method === 'GET') {
            // GET /api/attendance/status/:user_id
            const userId = pathname.split('/')[4];
            if (userId) {
                response = await getUserStatus(request, env, userId);
            } else {
                response = corsErrorResponse(request, 'User ID is required', 400);
            }
        }
        
        // Image serving endpoint
        else if (pathname.startsWith('/api/images/') && method === 'GET') {
            // GET /api/images/*
            // Extract image path after /api/images/
            const imagePath = pathname.substring('/api/images/'.length);
            if (imagePath) {
                response = await serveImage(request, env, imagePath);
            } else {
                response = corsErrorResponse(request, 'Image path is required', 400);
            }
        }
        
        // Settings endpoints
        else if (pathname === '/api/settings/hub-location' && method === 'GET') {
            response = await getHubLocation(request, env);
        }
        else if (pathname === '/api/settings/hub-location' && method === 'PUT') {
            response = await updateHubLocation(request, env);
        }
        
        // Root endpoint
        else if (pathname === '/' && method === 'GET') {
            response = new Response(
                JSON.stringify({
                    success: true,
                    message: 'SPX Soko Attendance API',
                    version: '1.0.0',
                    endpoints: {
                        health: '/api/health',
                        info: '/api/info',
                        docs: '/api/info'
                    }
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            response = addCorsHeaders(response, request);
        }
        
        // 404 Not Found
        else {
            response = corsErrorResponse(
                request,
                `Endpoint not found: ${method} ${pathname}`,
                404
            );
        }
        
        return response;
        
    } catch (error) {
        // Global error handler
        console.error('Unhandled error:', error);
        
        return corsErrorResponse(
            request,
            'Internal server error',
            500
        );
    }
}

/**
 * Worker fetch handler
 * Entry point for all requests
 */
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    }
};
