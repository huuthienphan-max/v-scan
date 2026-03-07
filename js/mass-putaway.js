// js/mass-putaway.js - Module Mass Putaway

let massSNList = [];
let autoRefreshInterval = null;

// ==================== KHỞI TẠO MODULE ====================
window.initMassPutawayModule = function() {
    console.log('🚀 Khởi tạo Mass Putaway module...');
    
    // Set WH mặc định
    const whInput = document.getElementById('mass-wh');
    if (whInput) whInput.value = 'VNS';
    
    // Load danh sách SN
    loadMassSNList();
    
    // Log thông tin API cho Python
    console.log('📡 API Endpoint cho Python: POST /api/mass-putaway');
    
    // Start auto refresh
    startAutoRefresh();
    
    // THỬ NHIỀU CÁCH ĐỂ ĐIỀN BOX
    fillBoxFromCache();
};

// ==================== HÀM ĐIỀN BOX TỪ CACHE ====================
function fillBoxFromCache() {
    console.log('🔍 Đang tìm cache để điền box...');
    
    // Đọc từ sessionStorage
    const saved = sessionStorage.getItem('massPutCache');
    console.log('📦 Dữ liệu cache:', saved);
    
    if (!saved) {
        console.log('📭 Không có cache');
        return false;
    }
    
    try {
        const cache = JSON.parse(saved);
        console.log('📦 Cache đã parse:', cache);
        
        if (!cache.box) {
            console.log('📭 Cache không có box');
            return false;
        }
        
        // Tìm ô input
        const boxInput = document.getElementById('mass-box');
        console.log('🔍 Ô input mass-box:', boxInput);
        
        if (boxInput) {
            // ĐIỀN GIÁ TRỊ
            boxInput.value = cache.box;
            console.log('✅ ĐÃ ĐIỀN GIÁ TRỊ:', cache.box);
            
            // Highlight để thấy rõ
            boxInput.style.border = '2px solid #4f46e5';
            boxInput.style.backgroundColor = '#eef2ff';
            
            // Hiển thị thông báo
            const resultDiv = document.getElementById('mass-result');
            if (resultDiv) {
                resultDiv.classList.remove('hidden', 'bg-red-100', 'bg-blue-100');
                resultDiv.classList.add('bg-green-100', 'text-green-700', 'p-4', 'rounded');
                resultDiv.innerHTML = `📦 Đã nạp box ${cache.box} (${cache.snList?.length || 0} SN)`;
                
                setTimeout(() => {
                    resultDiv.classList.add('hidden');
                }, 5000);
            }
            
            // Focus vào location
            setTimeout(() => {
                const locationInput = document.getElementById('mass-location');
                if (locationInput) {
                    locationInput.focus();
                    locationInput.style.border = '2px solid #4f46e5';
                }
            }, 500);
            
            return true;
        } else {
            console.error('❌ KHÔNG TÌM THẤY ô input mass-box!');
            return false;
        }
    } catch (e) {
        console.error('❌ Lỗi parse cache:', e);
        return false;
    }
}

// Gọi hàm nhiều lần để đảm bảo
setTimeout(fillBoxFromCache, 100);
setTimeout(fillBoxFromCache, 300);
setTimeout(fillBoxFromCache, 500);
setTimeout(fillBoxFromCache, 1000);

// ==================== HÀM TEST CHO CONSOLE ====================
window.testCache = function() {
    console.log('🧪 Test cache:');
    const saved = sessionStorage.getItem('massPutCache');
    console.log('📦 Cache:', saved);
    
    const boxInput = document.getElementById('mass-box');
    console.log('🔍 Box input:', boxInput);
    
    if (boxInput) {
        console.log('📝 Giá trị hiện tại:', boxInput.value);
    }
    
    return { cache: saved, input: boxInput };
};

// ==================== XỬ LÝ MASS PUTAWAY ====================
window.processMassPutaway = async function() {
    // Lấy dữ liệu từ form
    const account = document.getElementById('mass-account')?.value.trim() || '';
    const password = document.getElementById('mass-password')?.value.trim() || '';
    const wh = document.getElementById('mass-wh')?.value || 'VNS';
    const box = document.getElementById('mass-box')?.value.trim().toUpperCase() || '';
    const location = document.getElementById('mass-location')?.value.trim() || '';
    
    console.log('📝 Dữ liệu form:', { account, password, wh, box, location });
    
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
        
        // Bước 4: Cập nhật trạng thái box
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
        
        // Bước 6: Xóa cache sau khi xử lý
        sessionStorage.removeItem('massPutCache');
        
        showMassResult(`✅ Xử lý thành công! Box ${box} (${snList.length} SN)`, 'success');
        
        // Clear ô nhập
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
window.massPutawayAPI = async function(data) {
    console.log('📡 API called with:', data);
    
    try {
        if (!data.account || !data.password || !data.box || !data.location) {
            return { success: false, error: 'Missing required fields' };
        }
        
        const { data: user } = await supabaseClient
            .from('users')
            .select('*, roles(*)')
            .eq('username', data.account)
            .eq('password', data.password)
            .eq('is_active', true)
            .maybeSingle();
        
        if (!user) return { success: false, error: 'Invalid credentials' };
        
        const userRole = user.roles?.name || 'viewer';
        if (!['admin', 'manager', 'mass-putaway'].includes(userRole)) {
            return { success: false, error: 'Insufficient permissions' };
        }
        
        const { data: details } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', data.box)
            .eq('is_active', true);
        
        if (!details || details.length === 0) {
            return { success: false, error: 'Box has no SN' };
        }
        
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

// Gọi hàm ngay khi load
fillBoxFromCache();
