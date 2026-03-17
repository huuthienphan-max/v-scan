// js/mass-putaway.js - Module Mass Putaway
// Version: 4.0 - Hiển thị danh sách SN của box được chọn + Tìm kiếm

let fullBoxInfo = null;
let autoRefreshInterval = null;
let currentBoxSnList = [];     // Danh sách SN của box hiện tại
let filteredSnList = [];       // Danh sách SN sau khi lọc

// ==================== KHỞI TẠO MODULE ====================
window.initMassPutawayModule = function() {
    console.log('🚀 Khởi tạo Mass Putaway module...');
    
    // Set WH mặc định
    const whInput = document.getElementById('mass-wh');
    if (whInput) whInput.value = 'VNS';
    
    // Đọc cache
    readMassPutCache();
    
    // Thêm sự kiện cho ô tìm kiếm
    const searchInput = document.getElementById('mass-sn-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            filterSnList(e.target.value);
        });
    }
    
    // Khởi tạo auto refresh
    startAutoRefresh();
};

// ==================== ĐỌC CACHE ====================
function readMassPutCache() {
    console.log('🔍 Đọc cache Mass Put...');
    
    // 1. Đọc box riêng để điền form
    const savedBox = sessionStorage.getItem('massPutBox');
    
    if (savedBox) {
        const boxInput = document.getElementById('mass-box');
        if (boxInput) {
            boxInput.value = savedBox;
            
            // Highlight để thấy rõ
            boxInput.style.border = '2px solid #4f46e5';
            boxInput.style.backgroundColor = '#eef2ff';
        }
    }
    
    // 2. Đọc thông tin đầy đủ
    const savedFull = sessionStorage.getItem('massPutFullInfo');
    if (savedFull) {
        try {
            fullBoxInfo = JSON.parse(savedFull);
            console.log('📦 Thông tin đầy đủ:', fullBoxInfo);
            
            // Lưu danh sách SN của box hiện tại
            currentBoxSnList = fullBoxInfo.snList || [];
            filteredSnList = [...currentBoxSnList];
            
            // Hiển thị thông tin box
            const infoDiv = document.getElementById('mass-box-info');
            if (infoDiv && fullBoxInfo) {
                infoDiv.innerHTML = `
                    PO: ${fullBoxInfo.po || 'N/A'} | 
                    SKU: ${fullBoxInfo.sku || 'N/A'} | 
                    SL: ${fullBoxInfo.snList?.length || 0} SN
                `;
            }
            
            // Render danh sách SN
            renderBoxSnList();
            
            // Hiển thị thông báo
            showMassResult(`📦 Đã nạp box ${fullBoxInfo.box} (${fullBoxInfo.snList?.length || 0} SN)`, 'info');
            
        } catch (e) {
            console.error('❌ Lỗi parse full info:', e);
        }
    } else {
        console.log('📭 Không có thông tin đầy đủ');
        currentBoxSnList = [];
        filteredSnList = [];
        renderBoxSnList();
    }
}

// ==================== RENDER DANH SÁCH SN CỦA BOX ====================
function renderBoxSnList() {
    const tbody = document.getElementById('mass-sn-tbody');
    if (!tbody) return;
    
    const listToRender = filteredSnList.length > 0 ? filteredSnList : currentBoxSnList;
    
    if (!listToRender || listToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">Chưa có SN nào trong box</td></tr>';
        
        // Cập nhật số lượng
        const countSpan = document.getElementById('mass-sn-count');
        if (countSpan) {
            countSpan.innerText = `0/0 SN`;
        }
        return;
    }
    
    tbody.innerHTML = listToRender.map((sn, index) => {
        const stt = index + 1;
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-3 py-2 text-center">${stt}</td>
                <td class="px-3 py-2 font-mono font-bold text-indigo-600">${sn}</td>
                <td class="px-3 py-2 text-center">
                    <span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Chờ xử lý</span>
                </td>
                <td class="px-3 py-2 text-center">
                    <button onclick="copySingleSN('${sn}')" class="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200">
                        📋 Copy
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Cập nhật số lượng hiển thị
    const countSpan = document.getElementById('mass-sn-count');
    if (countSpan) {
        countSpan.innerText = `${listToRender.length}/${currentBoxSnList.length} SN`;
    }
}

// ==================== LỌC DANH SÁCH SN ====================
function filterSnList(keyword) {
    if (!keyword || keyword.trim() === '') {
        filteredSnList = [...currentBoxSnList];
    } else {
        const searchTerm = keyword.toLowerCase().trim();
        filteredSnList = currentBoxSnList.filter(sn => 
            sn.toLowerCase().includes(searchTerm)
        );
    }
    renderBoxSnList();
    
    // Hiển thị kết quả tìm kiếm
    const resultMsg = document.getElementById('mass-search-result');
    if (resultMsg) {
        if (filteredSnList.length === 0 && keyword.trim() !== '') {
            resultMsg.innerHTML = `❌ Không tìm thấy SN nào khớp với "${keyword}"`;
            resultMsg.classList.remove('hidden');
        } else if (filteredSnList.length < currentBoxSnList.length) {
            resultMsg.innerHTML = `🔍 Tìm thấy ${filteredSnList.length}/${currentBoxSnList.length} SN`;
            resultMsg.classList.remove('hidden');
        } else {
            resultMsg.classList.add('hidden');
        }
    }
}

// ==================== COPY SN ====================
window.copyAllSN = function() {
    if (!currentBoxSnList || currentBoxSnList.length === 0) {
        showMassResult('❌ Không có SN để copy!', 'error');
        return;
    }
    
    const snText = currentBoxSnList.join('\n');
    navigator.clipboard.writeText(snText).then(() => {
        showMassResult(`✅ Đã copy ${currentBoxSnList.length} SN vào clipboard!`, 'success');
    }).catch(err => {
        showMassResult('❌ Lỗi copy: ' + err, 'error');
    });
};

window.copySingleSN = function(sn) {
    navigator.clipboard.writeText(sn).then(() => {
        showMassResult(`✅ Đã copy SN: ${sn}`, 'success');
    }).catch(err => {
        showMassResult('❌ Lỗi copy: ' + err, 'error');
    });
};

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
        
        if (!savedInfo) {
            showMassResult('❌ Không tìm thấy thông tin box!', 'error');
            return;
        }
        
        const boxData = JSON.parse(savedInfo);
        const box = boxData.box || '';
        const sku = boxData.sku || '';
        const po = boxData.po || '';
        const snList = boxData.snList || [];
        
        if (!box) {
            showMassResult('❌ Thông tin box không hợp lệ!', 'error');
            return;
        }
        
        if (snList.length === 0) {
            showMassResult('❌ Box không có SN nào!', 'error');
            return;
        }
        
        // Tạo chuỗi SN để hiển thị trong file .bat
        const snDisplay = snList.map((sn, index) => {
            const stt = (index + 1).toString().padStart(2, '0');
            return `echo ${stt}. ${sn}`;
        }).join('\r\n');
        
        // Tạo chuỗi SN cho tham số --snlist
        const snParam = snList.join(',');
        
        // Tạo chuỗi SN để copy vào clipboard
        const snClipboard = snList.join(' ');
        
        // Xác định tên file EXE
        const exeName = 'bot_putaway.exe';
        const oldExeName = 'save as bot_remote_debug_full.exe';
        
        // Tạo nội dung file .bat
        const batContent = `@echo off
chcp 65001 >nul
title MASS PUTAWAY - BOX ${box}
color 0B
cls

echo =====================================================
echo             SHOPEE WMS - MASS PUTAWAY
echo =====================================================
echo.
echo BOX        : ${box}
echo PO         : ${po}
echo SKU        : ${sku}
echo LOCATION   : ${location}
echo SO LUONG SN: ${snList.length}
echo.
echo DANH SACH SN:
echo --------------------------------------------
${snDisplay}
echo --------------------------------------------
echo.
echo =====================================================
echo.

:: Copy danh sach SN vao clipboard
echo ${snClipboard} | clip
echo Da copy ${snList.length} SN vao clipboard!
echo.
echo =====================================================
echo.
echo BOT SE TU DONG TINH SO LUONG SN
echo.
echo Ban da kiem tra va xac nhan?
echo.
echo  [Y] DONG Y - Chay bot
echo  [N] HUY - Khong xu ly
echo.
echo =====================================================
echo.

:choice
set /p input="Nhap lua chon (Y/N): "
if /i "%input%"=="Y" goto run_bot
if /i "%input%"=="N" goto cancel
echo Vui long nhap Y hoac N!
goto choice

:run_bot
cls
echo =====================================================
echo              DANG CHAY BOT PUTAWAY
echo =====================================================
echo.
echo Box: ${box}
echo SKU: ${sku}
echo Location: ${location}
echo So SN: ${snList.length}
echo.
echo Tham so gui di:
echo   --box ${box}
echo   --sku ${sku}
echo   --location "${location}"
echo   --snlist "${snParam}"
echo.
echo =====================================================
echo.

:: Kiem tra file EXE ton tai
if exist "%~dp0${exeName}" (
    set "EXE_PATH=%~dp0${exeName}"
) else if exist "%~dp0${oldExeName}" (
    set "EXE_PATH=%~dp0${oldExeName}"
) else (
    echo KHONG TIM THAY FILE EXE!
    echo.
    echo Cac file da tim:
    echo   - %~dp0${exeName}
    echo   - %~dp0${oldExeName}
    echo.
    echo Vui long dat file exe cung thu muc voi file .bat
    pause
    exit /b 1
)

:: Chay bot
echo Dang khoi dong bot...
echo.
"%EXE_PATH%" --box ${box} --sku ${sku} --location "${location}" --snlist "${snParam}"

:: Kiem tra ket qua
if %errorlevel% equ 0 (
    echo.
    echo BOT DA CHAY THANH CONG!
) else (
    echo.
    echo BOT CHAY THAT BAI! Ma loi: %errorlevel%
)

echo.
echo =====================================================
echo.
echo Nhan phim bat ky de thoat...
pause >nul
exit

:cancel
cls
echo =====================================================
echo                 DA HUY XU LY
echo =====================================================
echo.
echo Ban da huy mass put box ${box}
echo.
echo Nhan phim bat ky de thoat...
pause >nul
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
        
    } catch (error) {
        console.error('❌ Lỗi chi tiết:', error);
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
    
    resultDiv.innerHTML = message.replace(/\n/g, '<br>');
    
    if (type === 'success') {
        setTimeout(() => {
            resultDiv.classList.add('hidden');
        }, 10000);
    }
}

// ==================== REFRESH ====================
window.refreshMassSNList = function() {
    readMassPutCache();
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
    
    currentBoxSnList = [];
    filteredSnList = [];
    renderBoxSnList();
    
    showMassResult('✅ Đã xóa cache, có thể chọn box mới', 'success');
};

// ==================== AUTO REFRESH ====================
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.getElementById('page-mass-putaway')?.classList.contains('hidden')) {
            readMassPutCache();
            console.log('🔄 Auto refresh mass SN list');
        }
    }, 30000);
}

// ==================== CLEANUP ====================
window.cleanupMassPutaway = function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('🧹 Đã dọn dẹp auto refresh');
    }
};

// ==================== HIỂN THỊ MODAL HƯỚNG DẪN ====================
window.showMassPutawayGuide = function() {
    // Kiểm tra modal đã tồn tại chưa
    let modal = document.getElementById('guide-modal');
    
    // Nếu chưa có, tạo mới
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'guide-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg w-3/4 max-w-2xl max-h-[80vh] overflow-hidden">
                <div class="p-4 border-b flex justify-between items-center bg-orange-50">
                    <h3 class="font-bold text-lg text-orange-700">📚 HƯỚNG DẪN MASS PUTAWAY</h3>
                    <button onclick="closeGuideModal()" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                <div id="guide-modal-body" class="p-6 overflow-y-auto max-h-[60vh]"></div>
                <div class="p-4 border-t flex justify-end gap-2">
                    <button onclick="copyGuideLink()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">
                        📋 Copy Link
                    </button>
                    <button onclick="openGuideLink()" class="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700">
                        🌐 Mở Link
                    </button>
                    <button onclick="closeGuideModal()" class="bg-gray-200 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300">
                        Đóng
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Nội dung hướng dẫn
    const guideContent = `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded">
                <h4 class="font-bold text-blue-700 mb-2">📋 CÁC BƯỚC THỰC HIỆN:</h4>
                <ol class="list-decimal pl-5 space-y-2">
                    <li>Chọn box từ màn hình <span class="font-bold text-orange-600">Box HV</span></li>
                    <li>Thông tin box sẽ tự động điền vào form</li>
                    <li>Nhập <span class="font-bold">Location Put</span> (nơi cất hàng)</li>
                    <li>Nhấn <span class="font-bold bg-orange-100 px-2 py-1 rounded">"Xử Lý Mass Putaway"</span></li>
                    <li>File <code class="bg-gray-100 px-2 py-1 rounded">.bat</code> sẽ được tải xuống</li>
                    <li>Double-click file .bat để chạy bot</li>
                </ol>
            </div>
            
            <div class="bg-green-50 p-4 rounded">
                <h4 class="font-bold text-green-700 mb-2">🤖 BOT SẼ TỰ ĐỘNG:</h4>
                <ul class="list-disc pl-5 space-y-1">
                    <li>Kết nối Chrome debug port 9222</li>
                    <li>Tính số lượng SN từ danh sách</li>
                    <li>Gọi API putaway</li>
                </ul>
            </div>
            
            <div class="bg-yellow-50 p-4 rounded">
                <h4 class="font-bold text-yellow-700 mb-2">🔗 TÀI LIỆU HƯỚNG DẪN CHI TIẾT:</h4>
                <div class="bg-white p-3 rounded border flex items-center gap-2">
                    <span class="text-gray-500">📄</span>
                    <input type="text" id="guide-link" readonly value="https://docs.google.com/document/d/1AjkXHAzkllOGfg6WfTp1ElNGwEcNuxt96cvJt9Rs4Uo/edit?tab=t.0" 
                           class="flex-1 p-2 bg-gray-50 border rounded text-sm font-mono">
                    <button onclick="copyGuideLink()" class="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">
                        Copy
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-2">👆 Có thể bôi đen hoặc dùng nút Copy để lấy link</p>
            </div>
            
            <div class="bg-red-50 p-4 rounded">
                <h4 class="font-bold text-red-700 mb-2">⚠️ LƯU Ý QUAN TRỌNG:</h4>
                <ul class="list-disc pl-5 space-y-1 text-sm">
                    <li>Chrome phải mở ở cổng <code class="bg-gray-100 px-2 py-0.5 rounded">9222</code></li>
                    <li>Đã đăng nhập Shopee WMS</li>
                    <li>File <code class="bg-gray-100 px-2 py-0.5 rounded">bot_putaway.exe</code> cùng thư mục với file .bat</li>
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('guide-modal-body').innerHTML = guideContent;
    modal.style.display = 'flex';
};

// ==================== ĐÓNG MODAL ====================
window.closeGuideModal = function() {
    const modal = document.getElementById('guide-modal');
    if (modal) modal.style.display = 'none';
};

// ==================== COPY LINK HƯỚNG DẪN ====================
window.copyGuideLink = function() {
    const linkInput = document.getElementById('guide-link');
    if (linkInput) {
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // Cho mobile
        document.execCommand('copy');
        
        // Hiển thị thông báo
        showMassResult('✅ Đã copy link hướng dẫn!', 'success');
    }
};

// ==================== MỞ LINK HƯỚNG DẪN ====================
window.openGuideLink = function() {
    window.open('https://docs.google.com/document/d/1AjkXHAzkllOGfg6WfTp1ElNGwEcNuxt96cvJt9Rs4Uo/edit?tab=t.0', '_blank');
};

// Khởi tạo khi load
console.log('✅ Mass Putaway module loaded - Version 4.0');
