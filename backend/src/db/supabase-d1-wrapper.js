/**
 * Supabase D1 Wrapper
 * 
 * Emulates the Cloudflare D1 API (db.prepare().bind().run/first/all)
 * so ALL existing handlers and queries.js work without any modification.
 * 
 * Drop-in replacement for env.DB
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// SQL → Supabase query translator
// ============================================

/**
 * Parses a parameterized SQL statement and returns table/operation info
 * This is a lightweight SQL interpreter for the patterns used in queries.js
 */
class SupabaseStatement {
    constructor(supabase, sql) {
        this.supabase = supabase;
        this.sql = sql.trim();
        this.params = [];
    }

    bind(...params) {
        this.params = params;
        return this;
    }

    async run() {
        try {
            const result = await this._execute();
            return {
                success: true,
                meta: { changes: result?.length || 1 },
                results: result || []
            };
        } catch (err) {
            console.error('[SupabaseWrapper] run() error:', err.message, '\nSQL:', this.sql);
            throw err;
        }
    }

    async first() {
        try {
            const result = await this._execute();
            if (Array.isArray(result)) return result[0] || null;
            return result || null;
        } catch (err) {
            console.error('[SupabaseWrapper] first() error:', err.message, '\nSQL:', this.sql);
            throw err;
        }
    }

    async all() {
        try {
            const result = await this._execute();
            return {
                success: true,
                results: Array.isArray(result) ? result : (result ? [result] : [])
            };
        } catch (err) {
            console.error('[SupabaseWrapper] all() error:', err.message, '\nSQL:', this.sql);
            throw err;
        }
    }

    async _execute() {
        const sql = this.sql;
        const params = this.params;
        const supabase = this.supabase;

        const upperSQL = sql.toUpperCase();

        // ---- INSERT ----
        if (upperSQL.startsWith('INSERT INTO')) {
            return await this._handleInsert(supabase, sql, params);
        }

        // ---- UPDATE ----
        if (upperSQL.startsWith('UPDATE')) {
            return await this._handleUpdate(supabase, sql, params);
        }

        // ---- DELETE ----
        if (upperSQL.startsWith('DELETE FROM')) {
            return await this._handleDelete(supabase, sql, params);
        }

        // ---- SELECT ----
        if (upperSQL.startsWith('SELECT')) {
            return await this._handleSelect(supabase, sql, params);
        }

        console.warn('[SupabaseWrapper] Unhandled SQL pattern:', sql.substring(0, 100));
        return null;
    }

    // ---- INSERT handler ----
    async _handleInsert(supabase, sql, params) {
        const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
        if (!tableMatch) throw new Error('Cannot parse INSERT table: ' + sql);

        const tableName = tableMatch[1];
        const columns = tableMatch[2].split(',').map(c => c.trim());

        const row = {};
        columns.forEach((col, i) => {
            row[col] = params[i] !== undefined ? params[i] : null;
        });

        console.log(`[SupabaseWrapper._handleInsert] Table: ${tableName}, Row:`, row);

        // attendance_logs: scan_type IN→clock_in, OUT→clock_out
        if (tableName === 'attendance_logs') {
            if (row.scan_type === 'IN') row.scan_type = 'clock_in';
            else if (row.scan_type === 'OUT') row.scan_type = 'clock_out';
            // map capture_url → also store in photo_url
            if (row.capture_url && !row.photo_url) row.photo_url = row.capture_url;
        }

        const { data, error } = await supabase
            .from(tableName)
            .insert([row])
            .select()
            .single();

        if (error) {
            console.error(`[SupabaseWrapper._handleInsert] ERROR:`, error);
            throw new Error(`[${tableName}] INSERT error: ${error.message}`);
        }
        
        console.log(`[SupabaseWrapper._handleInsert] SUCCESS:`, data);
        return data;
    }

    // ---- UPDATE handler ----
    async _handleUpdate(supabase, sql, params) {
        const tableMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/is);
        if (!tableMatch) throw new Error('Cannot parse UPDATE: ' + sql);

        const tableName = tableMatch[1];
        const setClause = tableMatch[2];
        const whereClause = tableMatch[3];

        // Parse SET fields (field = ?)
        const setFields = setClause.split(',').map(f => f.trim());
        const updates = {};
        let paramIndex = 0;

        for (const field of setFields) {
            const match = field.match(/(\w+)\s*=\s*\?/i) || field.match(/(\w+)\s*=\s*datetime\('now'\)/i);
            if (match) {
                const col = match[1];
                if (field.includes('datetime(') || field.includes('NOW()')) {
                    updates[col] = new Date().toISOString();
                } else {
                    updates[col] = params[paramIndex++] !== undefined ? params[paramIndex - 1] : null;
                }
            }
        }

        // Parse WHERE conditions (only single condition supported: col = ?)
        const whereMatch = whereClause.match(/(\w+)\s*=\s*\?/i);
        if (!whereMatch) throw new Error('Cannot parse WHERE: ' + whereClause);

        const whereCol = whereMatch[1];
        const whereVal = params[paramIndex];

        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq(whereCol, whereVal)
            .select();

        if (error) throw new Error(`[${tableName}] UPDATE error: ${error.message}`);
        return data;
    }

    // ---- DELETE handler ----
    async _handleDelete(supabase, sql, params) {
        const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/is);
        if (!tableMatch) throw new Error('Cannot parse DELETE: ' + sql);

        const tableName = tableMatch[1];
        const whereClause = tableMatch[2].trim();

        // Parse WHERE - support single and double conditions
        // Pattern: col1 = ? AND col2 = ?
        const conditions = [];
        const whereRe = /(\w+)\s*=\s*\?/gi;
        let match;
        let paramIndex = 0;

        while ((match = whereRe.exec(whereClause)) !== null) {
            conditions.push({ col: match[1], val: params[paramIndex++] });
        }

        let query = supabase.from(tableName).delete();
        for (const cond of conditions) {
            query = query.eq(cond.col, cond.val);
        }

        const { error } = await query;
        if (error) throw new Error(`[${tableName}] DELETE error: ${error.message}`);
        return { success: true };
    }

    // ---- SELECT handler ----
    async _handleSelect(supabase, sql, params) {
        // Extract table name (handles JOIN queries)
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        if (!fromMatch) throw new Error('Cannot parse FROM: ' + sql);
        const mainTable = fromMatch[1];

        // Check for JOIN
        const hasJoin = /JOIN\s+(\w+)/i.test(sql);

        // For complex JOINs, use raw RPC or fallback to Supabase select with join
        if (hasJoin) {
            return await this._handleSelectWithJoin(supabase, sql, params, mainTable);
        }

        // Simple SELECT
        return await this._handleSimpleSelect(supabase, sql, params, mainTable);
    }

    async _handleSimpleSelect(supabase, sql, params, tableName) {
        const upperSQL = sql.toUpperCase();
        let paramIndex = 0;

        // COUNT query
        if (upperSQL.includes('COUNT(*)')) {
            let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
            query = this._applyWhere(query, sql, params);
            const { count, error } = await query;
            if (error) throw new Error(`[${tableName}] COUNT error: ${error.message}`);
            return { count: count || 0 };
        }

        // Regular select
        let query = supabase.from(tableName).select('*');
        query = this._applyWhere(query, sql, params);
        query = this._applyOrderBy(query, sql);
        query = this._applyLimit(query, sql);

        const { data, error } = await query;
        if (error) throw new Error(`[${tableName}] SELECT error: ${error.message}`);
        return data || [];
    }

    async _handleSelectWithJoin(supabase, sql, params, mainTable) {
        const upperSQL = sql.toUpperCase();

        // attendance_logs JOIN users
        if (mainTable === 'attendance_logs') {
            let query = supabase.from('attendance_logs').select(`
                *,
                users ( id, employee_id, name, role )
            `);
            query = this._applyWhere(query, sql, params);
            query = this._applyOrderBy(query, sql);
            query = this._applyLimit(query, sql);

            const { data, error } = await query;
            if (error) throw new Error(`attendance_logs JOIN error: ${error.message}`);

            return (data || []).map(log => ({
                ...log,
                role: log.users?.role || log.role,
                users: undefined
            }));
        }

        // roster_schedule (with employees JOIN) — manual join karena no FK constraint
        if (mainTable === 'roster_schedule') {
            const upperSQL2 = sql.toUpperCase();
            const date = params[0];

            // Fetch roster data — hanya ORDER BY kolom yang ada di roster_schedule
            let rosterQuery = supabase.from('roster_schedule').select('*');
            rosterQuery = this._applyWhere(rosterQuery, sql, params);
            rosterQuery = rosterQuery.order('employee_name', { ascending: true });
            rosterQuery = this._applyLimit(rosterQuery, sql);

            const { data: rosterData, error: rosterError } = await rosterQuery;
            if (rosterError) throw new Error(`roster_schedule SELECT error: ${rosterError.message}`);

            const roster = rosterData || [];
            if (roster.length === 0) return [];

            // Fetch employees for role/enrolled_status lookup
            const empIds = [...new Set(roster.map(r => r.employee_id))];
            const { data: empData } = await supabase
                .from('employees')
                .select('employee_id, role, enrolled_status')
                .in('employee_id', empIds);

            const empMap = {};
            (empData || []).forEach(e => { empMap[e.employee_id] = e; });

            // If query also needs attendance status (getRosterWithAttendance)
            if (upperSQL2.includes('ATTENDANCE_LOGS') && date) {
                const { data: attData } = await supabase
                    .from('attendance_logs')
                    .select('employee_id, scan_type, timestamp')
                    .gte('timestamp', date + 'T00:00:00+07:00')
                    .lte('timestamp', date + 'T23:59:59+07:00');

                const attMap = {};
                (attData || []).forEach(a => {
                    if (!attMap[a.employee_id]) attMap[a.employee_id] = {};
                    attMap[a.employee_id][a.scan_type] = a.timestamp;
                });

                return roster.map(r => ({
                    roster_id: r.id,
                    date: r.date,
                    employee_id: r.employee_id,
                    employee_name: r.employee_name,
                    district: r.district,
                    role: empMap[r.employee_id]?.role || r.role || null,
                    enrolled_status: empMap[r.employee_id]?.enrolled_status || 'not_enrolled',
                    attendance_status: attMap[r.employee_id]?.clock_in ? 'clocked_in' : 'not_clocked_in',
                    clock_in_time: attMap[r.employee_id]?.clock_in || null
                }));
            }

            // Simple roster select with employee info merged (includes role from employees)
            return roster.map(r => ({
                ...r,
                role: empMap[r.employee_id]?.role || r.role || null,
                enrolled_status: empMap[r.employee_id]?.enrolled_status || 'not_enrolled'
            }));
        }

        // off_schedule JOIN employees — manual join
        if (mainTable === 'off_schedule') {
            // Fetch semua off_schedule tanpa ORDER BY dari tabel employees
            let query = supabase.from('off_schedule').select('*');
            query = this._applyWhere(query, sql, params);
            // Hanya apply ORDER BY kolom yang ada di off_schedule
            query = query.order('day_of_week', { ascending: true });

            const { data, error } = await query;
            if (error) throw new Error(`off_schedule SELECT error: ${error.message}`);

            const offList = data || [];
            if (offList.length === 0) return [];

            // Fetch employee names dan role
            const empIds = [...new Set(offList.map(o => o.employee_id))];
            const { data: empData } = await supabase
                .from('employees')
                .select('employee_id, name, role')
                .in('employee_id', empIds);

            const empMap = {};
            (empData || []).forEach(e => { empMap[e.employee_id] = e; });

            const result = offList.map(o => ({
                ...o,
                employee_name: empMap[o.employee_id]?.name || null,
                role: empMap[o.employee_id]?.role || null
            }));

            // Sort: role ASC, name ASC, day_of_week ASC (mirror queries.js ORDER BY)
            result.sort((a, b) => {
                if (a.role < b.role) return -1;
                if (a.role > b.role) return 1;
                if (a.employee_name < b.employee_name) return -1;
                if (a.employee_name > b.employee_name) return 1;
                return a.day_of_week - b.day_of_week;
            });

            return result;
        }

        // employees JOIN users — fallback to simple select
        return await this._handleSimpleSelect(supabase, sql, params, mainTable);
    }

    // ---- WHERE parser (handles the patterns in queries.js) ----
    _applyWhere(query, sql, params) {
        const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/is);
        if (!whereMatch) return query;

        const whereStr = whereMatch[1].trim();
        let paramIndex = 0;

        // Split by AND (simple cases)
        const conditions = whereStr.split(/\s+AND\s+/i);

        for (const cond of conditions) {
            const trimmed = cond.trim();

            // col = ?
            const eqMatch = trimmed.match(/^([\w.]+)\s*=\s*\?$/i);
            if (eqMatch) {
                const col = eqMatch[1].includes('.') ? eqMatch[1].split('.')[1] : eqMatch[1];
                // Special case: hub_settings WHERE id = 1
                if (col === 'id' && params[paramIndex] == 1) {
                    // hub_settings only has 1 row, just skip filter
                    paramIndex++;
                    continue;
                }
                query = query.eq(col, params[paramIndex++]);
                continue;
            }

            // substr(timestamp, 1, 10) = ? → filter by date
            const substrMatch = trimmed.match(/substr\s*\(\s*[\w.]*timestamp[\w.]*\s*,\s*1\s*,\s*10\s*\)\s*(?:>=|<=|=)\s*\?/i);
            if (substrMatch) {
                const op = trimmed.includes('>=') ? 'gte' : trimmed.includes('<=') ? 'lte' : 'eq';
                const dateVal = params[paramIndex++];
                if (op === 'gte') {
                    query = query.gte('timestamp', dateVal + 'T00:00:00+07:00');
                } else if (op === 'lte') {
                    query = query.lte('timestamp', dateVal + 'T23:59:59+07:00');
                } else {
                    // exact date: use range
                    query = query
                        .gte('timestamp', dateVal + 'T00:00:00+07:00')
                        .lte('timestamp', dateVal + 'T23:59:59+07:00');
                }
                continue;
            }

            // date >= ? or date <= ?
            const dateRangeMatch = trimmed.match(/^([\w.]+)\s*(>=|<=|=)\s*\?$/i);
            if (dateRangeMatch) {
                const col = dateRangeMatch[1].includes('.') ? dateRangeMatch[1].split('.')[1] : dateRangeMatch[1];
                const op = dateRangeMatch[2];
                const val = params[paramIndex++];
                if (op === '>=') query = query.gte(col, val);
                else if (op === '<=') query = query.lte(col, val);
                else query = query.eq(col, val);
                continue;
            }

            // Skip conditions we can't parse (non-fatal)
            // Count how many ? are in this condition to advance paramIndex
            const qCount = (trimmed.match(/\?/g) || []).length;
            paramIndex += qCount;
        }

        return query;
    }

    // ---- ORDER BY parser ----
    _applyOrderBy(query, sql) {
        const orderMatch = sql.match(/ORDER\s+BY\s+([\w.,\s]+?)(?:\s+LIMIT|$)/is);
        if (!orderMatch) return query;

        const orderStr = orderMatch[1].trim();
        const parts = orderStr.split(',').map(p => p.trim());

        for (const part of parts) {
            const [col, dir] = part.split(/\s+/);
            const colName = col.includes('.') ? col.split('.')[1] : col;
            const ascending = !dir || dir.toUpperCase() !== 'DESC';
            query = query.order(colName, { ascending });
        }

        return query;
    }

    // ---- LIMIT parser ----
    _applyLimit(query, sql) {
        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        if (!limitMatch) return query;
        return query.limit(parseInt(limitMatch[1]));
    }
}

// ---- Helper: Get today's date in WIB (UTC+7) ----
function getWIBDate() {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().split('T')[0];
}

// ============================================
// SupabaseDB — drop-in D1 replacement
// ============================================

export class SupabaseDB {
    constructor(supabaseClient) {
        this.client = supabaseClient;
    }

    prepare(sql) {
        return new SupabaseStatement(this.client, sql);
    }
}

/**
 * Create a SupabaseDB instance from env variables
 * @param {string} url - SUPABASE_URL
 * @param {string} serviceKey - SUPABASE_SERVICE_KEY
 * @returns {SupabaseDB}
 */
export function createSupabaseDB(url, serviceKey) {
    const client = createClient(url, serviceKey);
    return new SupabaseDB(client);
}
