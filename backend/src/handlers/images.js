/**
 * Image Serving Handler
 * Serves images from R2 bucket via backend API
 */

import {
    corsResponse,
    corsErrorResponse
} from '../utils/cors.js';

/**
 * GET /api/images/*
 * Serve image from R2 bucket
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @param {string} imagePath - Image path (e.g., "enrollments/uuid.jpg" or "scans/uuid.jpg")
 * @returns {Response} Image file or error
 */
async function serveImage(request, env, imagePath) {
    try {
        // Validate image path
        if (!imagePath) {
            return corsErrorResponse(request, 'Image path is required', 400);
        }
        
        // Security: prevent directory traversal
        if (imagePath.includes('..') || imagePath.startsWith('/')) {
            return corsErrorResponse(request, 'Invalid image path', 400);
        }
        
        // Get image from R2
        const object = await env.ATTENDANCE_BUCKET.get(imagePath);
        
        if (!object) {
            return corsErrorResponse(request, 'Image not found', 404);
        }
        
        // Get image data
        const imageData = await object.arrayBuffer();
        
        // Determine content type based on file extension
        let contentType = 'image/jpeg'; // default
        if (imagePath.endsWith('.png')) {
            contentType = 'image/png';
        } else if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
        } else if (imagePath.endsWith('.gif')) {
            contentType = 'image/gif';
        } else if (imagePath.endsWith('.webp')) {
            contentType = 'image/webp';
        }
        
        // Return image with proper headers
        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
        
    } catch (error) {
        console.error('Error serving image:', error);
        return corsErrorResponse(request, 'Failed to serve image', 500);
    }
}

// Export handler
export {
    serveImage
};
