// ==========================================
// PANJRAPOLE - Locations Management (admin only)
// ==========================================

async function renderLocations() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="section-header">
        <h3>📍 Locations</h3>
        <button class="btn-accent btn-sm" onclick="showAddLocationModal()">+ Add Location</button>
      </div>
      <p style="font-size:12px;color:var(--text-muted);">Every receipt is tagged with one of these when it's entered — the prefix shows on the printed receipt number (e.g. S-47). Receipt numbers themselves are one shared series across all locations.</p>
      <div id="locations-list">Loading...</div>
    </div>
  `;
  await loadLocationsList();
}

async function loadLocationsList() {
  const el = document.getElementById('locations-list');
  if (!el) return;
  const { data, error } = await db.from('pj_locations').select('*').order('sort_order');
  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No locations yet.</p></div>`;
    return;
  }
  el.innerHTML = data.map(l => `
    <div class="list-item">
      <div>
        <span class="list-item-name">${l.name}</span>
        <span class="badge badge-online" style="margin-left:6px;">${l.prefix}</span>
        ${!l.active ? '<span class="badge badge-locked" style="margin-left:4px;">Inactive</span>' : ''}
      </div>
      <div class="list-item-actions">
        <button class="btn-sm btn-secondary" onclick="showEditLocationModal('${l.id}','${l.name.replace(/'/g, "\\'")}','${l.prefix.replace(/'/g, "\\'")}')">✎</button>
        <button class="btn-sm ${l.active ? 'btn-danger' : 'btn-secondary'}" onclick="toggleLocationActive('${l.id}', ${!l.active})">${l.active ? 'Deactivate' : 'Activate'}</button>
      </div>
    </div>
  `).join('');
}

function showAddLocationModal() {
  showModal(`
    <div class="modal-title">+ Add Location</div>
    <div class="form-group">
      <label>Location Name</label>
      <input type="text" id="l-add-name" placeholder="e.g. Sayajipura Panjrapole" />
    </div>
    <div class="form-group">
      <label>Prefix Letter</label>
      <input type="text" id="l-add-prefix" placeholder="e.g. S" maxlength="3" style="text-transform:uppercase;" />
    </div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="saveAddLocation()">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveAddLocation() {
  const name = document.getElementById('l-add-name').value.trim();
  const prefix = document.getElementById('l-add-prefix').value.trim().toUpperCase();
  if (!name) { showToast('Enter a location name', 'error'); return; }
  if (!prefix) { showToast('Enter a prefix letter', 'error'); return; }
  const { data: existing } = await db.from('pj_locations').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextOrder = existing && existing[0] ? existing[0].sort_order + 1 : 1;
  const { error } = await db.from('pj_locations').insert({ name, prefix, sort_order: nextOrder });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  closeModal();
  showToast('Location added!', 'success');
  await loadLocationsList();
}

function showEditLocationModal(id, name, prefix) {
  showModal(`
    <div class="modal-title">Edit Location</div>
    <div class="form-group">
      <label>Location Name</label>
      <input type="text" id="l-edit-name" value="${name}" />
    </div>
    <div class="form-group">
      <label>Prefix Letter</label>
      <input type="text" id="l-edit-prefix" value="${prefix}" maxlength="3" style="text-transform:uppercase;" />
    </div>
    <div class="modal-actions">
      <button class="btn-primary" onclick="saveEditLocation('${id}')">Save</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

async function saveEditLocation(id) {
  const name = document.getElementById('l-edit-name').value.trim();
  const prefix = document.getElementById('l-edit-prefix').value.trim().toUpperCase();
  if (!name) { showToast('Enter a location name', 'error'); return; }
  if (!prefix) { showToast('Enter a prefix letter', 'error'); return; }
  const { error } = await db.from('pj_locations').update({ name, prefix }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  closeModal();
  showToast('Location updated!', 'success');
  await loadLocationsList();
}

async function toggleLocationActive(id, newActive) {
  const { error } = await db.from('pj_locations').update({ active: newActive }).eq('id', id);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast(newActive ? 'Location activated' : 'Location deactivated');
  await loadLocationsList();
}
