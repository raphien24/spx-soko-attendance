# 📋 Fitur Popup Pre-Trip untuk Rider

## Overview
Setelah Rider berhasil absensi, akan muncul popup reminder untuk mengisi form Pre-Trip, kemudian otomatis redirect ke Google Form.

## Jabatan yang Termasuk

Fitur ini aktif untuk jabatan:
1. ✅ **Rider Dedicated**
2. ✅ **Rider Mitra**
3. ✅ **Rider Plus**

## Flow Diagram

```
User Scan Wajah
     ↓
Absensi Berhasil
     ↓
[Notifikasi Sukses] (1.5 detik)
     ↓
[POPUP MUNCUL] ⚠️
     ↓
"AGAR TIDAK ADA POTONGAN
 WAJIB ISI PRETRIP SEBELUM AT"
     ↓
┌──────────────────────────┐
│  📋 Isi Pre-Trip Sekarang │ ← Klik = Redirect ke Google Form
└──────────────────────────┘
┌──────────────────────────┐
│      Nanti Saja          │ ← Klik = Close popup, lanjut scan
└──────────────────────────┘
```

## Implementasi

### File Modified
**`frontend/src/js/scanner.js`**

### Detection Logic
```javascript
const isRider = data.role && (
    data.role.toLowerCase().includes('rider dedicated') ||
    data.role.toLowerCase().includes('rider mitra') ||
    data.role.toLowerCase().includes('rider plus')
);
```

### Popup Content
- **Judul**: "Penting untuk [Role]!"
- **Pesan Utama**: "AGAR TIDAK ADA POTONGAN WAJIB ISI PRETRIP SEBELUM AT"
- **Icon**: ⚠️ (Warning)
- **Button Primary**: "📋 Isi Pre-Trip Sekarang" → Redirect ke form
- **Button Secondary**: "Nanti Saja" → Close popup

### Google Form URL
```
https://docs.google.com/forms/d/e/1FAIpQLSfY3Ne0kfEQqMyYIwOJGwArmMUqiU-1nnD78OFi1BzjL2JTFQ/viewform
```

## User Experience

### Timeline:
1. **0s**: Scan wajah berhasil
2. **0-1.5s**: Notifikasi "Absen Berhasil!" muncul
3. **1.5s**: Popup Pre-Trip muncul dengan animasi
4. **User action**:
   - Klik "Isi Pre-Trip" → Redirect langsung ke form
   - Klik "Nanti Saja" → Popup close, scanner ready lagi

### Animations:
- ✅ Fade in (popup overlay)
- ✅ Slide up (popup content)
- ✅ Scale transition (buttons hover)
- ✅ Fade out (popup close)

## Design Specs

### Popup Styling:
```css
- Background: Semi-transparent black overlay (75% opacity)
- Card: White background, rounded corners (2xl), shadow-2xl
- Max width: 28rem (448px)
- Padding: 2rem
- Z-index: 50 (always on top)
```

### Button Primary:
```css
- Background: Blue 600 → Blue 700 (hover)
- Text: White, bold
- Padding: 1rem vertical, 1.5rem horizontal
- Hover effect: Scale 1.05
- Shadow: Large
```

### Button Secondary:
```css
- Background: Gray 300 → Gray 400 (hover)
- Text: Gray 800, semibold
- Padding: 0.5rem vertical, 1rem horizontal
```

## Testing

### Test Case 1: Rider Dedicated
1. Scan wajah user dengan role "Rider Dedicated"
2. ✅ Expected: Popup muncul
3. Klik "Isi Pre-Trip Sekarang"
4. ✅ Expected: Redirect ke Google Form

### Test Case 2: Rider Mitra
1. Scan wajah user dengan role "Rider Mitra"
2. ✅ Expected: Popup muncul
3. Klik "Nanti Saja"
4. ✅ Expected: Popup close, scanner ready

### Test Case 3: Rider Plus
1. Scan wajah user dengan role "Rider Plus"
2. ✅ Expected: Popup muncul

### Test Case 4: Non-Rider (e.g., Admin, Supervisor)
1. Scan wajah user dengan role "Admin"
2. ✅ Expected: Popup TIDAK muncul
3. ✅ Expected: Notifikasi normal, lalu auto-hide

## Case-Insensitive Detection

Role detection menggunakan `.toLowerCase()` sehingga format berikut semua terdeteksi:
- ✅ "Rider Dedicated"
- ✅ "rider dedicated"
- ✅ "RIDER DEDICATED"
- ✅ "Rider Mitra"
- ✅ "rider mitra"
- ✅ "Rider Plus"
- ✅ "RIDER PLUS"

## Edge Cases Handled

1. **Multiple rapid scans**: Popup hanya muncul setelah cooldown
2. **Popup already open**: Not possible karena cooldown
3. **Network error during redirect**: Browser native handling
4. **User closes tab before redirect**: Normal behavior

## Deploy

### Frontend Only (Cloudflare Pages)
Karena perubahan hanya di frontend (`scanner.js`), deploy via:

**Option 1: Git Push (Auto-deploy)**
```bash
git add frontend/src/js/scanner.js
git commit -m "Add Rider Pre-Trip popup and redirect"
git push origin main
```

**Option 2: Manual Deploy**
```bash
cd frontend
npx wrangler pages deploy .
```

### No Backend Changes Required
Backend tidak perlu deploy ulang karena tidak ada perubahan di API.

## Future Enhancements

Potential improvements:
- [ ] Add analytics tracking untuk button clicks
- [ ] Customizable form URL per role
- [ ] Multi-language support
- [ ] Skip popup jika sudah isi Pre-Trip hari ini
- [ ] Add countdown timer untuk auto-redirect

## Support

Jika user mengalami masalah:
1. Cek role user di database (harus exact match dengan detection logic)
2. Clear browser cache
3. Cek console logs untuk errors
4. Verify Google Form URL masih aktif

---

**Status**: ✅ Implemented  
**Version**: 1.0  
**Date**: 2026-09-24
