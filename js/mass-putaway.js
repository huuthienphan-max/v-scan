// js/mass-putaway.js - Module Mass Putaway
// Chức năng: Xử lý nhập liệu hàng loạt, tạo file .bat cùng thư mục
// Version: 2.0 - Sửa lỗi quantity và tạo file .bat chuẩn

let massSNList = [];
let fullBoxInfo = null;
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
    console.log('📡 Bot sẽ tự động tính quantity từ danh sách SN');
    
    // Đọc cache
    readMassPutCache();
    
    // Khởi tạo auto refresh
    startAutoRefresh();
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
    console.log('🔵🔵🔵 processMassPutaway ĐƯỢC GỌI 🔵🔵🔵');
    
    // Lấy location từ form
    const location = document.getElementById('mass-location')?.value.trim() || '';
    
    if (!location) {
        showMassResult('❌ Vui lòng nhập Location Put!', 'error');
        return;
    }
    
    try {
        // Lấy thông tin từ SESSIONSTORAGE
        const savedInfo = sessionStorage.getItem('massPutFullInfo');
        console.log('📦 savedInfo:', savedInfo);
        
        if (!savedInfo) {
            showMassResult('❌ Không tìm thấy thông tin box!', 'error');
            return;
        }
        
        const boxData = JSON.parse(savedInfo);
        const box = boxData.box || '';
        const sku = boxData.sku || '';
        const po = boxData.po || '';
        const snList = boxData.snList || [];
        
        console.log('📦 Box:', box);
        console.log('📍 PO:', po);
        console.log('📍 SKU:', sku);
        console.log('📋 SN List:', snList);
        console.log('📋 Số lượng SN:', snList.length);
        
        if (!box) {
            showMassResult('❌ Thông tin box không hợp lệ!', 'error');
            return;
        }
        
        if (snList.length === 0) {
            showMassResult('❌ Box không có SN nào!', 'error');
            return;
        }
        
        // Tạo chuỗi SN để hiển thị trong file .bat
        const snDisplay = snList.map((sn, index) => 
            `echo ${String(index+1).padStart(2, '0')}. ${sn}`
        ).join('\n');
        
        // Tạo chuỗi SN để copy vào clipboard
        const snClipboard = snList.join(' ');
        
        // Tạo chuỗi SN cho tham số --snlist (cách nhau bằng dấu phẩy, không có khoảng trắng)
        const snParam = snList.join(',');
        
        // Xác định tên file EXE (ưu tiên dùng bot_putaway.exe, nếu không thì dùng tên cũ)
        const exeName = 'bot_putaway.exe'; // Đã đổi tên
        const oldExeName = 'save as bot_remote_debug_full.exe';
        
        // Tạo nội dung file .bat - ĐÃ SỬA CHUẨN THEO YÊU CẦU
        const batContent = `@echo off
chcp 65001 >nul
title MASS PUTAWAY - BOX ${box}
color 0B
cls

echo =====================================================
echo            🏪 SHOPEE WMS - MASS PUTAWAY
echo =====================================================
echo.
echo 📦 BOX:        ${box}
echo 📦 PO:         ${po}
echo 📍 SKU:        ${sku}
echo 📌 LOCATION:   ${location}
echo 🔢 SỐ LƯỢNG SN: ${snList.length}
echo.
echo 📋 DANH SÁCH SN:
echo --------------------------------------------
${snDisplay}
echo --------------------------------------------
echo.
echo =====================================================
echo.

:: Copy danh sách SN vào clipboard để dự phòng
echo %SN_CLIPBOARD% | clip
set SN_CLIPBOARD=${snClipboard}
echo ✅ Đã copy ${snList.length} SN vào clipboard!
echo.
echo =====================================================
echo.
echo 🤖 BOT SẼ TỰ ĐỘNG TÍNH QUANTITY TỪ DANH SÁCH SN
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
echo            🚀 ĐANG CHẠY BOT PUTAWAY
echo =====================================================
echo.
echo 📦 Box: ${box}
echo 📍 SKU: ${sku}
echo 📌 Location: ${location}
echo 🔢 Số SN: ${snList.length}
echo.
echo 📋 Tham số gửi đi:
echo    --box ${box}
echo    --sku ${sku}
echo    --location "${location}"
echo    --snlist "${snParam}"
echo.
echo =====================================================
echo.

:: KIỂM TRA FILE EXE TỒN TẠI
if exist "%~dp0${exeName}" (
    set EXE_PATH=%~dp0${exeName}
) else if exist "%~dp0${oldExeName}" (
    set EXE_PATH="%~dp0${oldExeName}"
) else (
    echo ❌ KHÔNG TÌM THẤY FILE EXE!
    echo.
    echo 📌 Các file đã tìm:
    echo    - %~dp0${exeName}
    echo    - %~dp0${oldExeName}
    echo.
    echo Vui lòng đặt file bot_putaway.exe cùng thư mục với file .bat
    pause
    exit /b 1
)

:: CHẠY BOT - CHỈ TRUYỀN 4 THAM SỐ, BOT TỰ TÍNH QUANTITY
echo 🚀 Đang khởi động bot...
echo.
%EXE_PATH% --box ${box} --sku ${sku} --location "${location}" --snlist "${snParam}"

:: KIỂM TRA KẾT QUẢ
if %errorlevel% equ 0 (
    echo.
    echo ✅ BOT ĐÃ CHẠY THÀNH CÔNG!
) else (
    echo.
    echo ❌ BOT CHẠY THẤT BẠI! Mã lỗi: %errorlevel%
)

echo.
echo =====================================================
echo.
timeout /t 5
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
        console.log('📝 Đang tạo file .bat...');
        const blob = new Blob([batContent], { type: 'application/bat' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Tạo tên file có timestamp
        const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
        a.download = `MASS_PUT_${box}_${timestamp}.bat`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMassResult(`✅ Đã tạo file MASS_PUT_${box}.bat! Double-click để chạy bot.`, 'success');
        
        // Clear ô location
        document.getElementById('mass-location').value = '';
        
        // Log activity
        await logMassPutawayActivity(box, sku, location, snList.length);
        
    } catch (error) {
        console.error('❌ Lỗi chi tiết:', error);
        showMassResult(`❌ Lỗi: ${error.message}`, 'error');
    }
};

// ==================== LOG ACTIVITY ====================
async function logMassPutawayActivity(box, sku, location, snCount) {
    try {
        await supabaseClient.from('activity_log').insert([{
            user_id: currentUserId,
            username: currentUser,
            action: 'MASS_PUTAWAY_BATCH',
            details: {
                box: box,
                sku: sku,
                location: location,
                sn_count: snCount,
                timestamp: new Date().toISOString()
            },
            is_active: true
        }]);
        console.log('✅ Đã ghi log mass putaway');
    } catch (error) {
        console.error('❌ Lỗi ghi log:', error);
    }
}

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
    
    resultDiv.innerHTML = message.replace(/\n/g, '<br>');
    
    if (type === 'success') {
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 10000);
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
    showMassResult('🔄 Đã làm mới danh sách SN', 'info');
};

// ==================== CLEAR CACHE ====================
window.clearMassPutCache = function() {
    sessionStorage.removeItem('massPutBox');
    sessionStorage.removeItem('massPutFullInfo');
    
    const boxInput = document.getElementById('mass-box');
    if (boxInput) {
        boxInput.value = '';
        boxInput.style.border = '';
        boxInput.style.backgroundColor = '';
    }
    
    const infoDiv = document.getElementById('mass-box-info');
    if (infoDiv) {
        infoDiv.innerHTML = '';
    }
    
    showMassResult('✅ Đã xóa cache, có thể chọn box mới', 'success');
};

// ==================== AUTO REFRESH ====================
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.getElementById('page-mass-putaway')?.classList.contains('hidden')) {
            loadMassSNList();
            console.log('🔄 Auto refresh mass SN list');
        }
    }, 30000); // Refresh mỗi 30 giây
}

// ==================== CLEANUP ====================
window.cleanupMassPutaway = function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('🧹 Đã dọn dẹp auto refresh');
    }
};

// ==================== HƯỚNG DẪN SỬ DỤNG ====================
window.showMassPutawayGuide = function() {
    const guide = `
📋 HƯỚNG DẪN SỬ DỤNG MASS PUTAWAY:

1. Chọn box từ màn hình Box HV
2. Thông tin box sẽ tự động điền vào form
3. Nhập Location Put (nơi cất hàng)
4. Nhấn "Xử Lý Mass Putaway"
5. File .bat sẽ được tải xuống
6. Double-click file .bat để chạy bot
7. Bot sẽ tự động:
   - Kết nối Chrome debug port 9222
   - Tính số lượng SN từ danh sách
   - Gọi API putaway

⚠️ LƯU Ý:
- Chrome phải mở ở cổng 9222
- Đã đăng nhập Shopee WMS
- File bot_putaway.exe cùng thư mục với file .bat
    `;
    
    alert(guide);
};

// Khởi tạo khi load
console.log('✅ Mass Putaway module loaded - Version 2.0');
