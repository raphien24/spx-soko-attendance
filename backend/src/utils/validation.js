/**
 * Input Validation Utilities
 * Validates request payloads and data integrity
 */

/**
 * Validate employee ID format
 * Expected format: 4-9 digit number (e.g., 1234, 12345, 123456789)
 * 
 * @param {string} employeeId - Employee ID to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateEmployeeId(employeeId) {
    if (!employeeId) {
        return {
            valid: false,
            error: 'Employee ID is required'
        };
    }
    
    if (typeof employeeId !== 'string') {
        return {
            valid: false,
            error: 'Employee ID must be a string'
        };
    }
    
    // Regex for 4-9 digit numbers only
    const regex = /^\d{4,9}$/;
    
    if (!regex.test(employeeId)) {
        return {
            valid: false,
            error: 'Employee ID must be 4-9 digits (numbers only)'
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate face descriptor array
 * Expected: Array of 128 floating-point numbers
 * 
 * @param {Array|string} descriptor - Face descriptor (array or JSON string)
 * @returns {Object} { valid: boolean, error: string|null, normalized: Array|null }
 */
function validateFaceDescriptor(descriptor) {
    try {
        let descriptorArray;
        
        // If descriptor is a string, parse it
        if (typeof descriptor === 'string') {
            try {
                descriptorArray = JSON.parse(descriptor);
            } catch (error) {
                return {
                    valid: false,
                    error: 'Face descriptor must be a valid JSON array',
                    normalized: null
                };
            }
        } else if (Array.isArray(descriptor)) {
            descriptorArray = descriptor;
        } else {
            return {
                valid: false,
                error: 'Face descriptor must be an array or JSON string',
                normalized: null
            };
        }
        
        // Check if it's an array
        if (!Array.isArray(descriptorArray)) {
            return {
                valid: false,
                error: 'Face descriptor must be an array',
                normalized: null
            };
        }
        
        // Check length (face-api.js uses 128-dimensional descriptors)
        if (descriptorArray.length !== 128) {
            return {
                valid: false,
                error: `Face descriptor must have exactly 128 dimensions (got ${descriptorArray.length})`,
                normalized: null
            };
        }
        
        // Check if all elements are numbers
        const allNumbers = descriptorArray.every(item => typeof item === 'number' && !isNaN(item));
        
        if (!allNumbers) {
            return {
                valid: false,
                error: 'All face descriptor elements must be valid numbers',
                normalized: null
            };
        }
        
        return {
            valid: true,
            error: null,
            normalized: descriptorArray
        };
    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`,
            normalized: null
        };
    }
}

/**
 * Validate UUID format
 * 
 * @param {string} uuid - UUID string to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateUUID(uuid) {
    if (!uuid) {
        return {
            valid: false,
            error: 'UUID is required'
        };
    }
    
    if (typeof uuid !== 'string') {
        return {
            valid: false,
            error: 'UUID must be a string'
        };
    }
    
    // UUID v4 regex
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!regex.test(uuid)) {
        return {
            valid: false,
            error: 'Invalid UUID format'
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate name field
 * 
 * @param {string} name - Name to validate
 * @param {number} minLength - Minimum length (default: 2)
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateName(name, minLength = 2, maxLength = 100) {
    if (!name) {
        return {
            valid: false,
            error: 'Name is required'
        };
    }
    
    if (typeof name !== 'string') {
        return {
            valid: false,
            error: 'Name must be a string'
        };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < minLength) {
        return {
            valid: false,
            error: `Name must be at least ${minLength} characters long`
        };
    }
    
    if (trimmedName.length > maxLength) {
        return {
            valid: false,
            error: `Name must not exceed ${maxLength} characters`
        };
    }
    
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const regex = /^[a-zA-Z\s\-'\.]+$/;
    
    if (!regex.test(trimmedName)) {
        return {
            valid: false,
            error: 'Name can only contain letters, spaces, hyphens, and apostrophes'
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate role field
 * 
 * @param {string} role - Role to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateRole(role) {
    const allowedRoles = [
        'Rider Dedicated',
        'Rider Plus', 
        'Rider Mitra',
        'Driver Dedicated',
        'Driver Mitra',
        'Operator',
        'Floor Controller'
    ];
    
    if (!role) {
        return {
            valid: false,
            error: 'Role is required'
        };
    }
    
    if (typeof role !== 'string') {
        return {
            valid: false,
            error: 'Role must be a string'
        };
    }
    
    if (!allowedRoles.includes(role)) {
        return {
            valid: false,
            error: `Role must be one of: ${allowedRoles.join(', ')}`
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate scan type (IN/OUT)
 * 
 * @param {string} scanType - Scan type to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateScanType(scanType) {
    const allowedTypes = ['IN', 'OUT'];
    
    if (!scanType) {
        return {
            valid: false,
            error: 'Scan type is required'
        };
    }
    
    if (typeof scanType !== 'string') {
        return {
            valid: false,
            error: 'Scan type must be a string'
        };
    }
    
    if (!allowedTypes.includes(scanType.toUpperCase())) {
        return {
            valid: false,
            error: `Scan type must be one of: ${allowedTypes.join(', ')}`
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate date string (YYYY-MM-DD format)
 * 
 * @param {string} dateString - Date string to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateDateString(dateString) {
    if (!dateString) {
        return {
            valid: false,
            error: 'Date is required'
        };
    }
    
    if (typeof dateString !== 'string') {
        return {
            valid: false,
            error: 'Date must be a string'
        };
    }
    
    // Check format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!regex.test(dateString)) {
        return {
            valid: false,
            error: 'Date must be in format YYYY-MM-DD'
        };
    }
    
    // Check if it's a valid date
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return {
            valid: false,
            error: 'Invalid date'
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate date range
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateDateRange(startDate, endDate) {
    const startValidation = validateDateString(startDate);
    if (!startValidation.valid) {
        return {
            valid: false,
            error: `Start date: ${startValidation.error}`
        };
    }
    
    const endValidation = validateDateString(endDate);
    if (!endValidation.valid) {
        return {
            valid: false,
            error: `End date: ${endValidation.error}`
        };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
        return {
            valid: false,
            error: 'Start date must be before or equal to end date'
        };
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate URL format
 * 
 * @param {string} url - URL to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateUrl(url) {
    if (!url) {
        return {
            valid: false,
            error: 'URL is required'
        };
    }
    
    if (typeof url !== 'string') {
        return {
            valid: false,
            error: 'URL must be a string'
        };
    }
    
    try {
        new URL(url);
        return {
            valid: true,
            error: null
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid URL format'
        };
    }
}

/**
 * Validate user registration payload
 * 
 * @param {Object} payload - Registration data
 * @returns {Object} { valid: boolean, errors: Array, data: Object|null }
 */
function validateUserRegistration(payload) {
    const errors = [];
    
    if (!payload || typeof payload !== 'object') {
        return {
            valid: false,
            errors: ['Invalid payload format'],
            data: null
        };
    }
    
    // Validate employee_id
    const employeeIdValidation = validateEmployeeId(payload.employee_id);
    if (!employeeIdValidation.valid) {
        errors.push(employeeIdValidation.error);
    }
    
    // Validate name
    const nameValidation = validateName(payload.name);
    if (!nameValidation.valid) {
        errors.push(nameValidation.error);
    }
    
    // Validate role (optional)
    if (payload.role) {
        const roleValidation = validateRole(payload.role);
        if (!roleValidation.valid) {
            errors.push(roleValidation.error);
        }
    } else {
        // Role is required now
        errors.push('Role is required');
    }
    
    // Validate face_descriptor
    const descriptorValidation = validateFaceDescriptor(payload.face_descriptor);
    if (!descriptorValidation.valid) {
        errors.push(descriptorValidation.error);
    }
    
    // Validate photo_base64 (required)
    if (!payload.photo_base64) {
        errors.push('Photo data is required');
    } else if (typeof payload.photo_base64 !== 'string') {
        errors.push('Photo data must be a base64 string');
    }
    
    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors,
            data: null
        };
    }
    
    return {
        valid: true,
        errors: [],
        data: {
            employee_id: payload.employee_id,
            name: payload.name.trim(),
            role: payload.role, // Keep role as-is (no toLowerCase)
            face_descriptor: descriptorValidation.normalized,
            photo_base64: payload.photo_base64
        }
    };
}

/**
 * Validate attendance scan payload
 * 
 * @param {Object} payload - Scan data
 * @returns {Object} { valid: boolean, errors: Array, data: Object|null }
 */
function validateAttendanceScan(payload) {
    const errors = [];
    
    if (!payload || typeof payload !== 'object') {
        return {
            valid: false,
            errors: ['Invalid payload format'],
            data: null
        };
    }
    
    // Validate user_id
    const uuidValidation = validateUUID(payload.user_id);
    if (!uuidValidation.valid) {
        errors.push(uuidValidation.error);
    }
    
    // Validate capture_base64 (required)
    if (!payload.capture_base64) {
        errors.push('Capture photo data is required');
    } else if (typeof payload.capture_base64 !== 'string') {
        errors.push('Capture photo data must be a base64 string');
    }
    
    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors,
            data: null
        };
    }
    
    return {
        valid: true,
        errors: [],
        data: {
            user_id: payload.user_id,
            capture_base64: payload.capture_base64
        }
    };
}

/**
 * Sanitize string input (remove dangerous characters)
 * 
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
    if (typeof input !== 'string') {
        return '';
    }
    
    // Remove null bytes and trim
    return input.replace(/\0/g, '').trim();
}

/**
 * Check if payload is empty
 * 
 * @param {Object} payload - Payload to check
 * @returns {boolean} True if empty
 */
function isEmptyPayload(payload) {
    if (!payload) return true;
    if (typeof payload !== 'object') return true;
    if (Array.isArray(payload)) return payload.length === 0;
    return Object.keys(payload).length === 0;
}

// Export all validation functions
export {
    // Individual field validators
    validateEmployeeId,
    validateFaceDescriptor,
    validateUUID,
    validateName,
    validateRole,
    validateScanType,
    validateDateString,
    validateDateRange,
    validateUrl,
    
    // Composite validators
    validateUserRegistration,
    validateAttendanceScan,
    
    // Utilities
    sanitizeString,
    isEmptyPayload
};
