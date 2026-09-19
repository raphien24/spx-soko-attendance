/**
 * Scanner Page Logic
 * Auto-scan attendance with face recognition
 */

import { 
    FACE_CONFIG, 
    UI_CONFIG,
    debugLog, 
    errorLog 
} from './config.js';

import {
    getUserDescriptors,
    submitAttendance,
    checkHealth,
    getHubLocation,
    getErrorMessage
} from './api.js';

import {
    loadFaceModels,
    initializeWebcam,
    detectSingleFace,
    findMatchingFace,
    drawFaceDetection,
    clearCanvas,
    capturePhotoFromVideo,
    resizeCanvas,
    distanceToConfidence
} from './face-setup.js';

import {
    getCurrentPosition,
    isWithinHubRadius,
    formatDistance
} from './gps.js';

import {
    initAudio,
    playSuccessSound,
    playErrorSound
} from './audio.js';

// DOM Elements
let videoElement, canvasElement, faceGuide, faceGuideText;
let loadingScreen, scannerScreen, errorScreen;
let statusBanner, statusIcon, statusText, statusSubtext;
let notificationElement, notificationContent, notificationIcon, notificationTitle, notificationName, notificationTime;
let detectedCountElement, currentTimeElement, currentDateElement;
let cameraIndicator, connectionIndicator;

// State
let webcamStream = null;
let knownFaces = [];
let hubSettings = null;
let isScanning = false;
let isCooldown = false;
let currentMatch = null;
let stabilityStartTime = null;

// Performance optimization: Frame skipping
let frameCount = 0;
const FRAME_SKIP = 3;  // Process every 3rd frame (reduces CPU usage by ~70%)
let lastDetection = null;  // Cache last detection for skipped frames

async function init() {
    try {
        getDOMElements();
        showInteractiveLoading('Klik tombol di bawah untuk memulai sistem absensi', true);
    } catch (error) {
        errorLog('Initialization failed', error);
        showError(error.message);
    }
}

async function startSystem() {
    try {
        showInteractiveLoading('Memuat model face recognition...', false);
        try {
            await loadFaceModels();
        } catch (e) {
            throw new Error('Gagal memuat model AI wajah. Periksa koneksi internet Anda.');
        }
        
        showInteractiveLoading('Memuat sistem audio...', false);
        try {
            initAudio();
        } catch (e) {
            console.warn('Audio init warning:', e);
        }
        
        showInteractiveLoading('Memeriksa koneksi server...', false);
        const isConnected = await testServerConnection();
        if (!isConnected) {
            throw new Error('Tidak dapat terhubung ke server.');
        }
        
        showInteractiveLoading('Memuat pengaturan lokasi hub...', false);
        try {
            hubSettings = await getHubLocation();
        } catch (error) {
            hubSettings = null;
        }
        
        showInteractiveLoading('Memuat data karyawan...', false);
        await loadKnownFaces();
        
        showInteractiveLoading('Mengaktifkan kamera...', false);
        try {
            webcamStream = await initializeWebcam(videoElement);
        } catch (e) {
            throw new Error('Gagal mengakses kamera.');
        }
        
        videoElement.addEventListener('loadedmetadata', () => {
            resizeCanvas(canvasElement, videoElement);
        });
        
        showScanner();
        startScanning();
        startClock();
        
    } catch (error) {
        errorLog('Start system failed', error);
        showError(error.message);
    }
}

function getDOMElements() {
    videoElement = document.getElementById('video');
    canvasElement = document.getElementById('canvas');
    faceGuide = document.getElementById('face-guide');
    faceGuideText = document.getElementById('face-guide-text');
    loadingScreen = document.getElementById('loading-screen');
    scannerScreen = document.getElementById('scanner-screen');
    errorScreen = document.getElementById('error-screen');
    statusBanner = document.getElementById('status-banner');
    statusIcon = document.getElementById('status-icon');
    statusText = document.getElementById('status-text');
    statusSubtext = document.getElementById('status-subtext');
    notificationElement = document.getElementById('notification');
    notificationContent = document.getElementById('notification-content');
    notificationIcon = document.getElementById('notification-icon');
    notificationTitle = document.getElementById('notification-title');
    notificationName = document.getElementById('notification-name');
    notificationTime = document.getElementById('notification-time');
    detectedCountElement = document.getElementById('detected-count');
    currentTimeElement = document.getElementById('current-time');
    currentDateElement = document.getElementById('current-date');
    cameraIndicator = document.getElementById('camera-indicator');
    connectionIndicator = document.getElementById('connection-indicator');
}

function showInteractiveLoading(message, showButton) {
    const textEl = document.getElementById('loading-text');
    if (textEl) textEl.textContent = message;
    
    loadingScreen?.classList.remove('hidden');
    scannerScreen?.classList.add('hidden');
    errorScreen?.classList.add('hidden');
    
    let actionBtn = document.getElementById('start-action-btn');
    let noteEl = document.getElementById('start-action-note');
    
    if (showButton) {
        if (!actionBtn) {
            actionBtn = document.createElement('button');
            actionBtn.id = 'start-action-btn';
            actionBtn.className = 'mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 text-lg cursor-pointer';
            actionBtn.innerHTML = '👉 Klik disini untuk Absensi';
            actionBtn.onclick = async () => {
                actionBtn.disabled = true;
                actionBtn.textContent = '⏳ Memuat...';
                actionBtn.classList.add('opacity-50', 'cursor-not-allowed');
                if (noteEl) noteEl.style.display = 'none';
                await startSystem();
            };
            textEl?.parentElement?.appendChild(actionBtn);
        } else {
            actionBtn.style.display = 'inline-block';
            actionBtn.disabled = false;
            actionBtn.innerHTML = '👉 Klik disini untuk Absensi';
            actionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        if (!noteEl) {
            noteEl = document.createElement('p');
            noteEl.id = 'start-action-note';
            noteEl.className = 'text-xs text-gray-400 mt-3 text-center max-w-xs mx-auto';
            noteEl.textContent = '⚠️ Pastikan Anda memberi izin penggunaan kamera dan lokasi yang akurat.';
            textEl?.parentElement?.appendChild(noteEl);
        } else {
            noteEl.style.display = 'block';
        }
    } else {
        if (actionBtn) actionBtn.style.display = 'none';
        if (noteEl) noteEl.style.display = 'none';
    }
}

function showScanner() {
    loadingScreen?.classList.add('hidden');
    scannerScreen?.classList.remove('hidden');
    errorScreen?.classList.add('hidden');
    statusBanner?.classList.remove('hidden');
    updateStatus('ready');
}

function showError(message) {
    const errEl = document.getElementById('error-message');
    if (errEl) errEl.textContent = message;
    loadingScreen?.classList.add('hidden');
    scannerScreen?.classList.add('hidden');
    errorScreen?.classList.remove('hidden');
}

async function testServerConnection() {
    try {
        await checkHealth();
        connectionIndicator?.classList.remove('bg-red-500');
        connectionIndicator?.classList.add('bg-green-500');
        return true;
    } catch (error) {
        connectionIndicator?.classList.remove('bg-green-500');
        connectionIndicator?.classList.add('bg-red-500');
        return false;
    }
}

async function loadKnownFaces() {
    try {
        knownFaces = await getUserDescriptors();
        if (!knownFaces) knownFaces = [];
    } catch (error) {
        knownFaces = [];
    }
}

function startScanning() {
    isScanning = true;
    frameCount = 0;  // Reset frame counter
    lastDetection = null;  // Reset detection cache
    scanLoop();
}

async function scanLoop() {
    if (!isScanning) return;
    
    frameCount++;
    
    try {
        let detection = null;
        
        // Only run heavy face detection every FRAME_SKIP frames (performance optimization)
        if (frameCount % FRAME_SKIP === 0) {
            const detectionStart = performance.now();
            detection = await detectSingleFace(videoElement);
            const detectionTime = performance.now() - detectionStart;
            
            // Log slow detections for monitoring
            if (detectionTime > 150) {
                console.warn(`⚠️ Slow face detection: ${detectionTime.toFixed(0)}ms`);
            }
            
            // Cache detection for next frames
            lastDetection = detection;
        } else {
            // Use cached detection for skipped frames (smooth UI without heavy computation)
            detection = lastDetection;
        }
        
        clearCanvas(canvasElement);
        
        if (detection) {
            const label = currentMatch ? currentMatch.name : '';
            drawFaceDetection(canvasElement, detection, label);
            if (detectedCountElement) detectedCountElement.textContent = '1 wajah terdeteksi';
            updateFaceGuide(true, 'Wajah terdeteksi');
            
            // Only perform face matching on actual detection frames (not cached)
            if (frameCount % FRAME_SKIP === 0 && !isCooldown) {
                const match = findMatchingFace(detection.descriptor, knownFaces);
                if (match) handleFaceMatch(match);
                else handleNoMatch();
            }
        } else {
            if (detectedCountElement) detectedCountElement.textContent = '0 wajah terdeteksi';
            updateFaceGuide(false, 'Posisikan wajah di dalam bingkai');
            handleNoFace();
        }
    } catch (error) {
        errorLog('Scan loop error', error);
    }
    requestAnimationFrame(scanLoop);
}

function handleFaceMatch(match) {
    const confidence = distanceToConfidence(match.distance);
    if (currentMatch && currentMatch.id === match.id) {
        const elapsed = Date.now() - stabilityStartTime;
        const remaining = FACE_CONFIG.STABILITY_DURATION - elapsed;
        updateStatus('recognized', match.name, `${Math.ceil(remaining / 1000)} detik...`);
        if (elapsed >= FACE_CONFIG.STABILITY_DURATION) {
            triggerAttendanceScan(match);
        }
    } else {
        currentMatch = match;
        stabilityStartTime = Date.now();
        updateStatus('recognized', match.name, `Tahan posisi... (${confidence}% match)`);
    }
}

function handleNoMatch() {
    currentMatch = null;
    stabilityStartTime = null;
    updateStatus('noMatch');
}

function handleNoFace() {
    currentMatch = null;
    stabilityStartTime = null;
    updateStatus('noFace');
}

async function triggerAttendanceScan(match) {
    try {
        isCooldown = true;
        currentMatch = null;
        updateStatus('processing', 'Memvalidasi lokasi GPS...');
        
        // 🔒 GPS VALIDATION (WAJIB AKTIF DAN DALAM RADIUS)
        if (hubSettings) {
            try {
                const currentPos = await getCurrentPosition();
                const validation = isWithinHubRadius(currentPos, hubSettings);
                
                if (!validation.isWithinRadius) {
                    const distance = formatDistance(validation.distance);
                    const maxDistance = formatDistance(validation.requiredRadius);
                    
                    showGPSErrorNotification(
                        `Absen Wajib Di Area Soko Hub. Ojo Ngeyel!\n\n` +
                        `Jarak Anda: ${distance}\n` +
                        `Batas Maksimal: ${maxDistance}`
                    );
                    
                    await playErrorSound();
                    setTimeout(() => {
                        isCooldown = false;
                        updateStatus('noFace');
                    }, 3000);
                    return;
                }
            } catch (gpsError) {
                // ❌ JIKA GPS DITOLAK ATAU GAGAL, TOLAK ABSENSI SEKETIKA
                errorLog('GPS permission denied or failed:', gpsError);
                
                showGPSErrorNotification(
                    `ABSEN GAGAL!\n\n` +
                    `Akses GPS/Lokasi wajib diaktifkan dan diizinkan pada browser untuk melakukan absensi.`
                );
                
                await playErrorSound();
                setTimeout(() => {
                    isCooldown = false;
                    updateStatus('noFace');
                }, 4000);
                return; // STOP DI SINI, JANGAN LANJUT SUBMIT KE SERVER
            }
        }
        
        updateStatus('processing', 'Memproses absensi...');
        const photoBase64 = capturePhotoFromVideo(videoElement);
        const result = await submitAttendance({
            user_id: match.id,
            capture_base64: photoBase64
        });
        
        await playSuccessSound();
        showSuccessNotification(result.data);
        
        setTimeout(() => {
            isCooldown = false;
            updateStatus('ready');
        }, FACE_CONFIG.COOLDOWN_DURATION);
        
    } catch (error) {
        errorLog('Attendance scan failed', error);
        await playErrorSound();
        showErrorNotification(getErrorMessage(error));
        setTimeout(() => {
            isCooldown = false;
            updateStatus('ready');
        }, 2000);
    }
}

function updateStatus(status, name = '', detail = '') {
    if (!statusIcon || !statusText || !statusSubtext) return;
    switch (status) {
        case 'ready':
            statusIcon.textContent = '👋';
            statusText.textContent = UI_CONFIG.STATUS_TEXT.ready;
            statusSubtext.textContent = 'Hadapkan wajah Anda ke kamera';
            break;
        case 'noFace':
            statusIcon.textContent = '👤';
            statusText.textContent = UI_CONFIG.STATUS_TEXT.noFace;
            statusSubtext.textContent = 'Tidak ada wajah terdeteksi';
            break;
        case 'noMatch':
            statusIcon.textContent = '❓';
            statusText.textContent = 'Wajah Tidak Dikenali';
            statusSubtext.textContent = 'Silakan hubungi admin untuk registrasi';
            break;
        case 'recognized':
            statusIcon.textContent = '✓';
            statusText.textContent = `Mengenali: ${name}`;
            statusSubtext.textContent = detail || 'Tahan posisi...';
            break;
        case 'processing':
            statusIcon.textContent = '⏳';
            statusText.textContent = UI_CONFIG.STATUS_TEXT.processing;
            statusSubtext.textContent = 'Mohon tunggu sebentar...';
            break;
    }
}

function showSuccessNotification(data) {
    if (!notificationElement || !notificationContent) return;
    
    notificationContent.classList.remove('bg-red-600', 'bg-red-500');
    notificationContent.classList.add('bg-green-500');
    
    if (notificationIcon) notificationIcon.textContent = '✓';
    if (notificationTitle) notificationTitle.textContent = 'Absen Berhasil!';
    if (notificationName) {
        notificationName.textContent = data.name;
        notificationName.classList.remove('text-yellow-300');
    }
    
    const needsWarning = data.role === 'Rider Dedicated' || data.role === 'Driver Dedicated';
    if (needsWarning) {
        notificationTime.innerHTML = `
            Clock ${data.scan_type} - ${formatTime(data.timestamp)}
            <br>
            <span class="text-yellow-300 font-bold mt-1 block">
                ⚠️ Jangan Lupa Clock in di Aplikasi Driver!
            </span>
        `;
    } else {
        notificationTime.textContent = `Clock ${data.scan_type} - ${formatTime(data.timestamp)}`;
    }
    notificationTime.classList.remove('text-lg', 'font-bold');
    
    notificationElement.classList.remove('hidden');
    notificationContent.style.transform = 'scale(1)';
    
    setTimeout(() => {
        notificationContent.style.transform = 'scale(0)';
        setTimeout(() => notificationElement.classList.add('hidden'), 300);
    }, needsWarning ? 5000 : 3000);
}

function showErrorNotification(message) {
    if (!notificationContent || !notificationElement) return;
    notificationContent.classList.remove('bg-green-500');
    notificationContent.classList.add('bg-red-500');
    if (notificationIcon) notificationIcon.textContent = '✕';
    if (notificationTitle) notificationTitle.textContent = 'Absen Gagal';
    if (notificationName) notificationName.textContent = '';
    if (notificationTime) {
        notificationTime.textContent = message;
        notificationTime.classList.remove('text-lg', 'font-bold');
    }
    
    notificationElement.classList.remove('hidden');
    notificationContent.style.transform = 'scale(1)';
    setTimeout(() => {
        notificationContent.style.transform = 'scale(0)';
        setTimeout(() => {
            notificationElement.classList.add('hidden');
            notificationContent.classList.remove('bg-red-500');
            notificationContent.classList.add('bg-green-500');
            if (notificationIcon) notificationIcon.textContent = '✓';
        }, 300);
    }, 4000);
}

function showGPSErrorNotification(message) {
    if (!notificationContent || !notificationElement) return;
    
    notificationContent.classList.remove('bg-green-500');
    notificationContent.classList.add('bg-red-600');
    
    if (notificationIcon) {
        notificationIcon.textContent = '⚠️';
        notificationIcon.classList.add('animate-pulse');
    }
    
    if (notificationTitle) notificationTitle.textContent = 'Absen Gagal';
    if (notificationName) notificationName.textContent = '';
    
    if (notificationTime) {
        notificationTime.innerHTML = message.replace(/\n/g, '<br>');
        notificationTime.classList.add('text-lg', 'font-bold');
    }
    
    notificationElement.classList.remove('hidden');
    notificationContent.style.transform = 'scale(1)';
    
    setTimeout(() => {
        notificationContent.style.transform = 'scale(0)';
        setTimeout(() => {
            notificationElement.classList.add('hidden');
            notificationContent.classList.remove('bg-red-600');
            notificationContent.classList.add('bg-green-500');
            if (notificationIcon) {
                notificationIcon.textContent = '✓';
                notificationIcon.classList.remove('animate-pulse');
            }
            if (notificationTime) {
                notificationTime.classList.remove('text-lg', 'font-bold');
            }
        }, 300);
    }, 5000);
}

function updateFaceGuide(detected, text) {
    if (!faceGuide || !faceGuideText) return;
    if (detected) faceGuide.classList.add('detected');
    else faceGuide.classList.remove('detected');
    faceGuideText.textContent = text;
}

function formatTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12: false
    }) + ' WIB';
}

function startClock() {
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        if (currentTimeElement) currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        if (currentDateElement) currentDateElement.textContent = now.toLocaleDateString('id-ID', options);
    }
    updateClock();
    setInterval(updateClock, 1000);
}

window.addEventListener('beforeunload', () => {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
    }
});

window.addEventListener('DOMContentLoaded', init);