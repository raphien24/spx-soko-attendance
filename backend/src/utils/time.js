/**
 * Time & Timestamp Utility Functions
 * Server-side time generation for attendance system
 * CRITICAL: Always use these functions to ensure timestamp integrity
 */

/**
 * Get current timestamp in ISO 8601 format
 * This is the PRIMARY function for generating timestamps
 * 
 * @returns {string} ISO 8601 timestamp (e.g., '2026-09-19T10:30:45.123Z')
 */
function getCurrentISOTimestamp() {
    return new Date().toISOString();
}

/**
 * Get current date in YYYY-MM-DD format
 * Useful for date-based queries
 * 
 * @returns {string} Date string (e.g., '2026-09-19')
 */
function getTodayDateString() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:MM:SS format
 * 
 * @returns {string} Time string (e.g., '10:30:45')
 */
function getCurrentTimeString() {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Check if a given ISO timestamp is today
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {boolean} True if timestamp is today
 */
function isToday(isoTimestamp) {
    const today = getTodayDateString();
    const timestampDate = isoTimestamp.split('T')[0];
    
    return today === timestampDate;
}

/**
 * Check if a given ISO timestamp is in the past
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {boolean} True if timestamp is in the past
 */
function isPast(isoTimestamp) {
    const timestampMs = new Date(isoTimestamp).getTime();
    const nowMs = Date.now();
    
    return timestampMs < nowMs;
}

/**
 * Check if a given ISO timestamp is in the future
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {boolean} True if timestamp is in the future
 */
function isFuture(isoTimestamp) {
    const timestampMs = new Date(isoTimestamp).getTime();
    const nowMs = Date.now();
    
    return timestampMs > nowMs;
}

/**
 * Extract date from ISO timestamp (YYYY-MM-DD)
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Date string
 */
function extractDate(isoTimestamp) {
    return isoTimestamp.split('T')[0];
}

/**
 * Extract time from ISO timestamp (HH:MM:SS)
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Time string
 */
function extractTime(isoTimestamp) {
    const timePart = isoTimestamp.split('T')[1];
    return timePart ? timePart.split('.')[0] : '';
}

/**
 * Format ISO timestamp to readable format
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @param {string} format - Format type: 'full', 'date', 'time', 'datetime'
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(isoTimestamp, format = 'full') {
    const date = new Date(isoTimestamp);
    
    switch (format) {
        case 'date':
            // YYYY-MM-DD
            return date.toISOString().split('T')[0];
        
        case 'time':
            // HH:MM:SS
            return date.toISOString().split('T')[1].split('.')[0];
        
        case 'datetime':
            // YYYY-MM-DD HH:MM:SS
            const datePart = date.toISOString().split('T')[0];
            const timePart = date.toISOString().split('T')[1].split('.')[0];
            return `${datePart} ${timePart}`;
        
        case 'full':
        default:
            // Full ISO 8601
            return date.toISOString();
    }
}

/**
 * Convert ISO timestamp to Jakarta time (WIB - UTC+7)
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {Object} { date: string, time: string, full: string }
 */
function toJakartaTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    
    // Add 7 hours for WIB (Jakarta timezone)
    const jakartaDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    
    const year = jakartaDate.getUTCFullYear();
    const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
    const hours = String(jakartaDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jakartaDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jakartaDate.getUTCSeconds()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}:${seconds}`,
        full: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    };
}

/**
 * Get start of day timestamp (00:00:00)
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {string} ISO timestamp at start of day
 */
function getStartOfDay(dateString = null) {
    const date = dateString ? dateString : getTodayDateString();
    return `${date}T00:00:00.000Z`;
}

/**
 * Get end of day timestamp (23:59:59)
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format (optional, defaults to today)
 * @returns {string} ISO timestamp at end of day
 */
function getEndOfDay(dateString = null) {
    const date = dateString ? dateString : getTodayDateString();
    return `${date}T23:59:59.999Z`;
}

/**
 * Calculate difference between two timestamps in seconds
 * 
 * @param {string} timestamp1 - ISO 8601 timestamp
 * @param {string} timestamp2 - ISO 8601 timestamp
 * @returns {number} Difference in seconds
 */
function getTimeDifferenceInSeconds(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    
    return Math.abs(Math.floor((date2 - date1) / 1000));
}

/**
 * Calculate difference between two timestamps in minutes
 * 
 * @param {string} timestamp1 - ISO 8601 timestamp
 * @param {string} timestamp2 - ISO 8601 timestamp
 * @returns {number} Difference in minutes
 */
function getTimeDifferenceInMinutes(timestamp1, timestamp2) {
    const seconds = getTimeDifferenceInSeconds(timestamp1, timestamp2);
    return Math.floor(seconds / 60);
}

/**
 * Calculate difference between two timestamps in hours
 * 
 * @param {string} timestamp1 - ISO 8601 timestamp
 * @param {string} timestamp2 - ISO 8601 timestamp
 * @returns {number} Difference in hours
 */
function getTimeDifferenceInHours(timestamp1, timestamp2) {
    const minutes = getTimeDifferenceInMinutes(timestamp1, timestamp2);
    return Math.floor(minutes / 60);
}

/**
 * Validate if string is valid ISO 8601 timestamp
 * 
 * @param {string} timestamp - Timestamp string to validate
 * @returns {boolean} True if valid ISO 8601 format
 */
function isValidISOTimestamp(timestamp) {
    if (!timestamp || typeof timestamp !== 'string') {
        return false;
    }
    
    const date = new Date(timestamp);
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get current Unix timestamp (seconds since epoch)
 * 
 * @returns {number} Unix timestamp
 */
function getUnixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Convert Unix timestamp to ISO 8601
 * 
 * @param {number} unixTimestamp - Unix timestamp in seconds
 * @returns {string} ISO 8601 timestamp
 */
function unixToISO(unixTimestamp) {
    return new Date(unixTimestamp * 1000).toISOString();
}

/**
 * Convert ISO timestamp to Unix timestamp
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {number} Unix timestamp in seconds
 */
function isoToUnix(isoTimestamp) {
    return Math.floor(new Date(isoTimestamp).getTime() / 1000);
}

/**
 * Add hours to a timestamp
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @param {number} hours - Number of hours to add (can be negative)
 * @returns {string} New ISO 8601 timestamp
 */
function addHours(isoTimestamp, hours) {
    const date = new Date(isoTimestamp);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
}

/**
 * Add days to a timestamp
 * 
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} New ISO 8601 timestamp
 */
function addDays(isoTimestamp, days) {
    const date = new Date(isoTimestamp);
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

/**
 * Get timestamp for X days ago
 * 
 * @param {number} days - Number of days ago
 * @returns {string} ISO 8601 timestamp
 */
function getDaysAgo(days) {
    const now = new Date();
    now.setDate(now.getDate() - days);
    return now.toISOString();
}

/**
 * Get date string for X days ago
 * 
 * @param {number} days - Number of days ago
 * @returns {string} Date string (YYYY-MM-DD)
 */
function getDateDaysAgo(days) {
    const timestamp = getDaysAgo(days);
    return extractDate(timestamp);
}

// Export all functions
export {
    // Primary timestamp functions
    getCurrentISOTimestamp,
    getTodayDateString,
    getCurrentTimeString,
    
    // Date checking
    isToday,
    isPast,
    isFuture,
    
    // Extraction
    extractDate,
    extractTime,
    
    // Formatting
    formatTimestamp,
    toJakartaTime,
    
    // Day boundaries
    getStartOfDay,
    getEndOfDay,
    
    // Time differences
    getTimeDifferenceInSeconds,
    getTimeDifferenceInMinutes,
    getTimeDifferenceInHours,
    
    // Validation
    isValidISOTimestamp,
    
    // Unix timestamp
    getUnixTimestamp,
    unixToISO,
    isoToUnix,
    
    // Time manipulation
    addHours,
    addDays,
    getDaysAgo,
    getDateDaysAgo
};
