# 🚀 Supabase Migration Guide - Step by Step

## Prerequisites

- [x] Supabase account (https://supabase.com)
- [x] Node.js installed
- [x] Git repository access
- [x] Access to Cloudflare D1 data

---

## Step 1: Create Supabase Project (10 minutes)

### 1.1 Sign up / Login to Supabase
1. Go to https://supabase.com
2. Sign in with your GitHub account (already connected)
3. Click "New Project"

### 1.2 Configure Project
```
Organization: Your GitHub username
Project Name: spx-soko-attendance
Database Password: [Generate strong password - SAVE THIS!]
Region: Southeast Asia (Singapore)
Pricing Plan: Free
```

### 1.3 Wait for Setup (2-3 minutes)
- Database provisioning
- API endpoints generation
- Storage bucket creation

### 1.4 Save Credentials
Go to: `Settings` → `API`

Copy these values:
```
Project URL: https://[project-ref].supabase.co
Project API keys:
  - anon/public: eyJhb... (for frontend)
  - service_role: eyJhb... (for backend - KEEP SECRET!)
```

Go to: `Settings` → `Database`

Copy:
```
Connection string (URI):
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

---

## Step 2: Setup Local Environment (5 minutes)

### 2.1 Create .env file
```bash
cd "d:\SPX\Spx soko Absensi"
cp .env.example .env
```

### 2.2 Edit .env and fill in credentials
```env
SUPABASE_URL=https://[your-project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_KEY=eyJhb...
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 2.3 Install dependencies
```bash
npm install @supabase/supabase-js dotenv
```

---

## Step 3: Run Schema Migration (5 minutes)

### 3.1 Option A: Using Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard
2. Click `SQL Editor` in left sidebar
3. Click `New Query`
4. Copy content from: `supabase/migrations/001_initial_schema.sql`
5. Paste into SQL Editor
6. Click `Run` button
7. Should see: "Success. No rows returned"

### 3.2 Option B: Using psql (Advanced)

```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" < supabase/migrations/001_initial_schema.sql
```

### 3.3 Verify Tables Created

In SQL Editor, run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected output:
- attendance_logs
- employees
- hub_settings
- off_schedule
- roster_schedule
- users

---

## Step 4: Export Data from D1 (10 minutes)

### 4.1 Run export script
```bash
node scripts/export-d1-data.js
```

### 4.2 Verify export
Check directory: `d1-export/`

Should contain:
- users.json
- employees.json
- attendance_logs.json
- roster_schedule.json
- off_schedule.json
- hub_settings.json
- export-summary.json

### 4.3 Check export summary
```bash
cat d1-export/export-summary.json
```

Example output:
```json
{
  "exported_at": "2026-10-03T02:15:00.000Z",
  "database": "spx-soko-attendance-production",
  "tables": {
    "users": { "row_count": 125, "file_size": 45678 },
    "employees": { "row_count": 150, "file_size": 23456 },
    "attendance_logs": { "row_count": 2500, "file_size": 567890 },
    "roster_schedule": { "row_count": 331, "file_size": 78901 },
    "off_schedule": { "row_count": 45, "file_size": 12345 },
    "hub_settings": { "row_count": 1, "file_size": 234 }
  }
}
```

---

## Step 5: Import Data to Supabase (15 minutes)

### 5.1 Run import script
```bash
node scripts/import-to-supabase.js
```

### 5.2 Monitor import progress
```
🚀 Starting Supabase import...
📡 Supabase URL: https://[project-ref].supabase.co

📦 Importing hub_settings (1 rows)...
   ✅ Batch 1: 1 rows
✅ hub_settings: 1 imported, 0 errors

📦 Importing employees (150 rows)...
   ✅ Batch 1: 150 rows
✅ employees: 150 imported, 0 errors

📦 Importing users (125 rows)...
   ✅ Batch 1: 125 rows
✅ users: 125 imported, 0 errors

...

✅ Migration completed successfully!
```

### 5.3 Verify data in Supabase

In SQL Editor:
```sql
-- Check row counts
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'attendance_logs', COUNT(*) FROM attendance_logs
UNION ALL
SELECT 'roster_schedule', COUNT(*) FROM roster_schedule
UNION ALL
SELECT 'off_schedule', COUNT(*) FROM off_schedule;
```

Should match export summary counts.

---

## Step 6: Update Backend Code (30 minutes)

### 6.1 Update wrangler.toml

Add Supabase environment variables:

```toml
[env.production]
name = "spx-soko-attendance-api-production"

# Keep D1 for now (backup)
[[env.production.d1_databases]]
binding = "DB"
database_name = "spx-soko-attendance-production"
database_id = "9c5413f8-0dd0-424f-b1a5-a94f9fdebeac"

# Add Supabase vars
[env.production.vars]
USE_SUPABASE = "true"
SUPABASE_URL = "https://[project-ref].supabase.co"

# Add secrets via wrangler CLI (DO NOT commit service key!)
# Run: wrangler secret put SUPABASE_SERVICE_KEY --env production
```

### 6.2 Add secret
```bash
cd backend
npx wrangler secret put SUPABASE_SERVICE_KEY --env production
# Paste your service_role key when prompted
```

### 6.3 Update index.js to use Supabase

Option A: Edit `backend/src/index.js` to check `USE_SUPABASE` flag
Option B: Create new deployment with Supabase only

I'll create a modified index.js for you...

---

## Step 7: Deploy & Test (30 minutes)

### 7.1 Deploy backend
```bash
cd backend
npm run deploy
```

### 7.2 Test endpoints

```bash
# Test health check
curl https://spx-soko-attendance-api-production.your-worker.workers.dev/health

# Test get users
curl https://spx-soko-attendance-api-production.your-worker.workers.dev/api/users

# Test get roster
curl https://spx-soko-attendance-api-production.your-worker.workers.dev/api/roster?date=2026-10-02
```

### 7.3 Test frontend

1. Open admin panel
2. Test all features:
   - Dashboard loads
   - View today's attendance
   - View roster
   - Create new roster
   - Clock in/out

---

## Step 8: Monitor & Verify (24 hours)

### 8.1 Check Supabase Dashboard

- Go to: `Database` → `Tables`
- Verify new data appearing
- Check logs for errors

### 8.2 Check Cloudflare Workers Analytics

- Requests should still work
- No increase in errors

### 8.3 Compare with D1 (Parallel Run)

Run queries on both to verify consistency:
```sql
-- In D1
SELECT COUNT(*) FROM attendance_logs WHERE date(timestamp) = '2026-10-03';

-- In Supabase
SELECT COUNT(*) FROM attendance_logs WHERE DATE(timestamp) = '2026-10-03';
```

---

## Step 9: Final Cutover (After 1 week)

### 9.1 Stop using D1
Remove D1 binding from wrangler.toml:
```toml
# [[env.production.d1_databases]]  # Commented out
# binding = "DB"
# database_name = "spx-soko-attendance-production"
# database_id = "9c5413f8-0dd0-424f-b1a5-a94f9fdebeac"
```

### 9.2 Keep D1 as backup for 1 month
Don't delete D1 database yet, just in case.

### 9.3 After 1 month of stable operation
Delete D1 database from Cloudflare Dashboard.

---

## Rollback Plan (If Something Goes Wrong)

### Quick Rollback:
```bash
# 1. Revert wrangler.toml
git checkout backend/wrangler.toml

# 2. Redeploy
cd backend && npm run deploy

# 3. D1 data is still intact, app works as before
```

### Data Recovery:
- D1 database still has all data (not deleted)
- Export from D1 again if needed
- Re-import to Supabase

---

## Troubleshooting

### Issue: Import fails with "duplicate key value"
**Solution:** Truncate tables and re-import:
```sql
TRUNCATE users, employees, attendance_logs, roster_schedule, off_schedule CASCADE;
```

### Issue: "relation does not exist"
**Solution:** Re-run schema migration

### Issue: Slow queries
**Solution:** Check indexes:
```sql
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Issue: Connection timeout
**Solution:** Check Supabase project is not paused (free tier auto-pauses after 7 days inactivity)

---

## Performance Comparison

### Cloudflare D1:
- Read latency: ~50ms
- Write latency: ~100ms
- Limit: 5M rows read/day

### Supabase (Singapore):
- Read latency: ~30-50ms
- Write latency: ~50-80ms
- Limit: Unlimited (free tier)

---

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create issue in your repo

---

## Cost Projection

### Free Tier (Current usage):
- ✅ Database: < 500 MB ✓
- ✅ API requests: < 50K/day ✓
- ✅ Bandwidth: < 2 GB/month ✓
- **Total: $0/month**

### If exceed free tier:
- Supabase Pro: $25/month
- Still cheaper than D1 overages

---

## Next Steps

Ready to start? Follow steps in order:
1. ✅ Create Supabase project
2. ✅ Run schema migration
3. ✅ Export D1 data
4. ✅ Import to Supabase
5. ✅ Update backend
6. ✅ Test thoroughly
7. ✅ Deploy!

Good luck! 🚀
