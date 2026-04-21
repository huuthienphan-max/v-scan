let currentUID = null;
let snList = [];

function detectType(code) {
    if (code.startsWith('UID')) return 'uid';
    return 'sn';
}

window.handleScanInput = function(e) {
    if (e.key !== 'Enter') return;

    const input = e.target;
    const code = input.value.trim();
    input.value = '';

    if (!code) return;

    const type = detectType(code);

    if (type === 'uid') {
        currentUID = code;
        snList = [];

        document.getElementById('current-uid').innerText = code;
        document.getElementById('sn-list').innerHTML = '';

        notify(`📦 UID: ${code}`);
    } else {
        if (!currentUID) {
            notify('❌ Scan UID trước!', true);
            return;
        }

        snList.push(code);
        renderSNList();

        notify(`➕ SN: ${code}`);
    }
};

function renderSNList() {
    const container = document.getElementById('sn-list');

    container.innerHTML = snList.map(sn => `
        <div class="border px-2 py-1 rounded mb-1">${sn}</div>
    `).join('');
}

window.saveMappingCombo = async function() {
    if (!currentUID || snList.length === 0) {
        notify('❌ Thiếu UID hoặc SN', true);
        return;
    }

    try {
        const { data: uidData, error: uidError } = await supabaseClient
            .from('uid_master')
            .upsert({
                uid: currentUID,
                created_by: currentUser
            })
            .select()
            .single();

        if (uidError) throw uidError;

        const rows = snList.map(sn => ({
            uid_id: uidData.id,
            sn
        }));

        const { error: snError } = await supabaseClient
            .from('uid_sn_items')
            .insert(rows);

        if (snError) throw snError;

        notify(`✅ Saved ${snList.length} SN`);
        resetMapping();

    } catch (err) {
        console.error(err);
        notify('❌ Lỗi lưu mapping', true);
    }
};

window.resetMapping = function() {
    currentUID = null;
    snList = [];

    document.getElementById('current-uid').innerText = '-';
    document.getElementById('sn-list').innerHTML = '';
};

window.searchMapping = async function() {
    const key = document.getElementById('search-key').value.trim();
    if (!key) return;

    const { data, error } = await supabaseClient
        .from('uid_sn_items')
        .select(`
            sn,
            uid_master (uid)
        `)
        .or(`sn.eq.${key},uid_master.uid.eq.${key}`);

    if (error) {
        notify('❌ Lỗi tìm kiếm', true);
        return;
    }

    const container = document.getElementById('search-result');

    if (!data.length) {
        container.innerHTML = `<p class="text-red-500">Không tìm thấy</p>`;
        return;
    }

    container.innerHTML = data.map(x => `
        <div class="border p-2 mb-2 rounded">
            UID: <b>${x.uid_master.uid}</b><br>
            SN: <b>${x.sn}</b>
        </div>
    `).join('');
};