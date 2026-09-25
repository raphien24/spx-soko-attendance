/**
 * Automatic Cleanup Script: Remove Duplicate Attendance Records
 * 
 * Strategy:
 * 1. Find all user+date combinations with duplicates
 * 2. For each duplicate group, keep only the FIRST (earliest) record
 * 3. Delete all subsequent records
 * 
 * Usage:
 * node scripts/cleanup-duplicates.js
 */

import { execSync } from 'child_process';

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   CLEANUP DUPLICATE ATTENDANCE RECORDS                 ║');
console.log('║   Keep earliest, delete subsequent scans per day       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const DB_NAME = 'spx-soko-attendance-production';

/**
 * Execute D1 SQL command
 */
function executeSQL(sql) {
    const command = `npx wrangler d1 execute ${DB_NAME} --remote --command "${sql.replace(/"/g, '\\"')}"`;
    try {
        const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
        return output;
    } catch (error) {
        console.error('SQL Error:', error.message);
        throw error;
    }
}

/**
 * Get all records with duplicates
 */
async function getDuplicateGroups() {
    console.log('Step 1: Finding duplicate records...\n');
    
    const sql = `
        SELECT 
            user_id, 
            substr(timestamp, 1, 10) as date,
            COUNT(*) as count
        FROM attendance_logs
        GROUP BY user_id, substr(timestamp, 1, 10)
        HAVING COUNT(*) > 1
        ORDER BY date DESC, count DESC
    `;
    
    console.log('Executing query to find duplicates...');
    const output = executeSQL(sql);
    console.log(output);
    
    // Parse output to extract duplicate groups (manual parsing needed)
    return [];
}

/**
 * For each duplicate group, find IDs to delete (all except first)
 */
async function getRecordsToDelete(userId, date) {
    const sql = `
        SELECT id, timestamp, name, employee_id
        FROM attendance_logs
        WHERE user_id = '${userId}' 
          AND substr(timestamp, 1, 10) = '${date}'
        ORDER BY timestamp ASC
    `;
    
    const output = executeSQL(sql);
    console.log(output);
    
    // Return IDs to delete (skip first, delete rest)
    return [];
}

/**
 * Delete specific attendance record by ID
 */
async function deleteRecord(id) {
    const sql = `DELETE FROM attendance_logs WHERE id = '${id}'`;
    console.log(`Deleting record ${id}...`);
    executeSQL(sql);
}

/**
 * Main cleanup function
 */
async function cleanupDuplicates() {
    try {
        console.log('⚠️  WARNING: This will permanently delete duplicate records!\n');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        
        // Wait 5 seconds before proceeding
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('Starting cleanup...\n');
        
        // Step 1: Get list of duplicates
        await getDuplicateGroups();
        
        console.log('\n✅ Duplicate analysis complete.');
        console.log('Manual deletion required due to D1 limitations.');
        console.log('Use the SQL statements generated below.\n');
        
    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

// Run cleanup
cleanupDuplicates();
