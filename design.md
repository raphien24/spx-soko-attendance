# Design Document
**Project:** SPX Express Soko Hub - Face Verification Attendance System  
**Version:** 1.0  
**Last Updated:** 2026-09-19

---

## 1. Struktur Folder (File Tree)

```
spx-soko-absensi/
│
├── frontend/                          # Cloudflare Pages (Static Site)
│   ├── public/
│   │   ├── models/                    # face-api.js model files
│   │   │   ├── tiny_face_detector_model-weights_manifest.json
│   │   │   ├── tiny_face_detector_model-shard1
│   │   │   ├── face_landmark_68_model-weights_manifest.json
│   │   │   ├── face_landmark_68_model-shard1
│   │   │   ├── face_recognition_model-weights_manifest.json
│   │   │   ├── face_recognition_model-shard1
│   │   │   └── face_expression_model-weights_manifest.json
│   │   ├── favicon.ico
│   │   └── logo.png
│   │
│   ├── src/
│   │   ├── index.html                 # Landing/Scanner page (kiosk mode)
│   │   ├── admin.html                 # Admin dashboard
│   │   ├── enroll.html                # Face enrollment page
│   │   │
│   │   ├── css/
│   │   │   ├── tailwind.config.js
│   │   │   └── styles.css             # Custom styles (if any)
│   │   │
│   │   ├── js/
│   │   │   ├── scanner.js             # Auto-scan logic for kiosk
│   │   │   ├── enroll.js              # Face registration logic
│   │   │   ├── admin.js               # Dashboard data fetching
│   │   │   ├── faceApi.js             # face-api.js initialization wrapper
│   │   │   └── api.js                 # Fetch wrapper for Worker endpoints
│   │   │
│   │   └── components/                # Reusable UI components (optional)
│   │       ├── camera.js
│   │       └── notification.js
│   │
│   ├── package.json                   # (Optional: if using build tools)
│   ├── wrangler.toml                  # Cloudflare Pages config
│   └── README.md
│
├── backend/                           # Cloudflare Workers (API)
│   ├── src/
│   │   ├── index.js                   # Main Worker entry point
│   │   ├── router.js                  # API route handler
│   │   │
│   │   ├── handlers/
│   │   │   ├── users.js               # User CRUD operations
│   │   │   ├── attendance.js          # Attendance scan logic
│   │   │   └── admin.js               # Admin-specific endpoints
│   │   │
│   │   ├── db/
│   │   │   ├── schema.sql             # D1 table definitions
│   │   │   └── queries.js             # Reusable SQL query functions
│   │   │
│   │   ├── storage/
│   │   │   └── r2.js                  # R2 upload/retrieval helpers
│   │   │
│   │   └── utils/
│   │       ├── cors.js                # CORS middleware
│   │       ├── validation.js          # Input validation utilities
│   │       └── time.js                # Timestamp generation
│   │
│   ├── wrangler.toml                  # Worker configuration & bindings
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── requirements.md                # Product requirements (existing)
│   ├── design.md                      # This document
│   └── deployment.md                  # Deployment guide (future)
│
└── README.md                          # Project overview
```

### Penjelasan Struktur:
- **frontend/**: Semua file statis yang akan di-deploy ke **Cloudflare Pages**. Folder `public/models/` menyimpan model pre-trained dari face-api.js yang akan di-load oleh browser.
- **backend/**: Kode Worker yang akan di-deploy ke **Cloudflare Workers**. Handler dipisahkan berdasarkan domain logic (users, attendance, admin).
- **Pemisahan Concerns**: Frontend hanya menangani UI dan face recognition di browser, backend menangani validasi, database, dan storage.

---

## 2. Skema Database (Cloudflare D1)

### Tabel: `users`
Menyimpan data karyawan dan descriptor wajah mereka.

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID format: '550e8400-e29b-41d4-a716-446655440000'
    employee_id TEXT UNIQUE NOT NULL,       -- Unique ID karyawan: 'SPX-001', 'SPX-002'
    name TEXT NOT NULL,                     -- Nama lengkap karyawan
    role TEXT DEFAULT 'employee',           -- 'admin' atau 'employee'
    face_descriptor TEXT NOT NULL,          -- JSON array: '[0.123, -0.456, 0.789, ...]'
    photo_url TEXT NOT NULL,                -- URL R2: 'https://r2.../enrollments/uuid.jpg'
    created_at TEXT NOT NULL,               -- ISO 8601: '2026-09-19T10:30:00.000Z'
    updated_at TEXT                         -- Timestamp untuk update data (nullable)
);

CREATE INDEX idx_employee_id ON users(employee_id);
CREATE INDEX idx_name ON users(name);
```

### Tabel: `attendance_logs`
Menyimpan log absensi masuk/keluar.

```sql
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,                    -- UUID untuk setiap record
    user_id TEXT NOT NULL,                  -- Foreign key ke users.id
    employee_id TEXT NOT NULL,              -- Denormalisasi untuk query cepat
    name TEXT NOT NULL,                     -- Denormalisasi nama karyawan
    scan_type TEXT NOT NULL,                -- 'IN' atau 'OUT'
    timestamp TEXT NOT NULL,                -- ISO 8601 server-side timestamp
    capture_url TEXT NOT NULL,              -- URL R2 foto saat scan: 'https://r2.../scans/uuid.jpg'
    created_at TEXT NOT NULL,               -- Timestamp record dibuat (biasanya sama dengan timestamp)
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_id ON attendance_logs(user_id);
CREATE INDEX idx_timestamp ON attendance_logs(timestamp);
CREATE INDEX idx_scan_date ON attendance_logs(date(timestamp));  -- Index untuk query per hari
```

### Relasi:
- **One-to-Many**: Satu user dapat memiliki banyak attendance_logs.
- **Cascade Delete**: Jika user dihapus, semua log absensinya juga terhapus.
- **Denormalisasi**: `employee_id` dan `name` disimpan di `attendance_logs` untuk mempercepat query tanpa JOIN (trade-off: konsistensi data).

### Catatan Tipe Data:
- **D1 (SQLite)** tidak memiliki tipe `UUID` native, jadi kita gunakan `TEXT`.
- **Timestamp** disimpan sebagai `TEXT` dalam format ISO 8601 untuk kompatibilitas dan readability.
- **face_descriptor** disimpan sebagai `TEXT` dalam format JSON array (akan di-parse saat digunakan).

---

## 3. Desain API (Endpoints)

Base URL: `https://api.spx-soko.workers.dev` (contoh)

### 3.1 User Management

#### **POST /api/users/register**
Mendaftarkan karyawan baru beserta data wajahnya.

**Request:**
```json
{
  "employee_id": "SPX-001",
  "name": "Ahmad Subagyo",
  "role": "employee",
  "face_descriptor": [0.123, -0.456, 0.789, ...],  // Array of 128 floats
  "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."  // Base64 encoded image
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "SPX-001",
    "name": "Ahmad Subagyo",
    "photo_url": "https://pub-xxxxx.r2.dev/enrollments/550e8400.jpg",
    "created_at": "2026-09-19T10:30:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Employee ID already exists"
}
```

**Validasi:**
- `employee_id` harus unique.
- `face_descriptor` harus array dengan panjang 128.
- `photo_base64` harus valid base64 image.

---

#### **GET /api/users**
Mengambil daftar semua karyawan (untuk admin dashboard).

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "employee_id": "SPX-001",
      "name": "Ahmad Subagyo",
      "role": "employee",
      "photo_url": "https://pub-xxxxx.r2.dev/enrollments/550e8400.jpg",
      "created_at": "2026-09-19T10:30:00.000Z"
    },
    ...
  ]
}
```

---

#### **GET /api/users/descriptors**
Mengambil semua face descriptors untuk matching di frontend.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "employee_id": "SPX-001",
      "name": "Ahmad Subagyo",
      "face_descriptor": [0.123, -0.456, 0.789, ...]
    },
    ...
  ]
}
```

**Catatan:** Endpoint ini dipanggil saat scanner page di-load untuk mendapatkan semua descriptor yang perlu di-compare.

---

#### **DELETE /api/users/:id**
Menghapus data karyawan (admin only).

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 3.2 Attendance Management

#### **POST /api/attendance/scan**
Mencatat absensi masuk/keluar.

**Request:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "capture_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."  // Snapshot saat scan
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Clock In recorded successfully",
  "data": {
    "id": "abc123-log-id",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "SPX-001",
    "name": "Ahmad Subagyo",
    "scan_type": "IN",
    "timestamp": "2026-09-19T07:15:30.000Z",
    "capture_url": "https://pub-xxxxx.r2.dev/scans/abc123.jpg"
  }
}
```

**Logic di Backend:**
1. Ambil user data dari D1 berdasarkan `user_id`.
2. Cek apakah user sudah punya record hari ini:
   - Jika belum ada record -> `scan_type = 'IN'`
   - Jika sudah ada 1 record (IN) -> `scan_type = 'OUT'`
   - Jika sudah ada 2 record (IN + OUT) -> Return error "Already completed attendance for today"
3. Generate server-side timestamp (NEVER trust client time).
4. Upload `capture_base64` ke R2 bucket `scans/`.
5. Insert record ke `attendance_logs`.

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Attendance already completed for today"
}
```

---

#### **GET /api/attendance/today**
Mengambil semua log absensi hari ini (untuk dashboard admin).

**Response (200):**
```json
{
  "success": true,
  "date": "2026-09-19",
  "data": [
    {
      "id": "abc123-log-id",
      "employee_id": "SPX-001",
      "name": "Ahmad Subagyo",
      "scan_type": "IN",
      "timestamp": "2026-09-19T07:15:30.000Z",
      "capture_url": "https://pub-xxxxx.r2.dev/scans/abc123.jpg"
    },
    {
      "id": "def456-log-id",
      "employee_id": "SPX-001",
      "name": "Ahmad Subagyo",
      "scan_type": "OUT",
      "timestamp": "2026-09-19T16:45:20.000Z",
      "capture_url": "https://pub-xxxxx.r2.dev/scans/def456.jpg"
    }
  ]
}
```

---

#### **GET /api/attendance/records?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD**
Mengambil log absensi dalam rentang waktu tertentu (untuk export/laporan).

**Query Parameters:**
- `start_date` (required): Tanggal mulai (ISO 8601 date format)
- `end_date` (required): Tanggal akhir

**Response (200):**
```json
{
  "success": true,
  "start_date": "2026-09-01",
  "end_date": "2026-09-19",
  "data": [
    {
      "id": "abc123-log-id",
      "employee_id": "SPX-001",
      "name": "Ahmad Subagyo",
      "scan_type": "IN",
      "timestamp": "2026-09-19T07:15:30.000Z",
      "capture_url": "https://pub-xxxxx.r2.dev/scans/abc123.jpg"
    },
    ...
  ]
}
```

---

#### **GET /api/attendance/user/:user_id**
Mengambil riwayat absensi untuk satu karyawan tertentu.

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "SPX-001",
    "name": "Ahmad Subagyo"
  },
  "data": [
    {
      "id": "abc123-log-id",
      "scan_type": "IN",
      "timestamp": "2026-09-19T07:15:30.000Z",
      "capture_url": "https://pub-xxxxx.r2.dev/scans/abc123.jpg"
    },
    ...
  ]
}
```

---

### 3.3 Health Check

#### **GET /api/health**
Mengecek status Worker, D1, dan R2 connections.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "worker": "ok",
    "database": "ok",
    "storage": "ok"
  },
  "timestamp": "2026-09-19T10:30:00.000Z"
}
```

---

## 4. Alur Integrasi R2

### 4.1 Arsitektur Storage
**Cloudflare R2 Bucket:** `spx-soko-attendance`

**Folder Structure di R2:**
```
spx-soko-attendance/
├── enrollments/           # Foto registrasi wajah karyawan
│   ├── 550e8400.jpg
│   ├── 661f9511.jpg
│   └── ...
│
└── scans/                 # Foto snapshot saat absensi
    ├── abc123.jpg
    ├── def456.jpg
    └── ...
```

### 4.2 Alur Upload dari Frontend ke R2

#### **Flow 1: Face Enrollment (Registrasi)**
```
┌─────────────┐                 ┌──────────────────┐                 ┌─────────────┐
│  Frontend   │                 │ Cloudflare Worker│                 │ R2 Bucket   │
│  (enroll.js)│                 │   (users.js)     │                 │             │
└──────┬──────┘                 └────────┬─────────┘                 └──────┬──────┘
       │                                 │                                   │
       │ 1. Capture photo via webcam    │                                   │
       │ 2. Extract face descriptor     │                                   │
       │    using face-api.js           │                                   │
       │ 3. Convert image to base64     │                                   │
       │                                 │                                   │
       │ POST /api/users/register        │                                   │
       │ {                               │                                   │
       │   employee_id, name,            │                                   │
       │   face_descriptor,              │                                   │
       │   photo_base64                  │                                   │
       │ }                               │                                   │
       ├────────────────────────────────>│                                   │
       │                                 │                                   │
       │                                 │ 4. Generate UUID                  │
       │                                 │ 5. Decode base64 to binary        │
       │                                 │ 6. Upload to R2                   │
       │                                 │    Key: "enrollments/uuid.jpg"    │
       │                                 ├──────────────────────────────────>│
       │                                 │                                   │
       │                                 │ 7. R2 returns public URL          │
       │                                 │<──────────────────────────────────┤
       │                                 │                                   │
       │                                 │ 8. Insert user data + photo_url   │
       │                                 │    into D1 users table            │
       │                                 │                                   │
       │ 9. Response: user data          │                                   │
       │    with photo_url               │                                   │
       │<────────────────────────────────┤                                   │
       │                                 │                                   │
       │ 10. Show success message        │                                   │
       │                                 │                                   │
```

#### **Flow 2: Attendance Scan**
```
┌─────────────┐                 ┌──────────────────┐                 ┌─────────────┐
│  Frontend   │                 │ Cloudflare Worker│                 │ R2 Bucket   │
│ (scanner.js)│                 │ (attendance.js)  │                 │             │
└──────┬──────┘                 └────────┬─────────┘                 └──────┬──────┘
       │                                 │                                   │
       │ 1. Continuous camera feed       │                                   │
       │ 2. Detect face in frame         │                                   │
       │ 3. Compare with all descriptors │                                   │
       │    (fetched from /api/users/    │                                   │
       │     descriptors on page load)   │                                   │
       │ 4. If match found (distance<0.45)│                                  │
       │    Wait 2 seconds for stability │                                   │
       │ 5. Capture snapshot (base64)    │                                   │
       │                                 │                                   │
       │ POST /api/attendance/scan       │                                   │
       │ {                               │                                   │
       │   user_id,                      │                                   │
       │   capture_base64                │                                   │
       │ }                               │                                   │
       ├────────────────────────────────>│                                   │
       │                                 │                                   │
       │                                 │ 6. Validate user_id exists        │
       │                                 │ 7. Check today's attendance       │
       │                                 │    status (IN/OUT logic)          │
       │                                 │ 8. Generate server timestamp      │
       │                                 │ 9. Generate UUID for log          │
       │                                 │ 10. Decode base64 to binary       │
       │                                 │ 11. Upload to R2                  │
       │                                 │     Key: "scans/log-uuid.jpg"     │
       │                                 ├──────────────────────────────────>│
       │                                 │                                   │
       │                                 │ 12. R2 returns public URL         │
       │                                 │<──────────────────────────────────┤
       │                                 │                                   │
       │                                 │ 13. Insert attendance_logs record │
       │                                 │     with server timestamp         │
       │                                 │                                   │
       │ 14. Response: attendance data   │                                   │
       │     with scan_type, timestamp   │                                   │
       │<────────────────────────────────┤                                   │
       │                                 │                                   │
       │ 15. Show success notification   │                                   │
       │     "Absen Berhasil: Ahmad -    │                                   │
       │      07:15 WIB"                 │                                   │
       │ 16. Freeze scanner for 5 sec    │                                   │
       │                                 │                                   │
```

### 4.3 Implementasi R2 di Worker

**Binding di wrangler.toml:**
```toml
[[r2_buckets]]
binding = "ATTENDANCE_BUCKET"
bucket_name = "spx-soko-attendance"
```

**Helper Function (backend/src/storage/r2.js):**
```javascript
/**
 * Upload image buffer ke R2
 * @param {R2Bucket} bucket - R2 binding dari env
 * @param {string} key - Path di R2 (e.g., 'enrollments/uuid.jpg')
 * @param {ArrayBuffer} imageBuffer - Binary image data
 * @param {string} contentType - MIME type (e.g., 'image/jpeg')
 * @returns {Promise<string>} Public URL dari uploaded file
 */
async function uploadImage(bucket, key, imageBuffer, contentType) {
  await bucket.put(key, imageBuffer, {
    httpMetadata: {
      contentType: contentType
    }
  });
  
  // Generate public URL (asumsi bucket sudah di-set public access)
  const publicUrl = `https://pub-xxxxx.r2.dev/${key}`;
  return publicUrl;
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} base64String - Format: 'data:image/jpeg;base64,/9j/...'
 * @returns {Object} { buffer: ArrayBuffer, mimeType: string }
 */
function base64ToBuffer(base64String) {
  const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 string format');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return {
    buffer: bytes.buffer,
    mimeType: mimeType
  };
}
```

**Penggunaan di Handler:**
```javascript
// Di POST /api/users/register
const { buffer, mimeType } = base64ToBuffer(photo_base64);
const userId = crypto.randomUUID();
const r2Key = `enrollments/${userId}.jpg`;
const photoUrl = await uploadImage(env.ATTENDANCE_BUCKET, r2Key, buffer, mimeType);

// Simpan photoUrl ke D1
await env.DB.prepare(
  'INSERT INTO users (id, employee_id, name, face_descriptor, photo_url, created_at) VALUES (?, ?, ?, ?, ?, ?)'
).bind(userId, employee_id, name, JSON.stringify(face_descriptor), photoUrl, new Date().toISOString()).run();
```

### 4.4 Konfigurasi R2 Bucket

**Public Access Settings:**
- Untuk memberikan akses publik ke file di R2, perlu setup custom domain atau gunakan R2 public bucket URL.
- Alternatif: Gunakan Cloudflare Worker sebagai proxy untuk serving file dari R2 dengan signed URLs jika diperlukan akses control.

**Struktur Metadata:**
Setiap file di R2 dapat memiliki custom metadata:
```javascript
await bucket.put(key, imageBuffer, {
  httpMetadata: {
    contentType: 'image/jpeg'
  },
  customMetadata: {
    'user-id': userId,
    'upload-timestamp': new Date().toISOString(),
    'type': 'enrollment'  // atau 'scan'
  }
});
```

### 4.5 Security Considerations untuk R2

1. **Upload Size Limit**: Batasi ukuran file yang diterima di Worker (maksimal 2MB per image untuk mencegah abuse).
2. **File Type Validation**: Hanya terima MIME type `image/jpeg` dan `image/png`.
3. **Rate Limiting**: Implementasi rate limit di Worker untuk mencegah spam upload.
4. **Signed URLs (Optional)**: Jika foto tidak boleh publik, gunakan signed URLs dengan expiry time.

---

## 5. Keamanan & Validasi

### 5.1 Time Integrity
- **Server-Side Timestamp**: Semua operasi yang melibatkan timestamp HARUS menggunakan waktu dari Cloudflare Worker.
- Frontend TIDAK BOLEH mengirim timestamp dalam request body.
- Gunakan `new Date().toISOString()` di Worker untuk generate timestamp.

### 5.2 CORS Configuration
Di `backend/src/utils/cors.js`:
```javascript
const ALLOWED_ORIGINS = [
  'https://spx-soko-attendance.pages.dev',
  'https://attendance.spxexpress.com'  // Custom domain (jika ada)
];

function handleCORS(request) {
  const origin = request.headers.get('Origin');
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };
  }
  
  return {};
}
```

### 5.3 Input Validation
Setiap endpoint harus memvalidasi:
- **employee_id**: Format `SPX-XXX` (regex: `^SPX-\d{3}$`)
- **face_descriptor**: Array dengan panjang 128, setiap elemen adalah float
- **photo_base64**: Valid base64 string dengan prefix `data:image/`
- **user_id**: Valid UUID format

### 5.4 Rate Limiting
Implementasi rate limiting di Worker untuk mencegah abuse:
- Max 10 enrollment requests per IP per hour
- Max 100 scan requests per IP per hour
- Max 1000 read requests per IP per hour

---

## 6. Performance Optimization

### 6.1 Frontend
- **Lazy Loading**: Load face-api.js models hanya saat diperlukan (tidak di landing page).
- **Caching**: Cache face descriptors di localStorage untuk mengurangi fetch ke Worker.
- **Debouncing**: Implementasi debounce untuk scan detection agar tidak spam API calls.

### 6.2 Backend
- **Connection Pooling**: D1 sudah handle ini secara otomatis.
- **Query Optimization**: Gunakan index yang tepat untuk query attendance by date.
- **Batch Operations**: Jika ada kebutuhan bulk insert/update, gunakan transaction.

### 6.3 R2
- **CDN Caching**: Cloudflare automatically caches R2 objects.
- **Image Optimization**: Compress images di frontend sebelum upload (max 1920x1080, 80% quality).

---

## 7. Error Handling Strategy

### 7.1 Frontend Error Display
- **Network Error**: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda."
- **Face Not Detected**: "Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan hadap kamera."
- **Multiple Faces**: "Terdeteksi lebih dari satu wajah. Pastikan hanya satu orang di depan kamera."
- **No Match Found**: "Wajah tidak dikenali. Silakan hubungi admin untuk registrasi."
- **Already Clocked In/Out**: "Anda sudah absen hari ini."

### 7.2 Backend Error Response Format
Semua error response menggunakan format konsisten:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Input tidak valid
- `NOT_FOUND`: Resource tidak ditemukan
- `DUPLICATE_ENTRY`: Data sudah ada (e.g., employee_id)
- `ATTENDANCE_COMPLETED`: User sudah absen IN dan OUT hari ini
- `DATABASE_ERROR`: Error dari D1
- `STORAGE_ERROR`: Error saat upload ke R2
- `UNAUTHORIZED`: Request tidak memiliki akses

---

## 8. Deployment Strategy

### 8.1 Environment Variables (Secrets)
Di Cloudflare Dashboard atau via Wrangler:
```bash
wrangler secret put ADMIN_API_KEY          # Untuk proteksi admin endpoints
wrangler secret put R2_PUBLIC_URL_BASE     # Base URL untuk R2 bucket
```

### 8.2 D1 Database Initialization
```bash
# Create database
wrangler d1 create spx-soko-attendance-db

# Run migrations
wrangler d1 execute spx-soko-attendance-db --file=./backend/src/db/schema.sql
```

### 8.3 R2 Bucket Setup
```bash
# Create bucket
wrangler r2 bucket create spx-soko-attendance

# Configure public access (jika diperlukan)
# Gunakan Cloudflare Dashboard untuk setup custom domain
```

### 8.4 Pages Deployment
```bash
cd frontend
npx wrangler pages deploy public --project-name=spx-soko-attendance
```

### 8.5 Worker Deployment
```bash
cd backend
npx wrangler deploy
```

---

## 9. Monitoring & Logging

### 9.1 Metrics to Track
- **Attendance Success Rate**: Percentage successful scans vs failed attempts
- **Face Recognition Accuracy**: Track match confidence scores
- **API Response Times**: Monitor Worker execution time
- **Error Rates**: Track error types and frequencies

### 9.2 Logging Strategy
```javascript
// Di setiap endpoint handler
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  endpoint: '/api/attendance/scan',
  method: 'POST',
  user_id: userId,
  success: true,
  execution_time: Date.now() - startTime
}));
```

Cloudflare Workers logs dapat diakses via:
- Wrangler: `wrangler tail`
- Dashboard: Cloudflare Workers > Logs > Live Logs

---

## 10. Future Enhancements (Out of Scope for v1.0)

1. **Multi-Location Support**: Tracking absensi untuk berbagai hub/lokasi.
2. **Shift Management**: Validasi absensi berdasarkan shift karyawan.
3. **Export to Excel**: Fitur export laporan attendance ke format XLSX.
4. **Mobile App**: Dedicated mobile app untuk karyawan melihat riwayat absensi mereka.
5. **Real-time Dashboard**: WebSocket untuk real-time update di admin dashboard.
6. **Facial Liveness Detection**: Anti-spoofing dengan photo/video playback detection.
7. **Integration dengan Payroll System**: Auto-generate attendance data untuk sistem penggajian.

---

## Appendix A: Technology Justification

### Mengapa face-api.js di Client-Side?
- **Zero Server Cost untuk Inference**: Face recognition berjalan di browser, Worker hanya handle data persistence.
- **Privacy**: Face data tidak perlu dikirim raw ke server untuk processing.
- **Low Latency**: Tidak ada round-trip ke server untuk face matching.
- **Scalability**: Worker load tidak bertambah dengan jumlah scan, hanya dengan jumlah employees.

### Mengapa Cloudflare Stack?
- **Global Edge Network**: Low latency dari mana pun lokasi akses.
- **Cost-Effective**: Free tier sangat generous untuk use case ini.
- **Integrated Ecosystem**: Pages, Workers, D1, dan R2 terintegrasi seamless.
- **Zero Cold Start**: Workers has virtually zero cold start time.

---

## Appendix B: Threshold & Configuration Values

```javascript
// Face Recognition Thresholds
const FACE_MATCH_THRESHOLD = 0.45;        // Lower = stricter matching
const STABILITY_DURATION = 2000;          // 2 seconds of consistent match
const COOLDOWN_DURATION = 5000;           // 5 seconds after successful scan

// Image Configuration
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;   // 2MB
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_MAX_HEIGHT = 1080;
const IMAGE_QUALITY = 0.8;                // 80% JPEG quality

// API Rate Limits (per IP per hour)
const RATE_LIMIT_ENROLL = 10;
const RATE_LIMIT_SCAN = 100;
const RATE_LIMIT_READ = 1000;
```

---

**End of Design Document**
