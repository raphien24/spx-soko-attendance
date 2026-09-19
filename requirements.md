# Product Requirements Document (PRD)
**Project Name:** SPX Express Soko Hub - Face Verification Attendance System
**Deployment Target:** Cloudflare (Pages, Workers, D1, R2)
**Core Engine:** Frontend-based Face Recognition (e.g., face-api.js)

## 1. Project Overview
A web-based attendance system designed for SPX Express Soko Hub. The system allows employees to clock in/out using contactless automatic face scanning. The system includes face enrollment, real-time auto-capture verification, and an admin dashboard for attendance records. 

## 2. Tech Stack & Infrastructure
*   **Frontend:** HTML/CSS/JS (Vanilla or React, based on AI preference), TailwindCSS for styling.
*   **Face Recognition Model:** `face-api.js` (running completely on the client-side/browser to reduce server load).
*   **Backend/API:** Cloudflare Workers (handling logic, timestamp validation, and DB queries).
*   **Database:** Cloudflare D1 (SQLite) for storing user profiles and attendance logs.
*   **Storage:** Cloudflare R2 for storing captured face photos (enrollment and attendance proofs).

## 3. User Roles
1.  **Admin (Hub Manager):** Can manage employee data, register faces, view global attendance records, and export data.
2.  **Employee (Kiosk Mode):** Interacts only with the scanning interface to clock in/out.

## 4. Core Features & Acceptance Criteria

### Feature 1: Face Enrollment (Pendaftaran Wajah)
*   **Description:** Admin interface to register a new employee and their face biometric data.
*   **Flow:**
    1. Admin inputs employee details (Name, SPX ID, Role).
    2. System opens the webcam.
    3. Admin captures a clear photo of the employee.
    4. System extracts face descriptors (using `face-api.js`) and converts them into an array/JSON.
    5. **Action:** Save employee text data + face descriptor to Cloudflare D1. Save the reference image to Cloudflare R2.
*   **Validation:** Must detect exactly ONE face in the frame before allowing registration.

### Feature 2: Auto-Scan Attendance (Verifikasi Otomatis)
*   **Description:** The main kiosk screen where employees stand in front of the camera to clock in/out without touching the device.
*   **Flow:**
    1. Camera is continuously active on the dashboard.
    2. When a person steps in, the system detects the face and draws a bounding box.
    3. The system compares the live face descriptor against all registered descriptors loaded from D1.
    4. If Euclidean distance (match threshold) is acceptable (e.g., < 0.45), system identifies the user.
    5. **Auto-Capture:** System waits for 2 seconds of consistent identification to prevent accidental scans, then automatically triggers the clock-in/out API.
    6. System takes a snapshot, uploads it to R2 (as proof), and inserts a record into D1 with a server-side timestamp.
    7. UI shows a large Green Success message ("Absen Berhasil: [Nama] - [Jam]").
*   **Cool-down:** After a successful scan, freeze the scanner for 5 seconds so it doesn't spam records for the same person.

### Feature 3: Admin Dashboard & Records
*   **Description:** A protected route for admins to monitor attendance.
*   **Requirements:**
    *   **Data Table:** Display today's attendance logs (Name, Time, Status: Clock In/Out, Photo Proof Link).
    *   **Employee Management:** Table showing all registered employees with options to Delete or Re-enroll face.
    *   **Status Logic:** 
        *   If the user has no record today -> "Clock In".
        *   If the user has 1 record today -> "Clock Out".
*   **UI/UX:** Clean, responsive design. Use a simple sidebar for navigation (Scanner, Records, Employees).

## 5. Database Schema Requirements (Cloudflare D1)

The AI must create SQL initialization scripts for at least two tables:

1.  **`users` table:**
    *   `id` (Primary Key, UUID/Auto-increment)
    *   `employee_id` (String, Unique) - e.g., SPX-001
    *   `name` (String)
    *   `face_descriptor` (Text/JSON) - Stores the float array from face-api
    *   `photo_url` (String) - R2 reference URL
    *   `created_at` (Timestamp)

2.  **`attendance_logs` table:**
    *   `id` (Primary Key)
    *   `user_id` (Foreign Key to users)
    *   `scan_type` (Enum: 'IN', 'OUT')
    *   `timestamp` (DateTime) - Must use Cloudflare Worker's server time, NOT client time.
    *   `capture_url` (String) - R2 URL of the photo taken during the scan.

## 6. Security & Constraints
*   **Time Integrity:** The frontend must never send the timestamp. The Cloudflare Worker API must generate the current time when inserting the `attendance_logs` to prevent client-side time manipulation.
*   **Cross-Origin:** Configure CORS in Cloudflare Workers to only accept requests from the deployed Pages URL.