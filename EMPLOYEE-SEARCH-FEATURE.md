# 🔍 Fitur Search di Halaman Daftar Karyawan

## Overview
Menambahkan search bar di halaman Daftar Karyawan (Employees tab) untuk memudahkan mencari karyawan berdasarkan nama, Employee ID, atau jabatan.

## Features

### Search Criteria
User dapat mencari berdasarkan:
1. ✅ **Nama** - Cari berdasarkan nama karyawan
2. ✅ **Employee ID** - Cari berdasarkan ID karyawan
3. ✅ **Jabatan/Role** - Cari berdasarkan jabatan (Rider, Admin, dll)

### Search Behavior
- **Real-time search** - Filter otomatis saat mengetik
- **Case-insensitive** - Tidak perlu khawatir huruf besar/kecil
- **Substring match** - Cari sebagian kata (contoh: "ride" akan match "Rider Dedicated")
- **Multi-field** - Mencari di 3 field sekaligus (nama, ID, role)

## Implementation

### 1. HTML - Search Input (`frontend/admin.html`)

```html
<!-- Search Bar di Employees Tab -->
<div class="mt-4">
    <label class="block text-sm font-semibold text-gray-700 mb-2">Cari Karyawan</label>
    <div class="relative">
        <input type="text" 
               id="search-employee" 
               placeholder="Cari berdasarkan nama, Employee ID, atau jabatan..." 
               class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
        <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
    </div>
</div>
```

### 2. JavaScript - Search Logic (`frontend/src/js/admin.js`)

**DOM Element Declaration:**
```javascript
let searchEmployeeInput;
```

**Initialize DOM:**
```javascript
searchEmployeeInput = document.getElementById('search-employee');
```

**Event Listener:**
```javascript
if (searchEmployeeInput) {
    searchEmployeeInput.addEventListener('input', handleSearchEmployee);
}
```

**Search Handler Function:**
```javascript
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
```

**Auto-clear on reload:**
```javascript
async function loadEmployeesData() {
    // Clear search input when reloading
    if (searchEmployeeInput) searchEmployeeInput.value = '';
    renderEmployeesTable(allUsersData);
}
```

## User Experience

### Usage Flow:
1. User buka tab **Daftar Karyawan**
2. Ketik kata kunci di search bar
3. Tabel otomatis filter sesuai input
4. Hapus search → Tampil semua karyawan lagi

### Search Examples:

| Search Input | Results Shown |
|--------------|---------------|
| `john` | Semua karyawan dengan nama mengandung "john" |
| `SPX001` | Karyawan dengan Employee ID = SPX001 |
| `rider` | Semua Rider (Dedicated, Mitra, Plus) |
| `admin` | Semua Admin |
| (empty) | Semua karyawan |

## Design

### Search Input Styling:
```css
- Width: Full (100%)
- Padding: 1rem (vertical & horizontal)
- Padding-left: 2.5rem (untuk icon)
- Border: Gray 300, rounded-lg
- Focus: Ring-2, blue-500
- Icon: Search icon (magnifying glass), gray-400
- Icon position: Absolute left-3
```

### Placeholder Text:
```
"Cari berdasarkan nama, Employee ID, atau jabatan..."
```

## Performance

- **No API calls** - Filter dilakukan di client-side menggunakan data yang sudah di-load
- **Fast filtering** - Array.filter() dengan lowercase comparison
- **Instant feedback** - Real-time update saat mengetik

## Testing

### Test Case 1: Search by Name
1. Ketik "Ahmad" di search bar
2. ✅ Expected: Hanya tampil karyawan dengan nama "Ahmad"

### Test Case 2: Search by Employee ID
1. Ketik "SPX001" di search bar
2. ✅ Expected: Hanya tampil karyawan dengan ID SPX001

### Test Case 3: Search by Role
1. Ketik "Rider" di search bar
2. ✅ Expected: Tampil semua Rider (Dedicated, Mitra, Plus)

### Test Case 4: Partial Match
1. Ketik "rid" di search bar
2. ✅ Expected: Tampil semua yang mengandung "rid" (Rider, dsb)

### Test Case 5: Case Insensitive
1. Ketik "AHMAD" (huruf besar)
2. ✅ Expected: Tetap match dengan "Ahmad"

### Test Case 6: Clear Search
1. Ketik sesuatu, lalu hapus semua
2. ✅ Expected: Tampil semua karyawan lagi

### Test Case 7: No Results
1. Ketik "xyz123abc"
2. ✅ Expected: Tabel kosong dengan pesan "Tidak ada data"

### Test Case 8: Reload Data
1. Ketik search term
2. Refresh data (klik refresh button)
3. ✅ Expected: Search bar cleared, tampil semua data

## Edge Cases Handled

1. **Empty search** → Show all employees
2. **Whitespace only** → Trimmed, show all employees
3. **Special characters** → Works normally
4. **Very long search term** → Works normally
5. **Unicode characters** → Works (untuk nama dengan karakter khusus)

## Comparison: Records vs Employees Search

| Feature | Records Search | Employees Search |
|---------|----------------|------------------|
| Location | Riwayat Absensi tab | Daftar Karyawan tab |
| Search Field | Name only | Name, ID, Role |
| Input ID | `search-name` | `search-employee` |
| Handler | `handleSearchName()` | `handleSearchEmployee()` |
| Data Source | `recordsData` | `allUsersData` |

## Files Modified

1. ✅ `frontend/admin.html` - Added search input HTML
2. ✅ `frontend/src/js/admin.js` - Added search logic

## Deploy

### Frontend Only (Cloudflare Pages)
```bash
# Auto-deploy via GitHub
git add frontend/admin.html frontend/src/js/admin.js
git commit -m "Add employee search feature in admin dashboard"
git push origin main
```

### No Backend Changes Required
Fitur ini client-side only, tidak butuh perubahan backend.

## Future Enhancements

Potential improvements:
- [ ] Advanced filters (filter by role dropdown)
- [ ] Sort by column (nama, ID, tanggal registrasi)
- [ ] Export filtered results
- [ ] Highlight matched text in results
- [ ] Search history / recent searches
- [ ] Multi-select for bulk operations

## Accessibility

- ✅ Label text untuk screen readers
- ✅ Placeholder yang deskriptif
- ✅ Focus ring untuk keyboard navigation
- ✅ Icon SVG dengan proper viewBox

---

**Status**: ✅ Implemented  
**Version**: 1.0  
**Date**: 2026-09-24
