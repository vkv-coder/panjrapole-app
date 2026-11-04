// ==========================================
// PANJRAPOLE - Reports (admin only)
// ==========================================

let reportRows = []; // cached for Excel export: [{ receipt_no_display, date, donor_name, city, location_name, head_name, amount, payment_mode, remark }]

async function renderReports() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStartStr = todayStr.slice(0, 8) + '01';

  content.innerHTML = `
    <div class="card">
      <div class="card-title">📊 Reports</div>
      <div class="form-group">
        <label>From Date</label>
        <input type="date" id="rp-from" value="${monthStartStr}" />
      </div>
      <div class="form-group">
        <label>To Date</label>
        <input type="date" id="rp-to" value="${todayStr}" />
      </div>
      <div class="btn-row">
        <button class="btn-primary" style="width:auto;" onclick="runReport()">Run Report</button>
        <button class="btn-secondary" onclick="downloadReportExcel()">⬇ Excel</button>
      </div>
    </div>
    <div id="report-results"></div>
  `;
  await runReport();
}

async function runReport() {
  const el = document.getElementById('report-results');
  el.innerHTML = 'Loading...';

  const from = document.getElementById('rp-from').value;
  const to = document.getElementById('rp-to').value;

  const { data: receipts, error } = await db.from('pj_receipts')
    .select('*')
    .gte('receipt_date', from)
    .lte('receipt_date', to)
    .order('receipt_no');
  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }

  const receiptIds = (receipts || []).map(r => r.id);
  let items = [];
  if (receiptIds.length) {
    const { data: itemsData } = await db.from('pj_receipt_items').select('*').in('receipt_id', receiptIds);
    items = itemsData || [];
  }
  const [{ data: heads }, { data: locations }] = await Promise.all([
    db.from('pj_heads').select('*'),
    db.from('pj_locations').select('*')
  ]);
  const headsById = {};
  (heads || []).forEach(h => { headsById[h.id] = h; });
  const locationsById = {};
  (locations || []).forEach(l => { locationsById[l.id] = l; });

  const itemsByReceipt = {};
  items.forEach(it => {
    if (!itemsByReceipt[it.receipt_id]) itemsByReceipt[it.receipt_id] = [];
    itemsByReceipt[it.receipt_id].push(it);
  });

  reportRows = [];
  const headTotals = {};
  const locationTotals = {};
  let grandTotal = 0;

  (receipts || []).forEach(r => {
    const loc = locationsById[r.location_id];
    const locName = loc ? loc.name : 'Unknown';
    const receiptNoDisplay = formatReceiptNo(loc && loc.prefix, r.receipt_no);
    (itemsByReceipt[r.id] || []).forEach(it => {
      const head = headsById[it.head_id];
      const headName = (head && head.name) || 'Head';
      const amt = it.amount == null ? null : parseFloat(it.amount);
      const isInKind = !!(head && head.is_in_kind);
      reportRows.push({
        receipt_no_display: receiptNoDisplay, date: r.receipt_date, donor_name: r.donor_name, city: r.donor_city,
        location_name: locName, head_name: headName, amount: amt, payment_mode: r.payment_mode, remark: it.remark || '', is_in_kind: isInKind
      });
      // In Kind heads never count toward any total - item name only.
      if (!isInKind && amt) {
        headTotals[headName] = (headTotals[headName] || 0) + amt;
        locationTotals[locName] = (locationTotals[locName] || 0) + amt;
        grandTotal += amt;
      }
    });
  });

  el.innerHTML = `
    <div class="card" style="background:var(--primary);color:white;text-align:center;">
      <div style="font-size:13px;opacity:0.8;margin-bottom:4px;">Total (${receipts ? receipts.length : 0} receipts)</div>
      <div style="font-size:32px;font-weight:800;">${formatAmount(grandTotal)}</div>
    </div>
    <div class="card">
      <div class="card-title">By Location</div>
      <div class="total-grid">
        ${Object.keys(locationTotals).map(name => `
          <div class="total-card">
            <div class="head-name">${name}</div>
            <div class="total-amount">${formatAmount(locationTotals[name])}</div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);font-size:13px;">No donations in this range.</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-title">By Head</div>
      <div class="total-grid">
        ${Object.keys(headTotals).map(name => `
          <div class="total-card">
            <div class="head-name">${name}</div>
            <div class="total-amount">${formatAmount(headTotals[name])}</div>
          </div>
        `).join('') || '<p style="color:var(--text-muted);font-size:13px;">No donations in this range.</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-title">By Receipt</div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>No.</th><th>Date</th><th>Location</th><th>Donor</th><th>City</th><th>Amount</th><th>Pay</th></tr></thead>
          <tbody>
            ${(receipts || []).map(r => {
              const loc = locationsById[r.location_id];
              return `
              <tr>
                <td>${formatReceiptNo(loc && loc.prefix, r.receipt_no)}</td>
                <td>${formatDate(r.receipt_date)}</td>
                <td>${loc ? loc.name : '—'}</td>
                <td>${r.donor_name}</td>
                <td>${r.donor_city}</td>
                <td><strong>${formatAmount(r.total_amount)}</strong></td>
                <td><span class="badge ${paymentBadgeClass(r.payment_mode)}">${r.payment_mode}</span></td>
              </tr>
            `; }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No receipts in this range.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function downloadReportExcel() {
  if (typeof XLSX === 'undefined') { showToast('Excel library not loaded. Check internet connection.', 'error'); return; }
  if (reportRows.length === 0) { showToast('Run a report first', 'error'); return; }

  const detailRows = [['Receipt No', 'Date', 'Location', 'Donor', 'City', 'Head', 'Amount', 'Payment Mode', 'Remark']];
  reportRows.forEach(r => detailRows.push([r.receipt_no_display, r.date, r.location_name, r.donor_name, r.city, r.head_name, r.amount, r.payment_mode, r.remark]));
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 24 }];

  const headTotals = {};
  reportRows.forEach(r => { if (r.amount && !r.is_in_kind) headTotals[r.head_name] = (headTotals[r.head_name] || 0) + r.amount; });
  const headRows = [['Head', 'Total']];
  Object.keys(headTotals).forEach(name => headRows.push([name, headTotals[name]]));
  const wsHead = XLSX.utils.aoa_to_sheet(headRows);
  wsHead['!cols'] = [{ wch: 28 }, { wch: 12 }];

  const locationTotals = {};
  reportRows.forEach(r => { if (r.amount && !r.is_in_kind) locationTotals[r.location_name] = (locationTotals[r.location_name] || 0) + r.amount; });
  const locationRows = [['Location', 'Total']];
  Object.keys(locationTotals).forEach(name => locationRows.push([name, locationTotals[name]]));
  const wsLocation = XLSX.utils.aoa_to_sheet(locationRows);
  wsLocation['!cols'] = [{ wch: 24 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetail, 'By Receipt');
  XLSX.utils.book_append_sheet(wb, wsHead, 'By Head');
  XLSX.utils.book_append_sheet(wb, wsLocation, 'By Location');

  const from = document.getElementById('rp-from').value;
  const to = document.getElementById('rp-to').value;
  XLSX.writeFile(wb, `Panjrapole_Donations_${from}_to_${to}.xlsx`);
  showToast('✅ Excel downloaded!', 'success');
}
