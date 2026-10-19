// ==========================================
// PANJRAPOLE - Live Totals (admin only)
// ==========================================

let liveSubscription = null;

async function renderLive() {
  const content = document.getElementById('page-content');

  if (!isAdmin()) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:12px;">🔒</div><p style="color:var(--danger);font-weight:600;">Admin access only.</p></div>`;
    return;
  }

  content.innerHTML = `
    <div class="card">
      <div class="section-header"><h3><span class="live-dot"></span> Live Totals</h3></div>
      <p style="font-size:12px;color:var(--text-muted);">Updates automatically as clerks save new receipts.</p>
    </div>
    <div id="live-content"></div>
  `;

  await loadLiveTotals();

  if (liveSubscription) { db.removeChannel(liveSubscription); liveSubscription = null; }
  liveSubscription = db
    .channel('live-panjrapole-totals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pj_receipt_items' }, () => loadLiveTotals())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pj_receipts' }, () => loadLiveTotals())
    .subscribe();
}

async function loadLiveTotals() {
  const el = document.getElementById('live-content');
  if (!el) return;

  const { data, error } = await db.rpc('pj_head_totals');
  if (error) { el.innerHTML = `<p class="error-msg">${error.message}</p>`; return; }

  const todayGrand = (data || []).reduce((s, h) => s + parseFloat(h.today_total), 0);
  const cumulativeGrand = (data || []).reduce((s, h) => s + parseFloat(h.cumulative_total), 0);

  el.innerHTML = `
    <div class="card" style="background:var(--primary);color:white;text-align:center;">
      <div style="display:flex;justify-content:center;gap:28px;flex-wrap:wrap;">
        <div>
          <div style="font-size:13px;opacity:0.8;margin-bottom:4px;">Today</div>
          <div style="font-size:32px;font-weight:800;">${formatAmount(todayGrand)}</div>
        </div>
        <div>
          <div style="font-size:13px;opacity:0.8;margin-bottom:4px;">Cumulative</div>
          <div style="font-size:32px;font-weight:800;">${formatAmount(cumulativeGrand)}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">By Head</div>
      <div class="total-grid">
        ${(data || []).map(h => `
          <div class="total-card">
            <div class="head-name">${h.head_name}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Today</div>
            <div class="total-amount">${formatAmount(h.today_total)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:8px;margin-bottom:2px;">Cumulative</div>
            <div class="total-amount" style="font-size:16px;color:var(--text-light);">${formatAmount(h.cumulative_total)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
