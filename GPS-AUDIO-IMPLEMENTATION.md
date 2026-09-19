# 🎯 GPS RADIUS VALIDATION & AUDIO NOTIFICATION

## ✅ WHAT'S BEEN IMPLEMENTED (PART 1)

### Backend (Cloudflare D1 & Workers)

#### 1. **Database Schema** ✅
- **File:** `backend/src/db/schema.sql`
- **Added Table:** `hub_settings`
```sql
CREATE TABLE IF NOT EXISTS hub_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hub_name TEXT NOT NULL DEFAULT 'SPX Soko Hub',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 500,
    updated_at TEXT NOT NULL,
    updated_by TEXT
);

-- Default data
INSERT OR IGNORE INTO hub_settings (id, hub_name, latitude, longitude, radius_meters, updated_at)
VALUES (1, 'SPX Soko Hub', -7.0861707572348545, 111.97167733649127, 500, datetime('now'));
```

#### 2. **Database Queries** ✅
- **File:** `backend/src/db/queries.js`
- **Added Functions:**
  - `getHubSettings(db)` - Get hub location settings
  - `updateHubSettings(db, settings)` - Update hub location

#### 3. **API Handlers** ✅
- **File:** `backend/src/handlers/settings.js` (NEW FILE)
- **Endpoints:**
  - `GET /api/settings/hub-location` - Get current hub settings
  - `PUT /api/settings/hub-location` - Update hub settings
- **Validation:**
  - Latitude: -90 to 90
  - Longitude: -180 to 180
  - Radius: 50 to 10000 meters

#### 4. **Routes** ✅
- **File:** `backend/src/index.js`
- **Added Routes:**
```javascript
// Settings endpoints
else if (pathname === '/api/settings/hub-location' && method === 'GET') {
    response = await getHubLocation(request, env);
}
else if (pathname === '/api/settings/hub-location' && method === 'PUT') {
    response = await updateHubLocation(request, env);
}
```

---

### Frontend Utilities

#### 5. **GPS Module** ✅
- **File:** `frontend/src/js/gps.js` (NEW FILE)
- **Functions:**
  - `getCurrentPosition()` - Get device GPS coordinates
  - `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula
  - `isWithinHubRadius(currentPos, hubPos)` - Check if within 500m
  - `formatDistance(meters)` - Format distance for display
  - `checkGPSPermission()` - Check GPS permission status

**Example Usage:**
```javascript
import { getCurrentPosition, isWithinHubRadius } from './gps.js';

// Get current location
const currentPos = await getCurrentPosition();
// { latitude: -7.086, longitude: 111.972, accuracy: 10 }

// Check if within hub radius
const hubPos = { latitude: -7.0861707572348545, longitude: 111.97167733649127, radius_meters: 500 };
const result = isWithinHubRadius(currentPos, hubPos);
// { isWithinRadius: true, distance: 125, requiredRadius: 500, hubName: 'SPX Soko Hub' }
```

#### 6. **Audio Module** ✅
- **File:** `frontend/src/js/audio.js` (NEW FILE)
- **Functions:**
  - `initAudio()` - Initialize audio system (preload files)
  - `playSuccessSound()` - Play sukses.mp3
  - `playErrorSound()` - Play gagal.mp3
  - `setVolume(volume)` - Set volume (0.0 - 1.0)
  - `muteAudio()` / `unmuteAudio()` - Mute control

**Audio Files Required:**
```
frontend/audio/sukses.mp3  ← Success sound
frontend/audio/gagal.mp3   ← Error/failure sound
```

**Example Usage:**
```javascript
import { initAudio, playSuccessSound, playErrorSound } from './audio.js';

// Initialize on page load
initAudio();

// Play on attendance success
await playSuccessSound();

// Play on GPS validation failure
await playErrorSound();
```

#### 7. **API Client Update** ✅
- **File:** `frontend/src/js/api.js`
- **Added Functions:**
  - `getHubLocation()` - Fetch hub settings from backend
  - `updateHubLocation(settings)` - Update hub settings

#### 8. **Config Update** ✅
- **File:** `frontend/src/js/config.js`
- **Added Endpoint:**
```javascript
SETTINGS_HUB_LOCATION: '/api/settings/hub-location'
```

---

## 📋 TODO: PART 2 - SCANNER INTEGRATION

### File: `frontend/src/js/scanner.js`

Need to add:

1. **Import GPS & Audio modules:**
```javascript
import { getCurrentPosition, isWithinHubRadius, formatDistance } from './gps.js';
import { initAudio, playSuccessSound, playErrorSound } from './audio.js';
import { getHubLocation } from './api.js';
```

2. **Add state variables:**
```javascript
// State
let hubSettings = null; // Store hub location settings
let gpsCheckPassed = false;
```

3. **Load hub settings on init:**
```javascript
async function init() {
    try {
        // ... existing code ...
        
        // Load hub settings
        showLoading('Memuat pengaturan lokasi...');
        hubSettings = await getHubLocation();
        debugLog('Hub settings loaded:', hubSettings);
        
        // Initialize audio
        initAudio();
        
        // ... rest of init ...
    } catch (error) {
        // ...
    }
}
```

4. **Add GPS validation before attendance scan:**
```javascript
async function triggerAttendanceScan(match) {
    try {
        isCooldown = true;
        currentMatch = null;
        
        updateStatus('processing', 'Memvalidasi lokasi...');
        
        // ✅ GPS VALIDATION
        try {
            const currentPos = await getCurrentPosition();
            const validation = isWithinHubRadius(currentPos, hubSettings);
            
            if (!validation.isWithinRadius) {
                // ❌ OUTSIDE RADIUS - SHOW RED POPUP & PLAY ERROR SOUND
                const distance = formatDistance(validation.distance);
                const maxDistance = formatDistance(validation.requiredRadius);
                
                showGPSErrorNotification(
                    `Absen Wajib Di Area Soko Hub. Ojo Ngeyel!\n\n` +
                    `Jarak Anda: ${distance}\n` +
                    `Maksimal: ${maxDistance}`
                );
                
                await playErrorSound();
                
                // Reset and return
                setTimeout(() => {
                    isCooldown = false;
                    updateStatus('noFace');
                }, 3000);
                
                return; // STOP - Don't proceed with attendance
            }
            
            // ✅ WITHIN RADIUS - Continue
            debugLog(`GPS validation passed. Distance: ${validation.distance}m`);
            gpsCheckPassed = true;
            
        } catch (gpsError) {
            // GPS error - show warning but allow attendance (fallback)
            errorLog('GPS validation failed:', gpsError);
            showGPSWarningNotification(gpsError.message);
        }
        
        updateStatus('processing', 'Memproses absensi...');
        
        // Capture photo
        const photoBase64 = capturePhotoFromVideo(videoElement);
        
        // Submit attendance
        const result = await submitAttendance({
            user_id: match.id,
            photo_base64: photoBase64
        });
        
        // ✅ SUCCESS - PLAY SUCCESS SOUND
        await playSuccessSound();
        
        showSuccessNotification(result.data);
        
        // ... rest of function ...
        
    } catch (error) {
        errorLog('Attendance scan failed', error);
        
        // ❌ ERROR - PLAY ERROR SOUND
        await playErrorSound();
        
        showErrorNotification(getErrorMessage(error));
        
        // ... reset ...
    }
}
```

5. **Add GPS error notification function:**
```javascript
/**
 * Show GPS validation error notification (RED)
 */
function showGPSErrorNotification(message) {
    // Change to error style (RED)
    notificationContent.classList.remove('bg-green-500');
    notificationContent.classList.add('bg-red-600');
    notificationContent.querySelector('div:first-child').textContent = '⚠️';
    
    notificationName.textContent = 'LOKASI TIDAK VALID';
    notificationTime.innerHTML = message.replace(/\n/g, '<br>');
    
    // Show notification
    notificationElement.classList.remove('hidden');
    notificationContent.style.transform = 'scale(1)';
    
    // Hide after 5 seconds
    setTimeout(() => {
        notificationContent.style.transform = 'scale(0)';
        setTimeout(() => {
            notificationElement.classList.add('hidden');
            // Reset to success style
            notificationContent.classList.remove('bg-red-600');
            notificationContent.classList.add('bg-green-500');
            notificationContent.querySelector('div:first-child').textContent = '✓';
        }, 300);
    }, 5000);
}
```

---

## 📋 TODO: PART 3 - ADMIN DASHBOARD

### File: `frontend/admin.html`

Need to add new tab:

```html
<!-- Sidebar Navigation -->
<nav class="space-y-1 px-3">
    <!-- ... existing tabs ... -->
    
    <!-- Hub Location Settings Tab -->
    <button 
        data-tab="hub-settings" 
        class="nav-item w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
    >
        <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span class="font-medium">Atur Lokasi Hub</span>
    </button>
</nav>

<!-- Main Content Area -->
<!-- Hub Settings Tab Content -->
<div id="hub-settings-content" class="tab-content hidden">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">Pengaturan Lokasi Hub</h2>
    
    <!-- Current Location Card -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">📍 Lokasi Hub Saat Ini</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <p class="text-sm text-gray-600">Nama Hub:</p>
                <p id="current-hub-name" class="text-lg font-bold text-gray-800">SPX Soko Hub</p>
            </div>
            <div>
                <p class="text-sm text-gray-600">Radius Maksimal:</p>
                <p id="current-radius" class="text-lg font-bold text-gray-800">500 meter</p>
            </div>
            <div>
                <p class="text-sm text-gray-600">Latitude:</p>
                <p id="current-latitude" class="text-lg font-mono text-gray-800">-7.0861707572348545</p>
            </div>
            <div>
                <p class="text-sm text-gray-600">Longitude:</p>
                <p id="current-longitude" class="text-lg font-mono text-gray-800">111.97167733649127</p>
            </div>
        </div>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p class="text-sm text-blue-700">
                <strong>Terakhir diupdate:</strong> <span id="current-updated-at">-</span>
            </p>
        </div>
    </div>
    
    <!-- Update Location Form -->
    <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">✏️ Ubah Lokasi Hub</h3>
        
        <form id="hub-location-form" class="space-y-4">
            <!-- Hub Name -->
            <div>
                <label for="hub-name-input" class="block text-sm font-semibold text-gray-700 mb-2">
                    Nama Hub
                </label>
                <input 
                    type="text" 
                    id="hub-name-input"
                    value="SPX Soko Hub"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            
            <!-- Latitude -->
            <div>
                <label for="latitude-input" class="block text-sm font-semibold text-gray-700 mb-2">
                    Latitude <span class="text-red-500">*</span>
                </label>
                <input 
                    type="number" 
                    id="latitude-input"
                    step="0.000000000001"
                    min="-90"
                    max="90"
                    required
                    placeholder="-7.0861707572348545"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p class="text-xs text-gray-500 mt-1">Koordinat latitude (-90 sampai 90)</p>
            </div>
            
            <!-- Longitude -->
            <div>
                <label for="longitude-input" class="block text-sm font-semibold text-gray-700 mb-2">
                    Longitude <span class="text-red-500">*</span>
                </label>
                <input 
                    type="number" 
                    id="longitude-input"
                    step="0.000000000001"
                    min="-180"
                    max="180"
                    required
                    placeholder="111.97167733649127"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p class="text-xs text-gray-500 mt-1">Koordinat longitude (-180 sampai 180)</p>
            </div>
            
            <!-- Radius -->
            <div>
                <label for="radius-input" class="block text-sm font-semibold text-gray-700 mb-2">
                    Radius Maksimal (meter) <span class="text-red-500">*</span>
                </label>
                <input 
                    type="number" 
                    id="radius-input"
                    min="50"
                    max="10000"
                    value="500"
                    required
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">Radius area hub (50 - 10000 meter)</p>
            </div>
            
            <!-- Help Text -->
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p class="text-sm text-yellow-700">
                    <strong>💡 Tips:</strong> Gunakan Google Maps untuk mendapatkan koordinat latitude & longitude yang akurat.
                    Klik kanan pada lokasi di Google Maps → pilih koordinat untuk menyalin.
                </p>
            </div>
            
            <!-- Buttons -->
            <div class="flex space-x-3 pt-4">
                <button 
                    type="submit"
                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                    💾 Simpan Perubahan
                </button>
                <button 
                    type="button"
                    id="get-current-gps-btn"
                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                    📍 Gunakan Lokasi Saat Ini
                </button>
            </div>
        </form>
    </div>
</div>
```

---

### File: `frontend/src/js/admin.js`

Need to add:

```javascript
import { getHubLocation, updateHubLocation } from './api.js';
import { getCurrentPosition } from './gps.js';

// DOM Elements (add to getDOMElements)
let hubSettingsContent, currentHubName, currentLatitude, currentLongitude, currentRadius, currentUpdatedAt;
let hubLocationForm, hubNameInput, latitudeInput, longitudeInput, radiusInput, getCurrentGpsBtn;

async function loadHubSettings() {
    try {
        showLoading();
        
        const settings = await getHubLocation();
        
        // Update display
        currentHubName.textContent = settings.hub_name;
        currentLatitude.textContent = settings.latitude;
        currentLongitude.textContent = settings.longitude;
        currentRadius.textContent = `${settings.radius_meters} meter`;
        currentUpdatedAt.textContent = new Date(settings.updated_at).toLocaleString('id-ID');
        
        // Update form
        hubNameInput.value = settings.hub_name;
        latitudeInput.value = settings.latitude;
        longitudeInput.value = settings.longitude;
        radiusInput.value = settings.radius_meters;
        
        hideLoading();
        debugLog('Hub settings loaded');
        
    } catch (error) {
        errorLog('Failed to load hub settings', error);
        hideLoading();
        showNotification('Gagal memuat pengaturan lokasi: ' + getErrorMessage(error), 'error');
    }
}

async function handleHubLocationSubmit(e) {
    e.preventDefault();
    
    const hubName = hubNameInput.value.trim();
    const latitude = parseFloat(latitudeInput.value);
    const longitude = parseFloat(longitudeInput.value);
    const radius = parseInt(radiusInput.value);
    
    // Validation
    if (!hubName) {
        showNotification('Nama hub tidak boleh kosong', 'error');
        return;
    }
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        showNotification('Latitude harus antara -90 sampai 90', 'error');
        return;
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        showNotification('Longitude harus antara -180 sampai 180', 'error');
        return;
    }
    
    if (isNaN(radius) || radius < 50 || radius > 10000) {
        showNotification('Radius harus antara 50 sampai 10000 meter', 'error');
        return;
    }
    
    try {
        showLoading();
        
        await updateHubLocation({
            hub_name: hubName,
            latitude: latitude,
            longitude: longitude,
            radius_meters: radius,
            updated_by: 'Admin'
        });
        
        hideLoading();
        showNotification('Lokasi hub berhasil diupdate!', 'success');
        
        // Reload settings
        await loadHubSettings();
        
    } catch (error) {
        errorLog('Failed to update hub location', error);
        hideLoading();
        showNotification('Gagal mengupdate lokasi: ' + getErrorMessage(error), 'error');
    }
}

async function handleGetCurrentGPS() {
    try {
        showLoading();
        showNotification('Mendapatkan lokasi GPS...', 'info');
        
        const position = await getCurrentPosition();
        
        // Fill form with current GPS
        latitudeInput.value = position.latitude;
        longitudeInput.value = position.longitude;
        
        hideLoading();
        showNotification(`Lokasi GPS berhasil didapatkan! Akurasi: ${Math.round(position.accuracy)} meter`, 'success');
        
    } catch (error) {
        errorLog('Failed to get GPS position', error);
        hideLoading();
        showNotification('Gagal mendapatkan lokasi GPS: ' + error.message, 'error');
    }
}

// Setup event listeners
hubLocationForm.addEventListener('submit', handleHubLocationSubmit);
getCurrentGpsBtn.addEventListener('click', handleGetCurrentGPS);

// Load hub settings when tab is switched
document.querySelector('[data-tab="hub-settings"]').addEventListener('click', loadHubSettings);
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Apply Database Schema
```powershell
cd backend
npx wrangler d1 execute spx-soko-attendance-production --file=src/db/schema.sql --env=production
```

### Step 2: Deploy Backend
```powershell
npx wrangler deploy --env=production
```

### Step 3: Create Audio Files

Create folder and files:
```
frontend/audio/sukses.mp3
frontend/audio/gagal.mp3
```

You need actual MP3 audio files. Suggested:
- **sukses.mp3**: Pleasant "ding" or "success" chime (1-2 seconds)
- **gagal.mp3**: Warning "beep" or "error" sound (1-2 seconds)

### Step 4: Deploy Frontend
```powershell
cd ..
npx wrangler pages deploy frontend --project-name=spx-soko-attendance
```

---

## 🧪 TESTING

### Test Backend API:
```powershell
# Get hub location
curl https://YOUR-WORKER-URL/api/settings/hub-location

# Update hub location
curl -X PUT https://YOUR-WORKER-URL/api/settings/hub-location \
  -H "Content-Type: application/json" \
  -d '{"latitude":-7.086,"longitude":111.972,"radius_meters":500,"hub_name":"SPX Soko Hub"}'
```

### Test Frontend:
1. Open Admin Dashboard → "Atur Lokasi Hub" tab
2. Should display current hub location
3. Try updating coordinates
4. Click "Gunakan Lokasi Saat Ini" button

### Test Scanner GPS Validation:
1. Open scanner page (index.html)
2. Allow GPS permission
3. Face scan should:
   - Check GPS location
   - If outside 500m → Show RED popup + play gagal.mp3
   - If within 500m → Continue attendance + play sukses.mp3

---

## 📄 FILES SUMMARY

### Backend:
- ✅ `backend/src/db/schema.sql` - Added hub_settings table
- ✅ `backend/src/db/queries.js` - Added hub settings queries
- ✅ `backend/src/handlers/settings.js` - NEW FILE
- ✅ `backend/src/index.js` - Added routes

### Frontend:
- ✅ `frontend/src/js/gps.js` - NEW FILE (GPS utilities)
- ✅ `frontend/src/js/audio.js` - NEW FILE (Audio utilities)
- ✅ `frontend/src/js/api.js` - Added hub settings API calls
- ✅ `frontend/src/js/config.js` - Added SETTINGS_HUB_LOCATION endpoint
- ⏳ `frontend/src/js/scanner.js` - TODO: Add GPS validation
- ⏳ `frontend/admin.html` - TODO: Add Hub Settings tab
- ⏳ `frontend/src/js/admin.js` - TODO: Add hub settings logic
- ⏳ `frontend/audio/sukses.mp3` - TODO: Add audio file
- ⏳ `frontend/audio/gagal.mp3` - TODO: Add audio file

---

**STATUS: PART 1 COMPLETE ✅**
**NEXT: Implement Part 2 & 3** (Scanner integration + Admin dashboard)

Continue implementation?
