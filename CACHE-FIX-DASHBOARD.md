# Fix: Dashboard Cache Issue - "Hadir Hari Ini" Menampilkan Data Lama

## Masalah
Dashboard menampilkan **8 orang "Hadir Hari Ini"** padahal sudah berganti hari dan belum ada yang absen hari ini (26 September 2026).

## Root Cause
**Browser Cache** - Browser menyimpan response API lama dan tidak fetch data baru dari server meskipun sudah berganti hari.

### Bukti:
1. Database production hanya punya data sampai 25 September (kemarin):
   ```
   2026-09-25: 22 records (kemarin)
   2026-09-26: 0 records  (hari ini - belum ada)
   ```

2. Dashboard masih menampilkan 8 orang (data lama ter-cache)

3. Backend query sudah benar menggunakan WIB timezone:
   ```sql
   SELECT * FROM attendance_logs 
   WHERE substr(timestamp, 1, 10) = '2026-09-26'
   ```

## Solusi Implementasi

### 1. **Cache-Busting di Frontend API Calls**
Menambahkan timestamp ke setiap GET request untuk mencegah browser caching.

**File: `frontend/src/js/api.js`**
```javascript
async function apiGet(endpoint, bustCache = true) {
    let url = getApiUrl(endpoint);
    
    // Add timestamp to prevent browser caching
    if (bustCache) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}_t=${Date.now()}`;
    }
    
    return apiFetch(url, { method: 'GET' });
}
```

**Hasil:**
- Setiap request jadi unique: `/api/attendance/today?_t=1727289723491`
- Browser tidak bisa pakai cached response karena URL selalu berbeda

### 2. **No-Cache Headers di Backend Response**
Menambahkan HTTP headers untuk instruksi browser agar tidak cache response.

**File: `backend/src/utils/cors.js`**
```javascript
function corsResponse(request, data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
            // Prevent browser caching
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...corsHeaders
        }
    });
}
```

**Header Explanation:**
- `Cache-Control: no-store, no-cache` - Browser TIDAK boleh simpan cache
- `max-age=0` - Cache expired immediately
- `Pragma: no-cache` - Backward compatibility untuk HTTP/1.0
- `Expires: 0` - Cache sudah expired

### 3. **Auto-Refresh Dashboard**
Dashboard otomatis refresh setiap 30 detik untuk memastikan data selalu up-to-date.

**File: `frontend/src/js/admin.js`**
```javascript
function startAutoRefresh() {
    autoRefreshInterval = setInterval(async () => {
        if (currentTab === 'dashboard') {
            debugLog('[Auto-Refresh] Refreshing dashboard data...');
            await loadDashboardData();
        }
    }, 30000); // 30 seconds
}
```

**Benefit:**
- Data "Hadir Hari Ini" otomatis update tanpa perlu manual refresh
- User selalu lihat data real-time
- Saat berganti hari (00:00 WIB), card otomatis reset ke 0

### 4. **Auto-Start After PIN Login**
```javascript
pinForm.addEventListener('submit', async (e) => {
    if (pinInput.value === '12345') {
        await loadDashboardData();
        startAutoRefresh(); // 👈 Start auto-refresh
    }
});
```

## Testing & Verification

### 1. Test Cache-Busting
Buka browser DevTools → Network tab:
- Setiap request harus punya parameter `_t=` berbeda
- Response headers harus ada `Cache-Control: no-cache`
- Status Code: `200 OK` (bukan `304 Not Modified`)

### 2. Test Auto-Refresh
- Buka dashboard
- Tunggu 30 detik
- Cek Console logs: harus muncul `[Auto-Refresh] Refreshing dashboard data...`
- Cek Network tab: harus ada new request setiap 30 detik

### 3. Test Timezone Correctness
```bash
# Cek data di database
npx wrangler d1 execute spx-soko-attendance-production --remote \
  --command "SELECT substr(timestamp, 1, 10) as date, COUNT(*) FROM attendance_logs GROUP BY date ORDER BY date DESC LIMIT 3"
```

Expected output (hari ini 26 Sept):
```
2026-09-26: 0   (hari ini - belum ada)
2026-09-25: 22  (kemarin)
2026-09-24: 74  (2 hari lalu)
```

### 4. Test Fresh Browser
Hard reload untuk bypass cache lama:
1. Buka browser DevTools (F12)
2. Klik kanan tombol Reload
3. Pilih **"Empty Cache and Hard Reload"**
4. Dashboard harus show data correct

## Deployment Commands

```powershell
cd "d:\SPX\Spx soko Absensi"

# 1. Deploy frontend dengan cache-busting
npx wrangler pages deploy frontend --project-name=spx-soko-attendance

# 2. Deploy backend dengan no-cache headers
cd backend
npx wrangler deploy --env=production

# 3. Verify deployment
# Frontend: https://absensi.spxsoko.online
# Backend: https://spx-soko-attendance-api-production.spxsoko.workers.dev
```

## Expected Behavior After Fix

### Skenario 1: Dashboard Baru Dibuka
- Browser fetch data dari server (tidak pakai cache)
- "Hadir Hari Ini" = 0 (jika belum ada yang absen)
- Auto-refresh start setiap 30 detik

### Skenario 2: Ada Absensi Baru
- Employee scan wajah → backend save
- Max 30 detik kemudian, dashboard auto-update
- Card "Hadir Hari Ini" increment +1

### Skenario 3: Berganti Hari (Midnight)
- Server query filter by date: `substr(timestamp, 1, 10) = '2026-09-26'`
- Database return 0 records (karena hari baru)
- Dashboard card reset ke 0

## Files Modified
1. `frontend/src/js/api.js` - Added cache-busting parameter
2. `backend/src/utils/cors.js` - Added no-cache headers
3. `frontend/src/js/admin.js` - Added auto-refresh every 30s

## Database Query Logic (Already Correct)

**Backend: `backend/src/db/queries.js`**
```javascript
async function getAllTodayLogs(db) {
    // Get current date in WIB timezone
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const today = wibTime.toISOString().split('T')[0]; // YYYY-MM-DD in WIB
    
    const stmt = db.prepare(
        `SELECT * FROM attendance_logs 
         WHERE substr(timestamp, 1, 10) = ? 
         ORDER BY timestamp DESC`
    );
    
    return await stmt.bind(today).all();
}
```

**Logic:**
1. Ambil waktu UTC: `2026-09-25T18:00:00.000Z`
2. Convert ke WIB (+7): `2026-09-26T01:00:00.000Z`
3. Extract date: `2026-09-26`
4. Query filter: `substr(timestamp, 1, 10) = '2026-09-26'`
5. Return only records hari ini (WIB)

## Troubleshooting

### Jika masih muncul data lama setelah deploy:
1. **Clear Browser Cache:**
   - Chrome: Ctrl + Shift + Delete → Clear browsing data
   - Or: Hard Reload (Ctrl + F5)

2. **Verify API Response:**
   ```bash
   curl "https://spx-soko-attendance-api-production.spxsoko.workers.dev/api/attendance/today"
   ```
   - Check `count` field (should be 0 if no attendance today)
   - Check response headers for `Cache-Control`

3. **Check Console Logs:**
   - Open DevTools → Console
   - Look for `[Auto-Refresh]` logs every 30 seconds
   - Check API request URLs for `_t=` parameter

4. **Verify Database:**
   ```bash
   npx wrangler d1 execute spx-soko-attendance-production --remote \
     --command "SELECT * FROM attendance_logs WHERE substr(timestamp, 1, 10) = '2026-09-26'"
   ```

## Performance Impact
- **Cache-busting:** Minimal impact (~1-2ms per request)
- **No-cache headers:** No performance impact (just HTTP headers)
- **Auto-refresh:** 1 API call every 30s when on dashboard (acceptable)

## Alternative Solutions (Not Implemented)
1. **Service Worker** - More complex setup
2. **WebSocket** - Real-time but overkill for this use case
3. **Shorter refresh (10s)** - More server load, not needed
4. **Manual refresh button** - Poor UX, users forget to click

## Conclusion
Masalah **"Hadir Hari Ini menampilkan data lama"** disebabkan oleh **browser cache**.

**Solusi 3-layer:**
1. ✅ Cache-busting URL parameter (frontend)
2. ✅ No-cache HTTP headers (backend)
3. ✅ Auto-refresh every 30s (frontend)

Backend timezone logic sudah 100% benar menggunakan WIB.

---
**Date:** 26 September 2026  
**Status:** ✅ Fixed & Deployed  
**Production:** https://absensi.spxsoko.online
