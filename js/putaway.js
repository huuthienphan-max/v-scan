// js/putaway.js - Logic xử lý cho module Putaway HV

// Biến toàn cục cho module
let putawayStats = {
    pending: 0,
    today: 0,
    total: 0,
    lastDate: null
};

let putawayBoxes = [];
let putawayFilter = {
    fromDate: null,
    toDate: null,
    po: '',
    status: 'pending'
};

// ==================== KHỞI TẠO MODULE ====================
window.initPutawayModule = function() {
    console.log('🚀 Khởi tạo Putaway HV module...');
    
    // Set ngày mặc định
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    document.getElementById('putaway-from-date').value = formatDate(lastWeek);
    document.getElementById('putaway-to-date').value = formatDate(today);
    
    // Load dữ liệu
    loadPutawayStats();
    loadPutawayBoxes();
};

// Helper: format date YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// ==================== THỐNG KÊ ====================
async function loadPutawayStats() {
    try {
        showLoading('stats');
        
        // Đếm pending
        const { count: pending, error: err1 } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'pending');
        
        if (err1) throw err1;
        
        // Đếm completed hôm nay
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount, error: err2 } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .gte('putaway_date', today + 'T00:00:00')
            .lte('putaway_date', today + 'T23:59:59');
        
        if (err2) throw err2;
        
        // Tổng completed
        const { count: total, error: err3 } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed');
        
        if (err3) throw err3;
        
        // Lần cuối
        const { data: last, error: err4 } = await supabaseClient
            .from('boxes')
            .select('putaway_date')
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .order('putaway_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (err4) throw err4;
        
        // Cập nhật biến
        putawayStats = {
            pending: pending || 0,
            today: todayCount || 0,
            total: total || 0,
            lastDate: last?.putaway_date || null
        };
        
        // Cập nhật UI
        updateStatsUI();
        
    } catch (error) {
        console.error('❌ Lỗi load stats:', error);
        window.notify('Không thể tải thống kê!', true);
    } finally {
        hideLoading('stats');
    }
}

function updateStatsUI() {
    // Animation đếm số
    animateNumber('putaway-pending', putawayStats.pending);
    animateNumber('putaway-today', putawayStats.today);
    animateNumber('putaway-total', putawayStats.total);
    
    const lastElement = document.getElementById('putaway-last');
    if (lastElement) {
        lastElement.innerText = putawayStats.lastDate 
            ? new Date(putawayStats.lastDate).toLocaleString('vi-VN')
            : 'Chưa có';
    }
}

function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const current = parseInt(element.innerText) || 0;
    if (current === target) return;
    
    // Animation đơn giản
    element.classList.add('putaway-stat-number');
    element.innerText = target;
    
    setTimeout(() => {
        element.classList.remove('putaway-stat-number');
    }, 500);
}

// ==================== DANH SÁCH BOX ====================
async function loadPutawayBoxes() {
    try {
        showLoading('boxes');
        
        // Lấy giá trị filter
        putawayFilter.fromDate = document.getElementById('putaway-from-date').value;
        putawayFilter.toDate = document.getElementById('putaway-to-date').value;
        putawayFilter.po = document.getElementById('putaway-po').value;
        putawayFilter.status = document.getElementById('putaway-status').value;
        
        // Xây dựng query
        let query = supabaseClient
            .from('boxes')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        // Áp dụng filter
        if (putawayFilter.fromDate) {
            query = query.gte('created_at', putawayFilter.fromDate + 'T00:00:00');
        }
        if (putawayFilter.toDate) {
            query = query.lte('created_at', putawayFilter.toDate + 'T23:59:59');
        }
        if (putawayFilter.po) {
            query = query.ilike('po', `%${putawayFilter.po}%`);
        }
        if (putawayFilter.status !== 'all') {
            query = query.eq('putaway_status', putawayFilter.status);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        putawayBoxes = data || [];
        renderPutawayBoxes();
        
    } catch (error) {
        console.error('❌ Lỗi load boxes:', error);
        window.notify('Không thể tải danh sách box!', true);
    } finally {
        hideLoading('boxes');
    }
}

function renderPutawayBoxes() {
    const tbody = document.getElementById('putaway-box-tbody');
    if (!tbody) return;
    
    if (!putawayBoxes || putawayBoxes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12">
                    <div class="putaway-empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p>Không có dữ liệu phù hợp</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = putawayBoxes.map(box => {
        const statusClass = box.putaway_status === 'completed' 
            ? 'putaway-badge-completed' 
            : 'putaway-badge-pending';
        
        const statusText = box.putaway_status === 'completed' 
            ? 'Đã xử lý' 
            : 'Chờ xử lý';
        
        // Kiểm tra quyền xử lý
        const canProcess = box.putaway_status === 'pending' && 
                          (currentUserRole === 'putaway' || 
                           currentUserRole === 'admin' || 
                           currentUserRole === 'manager');
        
        // Kiểm tra quyền xem
        const canView = ['admin', 'manager', 'putaway', 'scanner'].includes(currentUserRole);
        
        return `
            <tr>
                <td class="font-bold text-blue-600">${escapeHtml(box.box_code)}</td>
                <td>${escapeHtml(box.po)}</td>
                <td>${escapeHtml(box.sku)}</td>
                <td class="text-center">${box.total || 0}</td>
                <td>${formatDateTime(box.created_at)}</td>
                <td>${escapeHtml(box.created_by || 'N/A')}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td class="text-center">
                    ${canProcess 
                        ? `<button onclick="processPutawayBox('${box.id}')" class="putaway-btn-process">XỬ LÝ</button>`
                        : canView
                            ? `<button onclick="viewPutawayBoxDetail('${box.box_code}')" class="putaway-btn-view">XEM SN</button>`
                            : ''
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// Helper: format datetime
function formatDateTime(datetime) {
    if (!datetime) return 'N/A';
    try {
        return new Date(datetime).toLocaleString('vi-VN');
    } catch {
        return datetime;
    }
}

// Helper: escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== XỬ LÝ BOX ====================
window.processPutawayBox = async function(boxId) {
    if (!confirm('Xác nhận đã xử lý box này?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('boxes')
            .update({
                putaway_status: 'completed',
                putaway_date: new Date().toISOString(),
                putaway_by: currentUser
            })
            .eq('id', boxId);
        
        if (error) throw error;
        
        // Ghi log
        await logActivity('PUTAWAY_PROCESS', { 
            box_id: boxId,
            action: 'completed'
        });
        
        window.notify('✅ Đã xác nhận xử lý box!');
        
        // Reload dữ liệu
        await Promise.all([
            loadPutawayStats(),
            loadPutawayBoxes()
        ]);
        
    } catch (error) {
        console.error('❌ Lỗi process:', error);
        window.notify('❌ Lỗi xử lý: ' + error.message, true);
    }
};

// ==================== XEM CHI TIẾT ====================
window.viewPutawayBoxDetail = async function(boxCode) {
    try {
        const { data: details, error } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', boxCode)
            .eq('is_active', true);
        
        if (error) throw error;
        
        if (details && details.length > 0) {
            const snList = details.map(d => d.serial).join('\n');
            alert(`📦 Box: ${boxCode}\n📋 Danh sách SN (${details.length} cái):\n\n${snList}`);
        } else {
            alert(`📦 Box: ${boxCode}\n📋 Không có SN nào!`);
        }
    } catch (error) {
        console.error('❌ Lỗi xem detail:', error);
        window.notify('❌ Lỗi tải chi tiết!', true);
    }
};

// ==================== FILTER ====================
window.filterPutawayBoxes = function() {
    loadPutawayBoxes();
};

window.resetPutawayFilter = function() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    document.getElementById('putaway-from-date').value = formatDate(lastWeek);
    document.getElementById('putaway-to-date').value = formatDate(today);
    document.getElementById('putaway-po').value = '';
    document.getElementById('putaway-status').value = 'pending';
    
    loadPutawayBoxes();
};

// ==================== EXPORT EXCEL ====================
window.exportPutawayList = function() {
    if (!putawayBoxes || putawayBoxes.length === 0) {
        window.notify('❌ Không có dữ liệu để xuất!', true);
        return;
    }
    
    try {
        // Chuẩn bị dữ liệu
        const rows = [['Mã Box', 'Mã PO', 'SKU', 'Số lượng', 'Ngày tạo', 'Người tạo', 'Trạng thái', 'Ngày xử lý', 'Người xử lý']];
        
        putawayBoxes.forEach(box => {
            rows.push([
                box.box_code,
                box.po,
                box.sku,
                box.total || 0,
                formatDateTime(box.created_at),
                box.created_by || 'N/A',
                box.putaway_status === 'completed' ? 'Đã xử lý' : 'Chờ xử lý',
                box.putaway_date ? formatDateTime(box.putaway_date) : '-',
                box.putaway_by || '-'
            ]);
        });
        
        // Tạo file Excel
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Putaway');
        
        const fileName = `Putaway_${formatDate(new Date())}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        window.notify(`✅ Đã xuất file ${fileName}`);
        
    } catch (error) {
        console.error('❌ Lỗi export:', error);
        window.notify('❌ Lỗi xuất Excel!', true);
    }
};

// ==================== LOADING INDICATOR ====================
function showLoading(section) {
    // Thêm loading indicator nếu cần
    console.log(`Loading ${section}...`);
}

function hideLoading(section) {
    console.log(`Loaded ${section}`);
}

// ==================== AUTO REFRESH (tùy chọn) ====================
let autoRefreshInterval = null;

window.startAutoRefresh = function(interval = 60000) { // Mặc định 1 phút
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (document.getElementById('page-putaway')?.classList.contains('hidden') === false) {
            console.log('🔄 Auto refresh Putaway data...');
            loadPutawayStats();
            loadPutawayBoxes();
        }
    }, interval);
};

window.stopAutoRefresh = function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
};

// Cleanup khi chuyển trang
window.cleanupPutaway = function() {
    stopAutoRefresh();
};