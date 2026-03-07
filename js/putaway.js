// js/putaway.js - Module Putaway HV

let autoRefreshInterval = null;
let putawayBoxes = [];

// ==================== KHỞI TẠO MODULE ====================
window.initPutawayModule = function() {
    console.log('🚀 Khởi tạo Putaway module...');
    
    // Set ngày mặc định (7 ngày gần nhất)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const fromDate = document.getElementById('putaway-from-date');
    const toDate = document.getElementById('putaway-to-date');
    
    if (fromDate) fromDate.value = lastWeek.toISOString().split('T')[0];
    if (toDate) toDate.value = today.toISOString().split('T')[0];
    
    // Load dữ liệu
    loadPutawayStats();
    loadPutawayBoxes();
};

// ==================== AUTO REFRESH ====================
window.startAutoRefresh = function(interval = 30000) {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.getElementById('page-putaway')?.classList.contains('hidden')) {
            loadPutawayStats();
            loadPutawayBoxes();
        }
    }, interval);
};

window.cleanupPutaway = function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
};

// ==================== THỐNG KÊ ====================
async function loadPutawayStats() {
    try {
        // Đếm pending (chờ xử lý)
        const { count: pending } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'pending');

        // Đếm completed (đã xử lý) hôm nay
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .gte('putaway_date', today + 'T00:00:00')
            .lte('putaway_date', today + 'T23:59:59');

        // Tổng completed (đã xử lý)
        const { count: total } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed');

        // Lần xử lý cuối
        const { data: last } = await supabaseClient
            .from('boxes')
            .select('putaway_date')
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .order('putaway_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Cập nhật UI
        const pendingEl = document.getElementById('putaway-pending');
        const todayEl = document.getElementById('putaway-today');
        const totalEl = document.getElementById('putaway-total');
        const lastEl = document.getElementById('putaway-last');
        
        if (pendingEl) pendingEl.innerText = pending || 0;
        if (todayEl) todayEl.innerText = todayCount || 0;
        if (totalEl) totalEl.innerText = total || 0;
        if (lastEl) {
            lastEl.innerText = last?.putaway_date 
                ? new Date(last.putaway_date).toLocaleString('vi-VN') 
                : 'Chưa có';
        }

    } catch (error) {
        console.error('❌ Lỗi load putaway stats:', error);
    }
}

// ==================== LẤY DANH SÁCH BOX ====================
async function loadPutawayBoxes() {
    try {
        const fromDate = document.getElementById('putaway-from-date')?.value;
        const toDate = document.getElementById('putaway-to-date')?.value;
        const po = document.getElementById('putaway-po')?.value;
        const status = document.getElementById('putaway-status')?.value || 'pending';

        // Build query - CHỈ LẤY ACTIVE BOX
        let query = supabaseClient
            .from('boxes')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Thêm bộ lọc ngày
        if (fromDate) {
            query = query.gte('created_at', fromDate + 'T00:00:00');
        }
        if (toDate) {
            query = query.lte('created_at', toDate + 'T23:59:59');
        }
        
        // Lọc theo PO
        if (po) {
            query = query.ilike('po', `%${po}%`);
        }
        
        // Lọc theo trạng thái putaway
        if (status !== 'all') {
            query = query.eq('putaway_status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        putawayBoxes = data || [];
        renderPutawayBoxes();

    } catch (error) {
        console.error('❌ Lỗi load putaway boxes:', error);
        const tbody = document.getElementById('putaway-box-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">Lỗi tải dữ liệu</td></tr>';
        }
    }
}

// ==================== RENDER DANH SÁCH BOX ====================
function renderPutawayBoxes() {
    const tbody = document.getElementById('putaway-box-tbody');
    if (!tbody) return;

    if (!putawayBoxes.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = putawayBoxes.map(box => {
        // Xác định trạng thái và class
        const isPending = box.putaway_status === 'pending';
        const statusClass = isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
        const statusText = isPending ? 'Chờ xử lý' : 'Đã xử lý';
        
        // Kiểm tra quyền xử lý (chỉ putaway, admin, manager mới được xử lý)
        const canProcess = isPending && ['putaway', 'admin', 'manager'].includes(currentUserRole);

        return `
            <tr>
                <td class="font-bold text-blue-600">${box.box_code || ''}</td>
                <td>${box.po || ''}</td>
                <td>${box.sku || ''}</td>
                <td class="text-center">${box.total || 0}</td>
                <td>${box.created_at ? new Date(box.created_at).toLocaleString('vi-VN') : ''}</td>
                <td>${box.created_by || 'N/A'}</td>
                <td>
                    <span class="${statusClass} px-2 py-1 rounded text-xs font-medium">
                        ${statusText}
                    </span>
                </td>
                <td class="text-center">
                    ${canProcess 
                        ? `<button onclick="processPutawayBox('${box.id}')" 
                             class="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-600 transition">
                             XỬ LÝ
                           </button>`
                        : `<button onclick="viewPutawayBoxDetail('${box.box_code}')" 
                             class="text-blue-500 hover:text-blue-700 text-xs font-medium">
                             XEM SN
                           </button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== XỬ LÝ BOX ====================
window.processPutawayBox = async function(id) {
    if (!confirm('Xác nhận đã xử lý box này?')) return;

    try {
        // CHỈ UPDATE putaway_status, không ảnh hưởng đến box
        const { error } = await supabaseClient
            .from('boxes')
            .update({
                putaway_status: 'completed',
                putaway_date: new Date().toISOString(),
                putaway_by: currentUser
            })
            .eq('id', id);

        if (error) throw error;

        // Log hoạt động
        await logActivity('PUTAWAY_PROCESS', { 
            box_id: id,
            action: 'completed'
        });

        window.notify('✅ Đã xác nhận xử lý box!');
        
        // Reload dữ liệu
        await Promise.all([
            loadPutawayStats(),
            loadPutawayBoxes()
        ]);

    } catch (error) {
        console.error('❌ Lỗi xử lý box:', error);
        window.notify('❌ Lỗi xử lý: ' + error.message, true);
    }
};

// ==================== XEM CHI TIẾT SN ====================
window.viewPutawayBoxDetail = async function(boxCode) {
    if (!boxCode) return;

    try {
        const { data: details, error } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', boxCode)
            .eq('is_active', true);

        if (error) throw error;

        if (details?.length) {
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

    const fromDate = document.getElementById('putaway-from-date');
    const toDate = document.getElementById('putaway-to-date');
    const po = document.getElementById('putaway-po');
    const status = document.getElementById('putaway-status');
    
    if (fromDate) fromDate.value = lastWeek.toISOString().split('T')[0];
    if (toDate) toDate.value = today.toISOString().split('T')[0];
    if (po) po.value = '';
    if (status) status.value = 'pending';

    loadPutawayBoxes();
};

// ==================== EXPORT EXCEL ====================
window.exportPutawayList = function() {
    if (!putawayBoxes.length) {
        window.notify('❌ Không có dữ liệu để xuất!', true);
        return;
    }

    try {
        const data = putawayBoxes.map(box => ({
            'Mã Box': box.box_code,
            'Mã PO': box.po,
            'SKU': box.sku,
            'Số lượng': box.total,
            'Ngày tạo': box.created_at ? new Date(box.created_at).toLocaleString('vi-VN') : '',
            'Người tạo': box.created_by || '',
            'Trạng thái': box.putaway_status === 'completed' ? 'Đã xử lý' : 'Chờ xử lý',
            'Ngày xử lý': box.putaway_date ? new Date(box.putaway_date).toLocaleString('vi-VN') : '',
            'Người xử lý': box.putaway_by || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Putaway');
        
        const fileName = `Putaway_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        window.notify(`✅ Đã xuất file ${fileName}`);

    } catch (error) {
        console.error('❌ Lỗi export:', error);
        window.notify('❌ Lỗi xuất Excel!', true);
    }
};
