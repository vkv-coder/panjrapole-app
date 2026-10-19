// ==========================================
// PANJRAPOLE - Receipts Search (admin only)
// ==========================================

async function renderReceipts() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  content.innerHTML = `
    <div class="card">
      <div class="card-title">🧾 Search Receipts</div>
      <div class="form-group">
        <label>Receipt No.</label>
        <input type="number" id="rs-no" placeholder="e.g. 43371" />
      </div>
      <div class="form-group">
        <label>From Date</label>
        <input type="date" id="rs-from" />
      </div>
      <div class="form-group">
        <label>To Date</label>
        <input type="date" id="rs-to" value="${todayStr}" />
      </div>
      <div class="form-group">
        <label>Donor Name Contains</label>
        <input type="text" id="rs-name" placeholder="Search by name" />
      </div>
      <button class="btn-primary" onclick="searchReceipts()">🔍 Search</button>
    </div>
    <div id="rs-results"></div>
  `;

  await searchReceipts();
}

async function searchReceipts() {
  const el = document.getElementById('rs-results');
  el.innerHTML = 'Loading...';

  const no = document.getElementById('rs-no').value.trim();
  const from = document.getElementById('rs-from').value;
  const to = document.getElementById('rs-to').value;
  const name = document.getElementById('rs-name').value.trim();

  let q = db.from('pj_receipts').select('*').order('receipt_no', { ascending: false }).limit(200);
  if (no) q = q.eq('receipt_no', parseInt(no, 10));
  if (from) q = q.gte('receipt_date', from);
  if (to) q = q.lte('receipt_date', to);
  if (name) q = q.ilike('donor_name', `%${name}%`);

  const { data, error } = await q;
  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-icon">🧾</div><p>No receipts found.</p></div></div>`;
    return;
  }

  el.innerHTML = `
    <div class="card">
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>No.</th><th>Date</th><th>Donor</th><th>Amount</th><th>Pay</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td>${r.receipt_no}</td>
                <td>${formatDate(r.receipt_date)}</td>
                <td>${r.donor_name}<div class="list-item-sub">${r.donor_city} · ${r.donor_whatsapp}</div></td>
                <td><strong>${formatAmount(r.total_amount)}</strong></td>
                <td><span class="badge ${paymentBadgeClass(r.payment_mode)}">${r.payment_mode}</span></td>
                <td><span class="badge ${r.locked ? 'badge-locked' : 'badge-open'}">${r.locked ? 'Printed' : 'Open'}</span></td>
                <td>
                  <div class="list-item-actions">
                    <button class="btn-sm btn-secondary" onclick="showReceiptPrintWindow('${r.id}', false)">🖨</button>
                    <button class="btn-sm btn-secondary" onclick="openReceiptForEdit('${r.id}')">✎ Edit</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
