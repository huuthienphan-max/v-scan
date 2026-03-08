// js/mass-putaway.js - Module Mass Putaway
// Chức năng: Xử lý nhập liệu hàng loạt, kết nối Python

let massSNList = [];
let fullBoxInfo = null;

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
    
    // === ĐỌC CẢ HAI CACHE ===
    readMassPutCache();
};

// ==================== ĐỌC CACHE ====================
function readMassPutCache() {
    console.log('🔍 Đọc cache Mass Put...');
    
    // 1. Đọc box riêng để điền form
    const savedBox = sessionStorage.getItem('massPutBox');
    console.log('📦 Box từ cache (riêng):', savedBox);
    
    if (savedBox) {
        const boxInput = document.getElementById('mass-box');
        if (boxInput) {
            boxInput.value = savedBox;
            console.log('✅ Đã điền box:', savedBox);
            
            // Highlight để thấy rõ
            boxInput.style.border = '2px solid #4f46e5';
            boxInput.style.backgroundColor = '#eef2ff';
        } else {
            console.error('❌ Không tìm thấy ô input mass-box');
        }
    }
    
    // 2. Đọc thông tin đầy đủ
    const savedFull = sessionStorage.getItem('massPutFullInfo');
    if (savedFull) {
        try {
            fullBoxInfo = JSON.parse(savedFull);
            console.log('📦 Thông tin đầy đủ:', fullBoxInfo);
            
            // Hiển thị thêm thông tin box
            const infoDiv = document.getElementById('mass-box-info');
            if (infoDiv && fullBoxInfo) {
                infoDiv.innerHTML = `
                    PO: ${fullBoxInfo.po || 'N/A'} | 
                    SKU: ${fullBoxInfo.sku || 'N/A'} | 
                    SL: ${fullBoxInfo.snList?.length || 0} SN
                `;
            }
            
            // Hiển thị thông báo
            showMassResult(`📦 Đã nạp box ${fullBoxInfo.box} (${fullBoxInfo.snList?.length || 0} SN)`, 'info');
            
        } catch (e) {
            console.error('❌ Lỗi parse full info:', e);
        }
    } else {
        console.log('📭 Không có thông tin đầy đủ');
    }
}

// Gọi nhiều lần để đảm bảo DOM đã load
setTimeout(readMassPutCache, 100);
setTimeout(readMassPutCache, 300);
setTimeout(readMassPutCache, 500);
setTimeout(readMassPutCache, 1000);

// ==================== XỬ LÝ MASS PUTAWAY ====================
window.processMassPutaway = async function() {
    // Lấy location từ form (thông tin mới nhập)
    const location = document.getElementById('mass-location')?.value.trim() || '';
    
    if (!location) {
        showMassResult('❌ Vui lòng nhập Location Put!', 'error');
        return;
    }
    
    try {
        // 📌 LẤY THÔNG TIN TỪ SESSIONSTORAGE (đã được lưu từ Box HV)
        const savedInfo = sessionStorage.getItem('massPutFullInfo');
        if (!savedInfo) {
            showMassResult('❌ Không tìm thấy thông tin box! Vui lòng chọn box từ màn hình Box HV.', 'error');
            return;
        }
        
        const boxData = JSON.parse(savedInfo);
        const box = boxData.box || '';
        const sku = boxData.sku || '';
        const snList = boxData.snList || [];
        
        if (!box) {
            showMassResult('❌ Thông tin box không hợp lệ!', 'error');
            return;
        }
        
        // Tạo chuỗi SN để hiển thị
        const snDisplay = snList.map((sn, index) => 
            `echo ${index+1}. ${sn}`
        ).join('\n');
        
        const snClipboard = snList.join(' ');
        
        // Đọc config.json để lấy đường dẫn exe
        let botPath = 'dist\\save as bot_remote_debug_full.exe';
        try {
            const configResponse = await fetch('config.json');
            if (configResponse.ok) {
                const config = await configResponse.json();
                botPath = config.bot_path || botPath;
            }
        } catch (e) {
            console.log('Không tìm thấy config.json, dùng đường dẫn mặc định');
        }
        
        // Tạo nội dung file .bat với thông tin từ V-Scan + location
        const batContent = `@echo off
title MASS PUT - SHOPEE WMS - BOX ${box}
color 0B
cls

echo =====================================================
echo            🏪 SHOPEE WMS - STANDARD PUTAWAY
echo =====================================================
echo.
echo 📦 BOX: ${box}
echo 📍 SKU: ${sku}
echo 📌 LOCATION: ${location}
echo 🔗 URL: https://wms.ssc.shopee.vn/v2/inbound/standardputaway
echo.
echo 📋 DANH SÁCH SN (${snList.length} cái):
echo --------------------------------------------
${snDisplay}
echo --------------------------------------------
echo.
echo =====================================================
echo.

:: Copy danh sách SN vào clipboard
echo ${snClipboard} | clip

echo ✅ Đã copy ${snList.length} SN vào clipboard!
echo 🤖 Bot sẽ tự động dán vào trang Shopee WMS...
echo.
echo =====================================================
echo.
echo Bạn đã kiểm tra kỹ và xác nhận mass put box này?
echo.
echo   [Y] ĐỒNG Ý - Chạy bot
echo   [N] HỦY - Không xử lý
echo.
echo =====================================================
echo.

:choice
set /p input="Nhập lựa chọn (Y/N): "
if /i "%input%"=="Y" goto run_bot
if /i "%input%"=="N" goto cancel
echo ❌ Vui lòng nhập Y hoặc N!
goto choice

:run_bot
cls
echo =====================================================
echo            🚀 ĐANG CHẠY BOT...
echo =====================================================
echo.
echo 📦 Box: ${box}
echo 📍 Location: ${location}
echo 🔢 Số SN: ${snList.length}
echo.
start /B "" "${botPath}" --box ${box} --sku ${sku} --location "${location}"
echo.
echo ✅ Bot đã được khởi động!
echo 🤖 Bot đang tự động nhập liệu...
echo.
timeout /t 10
exit

:cancel
cls
echo =====================================================
echo            ❌ ĐÃ HỦY XỬ LÝ
echo =====================================================
echo.
echo Bạn đã hủy mass put box ${box}
echo.
timeout /t 3
exit`;
        
        // Tải file .bat
        const blob = new Blob([batContent], { type: 'application/bat' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MASS_PUT_${box}.bat`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMassResult(`✅ Đã tạo file MASS_PUT_${box}.bat! Double-click để chạy bot.`, 'success');
        
        // Clear ô location (giữ lại box để dễ nhìn)
        document.getElementById('mass-location').value = '';
        
        // Cập nhật trạng thái box trong Supabase (nếu cần)
        try {
            const account = document.getElementById('mass-account')?.value.trim() || 'admin';
            await supabaseClient
                .from('boxes')
                .update({
                    putaway_status: 'processing',
                    putaway_date: new Date().toISOString(),
                    putaway_by: account
                })
                .eq('box_code', box)
                .execute();
        } catch (e) {
            console.log('Không thể cập nhật Supabase:', e);
        }
        
    } catch (error) {
        console.error('Lỗi:', error);
        showMassResult(`❌ Lỗi: ${error.message}`, 'error');
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
        }, 8000);
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

// ==================== HÀM TEST ====================
window.testMass = function() {
    console.log('🧪 TEST MASS PUTAWAY');
    console.log('📦 Box riêng:', sessionStorage.getItem('massPutBox'));
    console.log('📦 Full info:', sessionStorage.getItem('massPutFullInfo'));
    
    const boxInput = document.getElementById('mass-box');
    console.log('🔍 Input box:', boxInput);
    if (boxInput) {
        console.log('📝 Giá trị hiện tại:', boxInput.value);
    }
    
    const savedFull = sessionStorage.getItem('massPutFullInfo');
    if (savedFull) {
        try {
            console.log('📊 Full info parsed:', JSON.parse(savedFull));
        } catch (e) {
            console.log('❌ Lỗi parse:', e);
        }
    }
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
        
        const { data: boxData } = await supabaseClient
            .from('boxes')
            .select('*')
            .eq('box_code', data.box)
            .eq('is_active', true)
            .maybeSingle();
        
        if (!boxData) return { success: false, error: `Box ${data.box} not found` };
        
        const { data: details } = await supabaseClient
            .from('box_details')
            .select('serial')
            .eq('box_code', data.box)
            .eq('is_active', true);
        
        if (!details || details.length === 0) {
            return { success: false, error: 'Box has no SN' };
        }
        
        await supabaseClient
            .from('boxes')
            .update({
                putaway_status: 'completed',
                putaway_date: new Date().toISOString(),
                putaway_by: data.account
            })
            .eq('id', boxData.id);
        
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
let autoRefreshInterval = null;

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

// Khởi tạo auto refresh
startAutoRefresh();

// Cleanup khi unload
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});
