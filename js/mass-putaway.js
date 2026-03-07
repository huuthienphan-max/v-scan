// js/mass-putaway.js - Module Mass Putaway
// Chức năng: Xử lý nhập liệu hàng loạt, kết nối Python

let massSNList = [];
let autoRefreshInterval = null;

// ==================== KHỞI TẠO MODULE ====================
window.initMassPutawayModule = function() {
    console.log('🚀 Khởi tạo Mass Putaway module...');
    
    // Set WH mặc định
    const whInput = document.getElementById('mass-wh');
    if (whInput) whInput.value = 'VNS';
    
    // Kiểm tra cache từ Box HV - GỌI NGAY LẬP TỨC
    checkMassPutCache();
    
    // Load danh sách SN
    loadMassSNList();
    
    // Log thông tin API cho Python
    console.log('📡 API Endpoint cho Python: POST /api/mass-putaway');
    
    // Start auto refresh
    startAutoRefresh();
};

// ==================== AUTO REFRESH ====================
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.getElementById('page-mass-putaway')?.classList.contains('hidden')) {
            loadMassSNList();
        }
    }, 30000);
}

window.cleanupMassPutaway = function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
};

// ==================== KIỂM TRA CACHE TỪ BOX HV ====================
function checkMassPutCache() {
    console.log('🔍 Kiểm tra cache Mass Put...');
    
    const saved = sessionStorage.getItem('massPutCache');
    console.log('📦 Dữ liệu cache:', saved);
    
    if (saved) {
        try {
            const cache = JSON.parse(saved);
            console.log('📦 Cache parsed:', cache);
            
            if (cache && cache.box) {
                console.log('✅ Có box trong cache:', cache.box);
                
                // Tìm ô input
                const boxInput = document.getElementById('mass-box');
                console.log('🔍 Ô input mass-box:', boxInput);
                
                if (boxInput) {
                    // ĐIỀN GIÁ TRỊ
                    boxInput.value = cache.box;
                    console.log('✅ Đã điền box:', cache.box);
                    
                    // Highlight để thấy rõ
                    boxInput.style.border = '2px solid #4f46e5';
                    boxInput.style.backgroundColor = '#eef2ff';
                    
                    // Hiển thị thông báo
                    const snCount = cache.snList?.length || 0;
                    showMassResult(`📦 Đã nạp box ${cache.box} (${snCount} SN) từ bộ nhớ đệm`, 'info');
                    
                    // Focus vào location
                    setTimeout(() => {
                        const locationInput = document.getElementById('mass-location');
                        if (locationInput) {
                            locationInput.focus();
                            locationInput.style.border = '2px solid #4f46e5';
                        }
                    }, 500);
                    
                    // KHÔNG XÓA CACHE Ở ĐÂY
                    // Để nếu user refresh trang vẫn còn
                    
                } else {
                    console.error('❌ KHÔNG TÌM THẤY ô input mass-box!');
                    console.log('📋 Các element có sẵn:', document.getElementById('mass-account') ? 'OK' : 'Missing');
                }
            } else {
                console.log('📭 Cache không có box');
            }
        } catch (e) {
            console.error('❌ Lỗi parse cache:', e);
        }
    } else {
        console.log('📭 Không có cache');
    }
}

// ==================== XỬ LÝ MASS PUTAWAY ====================
window.processMassPutaway = async function() {
    // Lấy dữ liệu từ form
    const account = document.getElementById('mass-account')?.value.trim() || '';
    const password = document.getElementById('mass-password')?.value.trim() || '';
    const wh = document.getElementById('mass-wh')?.value || 'VNS';
    const box = document.getElementById('mass-box')?.value.trim().toUpperCase() || '';
    const location = document.getElementById('mass-location')?.value.trim() || '';
    
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
        
        // Bước 4: Cập nhật trạng thái box thành completed (đã xử lý)
        await supabaseClient
            .from('boxes')
            .update({
                putaway_status: 'completed',
                putaway_date: new Date().toISOString(),
                putaway_by: account
            })
            .eq('id', boxData.id);
        
        // Bước 5: Lưu từng SN vào lịch sử
        const snList = details.map(d => d.serial);
        
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
        
        // Bước 6: Xóa cache nếu có
        if (typeof window.clearMassPutCache === 'function') {
            window.clearMassPutCache();
        }
        
        // Hiển thị kết quả
        showMassResult(`✅ Xử lý thành công! Box ${box} (${snList.length} SN) đã được chuyển đến ${location}`, 'success');
        
        // Clear ô nhập (giữ lại account/password)
        document.getElementById('mass-box').value = '';
        document.getElementById('mass-location').value = '';
        
        // Load lại danh sách SN
        await loadMassSNList();
        
    } catch (error) {
        console.error('❌ Lỗi Mass Putaway:', error);
        showMassResult('❌ Lỗi hệ thống: ' + error.message, 'error');
    }
};

// ==================== HIỂN THỊ KẾT QUẢ ====================
function showMassResult(message, type) {
    const resultDiv = document.getElementById('mass-result');
    if (!resultDiv) return;
    
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
    
    if (!massSNList || massSNList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">Chưa có SN nào được xử lý</td></tr>';
        return;
    }
    
    tbody.innerHTML = massSNList.map(item => {
        const details = item.details || {};
        const time = item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '';
        
        return `
            <tr class="hover:bg-gray-50">
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

// ==================== API CHO PYTHON ====================
// Hàm này sẽ được gọi từ Python sau này
window.massPutawayAPI = async function(data) {
    // data = { account, password, wh, box, location }
    console.log('📡 API called with:', data);
    
    try {
        // Kiểm tra dữ liệu đầu vào
        if (!data.account || !data.password || !data.box || !data.location) {
            return {
                success: false,
                error: 'Missing required fields: account, password, box, location'
            };
        }
        
        // Xác thực user
        const { data: user, error: authError } = await supabaseClient
            .from('users')
            .select('*, roles(*)')
            .eq('username', data.account)
            .eq('password', data.password)
            .eq('is_active', true)
            .maybeSingle();
        
        if (authError || !user) {
            return { success: false, error: 'Invalid credentials' };
        }
        
        // Kiểm tra quyền
        const userRole = user.roles?.name || 'viewer';
        if (!['admin', 'manager', 'mass-putaway'].includes(userRole)) {
            return { success: false, error: 'Insufficient permissions' };
        }
        
        // Tìm box
        const { data: boxData, error: boxError } = await supabaseClient
            .from('boxes')
            .select('*')
            .eq('box_code', data.box)
            .eq('is_active', true)
            .maybeSingle();
        
        if (boxError || !boxData) {
            return { success: false, error: `Box ${data.box} not found` };
        }
        
        // Lấy SN từ box
        const { data: details, error: detailError } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', data.box)
            .eq('is_active', true);
        
        if (detailError) throw detailError;
        
        if (!details || details.length === 0) {
            return { success: false, error: 'Box has no SN' };
        }
        
        // Cập nhật trạng thái box
        await supabaseClient
            .from('boxes')
            .update({
                putaway_status: 'completed',
                putaway_date: new Date().toISOString(),
                putaway_by: data.account
            })
            .eq('id', boxData.id);
        
        // Lưu từng SN vào log
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
        console.error('❌ API Error:', error);
        return { 
            success: false, 
            error: error.message || 'Internal server error'
        };
    }
};

// ==================== XỬ LÝ PHÍM TẮT ====================
document.addEventListener('keydown', (e) => {
    // Chỉ xử lý khi đang ở trang Mass Putaway
    if (document.getElementById('page-mass-putaway')?.classList.contains('hidden')) return;
    
    // Ctrl + Enter để xử lý
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        window.processMassPutaway();
    }
    
    // Ctrl + L để focus vào location
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById('mass-location')?.focus();
    }
    
    // Ctrl + B để focus vào box
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        document.getElementById('mass-box')?.focus();
    }
});

// ==================== CLEANUP ====================
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});


