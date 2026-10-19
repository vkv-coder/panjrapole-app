// ==========================================
// PANJRAPOLE - Receipt Print / WhatsApp / Email
// ==========================================

function numToWords(n) {
  n = Math.floor(n || 0);
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function two(x) { return x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : ''); }
  function three(x) { return (x >= 100 ? ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x)); }
  let result = '';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const rest = n;
  if (crore) result += three(crore) + ' Crore ';
  if (lakh) result += three(lakh) + ' Lakh ';
  if (thousand) result += three(thousand) + ' Thousand ';
  if (rest) result += three(rest);
  return result.trim();
}

const RECEIPT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,'Segoe UI',sans-serif;background:#f0ece4;display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;min-height:100vh;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
  .receipt{background:#fff;width:380px;border:3px solid #7B3F00;border-radius:4px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18)}
  .org-header{border-bottom:2px solid #7B3F00;padding:12px;text-align:center;background:#fff}
  .org-logo{font-size:30px;margin-bottom:2px;}
  .org-name{font-size:16px;font-weight:800;color:#7B3F00;line-height:1.3;margin-bottom:3px}
  .org-addr{font-size:11px;color:#333;line-height:1.4;margin-bottom:3px}
  .org-reg{font-size:9.5px;color:#444;line-height:1.4;border-top:1px solid #eee;padding-top:4px;margin-top:4px}
  .receipt-body{padding:12px}
  .receipt-title{display:flex;justify-content:space-between;align-items:center;color:#7B3F00;border:1.5px solid #7B3F00;padding:5px 8px;margin-bottom:8px}
  .rt-label{font-size:10px;font-weight:700;letter-spacing:1px}
  .rt-no{font-size:19px;font-weight:800;}
  .meta{display:flex;justify-content:flex-end;font-size:11px;color:#333;margin-bottom:8px}
  .donor-box{background:#FCEEF3;border:1px solid #e8c6d4;border-radius:4px;padding:8px;margin-bottom:10px;}
  .row{display:flex;border-bottom:1px solid #e8d5b7;padding:4px 0;font-size:12.5px}
  .row:last-child{border-bottom:none}
  .row-label{color:#555;width:90px;flex-shrink:0;}
  .row-value{font-weight:700;color:#1a1a1a;flex:1;word-break:break-word;}
  .heads-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
  .heads-table th{background:#7B3F00;color:#fff;padding:5px 6px;text-align:left;font-weight:700}
  .heads-table th:last-child{text-align:right}
  .heads-table td{padding:5px 6px;border-bottom:1px solid #e8d5b7;vertical-align:top}
  .heads-table td:last-child{text-align:right;font-weight:700;color:#7B3F00;white-space:nowrap}
  .heads-table tr:last-child td{border-bottom:none}
  .total-row{display:flex;justify-content:space-between;padding:8px 6px;background:#FDF6EC;border:1.5px solid #7B3F00;border-radius:3px;margin-bottom:6px;font-weight:700;font-size:14px}
  .total-row .val{color:#7B3F00;font-size:16px}
  .words-row{text-align:left;font-size:11.5px;color:#1a1a1a;font-style:italic;font-weight:600;margin-bottom:10px;padding:4px 6px;background:#FFF8F0;border-radius:3px}
  .pay-info{font-size:11px;color:#222;font-weight:600;margin-bottom:10px;padding:6px;background:#f9f9f9;border:1px solid #e8e8e8;border-radius:3px;line-height:1.7}
  .g80-note{text-align:center;font-size:10px;color:#444;font-style:italic;margin:8px 0;padding-top:6px;border-top:1px dashed #ccc;}
  .sys-note{text-align:center;font-size:9.5px;color:#555;font-weight:600;margin-top:10px;padding:6px 4px;border-top:1px dashed #ddd;line-height:1.6}
  .footer{text-align:center;color:#7B3F00;font-weight:700;font-size:13px;padding:8px 0 4px}
  .btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px}
  .btn{padding:10px 18px;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600}
  .btn-print{background:#7B3F00;color:#fff}
  .btn-wa{background:#25D366;color:#fff}
  .btn-email{background:#1565C0;color:#fff}
  .btn-close{background:#e8e8e8;color:#333}
  @media print{
    @page{size:A5;margin:8mm}
    body{background:#fff;padding:0;margin:0}
    .receipt{box-shadow:none;border:1.5px solid #7B3F00;width:100%;max-width:100%;min-height:186mm;display:flex;flex-direction:column}
    .receipt-body{flex:1;display:flex;flex-direction:column}
    .footer{margin-top:auto}
    .btns{display:none}
  }`;

function buildReceiptHTML(receipt, items, headsById, org) {
  const dateStr = new Date(receipt.receipt_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const total = parseFloat(receipt.total_amount);
  const tableRows = items.map((it, i) => `
    <tr>
      <td style="text-align:center;color:#888;">${i + 1}</td>
      <td>${(headsById[it.head_id] && headsById[it.head_id].name) || 'Head'}</td>
      <td>₹ ${parseFloat(it.amount).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const payLabel = receipt.payment_mode === 'online' ? 'Online' : 'Cash';
  const payInfo = `
    <div class="pay-info">
      <strong>Payment Mode:</strong> ${payLabel}
      ${receipt.payment_mode === 'online' ? `<br><strong>Txn/Ref No.:</strong> ${receipt.payment_ref || '—'}` : ''}
    </div>`;

  return `
<div class="receipt">
  <div class="org-header">
    <div class="org-logo">🐄</div>
    <div class="org-name">${org.org_name || 'Shree Vadodara Panjrapole, Baroda'}</div>
    ${org.org_address ? `<div class="org-addr">${org.org_address}</div>` : ''}
    <div class="org-reg">${org.org_phone ? 'Ph: ' + org.org_phone + ' | ' : ''}PAN: ${org.org_pan || ''}</div>
  </div>
  <div class="receipt-body">
    <div class="receipt-title"><span class="rt-label">DONATION RECEIPT</span><span class="rt-no">No. ${receipt.receipt_no}</span></div>
    <div class="meta"><span>Date: ${dateStr}</span></div>
    <div class="donor-box">
      <div class="row"><span class="row-label">Name:</span><span class="row-value">${receipt.donor_name}</span></div>
      <div class="row"><span class="row-label">WhatsApp:</span><span class="row-value">${receipt.donor_whatsapp}</span></div>
      <div class="row"><span class="row-label">City:</span><span class="row-value">${receipt.donor_city}</span></div>
      ${receipt.donor_address ? `<div class="row"><span class="row-label">Address:</span><span class="row-value">${receipt.donor_address}</span></div>` : ''}
      ${receipt.want_80g ? `<div class="row"><span class="row-label">PAN No.:</span><span class="row-value">${receipt.donor_pan || '—'}</span></div>` : ''}
    </div>
    <table class="heads-table">
      <thead><tr><th style="width:24px;text-align:center;">#</th><th>Donation Head</th><th>Amount</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="total-row"><span>Total</span><span class="val">₹ ${total.toLocaleString('en-IN')} /-</span></div>
    <div class="words-row">Rupees ${numToWords(total)} Only</div>
    ${payInfo}
    ${receipt.want_80g ? `<div class="g80-note">Donation given to Trust is exempted under Section 80G of the Income Tax Act.</div>` : ''}
    <div class="footer">🙏 Thank You 🙏</div>
    <div class="sys-note">This is a computer-generated receipt.<br>Signature not required.</div>
  </div>
</div>`;
}

async function loadReceiptBundle(receiptId) {
  const { data: receipt, error: rErr } = await db.from('pj_receipts').select('*').eq('id', receiptId).single();
  if (rErr || !receipt) return null;
  const { data: items } = await db.from('pj_receipt_items').select('*').eq('receipt_id', receiptId);
  const { data: heads } = await db.from('pj_heads').select('*');
  const { data: org } = await db.from('pj_settings').select('*').eq('id', 1).single();
  const headsById = {};
  (heads || []).forEach(h => { headsById[h.id] = h; });
  return { receipt, items: items || [], headsById, org: org || {} };
}

async function showReceiptPrintWindow(receiptId, markPrintedFirst) {
  if (markPrintedFirst) {
    const { error } = await db.rpc('pj_mark_printed', { p_receipt_id: receiptId });
    if (error) console.error('pj_mark_printed failed:', error.message);
    if (typeof loadTodayEntries === 'function') loadTodayEntries();
  }

  const bundle = await loadReceiptBundle(receiptId);
  if (!bundle) { showToast('Could not load receipt', 'error'); return; }
  const { receipt, items, headsById, org } = bundle;
  const receiptHtml = buildReceiptHTML(receipt, items, headsById, org);
  const waPhone = (receipt.donor_whatsapp || '').replace(/\D/g, '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Receipt No. ${receipt.receipt_no}</title>
<style>${RECEIPT_CSS}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body>
${receiptHtml}
<div id="wa-info" style="display:none;background:#e8f5e9;border:1.5px solid #4CAF50;border-radius:8px;padding:10px 14px;font-size:12px;color:#1b5e20;text-align:center;line-height:1.6;max-width:360px;">
  ✅ Receipt image downloaded. WhatsApp opened.<br>In WhatsApp: tap 📎 Attach → select the image → Send.
</div>
<div class="btns">
  <button class="btn btn-print" onclick="window.print()">🖨 Print</button>
  <button id="wa-btn" class="btn btn-wa" onclick="sendWA()">📲 WhatsApp</button>
  <button class="btn btn-email" onclick="sendEmail()">📧 Email</button>
  <button class="btn btn-close" onclick="window.close()">Close</button>
</div>
<script>
const WA_PHONE = '${waPhone}';
const RECEIPT_NO = '${receipt.receipt_no}';
const DONOR_EMAIL = '${receipt.donor_email || ''}';
const TOTAL_TEXT = '₹${parseFloat(receipt.total_amount).toLocaleString('en-IN')}';

async function captureBlob() {
  const canvas = await html2canvas(document.querySelector('.receipt'), { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  return new Promise((res) => canvas.toBlob(res, 'image/png'));
}

async function sendWA() {
  if (WA_PHONE.length !== 10) { alert('No valid WhatsApp number on this receipt.'); return; }
  const waNum = '91' + WA_PHONE;
  const waUrl = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent('🙏 Your donation receipt No. ' + RECEIPT_NO + ' (' + TOTAL_TEXT + ')');
  const fileName = 'Receipt-' + RECEIPT_NO + '.png';
  const waBtn = document.getElementById('wa-btn');
  const info = document.getElementById('wa-info');
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  waBtn.textContent = '⏳ Preparing...'; waBtn.disabled = true;
  try {
    const blob = await captureBlob();
    if (isMobile) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        waBtn.textContent = '📲 WhatsApp'; waBtn.disabled = false;
        try { await navigator.share({ files: [file], title: 'Receipt ' + RECEIPT_NO }); return; }
        catch(e) { if (e.name === 'AbortError') return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (info) info.style.display = 'block';
    waBtn.textContent = '📲 WhatsApp'; waBtn.disabled = false;
    setTimeout(() => window.open(waUrl), 500);
  } catch(err) {
    waBtn.textContent = '📲 WhatsApp'; waBtn.disabled = false;
    window.open(waUrl);
  }
}

function sendEmail() {
  if (!DONOR_EMAIL) { alert('No email address on this receipt.'); return; }
  const subject = 'Donation Receipt No. ' + RECEIPT_NO;
  const body = 'Thank you for your donation of ' + TOTAL_TEXT + '.\\n\\nYour receipt number is ' + RECEIPT_NO + '.\\n\\nThis receipt is attached as a printed/saved copy — please print or save this page as PDF to attach.';
  window.location.href = 'mailto:' + encodeURIComponent(DONOR_EMAIL) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=440,height=780,scrollbars=yes');
  if (!win) { showToast('Allow pop-ups to view the receipt', 'error'); return; }
  win.document.write(html);
  win.document.close();
}
