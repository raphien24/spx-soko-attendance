# 📋 Panduan Database Migration - SPX Soko Attendance

> Database: **Supabase PostgreSQL**  
> Project: `xewsujwimdubamfkqgey`  
> Repo: `raphien24/spx-soko-attendance`

---

## ✅ CARA YANG BENAR — Update Schema Database

### Langkah-langkah:

**1. Buat file migration baru**

Lokasi: `supabase/migrations/`  
Format nama: `YYYYMMDDHHMMSS_nama_perubahan.sql`

```
supabase/migrations/20261010000000_add_notes_to_roster.sql
```

**2. Tulis SQL perubahan di dalam file tersebut**

```sql
-- Contoh: tambah kolom notes di roster_schedule
ALTER TABLE roster_schedule ADD COLUMN IF NOT EXISTS notes TEXT;
```

**3. Push ke GitHub**

```bash
git add supabase/migrations/
git commit -m "feat: add notes column to roster"
git push origin main
```

**4. Selesai!** Supabase otomatis menjalankan migration baru ✅

---

## ❌ LARANGAN — Yang TIDAK Boleh Dilakukan

### ❌ 1. Jangan Edit Tabel Langsung via Supabase Dashboard

**Masalah:** Perubahan tidak tercatat di migration history. Saat ada developer lain atau reset database, perubahan ini akan hilang.

```
❌ Supabase Dashboard → Table Editor → Edit kolom/tabel langsung
❌ Supabase Dashboard → SQL Editor → ALTER TABLE / DROP TABLE langsung
```

✅ **Solusi:** Selalu buat file migration baru, lalu push ke GitHub.

---

### ❌ 2. Jangan Edit File Migration yang Sudah Ada

**Masalah:** File yang sudah pernah dijalankan (`applied`) tidak akan dijalankan ulang. Perubahan di file lama akan diabaikan oleh Supabase.

```
❌ Edit file: supabase/migrations/20261003000000_initial_schema.sql
   (file ini sudah applied, perubahan tidak akan dieksekusi)
```

✅ **Solusi:** Buat file migration BARU dengan timestamp terbaru.

```
✅ Buat file baru: supabase/migrations/20261010000000_nama_perubahan.sql
```

---

### ❌ 3. Jangan Gunakan Timestamp yang Sama atau Lebih Lama

**Masalah:** Migration dijalankan berurutan berdasarkan timestamp. File dengan timestamp lama akan dianggap sudah dijalankan atau konflik.

```
❌ 20261003000000_perubahan_baru.sql  ← timestamp sama dengan yang sudah ada
❌ 20261001000000_perubahan_baru.sql  ← timestamp lebih lama
```

✅ **Solusi:** Selalu gunakan tanggal hari ini saat membuat file baru.

```
✅ 20261010000000_perubahan_baru.sql  ← timestamp lebih baru
```

---

### ❌ 4. Jangan Hapus File Migration yang Sudah Ada di Folder

**Masalah:** Supabase akan mendeteksi file hilang dan menganggap migration history tidak sinkron (`supabase migration list` akan error).

```
❌ Hapus file: supabase/migrations/20261003000000_initial_schema.sql
```

✅ **Solusi:** Jangan pernah hapus file migration. Jika ingin membatalkan perubahan, buat migration baru yang me-revert perubahan sebelumnya.

---

### ❌ 5. Jangan Gunakan DROP TABLE atau TRUNCATE Sembarangan

**Masalah:** Data production akan hilang permanen dan tidak bisa dikembalikan.

```sql
❌ DROP TABLE roster_schedule;
❌ TRUNCATE attendance_logs;
```

✅ **Solusi:** Jika memang perlu hapus data, backup dulu via export atau Supabase dashboard, baru jalankan.

---

### ❌ 6. Jangan Commit File `.env` ke GitHub

**Masalah:** Credentials Supabase (service key, anon key) akan terbuka ke publik dan bisa disalahgunakan.

```
❌ git add .env
❌ git commit -m "tambah .env"
```

✅ **Solusi:** File `.env` sudah ada di `.gitignore`. Jangan pernah dihapus dari `.gitignore`.

---

### ❌ 7. Jangan Jalankan `supabase db reset` di Production

**Masalah:** Perintah ini akan **menghapus semua data** di database dan menjalankan ulang semua migration dari awal.

```bash
❌ supabase db reset  ← BERBAHAYA di production!
```

✅ **Solusi:** Perintah ini hanya untuk local development. Untuk production, selalu gunakan `supabase db push`.

---

## 📁 Struktur Folder Migration yang Benar

```
supabase/
├── config.toml                            ← Konfigurasi project (jangan diedit sembarangan)
└── migrations/
    ├── 20261003000000_initial_schema.sql  ← ✅ Sudah applied, JANGAN diedit
    ├── 20261010000000_tambah_kolom_x.sql  ← ✅ Migration berikutnya
    └── 20261015000000_ubah_tabel_y.sql    ← ✅ Migration berikutnya lagi
```

---

## 🔧 Perintah CLI yang Berguna

```bash
# Cek status migration (local vs remote)
supabase migration list

# Push migration baru ke production
supabase db push

# Repair jika ada migration yang out of sync
supabase migration repair --status applied YYYYMMDDHHMMSS

# Login ulang CLI
supabase login --token sbp_xxx...
```

---

## 🆘 Jika Terjadi Error Migration

**Cek status:**
```bash
supabase migration list
```

**Jika ada migration yang missing di remote:**
```bash
supabase migration repair --status applied YYYYMMDDHHMMSS
```

**Jika ada migration yang salah dijalankan:**
```bash
supabase migration repair --status reverted YYYYMMDDHHMMSS
```

---

*Dokumentasi ini berlaku untuk project SPX Soko Attendance.*  
*Last updated: Oktober 2026*
