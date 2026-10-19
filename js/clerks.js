// ==========================================
// PANJRAPOLE - Clerks / Users Management (admin only)
// ==========================================

async function renderClerks() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="card-title">👤 Accountant &amp; Admin Accounts</div>
      <p style="font-size:12px;color:var(--text-muted);">New sign-ups (signup.html) appear here as pending — activate them to let them log in.</p>
      <div id="clerks-list">Loading...</div>
    </div>
  `;
  await loadClerksList();
}

async function loadClerksList() {
  const el = document.getElementById('clerks-list');
  if (!el) return;
  const { data, error } = await db.from('pj_profiles').select('*').order('created_at', { ascending: false });
  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state"><p>No accounts yet.</p></div>`;
    return;
  }

  el.innerHTML = data.map(p => `
    <div class="list-item">
      <div>
        <span class="list-item-name">${p.name}</span>
        <span class="badge ${p.role === 'admin' ? 'badge-online' : 'badge-cash'}" style="margin-left:6px;">${p.role}</span>
        <span class="badge ${p.active ? 'badge-open' : 'badge-locked'}" style="margin-left:4px;">${p.active ? 'Active' : 'Pending'}</span>
      </div>
      <div class="list-item-actions">
        ${!p.active ? `<button class="btn-sm btn-accent" onclick="setProfile('${p.id}','${p.role}',true)">Activate</button>` : ''}
        ${p.active && p.id !== currentUser.id ? `<button class="btn-sm btn-danger" onclick="setProfile('${p.id}','${p.role}',false)">Deactivate</button>` : ''}
        ${p.role === 'clerk' ? `<button class="btn-sm btn-secondary" onclick="setProfile('${p.id}','admin',${p.active})">Make Admin</button>` : ''}
        ${p.role === 'admin' && p.id !== currentUser.id ? `<button class="btn-sm btn-secondary" onclick="setProfile('${p.id}','clerk',${p.active})">Make Accountant</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function setProfile(id, role, active) {
  const { error } = await db.rpc('pj_admin_set_profile', { p_id: id, p_role: role, p_active: active });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Updated!', 'success');
  await loadClerksList();
}
