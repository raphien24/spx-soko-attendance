/**
 * User Management Handlers
 * Handles user registration, listing, and deletion
 */

import {
    insertUser,
    getUserById,
    getUserByEmployeeId,
    getAllUsers,
    getAllFaceDescriptors,
    deleteUser
} from '../db/queries.js';

import {
    uploadBase64Image,
    generateBackendImageUrl,
    validateImageData,
    deleteImage
} from '../storage/r2.js';

import {
    validateUserRegistration,
    validateUUID
} from '../utils/validation.js';

import {
    getCurrentISOTimestamp
} from '../utils/time.js';

import {
    corsResponse,
    corsErrorResponse
} from '../utils/cors.js';

/**
 * POST /api/users/register
 * Register a new employee with face biometric data
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings (DB, ATTENDANCE_BUCKET)
 * @returns {Response} JSON response
 */
async function registerUser(request, env) {
    try {
        // Parse request body
        let payload;
        try {
            payload = await request.json();
        } catch (error) {
            return corsErrorResponse(request, 'Invalid JSON payload', 400);
        }
        
        // Validate payload
        const validation = validateUserRegistration(payload);
        if (!validation.valid) {
            return corsErrorResponse(
                request,
                validation.errors.join(', '),
                400
            );
        }
        
        const { employee_id, name, role, face_descriptor, photo_base64 } = validation.data;
        
        // Check if employee_id already exists
        const existingUser = await getUserByEmployeeId(env.DB, employee_id);
        if (existingUser) {
            return corsErrorResponse(
                request,
                `Employee ID ${employee_id} already exists`,
                409
            );
        }
        
        // Validate image data
        const imageValidation = validateImageData(photo_base64);
        if (!imageValidation.valid) {
            return corsErrorResponse(request, imageValidation.error, 400);
        }
        
        // Generate UUID for user
        const userId = crypto.randomUUID();
        
        // Upload photo to R2
        const r2Key = `enrollments/${userId}.jpg`;
        try {
            await uploadBase64Image(
                env.ATTENDANCE_BUCKET,
                r2Key,
                photo_base64,
                {
                    'user-id': userId,
                    'employee-id': employee_id,
                    'type': 'enrollment'
                }
            );
        } catch (error) {
            return corsErrorResponse(
                request,
                `Failed to upload photo: ${error.message}`,
                500
            );
        }
        
        // Generate backend API URL for photo
        const photoUrl = generateBackendImageUrl(r2Key);
        
        // Prepare user data
        const userData = {
            id: userId,
            employee_id: employee_id,
            name: name,
            role: role,
            face_descriptor: JSON.stringify(face_descriptor),
            photo_url: photoUrl,
            created_at: getCurrentISOTimestamp()
        };
        
        // Insert into database
        try {
            await insertUser(env.DB, userData);
        } catch (error) {
            // Rollback: delete uploaded photo
            await deleteImage(env.ATTENDANCE_BUCKET, r2Key);
            
            return corsErrorResponse(
                request,
                `Failed to save user data: ${error.message}`,
                500
            );
        }
        
        // Return success response
        return corsResponse(request, {
            success: true,
            message: 'User registered successfully',
            data: {
                id: userId,
                employee_id: employee_id,
                name: name,
                role: role,
                photo_url: photoUrl,
                created_at: userData.created_at
            }
        }, 201);
        
    } catch (error) {
        console.error('Error in registerUser:', error);
        return corsErrorResponse(
            request,
            'Internal server error',
            500
        );
    }
}

/**
 * GET /api/users
 * Get all registered users (without face descriptors for performance)
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function getUsers(request, env) {
    try {
        // Fetch all users from database
        const users = await getAllUsers(env.DB);
        
        // Handle empty database
        if (!users || users.length === 0) {
            return corsResponse(request, {
                success: true,
                count: 0,
                data: [],
                message: 'No users registered yet'
            }, 200);
        }
        
        return corsResponse(request, {
            success: true,
            count: users.length,
            data: users
        }, 200);
        
    } catch (error) {
        console.error('Error in getUsers:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch users',
            500
        );
    }
}

/**
 * GET /api/users/descriptors
 * Get all face descriptors for face matching in frontend
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} JSON response
 */
async function getUserDescriptors(request, env) {
    try {
        // Fetch all face descriptors
        const descriptors = await getAllFaceDescriptors(env.DB);
        
        // Handle empty database (no users registered yet)
        if (!descriptors || descriptors.length === 0) {
            return corsResponse(request, {
                success: true,
                count: 0,
                data: [],
                message: 'No users registered yet'
            }, 200);
        }
        
        // Parse face_descriptor JSON strings back to arrays
        // Filter out any invalid/null descriptors
        const parsedDescriptors = descriptors
            .filter(user => user && user.face_descriptor) // Skip null entries
            .map(user => {
                try {
                    // Safely parse JSON
                    const faceDescriptor = typeof user.face_descriptor === 'string'
                        ? JSON.parse(user.face_descriptor)
                        : user.face_descriptor;
                    
                    return {
                        id: user.id,
                        employee_id: user.employee_id,
                        name: user.name,
                        role: user.role,
                        face_descriptor: faceDescriptor
                    };
                } catch (parseError) {
                    // Log error but don't crash
                    console.error(`Failed to parse face descriptor for user ${user.id}:`, parseError);
                    return null; // Will be filtered out
                }
            })
            .filter(user => user !== null); // Remove failed parses
        
        return corsResponse(request, {
            success: true,
            count: parsedDescriptors.length,
            data: parsedDescriptors
        }, 200);
        
    } catch (error) {
        console.error('Error in getUserDescriptors:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch face descriptors',
            500
        );
    }
}

/**
 * DELETE /api/users/:id
 * Delete a user by ID
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @param {string} userId - User UUID from URL params
 * @returns {Response} JSON response
 */
async function removeUser(request, env, userId) {
    try {
        // Validate UUID
        const uuidValidation = validateUUID(userId);
        if (!uuidValidation.valid) {
            return corsErrorResponse(request, uuidValidation.error, 400);
        }
        
        // Check if user exists
        const user = await getUserById(env.DB, userId);
        if (!user) {
            return corsErrorResponse(
                request,
                'User not found',
                404
            );
        }
        
        // Delete user from database (will cascade delete attendance logs)
        try {
            await deleteUser(env.DB, userId);
        } catch (error) {
            return corsErrorResponse(
                request,
                `Failed to delete user: ${error.message}`,
                500
            );
        }
        
        // Try to delete enrollment photo from R2 (best effort)
        const r2Key = `enrollments/${userId}.jpg`;
        await deleteImage(env.ATTENDANCE_BUCKET, r2Key);
        
        return corsResponse(request, {
            success: true,
            message: `User ${user.name} (${user.employee_id}) deleted successfully`
        }, 200);
        
    } catch (error) {
        console.error('Error in removeUser:', error);
        return corsErrorResponse(
            request,
            'Internal server error',
            500
        );
    }
}

/**
 * GET /api/users/:id
 * Get single user by ID
 * 
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment bindings
 * @param {string} userId - User UUID from URL params
 * @returns {Response} JSON response
 */
async function getUser(request, env, userId) {
    try {
        // Validate UUID
        const uuidValidation = validateUUID(userId);
        if (!uuidValidation.valid) {
            return corsErrorResponse(request, uuidValidation.error, 400);
        }
        
        // Fetch user
        const user = await getUserById(env.DB, userId);
        if (!user) {
            return corsErrorResponse(request, 'User not found', 404);
        }
        
        // Don't return face_descriptor in single user response
        const { face_descriptor, ...userWithoutDescriptor } = user;
        
        return corsResponse(request, {
            success: true,
            data: userWithoutDescriptor
        }, 200);
        
    } catch (error) {
        console.error('Error in getUser:', error);
        return corsErrorResponse(
            request,
            'Failed to fetch user',
            500
        );
    }
}

// Export handler functions
export {
    registerUser,
    getUsers,
    getUserDescriptors,
    removeUser,
    getUser
};
