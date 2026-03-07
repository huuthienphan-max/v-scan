// js/mass-putaway.js - Module Mass Putaway

let massSNList = [];

// ==================== KHỞI TẠO MODULE ====================
window.initMassPutawayModule = function() {
    console.log('🚀 Khởi tạo Mass Putaway module...');
    
    // Set WH mặc định
    document.getElementById('mass-wh').value = 'VNS';
    
    // Load danh sách SN
    loadMassSNList();
    
    // Log thông tin API cho Python
    console.log('📡 API Endpoint cho Python: POST /api/mass-putaway');
};

// ==================== XỬ LÝ MASS PUTAWAY ====================
window.processMassPutaway = async function() {
    // Lấy dữ liệu từ form
    const account = document.getElementById('mass-account').value.trim();
    const password = document.getElementById('mass-password').value.trim();
    const wh = document.getElementById('mass-wh').value; // VNS mặc định
    const box = document.getElementById('mass-box').value.trim().toUpperCase();
    const location = document.getElementById('mass-location').value.trim();
    
    // Kiểm tra đầu vào
    if (!account || !password) {
        showMassResult('❌ Vui lòng nhập tài khoản và mật khẩu!', 'error');
        return;
    }
    
    if (!box) {
        showMassResult('❌ Vui lòng nhập mã Box!', 'error');
        return;
    }
    
    if (!location) {
        showMassResult('❌ Vui lòng nhập Location Put!', 'error');
        return;
    }
    
    showMassResult('🔄 Đang xác thực và xử lý...', 'info');
    
    try {
        // Bước 1: Xác thực tài khoản
        const { data: user, error: authError } = await supabaseClient
            .from('users')
            .select('*, roles(*)')
            .eq('username', account)
            .eq('password', password)
            .eq('is_active', true)
            .maybeSingle();
        
        if (authError || !user) {
            showMassResult('❌ Tài khoản hoặc mật khẩu không đúng!', 'error');
            return;
        }
        
        const userRole = user.roles?.name || 'viewer';
        if (!['admin', 'manager', 'mass-putaway'].includes(userRole)) {
            showMassResult('❌ Tài khoản không có quyền thực hiện Mass Putaway!', 'error');
            return;
        }
        
        // Bước 2: Tìm box
        const { data: boxData, error: boxError } = await supabaseClient
            .from('boxes')
            .select('*')
            .eq('box_code', box)
            .eq('is_active', true)
            .maybeSingle();
        
        if (boxError || !boxData) {
            showMassResult(`❌ Không tìm thấy box "${box}" trong hệ thống!`, 'error');
            return;
        }
        
        // Bước 3: Lấy chi tiết SN
        const { data: details, error: detailError } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', box)
            .eq('is_active', true);
        
        if (detailError) throw detailError;
        
        if (!details || details.length === 0) {
            showMassResult(`❌ Box "${box}" không có SN nào!`, 'error');
            return;
        }
        
        // Bước 4: Lưu vào lịch sử MASS PUTAWAY (thêm bảng mới nếu cần)
        // Tạm thời lưu vào activity_log
        const snList = details.map(d => d.serial);
        
        // Lưu từng SN vào lịch sử
        for (const sn of snList) {
            await supabaseClient
                .from('activity_log')
                .insert([{
                    user_id: user.id,
                    username: account,
                    action: 'MASS_PUTAWAY_SN',
                    details: {
                        box: box,
                        sn: sn,
                        wh: wh,
                        location: location,
                        timestamp: new Date().toISOString()
                    },
                    is_active: true
                }]);
        }
        
        // Hiển thị kết quả
        showMassResult(`✅ Xử lý thành công! Box ${box} (${snList.length} SN)`, 'success');
        
        // Clear ô nhập
        document.getElementById('mass-box').value = '';
        document.getElementById('mass-location').value = '';
        
        // Load lại danh sách SN
        loadMassSNList();
        
    } catch (error) {
        console.error('❌ Lỗi Mass Putaway:', error);
        showMassResult('❌ Lỗi hệ thống: ' + error.message, 'error');
    }
};

// ==================== HIỂN THỊ KẾT QUẢ ====================
function showMassResult(message, type) {
    const resultDiv = document.getElementById('mass-result');
    resultDiv.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'bg-blue-100', 'text-green-700', 'text-red-700', 'text-blue-700');
    
    if (type === 'success') {
        resultDiv.classList.add('bg-green-100', 'text-green-700', 'p-4', 'rounded');
    } else if (type === 'error') {
        resultDiv.classList.add('bg-red-100', 'text-red-700', 'p-4', 'rounded');
    } else {
        resultDiv.classList.add('bg-blue-100', 'text-blue-700', 'p-4', 'rounded');
    }
    
    resultDiv.innerHTML = message;
    
    if (type === 'success') {
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 5000);
    }
}

// ==================== LOAD DANH SÁCH SN ====================
async function loadMassSNList() {
    try {
        // Lấy 50 bản ghi MASS_PUTAWAY_SN gần nhất
        const { data, error } = await supabaseClient
            .from('activity_log')
            .select('*')
            .eq('action', 'MASS_PUTAWAY_SN')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        massSNList = data || [];
        renderMassSNList();
        
    } catch (error) {
        console.error('❌ Lỗi load SN list:', error);
        const tbody = document.getElementById('mass-sn-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Lỗi tải dữ liệu</td></tr>';
        }
    }
}

// ==================== RENDER DANH SÁCH SN ====================
function renderMassSNList() {
    const tbody = document.getElementById('mass-sn-tbody');
    if (!tbody) return;
    
    if (!massSNList.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">Chưa có SN nào được xử lý</td></tr>';
        return;
    }
    
    tbody.innerHTML = massSNList.map(item => {
        const details = item.details || {};
        const time = item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '';
        
        return `
            <tr>
                <td class="text-xs">${time}</td>
                <td class="font-bold text-indigo-600">${details.box || ''}</td>
                <td class="font-mono">${details.sn || ''}</td>
                <td>${details.location || ''}</td>
                <td>${details.wh || 'VNS'}</td>
                <td>${item.username || ''}</td>
            </tr>
        `;
    }).join('');
}

// ==================== REFRESH DANH SÁCH SN ====================
window.refreshMassSNList = function() {
    loadMassSNList();
};

// ==================== API SIMULATION CHO PYTHON ====================
window.massPutawayAPI = async function(data) {
    // data = { account, password, wh, box, location }
    console.log('📡 API called with:', data);
    
    try {
        // Xác thực
        const { data: user } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', data.account)
            .eq('password', data.password)
            .eq('is_active', true)
            .maybeSingle();
        
        if (!user) {
            return { success: false, error: 'Invalid credentials' };
        }
        
        // Lấy SN từ box
        const { data: details } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', data.box)
            .eq('is_active', true);
        
        if (!details || details.length === 0) {
            return { success: false, error: 'Box has no SN' };
        }
        
        // Lưu log
        for (const sn of details) {
            await supabaseClient
                .from('activity_log')
                .insert([{
                    user_id: user.id,
                    username: data.account,
                    action: 'MASS_PUTAWAY_SN',
                    details: {
                        box: data.box,
                        sn: sn.serial,
                        wh: data.wh || 'VNS',
                        location: data.location
                    },
                    is_active: true
                }]);
        }
        
        return {
            success: true,
            message: `Processed ${details.length} SN from box ${data.box}`,
            data: {
                box: data.box,
                location: data.location,
                wh: data.wh || 'VNS',
                sn_count: details.length,
                timestamp: new Date().toISOString()
            }
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
};
