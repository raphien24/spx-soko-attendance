# 🌐 Custom Domain Setup Guide - absensi.spxsoko.online

## 🎯 Objective
Setup custom domain **absensi.spxsoko.online** untuk aplikasi SPX Soko Attendance yang di-deploy di Cloudflare Pages.

---

## ✅ Prerequisites

- [x] Domain **spxsoko.online** sudah terdaftar di Cloudflare
- [x] Aplikasi sudah deployed di Cloudflare Pages: `spx-soko-attendance.pages.dev`
- [x] Cloudflare account sudah aktif

---

## 📋 Step-by-Step Setup

### Step 1: Login ke Cloudflare Dashboard

1. Buka: https://dash.cloudflare.com/
2. Login dengan akun Anda
3. Pilih domain **spxsoko.online**

---

### Step 2: Add Custom Domain di Cloudflare Pages

#### Option A: Via Pages Dashboard (Recommended)

1. **Navigate to Pages:**
   - Di Cloudflare Dashboard → Klik "Workers & Pages" di sidebar kiri
   - Atau langsung: https://dash.cloudflare.com/?to=/:account/pages

2. **Select Project:**
   - Klik project **spx-soko-attendance**

3. **Add Custom Domain:**
   - Klik tab **"Custom domains"** (di atas)
   - Klik tombol **"Set up a domain"** atau **"Add a custom domain"**

4. **Enter Domain:**
   - Input: `absensi.spxsoko.online`
   - Klik **"Continue"**

5. **Activate Domain:**
   - Cloudflare akan otomatis detect bahwa domain sudah di Cloudflare
   - Klik **"Activate domain"**
   - Cloudflare akan auto-create DNS records

6. **Wait for Activation:**
   - Status akan berubah dari "Pending" → "Active"
   - Biasanya 5-15 menit
   - SSL certificate akan otomatis di-provision

---

#### Option B: Manual DNS Setup

Jika Option A gagal, setup manual DNS records:

1. **Go to DNS Settings:**
   - Cloudflare Dashboard → pilih **spxsoko.online**
   - Klik **"DNS"** → **"Records"**

2. **Add CNAME Record:**
   ```
   Type:    CNAME
   Name:    absensi
   Target:  spx-soko-attendance.pages.dev
   Proxy:   ✅ Proxied (orange cloud)
   TTL:     Auto
   ```

3. **Save Record:**
   - Klik **"Save"**

4. **Return to Pages:**
   - Go back to Pages project → Custom domains
   - Click **"Set up a domain"**
   - Enter: `absensi.spxsoko.online`
   - Cloudflare should detect the CNAME and activate

---

### Step 3: Verify DNS Propagation

#### Check via Command Line:

```powershell
# Check CNAME record
nslookup absensi.spxsoko.online

# Or using dig (if installed)
dig absensi.spxsoko.online CNAME
```

**Expected Output:**
```
absensi.spxsoko.online
    canonical name = spx-soko-attendance.pages.dev
```

#### Check via Online Tools:

- **DNS Checker:** https://dnschecker.org/
  - Enter: `absensi.spxsoko.online`
  - Type: CNAME
  - Check global propagation

- **What's My DNS:** https://whatsmydns.net/
  - Enter: `absensi.spxsoko.online`
  - Type: CNAME

---

### Step 4: Test Custom Domain

Once DNS is active (5-15 minutes):

1. **Open Browser:**
   - Navigate to: https://absensi.spxsoko.online

2. **Expected Results:**
   - ✅ Page loads correctly
   - ✅ SSL/TLS certificate active (HTTPS padlock)
   - ✅ No certificate warnings
   - ✅ Application works normally

3. **Check Certificate:**
   - Click padlock icon in browser
   - Certificate should show: Issued by Cloudflare
   - Valid for: `absensi.spxsoko.online`

---

## 🔒 SSL/TLS Configuration

### Default Settings (Recommended):

Cloudflare automatically provisions SSL certificate for custom domains.

**Settings:**
- **SSL/TLS encryption mode:** Full (strict)
- **Always Use HTTPS:** Enabled
- **Automatic HTTPS Rewrites:** Enabled
- **Certificate:** Universal SSL (Free)

### Verify SSL Settings:

1. Go to: Cloudflare Dashboard → **spxsoko.online**
2. Click **"SSL/TLS"** in sidebar
3. Verify mode is **"Full (strict)"** or **"Full"**

---

## 📊 DNS Records Summary

After setup, your DNS should look like:

```
Type    Name        Target                          Proxy   TTL
────────────────────────────────────────────────────────────────
CNAME   absensi     spx-soko-attendance.pages.dev   ✅      Auto
```

**Note:** Orange cloud (Proxied) is RECOMMENDED for:
- DDoS protection
- CDN caching
- SSL management
- Analytics

---

## 🚀 Update Backend API URL

Since we're changing domain, update API base URL in frontend config:

### File to Update: `frontend/src/js/config.js`

```javascript
// Current:
API_CONFIG.BASE_URL = getEnvironmentApiUrl();

// Update getEnvironmentApiUrl function:
function getEnvironmentApiUrl() {
    if (isDevelopment()) {
        return 'http://localhost:8787';
    } else {
        // Production - use your Worker URL
        return 'https://spx-soko-attendance-api-production.spxsoko.workers.dev';
    }
}

// Update isDevelopment function to detect custom domain:
function isDevelopment() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}
```

### After Domain Active, Deploy Updated Config:

```powershell
cd "d:\SPX\Spx soko Absensi"
npx wrangler pages deploy frontend --project-name=spx-soko-attendance
```

---

## 🧪 Testing Checklist

After domain is active, test these:

### Frontend Tests:

- [ ] **Home page loads:** https://absensi.spxsoko.online
- [ ] **HTTPS works:** Padlock icon visible, no warnings
- [ ] **Scanner page:** Click "Mulai Scanner Kiosk"
- [ ] **Camera access:** Grant permission, video feed shows
- [ ] **Face detection:** Works normally
- [ ] **Admin dashboard:** Access via PIN
- [ ] **Enrollment page:** https://absensi.spxsoko.online/enroll.html

### Backend API Tests:

- [ ] **Health check:** Backend responds
- [ ] **Attendance scan:** Submit attendance works
- [ ] **Employee list:** Load employees works
- [ ] **GPS validation:** Location check works
- [ ] **Hub settings:** Load/update hub location works

### Browser Tests:

- [ ] **Chrome/Edge:** All features work
- [ ] **Firefox:** All features work
- [ ] **Mobile Safari:** All features work
- [ ] **Mobile Chrome:** All features work

---

## 🐛 Troubleshooting

### Issue 1: Domain Shows "Not Found" or 404

**Cause:** DNS not propagated yet or CNAME not created

**Solution:**
1. Wait 15-30 minutes for DNS propagation
2. Verify CNAME record exists in Cloudflare DNS
3. Check DNS with: `nslookup absensi.spxsoko.online`
4. Clear browser cache (Ctrl+Shift+Del)

---

### Issue 2: SSL Certificate Warning

**Cause:** Certificate not provisioned yet

**Solution:**
1. Wait 5-15 minutes for Cloudflare to provision certificate
2. Check SSL/TLS settings in Cloudflare dashboard
3. Ensure mode is "Full" or "Full (strict)"
4. Try incognito/private browsing mode

---

### Issue 3: Domain Redirects to pages.dev

**Cause:** Custom domain not activated in Pages project

**Solution:**
1. Go to Pages project → Custom domains
2. Verify `absensi.spxsoko.online` is listed and "Active"
3. If not, re-add the domain
4. Wait for activation

---

### Issue 4: API Calls Fail (CORS Error)

**Cause:** Backend not configured for new domain

**Solution:**
1. Update backend CORS settings to allow new domain
2. File: `backend/src/index.js`
3. Add to CORS allowed origins:
   ```javascript
   'https://absensi.spxsoko.online'
   ```
4. Redeploy backend:
   ```powershell
   cd backend
   npx wrangler deploy --env=production
   ```

---

### Issue 5: Old Domain Still Showing

**Cause:** Browser cache

**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Chrome/Edge) or `Cmd+Shift+R` (Mac)
2. Clear cache: `Ctrl+Shift+Del`
3. Try incognito/private mode
4. Try different browser

---

## 📱 Mobile Configuration

### If Using PWA (Progressive Web App):

Update `manifest.json` with new domain:

```json
{
  "start_url": "https://absensi.spxsoko.online/",
  "scope": "https://absensi.spxsoko.online/"
}
```

---

## 🔄 Rollback Plan

If issues occur, you can rollback to original domain:

1. **Keep pages.dev domain active:**
   - Don't remove `spx-soko-attendance.pages.dev`
   - It always works as fallback

2. **Remove custom domain:**
   - Pages project → Custom domains
   - Click "..." next to domain → Remove
   - Delete CNAME from DNS records

3. **Use original URL:**
   - https://spx-soko-attendance.pages.dev

---

## 📊 Performance After Custom Domain

**Expected:**
- ✅ Same performance as pages.dev
- ✅ Cloudflare CDN caching active
- ✅ DDoS protection
- ✅ SSL/TLS encryption
- ✅ HTTP/2 and HTTP/3 support
- ✅ Brotli compression

**Cloudflare adds NO latency to custom domains!**

---

## 🎯 Summary Commands

### Quick Setup (After DNS Record Created):

```powershell
# 1. Check DNS propagation
nslookup absensi.spxsoko.online

# 2. Test HTTPS
curl -I https://absensi.spxsoko.online

# 3. Test application
# Open: https://absensi.spxsoko.online

# 4. If needed, redeploy
cd "d:\SPX\Spx soko Absensi"
npx wrangler pages deploy frontend --project-name=spx-soko-attendance
```

---

## 📞 Cloudflare Support

If issues persist:

1. **Community Forum:** https://community.cloudflare.com/
2. **Documentation:** https://developers.cloudflare.com/pages/
3. **Status Page:** https://www.cloudflarestatus.com/

---

## ✅ Final Checklist

Before marking as complete:

- [ ] Custom domain added in Pages project
- [ ] DNS CNAME record created and propagated
- [ ] SSL certificate active (HTTPS works)
- [ ] Application loads on new domain
- [ ] All features tested and working
- [ ] Backend API accessible from new domain
- [ ] Mobile devices tested
- [ ] Performance is good
- [ ] Old pages.dev domain kept as fallback

---

## 🚀 Next Steps After Domain Active

1. **Update Documentation:**
   - Update README.md with new URL
   - Update API documentation
   - Update user guides

2. **Notify Users:**
   - Send email/message with new URL
   - Update bookmarks/shortcuts

3. **Monitor:**
   - Check Cloudflare Analytics
   - Monitor error rates
   - Check user feedback

4. **Optional - Redirect Old Domain:**
   - Keep pages.dev active OR
   - Setup 301 redirect from pages.dev to custom domain

---

## 📋 Quick Reference

| Item | Value |
|------|-------|
| **Custom Domain** | absensi.spxsoko.online |
| **Pages Project** | spx-soko-attendance |
| **Old Domain** | spx-soko-attendance.pages.dev |
| **CNAME Target** | spx-soko-attendance.pages.dev |
| **SSL Mode** | Full (strict) |
| **Proxy Status** | Proxied (✅) |
| **Expected Time** | 5-15 minutes |

---

**Status:** ⏳ Waiting for DNS Setup  
**Next:** Follow Step 2 in Cloudflare Dashboard  
**ETA:** 15-20 minutes total  
**Last Updated:** 2026-09-19
