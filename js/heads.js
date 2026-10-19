// ==========================================
// PANJRAPOLE - Heads Management (admin only)
// ==========================================

async function renderHeads() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="section-header">
        <h3>📋 Donation Heads</h3>
        <button class="btn-accent btn-sm" onclick="showAddHeadModal()">+ Add Head</button>
      </div>
      <div id="heads-list">Loading...</div>
    </div>
  `;
  await loadHeadsList();
}

async function loadHeadsList() {
  const el = document.getElementById('heads-list');
  if (!el) return;
  const { data, error } = await db.from('pj_heads').select('*').order('sort_order');
  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No heads yet.</p></div>`;
    return;
  }
  el.innerHTML = data.map(h => `
    <div class="list-item">
      <div>
        <span class="list-item-name">${h.name}</span>
        ${!h.active ? '<span class="badge badge-locked" style="margin-left:6px;">Inactive</span>' : ''}
      </div>
      <div class="list-item-actions">
        <button class="btn-sm btn-secondary" onclick="showEditHeadModal('${h.id}','${h.name.replace(/'/g, "\\'")}')">✎</button>
        <button class="btn-sm ${h.active ? 'btn-danger' : 'btn-secondary'}" onclick="toggleHeadActive('${h.id}', ${!h.active})">${h.active ? 'Deactivate' : 'Activate'}</button>
      </div>
    </div>
  `).join('');
}

function showAddHeadModal() {
  showModal(`
    <div class="modal-title">+ Add Donation Head</div>
    <div class="form-group">
      <label>Head Name</label>
      <input type="text" id="h-add-name" placeholder="e.g. Shelter Maintenance" />
    </div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="saveAddHead()">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveAddHead() {
  const name = document.getElementById('h-add-name').value.trim();
  if (!name) { showToast('Enter a head name', 'error'); return; }
  const { data: existing } = await db.from('pj_heads').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextOrder = existing && existing[0] ? existing[0].sort_order + 1 : 1;
  const { error } = await db.from('pj_heads').insert({ name, sort_order: nextOrder });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  closeModal();
  showToast('Head added!', 'success');
  await loadHeadsList();
}

function showEditHeadModal(id, name) {
  showModal(`
    <div class="modal-title">Rename Head</div>
    <div class="form-group">
      <label>Head Name</label>
      <input type="text" id="h-edit-name" value="${name}" />
    </div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="saveEditHead('${id}')">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveEditHead(id) {
  const name = document.getElementById('h-edit-name').value.trim();
  if (!name) { showToast('Enter a head name', 'error'); return; }
  const { error } = await db.from('pj_heads').update({ name }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  closeModal();
  showToast('Head renamed!', 'success');
  await loadHeadsList();
}

async function toggleHeadActive(id, newActive) {
  const { error } = await db.from('pj_heads').update({ active: newActive }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast(newActive ? 'Head activated' : 'Head deactivated');
  await loadHeadsList();
}
