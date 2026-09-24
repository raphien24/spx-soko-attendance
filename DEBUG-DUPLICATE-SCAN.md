# 🐛 Debug Duplicate Scan Issue

## Status
Duplicate scan masih belum terblock setelah implementasi WIB timezone.

## Perubahan Terbaru (Intensive Logging)

### 1. Enhanced Logging - `backend/src/handlers/attendance.js`
```javascript
// Sebelum check duplicate
console.log(`[Duplicate Check] User ${user_id}`);
console.log(`[Duplicate Check] Existing records found:`, existingToday.length);

// Jika ada duplicate
console.log(`[Duplicate Check] First existing record:`, JSON.stringify(existingToday[0]));
console.log(`[Duplicate Block] ❌ REJECTING duplicate scan`);

// Jika tidak ada duplicate
console.log(`[Duplicate Check] ✅ No existing records, proceeding with scan`);

// Saat generate timestamp
console.log(`[Insert Attendance] Generated WIB timestamp: ${serverTimestamp}`);
console.log(`[Insert Attendance] Timestamp date part: ${serverTimestamp.substring(0, 10)}`);

// Setelah insert
console.log(`[Insert Attendance] ✅ Successfully inserted attendance`);
```

### 2. Query Logging - `backend/src/db/queries.js`
```javascript
// Function: getTodayAttendance()
console.log(`[getTodayAttendance] Checking for user: ${userId}`);
console.log(`[getTodayAttendance] WIB Today date: ${today}`);
console.log(`[getTodayAttendance] Query: SELECT * FROM ... WHERE substr(timestamp, 1, 10) = ?`);
console.log(`[getTodayAttendance] Query result count: ${result.results.length}`);

// Jika ada hasil
console.log(`[getTodayAttendance] First record timestamp: ${result.results[0].timestamp}`);
console.log(`[getTodayAttendance] First record timestamp substr(1,10): ${result.results[0].timestamp.substring(0, 10)}`);
```

## 🚀 Langkah Deploy & Debug

### Step 1: Deploy Backend dengan Logging
```bash
cd backend
npx wrangler deploy
```

### Step 2: Buka Real-Time Logs
1. Buka **Cloudflare Dashboard**
2. Pilih **Workers & Pages**
3. Klik worker **spx-soko-attendance-backend**
4. Tab **Logs** → Klik **Begin log stream**

### Step 3: Test Scan Pertama
1. Buka aplikasi attendance
2. Scan wajah pertama kali
3. **Lihat logs**, harusnya muncul:
```
[getTodayAttendance] Checking for user: xxx
[getTodayAttendance] WIB Today date: 2024-09-24
[getTodayAttendance] Query result count: 0
[Duplicate Check] User xxx
[Duplicate Check] Existing records found: 0
[Duplicate Check] ✅ No existing records, proceeding with scan
[Insert Attendance] Generated WIB timestamp: 2024-09-24T10:30:45.123+07:00
[Insert Attendance] Timestamp date part: 2024-09-24
[Insert Attendance] ✅ Successfully inserted attendance
```

### Step 4: Test Scan Kedua (Duplicate)
1. **Segera** scan wajah yang sama lagi
2. **Lihat logs**, harusnya muncul:
```
[getTodayAttendance] Checking for user: xxx
[getTodayAttendance] WIB Today date: 2024-09-24
[getTodayAttendance] Query result count: 1
[getTodayAttendance] First record timestamp: 2024-09-24T10:30:45.123+07:00
[getTodayAttendance] First record timestamp substr(1,10): 2024-09-24
[Duplicate Check] User xxx
[Duplicate Check] Existing records found: 1
[Duplicate Check] First existing record: {...}
[Duplicate Block] ❌ REJECTING duplicate scan for user xxx
```

### Step 5: Analisa Logs

#### ✅ Jika Berhasil Block:
- Count berubah dari 0 → 1
- Muncul log "REJECTING duplicate scan"
- Frontend dapat error 409

#### ❌ Jika Masih Gagal Block:

**Scenario A**: Query result count tetap 0 di scan kedua
- **Problem**: Query tidak menemukan record pertama
- **Possible causes**:
  1. Timestamp format di database tidak match
  2. WIB date calculation salah
  3. substr() tidak ekstrak dengan benar

**Scenario B**: Query result count jadi 1, tapi tetap masuk ke insert
- **Problem**: Logika if tidak jalan
- **Possible causes**:
  1. `existingToday.length > 0` tidak terdeteksi
  2. Ada error di tengah yang tidak terlog

**Scenario C**: Tidak ada log sama sekali
- **Problem**: Backend tidak ter-deploy atau masih pakai kode lama
- **Solution**: Deploy ulang, pastikan wrangler deploy sukses

## 🔍 Manual Database Check

### Check Format Timestamp di Database:
```bash
cd backend
npx wrangler d1 execute attendance-db --command "SELECT id, user_id, timestamp, substr(timestamp, 1, 10) as date_part FROM attendance_logs ORDER BY timestamp DESC LIMIT 5;"
```

**Expected output:**
```
id | user_id | timestamp | date_part
---|---------|-----------|----------
xxx | yyy | 2024-09-24T10:30:45.123+07:00 | 2024-09-24
```

### Check WIB Date Calculation:
```bash
# Run test script
cd backend
node test-duplicate-check.js
```

## 🎯 Diagnostic Checklist

| Check | Expected | Command |
|-------|----------|---------|
| Backend deployed? | Recent timestamp | Cloudflare Dashboard |
| Logs streaming? | Real-time updates | Workers → Logs tab |
| Timestamp format? | `YYYY-MM-DDTHH:MM:SS.mmm+07:00` | Check logs |
| Date extraction? | `YYYY-MM-DD` (10 chars) | Check logs |
| Query result? | 0 first, 1 second | Check logs |
| Block triggered? | "REJECTING" message | Check logs |

## 📋 Copy-Paste Debug Commands

```bash
# 1. Deploy dengan logging
cd backend
npx wrangler deploy

# 2. Check database records
npx wrangler d1 execute attendance-db --command "SELECT user_id, timestamp, substr(timestamp, 1, 10) as date FROM attendance_logs WHERE date(created_at) = date('now') ORDER BY timestamp DESC;"

# 3. Run local test
node test-duplicate-check.js

# 4. Tail logs (alternative to dashboard)
npx wrangler tail
```

## 🔧 Quick Fixes

### If timestamp format is wrong in DB:
Problem: Old records still use UTC format (`...Z` instead of `...+07:00`)

**Solution**: Don't worry, the substr() will still work! Format `2024-09-24T03:30:00.000Z` → substr gives `2024-09-24`.

The issue is the WIB date might not match. Need to check if the WIB date calculation is correct.

### If query returns 0 on second scan:
**Possible issue**: The `today` variable in `getTodayAttendance()` might be different from timestamp date.

**Check in logs**:
- `[getTodayAttendance] WIB Today date: 2024-09-24`
- `[Insert Attendance] Timestamp date part: 2024-09-24`

These TWO must match!

## 📞 Next Steps

1. ✅ Deploy backend dengan logging
2. ✅ Open Cloudflare logs
3. ✅ Scan 2x dan screenshot logs
4. 📤 Share logs screenshot untuk analisa lebih lanjut

Jika masih gagal setelah ini, saya butuh melihat:
- Screenshot logs dari Cloudflare
- Output dari database query
- Hasil dari test-duplicate-check.js
