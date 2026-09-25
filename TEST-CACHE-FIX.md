# Testing Guide: Cache Fix untuk Dashboard

## Masalah yang Diperbaiki
Dashboard menampilkan **8 orang "Hadir Hari Ini"** padahal sudah berganti hari (26 September) dan belum ada yang absen.

**Root Cause:** Browser menyimpan response API lama (cached data dari tanggal 25 September)

## Fix yang Diimplementasi
1. ✅ **Cache-busting** - URL parameter timestamp unik untuk setiap request
2. ✅ **No-cache headers** - Backend mengirim headers agar browser tidak cache
3. ✅ **Auto-refresh** - Dashboard otomatis refresh setiap 30 detik

## Cara Testing

### Step 1: Clear Browser Cache (PENTING!)
Sebelum test, **WAJIB** clear cache lama:

**Chrome/Edge:**
1. Buka https://absensi.spxsoko.online
2. Tekan **F12** (buka DevTools)
3. Klik kanan tombol Reload di browser
4. Pilih **"Empty Cache and Hard Reload"**

**Atau:**
- Tekan **Ctrl + Shift + Delete**
- Pilih "Cached images and files"
- Time range: "All time"
- Klik "Clear data"

### Step 2: Cek Dashboard
1. Login dengan PIN: `12345`
2. Lihat card **"Hadir Hari Ini"**
3. **Expected result:** Harus menampilkan **0** (karena hari ini belum ada yang absen)

### Step 3: Verify Cache-Busting di Network Tab
1. Buka DevTools → Tab **Network**
2. Reload halaman dashboard
3. Cari request ke `/api/attendance/today`
4. **Expected:** URL harus ada parameter `?_t=1727289723491` (timestamp)
5. Setiap refresh, timestamp harus **berbeda**

### Step 4: Verify No-Cache Headers
Di Network tab, klik request `/api/attendance/today`:
1. Pilih tab **Headers**
2. Scroll ke **Response Headers**
3. **Expected headers:**
   ```
   Cache-Control: no-store, no-cache, must-revalidate, max-age=0
   Pragma: no-cache
   Expires: 0
   ```

### Step 5: Verify Auto-Refresh
1. Buka DevTools → Tab **Console**
2. Tunggu 30 detik
3. **Expected log:**
   ```
   [Auto-Refresh] Refreshing dashboard data...
   [Auto-Refresh] Dashboard data refreshed successfully
   ```
4. Di tab Network, harus muncul request baru setiap 30 detik

### Step 6: Test Skenario Absensi Baru
1. Buka halaman Scanner (index.html) di tab baru
2. Scan wajah employee untuk absen
3. Kembali ke Dashboard
4. **Expected:** Dalam max 30 detik, card "Hadir Hari Ini" otomatis update +1

## Verifikasi Database (For Developer)

Cek data di production database:
```powershell
cd "d:\SPX\Spx soko Absensi\backend"

# Cek data hari ini (26 Sept)
npx wrangler d1 execute spx-soko-attendance-production --remote `
  --command "SELECT * FROM attendance_logs WHERE substr(timestamp, 1, 10) = '2026-09-26'"

# Cek grouping by date
npx wrangler d1 execute spx-soko-attendance-production --remote `
  --command "SELECT substr(timestamp, 1, 10) as date, COUNT(*) as count FROM attendance_logs GROUP BY date ORDER BY date DESC LIMIT 5"
```

**Expected output:**
```
2026-09-26: 0   (hari ini - belum ada)
2026-09-25: 22  (kemarin)
2026-09-24: 74  (2 hari lalu)
```

## Expected Behavior Setelah Fix

### ✅ Dashboard Pertama Kali Dibuka
- Data **TIDAK** dari cache
- "Hadir Hari Ini" = jumlah yang benar sesuai database
- Auto-refresh mulai berjalan

### ✅ Ada Absensi Baru
- Employee scan wajah
- Backend save ke database
- Dashboard auto-update dalam 30 detik (tanpa manual refresh)

### ✅ Berganti Hari (Midnight 00:00 WIB)
- Backend query filter by tanggal hari ini
- Database return 0 records (hari baru)
- Dashboard card reset ke 0

### ✅ Browser Refresh
- Request ke server dengan URL baru (timestamp berbeda)
- Browser **TIDAK pakai** cached response
- Data selalu fresh dari database

## Troubleshooting

### Masalah: Masih muncul data lama
**Solusi:**
1. Hard reload: Ctrl + F5
2. Clear cache: Ctrl + Shift + Delete
3. Gunakan Incognito mode untuk test

### Masalah: Auto-refresh tidak jalan
**Cek:**
1. Console logs - harus ada `[Auto-Refresh]` setiap 30 detik
2. Pastikan tidak ada error di Console
3. Pastikan ada koneksi internet

### Masalah: Network error
**Cek:**
1. Backend deployed: https://spx-soko-attendance-api-production.spxsoko.workers.dev
2. Frontend deployed: https://absensi.spxsoko.online
3. CORS headers sudah benar (absensi.spxsoko.online di allowed origins)

## Files yang Dimodifikasi
1. `frontend/src/js/api.js` - Cache-busting parameter
2. `backend/src/utils/cors.js` - No-cache headers
3. `frontend/src/js/admin.js` - Auto-refresh function

## Production URLs
- **Frontend:** https://absensi.spxsoko.online
- **Backend:** https://spx-soko-attendance-api-production.spxsoko.workers.dev
- **GitHub:** https://github.com/raphien24/spx-soko-attendance

## Status
✅ **DEPLOYED** - 26 September 2026  
📝 Commit: `50efd3e`  
🚀 Ready for testing

---

**Note:** Jika setelah clear cache masih ada masalah, tunggu 1-2 menit untuk CDN propagation, kemudian test lagi.
