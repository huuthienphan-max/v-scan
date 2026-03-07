// js/box-hv.js - Module Box HV (cập nhật thêm bộ nhớ đệm Mass Put)

let boxHVInterval = null;
let boxHVData = [];
let massPutCache = null; // Bộ nhớ đệm cho Mass Put

// ==================== KHỞI TẠO MODULE ====================
window.initBoxHVModule = function() {
    console.log('🚀 Khởi tạo Box HV module...');
    
    // Set ngày mặc định
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const fromDate = document.getElementById('boxhv-from-date');
    const toDate = document.getElementById('boxhv-to-date');
    
    if (fromDate) fromDate.value = lastWeek.toISOString().split('T')[0];
    if (toDate) toDate.value = today.toISOString().split('T')[0];
    
    // Load dữ liệu
    loadBoxHVStats();
    loadBoxHVData();
    
    // Kiểm tra cache từ sessionStorage
    const savedCache = sessionStorage.getItem('massPutCache');
    if (savedCache) {
        massPutCache = JSON.parse(savedCache);
        console.log('📦 Có box đang chờ Mass Put:', massPutCache);
    }
};

// ==================== AUTO REFRESH ====================
window.startAutoRefresh = function(interval = 30000) {
    if (boxHVInterval) clearInterval(boxHVInterval);
    boxHVInterval = setInterval(() => {
        if (!document.getElementById('page-box-hv')?.classList.contains('hidden')) {
            loadBoxHVStats();
            loadBoxHVData();
        }
    }, interval);
};

window.cleanupBoxHV = function() {
    if (boxHVInterval) {
        clearInterval(boxHVInterval);
        boxHVInterval = null;
    }
};

// ==================== THỐNG KÊ ====================
async function loadBoxHVStats() {
    try {
        // Tổng số box
        const { count: total } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Đếm pending
        const { count: pending } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'pending');

        // Đếm completed
        const { count: completed } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed');

        // Đếm hôm nay
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .gte('created_at', today + 'T00:00:00');

        // Cập nhật UI
        document.getElementById('boxhv-total').innerText = total || 0;
        document.getElementById('boxhv-pending').innerText = pending || 0;
        document.getElementById('boxhv-completed').innerText = completed || 0;
        document.getElementById('boxhv-today').innerText = todayCount || 0;

    } catch (error) {
        console.error('❌ Lỗi load stats:', error);
    }
}

// ==================== LẤY DỮ LIỆU ====================
async function loadBoxHVData() {
    try {
        const fromDate = document.getElementById('boxhv-from-date')?.value;
        const toDate = document.getElementById('boxhv-to-date')?.value;
        const po = document.getElementById('boxhv-po')?.value;
        const status = document.getElementById('boxhv-status')?.value || 'all';

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

        boxHVData = data || [];
        renderBoxHVData();

    } catch (error) {
        console.error('❌ Lỗi load data:', error);
        const tbody = document.getElementById('boxhv-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">Lỗi tải dữ liệu</td></tr>';
        }
    }
}

// ==================== RENDER ====================
function renderBoxHVData() {
    const tbody = document.getElementById('boxhv-tbody');
    if (!tbody) return;

    if (!boxHVData || boxHVData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = boxHVData.map(box => {
        const isPending = box.putaway_status === 'pending';
        const statusClass = isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
        const statusText = isPending ? 'Chờ xử lý' : 'Đã xử lý';
        
        // Kiểm tra box này có đang trong cache không
        const isCached = massPutCache && massPutCache.box === box.box_code;
        const rowClass = isCached ? 'bg-indigo-50' : '';

        return `
            <tr class="${rowClass}">
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
                <td class="text-center space-x-2">
                    <button onclick="viewBoxHVDetail('${box.box_code}')" 
                        class="text-blue-500 hover:text-blue-700 text-xs font-medium border border-blue-200 px-2 py-1 rounded">
                        XEM SN
                    </button>
                    <button onclick="prepareMassPut('${box.box_code}', '${box.po}', '${box.sku}')" 
                        class="bg-indigo-500 text-white text-xs font-medium px-2 py-1 rounded hover:bg-indigo-600 transition">
                        ⚡ MASS PUT
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== XEM CHI TIẾT SN ====================
window.viewBoxHVDetail = async function(boxCode) {
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

// ==================== CHUẨN BỊ MASS PUT ====================
window.prepareMassPut = async function(boxCode, po, sku) {
    if (!boxCode) return;
    
    try {
        console.log('🔵 prepareMassPut được gọi với box:', boxCode);
        
        // Lấy thông tin chi tiết box
        const { data: box, error: boxError } = await supabaseClient
            .from('boxes')
            .select('*')
            .eq('box_code', boxCode)
            .eq('is_active', true)
            .single();
        
        if (boxError || !box) {
            console.error('❌ Không tìm thấy box:', boxError);
            window.notify('❌ Không tìm thấy box!', true);
            return;
        }
        
        // Lấy danh sách SN
        const { data: details, error: detailError } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', boxCode)
            .eq('is_active', true);
        
        if (detailError) {
            console.error('❌ Lỗi lấy SN:', detailError);
        }
        
        // Tạo cache object
        const massPutCache = {
            box: boxCode,
            po: po,
            sku: sku,
            total: box.total || 0,
            snList: details?.map(d => d.serial) || [],
            timestamp: new Date().toISOString(),
            preparedBy: currentUser
        };
        
        // Lưu vào sessionStorage
        sessionStorage.setItem('massPutCache', JSON.stringify(massPutCache));
        
        console.log('📦 Đã lưu cache Mass Put:', massPutCache);
        
        // Hiển thị thông báo
        window.notify(`✅ Đã chọn box ${boxCode} (${massPutCache.snList.length} SN) cho Mass Put`);
        
        // Chuyển sang trang Mass Putaway
        if (typeof window.switchPage === 'function') {
            window.switchPage('mass-putaway');
        } else {
            console.error('❌ Không tìm thấy hàm switchPage');
        }
        
    } catch (error) {
        console.error('❌ Lỗi prepare Mass Put:', error);
        window.notify('❌ Lỗi khi chuẩn bị Mass Put!', true);
    }
};

// ==================== LẤY CACHE CHO MASS PUT ====================
window.getMassPutCache = function() {
    // Đọc từ sessionStorage nếu chưa có
    if (!massPutCache) {
        const saved = sessionStorage.getItem('massPutCache');
        if (saved) {
            massPutCache = JSON.parse(saved);
        }
    }
    return massPutCache;
};

// ==================== XÓA CACHE MASS PUT ====================
window.clearMassPutCache = function() {
    massPutCache = null;
    sessionStorage.removeItem('massPutCache');
    console.log('🗑️ Đã xóa cache Mass Put');
    
    // Reload lại danh sách để bỏ highlight
    renderBoxHVData();
};

// ==================== FILTER ====================
window.filterBoxHV = function() {
    loadBoxHVData();
};

window.resetBoxHVFilter = function() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    document.getElementById('boxhv-from-date').value = lastWeek.toISOString().split('T')[0];
    document.getElementById('boxhv-to-date').value = today.toISOString().split('T')[0];
    document.getElementById('boxhv-po').value = '';
    document.getElementById('boxhv-status').value = 'all';

    loadBoxHVData();
};

// ==================== EXPORT EXCEL ====================
window.exportBoxHVList = function() {
    if (!boxHVData.length) {
        window.notify('❌ Không có dữ liệu để xuất!', true);
        return;
    }

    try {
        const data = boxHVData.map(box => ({
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
        XLSX.utils.book_append_sheet(wb, ws, 'BoxHV');
        XLSX.writeFile(wb, `BoxHV_${new Date().toISOString().split('T')[0]}.xlsx`);

        window.notify('✅ Đã xuất file Excel!');
    } catch (error) {
        window.notify('❌ Lỗi xuất Excel!', true);
    }
};
// ==================== LẤY CACHE CHO MASS PUT ====================
window.getMassPutCache = function() {
    const saved = sessionStorage.getItem('massPutCache');
    if (saved) {
        return JSON.parse(saved);
    }
    return null;
};

// ==================== XÓA CACHE MASS PUT ====================
window.clearMassPutCache = function() {
    sessionStorage.removeItem('massPutCache');
    console.log('🗑️ Đã xóa cache Mass Put');
};

