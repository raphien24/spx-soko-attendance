/**
 * Audio Notification Utilities
 * Handles success and error sound effects
 */

import { debugLog, errorLog } from './config.js';

// Audio file paths
const AUDIO_FILES = {
    success: '/audio/sukses.mp3',
    error: '/audio/gagal.mp3'
};

// Audio instances (preloaded for faster playback)
let audioInstances = {
    success: null,
    error: null
};

// User interaction flag (required for autoplay policy)
let userInteracted = false;

/**
 * Initialize audio system
 * Preload audio files for faster playback
 */
export function initAudio() {
    try {
        // Preload success sound
        audioInstances.success = new Audio(AUDIO_FILES.success);
        audioInstances.success.preload = 'auto';
        audioInstances.success.volume = 0.7;
        
        // Preload error sound
        audioInstances.error = new Audio(AUDIO_FILES.error);
        audioInstances.error.preload = 'auto';
        audioInstances.error.volume = 0.8;
        
        debugLog('Audio system initialized');
        
        // Setup user interaction listener (for autoplay policy)
        setupInteractionListener();
        
    } catch (error) {
        errorLog('Failed to initialize audio system:', error);
    }
}

/**
 * Setup listener to detect user interaction
 * Required to bypass browser autoplay restrictions
 */
function setupInteractionListener() {
    const markInteraction = () => {
        userInteracted = true;
        debugLog('User interaction detected - audio unlocked');
        
        // Remove listeners after first interaction
        document.removeEventListener('click', markInteraction);
        document.removeEventListener('keydown', markInteraction);
        document.removeEventListener('touchstart', markInteraction);
    };
    
    document.addEventListener('click', markInteraction, { once: true });
    document.addEventListener('keydown', markInteraction, { once: true });
    document.addEventListener('touchstart', markInteraction, { once: true });
}

/**
 * Play success sound
 * @returns {Promise<void>}
 */
export async function playSuccessSound() {
    return playSound('success');
}

/**
 * Play error/failure sound
 * @returns {Promise<void>}
 */
export async function playErrorSound() {
    return playSound('error');
}

/**
 * Play audio by type
 * @param {string} type - 'success' or 'error'
 * @returns {Promise<void>}
 */
async function playSound(type) {
    try {
        const audio = audioInstances[type];
        
        if (!audio) {
            errorLog(`Audio instance not found for type: ${type}`);
            return;
        }
        
        // Reset audio to start
        audio.currentTime = 0;
        
        // Try to play
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            await playPromise;
            debugLog(`${type} sound played successfully`);
        }
        
    } catch (error) {
        // Handle autoplay policy errors gracefully
        if (error.name === 'NotAllowedError') {
            errorLog('Audio playback blocked by browser autoplay policy');
            console.warn('💡 Tip: User interaction required before audio can play');
        } else {
            errorLog(`Failed to play ${type} sound:`, error);
        }
    }
}

/**
 * Set volume for all sounds
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export function setVolume(volume) {
    const vol = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    
    if (audioInstances.success) {
        audioInstances.success.volume = vol;
    }
    
    if (audioInstances.error) {
        audioInstances.error.volume = vol;
    }
    
    debugLog(`Audio volume set to ${vol}`);
}

/**
 * Mute all sounds
 */
export function muteAudio() {
    if (audioInstances.success) audioInstances.success.muted = true;
    if (audioInstances.error) audioInstances.error.muted = true;
    debugLog('Audio muted');
}

/**
 * Unmute all sounds
 */
export function unmuteAudio() {
    if (audioInstances.success) audioInstances.success.muted = false;
    if (audioInstances.error) audioInstances.error.muted = false;
    debugLog('Audio unmuted');
}

/**
 * Check if audio can be played (for debugging)
 * @returns {Promise<boolean>}
 */
export async function testAudioPlayback() {
    try {
        // Create a silent audio to test playback capability
        const testAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        await testAudio.play();
        testAudio.pause();
        debugLog('Audio playback test: SUCCESS');
        return true;
    } catch (error) {
        errorLog('Audio playback test: FAILED', error);
        return false;
    }
}
