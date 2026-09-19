/**
 * Settings Handler
 * Handles hub location configuration
 */

import {
    getHubSettings,
    updateHubSettings
} from '../db/queries.js';

import {
    corsResponse,
    corsErrorResponse
} from '../utils/cors.js';

import {
    getCurrentISOTimestamp
} from '../utils/time.js';

/**
 * GET /api/settings/hub-location
 * Get hub location settings
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function getHubLocation(request, env) {
    try {
        // Fetch hub settings from database
        const settings = await getHubSettings(env.DB);
        
        if (!settings) {
            return corsErrorResponse(
                request,
                'Hub settings not found. Please initialize database.',
                404
            );
        }
        
        return corsResponse(request, {
            success: true,
            data: {
                hub_name: settings.hub_name,
                latitude: settings.latitude,
                longitude: settings.longitude,
                radius_meters: settings.radius_meters,
                updated_at: settings.updated_at,
                updated_by: settings.updated_by
            }
        }, 200);
        
    } catch (error) {
        console.error('Error in getHubLocation:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch hub location settings',
            500
        );
    }
}

/**
 * PUT /api/settings/hub-location
 * Update hub location settings
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function updateHubLocation(request, env) {
    try {
        // Parse request body
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        // Validate payload
        const { latitude, longitude, radius_meters, hub_name, updated_by } = payload;
        
        // Validate latitude (-90 to 90)
        if (latitude === undefined || latitude === null) {
            return corsErrorResponse(request, 'Latitude is required', 400);
        }
        
        const lat = parseFloat(latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
            return corsErrorResponse(
                request,
                'Latitude must be a number between -90 and 90',
                400
            );
        }
        
        // Validate longitude (-180 to 180)
        if (longitude === undefined || longitude === null) {
            return corsErrorResponse(request, 'Longitude is required', 400);
        }
        
        const lng = parseFloat(longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
            return corsErrorResponse(
                request,
                'Longitude must be a number between -180 and 180',
                400
            );
        }
        
        // Validate radius (optional, default 500)
        let radius = 500;
        if (radius_meters !== undefined && radius_meters !== null) {
            radius = parseInt(radius_meters);
            if (isNaN(radius) || radius < 50 || radius > 10000) {
                return corsErrorResponse(
                    request,
                    'Radius must be a number between 50 and 10000 meters',
                    400
                );
            }
        }
        
        // Update database
        const result = await updateHubSettings(env.DB, {
            latitude: lat,
            longitude: lng,
            radius_meters: radius,
            hub_name: hub_name || 'SPX Soko Hub',
            updated_by: updated_by || null
        });
        
        if (!result || !result.success) {
            return corsErrorResponse(
                request,
                'Failed to update hub location settings',
                500
            );
        }
        
        // Fetch updated settings
        const updatedSettings = await getHubSettings(env.DB);
        
        return corsResponse(request, {
            success: true,
            message: 'Hub location updated successfully',
            data: {
                hub_name: updatedSettings.hub_name,
                latitude: updatedSettings.latitude,
                longitude: updatedSettings.longitude,
                radius_meters: updatedSettings.radius_meters,
                updated_at: updatedSettings.updated_at,
                updated_by: updatedSettings.updated_by
            }
        }, 200);
        
    } catch (error) {
        console.error('Error in updateHubLocation:', error);
        return corsErrorResponse(
            request,
            'Failed to update hub location settings',
            500
        );
    }
}

// Export handler functions
export {
    getHubLocation,
    updateHubLocation
};
