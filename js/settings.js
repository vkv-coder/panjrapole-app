// ==========================================
// PANJRAPOLE - Settings (admin only)
// ==========================================

let settingsStartingNo = null;

async function renderSettings() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  const { data: settings } = await db.from('pj_settings').select('*').eq('id', 1).single();
  const { data: counter } = await db.from('pj_receipt_counter').select('*').eq('id', 1).single();
  const started = counter && counter.next_no !== null;
  const s = settings || {};
  settingsStartingNo = s.starting_receipt_no || null;

  content.innerHTML = `
    <div class="card">
      <div class="card-title">🏢 Receipt Header Details</div>
      <div class="form-group">
        <label>Organisation Name</label>
        <input type="text" id="st-org-name" value="${s.org_name || ''}" />
      </div>
      <div class="form-group">
        <label>Address</label>
        <input type="text" id="st-org-address" value="${s.org_address || ''}" />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="text" id="st-org-phone" value="${s.org_phone || ''}" />
      </div>
      <div class="form-group">
        <label>PAN No.</label>
        <input type="text" id="st-org-pan" value="${s.org_pan || ''}" />
      </div>
      <div class="form-group">
        <label>Starting Receipt No. ${started ? '(locked — receipts already started)' : ''}</label>
        <input type="number" id="st-start-no" value="${s.starting_receipt_no || ''}" ${started ? 'disabled' : ''} placeholder="e.g. 43371" />
        ${started
          ? `<p class="form-hint">Next receipt will be No. ${counter.next_no}. The starting number can no longer be changed once receipts have begun.</p>`
          : `<p class="form-hint">Set this to the number right after your last manual paper receipt, just before you start using this system for real. Can be changed any time until the first receipt is saved.</p>`}
      </div>
      <button class="btn-primary" onclick="saveSettings(${started})">💾 Save</button>
    </div>
  `;
}

async function saveSettings(started) {
  const orgName = document.getElementById('st-org-name').value.trim();
  const orgAddress = document.getElementById('st-org-address').value.trim();
  const orgPhone = document.getElementById('st-org-phone').value.trim();
  const orgPan = document.getElementById('st-org-pan').value.trim();
  const startNoRaw = document.getElementById('st-start-no').value;
  const startNo = started ? null : (startNoRaw ? parseInt(startNoRaw, 10) : null);

  if (!started && !startNo) { showToast('Enter a starting receipt number', 'error'); return; }

  const { error } = await db.rpc('pj_update_settings', {
    p_org_name: orgName || null,
    p_org_address: orgAddress || null,
    p_org_phone: orgPhone || null,
    p_org_pan: orgPan || null,
    p_starting_receipt_no: started ? settingsStartingNo : startNo
  });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('✅ Settings saved', 'success');
  await renderSettings();
}
