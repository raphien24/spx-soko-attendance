# 🚀 Migration Plan: Cloudflare D1 → Supabase PostgreSQL

## 📊 Overview

**Current Stack:**
- Database: Cloudflare D1 (SQLite-based)
- Backend: Cloudflare Workers
- Storage: Cloudflare R2
- Problem: D1 free tier limit (5M rows read/day)

**Target Stack:**
- Database: Supabase PostgreSQL
- Backend: Cloudflare Workers (tetap pakai)
- Storage: Supabase Storage (atau tetap R2)
- Benefit: **Unlimited** reads/writes on free tier!

---

## ✅ Supabase Free Tier Benefits

- ✅ **Database:** Unlimited API requests, 500 MB storage
- ✅ **No row read limits** (tidak seperti D1)
- ✅ **Real-time subscriptions** (optional feature)
- ✅ **Built-in Auth** (jika mau upgrade auth system)
- ✅ **Storage:** 1 GB file storage
- ✅ **Edge Functions:** 500K invocations/month
- ✅ **Automatic backups**
- ✅ **PostgreSQL features** (JSON, full-text search, etc.)

---

## 📋 Migration Steps

### Phase 1: Setup Supabase Project (30 minutes)

1. **Create Supabase Project**
   - Go to: https://supabase.com
   - Create new project
   - Choose region: Singapore (closest to Indonesia)
   - Note credentials: DB URL, API keys

2. **Get Connection Details**
   ```
   Project URL: https://[project-ref].supabase.co
   Database URL: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   API URL: https://[project-ref].supabase.co/rest/v1/
   anon key: [public-key]
   service_role key: [secret-key]
   ```

---

### Phase 2: Create Schema in Supabase (1 hour)

#### 2.1 Convert SQLite → PostgreSQL Schema

**Key Differences:**
- SQLite `TEXT` → PostgreSQL `VARCHAR` or `TEXT`
- SQLite `INTEGER` → PostgreSQL `INTEGER` or `BIGINT`
- SQLite `REAL` → PostgreSQL `NUMERIC` or `FLOAT`
- Add PostgreSQL-specific features (triggers, row-level security)

#### 2.2 Create Tables

I'll create SQL migration scripts for:
- `users`
- `employees`
- `attendance_logs`
- `roster_schedule`
- `off_schedule`
- `hub_settings`

---

### Phase 3: Export Data from D1 (30 minutes)

```bash
# Export each table
npx wrangler d1 export spx-soko-attendance-production --remote --output=./d1-export.sql

# Or export as CSV per table
npx wrangler d1 execute spx-soko-attendance-production --remote \
  --command="SELECT * FROM users" --json > users.json
```

---

### Phase 4: Import Data to Supabase (30 minutes)

**Option A: Using SQL**
```sql
-- Connect to Supabase via SQL Editor
-- Import converted SQL file
```

**Option B: Using Node.js Script**
```javascript
// Read JSON exports
// Use Supabase JS client to insert
```

---

### Phase 5: Update Backend Code (2 hours)

#### 5.1 Install Supabase Client

```bash
cd backend
npm install @supabase/supabase-js
```

#### 5.2 Update Configuration

**Create:** `backend/src/config/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://[project-ref].supabase.co';
const supabaseKey = 'your-service-role-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### 5.3 Update Queries

**Before (D1):**
```javascript
const stmt = db.prepare('SELECT * FROM users WHERE employee_id = ?');
const result = await stmt.bind(employeeId).first();
```

**After (Supabase):**
```javascript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('employee_id', employeeId)
  .single();
```

---

### Phase 6: Update Environment Variables (15 minutes)

**In Cloudflare Workers:**
```bash
# wrangler.toml
[env.production]
SUPABASE_URL = "https://[project-ref].supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"
SUPABASE_SERVICE_KEY = "your-service-key"
```

Or use Cloudflare Dashboard → Workers → Settings → Variables

---

### Phase 7: Test Migration (1 hour)

1. Test all CRUD operations
2. Test attendance scan
3. Test roster creation
4. Test reports
5. Compare with D1 data

---

### Phase 8: Cutover (30 minutes)

1. Put app in maintenance mode
2. Do final data sync
3. Update production environment variables
4. Deploy new backend
5. Verify all features work
6. Remove maintenance mode

---

## 🔄 Migration Scripts

I'll create these files:

1. **Schema Migration:**
   - `supabase/migrations/001_initial_schema.sql`

2. **Data Export:**
   - `scripts/export-d1-data.js`

3. **Data Import:**
   - `scripts/import-to-supabase.js`

4. **Backend Adapter:**
   - `backend/src/db/supabase-adapter.js`

5. **Verification:**
   - `scripts/verify-migration.js`

---

## 📊 Comparison: D1 vs Supabase

| Feature | Cloudflare D1 | Supabase |
|---------|--------------|----------|
| **Database** | SQLite | PostgreSQL |
| **Free Tier Reads** | 5M rows/day | Unlimited |
| **Free Tier Writes** | 100K rows/day | Unlimited |
| **Storage** | 5 GB | 500 MB |
| **Backups** | Manual | Automatic |
| **Real-time** | No | Yes |
| **Full-text Search** | Limited | Full |
| **JSON Support** | Basic | Advanced |
| **Replication** | No | Yes |
| **Latency (Asia)** | ~50ms | ~30ms (Singapore) |

---

## 💰 Cost Estimation

**Current (Cloudflare):**
- D1: $0 (but hitting limits)
- Workers: $0 (under 100K requests/day)
- R2: ~$0 (minimal storage)

**After Migration (Supabase):**
- Database: $0 (free tier sufficient)
- Workers: $0 (same)
- Storage: $0 or keep R2

**If exceed free tier:**
- Supabase Pro: $25/month (unlimited everything)

---

## ⚠️ Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Keep D1 active during transition
- Do parallel run for 1 week
- Have rollback plan

### Risk 2: Query Performance Differences
**Mitigation:**
- Test all queries beforehand
- PostgreSQL has better indexing than SQLite
- Monitor performance post-migration

### Risk 3: Breaking Changes
**Mitigation:**
- Use adapter pattern (easy to switch back)
- Comprehensive testing
- Staged rollout

---

## 🎯 Timeline

| Phase | Duration | Can Start |
|-------|----------|-----------|
| Setup Supabase | 30 min | Now |
| Create Schema | 1 hour | After setup |
| Export D1 Data | 30 min | After schema |
| Import to Supabase | 30 min | After export |
| Update Backend | 2 hours | After import |
| Testing | 1 hour | After update |
| Deploy | 30 min | After testing |
| **Total** | **~6 hours** | Can do in 1 day |

---

## ✅ Checklist

### Pre-Migration
- [ ] Create Supabase account
- [ ] Create new project (Singapore region)
- [ ] Save all credentials securely
- [ ] Backup current D1 database

### Migration
- [ ] Run schema creation script
- [ ] Export all data from D1
- [ ] Import data to Supabase
- [ ] Update backend queries
- [ ] Update environment variables
- [ ] Run tests

### Post-Migration
- [ ] Verify all data migrated
- [ ] Test all features
- [ ] Monitor for 24 hours
- [ ] Decommission D1 (after 1 week)

---

## 🚀 Next Steps

Want me to:
1. ✅ Create PostgreSQL schema migration script?
2. ✅ Create data export/import scripts?
3. ✅ Update backend to use Supabase?
4. ✅ Create testing checklist?

Let me know and I'll start creating the migration files!

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Migration Guide: https://supabase.com/docs/guides/migrations
