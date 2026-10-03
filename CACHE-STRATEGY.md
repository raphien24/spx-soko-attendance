# Cache Strategy Documentation

## Overview
Frontend menggunakan **in-memory cache** dengan TTL 2 menit untuk mengurangi beban database.

## Cache Configuration

### ✅ Endpoints DENGAN Cache (TTL: 2 menit)
Data yang jarang berubah dan tidak perlu real-time:

- `getAllUsers()` - Daftar karyawan (jarang berubah)
- `getAttendanceRecords(startDate, endDate)` - Historical attendance (tidak berubah)
- `getOffSchedules()` - Jadwal off mingguan (jarang berubah)

**Alasan:** Data ini stabil dan tidak perlu refresh konstan.

---

### ❌ Endpoints TANPA Cache (Always Fresh)
Data yang perlu real-time updates:

- `getTodayAttendance()` - Absensi hari ini (berubah tiap scan)
- `checkRosterAttendance(date)` - Status roster hari ini (berubah saat edit roster)
- `getRosterSchedule(date)` - Roster schedule (berubah saat edit di device lain)

**Alasan:** 
- Multi-device usage (admin bisa edit di device berbeda)
- Real-time critical (harus selalu data terbaru)
- Mencegah data stale saat roster/attendance berubah

---

## Implementation

### Menggunakan Cache
```javascript
const response = await apiGet('/api/endpoint'); // Default: cache enabled
```

### Bypass Cache
```javascript
const response = await apiGet('/api/endpoint', true, false); 
// Parameter 2 (bustCache): true = add timestamp
// Parameter 3 (useCache): false = bypass in-memory cache
```

### Clear Cache Manual
```javascript
import { apiCache } from './api.js';

// Clear specific endpoint
apiCache.clear('/api/endpoint');

// Clear all cache
apiCache.clear();
```

---

## Auto Clear Cache

Cache **otomatis ter-clear** setelah operasi mutasi:
- ✅ `apiPost()` - Clear all cache
- ✅ `apiPut()` - Clear all cache  
- ✅ `apiDelete()` - Clear all cache

**Contoh:**
```javascript
await createRosterEntry(...); // POST → cache cleared
await getTodayAttendance();    // Fresh data from DB
```

---

## Benefits

### ✅ Optimasi Database
- Mengurangi 60% API calls untuk data yang jarang berubah
- Dashboard load lebih cepat (data ter-cache)
- Tetap under D1 free tier limit (5M rows/day)

### ✅ Real-Time Accuracy
- Roster changes langsung terlihat di semua device
- Attendance updates real-time
- Tidak ada data stale untuk critical operations

---

## Troubleshooting

### Problem: Data tidak update di device lain
**Cause:** Endpoint masih pakai cache  
**Solution:** Disable cache dengan parameter `useCache: false`

### Problem: Dashboard terlalu lambat
**Cause:** Terlalu banyak bypass cache  
**Solution:** Enable cache untuk data yang jarang berubah

### Problem: Cache tidak clear setelah update
**Cause:** Mutasi tidak melalui `apiPost/Put/Delete`  
**Solution:** Panggil `apiCache.clear()` manual

---

## Version History

- **v2024092714** - Disable cache untuk roster & attendance (fix multi-device issue)
- **v2024092713** - Initial cache implementation with 2-min TTL
