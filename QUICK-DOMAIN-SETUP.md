# ⚡ Quick Setup - absensi.spxsoko.online

## 🎯 Goal: Setup Custom Domain dalam 10 Menit

---

## 📋 Checklist (Follow in Order)

### ✅ Step 1: Add Custom Domain (2 menit)

1. **Open Cloudflare Dashboard:**
   - Go to: https://dash.cloudflare.com/
   - Login

2. **Navigate to Pages:**
   - Click **"Workers & Pages"** di sidebar
   - Click project **"spx-soko-attendance"**

3. **Add Domain:**
   - Click tab **"Custom domains"**
   - Click **"Set up a domain"**
   - Enter: `absensi.spxsoko.online`
   - Click **"Continue"**
   - Click **"Activate domain"**

**Status:** ✅ Domain added, waiting for activation...

---

### ⏳ Step 2: Wait for DNS Propagation (5-15 menit)

**Cloudflare automatically:**
- ✅ Creates CNAME record
- ✅ Provisions SSL certificate
- ✅ Activates domain

**You can check status:**
```powershell
# Run this in PowerShell
nslookup absensi.spxsoko.online
```

**Expected output:**
```
absensi.spxsoko.online
    canonical name = spx-soko-attendance.pages.dev
```

**Jika sudah ada output di atas:** DNS active! ✅

---

### ✅ Step 3: Test Domain (1 menit)

**Open browser:**
```
https://absensi.spxsoko.online
```

**Expected:**
- ✅ Page loads
- ✅ HTTPS padlock icon (green/gray)
- ✅ No certificate warning
- ✅ Application works

**If it works:** DONE! 🎉

---

## 🐛 Troubleshooting

### Domain shows 404?

**Wait 5 more minutes, then:**

```powershell
# Clear DNS cache
ipconfig /flushdns

# Try again
```

---

### Still 404 after 20 minutes?

**Manual DNS setup:**

1. Cloudflare Dashboard → **spxsoko.online**
2. Click **"DNS"** → **"Records"**
3. Click **"Add record"**
4. Fill:
   - Type: `CNAME`
   - Name: `absensi`
   - Target: `spx-soko-attendance.pages.dev`
   - Proxy: `✅ Proxied`
5. Click **"Save"**
6. Wait 5 minutes
7. Try https://absensi.spxsoko.online again

---

### Certificate Warning?

**Wait 10 more minutes** for SSL provisioning.

Then hard refresh:
```
Ctrl + Shift + R  (Chrome/Edge)
Cmd + Shift + R   (Mac)
```

---

## ✅ Success Criteria

You're done when:

1. ✅ `https://absensi.spxsoko.online` loads
2. ✅ HTTPS padlock visible
3. ✅ Scanner works
4. ✅ Admin dashboard accessible
5. ✅ No errors in console

---

## 🎉 After Success

**Test these pages:**
- Main: https://absensi.spxsoko.online
- Admin: https://absensi.spxsoko.online/admin.html
- Enroll: https://absensi.spxsoko.online/enroll.html

**All should work!** ✅

---

## 📞 Need Help?

See detailed guide: `CUSTOM-DOMAIN-SETUP.md`

---

**ETA:** 10-20 minutes total  
**Difficulty:** ⭐ Easy (mostly waiting)  
**Last Updated:** 2026-09-19
