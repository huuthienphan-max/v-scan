// js/mass-putaway.js - Module Mass Putaway
// Chức năng: Xử lý nhập liệu hàng loạt, tạo file .bat cùng thư mục
// Version: 2.0 - Sửa lỗi quantity và tạo file .bat chuẩn

let massSNList = [];
let fullBoxInfo = null;
let autoRefreshInterval = null;

// ==================== KHỞI TẠO MODULE ====================
window.initMassPutawayModule = function() {
@@ -17,9 +19,13 @@ window.initMassPutawayModule = function() {

// Log thông tin API cho Python
console.log('📡 API Endpoint cho Python: POST /api/mass-putaway');
    console.log('📡 Bot sẽ tự động tính quantity từ danh sách SN');

    // === ĐỌC CẢ HAI CACHE ===
    // Đọc cache
readMassPutCache();
    
    // Khởi tạo auto refresh
    startAutoRefresh();
};

// ==================== ĐỌC CACHE ====================
@@ -103,53 +109,74 @@ window.processMassPutaway = async function() {
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

        // Tạo chuỗi SN để hiển thị
        if (snList.length === 0) {
            showMassResult('❌ Box không có SN nào!', 'error');
            return;
        }
        
        // Tạo chuỗi SN để hiển thị trong file .bat
const snDisplay = snList.map((sn, index) => 
            `echo ${index+1}. ${sn}`
            `echo ${String(index+1).padStart(2, '0')}. ${sn}`
).join('\n');

        // Tạo chuỗi SN để copy vào clipboard
const snClipboard = snList.join(' ');

        // Tạo nội dung file .bat - DÙNG %~dp0 ĐỂ TỰ ĐỘNG TÌM EXE CÙNG THƯ MỤC
        // Tạo chuỗi SN cho tham số --snlist (cách nhau bằng dấu phẩy, không có khoảng trắng)
        const snParam = snList.join(',');
        
        // Xác định tên file EXE (ưu tiên dùng bot_putaway.exe, nếu không thì dùng tên cũ)
        const exeName = 'bot_putaway.exe'; // Đã đổi tên
        const oldExeName = 'save as bot_remote_debug_full.exe';
        
        // Tạo nội dung file .bat - ĐÃ SỬA CHUẨN THEO YÊU CẦU
const batContent = `@echo off
title MASS PUT - SHOPEE WMS - BOX ${box}
chcp 65001 >nul
title MASS PUTAWAY - BOX ${box}
color 0B
cls

echo =====================================================
echo            🏪 SHOPEE WMS - STANDARD PUTAWAY
echo            🏪 SHOPEE WMS - MASS PUTAWAY
echo =====================================================
echo.
echo 📦 BOX: ${box}
echo 📍 SKU: ${sku}
echo 📌 LOCATION: ${location}
echo 🔗 URL: https://wms.ssc.uat.shopee.vn/v2/inbound/standardputaway
echo 📦 BOX:        ${box}
echo 📦 PO:         ${po}
echo 📍 SKU:        ${sku}
echo 📌 LOCATION:   ${location}
echo 🔢 SỐ LƯỢNG SN: ${snList.length}
echo.
echo 📋 DANH SÁCH SN (${snList.length} cái):
echo 📋 DANH SÁCH SN:
echo --------------------------------------------
${snDisplay}
echo --------------------------------------------
echo.
echo =====================================================
echo.

:: Copy danh sách SN vào clipboard
echo ${snClipboard} | clip
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
@@ -168,24 +195,58 @@ goto choice
:run_bot
cls
echo =====================================================
echo            🚀 ĐANG CHẠY BOT...
echo            🚀 ĐANG CHẠY BOT PUTAWAY
echo =====================================================
echo.
echo 📦 Box: ${box}
echo 📍 Location: ${location}
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

:: CHẠY EXE CÙNG THƯ MỤC VỚI FILE .BAT
:: %~dp0 là đường dẫn thư mục chứa file .bat đang chạy
// Sửa dòng này
"%~dp0save as bot_remote_debug_full.exe" --box ${box} --sku ${sku} --location "${location}" --snlist "${snList.join(',')}"
:: KIỂM TRA KẾT QUẢ
if %errorlevel% equ 0 (
    echo.
    echo ✅ BOT ĐÃ CHẠY THÀNH CÔNG!
) else (
    echo.
    echo ❌ BOT CHẠY THẤT BẠI! Mã lỗi: %errorlevel%
)

echo.
echo ✅ Bot đã được khởi động!
echo 🤖 Bot đang tự động nhập liệu...
echo =====================================================
echo.
timeout /t 10
timeout /t 5
exit

:cancel
@@ -205,7 +266,11 @@ exit`;
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
        a.download = `MASS_PUT_${box}.bat`;
        
        // Tạo tên file có timestamp
        const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
        a.download = `MASS_PUT_${box}_${timestamp}.bat`;
        
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
@@ -216,12 +281,37 @@ exit`;
// Clear ô location
document.getElementById('mass-location').value = '';

        // Log activity
        await logMassPutawayActivity(box, sku, location, snList.length);
        
} catch (error) {
        console.error('❌ Lỗi:', error);
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
@@ -237,12 +327,12 @@ function showMassResult(message, type) {
resultDiv.classList.add('bg-blue-100', 'text-blue-700', 'p-4', 'rounded');
}

    resultDiv.innerHTML = message;
    resultDiv.innerHTML = message.replace(/\n/g, '<br>');

if (type === 'success') {
setTimeout(() => {
resultDiv.classList.add('hidden');
        }, 8000);
        }, 10000);
}
}

@@ -300,36 +390,73 @@ function renderMassSNList() {
// ==================== REFRESH DANH SÁCH SN ====================
window.refreshMassSNList = function() {
loadMassSNList();
    showMassResult('🔄 Đã làm mới danh sách SN', 'info');
};

// ==================== AUTO REFRESH ====================
let autoRefreshInterval = null;
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
    }, 30000);
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

// Khởi tạo auto refresh
startAutoRefresh();

// Cleanup khi unload
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});
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
