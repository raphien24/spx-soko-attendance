/**
 * Import data from D1 export to Supabase
 * Run: node scripts/import-to-supabase.js
 * 
 * Prerequisites:
 * 1. Run export-d1-data.js first
 * 2. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 * 3. Run schema migration in Supabase first
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const EXPORT_DIR = './d1-export';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables to import (in order - dependencies first)
const TABLES = [
    'hub_settings',
    'employees',
    'users',
    'attendance_logs',
    'roster_schedule',
    'off_schedule'
];

console.log('🚀 Starting Supabase import...\n');
console.log(`📡 Supabase URL: ${supabaseUrl}\n`);

async function importTable(tableName) {
    const filename = path.join(EXPORT_DIR, `${tableName}.json`);
    
    if (!fs.existsSync(filename)) {
        console.warn(`⚠️  File not found: ${filename}`);
        return;
    }
    
    const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    
    if (data.length === 0) {
        console.log(`ℹ️  No data to import for ${tableName}\n`);
        return;
    }
    
    console.log(`📦 Importing ${tableName} (${data.length} rows)...`);
    
    // Import in batches (Supabase limit: 1000 rows per request)
    const batchSize = 500;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        try {
            const { data: result, error } = await supabase
                .from(tableName)
                .insert(batch);
            
            if (error) {
                console.error(`   ❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
                errors += batch.length;
            } else {
                imported += batch.length;
                console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} rows`);
            }
        } catch (error) {
            console.error(`   ❌ Batch ${Math.floor(i / batchSize) + 1} exception:`, error.message);
            errors += batch.length;
        }
    }
    
    console.log(`✅ ${tableName}: ${imported} imported, ${errors} errors\n`);
    
    return { imported, errors };
}

async function main() {
    const results = {};
    
    for (const table of TABLES) {
        const result = await importTable(table);
        if (result) {
            results[table] = result;
        }
    }
    
    // Summary
    console.log('\n📊 Import Summary:');
    console.log('═══════════════════════════════════════');
    
    let totalImported = 0;
    let totalErrors = 0;
    
    for (const [table, result] of Object.entries(results)) {
        console.log(`${table.padEnd(20)} : ${result.imported.toString().padStart(5)} rows (${result.errors} errors)`);
        totalImported += result.imported;
        totalErrors += result.errors;
    }
    
    console.log('═══════════════════════════════════════');
    console.log(`TOTAL                : ${totalImported.toString().padStart(5)} rows (${totalErrors} errors)`);
    
    if (totalErrors === 0) {
        console.log('\n✅ Migration completed successfully!');
    } else {
        console.log(`\n⚠️  Migration completed with ${totalErrors} errors`);
        console.log('   Check error messages above for details');
    }
    
    // Save import log
    const logFilename = path.join(EXPORT_DIR, 'import-log.json');
    fs.writeFileSync(logFilename, JSON.stringify({
        imported_at: new Date().toISOString(),
        supabase_url: supabaseUrl,
        results: results,
        total_imported: totalImported,
        total_errors: totalErrors
    }, null, 2));
    
    console.log(`\n📝 Import log saved to: ${logFilename}`);
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
