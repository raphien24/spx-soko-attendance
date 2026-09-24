# 🕐 Deploy WIB Timezone Fix

## Perubahan yang Dibuat

### ✅ 1. Time Generation (WIB/UTC+7)
**File**: `backend/src/utils/time.js`
- Semua fungsi timestamp sekarang generate waktu WIB (+7 jam dari UTC)
- Format: `2026-09-19T17:30:45.123+07:00`

### ✅ 2. Database Queries (WIB Date Matching)  
**File**: `backend/src/db/queries.js`
- Semua query `date(timestamp)` diganti `substr(timestamp, 1, 10)`
- Kalkulasi "hari ini" menggunakan WIB timezone
- Fungsi yang diupdate:
  - `getTodayAttendance()` 
  - `getAllTodayLogs()`
  - `getAttendanceByDateRange()`
  - `countUserLogsOnDate()`
  - `getLastScanTypeToday()`

### ✅ 3. Duplicate Check Enhancement
**File**: `backend/src/handlers/attendance.js`  
- Logging untuk debug
- Menggunakan WIB date untuk check duplikat

## 🚀 Cara Deploy

```bash
cd backend
npx wrangler deploy
```

Atau kalau ada masalah:
```bash
cd backend
npm run deploy
```

## ✅ Cara Test

### Test 1: Scan Normal
1. Scan wajah pertama kali → ✅ Berhasil
2. Lihat timestamp di admin dashboard → harus WIB (jam Indonesia)

### Test 2: Duplicate Block
1. Scan wajah yang sama lagi di hari yang sama → ❌ Ditolak
2. Pesan error: "Absensi hari ini sudah tercatat pada [waktu WIB]"

### Test 3: Check Cloudflare Logs
Dashboard → Workers → Logs (real-time):
```
[Duplicate Check] User xxx - Existing records today: 1
[Duplicate Block] Rejecting duplicate scan...
```

## 🎯 Expected Results

| Waktu UTC | Waktu WIB | Tanggal Recorded |
|-----------|-----------|------------------|
| 17:00 | 00:00 (hari +1) | Hari +1 ✅ |
| 03:00 | 10:00 | Hari yang sama ✅ |
| 15:00 | 22:00 | Hari yang sama ✅ |

## ⚠️ IMPORTANT

**Deploy backend dulu sebelum test!** Perubahan hanya di backend, frontend tidak perlu deploy ulang.

## Files Changed
- `backend/src/utils/time.js`
- `backend/src/db/queries.js`
- `backend/src/handlers/attendance.js`
