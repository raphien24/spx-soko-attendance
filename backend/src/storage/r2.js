/**
 * R2 Storage Helper Functions
 * Handles image upload and retrieval from Cloudflare R2
 */

/**
 * Convert base64 string to ArrayBuffer
 * Accepts format: 'data:image/jpeg;base64,/9j/4AAQ...'
 * 
 * @param {string} base64String - Base64 encoded image with data URI prefix
 * @returns {Object} { buffer: ArrayBuffer, mimeType: string }
 * @throws {Error} If base64 string format is invalid
 */
function base64ToBuffer(base64String) {
    // Match data URI format: data:image/jpeg;base64,<data>
    const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string format. Expected: data:image/[type];base64,[data]');
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(mimeType)) {
        throw new Error(`Unsupported image type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`);
    }
    
    // Decode base64 to binary string
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    return {
        buffer: bytes.buffer,
        mimeType: mimeType
    };
}

/**
 * Upload image buffer to R2 bucket
 * 
 * @param {R2Bucket} bucket - R2 bucket binding from env
 * @param {string} key - Path in R2 (e.g., 'enrollments/uuid.jpg')
 * @param {ArrayBuffer} imageBuffer - Binary image data
 * @param {string} contentType - MIME type (e.g., 'image/jpeg')
 * @param {Object} metadata - Optional custom metadata
 * @returns {Promise<Object>} { success: boolean, key: string }
 * @throws {Error} If upload fails
 */
async function uploadImage(bucket, key, imageBuffer, contentType, metadata = {}) {
    try {
        // Validate image size (max 2MB = 2097152 bytes)
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
        if (imageBuffer.byteLength > MAX_SIZE) {
            throw new Error(`Image size (${imageBuffer.byteLength} bytes) exceeds maximum allowed size (${MAX_SIZE} bytes)`);
        }
        
        // Prepare upload options
        const uploadOptions = {
            httpMetadata: {
                contentType: contentType
            },
            customMetadata: {
                'uploaded-at': new Date().toISOString(),
                ...metadata
            }
        };
        
        // Upload to R2
        await bucket.put(key, imageBuffer, uploadOptions);
        
        return {
            success: true,
            key: key
        };
    } catch (error) {
        throw new Error(`Failed to upload image to R2: ${error.message}`);
    }
}

/**
 * Generate backend API URL for R2 object
 * Uses backend as proxy to serve images from R2
 * 
 * @param {string} key - Object key in R2 (e.g., "enrollments/uuid.jpg")
 * @returns {string} Backend API URL (e.g., "/api/images/enrollments/uuid.jpg")
 */
function generateBackendImageUrl(key) {
    // Remove leading slash from key if present
    const objectKey = key.replace(/^\//, '');
    
    return `/api/images/${objectKey}`;
}

/**
 * Generate public URL for R2 object
 * Note: This requires R2 bucket to have public access configured or use custom domain
 * 
 * @param {string} bucketPublicUrl - Base public URL for the bucket
 * @param {string} key - Object key in R2
 * @returns {string} Full public URL
 */
function generatePublicUrl(bucketPublicUrl, key) {
    // Remove trailing slash from bucket URL if present
    const baseUrl = bucketPublicUrl.replace(/\/$/, '');
    
    // Remove leading slash from key if present
    const objectKey = key.replace(/^\//, '');
    
    return `${baseUrl}/${objectKey}`;
}

/**
 * Upload base64 image directly to R2
 * Convenience function that combines base64ToBuffer and uploadImage
 * 
 * @param {R2Bucket} bucket - R2 bucket binding
 * @param {string} key - Path in R2
 * @param {string} base64String - Base64 encoded image
 * @param {Object} metadata - Optional custom metadata
 * @returns {Promise<Object>} { success: boolean, key: string, mimeType: string }
 */
async function uploadBase64Image(bucket, key, base64String, metadata = {}) {
    try {
        // Convert base64 to buffer
        const { buffer, mimeType } = base64ToBuffer(base64String);
        
        // Upload to R2
        const result = await uploadImage(bucket, key, buffer, mimeType, metadata);
        
        return {
            ...result,
            mimeType: mimeType
        };
    } catch (error) {
        throw new Error(`Failed to upload base64 image: ${error.message}`);
    }
}

/**
 * Get image from R2 bucket
 * 
 * @param {R2Bucket} bucket - R2 bucket binding
 * @param {string} key - Object key in R2
 * @returns {Promise<Object|null>} R2Object or null if not found
 */
async function getImage(bucket, key) {
    try {
        const object = await bucket.get(key);
        return object;
    } catch (error) {
        console.error(`Failed to get image from R2: ${error.message}`);
        return null;
    }
}

/**
 * Delete image from R2 bucket
 * 
 * @param {R2Bucket} bucket - R2 bucket binding
 * @param {string} key - Object key in R2
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteImage(bucket, key) {
    try {
        await bucket.delete(key);
        return true;
    } catch (error) {
        console.error(`Failed to delete image from R2: ${error.message}`);
        return false;
    }
}

/**
 * List images in R2 bucket with prefix
 * 
 * @param {R2Bucket} bucket - R2 bucket binding
 * @param {string} prefix - Prefix to filter (e.g., 'enrollments/')
 * @param {number} limit - Maximum number of objects to return
 * @returns {Promise<Array>} Array of object keys
 */
async function listImages(bucket, prefix = '', limit = 1000) {
    try {
        const listed = await bucket.list({
            prefix: prefix,
            limit: limit
        });
        
        return listed.objects.map(obj => obj.key);
    } catch (error) {
        console.error(`Failed to list images from R2: ${error.message}`);
        return [];
    }
}

/**
 * Validate image data before upload
 * 
 * @param {string} base64String - Base64 encoded image
 * @returns {Object} { valid: boolean, error: string|null, size: number|null }
 */
function validateImageData(base64String) {
    try {
        // Check if string is provided
        if (!base64String || typeof base64String !== 'string') {
            return {
                valid: false,
                error: 'Image data is required and must be a string',
                size: null
            };
        }
        
        // Check format
        const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            return {
                valid: false,
                error: 'Invalid base64 format. Expected: data:image/[type];base64,[data]',
                size: null
            };
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Validate MIME type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(mimeType)) {
            return {
                valid: false,
                error: `Unsupported image type: ${mimeType}. Allowed: jpeg, jpg, png`,
                size: null
            };
        }
        
        // Calculate approximate size (base64 is ~33% larger than binary)
        const estimatedSize = (base64Data.length * 3) / 4;
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
        
        if (estimatedSize > MAX_SIZE) {
            return {
                valid: false,
                error: `Image size (~${Math.round(estimatedSize / 1024)} KB) exceeds maximum allowed (2 MB)`,
                size: estimatedSize
            };
        }
        
        return {
            valid: true,
            error: null,
            size: estimatedSize
        };
    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`,
            size: null
        };
    }
}

// Export all functions
export {
    base64ToBuffer,
    uploadImage,
    generateBackendImageUrl,
    generatePublicUrl,
    uploadBase64Image,
    getImage,
    deleteImage,
    listImages,
    validateImageData
};
