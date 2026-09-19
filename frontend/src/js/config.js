/**
 * Frontend Configuration
 * Global settings and constants
 */

/**
 * API Configuration
 */
const API_CONFIG = {
    // Base URL for API requests
    // Change this when deploying to production
    BASE_URL: 'http://localhost:8787',
    
    // API endpoints
    ENDPOINTS: {
        // User management
        USERS_REGISTER: '/api/users/register',
        USERS_LIST: '/api/users',
        USERS_DESCRIPTORS: '/api/users/descriptors',
        USERS_GET: '/api/users',           // + /:id
        USERS_DELETE: '/api/users',        // + /:id
        
        // Attendance
        ATTENDANCE_SCAN: '/api/attendance/scan',
        ATTENDANCE_TODAY: '/api/attendance/today',
        ATTENDANCE_RECORDS: '/api/attendance/records',
        ATTENDANCE_USER: '/api/attendance/user',      // + /:user_id
        ATTENDANCE_STATUS: '/api/attendance/status',  // + /:user_id
        
        // Hub Settings
        SETTINGS_HUB_LOCATION: '/api/settings/hub-location',
        
        // System
        HEALTH: '/api/health',
        INFO: '/api/info'
    },
    
    // Request timeout (milliseconds)
    TIMEOUT: 30000 // 30 seconds
};

/**
 * Face Recognition Configuration
 */
const FACE_CONFIG = {
    // Model file paths
    MODEL_PATH: '/public/models',
    
    // Face detection options
    DETECTION_OPTIONS: {
        scoreThreshold: 0.5,        // Minimum confidence for face detection
        inputSize: 224,             // Input size for face detector (224 = 3x faster, still accurate)
        maxFaces: 1                 // Maximum faces to detect (we want exactly 1)
    },
    
    // Face matching threshold
    // Lower value = stricter matching (more secure but might have false negatives)
    // Higher value = looser matching (might have false positives)
    MATCH_THRESHOLD: 0.45,
    
    // Stability check (milliseconds)
    // How long the same face must be detected before triggering auto-capture
    STABILITY_DURATION: 2000, // 2 seconds
    
    // Cooldown period (milliseconds)
    // Prevent multiple scans within this period
    COOLDOWN_DURATION: 5000, // 5 seconds
    
    // Video constraints for webcam
    VIDEO_CONSTRAINTS: {
        width: { ideal: 640 },      // Reduced from 1280 for better performance
        height: { ideal: 480 },     // Reduced from 720 for better performance
        facingMode: 'user'          // Front camera
    },
    
    // Canvas overlay settings
    CANVAS_OPTIONS: {
        boxColor: '#00ff00',        // Green for detected face
        boxLineWidth: 3,
        textColor: '#00ff00',
        textFont: '18px Arial',
        textPadding: 5
    }
};

/**
 * Camera Configuration
 */
const CAMERA_CONFIG = {
    // Video element settings
    autoPlay: true,
    muted: true,
    playsInline: true,
    
    // Capture settings
    imageFormat: 'image/jpeg',
    imageQuality: 0.85,             // 85% quality for JPEG
    maxImageWidth: 1920,
    maxImageHeight: 1080
};

/**
 * UI Configuration
 */
const UI_CONFIG = {
    // Notification durations (milliseconds)
    NOTIFICATION_DURATION: {
        success: 3000,
        error: 5000,
        info: 3000,
        warning: 4000
    },
    
    // Loading states
    LOADING_TEXT: {
        models: 'Loading face detection models...',
        camera: 'Initializing camera...',
        processing: 'Processing...',
        scanning: 'Scanning...',
        uploading: 'Uploading data...'
    },
    
    // Status messages
    STATUS_TEXT: {
        ready: 'Ready to scan',
        noFace: 'No face detected',
        multipleFaces: 'Multiple faces detected - only one person allowed',
        faceDetected: 'Face detected',
        scanning: 'Scanning...',
        recognized: 'Recognized',
        processing: 'Processing attendance...',
        success: 'Attendance recorded!',
        cooldown: 'Please wait...'
    }
};

/**
 * Validation Rules
 */
const VALIDATION_CONFIG = {
    // Employee ID format (4-9 digits)
    EMPLOYEE_ID_PATTERN: /^\d{4,9}$/,
    EMPLOYEE_ID_EXAMPLE: '12345',
    
    // Name validation
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    
    // Face descriptor
    FACE_DESCRIPTOR_LENGTH: 128,
    
    // Image validation
    MAX_IMAGE_SIZE: 2 * 1024 * 1024,    // 2MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png']
};

/**
 * Development Settings
 */
const DEV_CONFIG = {
    // Enable console logging
    DEBUG: true,
    
    // Show performance metrics
    SHOW_METRICS: true,
    
    // Mock data for testing (when backend is unavailable)
    USE_MOCK_DATA: false
};

/**
 * Get full API URL
 * @param {string} endpoint - Endpoint path
 * @returns {string} Full URL
 */
function getApiUrl(endpoint) {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
}

/**
 * Get model URL
 * @param {string} modelFile - Model filename
 * @returns {string} Full model URL
 */
function getModelUrl(modelFile) {
    return `${FACE_CONFIG.MODEL_PATH}/${modelFile}`;
}

/**
 * Log debug message (only if DEBUG is enabled)
 * @param {string} message - Debug message
 * @param {*} data - Optional data to log
 */
function debugLog(message, data = null) {
    if (DEV_CONFIG.DEBUG) {
        if (data) {
            console.log(`[SPX-Attendance] ${message}`, data);
        } else {
            console.log(`[SPX-Attendance] ${message}`);
        }
    }
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
function errorLog(message, error = null) {
    console.error(`[SPX-Attendance ERROR] ${message}`, error);
}

/**
 * Check if running in development mode
 * @returns {boolean} True if development
 */
function isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
}

/**
 * Get environment-specific API base URL
 * Auto-detects development vs production
 * @returns {string} API base URL
 */
function getEnvironmentApiUrl() {
    if (isDevelopment()) {
        return 'https://spx-soko-attendance-api-production.spxsoko.workers.dev';
    } else {
        // Production - UPDATE THIS with your actual Worker URL
        return 'https://spx-soko-attendance-api-production.spxsoko.workers.dev';
    }
}

// Update API_CONFIG.BASE_URL based on environment
API_CONFIG.BASE_URL = getEnvironmentApiUrl();

// Export all configurations
export {
    API_CONFIG,
    FACE_CONFIG,
    CAMERA_CONFIG,
    UI_CONFIG,
    VALIDATION_CONFIG,
    DEV_CONFIG,
    getApiUrl,
    getModelUrl,
    debugLog,
    errorLog,
    isDevelopment
};
