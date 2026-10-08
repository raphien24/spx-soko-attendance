/**
 * Test Supabase connection
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

console.log('🔌 Testing Supabase connection...');
console.log(`📡 URL: ${url}`);
console.log(`🔑 Key: ${key?.substring(0, 20)}...`);

const supabase = createClient(url, key);

try {
    // Simple test: list tables in public schema
    const { data, error } = await supabase
        .from('_test_connection_dummy_')
        .select('*')
        .limit(1);

    // Even if table doesn't exist, error code 42P01 = "relation not found"
    // means connection IS working, just table doesn't exist yet (expected)
    if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('relation')) {
            console.log('\n✅ Koneksi Supabase BERHASIL!');
            console.log('   (Table belum ada - akan dibuat di step berikutnya)\n');
        } else if (error.message.includes('Invalid API key') || error.message.includes('401')) {
            console.error('\n❌ KONEKSI GAGAL: API key tidak valid!');
            console.error('   Periksa kembali SUPABASE_SERVICE_KEY di .env\n');
            process.exit(1);
        } else {
            console.log('\n✅ Koneksi Supabase BERHASIL!');
            console.log(`   Info: ${error.message}\n`);
        }
    } else {
        console.log('\n✅ Koneksi Supabase BERHASIL!\n');
    }
} catch (err) {
    console.error('\n❌ KONEKSI GAGAL:', err.message);
    process.exit(1);
}
