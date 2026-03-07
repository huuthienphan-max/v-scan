// js/putaway.js - Module Putaway HV

let autoRefreshInterval = null;
let putawayBoxes = [];

// ==================== KHỞI TẠO MODULE ====================
window.initPutawayModule = function() {
    console.log('🚀 Khởi tạo Putaway module...');
    
    // Set ngày mặc định
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
        // Đếm pending
        const { count: pending } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'pending');

        // Đếm completed hôm nay
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .gte('putaway_date', today + 'T00:00:00')
            .lte('putaway_date', today + 'T23:59:59');

        // Tổng completed
        const { count: total } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed');

        // Lần cuối
        const { data: last } = await supabaseClient
            .from('boxes')
            .select('putaway_date')
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .order('putaway_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Cập nhật UI
        document.getElementById('putaway-pending').innerText = pending || 0;
        document.getElementById('putaway-today').innerText = todayCount || 0;
        document.getElementById('putaway-total').innerText = total || 0;
        document.getElementById('putaway-last').innerText = last?.putaway_date 
            ? new Date(last.putaway_date).toLocaleString('vi-VN') 
            : 'Chưa có';

    } catch (error) {
        console.error('❌ Lỗi load stats:', error);
    }
}

// ==================== LẤY DANH SÁCH BOX ====================
async function loadPutawayBoxes() {
    try {
        const fromDate = document.getElementById('putaway-from-date')?.value;
        const toDate = document.getElementById('putaway-to-date')?.value;
        const po = document.getElementById('putaway-po')?.value;
        const status = document.getElementById('putaway-status')?.value || 'pending';

        console.log('🔍 Đang lọc với:', { fromDate, toDate, po, status });

        let query = supabaseClient
            .from('boxes')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (fromDate) query = query.gte('created_at', fromDate + 'T00:00:00');
        if (toDate) query = query.lte('created_at', toDate + 'T23:59:59');
        if (po) query = query.ilike('po', `%${po}%`);
        if (status !== 'all') query = query.eq('putaway_status', status);

        const { data, error } = await query;
        
        if (error) throw error;

        console.log('📦 Dữ liệu nhận được:', data);
        
        putawayBoxes = data || [];
        renderPutawayBoxes();

    } catch (error) {
        console.error('❌ Lỗi load boxes:', error);
    }
}

// ==================== RENDER DANH SÁCH BOX ====================
function renderPutawayBoxes() {
    const tbody = document.getElementById('putaway-box-tbody');
    if (!tbody) return;

    console.log('🎨 Đang render với dữ liệu:', putawayBoxes);

    if (!putawayBoxes || putawayBoxes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = putawayBoxes.map(box => {
        const isPending = box.putaway_status === 'pending';
        const statusClass = isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
        const statusText = isPending ? 'Chờ xử lý' : 'Đã xử lý';
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
                             class="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-600">
                             XỬ LÝ
                           </button>`
                        : `<button onclick="viewPutawayBoxDetail('${box.box_code}')" 
                             class="text-blue-500 hover:text-blue-700 text-xs">
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
        console.log('🔄 Đang xử lý box ID:', id);
        
        const { data, error } = await supabaseClient
            .from('boxes')
            .update({
                putaway_status: 'completed',
                putaway_date: new Date().toISOString(),
                putaway_by: currentUser
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        console.log('✅ Đã cập nhật:', data);
        window.notify('✅ Đã xác nhận xử lý box!');
        
        await Promise.all([
            loadPutawayStats(),
            loadPutawayBoxes()
        ]);

    } catch (error) {
        console.error('❌ Lỗi xử lý:', error);
        window.notify('❌ Lỗi: ' + error.message, true);
    }
};

// ==================== XEM CHI TIẾT SN ====================
window.viewPutawayBoxDetail = async function(boxCode) {
    if (!boxCode) return;

    try {
        const { data: details } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', boxCode)
            .eq('is_active', true);

        if (details?.length) {
            alert(`📦 Box: ${boxCode}\n📋 Danh sách SN (${details.length} cái):\n\n${details.map(d => d.serial).join('\n')}`);
        } else {
            alert(`📦 Box: ${boxCode}\n📋 Không có SN nào!`);
        }
    } catch (error) {
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

    document.getElementById('putaway-from-date').value = lastWeek.toISOString().split('T')[0];
    document.getElementById('putaway-to-date').value = today.toISOString().split('T')[0];
    document.getElementById('putaway-po').value = '';
    document.getElementById('putaway-status').value = 'pending';

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
            'SL': box.total,
            'Ngày tạo': box.created_at ? new Date(box.created_at).toLocaleString('vi-VN') : '',
            'Người tạo': box.created_by || '',
            'Trạng thái': box.putaway_status === 'completed' ? 'Đã xử lý' : 'Chờ xử lý',
            'Ngày xử lý': box.putaway_date ? new Date(box.putaway_date).toLocaleString('vi-VN') : '',
            'Người xử lý': box.putaway_by || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Putaway');
        XLSX.writeFile(wb, `Putaway_${new Date().toISOString().split('T')[0]}.xlsx`);

        window.notify('✅ Đã xuất file Excel!');
    } catch (error) {
        window.notify('❌ Lỗi xuất Excel!', true);
    }
};
