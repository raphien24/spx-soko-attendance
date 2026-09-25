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
    getErrorMessage,
    // Employee management
    addEmployee,
    getAllEmployeesData,
    updateEmployeeInfo,
    deleteEmployeeData,
    // Roster schedule
    createRosterSchedule,
    getRosterSchedule,
    getRosterByDateRange,
    deleteRosterEntry,
    deleteRosterByDateEmployee,
    checkRosterAttendance
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
let searchNameInput, searchEmployeeInput;
let exportBtn, exportRecordsBtn, refreshBtn;
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
let autoRefreshInterval = null; // Auto-refresh timer

/**
 * Initialize admin dashboard
 */
async function init() {
    try {
        getDOMElements();
        setupEventListeners();
        startClock();
        
        // Initialize new tabs
        initEmployeeDataTab();
        initRosterTab();
        
        // Cek status autentikasi PIN di sesi saat ini
        if (sessionStorage.getItem('admin_authenticated') === 'true') {
            if (pinModal) pinModal.classList.add('hidden');
            await loadDashboardData();
            startAutoRefresh(); // Start auto-refresh untuk dashboard
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
    
    searchNameInput = document.getElementById('search-name');
    searchEmployeeInput = document.getElementById('search-employee');
    
    exportBtn = document.getElementById('export-btn');
    exportRecordsBtn = document.getElementById('export-records-btn');
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
                startAutoRefresh(); // Start auto-refresh setelah login
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
    
    // Search name input listener
    if (searchNameInput) {
        searchNameInput.addEventListener('input', handleSearchName);
    }
    
    // Search employee input listener
    if (searchEmployeeInput) {
        searchEmployeeInput.addEventListener('input', handleSearchEmployee);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    // Export Listeners
    if (exportBtn) {
        exportBtn.addEventListener('click', showExportModal);
    }
    if (exportRecordsBtn) {
        exportRecordsBtn.addEventListener('click', handleExportRecords);
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
    if (employeeDataTab) employeeDataTab.classList.add('hidden');
    if (rosterTab) rosterTab.classList.add('hidden');
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
        case 'employee-data':
            if (employeeDataTab) employeeDataTab.classList.remove('hidden');
            loadAllEmployeesData();
            break;
        case 'roster':
            if (rosterTab) rosterTab.classList.remove('hidden');
            loadEmployeesForRoster();
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
        
        // Clear search input when reloading
        if (searchEmployeeInput) searchEmployeeInput.value = '';
        
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
    
    const recentRecords = [...todayAttendanceData].reverse();
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

        // Clear search input when filtering by date
        if (searchNameInput) searchNameInput.value = '';
        
        renderRecordsTable(recordsData);
        hideLoading();
    } catch (error) {
        hideLoading();
        errorLog('Failed to filter records', error);
        showNotification('Gagal memuat data: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Handle search name in records
 */
function handleSearchName() {
    const searchTerm = searchNameInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is empty, show all records
        renderRecordsTable(recordsData);
        return;
    }
    
    // Filter records by name
    const filteredData = recordsData.filter(record => 
        record.name.toLowerCase().includes(searchTerm)
    );
    
    renderRecordsTable(filteredData);
}

/**
 * Handle search employee in employees tab
 */
function handleSearchEmployee() {
    const searchTerm = searchEmployeeInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is empty, show all employees
        renderEmployeesTable(allUsersData);
        return;
    }
    
    // Filter employees by name, employee_id, or role
    const filteredData = allUsersData.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm) ||
        employee.employee_id.toLowerCase().includes(searchTerm) ||
        employee.role.toLowerCase().includes(searchTerm)
    );
    
    renderEmployeesTable(filteredData);
}

/**
 * Handle export records to CSV
 */
function handleExportRecords() {
    if (!recordsData || recordsData.length === 0) {
        showNotification('Tidak ada data untuk di-export. Silakan filter tanggal terlebih dahulu.', 'error');
        return;
    }
    
    try {
        // Get current displayed data (might be filtered by search)
        const searchTerm = searchNameInput ? searchNameInput.value.toLowerCase().trim() : '';
        let dataToExport = recordsData;
        
        if (searchTerm) {
            dataToExport = recordsData.filter(record => 
                record.name.toLowerCase().includes(searchTerm)
            );
        }
        
        if (dataToExport.length === 0) {
            showNotification('Tidak ada data yang sesuai filter untuk di-export.', 'error');
            return;
        }
        
        // Prepare CSV content
        const headers = ['Tanggal', 'Waktu', 'Employee ID', 'Nama', 'Jabatan', 'Status'];
        const csvRows = [headers.join(',')];
        
        dataToExport.forEach(record => {
            const date = formatDate(record.timestamp);
            const time = formatTime(record.timestamp);
            const employeeId = escapeCSV(record.employee_id);
            const name = escapeCSV(record.name);
            const role = escapeCSV(record.role || '-');
            const status = record.scan_type;
            
            csvRows.push([date, time, employeeId, name, role, status].join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        // Add BOM for Excel UTF-8 recognition
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with date range
        const startDate = startDateInput.value || 'unknown';
        const endDate = endDateInput.value || 'unknown';
        const filename = `Riwayat_Absensi_${startDate}_to_${endDate}.csv`;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`Export berhasil! ${dataToExport.length} record di-download.`, 'success');
        
    } catch (error) {
        errorLog('Export failed', error);
        showNotification('Gagal export data: ' + error.message, 'error');
    }
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
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
 * Start auto-refresh for dashboard data
 * Refreshes every 30 seconds to keep data current
 */
function startAutoRefresh() {
    // Clear existing interval if any
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh dashboard every 30 seconds
    autoRefreshInterval = setInterval(async () => {
        // Only refresh if on dashboard tab
        if (currentTab === 'dashboard') {
            debugLog('[Auto-Refresh] Refreshing dashboard data...');
            try {
                await loadDashboardData();
                debugLog('[Auto-Refresh] Dashboard data refreshed successfully');
            } catch (error) {
                errorLog('[Auto-Refresh] Failed to refresh dashboard', error);
            }
        }
    }, 30000); // 30 seconds
    
    debugLog('[Auto-Refresh] Started (every 30 seconds)');
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        debugLog('[Auto-Refresh] Stopped');
    }
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

// ============================================
// EMPLOYEE DATA MANAGEMENT
// ============================================

let employeeDataTab, addEmployeeForm, employeeDataBody, searchEmployeeDataInput;
let allEmployeesDataCache = [];

/**
 * Initialize employee data tab elements
 */
function initEmployeeDataTab() {
    employeeDataTab = document.getElementById('employee-data-tab');
    addEmployeeForm = document.getElementById('add-employee-form');
    employeeDataBody = document.getElementById('employee-data-body');
    searchEmployeeDataInput = document.getElementById('search-employee-data');
    
    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', handleAddEmployee);
    }
    
    if (searchEmployeeDataInput) {
        searchEmployeeDataInput.addEventListener('input', handleSearchEmployeeData);
    }
}

/**
 * Load all employee data
 */
async function loadAllEmployeesData() {
    try {
        showLoading('Memuat data karyawan...');
        allEmployeesDataCache = await getAllEmployeesData();
        renderEmployeeDataTable(allEmployeesDataCache);
        hideLoading();
    } catch (error) {
        hideLoading();
        errorLog('Failed to load employee data', error);
        showNotification('Gagal memuat data karyawan: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Handle add employee form submission
 */
async function handleAddEmployee(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('new-employee-id').value.trim();
    const name = document.getElementById('new-employee-name').value.trim();
    const role = document.getElementById('new-employee-role').value;
    const phone = document.getElementById('new-employee-phone').value.trim();
    
    if (!employeeId || !name) {
        showNotification('Employee ID dan Nama wajib diisi!', 'error');
        return;
    }
    
    try {
        showLoading('Menambahkan karyawan...');
        
        await addEmployee({
            employee_id: employeeId,
            name: name,
            role: role,
            phone: phone || null
        });
        
        hideLoading();
        showNotification(`Karyawan ${name} berhasil ditambahkan!`, 'success');
        
        // Reset form
        addEmployeeForm.reset();
        
        // Reload data
        await loadAllEmployeesData();
        
    } catch (error) {
        hideLoading();
        errorLog('Failed to add employee', error);
        showNotification('Gagal menambahkan karyawan: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Render employee data table
 */
function renderEmployeeDataTable(data) {
    if (!employeeDataBody) return;
    employeeDataBody.innerHTML = '';
    
    if (data.length === 0) {
        employeeDataBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    Belum ada data karyawan
                </td>
            </tr>
        `;
        return;
    }
    
    data.forEach(emp => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusBadge = emp.enrolled_status === 'enrolled' 
            ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Enrolled</span>'
            : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Belum Enrolled</span>';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(emp.name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(emp.employee_id)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${escapeHtml(emp.role)}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-600">${escapeHtml(emp.phone || '-')}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-red-600 hover:text-red-900 delete-employee-btn" data-id="${emp.employee_id}" data-name="${escapeHtml(emp.name)}">
                    Hapus
                </button>
            </td>
        `;
        
        const deleteBtn = row.querySelector('.delete-employee-btn');
        deleteBtn.addEventListener('click', () => handleDeleteEmployee(emp.employee_id, emp.name));
        
        employeeDataBody.appendChild(row);
    });
}

/**
 * Handle search employee data
 */
function handleSearchEmployeeData() {
    const searchTerm = searchEmployeeDataInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderEmployeeDataTable(allEmployeesDataCache);
        return;
    }
    
    const filtered = allEmployeesDataCache.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.employee_id.toLowerCase().includes(searchTerm) ||
        (emp.role && emp.role.toLowerCase().includes(searchTerm)) ||
        (emp.phone && emp.phone.includes(searchTerm))
    );
    
    renderEmployeeDataTable(filtered);
}

/**
 * Handle delete employee
 */
async function handleDeleteEmployee(employeeId, name) {
    if (!confirm(`Hapus karyawan ${name}?`)) return;
    
    try {
        showLoading('Menghapus karyawan...');
        await deleteEmployeeData(employeeId);
        hideLoading();
        showNotification(`Karyawan ${name} berhasil dihapus`, 'success');
        await loadAllEmployeesData();
    } catch (error) {
        hideLoading();
        errorLog('Failed to delete employee', error);
        showNotification('Gagal menghapus karyawan: ' + getErrorMessage(error), 'error');
    }
}

// ============================================
// ROSTER SCHEDULE MANAGEMENT
// ============================================

let rosterTab, createRosterForm, rosterEmployeeSelect, rosterTableBody;
let rosterDateInput, viewRosterDateInput, loadRosterBtn;
let rosterSummary, rosterTotal, rosterClockedIn, rosterNotClocked;

/**
 * Initialize roster tab elements
 */
function initRosterTab() {
    rosterTab = document.getElementById('roster-tab');
    createRosterForm = document.getElementById('create-roster-form');
    rosterEmployeeSelect = document.getElementById('roster-employee-select');
    rosterTableBody = document.getElementById('roster-table-body');
    rosterDateInput = document.getElementById('roster-date');
    viewRosterDateInput = document.getElementById('view-roster-date');
    loadRosterBtn = document.getElementById('load-roster-btn');
    
    rosterSummary = document.getElementById('roster-summary');
    rosterTotal = document.getElementById('roster-total');
    rosterClockedIn = document.getElementById('roster-clocked-in');
    rosterNotClocked = document.getElementById('roster-not-clocked');
    
    // Set default dates (tomorrow for roster, today for view)
    if (rosterDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        rosterDateInput.value = tomorrow.toISOString().split('T')[0];
    }
    
    if (viewRosterDateInput) {
        const today = new Date();
        viewRosterDateInput.value = today.toISOString().split('T')[0];
    }
    
    if (createRosterForm) {
        createRosterForm.addEventListener('submit', handleCreateRoster);
    }
    
    if (loadRosterBtn) {
        loadRosterBtn.addEventListener('click', handleLoadRoster);
    }
}

/**
 * Load employees for roster selection
 */
async function loadEmployeesForRoster() {
    try {
        const employees = await getAllEmployeesData();
        
        if (rosterEmployeeSelect) {
            rosterEmployeeSelect.innerHTML = '';
            
            if (employees.length === 0) {
                rosterEmployeeSelect.innerHTML = '<option disabled>Belum ada karyawan</option>';
                return;
            }
            
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.employee_id;
                option.textContent = `${emp.name} (${emp.employee_id}) - ${emp.role}`;
                rosterEmployeeSelect.appendChild(option);
            });
        }
    } catch (error) {
        errorLog('Failed to load employees for roster', error);
    }
}

/**
 * Handle create roster submission
 */
async function handleCreateRoster(e) {
    e.preventDefault();
    
    const date = rosterDateInput.value;
    const selectedOptions = Array.from(rosterEmployeeSelect.selectedOptions);
    const employeeIds = selectedOptions.map(opt => opt.value);
    
    if (!date) {
        showNotification('Pilih tanggal roster!', 'error');
        return;
    }
    
    if (employeeIds.length === 0) {
        showNotification('Pilih minimal 1 karyawan!', 'error');
        return;
    }
    
    try {
        showLoading(`Membuat roster untuk ${employeeIds.length} karyawan...`);
        
        const response = await createRosterSchedule(date, employeeIds);
        
        hideLoading();
        
        const { added, skipped, failed } = response.data;
        
        let message = `Roster berhasil dibuat!\n`;
        message += `✓ ${added.length} karyawan ditambahkan\n`;
        if (skipped.length > 0) message += `⚠ ${skipped.length} sudah di-roster sebelumnya\n`;
        if (failed.length > 0) message += `✗ ${failed.length} gagal ditambahkan`;
        
        showNotification(message, 'success');
        
        // Reset selection
        rosterEmployeeSelect.selectedIndex = -1;
        
        // Auto load the roster
        viewRosterDateInput.value = date;
        await handleLoadRoster();
        
    } catch (error) {
        hideLoading();
        errorLog('Failed to create roster', error);
        showNotification('Gagal membuat roster: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Handle load roster
 */
async function handleLoadRoster() {
    const date = viewRosterDateInput.value;
    
    if (!date) {
        showNotification('Pilih tanggal!', 'error');
        return;
    }
    
    try {
        showLoading('Memuat roster...');
        
        const roster = await getRosterSchedule(date, true);
        
        hideLoading();
        
        renderRosterTable(roster, date);
        
    } catch (error) {
        hideLoading();
        errorLog('Failed to load roster', error);
        showNotification('Gagal memuat roster: ' + getErrorMessage(error), 'error');
    }
}

/**
 * Render roster table with attendance status
 */
function renderRosterTable(data, date) {
    if (!rosterTableBody) return;
    
    rosterTableBody.innerHTML = '';
    
    if (data.length === 0) {
        rosterTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    Tidak ada roster untuk tanggal ${date}
                </td>
            </tr>
        `;
        
        if (rosterSummary) rosterSummary.classList.add('hidden');
        return;
    }
    
    // Update summary
    const clockedInCount = data.filter(r => r.attendance_status === 'clocked_in').length;
    const notClockedCount = data.length - clockedInCount;
    
    if (rosterTotal) rosterTotal.textContent = data.length;
    if (rosterClockedIn) rosterClockedIn.textContent = clockedInCount;
    if (rosterNotClocked) rosterNotClocked.textContent = notClockedCount;
    if (rosterSummary) rosterSummary.classList.remove('hidden');
    
    // Render rows
    data.forEach(roster => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusBadge = roster.attendance_status === 'clocked_in'
            ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✓ Sudah Clock In</span>'
            : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">✗ Belum Clock In</span>';
        
        const clockInTime = roster.clock_in_time 
            ? formatTime(roster.clock_in_time)
            : '-';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(roster.employee_name)}</div>
                <div class="text-sm text-gray-500">${escapeHtml(roster.employee_id)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${escapeHtml(roster.role || '-')}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-600">${escapeHtml(roster.phone || '-')}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${clockInTime}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-red-600 hover:text-red-900 delete-roster-btn" 
                        data-id="${roster.roster_id}" 
                        data-name="${escapeHtml(roster.employee_name)}">
                    Hapus
                </button>
            </td>
        `;
        
        const deleteBtn = row.querySelector('.delete-roster-btn');
        deleteBtn.addEventListener('click', async () => {
            if (confirm(`Hapus ${roster.employee_name} dari roster?`)) {
                try {
                    showLoading('Menghapus dari roster...');
                    await deleteRosterEntry(roster.roster_id);
                    hideLoading();
                    showNotification('Berhasil dihapus dari roster', 'success');
                    await handleLoadRoster();
                } catch (error) {
                    hideLoading();
                    errorLog('Failed to delete roster', error);
                    showNotification('Gagal menghapus: ' + getErrorMessage(error), 'error');
                }
            }
        });
        
        rosterTableBody.appendChild(row);
    });
}
