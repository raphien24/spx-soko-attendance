# 🧪 Quick Performance Test Guide

## Before You Deploy

Test locally first to verify improvements!

---

## 📱 Step 1: Visual Check (2 minutes)

1. Open `frontend/index.html` in browser
2. Click "🚀 Mulai Scanner Kiosk"
3. Allow camera permission
4. **Expected Behavior:**
   - ✅ Camera feed appears quickly
   - ✅ Face detection is smooth (not choppy)
   - ✅ No visible lag when moving face
   - ✅ Browser tab doesn't freeze
   - ✅ Fan noise minimal (desktop)

---

## 💻 Step 2: Chrome DevTools Test (5 minutes)

### Open Performance Monitor

1. Open Chrome DevTools (F12)
2. Press `Ctrl+Shift+P` → Type "Show Performance Monitor" → Enter
3. Start scanner
4. Watch real-time metrics for 30 seconds

### ✅ Good Performance (Target)

```
CPU Usage: 15-40%
JavaScript heap size: <50 MB
DOM Nodes: <500
Layouts / Second: <5
```

### ❌ Bad Performance (Needs More Work)

```
CPU Usage: >60%
JavaScript heap size: >100 MB
DOM Nodes: >1000
Layouts / Second: >10
```

---

## 🔍 Step 3: Console Check (1 minute)

Look for performance warnings in console:

### ✅ Acceptable Output
```
✓ Face models loaded
✓ Audio initialized
✓ Server connection OK
✓ Webcam initialized
✅ Scanner initialized successfully

(Occasional warnings are OK):
⚠️ Slow face detection: 152ms
⚠️ Slow face detection: 178ms
```

### ❌ Problematic Output
```
⚠️ Slow face detection: 300ms  (too frequent)
⚠️ Slow face detection: 450ms  (too slow)
⚠️ Slow face detection: 500ms  (critical)

(Multiple warnings per second = bad)
```

---

## 📊 Step 4: Record Performance Profile (5 minutes)

### Record Profile

1. Open DevTools → Performance tab
2. Click **Record** button (⚫)
3. Let scanner run for 10 seconds
4. Click **Stop** button (⏹)

### Analyze Results

#### ✅ Good Profile Looks Like:
- **FPS:** Steady at 20-30 (green line)
- **CPU:** <40% average (blue bars short)
- **Main thread:** Mostly idle (white space)
- **Long tasks:** Few or none (yellow/red flags)

#### ❌ Bad Profile Looks Like:
- **FPS:** Erratic, dropping to <10 (red line)
- **CPU:** >60% average (blue bars tall)
- **Main thread:** Constantly busy (no white space)
- **Long tasks:** Many (lots of yellow/red)

---

## 🔥 Step 5: Heat Test (Mobile Only, 10 minutes)

### On Mobile Device

1. Start scanner
2. Let it run for 10 minutes
3. Feel device temperature every 2 minutes

### ✅ Good Temperature
- First 2 min: Warm (normal)
- After 5 min: Warm, stable
- After 10 min: Still warm, not hot
- **Status:** ✅ Pass

### ❌ Bad Temperature
- First 2 min: Hot
- After 5 min: Very hot, uncomfortable to hold
- After 10 min: Burning hot, thermal throttling
- **Status:** ❌ Needs more optimization

---

## 🔋 Step 6: Battery Test (Mobile Only, 1 hour)

### Test Procedure

1. Charge device to 100%
2. Start scanner
3. Let run for 1 hour
4. Check battery percentage

### ✅ Good Battery Drain
- After 1 hour: **85-90%** remaining
- Drain rate: **10-15% per hour**
- **Status:** ✅ Acceptable for 8-hour shift

### ❌ Bad Battery Drain
- After 1 hour: <80% remaining
- Drain rate: >20% per hour
- **Status:** ❌ Won't last full shift, needs optimization

---

## 🎯 Quick Decision Matrix

| Test | Result | Status | Action |
|------|--------|--------|--------|
| Visual Check | Smooth, no lag | ✅ Pass | Continue |
| CPU Monitor | <40% | ✅ Pass | Continue |
| Console | Few warnings | ✅ Pass | Continue |
| Performance Profile | FPS >20 | ✅ Pass | Continue |
| Heat Test | Warm, not hot | ✅ Pass | Continue |
| Battery Test | <15%/hour | ✅ Pass | **Deploy!** |

**If ALL tests pass → Deploy to production! 🚀**

---

## 🚨 If Tests Fail

### CPU Still High (>60%)

**Try:**
1. Increase `FRAME_SKIP` to 4 or 5
2. Reduce `inputSize` to 160
3. Lower video resolution to 480×360

### FPS Still Low (<15)

**Try:**
1. Close other browser tabs
2. Test on different browser
3. Check device specs (might be too old)
4. Consider `FRAME_SKIP = 4`

### Device Still Hot

**Try:**
1. Increase `FRAME_SKIP` to 5
2. Reduce `inputSize` to 160
3. Add breaks between scans
4. Consider tablet instead of phone

### Battery Drain High (>20%/hour)

**Try:**
1. All above optimizations
2. Lower screen brightness
3. Disable other background apps
4. Use power-saving mode

---

## 📱 Recommended Test Devices

### Must Test On:
1. ✅ High-end phone (2022-2023) - Should be excellent
2. ✅ Mid-range phone (2021-2022) - Should be good
3. ✅ Low-end phone (2020-2021) - Should be acceptable

### Expected Results:

| Device Type | CPU | FPS | Battery/hr | Status |
|-------------|-----|-----|------------|--------|
| Flagship 2023 | 20-30% | 25-30 | 10-12% | ✅ Excellent |
| Mid-range 2022 | 30-40% | 18-22 | 12-15% | ✅ Good |
| Budget 2021 | 40-55% | 12-18 | 15-20% | ✅ OK |
| Old 2019 | 60-70% | 10-15 | 20-25% | ⚠️ Marginal |
| Very old 2018 | 80%+ | <10 | 30%+ | ❌ Too slow |

---

## ⏱️ Total Testing Time

- **Quick test:** 5 minutes (visual + console)
- **Full test:** 30 minutes (all except battery)
- **Complete test:** 1.5 hours (including battery)

**Recommended:** Do quick test now, full test before deployment.

---

## 🎉 Success Indicators

You'll know optimization worked if:

1. ✅ **Feel:** Device stays cool during use
2. ✅ **See:** UI is smooth, no stutter
3. ✅ **Hear:** Fans quiet (desktop) or no complaints (mobile)
4. ✅ **Measure:** CPU <40%, FPS >20, battery drain <15%/hr
5. ✅ **Experience:** Can use app for 8 hours without issues

---

## 🚀 Ready to Deploy?

Run this final check:

```
✅ Visual check passed
✅ CPU <40% 
✅ FPS >20
✅ Console clean (few warnings)
✅ Performance profile good
✅ Device cool
✅ Battery drain acceptable

Status: READY TO DEPLOY! 🚀
```

---

**Deploy Command:**
```powershell
cd "d:\SPX\Spx soko Absensi"
npx wrangler pages deploy frontend --project-name=spx-soko-attendance
```

**Test URL after deploy:**
```
https://spx-soko-attendance.pages.dev
```

---

**Good luck! 🎉**
