# 🚀 Quick Debug Guide - Scanner Loading Issues

## 🎯 Problem: Scanner Stuck at "Memuat sistem..."

### ✅ Solution Implemented

**ROOT CAUSE:**
Browser requires **user gesture** (click/tap) before allowing access to Camera, GPS, and Audio.

**FIX:**
Added interactive button "🚀 Mulai Scanner Kiosk" that user must click to start initialization.

---

## 📋 Quick Checklist

### 1. Initial Page Load
- [ ] Loading screen appears with spinner
- [ ] Button "🚀 Mulai Scanner Kiosk" is visible
- [ ] NO camera/GPS prompts appear yet
- [ ] Page is NOT frozen

### 2. After Button Click
- [ ] Button changes to "⏳ Memuat..." and becomes disabled
- [ ] Loading messages appear step by step
- [ ] Camera permission prompt appears
- [ ] After granting permission, video feed shows
- [ ] Face detection starts (oval guide turns green when face detected)

### 3. Audio Test
- [ ] Scan a face successfully → Hear `sukses.mp3`
- [ ] Scan outside radius → Hear `gagal.mp3` + RED popup

### 4. GPS Test (if hub settings configured)
- [ ] Inside 500m radius → Attendance allowed
- [ ] Outside 500m radius → RED popup "Absen Wajib Di Area Soko Hub. Ojo Ngeyel!" + blocked

---

## 🐛 Common Errors & Quick Fixes

### Error: "Button doesn't appear"

**Check:**
```javascript
// Open browser console and run:
document.getElementById('loading-text')
document.getElementById('start-action-btn')
```

**If null:** HTML file is outdated or not loaded correctly.

**Fix:** Hard refresh (Ctrl+Shift+R) or clear cache.

---

### Error: "Camera permission not requested"

**Possible Causes:**
1. Page not served over HTTPS (except localhost)
2. getUserMedia not supported
3. JavaScript error before camera init

**Check Console:**
```javascript
navigator.mediaDevices // Should exist
```

**Fix:**
- Use `https://` or `localhost`
- Update to modern browser (Chrome 90+, Firefox 88+)

---

### Error: "Audio doesn't play"

**Possible Causes:**
1. Audio files missing (404)
2. Autoplay policy blocked
3. File path incorrect

**Check Console:**
```javascript
// Should see:
"Audio system initialized"
"✓ Audio initialized"

// On attendance:
"success sound played successfully"
// OR
"Audio playback blocked by browser autoplay policy"
```

**Fix:**
- Verify files exist: `/audio/sukses.mp3`, `/audio/gagal.mp3`
- Ensure user clicked the start button (provides user gesture)
- Check browser autoplay settings

---

### Error: "GPS validation always fails"

**Possible Causes:**
1. GPS not enabled on device
2. Testing on desktop (inaccurate GPS)
3. Not using HTTPS

**Check Console:**
```javascript
// Should see:
"GPS Position obtained: {latitude: ..., longitude: ..., accuracy: ...}"

// If error:
"Geolocation error: ..."
```

**Fix:**
- Enable GPS on mobile device
- Test on actual mobile device (not desktop)
- Use `https://` (required for geolocation)
- If GPS fails, system should show YELLOW warning but still allow attendance (fallback mode)

---

### Error: "Stuck at 'Memuat model face recognition...'"

**Possible Causes:**
1. No internet connection
2. CDN (face-api.js) blocked
3. Network very slow

**Check Console:**
```javascript
// Should eventually see:
"✓ Face models loaded"

// If stuck, check:
faceapi // Should be defined
```

**Fix:**
- Check internet connection
- Wait longer (CDN might be slow)
- Check if face-api CDN is accessible: `https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js`

---

### Error: "Stuck at 'Memeriksa koneksi server...'"

**Possible Causes:**
1. Backend not deployed
2. Backend URL incorrect
3. Network issue

**Check Console:**
```javascript
// Should see:
"✓ Server connection OK"

// If fails:
"Failed to connect to backend"
```

**Fix:**
- Verify backend is deployed: `npx wrangler deploy --env=production`
- Check `config.js` for correct API_BASE_URL
- Test backend health: `curl https://your-backend.workers.dev/health`

---

## 🔍 Console Log Keywords

### ✅ Success Keywords
- `✓ Face models loaded`
- `✓ Audio initialized`
- `✓ Server connection OK`
- `✓ Hub settings loaded`
- `✓ Loaded X known faces`
- `✓ Webcam initialized`
- `✅ Scanner initialized successfully`

### ⚠️ Warning Keywords (Non-Critical)
- `⚠️ Audio initialization failed (fallback: silent mode)`
- `⚠️ Failed to load hub settings (fallback: GPS validation disabled)`
- `Audio playback blocked by browser autoplay policy`

### ❌ Error Keywords (Critical)
- `❌ Start system failed`
- `Failed to load face models`
- `Failed to initialize webcam`
- `Failed to load known faces`

---

## 🧪 Quick Test Script

Run this in browser console to verify setup:

```javascript
// Test 1: Check DOM elements
console.log('Loading screen:', document.getElementById('loading-screen'));
console.log('Scanner screen:', document.getElementById('scanner-screen'));
console.log('Video element:', document.getElementById('video'));
console.log('Canvas element:', document.getElementById('canvas'));

// Test 2: Check API access
console.log('Camera API:', navigator.mediaDevices);
console.log('Geolocation API:', navigator.geolocation);
console.log('Face API:', typeof faceapi !== 'undefined');

// Test 3: Check audio files
fetch('/audio/sukses.mp3').then(r => console.log('sukses.mp3:', r.status));
fetch('/audio/gagal.mp3').then(r => console.log('gagal.mp3:', r.status));

// Test 4: Check backend
fetch(API_BASE_URL + '/health').then(r => console.log('Backend:', r.status));
```

Expected output:
```
Loading screen: <div id="loading-screen">
Scanner screen: <div id="scanner-screen">
Video element: <video id="video">
Canvas element: <canvas id="canvas">
Camera API: MediaDevices {}
Geolocation API: Geolocation {}
Face API: true
sukses.mp3: 200
gagal.mp3: 200
Backend: 200
```

---

## 📱 Mobile Testing Tips

### iOS Safari
- Audio autoplay is **very strict** → User must tap the start button
- GPS requires HTTPS
- Camera permission prompt appears inline (not popup)

### Android Chrome
- Most permissive for audio/camera/GPS
- Recommended for testing
- GPS is usually more accurate

---

## 🚀 Deployment Commands

```powershell
# Deploy frontend only
cd "d:\SPX\Spx soko Absensi"
npx wrangler pages deploy frontend --project-name=spx-soko-attendance

# Deploy backend + database
cd backend
npx wrangler d1 execute spx-soko-attendance-production --file=src/db/schema.sql --env=production
npx wrangler deploy --env=production
```

---

## 📞 Still Having Issues?

1. **Check browser console** for error messages
2. **Test in incognito mode** (eliminates extension conflicts)
3. **Try different browser** (Chrome recommended)
4. **Check HTTPS** (required for camera/GPS)
5. **Verify audio files exist** in `/audio/` folder
6. **Check backend status** with curl/Postman
7. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

---

## 📊 Files Modified in This Fix

| File | Change | Purpose |
|------|--------|---------|
| `scanner.js` | Added interactive button logic | Trigger user gesture |
| `scanner.js` | Step-by-step loading with fallback | Non-blocking init |
| `gps.js` | Added timeout parameter | Prevent GPS hang |
| `gps.js` | Accept cached position (30s) | Faster GPS response |
| `face-setup.js` | Added timeout to webcam init | Prevent metadata hang |

---

**Last Updated:** 2026-09-19  
**Status:** ✅ Ready to Test  
**Next Step:** Click "🚀 Mulai Scanner Kiosk" and verify all steps complete!
