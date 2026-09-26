# Setup Auto-Deploy Backend ke Cloudflare Workers

## Masalah
Backend (Cloudflare Workers) tidak otomatis deploy dari Git seperti frontend (Cloudflare Pages).  
Setiap kali ada perubahan di `backend/`, harus manual run `wrangler deploy`.

## Solusi
Setup **GitHub Actions** untuk auto-deploy backend setiap kali push ke `main` branch.

---

## 📋 Langkah Setup

### 1. Dapatkan Cloudflare API Token

1. **Login ke Cloudflare Dashboard:**
   - Buka: https://dash.cloudflare.com/

2. **Buka API Tokens:**
   - Klik profil Anda (pojok kanan atas)
   - Pilih "My Profile"
   - Klik tab "API Tokens" di sidebar kiri
   - Atau langsung: https://dash.cloudflare.com/profile/api-tokens

3. **Create Token:**
   - Klik tombol **"Create Token"**
   - Pilih template **"Edit Cloudflare Workers"**
   - Atau klik **"Create Custom Token"**

4. **Token Settings:**
   ```
   Token Name: GitHub Actions - SPX Soko Backend
   
   Permissions:
   ├─ Account
   │  └─ Cloudflare Workers Scripts: Edit
   │
   └─ Account
      └─ Account Settings: Read
   
   Account Resources:
   └─ Include: Your Account (Rafiagusalvian@gmail.com's Account)
   
   Zone Resources:
   └─ Include: All zones (or specific zone if needed)
   
   TTL: (optional, bisa dikosongi untuk unlimited)
   ```

5. **Continue to Summary:**
   - Review permissions
   - Klik **"Create Token"**

6. **Copy Token:**
   - ⚠️ **PENTING:** Copy token yang muncul
   - Token hanya ditampilkan sekali!
   - Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Simpan sementara di notepad

---

### 2. Tambahkan Token ke GitHub Secrets

1. **Buka Repository di GitHub:**
   - https://github.com/raphien24/spx-soko-attendance

2. **Settings → Secrets:**
   - Klik tab **"Settings"** (pojok kanan atas)
   - Sidebar kiri: **"Secrets and variables"** → **"Actions"**

3. **New Repository Secret:**
   - Klik tombol **"New repository secret"**

4. **Isi Secret:**
   ```
   Name: CLOUDFLARE_API_TOKEN
   Secret: [paste token dari step 1]
   ```

5. **Add Secret:**
   - Klik **"Add secret"**

---

### 3. Push GitHub Actions Workflow

Workflow file sudah dibuat di:
```
.github/workflows/deploy-backend.yml
```

**Isi workflow:**
```yaml
name: Deploy Backend to Cloudflare Workers

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Deploy to Cloudflare Workers
```

**Commit dan push:**
```bash
git add .github/workflows/deploy-backend.yml
git commit -m "Setup GitHub Actions for backend auto-deploy"
git push origin main
```

---

### 4. Verify Auto-Deploy

**Test workflow:**
1. Buat perubahan kecil di `backend/` (misal: tambah comment)
2. Commit dan push ke `main`
3. Buka GitHub → tab **"Actions"**
4. Lihat workflow **"Deploy Backend to Cloudflare Workers"** running
5. Tunggu selesai (biasanya 1-2 menit)
6. ✅ Backend otomatis ter-deploy!

**Workflow akan auto-run jika:**
- Ada perubahan di folder `backend/**`
- Push ke branch `main`
- Workflow file berubah

**Workflow TIDAK run jika:**
- Perubahan hanya di `frontend/**`
- Push ke branch lain (bukan `main`)

---

## 🎯 Setelah Setup

### Frontend Deployment
✅ **Cloudflare Pages** (sudah auto-deploy)
- Push ke `main` → auto-deploy frontend
- URL: https://spx-soko-attendance.pages.dev

### Backend Deployment
✅ **GitHub Actions + Cloudflare Workers** (setelah setup)
- Push perubahan `backend/**` → auto-deploy backend
- URL: https://spx-soko-attendance-api-production.spxsoko.workers.dev

---

## 📊 Status Workflow di GitHub

**Cara cek status deployment:**

1. **Via GitHub UI:**
   - Buka repo: https://github.com/raphien24/spx-soko-attendance
   - Klik tab **"Actions"**
   - Lihat daftar workflow runs
   - ✅ Green = Success
   - ❌ Red = Failed
   - 🟡 Yellow = Running

2. **Via Commit Badge:**
   - Di daftar commits, akan muncul badge status:
     - ✅ Check passed
     - ❌ Check failed

3. **Email Notification:**
   - GitHub akan email jika workflow failed
   - Bisa diatur di Settings → Notifications

---

## 🔧 Troubleshooting

### Workflow Failed: Authentication Error
```
Error: Authentication error [code: 10000]
```

**Solusi:**
- Token expired atau salah
- Re-generate Cloudflare API Token
- Update GitHub Secret `CLOUDFLARE_API_TOKEN`

### Workflow Failed: Permission Denied
```
Error: You do not have permission to edit workers
```

**Solusi:**
- Token tidak punya permission "Workers Scripts: Edit"
- Buat token baru dengan permission yang benar

### Workflow Tidak Running
**Cek:**
- Apakah workflow file di `.github/workflows/`?
- Apakah ada perubahan di `backend/**`?
- Apakah push ke branch `main`?

---

## 🎉 Benefits

**Sebelum (Manual):**
```bash
# Setiap kali edit backend:
cd backend
npx wrangler deploy --env=production
```

**Setelah (Auto):**
```bash
# Edit backend files
git add .
git commit -m "Update backend"
git push origin main
# ✅ Otomatis deploy!
```

**Time Saved:**
- Manual deploy: ~30 detik per perubahan
- Auto deploy: 0 detik (background process)
- Tidak perlu ingat command wrangler
- Tidak perlu CD ke folder backend

---

## 📝 Summary

| Aspect | Before | After |
|--------|--------|-------|
| Frontend Deploy | ✅ Auto (Pages) | ✅ Auto (Pages) |
| Backend Deploy | ❌ Manual | ✅ Auto (Actions) |
| Deploy Time | Manual ~30s | Auto ~1-2 min |
| Developer Action | Run wrangler | Just push |

---

## ⚠️ Important Notes

1. **API Token Security:**
   - Jangan commit token ke Git
   - Jangan share token
   - Simpan hanya di GitHub Secrets

2. **Workflow Cost:**
   - GitHub Actions: 2000 minutes/month (free tier)
   - Backend deploy: ~1-2 minutes per run
   - Cukup untuk ~1000 deploys/bulan

3. **Deployment Control:**
   - Workflow hanya run untuk perubahan backend
   - Frontend tetap deploy via Cloudflare Pages
   - Bisa disable workflow kapan saja

---

**Setelah setup ini, backend akan otomatis deploy seperti frontend!** 🚀
