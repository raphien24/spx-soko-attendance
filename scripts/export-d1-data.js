/**
 * Export data from Cloudflare D1 to JSON files
 * Run: node scripts/export-d1-data.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_NAME = 'spx-soko-attendance-production';
const EXPORT_DIR = path.join(__dirname, '../d1-export');
const BACKEND_DIR = path.join(__dirname, '../backend');

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
        
        // Run wrangler command - output JSON to file
        const command = `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT * FROM ${table}" --json`;
        
        const output = execSync(command, { 
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
            cwd: BACKEND_DIR
        });
        
        // Wrangler --json outputs an array of result objects
        // Format: [{ "results": [...rows], "success": true, ... }]
        let jsonData = null;
        
        try {
            const parsed = JSON.parse(output.trim());
            
            // Handle array format: [{ results: [...] }]
            if (Array.isArray(parsed) && parsed[0]?.results) {
                jsonData = parsed[0].results;
            }
            // Handle direct array format
            else if (Array.isArray(parsed)) {
                jsonData = parsed;
            }
            // Handle object with results
            else if (parsed?.results) {
                jsonData = parsed.results;
            }
        } catch (parseErr) {
            // Try line-by-line parsing
            const lines = output.split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (Array.isArray(parsed) && parsed[0]?.results) {
                        jsonData = parsed[0].results;
                        break;
                    } else if (Array.isArray(parsed)) {
                        jsonData = parsed;
                        break;
                    }
                } catch (e) { /* skip */ }
            }
        }
        
        if (jsonData === null) {
            console.warn(`⚠️  Could not parse output for ${table}, saving empty array`);
            console.warn(`   Raw output: ${output.substring(0, 200)}`);
            jsonData = [];
        }
        
        // Save to file
        const filename = path.join(EXPORT_DIR, `${table}.json`);
        fs.writeFileSync(filename, JSON.stringify(jsonData, null, 2));
        console.log(`✅ Exported ${jsonData.length} rows → ${filename}\n`);
        
    } catch (error) {
        console.error(`❌ Error exporting ${table}:`, error.message.substring(0, 300));
        // Save empty file so import doesn't fail
        const filename = path.join(EXPORT_DIR, `${table}.json`);
        fs.writeFileSync(filename, JSON.stringify([], null, 2));
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

console.log('📊 Export Summary:');
console.log('═══════════════════════════════════════');
for (const [tbl, info] of Object.entries(summary.tables)) {
    console.log(`${tbl.padEnd(20)} : ${String(info.row_count).padStart(5)} rows`);
}
console.log('═══════════════════════════════════════');
console.log(`\n✅ Export complete! Files saved to: ${EXPORT_DIR}`);
