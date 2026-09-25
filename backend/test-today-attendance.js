/**
 * Test script untuk debug getTodayAttendance
 * Menampilkan timestamp yang tersimpan dan logic pengecekan tanggal
 */

// Simulasi timezone check
function testTimezone() {
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const today = wibTime.toISOString().split('T')[0]; // YYYY-MM-DD in WIB
    
    console.log('=== TIMEZONE DEBUG ===');
    console.log('Current UTC time:', now.toISOString());
    console.log('WIB time (+7):', wibTime.toISOString());
    console.log('Today (WIB):', today);
    console.log('');
    
    return today;
}

// Test timestamp matching
function testTimestampMatching() {
    const today = testTimezone();
    
    console.log('=== TIMESTAMP MATCHING TEST ===');
    
    // Contoh timestamps (sesuaikan dengan data real Anda)
    const sampleTimestamps = [
        '2026-09-19T10:30:00.000+07:00', // Hari ini WIB
        '2026-09-18T23:59:59.999+07:00', // Kemarin WIB
        '2026-09-19T00:00:00.000+07:00', // Hari ini 00:00 WIB
        '2026-09-18T17:00:00.000Z',      // UTC (kemungkinan hari kemarin di WIB)
    ];
    
    sampleTimestamps.forEach(ts => {
        const datepart = ts.substring(0, 10); // substr(timestamp, 1, 10) in SQL
        const isMatch = datepart === today;
        console.log(`Timestamp: ${ts}`);
        console.log(`  Date part: ${datepart}`);
        console.log(`  Matches today? ${isMatch ? 'YES ✓' : 'NO ✗'}`);
        console.log('');
    });
}

// Jalankan test
testTimestampMatching();

console.log('=== SOLUSI ===');
console.log('Jika data masih muncul dari hari kemarin:');
console.log('1. Pastikan timestamp tersimpan dengan format WIB (+07:00)');
console.log('2. Backend query sudah benar menggunakan substr(timestamp, 1, 10)');
console.log('3. Kemungkinan ada cache di frontend atau data lama di database');
console.log('');
console.log('Query yang digunakan:');
console.log('SELECT * FROM attendance_logs WHERE substr(timestamp, 1, 10) = ?');
console.log('Parameter: today (YYYY-MM-DD in WIB)');
