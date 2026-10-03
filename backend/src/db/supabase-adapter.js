/**
 * Supabase Database Adapter
 * Drop-in replacement for D1 queries using Supabase PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
let supabase = null;

export function initSupabase(url, serviceKey) {
    supabase = createClient(url, serviceKey);
    console.log('[Supabase] Client initialized');
    return supabase;
}

export function getSupabase() {
    if (!supabase) {
        throw new Error('[Supabase] Client not initialized. Call initSupabase() first.');
    }
    return supabase;
}

// ============================================
// USER QUERIES
// ============================================

export async function getAllUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
    
    if (error) throw error;
    return data || [];
}

export async function getUserByEmployeeId(employeeId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('employee_id', employeeId)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data || null;
}

export async function insertUser(userData) {
    const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function updateUser(employeeId, updates) {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('employee_id', employeeId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function deleteUser(employeeId) {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('employee_id', employeeId);
    
    if (error) throw error;
    return { success: true };
}

export async function getAllFaceDescriptors() {
    const { data, error } = await supabase
        .from('users')
        .select('id, employee_id, name, face_descriptor')
        .not('face_descriptor', 'is', null)
        .order('name', { ascending: true })
        .limit(1000);
    
    if (error) throw error;
    return data || [];
}

// ============================================
// EMPLOYEE QUERIES
// ============================================

export async function getAllEmployees() {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true })
        .limit(1000);
    
    if (error) throw error;
    return data || [];
}

export async function getEmployeeByEmployeeId(employeeId) {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', employeeId)
        .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
}

export async function insertEmployee(employeeData) {
    const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// ATTENDANCE QUERIES
// ============================================

export async function insertAttendanceLog(logData) {
    const { data, error } = await supabase
        .from('attendance_logs')
        .insert([logData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function getTodayAttendance(userId = null) {
    let query = supabase
        .from('attendance_logs')
        .select(`
            *,
            users (
                employee_id,
                name,
                role
            )
        `)
        .gte('timestamp', new Date().toISOString().split('T')[0]) // Today start
        .order('timestamp', { ascending: false })
        .limit(500);
    
    if (userId) {
        query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Flatten the join
    return (data || []).map(log => ({
        ...log,
        name: log.users?.name,
        role: log.users?.role
    }));
}

export async function getAttendanceByDateRange(startDate, endDate) {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
            *,
            users (
                employee_id,
                name,
                role
            )
        `)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate + 'T23:59:59')
        .order('timestamp', { ascending: false })
        .limit(1000);
    
    if (error) throw error;
    
    return (data || []).map(log => ({
        ...log,
        name: log.users?.name,
        role: log.users?.role
    }));
}

// ============================================
// ROSTER QUERIES
// ============================================

export async function insertRoster(rosterData) {
    const { data, error } = await supabase
        .from('roster_schedule')
        .insert([rosterData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function getRosterByDate(date) {
    const { data, error } = await supabase
        .from('roster_schedule')
        .select('*')
        .eq('date', date)
        .order('employee_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
}

export async function deleteRosterByDate(date) {
    const { error } = await supabase
        .from('roster_schedule')
        .delete()
        .eq('date', date);
    
    if (error) throw error;
    return { success: true };
}

export async function isEmployeeRostered(date, employeeId) {
    const { data, error } = await supabase
        .from('roster_schedule')
        .select('id')
        .eq('date', date)
        .eq('employee_id', employeeId)
        .maybeSingle();
    
    if (error) throw error;
    return !!data;
}

export async function getRosterWithAttendance(date) {
    const { data, error } = await supabase
        .rpc('get_roster_with_attendance', { roster_date: date });
    
    if (error) {
        // Fallback: manual join
        const roster = await getRosterByDate(date);
        const attendance = await supabase
            .from('attendance_logs')
            .select('employee_id, scan_type')
            .gte('timestamp', date)
            .lte('timestamp', date + 'T23:59:59');
        
        const attendanceMap = {};
        (attendance.data || []).forEach(log => {
            if (!attendanceMap[log.employee_id]) {
                attendanceMap[log.employee_id] = {};
            }
            attendanceMap[log.employee_id][log.scan_type] = true;
        });
        
        return roster.map(r => ({
            ...r,
            has_clocked_in: !!attendanceMap[r.employee_id]?.clock_in,
            has_clocked_out: !!attendanceMap[r.employee_id]?.clock_out
        }));
    }
    
    return data || [];
}

// ============================================
// OFF SCHEDULE QUERIES
// ============================================

export async function insertOffSchedule(offScheduleData) {
    const { data, error } = await supabase
        .from('off_schedule')
        .insert([offScheduleData])
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

export async function getOffSchedules(employeeId = null, dayOfWeek = null) {
    let query = supabase
        .from('off_schedule')
        .select(`
            *,
            employees (
                name,
                role
            )
        `);
    
    if (employeeId) {
        query = query.eq('employee_id', employeeId);
    }
    
    if (dayOfWeek) {
        query = query.eq('day_of_week', dayOfWeek);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(item => ({
        ...item,
        employee_name: item.employees?.name,
        role: item.employees?.role
    }));
}

export async function deleteOffSchedule(id) {
    const { error } = await supabase
        .from('off_schedule')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return { success: true };
}

// ============================================
// HUB SETTINGS QUERIES
// ============================================

export async function getHubSettings() {
    const { data, error } = await supabase
        .from('hub_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
    
    if (error) throw error;
    return data || null;
}

export async function updateHubSettings(settings) {
    // Upsert (update or insert)
    const { data, error } = await supabase
        .from('hub_settings')
        .upsert([settings], { onConflict: 'id' })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// HELPER: Create stored procedure for roster attendance
// ============================================
export const ROSTER_ATTENDANCE_FUNCTION = `
CREATE OR REPLACE FUNCTION get_roster_with_attendance(roster_date DATE)
RETURNS TABLE (
    id UUID,
    date DATE,
    employee_id VARCHAR,
    employee_name VARCHAR,
    district VARCHAR,
    has_clocked_in BOOLEAN,
    has_clocked_out BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.date,
        r.employee_id,
        r.employee_name,
        r.district,
        EXISTS (
            SELECT 1 FROM attendance_logs a 
            WHERE a.employee_id = r.employee_id 
            AND DATE(a.timestamp) = r.date 
            AND a.scan_type = 'clock_in'
        ) as has_clocked_in,
        EXISTS (
            SELECT 1 FROM attendance_logs a 
            WHERE a.employee_id = r.employee_id 
            AND DATE(a.timestamp) = r.date 
            AND a.scan_type = 'clock_out'
        ) as has_clocked_out
    FROM roster_schedule r
    WHERE r.date = roster_date
    ORDER BY r.employee_name;
END;
$$ LANGUAGE plpgsql;
`;
