# 🔧 CORS Configuration Fixed for Production

## 🐛 Problem

Error di production:
```
blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present
```

## ✅ Solution Applied

### Changes Made to `backend/src/utils/cors.js`:

#### 1. **Updated ALLOWED_ORIGINS**
```javascript
const ALLOWED_ORIGINS = [
    'http://localhost:8080',           // Local development
    'http://localhost:3000',           // Alternative local port
    'http://127.0.0.1:8080',          // Alternative localhost
    'http://localhost:5500',           // Live Server default port
    'http://127.0.0.1:5500',          // Live Server alternative
    // Production origins - Cloudflare Pages
    'https://*.pages.dev',             // Wildcard for all CF Pages deployments
    // Add your specific production URLs below:
    // 'https://spx-soko-attendance.pages.dev',
    // 'https://attendance.spxexpress.com'
];
```

#### 2. **Added `isCloudflarePages()` Function**
```javascript
function isCloudflarePages(origin) {
    try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Allow any *.pages.dev domain
        return hostname.endsWith('.pages.dev');
    } catch (error) {
        return false;
    }
}
```

#### 3. **Enhanced `isOriginAllowed()` Function**
Now supports:
- ✅ Exact origin match
- ✅ Wildcard patterns (e.g., `https://*.pages.dev`)
- ✅ Development origins (localhost, 127.0.0.1)
- ✅ All Cloudflare Pages deployments

#### 4. **Improved `getCorsHeaders()` Function**
```javascript
function getCorsHeaders(request) {
    const origin = request.headers.get('Origin');
    const headers = {};
    
    if (!origin) {
        // No origin header - set wildcard for non-browser requests
        headers['Access-Control-Allow-Origin'] = '*';
    } else {
        // Check if origin is allowed
        if (ALLOWED_ORIGINS.includes(origin) || 
            isDevelopmentOrigin(origin) || 
            isCloudflarePages(origin)) {
            // Echo back the allowed origin
            headers['Access-Control-Allow-Origin'] = origin;
        } else {
            // Check wildcard patterns
            // ... (pattern matching logic)
        }
    }
    
    // Add standard CORS headers
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
    headers['Access-Control-Max-Age'] = '86400'; // 24 hours
    headers['Vary'] = 'Origin'; // Important for caching
    
    return headers;
}
```

---

## 🚀 Re-deploy Backend

After making these changes, you MUST re-deploy the backend:

### Step 1: Navigate to Backend Folder
```powershell
cd backend
```

### Step 2: Deploy to Production
```powershell
npx wrangler deploy --env=production
```

Expected output:
```
⛅️ wrangler 4.x.x
Total Upload: xx KB
Uploaded spx-soko-attendance-api (x.xx sec)
Published spx-soko-attendance-api (x.xx sec)
  https://spx-soko-attendance-api-production.YOUR-SUBDOMAIN.workers.dev
✨ Done in x.xxs
```

---

## 🧪 Testing CORS

### Test 1: Health Endpoint (Browser)

Open your Cloudflare Pages URL in browser:
```
https://YOUR-PROJECT.pages.dev
```

Open Console (F12) and run:
```javascript
fetch('https://YOUR-WORKER-URL/api/health')
    .then(res => res.json())
    .then(data => console.log('✅ CORS works!', data))
    .catch(err => console.error('❌ CORS failed:', err));
```

**Expected Output:**
```json
✅ CORS works! {
  "success": true,
  "status": "healthy",
  "timestamp": "2026-09-19T...",
  "services": {
    "worker": "ok",
    "database": "ok",
    "storage": "ok"
  }
}
```

---

### Test 2: Preflight Request (curl)

Test OPTIONS request (preflight):
```powershell
curl -i -X OPTIONS https://YOUR-WORKER-URL/api/health `
  -H "Origin: https://YOUR-PROJECT.pages.dev" `
  -H "Access-Control-Request-Method: GET"
```

**Expected Headers:**
```
HTTP/2 204
access-control-allow-origin: https://YOUR-PROJECT.pages.dev
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-allow-headers: Content-Type, Authorization, X-Requested-With
access-control-max-age: 86400
vary: Origin
```

---

### Test 3: Actual Request

```powershell
curl -i https://YOUR-WORKER-URL/api/health `
  -H "Origin: https://YOUR-PROJECT.pages.dev"
```

**Expected Headers:**
```
HTTP/2 200
content-type: application/json
access-control-allow-origin: https://YOUR-PROJECT.pages.dev
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-allow-headers: Content-Type, Authorization, X-Requested-With
access-control-max-age: 86400
vary: Origin
```

---

## 🔍 Troubleshooting

### Problem 1: Still Getting CORS Error

**Possible Causes:**
1. Backend not re-deployed after changes
2. Browser cache not cleared
3. Wrong Worker URL in frontend config.js

**Solutions:**

#### A. Clear Browser Cache
```
Windows: Ctrl + Shift + R (hard refresh)
Mac: Cmd + Shift + R
```

Or open DevTools → Application → Storage → Clear Site Data

#### B. Verify Worker URL

Check `frontend/src/js/config.js`:
```javascript
function getEnvironmentApiUrl() {
    if (isDevelopment()) {
        return 'http://localhost:8787';
    } else {
        // THIS MUST MATCH YOUR DEPLOYED WORKER URL
        return 'https://spx-soko-attendance-api-production.YOUR-SUBDOMAIN.workers.dev';
    }
}
```

#### C. Check Console for Actual URL Being Called

Open Console (F12) in your Pages deployment, look for network requests:
```
Failed to load resource: net::ERR_FAILED
https://SOME-URL/api/...
```

Make sure `SOME-URL` matches your Worker URL!

---

### Problem 2: OPTIONS Request Returns 404

**Symptom:**
```
Preflight response is not successful. Status code: 404
```

**Cause:** Worker not handling OPTIONS method

**Solution:** Already fixed in `index.js`:
```javascript
// Handle CORS preflight (OPTIONS)
if (method === 'OPTIONS') {
    return handleCorsPreFlight(request);
}
```

If still happening, ensure backend is re-deployed!

---

### Problem 3: CORS Works But No Data

**Symptom:**
- No CORS errors
- API returns empty data or errors

**Check:**

1. **Database has data?**
```powershell
cd backend
npx wrangler d1 execute spx-soko-attendance-production --command="SELECT COUNT(*) as total FROM users;" --env=production
```

2. **R2 bucket correct?**
Check `backend/wrangler.toml`:
```toml
[[env.production.r2_buckets]]
binding = "ATTENDANCE_BUCKET"
bucket_name = "spx-soko-attendance-production"
```

3. **Environment correct?**
Make sure you deployed with `--env=production` flag!

---

## 📋 Complete Deployment Checklist

After CORS fix, ensure:

- ✅ **Backend re-deployed:**
  ```powershell
  cd backend
  npx wrangler deploy --env=production
  ```

- ✅ **Frontend config updated:**
  - Check `frontend/src/js/config.js` has correct Worker URL
  
- ✅ **Frontend re-deployed (if config changed):**
  ```powershell
  cd ..
  npx wrangler pages deploy frontend --project-name=spx-soko-attendance
  ```

- ✅ **Browser cache cleared:**
  - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

- ✅ **CORS tested:**
  - Health endpoint accessible from Pages
  - No CORS errors in Console
  - API returns data

---

## 🎯 What CORS Headers Are Returned?

### For Cloudflare Pages Requests:

**Request:**
```
Origin: https://abc123.spx-soko-attendance.pages.dev
```

**Response Headers:**
```
Access-Control-Allow-Origin: https://abc123.spx-soko-attendance.pages.dev
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Vary: Origin
```

### For Development (localhost):

**Request:**
```
Origin: http://localhost:5500
```

**Response Headers:**
```
Access-Control-Allow-Origin: http://localhost:5500
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Vary: Origin
```

### For Direct Access (no Origin header):

**Response Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
```

---

## 📝 Custom Domain Setup (Optional)

If you want to use custom domain (e.g., `attendance.spxexpress.com`):

### Step 1: Add to ALLOWED_ORIGINS

Edit `backend/src/utils/cors.js`:
```javascript
const ALLOWED_ORIGINS = [
    // ... existing origins ...
    'https://attendance.spxexpress.com',  // ← Add your custom domain
];
```

### Step 2: Re-deploy Backend
```powershell
cd backend
npx wrangler deploy --env=production
```

### Step 3: Setup Domain in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → `spx-soko-attendance`
3. Custom domains → Add custom domain
4. Follow DNS setup instructions

---

## 🔒 Security Notes

### Current Configuration: Permissive

```javascript
// Allows ALL Cloudflare Pages deployments
return hostname.endsWith('.pages.dev');
```

This is **convenient** but **less secure** because:
- ✅ Works for all preview deployments
- ✅ No need to update CORS on each deployment
- ⚠️ Anyone can deploy a Pages site and access your API

### Recommended for Production: Restrictive

For production, use **specific origins** instead:

```javascript
const ALLOWED_ORIGINS = [
    'http://localhost:8080',           // Development only
    'https://spx-soko-attendance.pages.dev',  // Production only
    'https://attendance.spxexpress.com'       // Custom domain
];
```

Then **remove** or **comment out** the wildcard check:
```javascript
// Comment this out for production:
// if (isCloudflarePages(origin)) {
//     return true;
// }
```

**Trade-off:**
- ✅ More secure (only specific origins allowed)
- ❌ Preview deployments won't work (must add manually)
- ❌ Need to re-deploy backend when adding new origin

---

## 🎉 Summary

**What Was Fixed:**
1. ✅ Added support for Cloudflare Pages origins
2. ✅ Added wildcard pattern matching (`*.pages.dev`)
3. ✅ Enhanced CORS headers with `Vary: Origin`
4. ✅ Improved origin validation logic
5. ✅ Added `isCloudflarePages()` helper function

**What You Need to Do:**
1. ✅ Re-deploy backend: `npx wrangler deploy --env=production`
2. ✅ Clear browser cache: `Ctrl + Shift + R`
3. ✅ Test in browser Console
4. ✅ Verify no CORS errors

**Expected Result:**
- ✅ No CORS errors in Console
- ✅ Frontend can fetch from backend API
- ✅ All features work (enrollment, scanning, admin dashboard)

---

**Need Help?**

If CORS still not working after following this guide:
1. Check browser Console for exact error message
2. Copy the error and Worker URL
3. Test Worker URL directly in browser
4. Verify `Origin` header in Network tab (DevTools → Network → Request Headers)
