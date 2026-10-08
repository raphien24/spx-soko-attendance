/**
 * Run schema migration to Supabase via REST API
 * Uses Supabase Management API to execute SQL
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
    console.error('❌ SUPABASE_URL dan SUPABASE_SERVICE_KEY harus ada di .env');
    process.exit(1);
}

// Extract project ref from URL
const projectRef = url.replace('https://', '').replace('.supabase.co', '');

console.log('🚀 Running Schema Migration to Supabase...');
console.log(`📡 Project: ${projectRef}\n`);

// Read SQL file
const sqlFile = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

// Execute SQL via Supabase Management API
const response = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: sqlContent })
    }
);

if (!response.ok) {
    // Try alternative approach using pg_dump endpoint
    console.log('⚠️  Direct SQL exec tidak tersedia, mencoba via query API...\n');
    
    // Split SQL into individual statements and run each
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    const supabase = createClient(url, serviceKey);

    for (const stmt of statements) {
        if (!stmt || stmt.length < 5) continue;
        
        try {
            const { error } = await supabase.rpc('exec', { sql: stmt + ';' }).single();
            if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
                // Not a fatal error if table/index already exists
                console.warn(`   ⚠️  Statement warning: ${error.message.substring(0, 80)}`);
            } else {
                successCount++;
            }
        } catch (e) {
            // Some statements might fail if already exist
        }
    }

    console.log('\n⚠️  Perlu jalankan SQL schema manual via Supabase Dashboard SQL Editor');
    console.log('   Lihat instruksi di bawah.\n');
    process.exit(1);
}

const result = await response.json();
console.log('✅ Schema migration berhasil!\n', result);
