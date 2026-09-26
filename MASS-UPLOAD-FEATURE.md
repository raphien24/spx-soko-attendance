# Mass Upload Feature - Employee Data

## Overview
Fitur mass upload memungkinkan admin untuk menambahkan banyak karyawan sekaligus melalui file CSV, mempercepat proses input data karyawan.

## Perubahan yang Dilakukan

### 1. Database Migration (002_update_employees_table.sql)
- ✅ Menghapus kolom `phone` dari tabel `employees`
- ✅ Menambahkan constraint untuk `role` dengan 5 pilihan:
  - Rider Dedicated
  - Rider Plus
  - Rider Mitra
  - Driver Dedicated
  - Driver Mitra
- ✅ Status: **Berhasil dieksekusi di production** (4 queries, 301 rows read, 22 rows written)

### 2. Backend Changes

#### queries.js
- Updated `insertEmployee()`: removed phone, added role validation
- Updated `updateEmployee()`: removed phone, added role validation
- Added `bulkInsertEmployees()`: handles bulk insert with validation and error tracking

#### employees.js (handlers)
- Updated `addEmployee()`: removed phone, added role validation
- Updated `updateEmployeeData()`: removed phone field
- Added `bulkUploadEmployees()`: new endpoint handler for CSV mass upload

#### index.js (routes)
- Added route: `POST /api/employees/bulk` (placed before `/api/employees` to match first)

### 3. Frontend Changes

#### admin.html
- Added **Mass Upload Section**:
  - File input untuk upload CSV
  - Button download template
  - Progress indicator
  - File info display
- Updated **Add Employee Form**:
  - Removed phone field
  - Changed role to dropdown with 5 specific options
  - Made role field required
- Updated **Tables**:
  - Employee data table: removed phone column, separated employee_id and name
  - Roster table: removed phone column, separated employee_id and name

#### admin.js
- Added `downloadCSVTemplate()`: generates and downloads CSV template
- Added `handleCSVUpload()`: processes CSV file upload
- Added `parseCSV()`: parses CSV text to employee array with validation
- Updated `initEmployeeDataTab()`: added event listeners for CSV upload
- Updated `handleAddEmployee()`: removed phone handling
- Updated `renderEmployeeDataTable()`: removed phone column
- Updated `renderRosterTable()`: removed phone column, separated columns

#### api.js
- Added `bulkAddEmployees()`: API helper for bulk upload endpoint

## Cara Menggunakan Fitur Mass Upload

### Step 1: Download Template CSV
1. Buka Admin Dashboard → Tab **Data Karyawan**
2. Di bagian **Upload CSV (Mass Import)**, klik tombol **⬇️ Download Template**
3. File `template_employee_upload.csv` akan terdownload

### Step 2: Isi Data Karyawan di CSV
Format CSV:
```csv
Employee ID,Nama,Role
EMP001,John Doe,Rider Dedicated
EMP002,Jane Smith,Rider Plus
EMP003,Bob Johnson,Driver Dedicated
```

**Role yang valid:**
- Rider Dedicated
- Rider Plus
- Rider Mitra
- Driver Dedicated
- Driver Mitra

### Step 3: Upload File CSV
1. Klik **📁 Pilih File CSV** atau drag & drop file
2. Preview file akan muncul (nama file dan ukuran)
3. Konfirmasi dialog akan muncul dengan preview data (3 baris pertama)
4. Klik **OK** untuk lanjutkan upload
5. Progress bar akan muncul saat upload
6. Result summary akan ditampilkan:
   - ✅ Berhasil: jumlah karyawan yang berhasil ditambahkan
   - ❌ Gagal: jumlah karyawan yang gagal (dengan detail error)

### Step 4: Verifikasi Data
- Tabel **Daftar Semua Karyawan** akan otomatis refresh
- Cek apakah data sudah muncul dengan benar

## Validasi & Error Handling

### Backend Validation
- Employee ID harus unik (tidak boleh duplikat)
- Role harus salah satu dari 5 pilihan valid
- Nama dan Employee ID wajib diisi

### Frontend Validation
- File harus format CSV
- Minimal 1 baris data (selain header)
- Role yang tidak valid akan di-mapping ke role terdekat atau default "Rider Dedicated"

### Error Reporting
Jika ada error, sistem akan menampilkan:
- Total success vs failed
- Detail error per karyawan (employee_id, nama, dan error message)
- Maksimal 5 error pertama ditampilkan (jika lebih dari 5, akan ada indikator "... dan X kesalahan lainnya")

## API Endpoints

### POST /api/employees/bulk
**Request Body:**
```json
{
  "employees": [
    {
      "employee_id": "EMP001",
      "name": "John Doe",
      "role": "Rider Dedicated"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk upload completed: 10 added, 2 failed",
  "data": {
    "total": 12,
    "success": 10,
    "failed": 2,
    "errors": [
      {
        "employee_id": "EMP005",
        "name": "John Smith",
        "error": "Employee ID EMP005 already exists"
      }
    ]
  }
}
```

## Deployment

### Production URLs
- **Backend API**: https://spx-soko-attendance-api.spxsoko.workers.dev
- **Frontend**: https://1943aace.spx-soko-attendance.pages.dev

### Deployment Status
- ✅ Database migration executed (2026-09-19)
- ✅ Backend deployed (version: ab20774e-f6d4-4573-8758-c6e8e021b7db)
- ✅ Frontend deployed (deployment: 1943aace)
- ✅ Git pushed to main branch (commit: 5afde28)

## Testing Checklist

### Manual Testing
- [ ] Download CSV template → verify format
- [ ] Upload valid CSV → verify all employees added
- [ ] Upload CSV dengan duplicate employee_id → verify error handling
- [ ] Upload CSV dengan invalid role → verify auto-mapping
- [ ] Add employee manual → verify phone field removed
- [ ] Check employee table → verify phone column removed
- [ ] Check roster table → verify phone column removed
- [ ] Verify role dropdown has 5 options only

### API Testing
```bash
# Test bulk upload endpoint
curl -X POST https://spx-soko-attendance-api.spxsoko.workers.dev/api/employees/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"employee_id": "TEST001", "name": "Test User", "role": "Rider Dedicated"}
    ]
  }'
```

## Notes
- Fitur Google Form redirect setelah scan wajah **TETAP ADA** (tidak berubah)
- Employee yang belum enrolled tetap bisa di-roster
- CSV parser mendukung format CSV basic (comma-separated)
- Progress bar muncul saat upload untuk user feedback
- File input akan di-reset setelah upload selesai

## Files Modified
1. `backend/src/db/migrations/002_update_employees_table.sql` (new)
2. `backend/src/db/queries.js`
3. `backend/src/handlers/employees.js`
4. `backend/src/index.js`
5. `frontend/admin.html`
6. `frontend/src/js/admin.js`
7. `frontend/src/js/api.js`

## Git History
```
commit 5afde28
Feature: Add CSV mass upload for employee data

- Remove phone field from employees table (migration 002)
- Update role to use 5 specific options
- Add POST /api/employees/bulk endpoint for CSV mass upload
- Add CSV upload UI with file picker and template download
- Implement CSV parsing with validation and error reporting
- Update employee and roster tables to remove phone column
- Database migration executed on production
```

---
**Created:** 2026-09-19  
**Status:** ✅ Deployed to Production
