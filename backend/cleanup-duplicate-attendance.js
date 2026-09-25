/**
 * Cleanup Script: Remove Duplicate Attendance Records
 * 
 * Aturan:
 * - Jika ada multiple absensi di hari yang sama untuk 1 user
 * - KEEP yang pertama (earliest timestamp)
 * - DELETE yang kedua dan seterusnya
 * 
 * Run dengan:
 * node cleanup-duplicate-attendance.js
 */

console.log('=== CLEANUP DUPLICATE ATTENDANCE RECORDS ===\n');

console.log('Step 1: Identify duplicates in production database');
console.log('-----------------------------------------------');
console.log('');
console.log('Query untuk cek duplikat:');
console.log('');
console.log('SELECT ');
console.log('  user_id,');
console.log('  employee_id,');
console.log('  name,');
console.log('  substr(timestamp, 1, 10) as date,');
console.log('  COUNT(*) as scan_count');
console.log('FROM attendance_logs');
console.log('GROUP BY user_id, substr(timestamp, 1, 10)');
console.log('HAVING COUNT(*) > 1');
console.log('ORDER BY date DESC, scan_count DESC;');
console.log('');

console.log('Run command:');
console.log('npx wrangler d1 execute spx-soko-attendance-production --remote \\');
console.log('  --command "SELECT user_id, employee_id, name, substr(timestamp, 1, 10) as date, COUNT(*) as scan_count FROM attendance_logs GROUP BY user_id, substr(timestamp, 1, 10) HAVING COUNT(*) > 1 ORDER BY date DESC, scan_count DESC"');
console.log('');

console.log('Step 2: Generate DELETE statements');
console.log('------------------------------------');
console.log('');
console.log('Untuk setiap user yang duplikat, kita akan DELETE semua kecuali yang pertama.');
console.log('');
console.log('SQL yang akan dijalankan:');
console.log('');
console.log('DELETE FROM attendance_logs');
console.log('WHERE id IN (');
console.log('  SELECT id FROM attendance_logs');
console.log('  WHERE user_id = ? AND substr(timestamp, 1, 10) = ?');
console.log('  ORDER BY timestamp ASC');
console.log('  LIMIT -1 OFFSET 1  -- Skip first record, delete the rest');
console.log(');');
console.log('');

console.log('⚠️  PERINGATAN:');
console.log('- Script ini akan MENGHAPUS data secara PERMANEN');
console.log('- Pastikan backup database sebelum menjalankan');
console.log('- Test di development database terlebih dahulu');
console.log('');

console.log('Step 3: Manual Cleanup Instructions');
console.log('------------------------------------');
console.log('');
console.log('Karena D1 tidak support subquery di DELETE, kita perlu manual approach:');
console.log('');
console.log('1. Export list duplicates:');
console.log('   npx wrangler d1 execute spx-soko-attendance-production --remote \\');
console.log('     --command "SELECT id, user_id, employee_id, name, timestamp, substr(timestamp, 1, 10) as date FROM attendance_logs ORDER BY user_id, date, timestamp" --json > duplicates.json');
console.log('');
console.log('2. Analyze duplicates.json untuk identify IDs yang perlu dihapus');
console.log('');
console.log('3. Generate DELETE commands untuk setiap duplicate ID');
console.log('');

console.log('ALTERNATIVE: Use Node.js script with D1 API');
console.log('--------------------------------------------');
console.log('Saya akan buat script otomatis menggunakan wrangler D1 execute API.');
console.log('');

console.log('File: backend/scripts/delete-duplicates.js');
console.log('');
