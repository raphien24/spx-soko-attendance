/**
 * Script untuk check data hari ini di production database
 * Run dengan: node check-today-data.js
 */

console.log('=== CHECK TODAY ATTENDANCE DATA ===\n');

// Hitung tanggal hari ini di WIB
const now = new Date();
const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
const today = wibTime.toISOString().split('T')[0];

console.log(`Current UTC time: ${now.toISOString()}`);
console.log(`WIB time (+7):    ${wibTime.toISOString()}`);
console.log(`Today (WIB):      ${today}`);
console.log('');

console.log('=== EXPECTED BEHAVIOR ===');
console.log(`Dashboard "Hadir Hari Ini" should only show records with date = ${today}`);
console.log('');

console.log('=== TROUBLESHOOTING STEPS ===');
console.log('1. Cek data di database production:');
console.log('   npx wrangler d1 execute spx-soko-attendance-db --remote \\');
console.log(`   --command "SELECT * FROM attendance_logs WHERE substr(timestamp, 1, 10) = '${today}'"`);
console.log('');

console.log('2. Cek semua data hari ini dan kemarin:');
console.log('   npx wrangler d1 execute spx-soko-attendance-db --remote \\');
console.log(`   --command "SELECT substr(timestamp, 1, 10) as date, COUNT(*) as count FROM attendance_logs GROUP BY date ORDER BY date DESC LIMIT 5"`);
console.log('');

console.log('3. Clear browser cache dan reload dashboard:');
console.log('   - Buka DevTools (F12)');
console.log('   - Klik kanan tombol Reload');
console.log('   - Pilih "Empty Cache and Hard Reload"');
console.log('');

console.log('4. Cek console logs di browser untuk melihat data yang diterima dari API');
console.log('');

console.log('=== KEMUNGKINAN PENYEBAB ===');
console.log('A. Browser cache - Data lama masih di-cache');
console.log('B. API tidak dipanggil ulang saat refresh');
console.log('C. Data di database memang masih ada yang lama (seharusnya tidak)');
console.log('');

console.log('Untuk mengatasi browser cache, kita bisa:');
console.log('- Tambahkan cache-busting ke API calls');
console.log('- Set proper cache headers di backend');
console.log('- Auto-refresh setiap X detik');
