// ==========================================
// PANJRAPOLE - Reports (admin only)
// ==========================================

let reportRows = []; // cached for Excel export: [{ receipt_no, date, donor_name, city, head_name, amount, payment_mode }]

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
  const { data: heads } = await db.from('pj_heads').select('*');
  const headsById = {};
  (heads || []).forEach(h => { headsById[h.id] = h; });

  const itemsByReceipt = {};
  items.forEach(it => {
    if (!itemsByReceipt[it.receipt_id]) itemsByReceipt[it.receipt_id] = [];
    itemsByReceipt[it.receipt_id].push(it);
  });

  reportRows = [];
  const headTotals = {};
  let grandTotal = 0;

  (receipts || []).forEach(r => {
    (itemsByReceipt[r.id] || []).forEach(it => {
      const headName = (headsById[it.head_id] && headsById[it.head_id].name) || 'Head';
      reportRows.push({
        receipt_no: r.receipt_no, date: r.receipt_date, donor_name: r.donor_name, city: r.donor_city,
        head_name: headName, amount: parseFloat(it.amount), payment_mode: r.payment_mode
      });
      headTotals[headName] = (headTotals[headName] || 0) + parseFloat(it.amount);
      grandTotal += parseFloat(it.amount);
    });
  });

  el.innerHTML = `
    <div class="card" style="background:var(--primary);color:white;text-align:center;">
      <div style="font-size:13px;opacity:0.8;margin-bottom:4px;">Total (${receipts ? receipts.length : 0} receipts)</div>
      <div style="font-size:32px;font-weight:800;">${formatAmount(grandTotal)}</div>
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
          <thead><tr><th>No.</th><th>Date</th><th>Donor</th><th>City</th><th>Amount</th><th>Pay</th></tr></thead>
          <tbody>
            ${(receipts || []).map(r => `
              <tr>
                <td>${r.receipt_no}</td>
                <td>${formatDate(r.receipt_date)}</td>
                <td>${r.donor_name}</td>
                <td>${r.donor_city}</td>
                <td><strong>${formatAmount(r.total_amount)}</strong></td>
                <td><span class="badge ${r.payment_mode === 'cash' ? 'badge-cash' : 'badge-online'}">${r.payment_mode}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No receipts in this range.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function downloadReportExcel() {
  if (typeof XLSX === 'undefined') { showToast('Excel library not loaded. Check internet connection.', 'error'); return; }
  if (reportRows.length === 0) { showToast('Run a report first', 'error'); return; }

  const detailRows = [['Receipt No', 'Date', 'Donor', 'City', 'Head', 'Amount', 'Payment Mode']];
  reportRows.forEach(r => detailRows.push([r.receipt_no, r.date, r.donor_name, r.city, r.head_name, r.amount, r.payment_mode]));
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 10 }];

  const headTotals = {};
  reportRows.forEach(r => { headTotals[r.head_name] = (headTotals[r.head_name] || 0) + r.amount; });
  const headRows = [['Head', 'Total']];
  Object.keys(headTotals).forEach(name => headRows.push([name, headTotals[name]]));
  const wsHead = XLSX.utils.aoa_to_sheet(headRows);
  wsHead['!cols'] = [{ wch: 28 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetail, 'By Receipt');
  XLSX.utils.book_append_sheet(wb, wsHead, 'By Head');

  const from = document.getElementById('rp-from').value;
  const to = document.getElementById('rp-to').value;
  XLSX.writeFile(wb, `Panjrapole_Donations_${from}_to_${to}.xlsx`);
  showToast('✅ Excel downloaded!', 'success');
}
