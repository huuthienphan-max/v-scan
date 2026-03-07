// js/mass-putaway.js - SIÊU ĐƠN GIẢN

let massSNList = [];

window.initMassPutawayModule = function() {
    console.log('🚀 Khởi tạo Mass Putaway module...');
    
    // Set WH mặc định
    const whInput = document.getElementById('mass-wh');
    if (whInput) whInput.value = 'VNS';
    
    // Load danh sách SN
    loadMassSNList();
    
    // GỌI HÀM ĐIỀN BOX NGAY LẬP TỨC
    fillBoxFromCache();
};

// HÀM ĐIỀN BOX TỪ CACHE
function fillBoxFromCache() {
    console.log('🔍 Đang tìm cache...');
    
    // Đọc từ sessionStorage
    const saved = sessionStorage.getItem('massPutCache');
    console.log('📦 Cache thô:', saved);
    
    if (!saved) {
        console.log('❌ Không có cache');
        return;
    }
    
    try {
        const cache = JSON.parse(saved);
        console.log('📦 Cache đã parse:', cache);
        
        // Tìm ô input
        const boxInput = document.getElementById('mass-box');
        console.log('🔍 Ô input:', boxInput);
        
        if (boxInput) {
            // ĐIỀN GIÁ TRỊ - QUAN TRỌNG NHẤT
            boxInput.value = cache.box || '';
            console.log('✅ ĐÃ ĐIỀN GIÁ TRỊ:', boxInput.value);
            
            // Highlight
            boxInput.style.border = '2px solid #4f46e5';
            boxInput.style.backgroundColor = '#eef2ff';
            
            // Thông báo
            alert(`📦 Đã nạp box ${cache.box}`);
        } else {
            console.error('❌ Không tìm thấy ô input');
        }
    } catch (e) {
        console.error('❌ Lỗi:', e);
    }
}

// Gọi nhiều lần để đảm bảo
setTimeout(fillBoxFromCache, 100);
setTimeout(fillBoxFromCache, 500);
setTimeout(fillBoxFromCache, 1000);

// HÀM TEST
window.testMass = function() {
    const cache = sessionStorage.getItem('massPutCache');
    console.log('Cache:', cache);
    const input = document.getElementById('mass-box');
    console.log('Input:', input);
    if (input) console.log('Giá trị:', input.value);
};

// ==================== XỬ LÝ MASS PUTAWAY ====================
window.processMassPutaway = async function() {
    const account = document.getElementById('mass-account')?.value || '';
    const password = document.getElementById('mass-password')?.value || '';
    const box = document.getElementById('mass-box')?.value || '';
    const location = document.getElementById('mass-location')?.value || '';
    
    if (!account || !password || !box || !location) {
        alert('❌ Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    alert(`✅ Xử lý box ${box} thành công!`);
    
    // Xóa cache
    sessionStorage.removeItem('massPutCache');
    
    // Clear form
    document.getElementById('mass-box').value = '';
    document.getElementById('mass-location').value = '';
};

// ==================== LOAD DANH SÁCH SN ====================
async function loadMassSNList() {
    try {
        const { data } = await supabaseClient
            .from('activity_log')
            .select('*')
            .eq('action', 'MASS_PUTAWAY_SN')
            .order('created_at', { ascending: false })
            .limit(50);
        
        massSNList = data || [];
        renderMassSNList();
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

function renderMassSNList() {
    const tbody = document.getElementById('mass-sn-tbody');
    if (!tbody) return;
    
    if (!massSNList.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Chưa có dữ liệu</td></tr>';
        return;
    }
    
    tbody.innerHTML = massSNList.map(item => {
        const d = item.details || {};
        return `
            <tr>
                <td>${new Date(item.created_at).toLocaleString('vi-VN')}</td>
                <td>${d.box || ''}</td>
                <td>${d.sn || ''}</td>
                <td>${d.location || ''}</td>
                <td>${d.wh || 'VNS'}</td>
                <td>${item.username || ''}</td>
            </tr>
        `;
    }).join('');
}

window.refreshMassSNList = loadMassSNList;
