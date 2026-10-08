/**
 * Import data from D1 export to Supabase
 * Run: node scripts/import-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.join(__dirname, '../d1-export');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL dan SUPABASE_SERVICE_KEY harus ada di .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Import order penting: users dulu sebelum attendance_logs (foreign key)
const TABLES = [
    'hub_settings',
    'employees',
    'users',
    'attendance_logs',
    'roster_schedule',
    'off_schedule'
];

const BATCH_SIZE = 200;

console.log('🚀 Starting import to Supabase...');
console.log(`📡 URL: ${supabaseUrl}\n`);

async function importTable(tableName) {
    const filename = path.join(EXPORT_DIR, `${tableName}.json`);

    if (!fs.existsSync(filename)) {
        console.warn(`⚠️  File tidak ditemukan: ${filename}`);
        return { imported: 0, errors: 0 };
    }

    const rawData = JSON.parse(fs.readFileSync(filename, 'utf-8'));

    if (rawData.length === 0) {
        console.log(`ℹ️  ${tableName}: tidak ada data\n`);
        return { imported: 0, errors: 0 };
    }

    // Transform data sesuai perbedaan D1 vs Supabase
    const data = rawData.map(row => transformRow(tableName, row));

    console.log(`📦 Importing ${tableName} (${data.length} rows)...`);

    let imported = 0;
    let errors = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(data.length / BATCH_SIZE);

        try {
            const { error } = await supabase
                .from(tableName)
                .upsert(batch, {
                    onConflict: getConflictKey(tableName),
                    ignoreDuplicates: false
                });

            if (error) {
                console.error(`   ❌ Batch ${batchNum}/${totalBatches} error: ${error.message}`);
                errors += batch.length;
            } else {
                imported += batch.length;
                console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} rows`);
            }
        } catch (err) {
            console.error(`   ❌ Batch ${batchNum}/${totalBatches} exception: ${err.message}`);
            errors += batch.length;
        }
    }

    const status = errors === 0 ? '✅' : '⚠️ ';
    console.log(`${status} ${tableName}: ${imported} imported, ${errors} errors\n`);
    return { imported, errors };
}

// Conflict key untuk upsert (primary key atau unique constraint)
function getConflictKey(tableName) {
    const keys = {
        'users': 'employee_id',
        'employees': 'employee_id',
        'attendance_logs': 'id',
        'roster_schedule': 'id',
        'off_schedule': 'id',
        'hub_settings': 'id'
    };
    return keys[tableName] || 'id';
}

// Transform row dari format D1 ke format Supabase
function transformRow(tableName, row) {
    const r = { ...row };

    if (tableName === 'hub_settings') {
        // id di D1 adalah integer → generate UUID deterministik dari id
        if (typeof r.id === 'number' || (typeof r.id === 'string' && !r.id.includes('-'))) {
            r.id = `00000000-0000-0000-0000-${String(r.id).padStart(12, '0')}`;
        }
        return r;
    }

    if (tableName === 'employees') {
        // id di D1 adalah integer → generate UUID deterministik
        if (typeof r.id === 'number' || (typeof r.id === 'string' && !r.id.includes('-'))) {
            r.id = `00000000-0000-0000-0001-${String(r.id).padStart(12, '0')}`;
        }
        return r;
    }

    if (tableName === 'attendance_logs') {
        // scan_type: "IN" → "clock_in", "OUT" → "clock_out"
        if (r.scan_type === 'IN') r.scan_type = 'clock_in';
        else if (r.scan_type === 'OUT') r.scan_type = 'clock_out';
        // photo_url: ambil dari capture_url jika photo_url kosong
        if (!r.photo_url && r.capture_url) r.photo_url = r.capture_url;
        return r;
    }

    return r;
}

// === MAIN ===
const results = {};
const startTime = Date.now();

for (const table of TABLES) {
    results[table] = await importTable(table);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// Summary
console.log('📊 Import Summary:');
console.log('═══════════════════════════════════════════');

let totalImported = 0;
let totalErrors = 0;

for (const [table, result] of Object.entries(results)) {
    const status = result.errors === 0 ? '✅' : '⚠️ ';
    console.log(`${status} ${table.padEnd(20)}: ${String(result.imported).padStart(5)} rows (${result.errors} errors)`);
    totalImported += result.imported;
    totalErrors += result.errors;
}

console.log('═══════════════════════════════════════════');
console.log(`   ${'TOTAL'.padEnd(20)}: ${String(totalImported).padStart(5)} rows (${totalErrors} errors)`);
console.log(`   Waktu: ${elapsed}s`);

if (totalErrors === 0) {
    console.log('\n🎉 Import BERHASIL SEMPURNA! Semua data sudah di Supabase.');
} else {
    console.log(`\n⚠️  Import selesai dengan ${totalErrors} error. Cek pesan error di atas.`);
}

// Save log
const logFile = path.join(EXPORT_DIR, 'import-log.json');
fs.writeFileSync(logFile, JSON.stringify({
    imported_at: new Date().toISOString(),
    supabase_url: supabaseUrl,
    results,
    total_imported: totalImported,
    total_errors: totalErrors,
    elapsed_seconds: parseFloat(elapsed)
}, null, 2));
console.log(`\n📝 Log tersimpan: ${logFile}`);
