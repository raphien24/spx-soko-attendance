# SPX Express Soko Hub - Face Verification Attendance System

A contactless face recognition attendance system built on Cloudflare's edge platform.

## 🎯 Project Status

**Current Phase:** Phase 1 & 2 Complete ✅
- ✅ Project structure initialized
- ✅ Database schema created
- ✅ Query helpers implemented
- ⏳ Cloudflare resources setup required (see SETUP_INSTRUCTIONS.md)

## 🏗️ Architecture

- **Frontend:** Vanilla JavaScript + Tailwind CSS (Cloudflare Pages)
- **Face Recognition:** face-api.js (client-side processing)
- **Backend API:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (photos)

## 📁 Project Structure

```
spx-soko-absensi/
├── backend/                    # Cloudflare Workers API
│   ├── src/
│   │   ├── db/                # Database queries
│   │   ├── handlers/          # API endpoint handlers
│   │   ├── storage/           # R2 helpers
│   │   └── utils/             # Utilities (CORS, validation, etc.)
│   └── wrangler.toml          # Worker configuration
│
├── frontend/                   # Cloudflare Pages
│   ├── src/
│   │   ├── js/                # JavaScript modules
│   │   ├── css/               # Styles
│   │   ├── index.html         # Scanner (kiosk mode)
│   │   ├── enroll.html        # Face enrollment
│   │   └── admin.html         # Admin dashboard
│   └── public/
│       └── models/            # face-api.js models
│
├── docs/
│   ├── requirements.md        # Product requirements
│   ├── design.md              # Technical design
│   └── tasks.md               # Implementation checklist
│
├── SETUP_INSTRUCTIONS.md      # Setup guide (START HERE!)
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier is sufficient)
- Webcam for testing face recognition

### 2. Setup

Follow the detailed setup guide:

```bash
# Open and follow instructions in:
SETUP_INSTRUCTIONS.md
```

### 3. Local Development

**Backend (Worker):**
```bash
cd backend
npx wrangler dev
# API runs at http://localhost:8787
```

**Frontend:**
```bash
cd frontend
# Serve with any static server, e.g.:
python -m http.server 8080
# Or use VS Code Live Server
# Frontend runs at http://localhost:8080
```

## 📖 Documentation

- **[requirements.md](requirements.md)** - Product requirements and features
- **[design.md](design.md)** - Architecture and technical design
- **[tasks.md](tasks.md)** - Implementation task checklist
- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Setup and deployment guide

## 🔑 Key Features

- **Contactless Auto-Scan:** Employees just stand in front of camera
- **2-Second Stability Check:** Prevents accidental scans
- **Server-Side Timestamps:** Tamper-proof attendance records
- **Admin Dashboard:** View attendance, manage employees
- **Face Enrollment:** Simple registration process
- **R2 Photo Storage:** Proof photos for every attendance scan

## 🛡️ Security Features

- ✅ Server-side timestamp generation (no client manipulation)
- ✅ CORS protection (only allowed origins)
- ✅ Input validation (employee ID format, face descriptor length)
- ✅ R2 write access restricted to Worker only
- ✅ Prepared statements (SQL injection prevention)

## 📊 Database Schema

**users table:**
- id (UUID)
- employee_id (SPX-XXX)
- name
- role
- face_descriptor (JSON array)
- photo_url (R2 link)
- timestamps

**attendance_logs table:**
- id (UUID)
- user_id (FK)
- employee_id
- name
- scan_type (IN/OUT)
- timestamp (server-generated!)
- capture_url (R2 link)
- created_at

## 🔧 Tech Stack Details

**Frontend:**
- face-api.js v0.22.2
- Tailwind CSS v3.x
- Vanilla JavaScript (ES6+)

**Backend:**
- Cloudflare Workers (V8 runtime)
- Wrangler CLI
- Node.js compatibility mode

**Database & Storage:**
- Cloudflare D1 (SQLite)
- Cloudflare R2 (S3-compatible)

## 📝 Development Roadmap

- [x] Phase 1: Project initialization
- [x] Phase 2: Database schema
- [ ] Phase 3: Backend utilities (R2, CORS, validation)
- [ ] Phase 4: API endpoints implementation
- [ ] Phase 5: Frontend core setup
- [ ] Phase 6: UI pages (HTML)
- [ ] Phase 7: Frontend logic (scanner, enrollment, admin)
- [ ] Phase 8: Styling & polish
- [ ] Phase 9: Configuration
- [ ] Phase 10: Testing
- [ ] Phase 11: Deployment preparation
- [ ] Phase 12: Production deployment
- [ ] Phase 13: Documentation
- [ ] Phase 14: Optional enhancements

## 🤝 Contributing

This is an internal SPX Express project. For questions or issues, contact the development team.

## 📄 License

Internal use only - SPX Express Soko Hub

## 🆘 Support

For setup issues, see [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

For technical questions, refer to [design.md](design.md)

---

**Built with ❤️ for SPX Express Soko Hub**
