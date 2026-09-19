/**
 * Admin Dashboard Logic
 * Manage employees and view attendance records
 */

import { debugLog, errorLog } from './config.js';

import {
    getTodayAttendance,
    getAllUsers,
    deleteUser,
    getAttendanceRecords,
    getHubLocation,
    updateHubLocation,
    getErrorMessage
} from './api.js';

import {
    getCurrentPosition
} from './gps.js';

// DOM Elements
let tabButtons, tabContents;
let dashboardTab, attendanceTab, employeesTab, recordsTab, hubSettingsTab;
let statsCards, totalEmployeesCard, presentTodayCard, absentTodayCard, totalScansCard;
let todayAttendanceTableBody, allEmployeesTableBody, recordsTableBody;
let loadingOverlay, loadingMessage;
let deleteModal, deleteModalName, confirmDeleteBtn, cancelDeleteBtn;
let notificationBar, notificationMessage;
let currentTimeElement, currentDateElement;
let dateRangeForm, startDateInput, endDateInput, filterBtn;
let exportBtn, refreshBtn;
let mobileSidebarToggle, mobileSidebar;

// Export Modal Elements
let exportModal, exportForm, exportStartDate, exportEndDate, cancelExportBtn;

// PIN Security Elements
let pinModal, pinForm, pinInput, pinError;

// Hub Settings Elements
let currentHubName, currentLatitude, currentLongitude, currentRadius, currentUpdatedAt;
let hubLocationForm, hubNameInput, latitudeInput, longitudeInput, radiusInput, getCurrentGpsBtn;

// State
let currentTab = 'dashboard';
let todayAttendanceData = [];
let allUsersData = [];
let recordsData = [];
let userToDelete = null;

/**
 * Initialize admin dashboard
 */
async function init() {
    try {
        getDOMElements();
        setupEventListeners();
        startClock();
        
        // Cek status autentikasi PIN di sesi saat ini
        if (sessionStorage.getItem('admin_authenticated') === 'true') {
            if (pinModal) pinModal.classList.add('hidden');
            await loadDashboardData();
        } else {
            if (pinModal) pinModal.classList.remove('hidden');
            // Menunggu admin memasukkan PIN yang benar sebelum memuat data
        }
        
        debugLog('Admin dashboard initialized');
    } catch (error) {
        errorLog('Initialization failed', error);
        showNotification('Gagal memuat dashboard: ' + error.message, 'error');
    }
}

/**
 * Get all DOM elements
 */
function getDOMElements() {
    tabButtons = document.querySelectorAll('[data-tab]');
    tabContents = document.querySelectorAll('.tab-content');
    
    dashboardTab = document.getElementById('dashboard-tab');
    attendanceTab = document.getElementById('attendance-tab');
    employeesTab = document.getElementById('employees-tab');
    recordsTab = document.getElementById('records-tab');
    hubSettingsTab = document.getElementById('hub-settings-tab');
    
    statsCards = document.getElementById('stats-cards');
    totalEmployeesCard = document.getElementById('total-employees');
    presentTodayCard = document.getElementById('present-today');
    absentTodayCard = document.getElementById('absent-today');
    totalScansCard = document.getElementById('total-scans');
    
    todayAttendanceTableBody = document.getElementById('today-attendance-body');
    allEmployeesTableBody = document.getElementById('all-employees-body');
    recordsTableBody = document.getElementById('records-body');
    
    loadingOverlay = document.getElementById('loading-overlay');
    loadingMessage = document.getElementById('loading-message');
    
    deleteModal = document.getElementById('delete-modal');
    deleteModalName = document.getElementById('delete-modal-name');
    confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    
    notificationBar = document.getElementById('notification-bar');
    notificationMessage = document.getElementById('notification-message');
    
    currentTimeElement = document.getElementById('current-time');
    currentDateElement = document.getElementById('current-date');
    
    dateRangeForm = document.getElementById('date-range-form');
    startDateInput = document.getElementById('start-date');
    endDateInput = document.getElementById('end-date');
    filterBtn = document.getElementById('filter-btn');
    
    exportBtn = document.getElementById('export-btn');
    refreshBtn = document.getElementById('refresh-btn');
    
    mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    mobileSidebar = document.getElementById('mobile-sidebar');

    // Export Modal Elements
    exportModal = document.getElementById('export-modal');
    exportForm = document.getElementById('export-form');
    exportStartDate = document.getElementById('export-start-date');
    exportEndDate = document.getElementById('export-end-date');
    cancelExportBtn = document.getElementById('cancel-export-btn');

    // PIN Elements
    pinModal = document.getElementById('pin-modal');
    pinForm = document.getElementById('pin-form');
    pinInput = document.getElementById('pin-input');
    pinError = document.getElementById('pin-error');
    
    // Hub Settings Elements
    currentHubName = document.getElementById('current-hub-name');
    currentLatitude = document.getElementById('current-latitude');
    currentLongitude = document.getElementById('current-longitude');
    currentRadius = document.getElementById('current-radius');
    currentUpdatedAt = document.getElementById('current-updated-at');
    hubLocationForm = document.getElementById('hub-location-form');
    hubNameInput = document.getElementById('hub-name-input');
    latitudeInput = document.getElementById('latitude-input');
    longitudeInput = document.getElementById('longitude-input');
    radiusInput = document.getElementById('radius-input');
    getCurrentGpsBtn = document.getElementById('get-current-gps-btn');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // PIN Authentication Listener
    if (pinForm) {
        pinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (pinInput.value === '12345') {
                sessionStorage.setItem('admin_authenticated', 'true');
                pinModal.classList.add('hidden');
                pinError.classList.add('hidden');
                pinInput.value = '';
                // Muat data setelah PIN sukses
                await loadDashboardData();
            } else {
                pinError.classList.remove('hidden');
                pinInput.value = '';
                pinInput.focus();
            }
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMobileSidebar();
        });
    }
    
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeMobileSidebar);
    }
    
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    cancelDeleteBtn.addEventListener('click', handleCancelDelete);
    
    if (dateRangeForm) {
        dateRangeForm.addEventListener('submit', handleDateRangeFilter);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    // Export Listeners
    if (exportBtn) {
        exportBtn.addEventListener('click', showExportModal);
    }
    if (cancelExportBtn) {
        cancelExportBtn.addEventListener('click', hideExportModal);
    }
    if (exportForm) {
        exportForm.addEventListener('submit', handleConfirmExport);
    }
    
    // Hub Settings Listeners
    if (hubLocationForm) {
        hubLocationForm.addEventListener('submit', handleHubLocationSubmit);
    }
    
    if (getCurrentGpsBtn) {
        getCurrentGpsBtn.addEventListener('click', handleGetCurrentGPS);
    }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    currentTab = tabName;
    
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('bg-blue-700', 'text-white');
            button.classList.remove('text-blue-100', 'hover:bg-blue-700');
        } else {
            button.classList.remove('bg-blue-700', 'text-white');
            button.classList.add('text-blue-100', 'hover:bg-blue-700');
        }
    });
    
    if (dashboardTab) dashboardTab.classList.add('hidden');
    if (attendanceTab) attendanceTab.classList.add('hidden');
    if (employeesTab) employeesTab.classList.add('hidden');
    if (recordsTab) recordsTab.classList.add('hidden');
    if (hubSettingsTab) hubSettingsTab.classList.add('hidden');
    
    switch(tabName) {
        case 'dashboard':
            if (dashboardTab) dashboardTab.classList.remove('hidden');
            break;
        case 'attendance':
            if (attendanceTab) attendanceTab.classList.remove('hidden');
            loadAttendanceData();
            break;
        case 'employees':
            if (employeesTab) employeesTab.classList.remove('hidden');
            loadEmployeesData();
            break;
        case 'records':
            if (recordsTab) recordsTab.classList.remove('hidden');
            loadRecordsData();
            break;
        case 'hub-settings':
            if (hubSettingsTab) hubSettingsTab.classList.remove('hidden');
            loadHubSettings();
            break;
    }
    
    closeMobileSidebar();
}

/**
 * Toggle mobile sidebar visibility
 */
function toggleMobileSidebar() {
    if (!mobileSidebar) return;
    const backdrop = document.getElementById('sidebar-backdrop');
    const isOpen = mobileSidebar.classList.contains('sidebar-open');
    
    if (isOpen) {
        mobileSidebar.classList.remove('sidebar-open');
        if (backdrop) backdrop.classList.remove('active');
    } else {
        mobileSidebar.classList.add('sidebar-open');
        if (backdrop) backdrop.classList.add('active');
    }
}

/**
 * Close mobile sidebar
 */
function closeMobileSidebar() {
    if (!mobileSidebar) return;
    const backdrop = document.getElementById('sidebar-backdrop');
    if (window.innerWidth < 768) {
        mobileSidebar.classList.remove('sidebar-open');
        if (backdrop) backdrop.classList.remove('active');
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        showLoading('Memuat data dashboard...');
        const [attendance, users] = await Promise.all([
            getTodayAttendance(),
            getAllUsers()
        ]);
        todayAttendanceData = attendance;
        allUsersData = users;
        updateStatsCards();
        renderTodayAttendancePreview();
        hideLoading();
    } catch (error) {
        hideLoading();
        errorLog('Failed to load dashboard data', error);
        showNotification('Gagal memuat data: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Load attendance tab data
 */
async function loadAttendanceData() {
    try {
        showLoading('Memuat data absensi...');
        todayAttendanceData = await getTodayAttendance();
        renderAttendanceTable(todayAttendanceData);
        hideLoading();
    } catch (error) {
        hideLoading();
        errorLog('Failed to load attendance data', error);
        showNotification('Gagal memuat data absensi: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Load employees tab data
 */
async function loadEmployeesData() {
    try {
        showLoading('Memuat data karyawan...');
        allUsersData = await getAllUsers();
        renderEmployeesTable(allUsersData);
        hideLoading();
    } catch (error) {
        hideLoading();
        errorLog('Failed to load employees data', error);
        showNotification('Gagal memuat data karyawan: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Load records tab data
 */
async function loadRecordsData() {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        startDateInput.value = formatDateForInput(startDate);
        endDateInput.value = formatDateForInput(endDate);
        
        await handleDateRangeFilter();
    } catch (error) {
        errorLog('Failed to load records data', error);
        showNotification('Gagal memuat data rekaman: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Update stats cards
 */
function updateStatsCards() {
    totalEmployeesCard.textContent = allUsersData.length;
    const presentToday = new Set(todayAttendanceData.map(a => a.user_id)).size;
    presentTodayCard.textContent = presentToday;
    absentTodayCard.textContent = allUsersData.length - presentToday;
    totalScansCard.textContent = todayAttendanceData.length;
}

/**
 * Render today's attendance preview
 */
function renderTodayAttendancePreview() {
    if (!todayAttendanceTableBody) return;
    todayAttendanceTableBody.innerHTML = '';
    
    if (todayAttendanceData.length === 0) {
        todayAttendanceTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    Belum ada data absensi hari ini
                </td>
            </tr>
        `;
        return;
    }
    
    const recentRecords = todayAttendanceData.slice(-10).reverse();
    recentRecords.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${record.capture_url ? 
                        `<img src="${record.capture_url}" alt="${escapeHtml(record.name)}" class="w-10 h-10 rounded-full object-cover mr-3">` :
                        `<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-500">👤</div>`
                    }
                    <div>
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(record.name)}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(record.employee_id)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${escapeHtml(record.role)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.scan_type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }">
                    ${record.scan_type}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatTimestamp(record.timestamp)}
            </td>
        `;
        todayAttendanceTableBody.appendChild(row);
    });
}

/**
 * Render attendance table
 */
function renderAttendanceTable(data) {
    if (!todayAttendanceTableBody) return;
    todayAttendanceTableBody.innerHTML = '';
    
    if (data.length === 0) {
        todayAttendanceTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    Belum ada data absensi
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedData = [...data].reverse();
    sortedData.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${record.capture_url ? 
                        `<img src="${record.capture_url}" alt="${escapeHtml(record.name)}" class="w-12 h-12 rounded-lg object-cover mr-3">` :
                        `<div class="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center mr-3 text-gray-500 text-xl">👤</div>`
                    }
                    <div>
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(record.name)}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(record.employee_id)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${escapeHtml(record.role)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.scan_type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }">
                    ${record.scan_type}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatTimestamp(record.timestamp)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatTime(record.timestamp)}
            </td>
        `;
        todayAttendanceTableBody.appendChild(row);
    });
}

/**
 * Render employees table
 */
function renderEmployeesTable(data) {
    if (!allEmployeesTableBody) return;
    allEmployeesTableBody.innerHTML = '';
    
    if (data.length === 0) {
        allEmployeesTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    Belum ada data karyawan terdaftar
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${user.photo_url ? 
                        `<img src="${user.photo_url}" alt="${escapeHtml(user.name)}" class="w-12 h-12 rounded-full object-cover mr-3">` :
                        `<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-500 text-xl">👤</div>`
                    }
                    <div>
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(user.name)}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(user.employee_id)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${escapeHtml(user.role)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatTimestamp(user.created_at)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Aktif
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                    type="button"
                    class="text-red-600 hover:text-red-900 font-semibold cursor-pointer delete-btn"
                    data-id="${user.id}"
                    data-name="${escapeHtml(user.name)}"
                >
                    Hapus
                </button>
            </td>
        `;
        
        // Attach event listener safely via JS instead of inline onclick
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            showDeleteModal(user.id, user.name);
        });

        allEmployeesTableBody.appendChild(row);
    });
}

/**
 * Render records table
 */
function renderRecordsTable(data) {
    if (!recordsTableBody) return;
    recordsTableBody.innerHTML = '';
    
    if (data.length === 0) {
        recordsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    Tidak ada data untuk rentang tanggal ini
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedData = [...data].reverse();
    sortedData.forEach(record => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatDate(record.timestamp)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(record.name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(record.employee_id)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${escapeHtml(record.role)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    record.scan_type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }">
                    ${record.scan_type}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatTime(record.timestamp)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${record.capture_url ? 
                    `<img src="${record.capture_url}" alt="Capture" class="w-10 h-10 rounded object-cover">` :
                    `<span class="text-gray-400 text-xs">N/A</span>`
                }
            </td>
        `;
        recordsTableBody.appendChild(row);
    });
}

/**
 * Show delete confirmation modal
 */
function showDeleteModal(userId, userName) {
    userToDelete = { id: userId, name: userName };
    deleteModalName.textContent = userName;
    deleteModal.classList.remove('hidden');
}

/**
 * Handle confirm delete
 */
async function handleConfirmDelete() {
    if (!userToDelete) return;
    
    try {
        showLoading('Menghapus karyawan...');
        await deleteUser(userToDelete.id);
        hideLoading();
        deleteModal.classList.add('hidden');
        showNotification(`Karyawan ${userToDelete.name} berhasil dihapus`, 'success');
        
        await loadEmployeesData();
        await loadDashboardData();
        userToDelete = null;
    } catch (error) {
        hideLoading();
        errorLog('Delete failed', error);
        showNotification('Gagal menghapus karyawan: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Handle cancel delete
 */
function handleCancelDelete() {
    userToDelete = null;
    deleteModal.classList.add('hidden');
}

/**
 * Handle date range filter (Tabel Dasbor)
 */
async function handleDateRangeFilter(e) {
    if (e) e.preventDefault();
    
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
        showNotification('Silakan pilih rentang tanggal', 'error');
        return;
    }
    
    try {
        showLoading('Memuat data...');
        
        const fetchStart = new Date(startDate);
        fetchStart.setDate(fetchStart.getDate() - 1);
        
        const fetchEnd = new Date(endDate);
        fetchEnd.setDate(fetchEnd.getDate() + 1);
        
        const rawData = await getAttendanceRecords(formatDateForInput(fetchStart), formatDateForInput(fetchEnd));
        
        recordsData = rawData.filter(record => {
            const wibDate = getExactWIBDateString(record.timestamp);
            return wibDate >= startDate && wibDate <= endDate;
        });

        renderRecordsTable(recordsData);
        hideLoading();
    } catch (error) {
        hideLoading();
        errorLog('Failed to filter records', error);
        showNotification('Gagal memuat data: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Show export modal and set default dates
 */
function showExportModal() {
    if (!exportModal) return;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    if(exportStartDate) exportStartDate.value = formatDateForInput(startDate);
    if(exportEndDate) exportEndDate.value = formatDateForInput(endDate);
    
    exportModal.classList.remove('hidden');
}

/**
 * Hide export modal
 */
function hideExportModal() {
    if (!exportModal) return;
    exportModal.classList.add('hidden');
}

/**
 * Handle confirm export (Pop-Up Modal Export)
 */
async function handleConfirmExport(e) {
    e.preventDefault();
    
    const startDate = exportStartDate.value;
    const endDate = exportEndDate.value;
    
    if (!startDate || !endDate) {
        showNotification('Silakan pilih rentang tanggal', 'error');
        return;
    }
    
    try {
        showLoading('Menyiapkan data export...');
        
        const fetchStart = new Date(startDate);
        fetchStart.setDate(fetchStart.getDate() - 1);
        
        const fetchEnd = new Date(endDate);
        fetchEnd.setDate(fetchEnd.getDate() + 1);
        
        const rawData = await getAttendanceRecords(formatDateForInput(fetchStart), formatDateForInput(fetchEnd));
        
        const dataToExport = rawData.filter(record => {
            const wibDate = getExactWIBDateString(record.timestamp);
            return wibDate >= startDate && wibDate <= endDate;
        });
        
        if (!dataToExport || dataToExport.length === 0) {
            hideLoading();
            showNotification(`Tidak ada absensi pada rentang ${startDate} s/d ${endDate}`, 'error');
            return;
        }
        
        const filename = `absensi_${startDate}_hingga_${endDate}.csv`;
        exportToCSV(dataToExport, filename);
        
        hideLoading();
        hideExportModal();
        showNotification('Data berhasil diekspor', 'success');
        
    } catch (error) {
        hideLoading();
        errorLog('Export failed', error);
        showNotification('Gagal mengekspor data: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Export data to CSV with WIB time formatting
 */
function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;

    const rawKeys = Object.keys(data[0]).filter(key => !key.includes('url') && !key.includes('descriptor'));
    
    const headers = rawKeys.map(key => {
        if (key === 'timestamp' || key === 'created_at') return key + '_wib';
        return key;
    });

    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = rawKeys.map(header => {
            let value = row[header] || '';
            
            if ((header === 'timestamp' || header === 'created_at') && value) {
                try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        const options = { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: 'Asia/Jakarta',
                            hour12: false
                        };
                        value = date.toLocaleString('id-ID', options);
                    }
                } catch (e) {}
            }

            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

/**
 * Handle refresh
 */
async function handleRefresh() {
    try {
        if (currentTab === 'dashboard') {
            await loadDashboardData();
        } else if (currentTab === 'attendance') {
            await loadAttendanceData();
        } else if (currentTab === 'employees') {
            await loadEmployeesData();
        } else if (currentTab === 'records') {
            await handleDateRangeFilter();
        }
        showNotification('Data berhasil diperbarui', 'success');
    } catch (error) {
        errorLog('Refresh failed', error);
        showNotification('Gagal memperbarui data', 'error');
    }
}

/**
 * Show loading overlay
 */
function showLoading(message) {
    if (loadingMessage) loadingMessage.textContent = message;
    loadingOverlay?.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay?.classList.add('hidden');
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    notificationMessage.textContent = message;
    notificationBar.classList.remove('bg-blue-500', 'bg-green-500', 'bg-red-500');
    if (type === 'success') {
        notificationBar.classList.add('bg-green-500');
    } else if (type === 'error') {
        notificationBar.classList.add('bg-red-500');
    } else {
        notificationBar.classList.add('bg-blue-500');
    }
    
    notificationBar.classList.remove('hidden');
    setTimeout(() => {
        notificationBar.classList.add('hidden');
    }, 4000);
}

/**
 * Start real-time clock
 */
function startClock() {
    function updateClock() {
        const now = new Date();
        if (currentTimeElement) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
        if (currentDateElement) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            currentDateElement.textContent = now.toLocaleDateString('id-ID', options);
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

/**
 * Helper: Mengubah timestamp UTC menjadi YYYY-MM-DD secara matematis 
 * dengan menambahkan +7 Jam agar 100% akurat dengan WIB.
 */
function getExactWIBDateString(isoTimestamp) {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    
    const wibTime = date.getTime() + (7 * 60 * 60 * 1000);
    const wibDate = new Date(wibTime);
    
    const year = wibDate.getUTCFullYear();
    const month = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wibDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Format timestamp to readable datetime in WIB
 */
function formatTimestamp(isoTimestamp) {
    if (!isoTimestamp) return '-';
    const date = new Date(isoTimestamp);
    return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12: false
    }) + ' WIB';
}

/**
 * Format timestamp to time only in WIB
 */
function formatTime(isoTimestamp) {
    if (!isoTimestamp) return '-';
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12: false
    }) + ' WIB';
}

/**
 * Format timestamp to date only in WIB
 */
function formatDate(isoTimestamp) {
    if (!isoTimestamp) return '-';
    const date = new Date(isoTimestamp);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Jakarta'
    });
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for filename
 */
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Export functions to global scope for onclick handlers
window.adminApp = {
    showDeleteModal,
    handleConfirmDelete,
    handleCancelDelete
};

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('DOMContentLoaded', init);


// ============================================
// HUB SETTINGS FUNCTIONS
// ============================================

/**
 * Load hub settings data
 */
async function loadHubSettings() {
    try {
        showLoading();
        
        const settings = await getHubLocation();
        
        // Update display
        if (currentHubName) currentHubName.textContent = settings.hub_name;
        if (currentLatitude) currentLatitude.textContent = settings.latitude;
        if (currentLongitude) currentLongitude.textContent = settings.longitude;
        if (currentRadius) currentRadius.textContent = `${settings.radius_meters} meter`;
        if (currentUpdatedAt) {
            const date = new Date(settings.updated_at);
            currentUpdatedAt.textContent = date.toLocaleString('id-ID', {
                dateStyle: 'long',
                timeStyle: 'short'
            });
        }
        
        // Update form
        if (hubNameInput) hubNameInput.value = settings.hub_name;
        if (latitudeInput) latitudeInput.value = settings.latitude;
        if (longitudeInput) longitudeInput.value = settings.longitude;
        if (radiusInput) radiusInput.value = settings.radius_meters;
        
        hideLoading();
        debugLog('Hub settings loaded:', settings);
        
    } catch (error) {
        errorLog('Failed to load hub settings', error);
        hideLoading();
        showNotification('Gagal memuat pengaturan lokasi: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Handle hub location form submit
 */
async function handleHubLocationSubmit(e) {
    e.preventDefault();
    
    const hubName = hubNameInput.value.trim();
    const latitude = parseFloat(latitudeInput.value);
    const longitude = parseFloat(longitudeInput.value);
    const radius = parseInt(radiusInput.value);
    
    // Validation
    if (!hubName) {
        showNotification('Nama hub tidak boleh kosong', 'error');
        return;
    }
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        showNotification('Latitude harus antara -90 sampai 90', 'error');
        return;
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        showNotification('Longitude harus antara -180 sampai 180', 'error');
        return;
    }
    
    if (isNaN(radius) || radius < 50 || radius > 10000) {
        showNotification('Radius harus antara 50 sampai 10000 meter', 'error');
        return;
    }
    
    try {
        showLoading();
        
        await updateHubLocation({
            hub_name: hubName,
            latitude: latitude,
            longitude: longitude,
            radius_meters: radius,
            updated_by: 'Admin'
        });
        
        hideLoading();
        showNotification('✅ Lokasi hub berhasil diupdate!', 'success');
        
        // Reload settings to reflect changes
        await loadHubSettings();
        
    } catch (error) {
        errorLog('Failed to update hub location', error);
        hideLoading();
        showNotification('❌ Gagal mengupdate lokasi: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Handle get current GPS button click
 */
async function handleGetCurrentGPS() {
    try {
        showLoading();
        showNotification('📍 Mendapatkan lokasi GPS...', 'info');
        
        const position = await getCurrentPosition();
        
        // Fill form with current GPS
        if (latitudeInput) latitudeInput.value = position.latitude;
        if (longitudeInput) longitudeInput.value = position.longitude;
        
        hideLoading();
        showNotification(
            `✅ Lokasi GPS berhasil didapatkan!\nAkurasi: ${Math.round(position.accuracy)} meter`,
            'success'
        );
        
    } catch (error) {
        errorLog('Failed to get GPS position', error);
        hideLoading();
        showNotification('❌ Gagal mendapatkan lokasi GPS: ' + error.message, 'error');
    }
}
