// putaway-hv.js - Module Putaway HV
// Version: 2.0 - Thêm ô tìm kiếm theo mã box

let putawayInterval = null;
let putawayData = [];
let filteredPutawayData = [];
let currentPage = 1;
let itemsPerPage = 20;
let totalPages = 1;

// ==================== KHỞI TẠO MODULE ====================
window.initPutawayHVModule = function() {
    console.log('🚀 Khởi tạo Putaway HV module...');
    
    // Set ngày mặc định
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const fromDate = document.getElementById('putaway-from-date');
    const toDate = document.getElementById('putaway-to-date');
    
    if (fromDate) fromDate.value = lastWeek.toISOString().split('T')[0];
    if (toDate) toDate.value = today.toISOString().split('T')[0];
    
    // Load dữ liệu
    loadPutawayStats();
    loadPutawayData();
    
    // Thêm sự kiện cho ô tìm kiếm box
    const boxSearchInput = document.getElementById('putaway-box-search');
    if (boxSearchInput) {
        boxSearchInput.addEventListener('input', function(e) {
            filterPutawayByBox(e.target.value);
        });
    }
    
    // Thêm sự kiện cho các ô lọc khác
    const poInput = document.getElementById('putaway-po');
    if (poInput) {
        poInput.addEventListener('input', debounce(function() {
            loadPutawayData();
        }, 500));
    }
    
    const statusSelect = document.getElementById('putaway-status');
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            loadPutawayData();
        });
    }
    
    const fromDateInput = document.getElementById('putaway-from-date');
    const toDateInput = document.getElementById('putaway-to-date');
    
    if (fromDateInput) {
        fromDateInput.addEventListener('change', function() {
            loadPutawayData();
        });
    }
    
    if (toDateInput) {
        toDateInput.addEventListener('change', function() {
            loadPutawayData();
        });
    }
    
    // Auto refresh
    startAutoRefresh();
};

// ==================== DEBOUNCE ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== AUTO REFRESH ====================
function startAutoRefresh(interval = 30000) {
    if (putawayInterval) clearInterval(putawayInterval);
    putawayInterval = setInterval(() => {
        if (!document.getElementById('page-putaway-hv')?.classList.contains('hidden')) {
            loadPutawayStats();
            loadPutawayData();
        }
    }, interval);
}

window.cleanupPutawayHV = function() {
    if (putawayInterval) {
        clearInterval(putawayInterval);
        putawayInterval = null;
    }
};

// ==================== LỌC THEO MÃ BOX ====================
function filterPutawayByBox(keyword) {
    if (!keyword || keyword.trim() === '') {
        filteredPutawayData = [...putawayData];
    } else {
        const searchTerm = keyword.toLowerCase().trim();
        filteredPutawayData = putawayData.filter(box => 
            box.box_code.toLowerCase().includes(searchTerm) ||
            (box.po && box.po.toLowerCase().includes(searchTerm)) ||
            (box.sku && box.sku.toLowerCase().includes(searchTerm))
        );
    }
    
    currentPage = 1;
    renderPutawayData(filteredPutawayData);
    renderPagination(filteredPutawayData.length);
    
    // Hiển thị kết quả tìm kiếm
    const resultSpan = document.getElementById('putaway-search-result');
    if (resultSpan) {
        if (filteredPutawayData.length === 0 && keyword.trim() !== '') {
            resultSpan.innerHTML = `❌ Không tìm thấy box nào khớp với "${keyword}"`;
            resultSpan.classList.remove('hidden');
        } else if (filteredPutawayData.length < putawayData.length) {
            resultSpan.innerHTML = `🔍 Tìm thấy ${filteredPutawayData.length}/${putawayData.length} box`;
            resultSpan.classList.remove('hidden');
        } else {
            resultSpan.classList.add('hidden');
        }
    }
}

// ==================== THỐNG KÊ ====================
async function loadPutawayStats() {
    try {
        // Đếm pending
        const { count: pending, error: pendingError } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'pending');

        if (pendingError) throw pendingError;

        // Đếm completed
        const { count: total, error: totalError } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed');

        if (totalError) throw totalError;

        // Đếm hôm nay
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount, error: todayError } = await supabaseClient
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .gte('putaway_date', today + 'T00:00:00');

        if (todayError) throw todayError;

        // Lấy lần cuối
        const { data: lastData, error: lastError } = await supabaseClient
            .from('boxes')
            .select('putaway_date')
            .eq('is_active', true)
            .eq('putaway_status', 'completed')
            .order('putaway_date', { ascending: false })
            .limit(1);

        if (lastError) throw lastError;

        // Cập nhật UI
        document.getElementById('putaway-pending').innerText = pending || 0;
        document.getElementById('putaway-total').innerText = total || 0;
        document.getElementById('putaway-today').innerText = todayCount || 0;
        
        if (lastData && lastData.length > 0) {
            const lastDate = new Date(lastData[0].putaway_date).toLocaleString('vi-VN');
            document.getElementById('putaway-last').innerText = lastDate;
        } else {
            document.getElementById('putaway-last').innerText = 'Chưa có';
        }

    } catch (error) {
        console.error('❌ Lỗi load stats:', error);
        window.notify('❌ Lỗi tải thống kê!', true);
    }
}

// ==================== LẤY DỮ LIỆU ====================
async function loadPutawayData() {
    try {
        const fromDate = document.getElementById('putaway-from-date')?.value;
        const toDate = document.getElementById('putaway-to-date')?.value;
        const po = document.getElementById('putaway-po')?.value;
        const status = document.getElementById('putaway-status')?.value || 'all';

        let query = supabaseClient
            .from('boxes')
            .select(`
                *,
                box_details(*)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (fromDate) {
            query = query.gte('created_at', fromDate + 'T00:00:00');
        }
        
        if (toDate) {
            query = query.lte('created_at', toDate + 'T23:59:59');
        }
        
        if (po) {
            query = query.ilike('po', `%${po}%`);
        }
        
        if (status !== 'all') {
            query = query.eq('putaway_status', status);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error('Lỗi query:', error);
            throw error;
        }

        putawayData = data || [];
        filteredPutawayData = [...putawayData];
        
        // Reset ô tìm kiếm box
        const boxSearchInput = document.getElementById('putaway-box-search');
        if (boxSearchInput) {
            boxSearchInput.value = '';
        }
        
        // Ẩn kết quả tìm kiếm
        const resultSpan = document.getElementById('putaway-search-result');
        if (resultSpan) {
            resultSpan.classList.add('hidden');
        }
        
        currentPage = 1;
        totalPages = Math.ceil(filteredPutawayData.length / itemsPerPage);
        
        renderPutawayData(filteredPutawayData);
        renderPagination(filteredPutawayData.length);

    } catch (error) {
        console.error('❌ Lỗi load data:', error);
        const tbody = document.getElementById('putaway-box-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-red-500">Lỗi tải dữ liệu: ' + error.message + '</td></tr>';
        }
        window.notify('❌ Lỗi tải dữ liệu!', true);
    }
}

// ==================== RENDER ====================
function renderPutawayData(dataToRender) {
    const tbody = document.getElementById('putaway-box-tbody');
    if (!tbody) return;

    if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>';
        return;
    }

    // Phân trang
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = dataToRender.slice(start, end);

    tbody.innerHTML = pageData.map(box => {
        const isPending = box.putaway_status === 'pending' || !box.putaway_status;
        const statusClass = isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
        const statusText = isPending ? 'Chờ xử lý' : 'Đã xử lý';
        
        // Đếm SN đã xử lý
        const totalSN = box.box_details?.length || 0;
        const processedSN = box.box_details?.filter(d => d.is_processed)?.length || 0;

        // Format ngày tháng
        const createdDate = box.created_at ? new Date(box.created_at).toLocaleString('vi-VN') : '';
        const putawayDate = box.putaway_date ? new Date(box.putaway_date).toLocaleString('vi-VN') : '';

        return `
            <tr class="hover:bg-gray-50 ${isPending ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-green-400'}">
                <td class="font-bold text-blue-600">${box.box_code || ''}</td>
                <td>${box.po || ''}</td>
                <td>${box.sku || ''}</td>
                <td class="text-center font-medium">${totalSN}</td>
                <td class="text-xs">${createdDate}</td>
                <td>${box.created_by || 'N/A'}</td>
                <td>
                    <span class="${statusClass} px-2 py-1 rounded text-xs font-medium">
                        ${statusText}
                    </span>
                </td>
                <td class="text-center">
                    <button onclick="viewPutawayDetail('${box.box_code}')" 
                        class="text-blue-500 hover:text-blue-700 text-xs font-medium border border-blue-200 px-2 py-1 rounded mb-1 w-full">
                        📋 XEM SN
                    </button>
                    <button onclick="showPutawayHistory('${box.box_code}')" 
                        class="text-purple-500 hover:text-purple-700 text-xs font-medium border border-purple-200 px-2 py-1 rounded w-full">
                        📊 LỊCH SỬ
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Cập nhật thông tin phân trang
    document.getElementById('putaway-start').innerText = start + 1;
    document.getElementById('putaway-end').innerText = Math.min(end, dataToRender.length);
    document.getElementById('putaway-total-items').innerText = dataToRender.length;
}

// ==================== PHÂN TRANG ====================
function renderPagination(totalItems) {
    totalPages = Math.ceil(totalItems / itemsPerPage);
    
    const prevButton = document.getElementById('putaway-prev-page');
    const nextButton = document.getElementById('putaway-next-page');
    const pageInfo = document.getElementById('putaway-page-info');
    
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }
    
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }
    
    if (pageInfo) {
        pageInfo.innerText = `Trang ${currentPage}/${totalPages}`;
    }
}

window.changePage = function(direction) {
    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
    }
    renderPutawayData(filteredPutawayData);
    renderPagination(filteredPutawayData.length);
};

// ==================== XEM CHI TIẾT ====================
window.viewPutawayDetail = async function(boxCode) {
    if (!boxCode) return;

    try {
        const { data: details, error } = await supabaseClient
            .from('box_details')
            .select('serial, is_processed, processed_by, processed_at')
            .eq('box_code', boxCode)
            .eq('is_active', true);

        if (error) throw error;

        if (details?.length) {
            const processed = details.filter(d => d.is_processed).length;
            
            // Tạo nội dung hiển thị
            let snList = '';
            details.forEach((d, index) => {
                const status = d.is_processed ? '✅' : '⏳';
                const processedBy = d.processed_by ? ` (${d.processed_by})` : '';
                const processedAt = d.processed_at ? ` - ${new Date(d.processed_at).toLocaleString('vi-VN')}` : '';
                snList += `${index+1}. ${status} ${d.serial}${processedBy}${processedAt}\n`;
            });
            
            alert(`📦 BOX: ${boxCode}
═══════════════════════════════
📋 Tổng SN: ${details.length}
✅ Đã xử lý: ${processed}
⏳ Chờ xử lý: ${details.length - processed}
═══════════════════════════════

DANH SÁCH SN:
${snList}`);
        } else {
            alert(`📦 Box: ${boxCode}\n📋 Không có SN nào!`);
        }
    } catch (error) {
        console.error('❌ Lỗi:', error);
        window.notify('❌ Lỗi tải chi tiết!', true);
    }
};

// ==================== XEM LỊCH SỬ ====================
window.showPutawayHistory = async function(boxCode) {
    if (!boxCode) return;
    
    try {
        const { data: history, error } = await supabaseClient
            .from('putaway_history')
            .select('*')
            .eq('box_code', boxCode)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (history?.length) {
            let historyText = `📋 LỊCH SỬ XỬ LÝ BOX ${boxCode}\n`;
            historyText += '═══════════════════════════════\n';
            
            history.forEach((item, index) => {
                const time = new Date(item.created_at).toLocaleString('vi-VN');
                historyText += `${index+1}. ${time}\n`;
                historyText += `   - Người: ${item.processed_by}\n`;
                historyText += `   - SN: ${item.serial}\n`;
                historyText += `   - Location: ${item.location}\n`;
            });
            
            alert(historyText);
        } else {
            alert(`📦 Box ${boxCode} chưa có lịch sử xử lý`);
        }
    } catch (error) {
        console.error('❌ Lỗi:', error);
        window.notify('❌ Lỗi tải lịch sử!', true);
    }
};

// ==================== FILTER ====================
window.filterPutawayBoxes = function() {
    loadPutawayData();
};

window.resetPutawayFilter = function() {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    document.getElementById('putaway-from-date').value = lastWeek.toISOString().split('T')[0];
    document.getElementById('putaway-to-date').value = today.toISOString().split('T')[0];
    document.getElementById('putaway-po').value = '';
    document.getElementById('putaway-box-search').value = '';
    document.getElementById('putaway-status').value = 'all';
    
    const resultSpan = document.getElementById('putaway-search-result');
    if (resultSpan) {
        resultSpan.classList.add('hidden');
    }

    loadPutawayData();
};

// ==================== EXPORT EXCEL ====================
window.exportPutawayList = function() {
    if (!putawayData.length) {
        window.notify('❌ Không có dữ liệu để xuất!', true);
        return;
    }

    try {
        const data = putawayData.map(box => {
            const totalSN = box.box_details?.length || 0;
            const processedSN = box.box_details?.filter(d => d.is_processed)?.length || 0;
            
            return {
                'Mã Box': box.box_code,
                'Mã PO': box.po,
                'SKU': box.sku,
                'Tổng SN': totalSN,
                'Đã xử lý': processedSN,
                'Chờ xử lý': totalSN - processedSN,
                'Ngày tạo': box.created_at ? new Date(box.created_at).toLocaleString('vi-VN') : '',
                'Người tạo': box.created_by || '',
                'Trạng thái': box.putaway_status === 'completed' ? 'Đã xử lý' : 'Chờ xử lý',
                'Ngày xử lý': box.putaway_date ? new Date(box.putaway_date).toLocaleString('vi-VN') : '',
                'Người xử lý': box.putaway_by || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PutawayHV');
        XLSX.writeFile(wb, `PutawayHV_${new Date().toISOString().split('T')[0]}.xlsx`);

        window.notify('✅ Đã xuất file Excel!');
    } catch (error) {
        console.error('❌ Lỗi export:', error);
        window.notify('❌ Lỗi xuất Excel!', true);
    }
};

// ==================== KIỂM TRA KẾT NỐI ====================
window.testPutawayConnection = async function() {
    try {
        const { data, error } = await supabaseClient
            .from('boxes')
            .select('count', { count: 'exact', head: true });
            
        if (error) throw error;
        
        window.notify('✅ Kết nối database thành công!');
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối:', error);
        window.notify('❌ Lỗi kết nối database!', true);
        return false;
    }
};

// Khởi tạo khi load
console.log('✅ Putaway HV module loaded - Version 2.0 (Đầy đủ)');
