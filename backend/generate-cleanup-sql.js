/**
 * Generate SQL Cleanup Script for Duplicate Attendance
 * 
 * This script generates SQL DELETE statements to remove duplicates
 * Strategy: Keep earliest record per user per day, delete the rest
 * 
 * Run: node generate-cleanup-sql.js
 * Output: cleanup-duplicates.sql
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== GENERATE CLEANUP SQL FOR DUPLICATES ===\n');

const DB_NAME = 'spx-soko-attendance-production';

// Get all records grouped to find duplicates
console.log('Step 1: Fetching all attendance records...\n');

const getAllRecordsSQL = `
SELECT 
    id,
    user_id, 
    employee_id,
    name,
    timestamp,
    substr(timestamp, 1, 10) as date
FROM attendance_logs
ORDER BY user_id, date, timestamp ASC
`;

try {
    console.log('Executing query...');
    const command = `npx wrangler d1 execute ${DB_NAME} --remote --json --command "${getAllRecordsSQL.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;
    
    const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    
    // Save raw output for inspection
    fs.writeFileSync('attendance-records-raw.json', output);
    console.log('✅ Raw data saved to: attendance-records-raw.json\n');
    
    // Parse JSON response
    let data;
    try {
        const parsed = JSON.parse(output);
        // Wrangler returns array with results object
        if (Array.isArray(parsed) && parsed[0] && parsed[0].results) {
            data = parsed[0].results;
        } else if (parsed.results) {
            data = parsed.results;
        } else {
            data = parsed;
        }
    } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError.message);
        console.log('Output preview:', output.substring(0, 500));
        process.exit(1);
    }
    
    console.log(`Total records fetched: ${data.length}\n`);
    
    // Group by user_id and date
    const groups = {};
    data.forEach(record => {
        const key = `${record.user_id}|${record.date}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(record);
    });
    
    // Find duplicates
    console.log('Step 2: Analyzing duplicates...\n');
    
    const duplicateGroups = Object.entries(groups).filter(([key, records]) => records.length > 1);
    
    console.log(`Found ${duplicateGroups.length} user-date combinations with duplicates\n`);
    
    // Generate DELETE statements
    console.log('Step 3: Generating DELETE SQL...\n');
    
    let sqlStatements = [];
    sqlStatements.push('-- Cleanup Script: Delete Duplicate Attendance Records');
    sqlStatements.push('-- Generated: ' + new Date().toISOString());
    sqlStatements.push('-- Strategy: Keep earliest record per user per day, delete rest');
    sqlStatements.push('');
    
    let totalToDelete = 0;
    
    duplicateGroups.forEach(([key, records]) => {
        const [userId, date] = key.split('|');
        const firstRecord = records[0]; // Earliest (already sorted ASC)
        const duplicates = records.slice(1); // All subsequent records
        
        sqlStatements.push(`-- ${firstRecord.name} (${firstRecord.employee_id}) on ${date}`);
        sqlStatements.push(`-- Total scans: ${records.length}, Keeping first at ${firstRecord.timestamp}`);
        sqlStatements.push(`-- Deleting ${duplicates.length} duplicate(s):`);
        
        duplicates.forEach(dup => {
            sqlStatements.push(`DELETE FROM attendance_logs WHERE id = '${dup.id}'; -- ${dup.timestamp}`);
            totalToDelete++;
        });
        
        sqlStatements.push('');
    });
    
    sqlStatements.push(`-- SUMMARY: ${totalToDelete} duplicate records will be deleted`);
    sqlStatements.push(`-- ${duplicateGroups.length} users affected`);
    
    // Save to file
    const sqlContent = sqlStatements.join('\n');
    fs.writeFileSync('cleanup-duplicates.sql', sqlContent);
    
    console.log('✅ SQL script generated: cleanup-duplicates.sql');
    console.log(`\nSummary:`);
    console.log(`- ${duplicateGroups.length} users have duplicates`);
    console.log(`- ${totalToDelete} duplicate records to delete`);
    console.log('');
    
    // Show top duplicates
    console.log('Top 5 users with most duplicates:');
    const sorted = duplicateGroups
        .map(([key, records]) => ({
            name: records[0].name,
            employee_id: records[0].employee_id,
            date: records[0].date,
            count: records.length
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    sorted.forEach(item => {
        console.log(`  - ${item.name} (${item.employee_id}): ${item.count} scans on ${item.date}`);
    });
    
    console.log('\n📝 Next steps:');
    console.log('1. Review cleanup-duplicates.sql');
    console.log('2. Test in development first (if possible)');
    console.log('3. Execute: npx wrangler d1 execute spx-soko-attendance-production --remote --file=cleanup-duplicates.sql');
    console.log('');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
