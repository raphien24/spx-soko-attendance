/**
 * Face-API.js Setup and Helper Functions
 * Handles model loading and face detection operations
 */

import { 
    FACE_CONFIG, 
    CAMERA_CONFIG,
    VALIDATION_CONFIG,
    debugLog, 
    errorLog 
} from './config.js';

// Global state for models
let modelsLoaded = false;
let modelLoadPromise = null;

/**
 * Load face-api.js models
 * Loads all required models for face detection and recognition
 * @returns {Promise<boolean>} True if models loaded successfully
 */
async function loadFaceModels() {
    // If already loaded, return immediately
    if (modelsLoaded) {
        debugLog('Face models already loaded');
        return true;
    }
    
    // If loading is in progress, return the existing promise
    if (modelLoadPromise) {
        debugLog('Face models loading in progress...');
        return modelLoadPromise;
    }
    
    // Start loading
    modelLoadPromise = (async () => {
        try {
            debugLog('Loading face-api.js models...');
            const modelPath = FACE_CONFIG.MODEL_PATH;
            
            // Load all required models in parallel
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
            ]);
            
            modelsLoaded = true;
            debugLog('Face models loaded successfully');
            return true;
            
        } catch (error) {
            errorLog('Failed to load face models', error);
            modelLoadPromise = null; // Reset so it can be retried
            throw new Error('Failed to load face recognition models. Please refresh the page.');
        }
    })();
    
    return modelLoadPromise;
}

/**
 * Check if models are loaded
 * @returns {boolean} True if models are loaded
 */
function areModelsLoaded() {
    return modelsLoaded;
}

/**
 * Get face detection options
 * @returns {Object} TinyFaceDetector options
 */
function getDetectionOptions() {
    return new faceapi.TinyFaceDetectorOptions({
        inputSize: FACE_CONFIG.DETECTION_OPTIONS.inputSize,
        scoreThreshold: FACE_CONFIG.DETECTION_OPTIONS.scoreThreshold
    });
}

/**
 * Detect single face in video element
 * Returns null if no face or multiple faces detected
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<Object|null>} Face detection or null
 */
async function detectSingleFace(videoElement) {
    if (!modelsLoaded) {
        throw new Error('Models not loaded. Call loadFaceModels() first.');
    }
    
    try {
        // Detect all faces in the video
        const detections = await faceapi
            .detectAllFaces(videoElement, getDetectionOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        // Return null if not exactly one face
        if (detections.length !== 1) {
            return null;
        }
        
        return detections[0];
        
    } catch (error) {
        errorLog('Face detection error', error);
        return null;
    }
}

/**
 * Get face descriptor from video element
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<Float32Array|null>} Face descriptor or null
 */
async function getFaceDescriptor(videoElement) {
    const detection = await detectSingleFace(videoElement);
    
    if (!detection) {
        return null;
    }
    
    return detection.descriptor;
}

/**
 * Detect all faces in video element
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<Array>} Array of face detections
 */
async function detectAllFaces(videoElement) {
    if (!modelsLoaded) {
        throw new Error('Models not loaded. Call loadFaceModels() first.');
    }
    
    try {
        const detections = await faceapi
            .detectAllFaces(videoElement, getDetectionOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        return detections;
        
    } catch (error) {
        errorLog('Face detection error', error);
        return [];
    }
}

/**
 * Draw face detection on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} detection - Face detection object
 * @param {string} label - Label to display (optional)
 */
function drawFaceDetection(canvas, detection, label = '') {
    if (!detection) return;
    
    const ctx = canvas.getContext('2d');
    const box = detection.detection.box;
    
    // Draw bounding box
    ctx.strokeStyle = FACE_CONFIG.CANVAS_OPTIONS.boxColor;
    ctx.lineWidth = FACE_CONFIG.CANVAS_OPTIONS.boxLineWidth;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Draw label if provided
    if (label) {
        ctx.fillStyle = FACE_CONFIG.CANVAS_OPTIONS.textColor;
        ctx.font = FACE_CONFIG.CANVAS_OPTIONS.textFont;
        
        const textMetrics = ctx.measureText(label);
        const textX = box.x;
        const textY = box.y - FACE_CONFIG.CANVAS_OPTIONS.textPadding;
        
        // Draw text background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            textX, 
            textY - 20, 
            textMetrics.width + 10, 
            25
        );
        
        // Draw text
        ctx.fillStyle = FACE_CONFIG.CANVAS_OPTIONS.textColor;
        ctx.fillText(label, textX + 5, textY - 3);
    }
}

/**
 * Clear canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Compare two face descriptors
 * @param {Float32Array} descriptor1 - First descriptor
 * @param {Float32Array} descriptor2 - Second descriptor
 * @returns {number} Euclidean distance (lower = more similar)
 */
function compareFaces(descriptor1, descriptor2) {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
}

/**
 * Find matching face from a list of known descriptors
 * @param {Float32Array} targetDescriptor - Descriptor to match
 * @param {Array} knownFaces - Array of {id, name, employee_id, face_descriptor}
 * @returns {Object|null} Matched face or null
 */
function findMatchingFace(targetDescriptor, knownFaces) {
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const knownFace of knownFaces) {
        // Convert array to Float32Array if needed
        const knownDescriptor = Array.isArray(knownFace.face_descriptor)
            ? new Float32Array(knownFace.face_descriptor)
            : knownFace.face_descriptor;
        
        const distance = compareFaces(targetDescriptor, knownDescriptor);
        
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = {
                ...knownFace,
                distance: distance
            };
        }
    }
    
    // Check if best match is within threshold
    if (bestMatch && bestDistance < FACE_CONFIG.MATCH_THRESHOLD) {
        debugLog(`Match found: ${bestMatch.name} (distance: ${bestDistance.toFixed(3)})`);
        return bestMatch;
    }
    
    debugLog(`No match found (best distance: ${bestDistance.toFixed(3)})`);
    return null;
}

/**
 * Capture photo from video element
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {string} Base64 encoded image (data URI)
 */
function capturePhotoFromVideo(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 with quality settings
    return canvas.toDataURL(
        CAMERA_CONFIG.imageFormat, 
        CAMERA_CONFIG.imageQuality
    );
}

/**
 * Validate face descriptor
 * @param {*} descriptor - Descriptor to validate
 * @returns {boolean} True if valid
 */
function isValidDescriptor(descriptor) {
    if (!descriptor) return false;
    
    const length = descriptor.length || 0;
    return length === VALIDATION_CONFIG.FACE_DESCRIPTOR_LENGTH;
}

/**
 * Convert descriptor to array
 * @param {Float32Array|Array} descriptor - Face descriptor
 * @returns {Array<number>} Array of numbers
 */
function descriptorToArray(descriptor) {
    return Array.from(descriptor);
}

/**
 * Initialize webcam
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<MediaStream>} Media stream
 */
async function initializeWebcam(videoElement) {
    try {
        debugLog('Initializing webcam...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: FACE_CONFIG.VIDEO_CONSTRAINTS,
            audio: false
        });
        
        videoElement.srcObject = stream;
        
        // Wait for video to be ready with timeout
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Video metadata load timeout'));
            }, 10000); // 10 second timeout
            
            videoElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                resolve();
            };
        });
        
        debugLog('Webcam initialized successfully');
        return stream;
        
    } catch (error) {
        errorLog('Failed to initialize webcam', error);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            throw new Error('Camera permission denied. Please allow camera access and refresh the page.');
        } else if (error.name === 'NotFoundError') {
            throw new Error('No camera found. Please connect a camera and refresh the page.');
        } else if (error.message === 'Video metadata load timeout') {
            throw new Error('Camera initialization timeout. Please check your camera and try again.');
        } else {
            throw new Error('Failed to access camera. Please check your camera settings.');
        }
    }
}

/**
 * Stop webcam stream
 * @param {MediaStream} stream - Media stream to stop
 */
function stopWebcam(stream) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        debugLog('Webcam stopped');
    }
}

/**
 * Resize canvas to match video dimensions
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {HTMLVideoElement} videoElement - Video element
 */
function resizeCanvas(canvas, videoElement) {
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
}

/**
 * Get face detection status message
 * @param {number} faceCount - Number of faces detected
 * @returns {string} Status message
 */
function getFaceStatusMessage(faceCount) {
    if (faceCount === 0) {
        return 'No face detected';
    } else if (faceCount === 1) {
        return 'Face detected';
    } else {
        return `Multiple faces detected (${faceCount}) - only one person allowed`;
    }
}

/**
 * Calculate confidence percentage from distance
 * @param {number} distance - Euclidean distance
 * @returns {number} Confidence percentage (0-100)
 */
function distanceToConfidence(distance) {
    // Convert distance to confidence (inverse relationship)
    // Distance 0 = 100% confidence
    // Distance 0.6 = 0% confidence
    const maxDistance = 0.6;
    const confidence = Math.max(0, Math.min(100, (1 - (distance / maxDistance)) * 100));
    return Math.round(confidence);
}

// Export all functions
export {
    // Model loading
    loadFaceModels,
    areModelsLoaded,
    
    // Face detection
    detectSingleFace,
    detectAllFaces,
    getFaceDescriptor,
    
    // Face matching
    compareFaces,
    findMatchingFace,
    
    // Drawing
    drawFaceDetection,
    clearCanvas,
    
    // Camera
    initializeWebcam,
    stopWebcam,
    capturePhotoFromVideo,
    resizeCanvas,
    
    // Validation
    isValidDescriptor,
    descriptorToArray,
    
    // Utilities
    getDetectionOptions,
    getFaceStatusMessage,
    distanceToConfidence
};
