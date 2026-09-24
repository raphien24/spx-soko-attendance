# Implementasi WIB Timezone (UTC+7) - Jakarta Time

## Overview
Seluruh sistem attendance sekarang menggunakan **WIB (Waktu Indonesia Barat) / UTC+7** untuk semua operasi timestamp dan date matching.

## Perubahan Backend

### 1. **Time Utility Functions** (`backend/src/utils/time.js`)

#### Konstanta WIB
```javascript
const WIB_OFFSET_HOURS = 7;
const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000;
```

#### Fungsi Utama yang Diubah:

**`getCurrentISOTimestamp()`** - Sekarang return WIB time
```javascript
// BEFORE (UTC)
return new Date().toISOString(); // 2026-09-19T03:30:45.123Z

// AFTER (WIB)
return '2026-09-19T10:30:45.123+07:00'; // +7 jam dari UTC
```

**`getTodayDateString()`** - Sekarang return tanggal WIB
```javascript
// BEFORE (UTC)
const now = new Date();
return now.toISOString().split('T')[0]; // Bisa salah kalau malam

// AFTER (WIB)
const wibTime = new Date(now.getTime() + WIB_OFFSET_MS);
return wibTime.toISOString().split('T')[0]; // Selalu benar untuk WIB
```

**`getCurrentTimeString()`** - Sekarang return waktu WIB
```javascript
// BEFORE (UTC): 03:30:45
// AFTER (WIB): 10:30:45 (UTC + 7 jam)
```

### 2. **Database Queries** (`backend/src/db/queries.js`)

#### Semua Query Date Matching Diubah:

**`getTodayAttendance(db, userId)`**
```javascript
// Hitung tanggal hari ini dalam WIB
const now = new Date();
const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
const today = wibTime.toISOString().split('T')[0]; // YYYY-MM-DD in WIB

// Gunakan substr() bukan date() untuk ekstrak tanggal dari timestamp
const stmt = db.prepare(
    `SELECT * FROM attendance_logs 
     WHERE user_id = ? AND substr(timestamp, 1, 10) = ? 
     ORDER BY timestamp ASC`
);
```

**Perubahan dari `date()` ke `substr()`:**
- ❌ `date(timestamp)` - Fungsi SQLite yang bisa salah interpretasi timezone
- ✅ `substr(timestamp, 1, 10)` - Ekstrak YYYY-MM-DD langsung dari string timestamp

**Query yang Diupdate:**
1. ✅ `getTodayAttendance()` - Cek absensi hari ini per user
2. ✅ `getAllTodayLogs()` - Semua absensi hari ini
3. ✅ `getAttendanceByDateRange()` - Range tanggal
4. ✅ `countUserLogsOnDate()` - Hitung absensi per tanggal
5. ✅ `getLastScanTypeToday()` - Scan terakhir hari ini

### 3. **Attendance Handler** (`backend/src/handlers/attendance.js`)

Duplicate check sekarang menggunakan WIB date:
```javascript
// Generate server-side timestamp dengan WIB
const serverTimestamp = getCurrentISOTimestamp(); // Returns WIB time

// Check duplicate menggunakan WIB date
const existingToday = await getTodayAttendance(env.DB, user_id);
// Query ini sekarang pakai WIB timezone untuk "today"
```

## Format Timestamp

### Database Storage Format
Timestamp disimpan dalam format:
```
2026-09-19T10:30:45.123+07:00
```
- `2026-09-19` = Tanggal WIB
- `T10:30:45.123` = Waktu WIB
- `+07:00` = Timezone indicator (WIB = UTC+7)

### Extract Date dengan `substr()`
```sql
substr(timestamp, 1, 10)
```
Hasil: `2026-09-19` (langsung dari string timestamp WIB)

## Contoh Skenario

### Skenario: Scan di malam hari
**Waktu Server UTC**: 2026-09-18 17:30:00 (jam 5 sore UTC)  
**Waktu WIB**: 2026-09-19 00:30:00 (jam 12 malam WIB = hari berikutnya!)

#### Sistem LAMA (UTC):
- ❌ Tanggal dicatat: 2026-09-18
- ❌ Padahal di Jakarta sudah tanggal 19!

#### Sistem BARU (WIB):
- ✅ Timestamp: `2026-09-19T00:30:00.000+07:00`
- ✅ Date extract: `2026-09-19`
- ✅ Benar sesuai waktu Jakarta!

### Skenario: Duplicate Check
User scan 2x di hari yang sama (WIB):

**Scan 1**: 19 Sep 2026 08:00 WIB
- Timestamp: `2026-09-19T08:00:00.000+07:00`
- Extract date: `2026-09-19`
- ✅ Disimpan

**Scan 2**: 19 Sep 2026 17:00 WIB (9 jam kemudian)
- Timestamp: `2026-09-19T17:00:00.000+07:00`
- Extract date: `2026-09-19`
- Query check: `substr(timestamp, 1, 10) = '2026-09-19'`
- ❌ **DITOLAK** - Sudah ada absensi hari ini!

## Frontend (Sudah Compatible)

Frontend `admin.js` sudah ada fungsi WIB conversion:
```javascript
// admin.js - getExactWIBDateString()
function getExactWIBDateString(isoTimestamp) {
    const date = new Date(isoTimestamp);
    const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return wibDate.toISOString().split('T')[0];
}
```

Fungsi ini tetap berfungsi karena:
- Backend sekarang kirim timestamp WIB
- Frontend extract date dari timestamp WIB
- Hasilnya konsisten!

## Testing Checklist

### ✅ Test 1: Timestamp Generation
```bash
# Deploy backend
cd backend
npx wrangler deploy

# Check logs saat scan
# Timestamp harus format: YYYY-MM-DDTHH:MM:SS.mmm+07:00
```

### ✅ Test 2: Same-Day Detection
1. Scan wajah jam 08:00 WIB → Berhasil
2. Scan wajah yang sama jam 17:00 WIB → Ditolak (hari yang sama)
3. Scan wajah jam 01:00 WIB esok hari → Berhasil (hari berbeda)

### ✅ Test 3: Midnight Edge Case
Test di sekitar jam 23:45 - 00:15 WIB:
- Scan jam 23:50 → Date: hari ini
- Scan jam 00:05 (15 menit kemudian) → Date: hari besok
- Keduanya harus dianggap hari berbeda ✅

### ✅ Test 4: Date Range Filter
Di halaman "Riwayat Absensi":
- Filter tanggal 19-20 Sep 2026
- Harus tampil semua scan di tanggal WIB tersebut
- Tidak terpengaruh UTC offset

## Deploy Instructions

### 1. Deploy Backend
```bash
cd backend
npx wrangler deploy
```

### 2. Verify Logs
Di Cloudflare Dashboard → Workers → Logs:
```
[Duplicate Check] User xxx - Existing records today: 0
[Duplicate Check] User xxx - No existing records, proceeding with scan
Recording attendance with timestamp: 2026-09-19T10:30:45.123+07:00
```

### 3. Test Duplicate
- Scan 2x dengan user yang sama
- Log kedua harus tampil:
```
[Duplicate Check] User xxx - Existing records today: 1
[Duplicate Block] Rejecting duplicate scan for user xxx. First scan at: 2026-09-19T08:00:00.000+07:00
```

## Files Modified

### Backend
- ✅ `backend/src/utils/time.js` - WIB timestamp generation
- ✅ `backend/src/db/queries.js` - WIB date matching dengan substr()
- ✅ `backend/src/handlers/attendance.js` - Logging & duplicate check

### Frontend
- ℹ️ Tidak perlu diubah - sudah compatible dengan WIB timestamps

## Rollback Plan

Jika ada masalah, kembalikan 3 fungsi di `time.js`:
```javascript
// Rollback ke UTC
function getCurrentISOTimestamp() {
    return new Date().toISOString();
}
```

Dan queries di `queries.js`:
```sql
-- Rollback dari substr() ke date()
WHERE date(timestamp) = ?
```

## Summary

| Aspek | Before | After |
|-------|--------|-------|
| Server Timezone | UTC (Z) | WIB (+07:00) |
| Timestamp Format | `...T03:30:45Z` | `...T10:30:45+07:00` |
| Date Extraction | `date(timestamp)` | `substr(timestamp, 1, 10)` |
| Today Calculation | UTC date | WIB date |
| Duplicate Check | ❌ Bisa salah | ✅ Akurat |
| Midnight Edge Case | ❌ Bermasalah | ✅ Benar |

🎯 **Sistem sekarang 100% WIB-native!**
