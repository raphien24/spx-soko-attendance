/**
 * Enrollment Page Logic
 * Face registration for new employees
 */

import { 
    VALIDATION_CONFIG,
    debugLog, 
    errorLog 
} from './config.js';

import {
    registerUser,
    getErrorMessage
} from './api.js';

import {
    loadFaceModels,
    initializeWebcam,
    stopWebcam,
    detectSingleFace,
    descriptorToArray,
    capturePhotoFromVideo,
    drawFaceDetection,
    clearCanvas,
    resizeCanvas
} from './face-setup.js';

// DOM Elements
let form, videoElement, canvasOverlay, capturedPhotoCanvas, cameraPlaceholder;
let faceGuideEnroll, faceGuideTextEnroll, faceGuideOverlayEnroll;
let employeeIdInput, employeeNameInput, employeeRoleInput;
let captureBtn, retakeBtn, registerBtn;
let faceStatus, faceStatusContainer, faceStatusIcon, faceStatusText, faceStatusDetail;
let cameraStatusIndicator, cameraStatusText, faceCountElement;
let loadingOverlay, loadingMessage;
let successModal, successMessage;
let errorModal, errorModalMessage;

// State
let webcamStream = null;
let capturedDescriptor = null;
let capturedPhotoBase64 = null;
let detectionInterval = null;

/**
 * Initialize enrollment page
 */
async function init() {
    try {
        // Get DOM elements
        getDOMElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Show loading
        showLoading('Memuat model face recognition...');
        
        // Load face-api models
        await loadFaceModels();
        debugLog('Face models loaded');
        
        // Initialize webcam
        showLoading('Mengaktifkan kamera...');
        await startCamera();
        
        hideLoading();
        debugLog('Enrollment page initialized');
        
    } catch (error) {
        errorLog('Initialization failed', error);
        hideLoading();
        showErrorModal(error.message);
    }
}

/**
 * Get all DOM elements
 */
function getDOMElements() {
    form = document.getElementById('enrollment-form');
    videoElement = document.getElementById('video-preview');
    canvasOverlay = document.getElementById('canvas-overlay');
    capturedPhotoCanvas = document.getElementById('captured-photo');
    cameraPlaceholder = document.getElementById('camera-placeholder');
    
    // Face guide elements
    faceGuideEnroll = document.getElementById('face-guide-enroll');
    faceGuideTextEnroll = document.getElementById('face-guide-text-enroll');
    faceGuideOverlayEnroll = document.getElementById('face-guide-overlay-enroll');
    
    employeeIdInput = document.getElementById('employee-id');
    employeeNameInput = document.getElementById('employee-name');
    employeeRoleInput = document.getElementById('employee-role');
    
    captureBtn = document.getElementById('capture-btn');
    retakeBtn = document.getElementById('retake-btn');
    registerBtn = document.getElementById('register-btn');
    
    faceStatus = document.getElementById('face-status');
    faceStatusContainer = document.getElementById('face-status-container');
    faceStatusIcon = document.getElementById('face-status-icon');
    faceStatusText = document.getElementById('face-status-text');
    faceStatusDetail = document.getElementById('face-status-detail');
    
    cameraStatusIndicator = document.getElementById('camera-status-indicator');
    cameraStatusText = document.getElementById('camera-status-text');
    faceCountElement = document.getElementById('face-count');
    
    loadingOverlay = document.getElementById('loading-overlay');
    loadingMessage = document.getElementById('loading-message');
    
    successModal = document.getElementById('success-modal');
    successMessage = document.getElementById('success-message');
    
    errorModal = document.getElementById('error-modal');
    errorModalMessage = document.getElementById('error-modal-message');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    captureBtn.addEventListener('click', handleCapture);
    retakeBtn.addEventListener('click', handleRetake);
    
    // Real-time validation
    employeeIdInput.addEventListener('input', validateEmployeeId);
    employeeNameInput.addEventListener('input', validateName);
}

/**
 * Start camera
 */
async function startCamera() {
    try {
        webcamStream = await initializeWebcam(videoElement);
        
        // Setup canvas
        videoElement.addEventListener('loadedmetadata', () => {
            resizeCanvas(canvasOverlay, videoElement);
            resizeCanvas(capturedPhotoCanvas, videoElement);
        });
        
        // Hide placeholder, show video and face guide
        cameraPlaceholder.classList.add('hidden');
        videoElement.classList.remove('hidden');
        if (faceGuideOverlayEnroll) {
            faceGuideOverlayEnroll.classList.remove('hidden');
        }
        
        // Update status
        cameraStatusIndicator.classList.remove('bg-gray-400');
        cameraStatusIndicator.classList.add('bg-green-500', 'pulse');
        cameraStatusText.textContent = 'Kamera aktif';
        
        // Show face status
        faceStatus.classList.remove('hidden');
        
        // Start face detection
        startFaceDetection();
        
    } catch (error) {
        errorLog('Camera initialization failed', error);
        throw error;
    }
}

/**
 * Start face detection loop
 */
function startFaceDetection() {
    detectionInterval = setInterval(async () => {
        // Don't detect if photo already captured
        if (capturedDescriptor) return;
        
        try {
            const detection = await detectSingleFace(videoElement);
            
            // Clear canvas
            clearCanvas(canvasOverlay);
            
            if (detection) {
                // Draw bounding box
                drawFaceDetection(canvasOverlay, detection);
                
                // Update status
                updateFaceStatus('detected', 1);
                
                // Update face guide to green (detected)
                updateFaceGuideEnroll(true, 'Wajah terdeteksi - siap ambil foto');
                
                // Enable capture button
                captureBtn.disabled = false;
                
            } else {
                // No face or multiple faces
                updateFaceStatus('noFace', 0);
                
                // Update face guide to blue (no detection)
                updateFaceGuideEnroll(false, 'Posisikan wajah di dalam bingkai');
                
                captureBtn.disabled = true;
            }
            
        } catch (error) {
            errorLog('Face detection error', error);
        }
        
    }, 100); // Check every 100ms
}

/**
 * Stop face detection
 */
function stopFaceDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
}

/**
 * Update face status display
 */
function updateFaceStatus(status, count) {
    faceCountElement.textContent = `${count} wajah`;
    
    switch (status) {
        case 'detected':
            faceStatusContainer.classList.remove('bg-red-50', 'bg-yellow-50');
            faceStatusContainer.classList.add('bg-green-50');
            faceStatusIcon.textContent = '✓';
            faceStatusText.textContent = 'Wajah terdeteksi';
            faceStatusDetail.textContent = 'Siap untuk diambil';
            break;
            
        case 'noFace':
            faceStatusContainer.classList.remove('bg-green-50', 'bg-red-50');
            faceStatusContainer.classList.add('bg-yellow-50');
            faceStatusIcon.textContent = '👤';
            faceStatusText.textContent = 'Tidak ada wajah';
            faceStatusDetail.textContent = 'Hadapkan wajah ke kamera';
            break;
            
        case 'multipleFaces':
            faceStatusContainer.classList.remove('bg-green-50', 'bg-yellow-50');
            faceStatusContainer.classList.add('bg-red-50');
            faceStatusIcon.textContent = '⚠️';
            faceStatusText.textContent = 'Terlalu banyak wajah';
            faceStatusDetail.textContent = 'Hanya 1 orang yang diperbolehkan';
            break;
            
        case 'captured':
            faceStatusContainer.classList.remove('bg-yellow-50', 'bg-red-50');
            faceStatusContainer.classList.add('bg-green-50');
            faceStatusIcon.textContent = '📷';
            faceStatusText.textContent = 'Foto tersimpan';
            faceStatusDetail.textContent = 'Silakan daftarkan karyawan';
            break;
    }
}

/**
 * Handle capture button click
 */
async function handleCapture(e) {
    e.preventDefault();
    
    try {
        // Detect face one more time
        const detection = await detectSingleFace(videoElement);
        
        if (!detection) {
            showErrorModal('Tidak ada wajah terdeteksi. Silakan coba lagi.');
            return;
        }
        
        // Extract descriptor
        capturedDescriptor = descriptorToArray(detection.descriptor);
        
        // Capture photo
        capturedPhotoBase64 = capturePhotoFromVideo(videoElement);
        
        // Draw captured photo on canvas
        const img = new Image();
        img.onload = () => {
            const ctx = capturedPhotoCanvas.getContext('2d');
            capturedPhotoCanvas.width = videoElement.videoWidth;
            capturedPhotoCanvas.height = videoElement.videoHeight;
            ctx.drawImage(img, 0, 0);
        };
        img.src = capturedPhotoBase64;
        
        // Hide video, show captured photo
        videoElement.classList.add('hidden');
        canvasOverlay.classList.add('hidden');
        capturedPhotoCanvas.classList.remove('hidden');
        
        // Hide face guide overlay
        if (faceGuideOverlayEnroll) {
            faceGuideOverlayEnroll.classList.add('hidden');
        }
        
        // Update buttons
        captureBtn.classList.add('hidden');
        retakeBtn.classList.remove('hidden');
        registerBtn.disabled = false;
        
        // Stop detection
        stopFaceDetection();
        
        // Update status
        updateFaceStatus('captured', 1);
        
        debugLog('Photo captured successfully');
        
    } catch (error) {
        errorLog('Capture failed', error);
        showErrorModal('Gagal mengambil foto. Silakan coba lagi.');
    }
}

/**
 * Handle retake button click
 */
function handleRetake(e) {
    e.preventDefault();
    
    // Clear captured data
    capturedDescriptor = null;
    capturedPhotoBase64 = null;
    
    // Show video, hide captured photo
    videoElement.classList.remove('hidden');
    canvasOverlay.classList.remove('hidden');
    capturedPhotoCanvas.classList.add('hidden');
    
    // Show face guide overlay again
    if (faceGuideOverlayEnroll) {
        faceGuideOverlayEnroll.classList.remove('hidden');
    }
    
    // Update buttons
    captureBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    registerBtn.disabled = true;
    
    // Restart detection
    startFaceDetection();
    
    debugLog('Retake initiated');
}

/**
 * Handle form submit
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate all fields
    if (!validateForm()) {
        return;
    }
    
    // Check if photo captured
    if (!capturedDescriptor || !capturedPhotoBase64) {
        showErrorModal('Silakan ambil foto wajah terlebih dahulu.');
        return;
    }
    
    // Get form data
    const userData = {
        employee_id: employeeIdInput.value.trim(),
        name: employeeNameInput.value.trim(),
        role: employeeRoleInput.value,
        face_descriptor: capturedDescriptor,
        photo_base64: capturedPhotoBase64
    };
    
    try {
        showLoading('Mendaftarkan karyawan...');
        
        // Register user
        const result = await registerUser(userData);
        
        hideLoading();
        
        // Show success
        successMessage.textContent = `${result.data.name} (${result.data.employee_id}) telah terdaftar dalam sistem.`;
        successModal.classList.remove('hidden');
        
        debugLog('User registered successfully', result);
        
    } catch (error) {
        hideLoading();
        errorLog('Registration failed', error);
        showErrorModal(getErrorMessage(error));
    }
}

/**
 * Validate form
 */
function validateForm() {
    let isValid = true;
    
    // Validate employee ID
    if (!validateEmployeeId()) {
        isValid = false;
    }
    
    // Validate name
    if (!validateName()) {
        isValid = false;
    }
    
    // Validate role selection
    if (!employeeRoleInput.value) {
        employeeRoleInput.classList.add('border-red-500');
        isValid = false;
    } else {
        employeeRoleInput.classList.remove('border-red-500');
        employeeRoleInput.classList.add('border-green-500');
    }
    
    return isValid;
}

/**
 * Validate employee ID
 */
function validateEmployeeId() {
    const value = employeeIdInput.value.trim();
    
    if (!value) {
        return false;
    }
    
    if (!VALIDATION_CONFIG.EMPLOYEE_ID_PATTERN.test(value)) {
        employeeIdInput.classList.add('border-red-500');
        return false;
    }
    
    employeeIdInput.classList.remove('border-red-500');
    employeeIdInput.classList.add('border-green-500');
    return true;
}

/**
 * Validate name
 */
function validateName() {
    const value = employeeNameInput.value.trim();
    
    if (!value) {
        return false;
    }
    
    if (value.length < VALIDATION_CONFIG.NAME_MIN_LENGTH) {
        employeeNameInput.classList.add('border-red-500');
        return false;
    }
    
    employeeNameInput.classList.remove('border-red-500');
    employeeNameInput.classList.add('border-green-500');
    return true;
}

/**
 * Update face guide appearance for enrollment page
 * @param {boolean} detected - Whether face is detected
 * @param {string} text - Text to display below guide
 */
function updateFaceGuideEnroll(detected, text) {
    if (!faceGuideEnroll || !faceGuideTextEnroll) return;
    
    if (detected) {
        faceGuideEnroll.classList.add('detected');
    } else {
        faceGuideEnroll.classList.remove('detected');
    }
    
    faceGuideTextEnroll.textContent = text;
}

/**
 * Show loading overlay
 */
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingOverlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

/**
 * Show error modal
 */
function showErrorModal(message) {
    errorModalMessage.textContent = message;
    errorModal.classList.remove('hidden');
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    stopFaceDetection();
    if (webcamStream) {
        stopWebcam(webcamStream);
    }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);
