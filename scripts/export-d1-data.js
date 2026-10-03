/**
 * Export data from Cloudflare D1 to JSON files
 * Run: node scripts/export-d1-data.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DB_NAME = 'spx-soko-attendance-production';
const EXPORT_DIR = './d1-export';

// Tables to export
const TABLES = [
    'users',
    'employees',
    'attendance_logs',
    'roster_schedule',
    'off_schedule',
    'hub_settings'
];

console.log('🚀 Starting D1 data export...\n');

// Create export directory
if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${EXPORT_DIR}\n`);
}

// Export each table
for (const table of TABLES) {
    try {
        console.log(`📦 Exporting ${table}...`);
        
        // Run wrangler command to get data as JSON
        const command = `cd backend && npx wrangler d1 execute ${DB_NAME} --remote --command="SELECT * FROM ${table}" --json`;
        
        const output = execSync(command, { 
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        
        // Parse JSON output
        // Wrangler outputs multiple lines, we need to find the JSON part
        const lines = output.split('\n');
        let jsonData = null;
        
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (parsed && Array.isArray(parsed)) {
                    jsonData = parsed;
                    break;
                }
            } catch (e) {
                // Not JSON, continue
            }
        }
        
        if (!jsonData) {
            console.warn(`⚠️  No data found for ${table}`);
            fs.writeFileSync(
                path.join(EXPORT_DIR, `${table}.json`),
                JSON.stringify([], null, 2)
            );
            continue;
        }
        
        // Save to file
        const filename = path.join(EXPORT_DIR, `${table}.json`);
        fs.writeFileSync(filename, JSON.stringify(jsonData, null, 2));
        
        console.log(`✅ Exported ${jsonData.length} rows to ${filename}\n`);
        
    } catch (error) {
        console.error(`❌ Error exporting ${table}:`, error.message);
    }
}

// Create export summary
const summary = {
    exported_at: new Date().toISOString(),
    database: DB_NAME,
    tables: {}
};

for (const table of TABLES) {
    const filename = path.join(EXPORT_DIR, `${table}.json`);
    if (fs.existsSync(filename)) {
        const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
        summary.tables[table] = {
            row_count: data.length,
            file_size: fs.statSync(filename).size
        };
    }
}

fs.writeFileSync(
    path.join(EXPORT_DIR, 'export-summary.json'),
    JSON.stringify(summary, null, 2)
);

console.log('\n✅ Export complete!');
console.log('\n📊 Summary:');
console.log(JSON.stringify(summary, null, 2));
console.log(`\n📁 Files saved to: ${EXPORT_DIR}`);
