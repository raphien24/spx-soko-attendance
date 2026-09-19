/**
 * API Client Module
 * Fetch wrappers for backend API endpoints
 */

import { API_CONFIG, getApiUrl, debugLog, errorLog } from './config.js';

/**
 * Base fetch wrapper with error handling
 * @param {string} url - Full URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    try {
        debugLog(`API Request: ${options.method || 'GET'} ${url}`);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        // Parse response
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { success: false, error: 'Invalid response format' };
        }
        
        // Handle HTTP errors
        if (!response.ok) {
            const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
            errorLog(`API Error: ${errorMessage}`);
            throw new Error(errorMessage);
        }
        
        debugLog(`API Response: Success`, data);
        return data;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            errorLog('API request timeout');
            throw new Error('Request timeout - server did not respond');
        }
        
        errorLog('API request failed', error);
        throw error;
    }
}

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
async function apiGet(endpoint) {
    const url = getApiUrl(endpoint);
    return apiFetch(url, { method: 'GET' });
}

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
async function apiPost(endpoint, data) {
    const url = getApiUrl(endpoint);
    return apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * PUT request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
async function apiPut(endpoint, data) {
    const url = getApiUrl(endpoint);
    return apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * DELETE request helper
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
async function apiDelete(endpoint) {
    const url = getApiUrl(endpoint);
    return apiFetch(url, { method: 'DELETE' });
}

// ============================================
// USER MANAGEMENT API
// ============================================

async function registerUser(userData) {
    try {
        const response = await apiPost(API_CONFIG.ENDPOINTS.USERS_REGISTER, userData);
        debugLog('User registered successfully', response.data);
        return response;
    } catch (error) {
        errorLog('Failed to register user', error);
        throw error;
    }
}

async function getAllUsers() {
    try {
        const response = await apiGet(API_CONFIG.ENDPOINTS.USERS_LIST);
        debugLog(`Fetched ${response.count || 0} users`);
        
        if (!response.data || !Array.isArray(response.data)) {
            debugLog('No users available or invalid response format');
            return [];
        }
        
        return response.data;
    } catch (error) {
        errorLog('Failed to fetch users', error);
        throw error;
    }
}

async function getUserDescriptors() {
    try {
        const response = await apiGet(API_CONFIG.ENDPOINTS.USERS_DESCRIPTORS);
        debugLog(`Fetched ${response.count || 0} face descriptors`);
        
        if (!response.data || !Array.isArray(response.data)) {
            debugLog('No face descriptors available or invalid response format');
            return [];
        }
        
        return response.data;
    } catch (error) {
        errorLog('Failed to fetch face descriptors', error);
        throw error;
    }
}

async function getUser(userId) {
    try {
        const endpoint = `${API_CONFIG.ENDPOINTS.USERS_GET}/${userId}`;
        const response = await apiGet(endpoint);
        return response.data;
    } catch (error) {
        errorLog(`Failed to fetch user ${userId}`, error);
        throw error;
    }
}

async function deleteUser(userId) {
    try {
        const endpoint = `${API_CONFIG.ENDPOINTS.USERS_DELETE}/${userId}`;
        const response = await apiDelete(endpoint);
        debugLog(`User ${userId} deleted successfully`);
        return response;
    } catch (error) {
        errorLog(`Failed to delete user ${userId}`, error);
        throw error;
    }
}

// ============================================
// ATTENDANCE API
// ============================================

async function submitAttendance(scanData) {
    try {
        const response = await apiPost(API_CONFIG.ENDPOINTS.ATTENDANCE_SCAN, scanData);
        debugLog('Attendance recorded successfully', response.data);
        return response;
    } catch (error) {
        errorLog('Failed to submit attendance', error);
        throw error;
    }
}

async function getTodayAttendance() {
    try {
        const response = await apiGet(API_CONFIG.ENDPOINTS.ATTENDANCE_TODAY);
        debugLog(`Fetched ${response.count} attendance logs for ${response.date}`);
        return response.data;
    } catch (error) {
        errorLog('Failed to fetch today\'s attendance', error);
        throw error;
    }
}

async function getAttendanceRecords(startDate, endDate) {
    try {
        const endpoint = `${API_CONFIG.ENDPOINTS.ATTENDANCE_RECORDS}?start_date=${startDate}&end_date=${endDate}`;
        const response = await apiGet(endpoint);
        debugLog(`Fetched ${response.count} attendance records`);
        return response.data;
    } catch (error) {
        errorLog('Failed to fetch attendance records', error);
        throw error;
    }
}

async function getUserAttendance(userId) {
    try {
        const endpoint = `${API_CONFIG.ENDPOINTS.ATTENDANCE_USER}/${userId}`;
        const response = await apiGet(endpoint);
        debugLog(`Fetched ${response.count} logs for user ${userId}`);
        return response.data;
    } catch (error) {
        errorLog(`Failed to fetch attendance for user ${userId}`, error);
        throw error;
    }
}

async function getUserStatus(userId) {
    try {
        const endpoint = `${API_CONFIG.ENDPOINTS.ATTENDANCE_STATUS}/${userId}`;
        const response = await apiGet(endpoint);
        return response;
    } catch (error) {
        errorLog(`Failed to fetch status for user ${userId}`, error);
        throw error;
    }
}

// ============================================
// SYSTEM API
// ============================================

async function checkHealth() {
    try {
        const response = await apiGet(API_CONFIG.ENDPOINTS.HEALTH);
        debugLog('System health check', response);
        return response;
    } catch (error) {
        errorLog('Health check failed', error);
        throw error;
    }
}

async function getApiInfo() {
    try {
        const response = await apiGet(API_CONFIG.ENDPOINTS.INFO);
        return response;
    } catch (error) {
        errorLog('Failed to fetch API info', error);
        throw error;
    }
}

// ============================================
// HUB SETTINGS API
// ============================================

async function getHubLocation() {
    try {
        const endpoint = API_CONFIG.ENDPOINTS.SETTINGS_HUB_LOCATION || '/api/settings/hub-location';
        const response = await apiGet(endpoint);
        debugLog('Hub location fetched:', response.data);
        return response.data;
    } catch (error) {
        errorLog('Failed to fetch hub location', error);
        throw error;
    }
}

async function updateHubLocation(settings) {
    try {
        const endpoint = API_CONFIG.ENDPOINTS.SETTINGS_HUB_LOCATION || '/api/settings/hub-location';
        const response = await apiPut(endpoint, settings);
        debugLog('Hub location updated:', response.data);
        return response.data;
    } catch (error) {
        errorLog('Failed to update hub location', error);
        throw error;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function testConnection() {
    try {
        await checkHealth();
        return true;
    } catch (error) {
        return false;
    }
}

function getErrorMessage(error) {
    if (!error) return 'Unknown error occurred';
    
    const message = error.message || error.toString();
    
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return 'Cannot connect to server. Please check your internet connection.';
    }
    
    if (message.includes('timeout')) {
        return 'Request timeout. Server is taking too long to respond.';
    }
    
    if (message.includes('already exists')) {
        return 'This employee ID is already registered.';
    }
    
    if (message.includes('not found')) {
        return 'Record not found.';
    }
    
    if (message.includes('Already completed')) {
        return 'You have already completed attendance for today.';
    }
    
    if (message.includes('Origin not allowed')) {
        return 'Access denied. Invalid origin.';
    }
    
    return message;
}

async function retryApiCall(apiFunction, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiFunction();
        } catch (error) {
            lastError = error;
            
            if (i < maxRetries - 1) {
                debugLog(`Retry attempt ${i + 1}/${maxRetries} after ${delayMs}ms`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 2;
            }
        }
    }
    
    throw lastError;
}

// ============================================
// SINGLE EXPORT BLOCK (NO DUPLICATES)
// ============================================

export {
    // User management
    registerUser,
    getAllUsers,
    getUserDescriptors,
    getUser,
    deleteUser,
    
    // Attendance
    submitAttendance,
    getTodayAttendance,
    getAttendanceRecords,
    getUserAttendance,
    getUserStatus,
    
    // System
    checkHealth,
    getApiInfo,
    
    // Hub settings
    getHubLocation,
    updateHubLocation,
    
    // Utilities
    testConnection,
    getErrorMessage,
    retryApiCall
};