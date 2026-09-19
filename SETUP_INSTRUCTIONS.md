# Setup Instructions - Phase 1 & 2 Complete

## ✅ Status: Project Structure Created

The following has been set up:
- ✅ Backend folder structure with Wrangler installed
- ✅ Frontend folder structure
- ✅ Database schema SQL file
- ✅ Database query helper functions
- ✅ Configuration files (wrangler.toml, .gitignore)

---

## 🚀 Next Steps: Cloudflare Resources Setup

You need to run the following commands to create and configure Cloudflare resources.

### Prerequisites

1. **Login to Cloudflare** (if not already logged in):
```bash
npx wrangler login
```

This will open your browser to authenticate with Cloudflare.

---

### Step 1: Create D1 Database

Run this command from the **root project directory** (`d:\SPX\Spx soko Absensi`):

```bash
cd backend
npx wrangler d1 create spx-soko-attendance-db
```

**Expected Output:**
```
✅ Successfully created DB 'spx-soko-attendance-db'

[[d1_databases]]
binding = "DB"
database_name = "spx-soko-attendance-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**ACTION REQUIRED:**
1. Copy the `database_id` from the output
2. Open `backend/wrangler.toml`
3. Uncomment the `[[d1_databases]]` section
4. Paste your actual `database_id`

Example:
```toml
[[d1_databases]]
binding = "DB"
database_name = "spx-soko-attendance-db"
database_id = "12345678-abcd-1234-abcd-123456789abc"
```

---

### Step 2: Initialize Database Schema

After updating `wrangler.toml` with the database ID, run:

```bash
npx wrangler d1 execute spx-soko-attendance-db --file=src/db/schema.sql
```

**Expected Output:**
```
🌀 Executing on spx-soko-attendance-db:
✅ Successfully executed SQL
```

**Verify Database Tables:**
```bash
npx wrangler d1 execute spx-soko-attendance-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

You should see:
```
┌──────────────────┐
│ name             │
├──────────────────┤
│ users            │
│ attendance_logs  │
└──────────────────┘
```

---

### Step 3: Create R2 Bucket

Run this command:

```bash
npx wrangler r2 bucket create spx-soko-attendance
```

**Expected Output:**
```
✅ Created bucket 'spx-soko-attendance'
```

**ACTION REQUIRED:**
1. Open `backend/wrangler.toml`
2. Uncomment the `[[r2_buckets]]` section

Example:
```toml
[[r2_buckets]]
binding = "ATTENDANCE_BUCKET"
bucket_name = "spx-soko-attendance"
```

**Verify R2 Bucket:**
```bash
npx wrangler r2 bucket list
```

You should see `spx-soko-attendance` in the list.

---

### Step 4: Download face-api.js Models (Frontend)

Navigate to the frontend models folder and download the required model files:

```bash
cd ../frontend/public/models
```

**Download models (Windows PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json" -OutFile "tiny_face_detector_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1" -OutFile "tiny_face_detector_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json" -OutFile "face_landmark_68_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1" -OutFile "face_landmark_68_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json" -OutFile "face_recognition_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1" -OutFile "face_recognition_model-shard1"
```

**Verify downloads:**
```bash
Get-ChildItem
```

You should see 6 files.

---

## 📋 Verification Checklist

Before proceeding to Phase 3, ensure:

- [ ] Wrangler is authenticated (`npx wrangler whoami` shows your account)
- [ ] D1 database created and ID added to `backend/wrangler.toml`
- [ ] Database schema executed successfully (tables created)
- [ ] R2 bucket created and added to `backend/wrangler.toml`
- [ ] Face-api.js model files downloaded (6 files in `frontend/public/models/`)

---

## 🧪 Quick Test

Test that your Worker can connect to D1:

```bash
cd ../../backend
npx wrangler dev
```

This should start a local dev server at `http://localhost:8787`.

Press `Ctrl+C` to stop when done testing.

---

## ❓ Troubleshooting

### Issue: "Not authenticated"
**Solution:** Run `npx wrangler login`

### Issue: "Database not found"
**Solution:** Make sure you copied the correct `database_id` to `wrangler.toml`

### Issue: "R2 bucket already exists"
**Solution:** That's fine! Just uncomment the binding in `wrangler.toml`

### Issue: Model downloads fail
**Solution:** Download manually from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

---

## 🎯 What's Next?

Once all verification steps pass, you're ready for **Phase 3: Backend Utilities & Helpers**.

Please confirm completion by checking:
1. Can run `npx wrangler dev` without errors
2. Database tables exist
3. R2 bucket exists
4. Face-api models downloaded

Then we'll proceed to implement the backend API endpoints!
