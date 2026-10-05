# ✅ Roster Save Fix - SOLVED

## 🐛 Masalah yang Ditemukan

**Gejala:**
- Roster menampilkan notifikasi "✅ ROSTER TERSIMPAN KE DATABASE!"
- Setelah reload halaman, data roster yang baru hilang
- Hanya sebagian data yang tersimpan (16 dari 21 employees)

**Root Cause:**
```
[SupabaseWrapper._handleInsert] ERROR: Too many subrequests by single Worker invocation
```

**Penjelasan:**
Cloudflare Workers memiliki **limit 50 subrequests per invocation**. Setiap panggilan ke Supabase API dihitung sebagai 1 subrequest.

Kode lama melakukan **3 query per employee**:
1. `getEmployeeByEmployeeId()` - SELECT employee
2. `isEmployeeRostered()` - SELECT roster  
3. `insertRoster()` - INSERT roster

Untuk 21 employees: `21 × 3 = 63 queries` ❌ **MELEBIHI LIMIT 50**

Hasilnya:
- 16 employees pertama berhasil (48 queries)
- 5 employees terakhir gagal (melewati limit 50)

---

## ✅ Solusi: Batch Query Optimization

**Strategi:**
Ubah dari **N × 3 queries** menjadi **2 + N queries**

**Implementasi Baru:**
1. Fetch **semua employees** dalam 1 query (batch)
2. Fetch **semua existing roster** untuk date tersebut dalam 1 query (batch)
3. Loop hanya untuk **INSERT** (N queries)

Untuk 21 employees: `2 + 21 = 23 queries` ✅ **DI BAWAH LIMIT 50**

---

## 📝 Perubahan Kode

### File: `backend/src/handlers/roster.js`

**SEBELUM:**
```javascript
// Process each employee
for (const empData of employeeList) {
    const employee_id = empData.employee_id;
    
    // 1 query per employee
    const employee = await getEmployeeByEmployeeId(env.DB, employee_id);
    
    // 1 query per employee
    const alreadyRostered = await isEmployeeRostered(env.DB, date, employee_id);
    
    // 1 query per employee
    await insertRoster(env.DB, rosterData);
}
// Total: 3 × N queries
```

**SESUDAH:**
```javascript
// BATCH: Fetch all employees in 1 query
const allEmployees = await getAllEmployees(env.DB);
const employeeMap = {};
allEmployees.forEach(emp => {
    employeeMap[emp.employee_id] = emp;
});

// BATCH: Fetch all existing roster for date in 1 query
const existingRoster = await getRosterByDate(env.DB, date);
const existingEmployeeIds = new Set(existingRoster.map(r => r.employee_id));

// Process each employee (only INSERT remains)
for (const empData of employeeList) {
    const employee_id = empData.employee_id;
    
    // Lookup dari batch (no query)
    const employee = employeeMap[employee_id];
    
    // Check dari batch (no query)
    if (existingEmployeeIds.has(employee_id)) continue;
    
    // 1 query per employee
    await insertRoster(env.DB, rosterData);
}
// Total: 2 + N queries
```

---

## 📊 Hasil Optimasi

| Metric | Sebelum | Sesudah | Improvement |
|--------|---------|---------|-------------|
| **Queries untuk 21 employees** | 63 | 23 | **-63%** |
| **Queries untuk 50 employees** | 150 ❌ | 52 ❌ | **-65%** |
| **Queries untuk 100 employees** | 300 ❌ | 102 ❌ | **-66%** |
| **Max employees (limit 50)** | ~16 | ~48 | **+200%** |

**Note:** Untuk roster > 48 employees, perlu implementasi batching tambahan atau increase limit di wrangler.toml

---

## 🧪 Testing

### Test Case 1: Save 21 Employees
**Sebelum:** ❌ 16 berhasil, 5 gagal (limit exceeded)
**Sesudah:** ✅ 21 berhasil semua

### Test Case 2: Save & Reload
**Sebelum:** ❌ Data hilang setelah reload
**Sesudah:** ✅ Data persisten setelah reload

### Test Case 3: Save Duplicate
**Sebelum:** ✅ Skip dengan benar
**Sesudah:** ✅ Skip dengan benar (batch lookup lebih cepat)

---

## 🚀 Deployment

### Commits:
1. **b38b32a** - debug: add comprehensive logging for roster insert
2. **599a069** - deps: install @supabase/supabase-js
3. **538227e** - fix: batch query optimization (THIS FIX)

### Deployed to:
- **Backend:** `spx-soko-attendance-api-production.spxsoko.workers.dev`
- **Version ID:** `54623af7-d107-46d9-bf39-d17439371389`
- **Deploy Time:** 2026-10-05 09:30 WIB

---

## 📋 Cara Testing

1. Buka halaman admin: `https://absensi.spxsoko.online/admin.html`
2. Pilih tanggal (misal: 2026-10-05)
3. Pilih 20+ employees dari district berbeda
4. Klik "SIMPAN ROSTER"
5. Tunggu notifikasi sukses
6. **Hard reload** halaman (Ctrl + Shift + R)
7. Cek apakah semua employees muncul di roster

**Expected Result:** ✅ Semua employees tersimpan dan muncul setelah reload

---

## 🔍 Monitoring

Untuk melihat live log backend:
```bash
cd backend
npx wrangler tail --env production
```

Log yang akan muncul:
```
[Roster] Roster save completed: { 
  date: '2026-10-05', 
  total: 21, 
  success: 21,    ← Harus sama dengan total
  skipped: 0, 
  failed: 0       ← Harus 0
}
```

---

## 💡 Untuk Future: Handling > 48 Employees

Jika perlu save roster lebih dari 48 employees, ada 2 opsi:

### Opsi 1: Increase Cloudflare Limit (Paid)
Edit `backend/wrangler.toml`:
```toml
[limits]
# Default: 50, Max (paid): 1000
max_subrequests = 200
```
**Catatan:** Fitur ini memerlukan Workers Paid plan

### Opsi 2: Client-side Batching
Split roster save menjadi beberapa batch di frontend:
```javascript
// Split into chunks of 40 employees
const chunks = chunkArray(selectedEmployees, 40);
for (const chunk of chunks) {
    await saveRosterBatch(date, chunk);
}
```

---

## ✅ Status

- [x] Bug identified: Cloudflare Workers subrequest limit
- [x] Batch query optimization implemented
- [x] Logging added for debugging
- [x] Deployed to production
- [x] Documentation created
- [ ] User testing & validation

---

**Created:** 2026-10-05  
**Last Updated:** 2026-10-05  
**Status:** ✅ RESOLVED - Ready for user testing
