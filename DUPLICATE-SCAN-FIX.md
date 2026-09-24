# Fix Duplicate Scan Issue

## Masalah
Double scan masih masuk ke database padahal seharusnya diblokir.

## Root Cause
Query `date(timestamp)` di SQLite bisa gagal jika format timestamp tidak konsisten atau ada masalah timezone.

## Solusi yang Diterapkan

### 1. Backend - Perbaikan Query (`backend/src/db/queries.js`)

**File**: `backend/src/db/queries.js`

**Perubahan**: Fungsi `getTodayAttendance` diubah dari:
```javascript
// BEFORE (Bermasalah)
const stmt = db.prepare(
    `SELECT * FROM attendance_logs 
     WHERE user_id = ? AND date(timestamp) = ? 
     ORDER BY timestamp ASC`
);
```

Menjadi:
```javascript
// AFTER (Lebih robust)
const stmt = db.prepare(
    `SELECT * FROM attendance_logs 
     WHERE user_id = ? AND substr(timestamp, 1, 10) = ? 
     ORDER BY timestamp ASC`
);
```

**Alasan**: 
- Menggunakan `substr(timestamp, 1, 10)` untuk ekstrak bagian tanggal (YYYY-MM-DD) dari ISO timestamp
- Lebih reliable daripada fungsi `date()` yang bisa terpengaruh timezone
- Timestamp server dibuat dengan `new Date().toISOString()` yang format UTC

### 2. Backend - Logging untuk Debug (`backend/src/handlers/attendance.js`)

**Perubahan**: Ditambahkan console.log untuk tracking:
```javascript
// Block duplicate attendance on the same day — keep the earliest scan
const existingToday = await getTodayAttendance(env.DB, user_id);
console.log(`[Duplicate Check] User ${user_id} - Existing records today:`, existingToday.length);

if (existingToday.length > 0) {
    const earliest = existingToday[0];
    console.log(`[Duplicate Block] Rejecting duplicate scan for user ${user_id}. First scan at: ${earliest.timestamp}`);
    return corsErrorResponse(
        request,
        `Absensi hari ini sudah tercatat pada ${earliest.timestamp}. Hanya absensi pertama yang diterima.`,
        409
    );
}

console.log(`[Duplicate Check] User ${user_id} - No existing records, proceeding with scan`);
```

**Manfaat**:
- Bisa lihat di Cloudflare Workers logs apakah duplicate check berjalan
- Debug apakah query mengembalikan hasil yang benar

## Cara Deploy

### Backend (API)
```bash
cd backend
npx wrangler deploy
```

### Cara Test
1. Scan wajah pertama kali → harus berhasil
2. Scan wajah yang sama lagi di hari yang sama → harus ditolak dengan error 409
3. Pesan error: "Absensi hari ini sudah tercatat pada [timestamp]. Hanya absensi pertama yang diterima."

### Debug di Cloudflare Dashboard
1. Buka Cloudflare Dashboard → Workers & Pages
2. Pilih worker `spx-soko-attendance-backend`
3. Tab "Logs" → Real-time logs
4. Coba scan wajah 2x, lihat log:
   - `[Duplicate Check] User xxx - Existing records today: 0` (scan pertama)
   - `[Duplicate Check] User xxx - Existing records today: 1` (scan kedua)
   - `[Duplicate Block] Rejecting duplicate scan...` (scan kedua ditolak)

## Files Modified
- ✅ `backend/src/db/queries.js` - Perbaikan query getTodayAttendance
- ✅ `backend/src/handlers/attendance.js` - Tambah logging dan duplicate check validation

## Next Steps
1. Deploy backend dengan `npx wrangler deploy` dari folder `backend/`
2. Test scan wajah 2x untuk user yang sama
3. Cek logs di Cloudflare dashboard jika masih ada masalah
4. Jika masih gagal, screenshot logs dan timestamp di database untuk analisa lebih lanjut
