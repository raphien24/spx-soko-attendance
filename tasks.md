# Implementation Tasks Checklist
**Project:** SPX Express Soko Hub - Face Verification Attendance System  
**Based on:** design.md v1.0  
**Created:** 2026-09-19

---

## Phase 1: Project Initialization & Setup ✅ COMPLETE

### 1.1 Backend Setup (Cloudflare Workers) ✅
- [x] Inisialisasi project Worker dengan `npm init -y` di folder `backend/`
- [x] Install dependencies: `wrangler`, `uuid`, dan dev dependencies lainnya
- [x] Buat file `backend/wrangler.toml` dengan konfigurasi dasar (name, compatibility_date)
- [x] Setup binding untuk D1 database di `wrangler.toml`
- [x] Setup binding untuk R2 bucket di `wrangler.toml`
- [x] Buat struktur folder lengkap di `backend/src/` sesuai design.md
- [x] Buat file `.gitignore` untuk Node.js dan Wrangler artifacts

### 1.2 Frontend Setup (Cloudflare Pages) ✅
- [x] Buat struktur folder lengkap di `frontend/` sesuai design.md
- [x] Buat folder `frontend/public/models/` untuk face-api.js models
- [x] Download dan simpan model files face-api.js ke folder `public/models/`:
  - [x] tiny_face_detector_model
  - [x] face_landmark_68_model
  - [x] face_recognition_model
- [ ] Setup Tailwind CSS (buat `tailwind.config.js` dan import di HTML) - Phase 8
- [x] Buat file `frontend/wrangler.toml` untuk Pages configuration
- [x] Buat file `.gitignore` untuk frontend artifacts

### 1.3 Cloudflare Resources Setup ✅
- [x] Create D1 database dengan command: `wrangler d1 create spx-soko-attendance-db`
- [x] Catat database ID dan update di `backend/wrangler.toml`
- [x] Create R2 bucket dengan command: `wrangler r2 bucket create spx-soko-attendance`
- [x] Verify R2 bucket binding di `backend/wrangler.toml`

---

## Phase 2: Database Schema & Initialization ✅ COMPLETE

### 2.1 SQL Schema Files ✅
- [x] Buat file `backend/src/db/schema.sql`
- [x] Tulis SQL CREATE TABLE untuk `users` dengan semua kolom dan constraints
- [x] Tulis SQL CREATE INDEX untuk tabel `users` (idx_employee_id, idx_name)
- [x] Tulis SQL CREATE TABLE untuk `attendance_logs` dengan foreign key
- [x] Tulis SQL CREATE INDEX untuk tabel `attendance_logs` (idx_user_id, idx_timestamp, idx_scan_date)
- [x] Execute schema ke D1: `wrangler d1 execute spx-soko-attendance-db --file=backend/src/db/schema.sql`

### 2.2 Database Query Helpers ✅
- [x] Buat file `backend/src/db/queries.js`
- [x] Implementasi function `insertUser(db, userData)` dengan prepared statement
- [x] Implementasi function `getUserById(db, userId)`
- [x] Implementasi function `getUserByEmployeeId(db, employeeId)`
- [x] Implementasi function `getAllUsers(db)`
- [x] Implementasi function `getAllFaceDescriptors(db)` untuk scanner
- [x] Implementasi function `deleteUser(db, userId)`
- [x] Implementasi function `insertAttendanceLog(db, logData)`
- [x] Implementasi function `getTodayAttendance(db, userId)`
- [x] Implementasi function `getAllTodayLogs(db)`
- [x] Implementasi function `getAttendanceByDateRange(db, startDate, endDate)`
- [x] Implementasi function `getUserAttendanceHistory(db, userId)`

---

## Phase 3: Backend Utilities & Helpers ✅ COMPLETE

### 3.1 R2 Storage Helpers ✅
- [x] Buat file `backend/src/storage/r2.js`
- [x] Implementasi function `base64ToBuffer(base64String)` untuk convert base64 ke ArrayBuffer
- [x] Implementasi function `uploadImage(bucket, key, imageBuffer, contentType)` untuk upload ke R2
- [x] Implementasi function `generatePublicUrl(bucketName, key)` untuk generate URL
- [x] Tambahkan validation untuk image size (max 2MB)
- [x] Tambahkan validation untuk allowed MIME types (jpeg, png only)

### 3.2 CORS Middleware ✅
- [x] Buat file `backend/src/utils/cors.js`
- [x] Implementasi function `handleCORS(request)` yang return CORS headers
- [x] Definisikan array `ALLOWED_ORIGINS` dengan URL Pages deployment
- [x] Implementasi logic untuk handle preflight OPTIONS request

### 3.3 Validation Utilities ✅
- [x] Buat file `backend/src/utils/validation.js`
- [x] Implementasi function `validateEmployeeId(employeeId)` dengan regex SPX-XXX
- [x] Implementasi function `validateFaceDescriptor(descriptor)` check array length 128
- [x] Implementasi function `validateBase64Image(base64String)`
- [x] Implementasi function `validateUUID(uuid)`

### 3.4 Time Utilities ✅
- [x] Buat file `backend/src/utils/time.js`
- [x] Implementasi function `getCurrentISOTimestamp()` return ISO 8601 string
- [x] Implementasi function `getTodayDateString()` return YYYY-MM-DD format
- [x] Implementasi function `isToday(isoTimestamp)` untuk check apakah timestamp adalah hari ini

---

## Phase 4: Backend API Endpoints Implementation ✅ COMPLETE

### 4.1 Router Setup ✅
- [x] Buat file `backend/src/index.js` dengan routing logic
- [x] Implementasi basic router yang mapping URL path ke handler functions
- [x] Setup error handling wrapper untuk semua routes
- [x] Setup response formatter untuk consistent JSON structure

### 4.2 User Management Endpoints ✅
- [x] Buat file `backend/src/handlers/users.js`
- [x] Implementasi `POST /api/users/register`:
  - [x] Validate input (employee_id, name, face_descriptor, photo_base64)
  - [x] Check if employee_id already exists
  - [x] Generate UUID untuk user
  - [x] Convert base64 to buffer
  - [x] Upload photo ke R2 folder `enrollments/`
  - [x] Insert user data ke D1
  - [x] Return success response dengan user data
- [x] Implementasi `GET /api/users`:
  - [x] Fetch all users dari D1
  - [x] Return array of user objects (tanpa face_descriptor untuk performance)
- [x] Implementasi `GET /api/users/descriptors`:
  - [x] Fetch all users dengan face_descriptor dari D1
  - [x] Return array dengan id, employee_id, name, face_descriptor
- [x] Implementasi `DELETE /api/users/:id`:
  - [x] Validate user exists
  - [x] Delete user dari D1 (cascade akan hapus attendance_logs)
  - [x] Return success message

### 4.3 Attendance Management Endpoints ✅
- [x] Buat file `backend/src/handlers/attendance.js`
- [x] Implementasi `POST /api/attendance/scan`:
  - [x] Validate input (user_id, capture_base64)
  - [x] Fetch user data dari D1
  - [x] Check today's attendance status (IN/OUT logic):
    - [x] No record -> scan_type = 'IN'
    - [x] 1 record (IN) -> scan_type = 'OUT'
    - [x] 2 records -> return error "Already completed"
  - [x] Generate server-side timestamp (CRITICAL!)
  - [x] Generate UUID untuk log
  - [x] Upload capture ke R2 folder `scans/`
  - [x] Insert attendance_log ke D1
  - [x] Return success response dengan log data
- [x] Implementasi `GET /api/attendance/today`:
  - [x] Get today's date string
  - [x] Fetch all logs untuk hari ini dari D1
  - [x] Return array of attendance logs
- [x] Implementasi `GET /api/attendance/records`:
  - [x] Parse query params (start_date, end_date)
  - [x] Validate date format
  - [x] Fetch logs dalam date range dari D1
  - [x] Return array of logs dengan metadata
- [x] Implementasi `GET /api/attendance/user/:user_id`:
  - [x] Validate user_id exists
  - [x] Fetch user data
  - [x] Fetch all attendance history untuk user tersebut
  - [x] Return user info + array of logs

### 4.4 Health Check Endpoint ✅
- [x] Buat file `backend/src/handlers/health.js`
- [x] Implementasi `GET /api/health`:
  - [x] Test D1 connection dengan simple query
  - [x] Test R2 connection dengan list operation
  - [x] Return status object untuk setiap service
  - [x] Include current timestamp

### 4.5 Main Worker Entry Point ✅
- [x] Buat file `backend/src/index.js`
- [x] Import router dan semua handlers
- [x] Implementasi main `fetch()` handler:
  - [x] Handle CORS preflight
  - [x] Route request ke appropriate handler
  - [x] Wrap dengan try-catch untuk error handling
  - [x] Return formatted error response jika terjadi exception
- [x] Export worker dengan `export default { fetch }`

---

## Phase 5: Frontend Core Setup ✅ COMPLETE

### 5.1 API Client Module ✅
- [x] Buat file `frontend/src/js/api.js`
- [x] Definisikan `API_BASE_URL` (URL Worker yang akan di-deploy)
- [x] Implementasi function `apiRequest(endpoint, options)` wrapper untuk fetch dengan error handling
- [x] Implementasi function `registerUser(userData)` -> POST /api/users/register
- [x] Implementasi function `getAllUsers()` -> GET /api/users
- [x] Implementasi function `getUserDescriptors()` -> GET /api/users/descriptors
- [x] Implementasi function `deleteUser(userId)` -> DELETE /api/users/:id
- [x] Implementasi function `submitAttendance(scanData)` -> POST /api/attendance/scan
- [x] Implementasi function `getTodayAttendance()` -> GET /api/attendance/today
- [x] Implementasi function `getAttendanceRecords(startDate, endDate)` -> GET /api/attendance/records

### 5.2 Face-API.js Initialization Module ✅
- [x] Buat file `frontend/src/js/face-setup.js`
- [x] Implementasi function `loadFaceApiModels()`:
  - [x] Load TinyFaceDetector model
  - [x] Load FaceLandmark68Net model
  - [x] Load FaceRecognitionNet model
  - [x] Return promise ketika semua model loaded
- [x] Implementasi function `detectSingleFace(videoElement)`:
  - [x] Detect face dengan bounding box
  - [x] Return null jika tidak ada atau lebih dari 1 face
  - [x] Return face detection object jika exactly 1 face
- [x] Implementasi function `getFaceDescriptor(videoElement)`:
  - [x] Detect face + landmarks + descriptor
  - [x] Return Float32Array of 128 dimensions
- [x] Implementasi function `compareFaces(descriptor1, descriptor2)`:
  - [x] Calculate Euclidean distance
  - [x] Return distance value (lower = more similar)

### 5.3 Configuration Module ✅
- [x] Buat file `frontend/src/js/config.js`
- [x] Define API_BASE_URL dengan environment detection
- [x] Define FACE_MATCH_THRESHOLD (0.45)
- [x] Define STABILITY_DURATION (2000ms)
- [x] Define COOLDOWN_DURATION (5000ms)
- [x] Define VIDEO_CONSTRAINTS
- [x] Define validation rules dan UI config

---

## Phase 6: Frontend UI Pages - HTML Structure ✅ COMPLETE

### 6.1 Scanner Page (Kiosk Mode) ✅
- [x] Buat file `frontend/index.html`
- [x] Setup HTML structure dengan Tailwind CSS CDN
- [x] Buat container untuk video preview (webcam feed)
- [x] Buat canvas overlay untuk drawing bounding box
- [x] Buat area untuk status message (Scanning, Recognized, Success)
- [x] Buat notification area untuk success/error messages
- [x] Link script: face-api.js (from CDN), scanner.js (module)

### 6.2 Face Enrollment Page ✅
- [x] Buat file `frontend/enroll.html`
- [x] Setup HTML structure dengan Tailwind CSS
- [x] Buat form input untuk employee_id, name, role
- [x] Buat container untuk video preview (webcam)
- [x] Buat canvas untuk menampilkan captured photo
- [x] Buat button "Capture Photo" dan "Register Employee"
- [x] Buat area untuk validation messages
- [x] Link script: face-api.js, enroll.js (module)

### 6.3 Admin Dashboard Page ✅
- [x] Buat file `frontend/admin.html`
- [x] Setup HTML structure dengan Tailwind CSS
- [x] Buat sidebar navigation (Scanner, Enroll, Dashboard, Records)
- [x] Buat section untuk "Today's Attendance":
  - [x] Table dengan columns: Employee ID, Name, Time, Status (IN/OUT), Photo
- [x] Buat section untuk "Employee Management":
  - [x] Table dengan columns: Employee ID, Name, Role, Photo, Actions (Delete)
  - [x] Button "Add New Employee" yang redirect ke enroll.html
- [x] Buat section untuk "Attendance Records" (dengan date range picker)
- [x] Link script: admin.js (module)

---

## Phase 7: Frontend Logic Implementation

### 7.1 Scanner Page Logic
- [ ] Buat file `frontend/src/js/scanner.js`
- [ ] Implementasi initialization:
  - [ ] Request webcam access
  - [ ] Load face-api.js models
  - [ ] Fetch all face descriptors dari backend
  - [ ] Store descriptors dalam memory
- [ ] Implementasi continuous face detection loop:
  - [ ] Detect face setiap frame (requestAnimationFrame)
  - [ ] Draw bounding box di canvas jika face detected
  - [ ] Compare detected face dengan semua stored descriptors
  - [ ] Display "Scanning..." status saat detecting
- [ ] Implementasi face matching logic:
  - [ ] Loop through all descriptors
  - [ ] Calculate distance dengan face di video
  - [ ] Jika distance < 0.45, mark as match
  - [ ] Store matched user info
- [ ] Implementasi stability check:
  - [ ] Track berapa lama user yang sama terdeteksi consistently
  - [ ] Jika ≥ 2 detik stability, trigger auto-capture
  - [ ] Display "Recognized: [Name]" during stability period
- [ ] Implementasi auto-capture & submit:
  - [ ] Capture snapshot dari video ke canvas
  - [ ] Convert canvas to base64
  - [ ] Call `submitAttendance()` API
  - [ ] Display success notification dengan nama + waktu
  - [ ] Freeze scanner selama 5 detik (cooldown)
- [ ] Implementasi error handling:
  - [ ] No face detected message
  - [ ] Multiple faces detected warning
  - [ ] No match found message
  - [ ] Network error handling

### 7.2 Enrollment Page Logic
- [ ] Buat file `frontend/src/js/enroll.js`
- [ ] Implementasi initialization:
  - [ ] Request webcam access
  - [ ] Load face-api.js models
  - [ ] Setup form validation
- [ ] Implementasi "Capture Photo" button:
  - [ ] Detect face di video stream
  - [ ] Validate exactly 1 face detected
  - [ ] Jika valid, freeze video dan tampilkan snapshot di canvas
  - [ ] Extract face descriptor
  - [ ] Enable "Register" button
- [ ] Implementasi "Retake Photo" button:
  - [ ] Clear canvas
  - [ ] Resume video stream
  - [ ] Disable "Register" button
- [ ] Implementasi "Register Employee" button:
  - [ ] Validate form inputs (employee_id format, name not empty)
  - [ ] Get face descriptor dari captured photo
  - [ ] Convert canvas snapshot to base64
  - [ ] Call `registerUser()` API dengan semua data
  - [ ] Display success message dengan user info
  - [ ] Reset form dan redirect ke admin.html
- [ ] Implementasi error handling:
  - [ ] Face not detected during capture
  - [ ] Multiple faces warning
  - [ ] Duplicate employee_id error
  - [ ] Network error handling

### 7.3 Admin Dashboard Logic
- [ ] Buat file `frontend/src/js/admin.js`
- [ ] Implementasi page initialization:
  - [ ] Fetch today's attendance logs
  - [ ] Fetch all registered users
  - [ ] Populate tables dengan data
- [ ] Implementasi "Today's Attendance" table:
  - [ ] Loop through logs dan create table rows
  - [ ] Format timestamp ke readable format (HH:MM WIB)
  - [ ] Display badge untuk IN (green) / OUT (red)
  - [ ] Add clickable photo link
- [ ] Implementasi "Employee Management" table:
  - [ ] Loop through users dan create table rows
  - [ ] Display employee photo thumbnail
  - [ ] Add "Delete" button untuk setiap row
- [ ] Implementasi delete user functionality:
  - [ ] Show confirmation dialog
  - [ ] Call `deleteUser()` API
  - [ ] Remove row dari table jika success
  - [ ] Display success notification
- [ ] Implementasi "Attendance Records" dengan date filter:
  - [ ] Setup date range picker (start_date, end_date)
  - [ ] Button "Filter" untuk fetch records
  - [ ] Display results dalam table
  - [ ] Optional: Export to CSV button
- [ ] Implementasi auto-refresh:
  - [ ] Refresh today's attendance setiap 30 detik
  - [ ] Display last updated time

---

## Phase 8: Styling & UI Polish

### 8.1 Global Styles
- [ ] Buat file `frontend/src/css/styles.css`
- [ ] Define custom CSS variables untuk color scheme (primary, success, error)
- [ ] Style untuk video container (aspect ratio, border, shadow)
- [ ] Style untuk canvas overlay (absolute positioning)
- [ ] Style untuk notification toast (position, animation)
- [ ] Style untuk loading spinner

### 8.2 Component Styling
- [ ] Style untuk form inputs dan buttons (consistent height, padding, focus state)
- [ ] Style untuk tables (zebra striping, hover effect, responsive)
- [ ] Style untuk badges (IN/OUT status colors)
- [ ] Style untuk modals (confirmation dialog, image preview)
- [ ] Style untuk sidebar navigation (active state, icons)

### 8.3 Responsive Design
- [ ] Test dan adjust layout untuk mobile viewport (< 640px)
- [ ] Test dan adjust layout untuk tablet viewport (640px - 1024px)
- [ ] Test dan adjust layout untuk desktop viewport (> 1024px)
- [ ] Ensure video/canvas responsive sizing
- [ ] Ensure tables horizontal scroll pada mobile

---

## Phase 9: Configuration & Environment Setup

### 9.1 Backend Environment Configuration
- [ ] Update `backend/wrangler.toml` dengan final configuration:
  - [ ] Set production compatibility_date
  - [ ] Configure D1 binding dengan actual database_id
  - [ ] Configure R2 binding dengan actual bucket name
  - [ ] Set environment variables jika diperlukan
- [ ] Create `.dev.vars` file untuk local development secrets (jika ada)

### 9.2 Frontend Environment Configuration
- [ ] Buat file `frontend/src/js/config.js`
- [ ] Define `API_BASE_URL` untuk development (localhost:8787)
- [ ] Define `API_BASE_URL` untuk production (Worker URL)
- [ ] Setup conditional loading berdasarkan hostname
- [ ] Define `FACE_MATCH_THRESHOLD = 0.45`
- [ ] Define `STABILITY_DURATION = 2000`
- [ ] Define `COOLDOWN_DURATION = 5000`

---

## Phase 10: Testing & Debugging

### 10.1 Backend Testing (Local)
- [ ] Start local Worker dev server: `wrangler dev` di folder backend
- [ ] Test `POST /api/users/register` dengan Postman/curl:
  - [ ] Valid registration
  - [ ] Duplicate employee_id error
  - [ ] Invalid face_descriptor validation
- [ ] Test `GET /api/users` dan `GET /api/users/descriptors`
- [ ] Test `POST /api/attendance/scan`:
  - [ ] First scan (IN)
  - [ ] Second scan (OUT)
  - [ ] Third scan (error)
- [ ] Test `GET /api/attendance/today`
- [ ] Test `GET /api/health`
- [ ] Verify D1 data dengan: `wrangler d1 execute spx-soko-attendance-db --command="SELECT * FROM users"`
- [ ] Verify R2 uploads dengan: `wrangler r2 object list spx-soko-attendance`

### 10.2 Frontend Testing (Local)
- [ ] Serve frontend dengan local server (e.g., `python -m http.server 8000`)
- [ ] Update `config.js` API_BASE_URL ke local Worker (localhost:8787)
- [ ] Test enrollment page:
  - [ ] Webcam access
  - [ ] Face detection working
  - [ ] Capture dan registration flow
  - [ ] Error handling (no face, multiple faces)
- [ ] Test scanner page:
  - [ ] Continuous face detection
  - [ ] Face matching dengan registered users
  - [ ] Auto-capture setelah 2 detik stability
  - [ ] Success notification display
  - [ ] Cooldown period working
- [ ] Test admin dashboard:
  - [ ] Data loading dari API
  - [ ] Tables populated correctly
  - [ ] Delete user functionality
  - [ ] Date range filter

### 10.3 Integration Testing
- [ ] Test full enrollment flow: enroll.html → API → D1 + R2
- [ ] Test full attendance flow: scanner → API → D1 + R2
- [ ] Verify timestamps adalah server-side (inspect network tab)
- [ ] Verify CORS headers present dalam responses
- [ ] Test edge cases:
  - [ ] Network offline scenario
  - [ ] API rate limiting (jika diimplementasi)
  - [ ] Large image uploads
  - [ ] Concurrent scans

---

## Phase 11: Deployment Preparation

### 11.1 Pre-deployment Checklist
- [ ] Review dan clean up console.log statements
- [ ] Minify frontend JavaScript (optional)
- [ ] Optimize images di public/ folder
- [ ] Update `API_BASE_URL` di config.js ke production Worker URL
- [ ] Verify `.gitignore` files untuk frontend dan backend
- [ ] Write deployment documentation di `docs/deployment.md`

### 11.2 Backend Deployment
- [ ] Deploy Worker ke production:
  ```bash
  cd backend
  npx wrangler deploy
  ```
- [ ] Catat Worker URL yang di-generate (e.g., `https://spx-soko-api.workers.dev`)
- [ ] Verify deployment dengan test `GET /api/health` ke production URL
- [ ] Verify D1 database binding working di production
- [ ] Verify R2 bucket binding working di production

### 11.3 Frontend Deployment
- [ ] Update `frontend/src/js/config.js` dengan production Worker URL
- [ ] Deploy ke Cloudflare Pages:
  ```bash
  cd frontend
  npx wrangler pages deploy src --project-name=spx-soko-attendance
  ```
- [ ] Catat Pages URL yang di-generate (e.g., `https://spx-soko-attendance.pages.dev`)
- [ ] Setup custom domain jika ada (e.g., attendance.spxexpress.com)
- [ ] Configure Pages build settings jika menggunakan build step

### 11.4 Post-deployment Configuration
- [ ] Update `ALLOWED_ORIGINS` di backend CORS config dengan production Pages URL
- [ ] Redeploy Worker setelah update CORS config
- [ ] Test CORS dari production Pages ke production Worker
- [ ] Configure R2 bucket public access atau custom domain untuk photo URLs
- [ ] Update `R2_PUBLIC_URL_BASE` di backend jika menggunakan custom domain

---

## Phase 12: Production Testing & Validation

### 12.1 End-to-End Testing (Production)
- [ ] Register 3 test employees melalui production enroll page
- [ ] Verify user data tersimpan di D1 production database
- [ ] Verify enrollment photos uploaded ke R2 bucket
- [ ] Test face recognition di scanner page untuk ketiga test users
- [ ] Verify attendance logs tersimpan dengan server-side timestamp
- [ ] Verify scan photos uploaded ke R2 bucket
- [ ] Test admin dashboard menampilkan data yang benar
- [ ] Test delete user functionality dan verify cascade delete

### 12.2 Performance Testing
- [ ] Test scanner page performance (FPS, lag)
- [ ] Test API response times untuk setiap endpoint
- [ ] Monitor Worker execution time di Cloudflare dashboard
- [ ] Test dengan multiple concurrent users (simulasi 5-10 users scanning)

### 12.3 Security Validation
- [ ] Verify timestamp adalah server-generated (inspect request/response)
- [ ] Test CORS dengan unauthorized origin (should fail)
- [ ] Test input validation:
  - [ ] Invalid employee_id format
  - [ ] Invalid face_descriptor length
  - [ ] Invalid image format
  - [ ] SQL injection attempts (should be prevented by prepared statements)
- [ ] Verify R2 bucket tidak public writable (hanya Worker yang bisa upload)

---

## Phase 13: Documentation & Handover

### 13.1 User Documentation
- [ ] Buat file `docs/user-guide.md`:
  - [ ] Cara menggunakan enrollment page (untuk admin)
  - [ ] Cara menggunakan scanner kiosk (untuk employees)
  - [ ] Cara melihat attendance records (untuk admin)
  - [ ] FAQ dan troubleshooting

### 13.2 Technical Documentation
- [ ] Buat file `docs/deployment.md`:
  - [ ] Step-by-step deployment instructions
  - [ ] Required Cloudflare accounts dan setup
  - [ ] Environment variables dan secrets
  - [ ] Rollback procedures
- [ ] Update main `README.md`:
  - [ ] Project overview dan features
  - [ ] Tech stack
  - [ ] Local development setup
  - [ ] Link ke semua documentation files

### 13.3 Maintenance Guide
- [ ] Buat file `docs/maintenance.md`:
  - [ ] Cara monitoring Worker logs (wrangler tail)
  - [ ] Cara query D1 database untuk debugging
  - [ ] Cara manage R2 bucket (view files, delete old files)
  - [ ] Cara update face-api.js models jika ada versi baru
  - [ ] Backup dan restore procedures untuk D1

---

## Phase 14: Optional Enhancements (Future)

### 14.1 Analytics & Monitoring
- [ ] Implementasi logging untuk track:
  - [ ] Successful scans per day
  - [ ] Failed recognition attempts
  - [ ] Average API response times
  - [ ] Error rates by type
- [ ] Setup Cloudflare Workers Analytics dashboard
- [ ] Setup alerts untuk high error rates

### 14.2 Additional Features
- [ ] Export attendance records to CSV/Excel
- [ ] Email notifications untuk admin (daily attendance summary)
- [ ] Multi-location support (add location field)
- [ ] Shift management (validate scan times against shift schedule)
- [ ] Facial liveness detection (anti-spoofing)
- [ ] Mobile responsive optimization untuk admin dashboard

---

## Completion Criteria

Proyek dianggap selesai dan siap production jika:
- ✅ Semua tasks di Phase 1-12 sudah completed
- ✅ Frontend dapat diakses via HTTPS (Cloudflare Pages)
- ✅ Backend API dapat diakses via HTTPS (Cloudflare Workers)
- ✅ Face enrollment flow berfungsi end-to-end
- ✅ Face scanning + auto-capture berfungsi dengan akurasi acceptable (> 90%)
- ✅ Admin dashboard menampilkan data real-time
- ✅ Tidak ada critical bugs atau security issues
- ✅ Documentation lengkap (user guide + technical docs)

---

**Total Tasks:** 200+ granular checklist items  
**Estimated Timeline:** 5-7 hari kerja untuk solo developer  
**Priority:** Implement secara sequential dari Phase 1 → Phase 12
