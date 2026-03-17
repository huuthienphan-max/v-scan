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
    
    // Đọc thông tin đầy đủ
    const savedFull = sessionStorage.getItem('massPutFullInfo');
    if (savedFull) {
        try {
            fullBoxInfo = JSON.parse(savedFull);
            console.log('📦 Thông tin đầy đủ:', fullBoxInfo);
            
            // QUAN TRỌNG: Lấy snList từ fullBoxInfo
            if (fullBoxInfo.snList && Array.isArray(fullBoxInfo.snList)) {
                currentBoxSnList = fullBoxInfo.snList;
                console.log(`📋 Đã load ${currentBoxSnList.length} SN từ cache`);
            } else {
                console.warn('⚠️ Không tìm thấy snList trong cache, thử đọc từ bảng...');
                // Fallback: đọc từ bảng nếu có
                const tbody = document.getElementById('mass-sn-tbody');
                if (tbody && tbody.children.length > 0 && tbody.children[0].children.length > 1) {
                    currentBoxSnList = Array.from(tbody.querySelectorAll('tr td:nth-child(2)'))
                        .map(td => td.textContent.trim());
                    console.log(`📋 Đã đọc ${currentBoxSnList.length} SN từ bảng`);
                } else {
                    currentBoxSnList = [];
                }
            }
            
            filteredSnList = [...currentBoxSnList];
            
            // Điền mã box vào ô input
            const boxInput = document.getElementById('mass-box');
            if (boxInput && fullBoxInfo.box) {
                boxInput.value = fullBoxInfo.box;
                boxInput.style.border = '2px solid #4f46e5';
                boxInput.style.backgroundColor = '#eef2ff';
            }
            
            // Hiển thị thông tin box
            const infoDiv = document.getElementById('mass-box-info');
            if (infoDiv && fullBoxInfo) {
                infoDiv.innerHTML = `
                    PO: ${fullBoxInfo.po || 'N/A'} | 
                    SKU: ${fullBoxInfo.sku || 'N/A'} | 
                    SL: ${fullBoxInfo.snList?.length || currentBoxSnList.length || 0} SN
                `;
            }
            
            // Render danh sách SN
            renderBoxSnList();
            
            // Reset ô tìm kiếm
            const searchInput = document.getElementById('mass-sn-search');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Ẩn kết quả tìm kiếm
            const resultMsg = document.getElementById('mass-search-result');
            if (resultMsg) {
                resultMsg.classList.add('hidden');
            }
            
            showMassResult(`📦 Đã nạp box ${fullBoxInfo.box} (${currentBoxSnList.length} SN)`, 'info');
            
        } catch (e) {
            console.error('❌ Lỗi parse full info:', e);
            currentBoxSnList = [];
            filteredSnList = [];
            renderBoxSnList();
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

// ==================== HƯỚNG DẪN SỬ DỤNG ====================
window.showMassPutawayGuide = function() {
    const guide = `
HUONG DAN SU DUNG MASS PUTAWAY:

1. Chon box tu man hinh Box HV
2. Thong tin box se tu dong dien vao form
3. Nhap Location Put (noi cat hang)
4. Nhan "Xu Ly Mass Putaway"
5. File .bat se duoc tai xuong
6. Double-click file .bat de chay bot
7. Bot se tu dong:
   - Ket noi Chrome debug port 9222
   - Tinh so luong SN tu danh sach
   - Goi API putaway

LINK HUONG DAN CHI TIET:
https://docs.google.com/document/d/1AjkXHAzkllOGfg6WfTp1ElNGwEcNuxt96cvJt9Rs4Uo/edit?tab=t.0
(Co the copy link tren bang Ctrl+C)

LUU Y:
- Chrome phai mo o cong 9222
- Da dang nhap Shopee WMS
- File bot_putaway.exe cung thu muc voi file .bat
    `;
    
    alert(guide);
};

// Khởi tạo khi load
console.log('✅ Mass Putaway module loaded - Version 4.0');
