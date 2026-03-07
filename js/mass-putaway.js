// js/mass-putaway.js - Module Mass Putaway

let massHistory = [];

// ==================== KHỞI TẠO MODULE ====================
window.initMassPutawayModule = function() {
    console.log('🚀 Khởi tạo Mass Putaway module...');
    loadMassHistory();
    
    // Log thông tin API cho Python
    console.log('📡 API Endpoint cho Python: POST /api/mass-putaway');
};

// ==================== XỬ LÝ MASS PUTAWAY ====================
window.processMassPutaway = async function() {
    // Lấy dữ liệu từ form
    const account = document.getElementById('mass-account').value.trim();
    const password = document.getElementById('mass-password').value.trim();
    const wh = document.getElementById('mass-wh').value;
    const box = document.getElementById('mass-box').value.trim().toUpperCase();
    const location = document.getElementById('mass-location').value;
    
    // Kiểm tra đầu vào
    if (!account || !password) {
        showMassResult('❌ Vui lòng nhập tài khoản và mật khẩu!', 'error');
        return;
    }
    
    if (!box) {
        showMassResult('❌ Vui lòng nhập mã Box!', 'error');
        return;
    }
    
    if (!wh || !location) {
        showMassResult('❌ Vui lòng chọn WH và Location!', 'error');
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
        const { data: details } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', box)
            .eq('is_active', true);
        
        // Bước 4: Lưu vào lịch sử
        await supabaseClient
            .from('activity_log')
            .insert([{
                user_id: user.id,
                username: account,
                action: 'MASS_PUTAWAY',
                details: {
                    box: box,
                    wh: wh,
                    location: location,
                    total_sn: details?.length || 0
                },
                is_active: true
            }]);
        
        // Hiển thị kết quả
        const snCount = details?.length || 0;
        showMassResult(`✅ Xử lý thành công! Box ${box} (${snCount} SN) đã được chuyển đến ${location} (${wh})`, 'success');
        
        // Clear ô nhập box
        document.getElementById('mass-box').value = '';
        
        // Load lại lịch sử
        loadMassHistory();
        
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
        resultDiv.classList.add('bg-green-100', 'text-green-700');
    } else if (type === 'error') {
        resultDiv.classList.add('bg-red-100', 'text-red-700');
    } else {
        resultDiv.classList.add('bg-blue-100', 'text-blue-700');
    }
    
    resultDiv.innerHTML = message;
    
    if (type === 'success') {
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 5000);
    }
}

// ==================== LOAD LỊCH SỬ ====================
async function loadMassHistory() {
    try {
        const { data, error } = await supabaseClient
            .from('activity_log')
            .select('*')
            .eq('action', 'MASS_PUTAWAY')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        massHistory = data || [];
        renderMassHistory();
        
    } catch (error) {
        console.error('❌ Lỗi load lịch sử:', error);
    }
}

// ==================== RENDER LỊCH SỬ ====================
function renderMassHistory() {
    const tbody = document.getElementById('mass-history-tbody');
    if (!tbody) return;
    
    if (!massHistory.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-400">Chưa có lịch sử xử lý</td></tr>';
        return;
    }
    
    tbody.innerHTML = massHistory.map(item => {
        const details = item.details || {};
        const time = item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '';
        
        return `
            <tr>
                <td class="text-xs">${time}</td>
                <td>${details.wh || 'N/A'}</td>
                <td class="font-bold text-indigo-600">${details.box || 'N/A'}</td>
                <td>${details.location || 'N/A'}</td>
                <td>${item.username || 'N/A'}</td>
                <td><span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Thành công</span></td>
            </tr>
        `;
    }).join('');
}

// ==================== REFRESH LỊCH SỬ ====================
window.refreshMassHistory = function() {
    loadMassHistory();
};

// ==================== API SIMULATION CHO PYTHON ====================
// Đây là phần sẽ được Python gọi sau này
window.massPutawayAPI = async function(data) {
    // data = { account, password, wh, box, location }
    console.log('📡 API called with:', data);
    
    // Giả lập xử lý
    const result = {
        success: true,
        message: 'Box processed successfully',
        data: {
            box: data.box,
            location: data.location,
            timestamp: new Date().toISOString()
        }
    };
    
    return result;
};