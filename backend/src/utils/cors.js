/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 * Handles CORS headers for Cloudflare Workers
 */

/**
 * Allowed origins for CORS
 * Add your Cloudflare Pages URL and custom domain here
 */
const ALLOWED_ORIGINS = [
    'http://localhost:8080',           // Local development (frontend)
    'http://localhost:3000',           // Alternative local dev port
    'http://127.0.0.1:8080',          // Alternative localhost
    'http://localhost:5500',           // Live Server default port
    'http://127.0.0.1:5500',          // Live Server alternative
    // Production origins - Cloudflare Pages
    'https://*.pages.dev',             // Wildcard for all Cloudflare Pages deployments
    // Add your specific production URLs below:
    // 'https://spx-soko-attendance.pages.dev',
    // 'https://attendance.spxexpress.com'
];

/**
 * CORS configuration
 */
const CORS_CONFIG = {
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
    credentials: false
};

/**
 * Get CORS headers for a request
 * 
 * @param {Request} request - Incoming request object
 * @returns {Object} CORS headers object
 */
function getCorsHeaders(request) {
    const origin = request.headers.get('Origin');
    const headers = {};
    
    // If no origin header (same-origin or direct access)
    if (!origin) {
        // Set wildcard for non-browser requests
        headers['Access-Control-Allow-Origin'] = '*';
    } else {
        // Check if origin is allowed
        const tempRequest = { headers: { get: (key) => key === 'Origin' ? origin : null } };
        
        if (ALLOWED_ORIGINS.includes(origin) || 
            isDevelopmentOrigin(origin) || 
            isCloudflarePages(origin)) {
            // Echo back the allowed origin
            headers['Access-Control-Allow-Origin'] = origin;
        } else {
            // Check wildcard patterns
            let matched = false;
            for (const allowedOrigin of ALLOWED_ORIGINS) {
                if (allowedOrigin.includes('*')) {
                    const pattern = allowedOrigin
                        .replace(/\./g, '\\.')
                        .replace(/\*/g, '.*');
                    const regex = new RegExp(`^${pattern}$`);
                    if (regex.test(origin)) {
                        headers['Access-Control-Allow-Origin'] = origin;
                        matched = true;
                        break;
                    }
                }
            }
            
            // If not matched, don't set CORS headers (will be blocked)
            if (!matched) {
                return headers;
            }
        }
    }
    
    // Add other CORS headers
    headers['Access-Control-Allow-Methods'] = CORS_CONFIG.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = CORS_CONFIG.allowedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = CORS_CONFIG.maxAge.toString();
    headers['Vary'] = 'Origin'; // Important for caching
    
    if (CORS_CONFIG.credentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    return headers;
}

/**
 * Check if origin is a development/localhost origin
 * 
 * @param {string} origin - Origin URL
 * @returns {boolean} True if development origin
 */
function isDevelopmentOrigin(origin) {
    try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Allow localhost and 127.0.0.1 on any port
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname.endsWith('.local');
    } catch (error) {
        return false;
    }
}

/**
 * Check if origin is a Cloudflare Pages deployment
 * 
 * @param {string} origin - Origin URL
 * @returns {boolean} True if Cloudflare Pages origin
 */
function isCloudflarePages(origin) {
    try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Allow any *.pages.dev domain
        return hostname.endsWith('.pages.dev');
    } catch (error) {
        return false;
    }
}

/**
 * Handle CORS preflight (OPTIONS) request
 * 
 * @param {Request} request - Incoming OPTIONS request
 * @returns {Response} Preflight response
 */
function handleCorsPreFlight(request) {
    const corsHeaders = getCorsHeaders(request);
    
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

/**
 * Add CORS headers to an existing response
 * 
 * @param {Response} response - Original response
 * @param {Request} request - Original request
 * @returns {Response} Response with CORS headers added
 */
function addCorsHeaders(response, request) {
    const corsHeaders = getCorsHeaders(request);
    
    // Clone response to modify headers
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers
    Object.keys(corsHeaders).forEach(key => {
        newResponse.headers.set(key, corsHeaders[key]);
    });
    
    return newResponse;
}

/**
 * Check if origin matches allowed patterns
 * Supports exact match and wildcard patterns
 * 
 * @param {string} origin - Origin URL to check
 * @returns {boolean} True if origin is allowed
 */
function isOriginAllowed(request) {
    const origin = request.headers.get('Origin');
    
    if (!origin) {
        // No origin header (same-origin request or direct access)
        return true;
    }
    
    // Check for exact match
    if (ALLOWED_ORIGINS.includes(origin)) {
        return true;
    }
    
    // Check for wildcard pattern match (e.g., *.pages.dev)
    for (const allowedOrigin of ALLOWED_ORIGINS) {
        if (allowedOrigin.includes('*')) {
            const pattern = allowedOrigin
                .replace(/\./g, '\\.')  // Escape dots
                .replace(/\*/g, '.*');   // Convert * to .*
            
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(origin)) {
                return true;
            }
        }
    }
    
    // Check if it's a development origin
    if (isDevelopmentOrigin(origin)) {
        return true;
    }
    
    // Check if it's a Cloudflare Pages deployment
    if (isCloudflarePages(origin)) {
        return true;
    }
    
    return false;
}

/**
 * Create error response with CORS headers
 * 
 * @param {Request} request - Original request
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} Error response with CORS headers
 */
function corsErrorResponse(request, message, status = 403) {
    const corsHeaders = getCorsHeaders(request);
    
    return new Response(
        JSON.stringify({
            success: false,
            error: message
        }),
        {
            status: status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        }
    );
}

/**
 * Create success response with CORS headers
 * 
 * @param {Request} request - Original request
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} Success response with CORS headers
 */
function corsResponse(request, data, status = 200) {
    const corsHeaders = getCorsHeaders(request);
    
    return new Response(
        JSON.stringify(data),
        {
            status: status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        }
    );
}

/**
 * CORS middleware wrapper
 * Wraps a handler function with CORS logic
 * 
 * @param {Function} handler - Request handler function
 * @returns {Function} Wrapped handler with CORS support
 */
function corsMiddleware(handler) {
    return async (request, env, ctx) => {
        // Handle preflight request
        if (request.method === 'OPTIONS') {
            return handleCorsPreFlight(request);
        }
        
        // Check if origin is allowed
        if (!isOriginAllowed(request)) {
            return corsErrorResponse(
                request,
                'Origin not allowed',
                403
            );
        }
        
        // Execute handler
        try {
            const response = await handler(request, env, ctx);
            
            // Add CORS headers to response
            return addCorsHeaders(response, request);
        } catch (error) {
            // Handle errors with CORS headers
            return corsErrorResponse(
                request,
                error.message || 'Internal server error',
                500
            );
        }
    };
}

/**
 * Add allowed origin to whitelist
 * Useful for dynamic configuration
 * 
 * @param {string} origin - Origin URL to add
 */
function addAllowedOrigin(origin) {
    if (!ALLOWED_ORIGINS.includes(origin)) {
        ALLOWED_ORIGINS.push(origin);
    }
}

/**
 * Remove origin from whitelist
 * 
 * @param {string} origin - Origin URL to remove
 */
function removeAllowedOrigin(origin) {
    const index = ALLOWED_ORIGINS.indexOf(origin);
    if (index > -1) {
        ALLOWED_ORIGINS.splice(index, 1);
    }
}

/**
 * Get current allowed origins list
 * 
 * @returns {Array<string>} Array of allowed origins
 */
function getAllowedOrigins() {
    return [...ALLOWED_ORIGINS];
}

// Export functions
export {
    getCorsHeaders,
    handleCorsPreFlight,
    addCorsHeaders,
    isOriginAllowed,
    corsErrorResponse,
    corsResponse,
    corsMiddleware,
    addAllowedOrigin,
    removeAllowedOrigin,
    getAllowedOrigins,
    ALLOWED_ORIGINS,
    CORS_CONFIG
};
