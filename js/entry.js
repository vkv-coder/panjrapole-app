// ==========================================
// PANJRAPOLE - Donation Entry
// ==========================================

let entryHeads = [];
let entryCart = []; // [{ head_id, head_name, amount, remark }]
let editingReceiptId = null; // non-null while editing an existing receipt

async function renderEntry() {
  const content = document.getElementById('page-content');
  const { data: heads } = await db.from('pj_heads').select('*').eq('active', true).order('sort_order');
  entryHeads = heads || [];
  entryCart = [];
  editingReceiptId = null;

  content.innerHTML = `
    <div class="card">
      <div class="card-title" id="entry-card-title">🙏 New Donation Receipt</div>
      <div class="form-group">
        <label>Donor Name *</label>
        <input type="text" id="e-name" placeholder="Donor's full name" />
      </div>
      <div class="form-group">
        <label>WhatsApp No. *</label>
        <input type="tel" id="e-whatsapp" placeholder="10-digit WhatsApp number" maxlength="10" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label>City *</label>
        <input type="text" id="e-city" placeholder="City" />
      </div>
      <div class="form-group">
        <label>Address (optional)</label>
        <input type="text" id="e-address" placeholder="Address" />
      </div>
      <div class="form-group">
        <label>Email (optional)</label>
        <input type="email" id="e-email" placeholder="Email" />
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;text-transform:none;font-size:13px;">
          <input type="checkbox" id="e-want-80g" style="width:auto;" onchange="onWant80gChange()" />
          Donor wants an 80G tax-benefit receipt
        </label>
      </div>
      <div class="form-group" id="e-pan-group" style="display:none;">
        <label>PAN No. *</label>
        <input type="text" id="e-pan" placeholder="PAN Number" style="text-transform:uppercase;" maxlength="10" />
      </div>
    </div>

    <div class="card">
      <div class="section-header">
        <h3>📋 Donation Heads</h3>
        <button class="btn-accent btn-sm" onclick="addCartRow()">+ Add Head</button>
      </div>
      <div id="cart-list"><p style="color:var(--text-muted);font-size:13px;">No heads added yet — click "+ Add Head".</p></div>
      <div id="cart-total" style="margin-top:10px;font-weight:700;color:var(--primary);"></div>
    </div>

    <div class="card">
      <div class="card-title">💳 Payment</div>
      <div class="form-group">
        <label>Payment Mode *</label>
        <select id="e-payment-mode" onchange="onPaymentModeChange()">
          <option value="cash">💵 Cash</option>
          <option value="online">📱 Online</option>
          <option value="cheque">🏦 Cheque</option>
        </select>
      </div>
      <div class="form-group" id="e-ref-group" style="display:none;">
        <label id="e-ref-label">Transaction / Reference No. *</label>
        <input type="text" id="e-payment-ref" placeholder="UPI / Bank transaction no." />
      </div>
      <div class="form-group" id="e-cheque-group" style="display:none;">
        <label>Cheque No. *</label>
        <input type="text" id="e-cheque-no" placeholder="Cheque number" />
      </div>
      <div class="form-group" id="e-cheque-date-group" style="display:none;">
        <label>Cheque Date</label>
        <input type="date" id="e-cheque-date" />
      </div>
      <div class="form-group" id="e-bank-group" style="display:none;">
        <label>Bank Name</label>
        <input type="text" id="e-bank-name" placeholder="Bank name" />
      </div>
      <button class="btn-primary" id="e-save-btn" onclick="saveReceipt()">💾 Save Receipt</button>
      <div id="e-cancel-edit" style="display:none;margin-top:10px;text-align:center;">
        <a href="javascript:void(0)" style="font-size:13px;color:var(--text-muted);" onclick="renderEntry()">Cancel edit</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🧾 Today's Entries ${isAdmin() ? '(All Clerks)' : '(by me)'}</div>
      <div id="today-entries">Loading...</div>
    </div>
  `;

  renderCartList();
  await loadTodayEntries();
}

function onWant80gChange() {
  const checked = document.getElementById('e-want-80g').checked;
  document.getElementById('e-pan-group').style.display = checked ? 'block' : 'none';
}

function onPaymentModeChange() {
  const mode = document.getElementById('e-payment-mode').value;
  document.getElementById('e-ref-group').style.display = mode === 'online' ? 'block' : 'none';
  document.getElementById('e-cheque-group').style.display = mode === 'cheque' ? 'block' : 'none';
  document.getElementById('e-cheque-date-group').style.display = mode === 'cheque' ? 'block' : 'none';
  document.getElementById('e-bank-group').style.display = (mode === 'cheque' || mode === 'online') ? 'block' : 'none';
  const refLabel = document.getElementById('e-ref-label');
  if (refLabel) refLabel.textContent = 'Transaction / UPI Reference No. *';
}

function addCartRow() {
  entryCart.push({ head_id: '', head_name: '', amount: '', remark: '' });
  renderCartList();
}

function removeCartRow(index) {
  entryCart.splice(index, 1);
  renderCartList();
}

function updateCartRow(index, field, value) {
  entryCart[index][field] = value;
  if (field === 'head_id') {
    const h = entryHeads.find(x => x.id === value);
    entryCart[index].head_name = h ? h.name : '';
  }
  renderCartTotalOnly();
}

function renderCartList() {
  const el = document.getElementById('cart-list');
  if (!el) return;
  if (entryCart.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No heads added yet — click "+ Add Head".</p>`;
    document.getElementById('cart-total').textContent = '';
    return;
  }
  el.innerHTML = entryCart.map((row, i) => `
    <div class="cart-row" style="flex-wrap:wrap;">
      <select class="cart-head-name" onchange="updateCartRow(${i},'head_id',this.value)">
        <option value="">-- Select Head --</option>
        ${entryHeads.map(h => `<option value="${h.id}" ${row.head_id === h.id ? 'selected' : ''}>${h.name}</option>`).join('')}
      </select>
      <div class="amount-input-wrap cart-amount">
        <input type="number" min="1" placeholder="0" value="${row.amount}" oninput="updateCartRow(${i},'amount',this.value)" />
      </div>
      <button class="btn-sm btn-danger" onclick="removeCartRow(${i})">✕</button>
      <input type="text" placeholder="Remark (optional)" value="${row.remark || ''}" style="flex-basis:100%;margin-top:6px;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;" oninput="updateCartRow(${i},'remark',this.value)" />
    </div>
  `).join('');
  renderCartTotalOnly();
}

function renderCartTotalOnly() {
  const totalEl = document.getElementById('cart-total');
  if (!totalEl) return;
  const total = entryCart.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  totalEl.textContent = entryCart.length ? ('Total: ' + formatAmount(total)) : '';
}

function buildItemsPayload() {
  const items = [];
  for (const row of entryCart) {
    const amt = parseFloat(row.amount);
    if (!row.head_id || !amt || amt <= 0) continue;
    items.push({ head_id: row.head_id, amount: amt, remark: (row.remark || '').trim() || null });
  }
  return items;
}

async function saveReceipt() {
  const btn = document.getElementById('e-save-btn');
  const name = document.getElementById('e-name').value.trim();
  const whatsapp = document.getElementById('e-whatsapp').value.trim();
  const city = document.getElementById('e-city').value.trim();
  const address = document.getElementById('e-address').value.trim();
  const email = document.getElementById('e-email').value.trim();
  const want80g = document.getElementById('e-want-80g').checked;
  const pan = document.getElementById('e-pan').value.trim().toUpperCase();
  const paymentMode = document.getElementById('e-payment-mode').value;
  const paymentRef = document.getElementById('e-payment-ref').value.trim();
  const chequeNo = document.getElementById('e-cheque-no').value.trim();
  const chequeDate = document.getElementById('e-cheque-date').value || null;
  const bankName = document.getElementById('e-bank-name').value.trim();

  if (!name) { showToast('Enter donor name', 'error'); return; }
  if (whatsapp.length !== 10) { showToast('Enter a valid 10-digit WhatsApp number', 'error'); return; }
  if (!city) { showToast('Enter city', 'error'); return; }
  if (want80g && !pan) { showToast('PAN is required for an 80G receipt', 'error'); return; }
  if (paymentMode === 'online' && !paymentRef) { showToast('Enter the transaction/reference number', 'error'); return; }
  if (paymentMode === 'cheque' && !chequeNo) { showToast('Enter the cheque number', 'error'); return; }

  const items = buildItemsPayload();
  if (items.length === 0) { showToast('Add at least one donation head with an amount', 'error'); return; }

  const rpcArgs = {
    p_donor_name: name, p_donor_whatsapp: whatsapp, p_donor_city: city,
    p_donor_address: address || null, p_donor_email: email || null, p_donor_pan: pan || null,
    p_want_80g: want80g, p_payment_mode: paymentMode, p_payment_ref: paymentRef || null,
    p_bank_name: bankName || null, p_cheque_no: chequeNo || null, p_cheque_date: chequeDate,
    p_items: items
  };

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    let result;
    if (editingReceiptId) {
      result = await db.rpc('pj_update_receipt', { p_receipt_id: editingReceiptId, ...rpcArgs });
      if (result.error) { showToast('Error: ' + result.error.message, 'error'); return; }
      showToast('✅ Receipt updated', 'success');
      await renderEntry();
      return;
    }

    result = await db.rpc('pj_create_receipt', { p_receipt_date: new Date().toISOString().slice(0, 10), ...rpcArgs });
    if (result.error) { showToast('Error: ' + result.error.message, 'error'); return; }

    const row = result.data && result.data[0];
    showToast(`✅ Receipt No. ${row.receipt_no} saved`, 'success');
    await renderEntry();
    if (row && row.id) await showReceiptPrintWindow(row.id, true);
  } finally {
    if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = editingReceiptId ? '💾 Update Receipt' : '💾 Save Receipt'; }
  }
}

async function loadTodayEntries() {
  const el = document.getElementById('today-entries');
  if (!el) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db.from('pj_receipts')
    .select('*')
    .eq('receipt_date', today)
    .order('created_at', { ascending: false });

  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }
  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><p>No entries yet today.</p></div>`;
    return;
  }

  el.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>No.</th><th>Donor</th><th>Amount</th><th>Pay</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>${r.receipt_no}</td>
              <td>${r.donor_name}<div class="list-item-sub">${r.donor_city}</div></td>
              <td><strong>${formatAmount(r.total_amount)}</strong></td>
              <td><span class="badge ${paymentBadgeClass(r.payment_mode)}">${r.payment_mode}</span></td>
              <td><span class="badge ${r.locked ? 'badge-locked' : 'badge-open'}">${r.locked ? 'Printed' : 'Open'}</span></td>
              <td>
                <div class="list-item-actions">
                  <button class="btn-sm btn-secondary" onclick="showReceiptPrintWindow('${r.id}', false)">🖨</button>
                  ${(!r.locked || isAdmin()) ? `<button class="btn-sm btn-secondary" onclick="editReceipt('${r.id}')">✎</button>` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function editReceipt(receiptId) {
  const { data: r, error } = await db.from('pj_receipts').select('*').eq('id', receiptId).single();
  if (error || !r) { showToast('Could not load receipt', 'error'); return; }
  if (r.locked && !isAdmin()) { showToast('This receipt is printed and locked — only an admin can edit it.', 'error'); return; }

  const { data: items } = await db.from('pj_receipt_items').select('*').eq('receipt_id', receiptId);

  editingReceiptId = receiptId;
  document.getElementById('entry-card-title').textContent = `✎ Edit Receipt No. ${r.receipt_no}`;
  document.getElementById('e-name').value = r.donor_name || '';
  document.getElementById('e-whatsapp').value = r.donor_whatsapp || '';
  document.getElementById('e-city').value = r.donor_city || '';
  document.getElementById('e-address').value = r.donor_address || '';
  document.getElementById('e-email').value = r.donor_email || '';
  document.getElementById('e-want-80g').checked = !!r.want_80g;
  document.getElementById('e-pan').value = r.donor_pan || '';
  onWant80gChange();
  document.getElementById('e-payment-mode').value = r.payment_mode;
  document.getElementById('e-payment-ref').value = r.payment_ref || '';
  document.getElementById('e-cheque-no').value = r.cheque_no || '';
  document.getElementById('e-cheque-date').value = r.cheque_date || '';
  document.getElementById('e-bank-name').value = r.bank_name || '';
  onPaymentModeChange();
  document.getElementById('e-save-btn').textContent = '💾 Update Receipt';
  document.getElementById('e-cancel-edit').style.display = 'block';

  entryCart = (items || []).map(it => ({ head_id: it.head_id, head_name: '', amount: it.amount, remark: it.remark || '' }));
  renderCartList();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
