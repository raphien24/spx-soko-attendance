/**
 * GPS Location and Distance Calculation Utilities
 * Uses Haversine formula for distance calculation
 */

import { debugLog, errorLog } from './config.js';

/**
 * Get current device GPS coordinates using Geolocation API
 * @param {number} timeout - Optional timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} { latitude, longitude, accuracy }
 */
export async function getCurrentPosition(timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation API tidak didukung oleh browser ini'));
            return;
        }
        
        const options = {
            enableHighAccuracy: true,    // Use GPS if available
            timeout: timeout,             // Configurable timeout
            maximumAge: 30000             // Accept cached position up to 30 seconds old
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy // in meters
                };
                
                debugLog(`GPS Position obtained:`, coords);
                resolve(coords);
            },
            (error) => {
                let errorMessage = 'Gagal mendapatkan lokasi GPS';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Izin akses lokasi ditolak. Mohon aktifkan GPS di pengaturan browser.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Informasi lokasi tidak tersedia. Pastikan GPS aktif.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Request lokasi timeout. Coba lagi atau GPS akan dilewati.';
                        break;
                }
                
                errorLog('Geolocation error:', error);
                reject(new Error(errorMessage));
            },
            options
        );
    });
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    
    // Convert degrees to radians
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    // Haversine formula
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distance = R * c; // Distance in meters
    
    debugLog(`Distance calculated: ${distance.toFixed(2)} meters`);
    
    return distance;
}

/**
 * Check if current position is within allowed radius of hub
 * @param {Object} currentPos - { latitude, longitude }
 * @param {Object} hubPos - { latitude, longitude, radius_meters }
 * @returns {Object} { isWithinRadius, distance, requiredRadius }
 */
export function isWithinHubRadius(currentPos, hubPos) {
    const distance = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        hubPos.latitude,
        hubPos.longitude
    );
    
    const isWithinRadius = distance <= hubPos.radius_meters;
    
    return {
        isWithinRadius,
        distance: Math.round(distance), // Round to nearest meter
        requiredRadius: hubPos.radius_meters,
        hubName: hubPos.hub_name || 'Soko Hub'
    };
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance (e.g., "125 m" or "1.2 km")
 */
export function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    } else {
        return `${(meters / 1000).toFixed(1)} km`;
    }
}

/**
 * Request and check GPS permission status
 * @returns {Promise<string>} Permission state: 'granted', 'denied', or 'prompt'
 */
export async function checkGPSPermission() {
    if (!navigator.permissions) {
        debugLog('Permissions API not supported');
        return 'prompt'; // Assume we need to prompt
    }
    
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        debugLog(`GPS permission status: ${result.state}`);
        return result.state;
    } catch (error) {
        errorLog('Failed to query GPS permission:', error);
        return 'prompt';
    }
}
