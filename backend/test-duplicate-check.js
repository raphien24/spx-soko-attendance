/**
 * Test script untuk duplicate check
 * 
 * Test manual query duplicate check
 */

// Simulasi WIB date calculation
function getWIBDate() {
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return wibTime.toISOString().split('T')[0];
}

// Generate WIB timestamp
function getCurrentWIBTimestamp() {
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const year = wibTime.getUTCFullYear();
    const month = String(wibTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wibTime.getUTCDate()).padStart(2, '0');
    const hours = String(wibTime.getUTCHours()).padStart(2, '0');
    const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(wibTime.getUTCSeconds()).padStart(2, '0');
    const ms = String(wibTime.getUTCMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+07:00`;
}

console.log('=== WIB Timezone Test ===\n');

console.log('1. Current Time:');
console.log('   UTC:', new Date().toISOString());
console.log('   WIB:', getCurrentWIBTimestamp());
console.log('   WIB Date:', getWIBDate());
console.log();

console.log('2. Test Timestamp Extraction:');
const testTimestamp = getCurrentWIBTimestamp();
console.log('   Full timestamp:', testTimestamp);
console.log('   substr(0, 10):', testTimestamp.substring(0, 10));
console.log('   Should match WIB date:', testTimestamp.substring(0, 10) === getWIBDate() ? '✅ YES' : '❌ NO');
console.log();

console.log('3. SQL Query to run in D1:');
const wibDate = getWIBDate();
console.log(`   SELECT * FROM attendance_logs WHERE substr(timestamp, 1, 10) = '${wibDate}';`);
console.log();

console.log('4. Check existing records:');
console.log(`   Run this in Cloudflare D1 Console:`);
console.log(`   wrangler d1 execute attendance-db --command "SELECT id, user_id, substr(timestamp, 1, 10) as date, timestamp FROM attendance_logs ORDER BY timestamp DESC LIMIT 5;"`);
console.log();

console.log('5. Expected duplicate check behavior:');
console.log('   - First scan today: Creates new record');
console.log('   - Second scan today: Query finds existing record → BLOCKS');
console.log('   - Query condition: substr(timestamp, 1, 10) = ' + wibDate);
console.log();

console.log('=== How to Debug ===\n');
console.log('1. Deploy backend: cd backend && npx wrangler deploy');
console.log('2. Check real-time logs: Cloudflare Dashboard → Workers → Logs');
console.log('3. Look for these logs:');
console.log('   [getTodayAttendance] WIB Today date: YYYY-MM-DD');
console.log('   [getTodayAttendance] Query result count: X');
console.log('   [Duplicate Check] Existing records found: X');
console.log('4. If count is 0 on second scan, check:');
console.log('   - Timestamp format in database');
console.log('   - WIB date calculation');
console.log('   - substr() extraction result');
