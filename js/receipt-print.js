// ==========================================
// PANJRAPOLE - Receipt Print / WhatsApp / Email
// ==========================================

function numToGujaratiWords(n) {
  n = Math.floor(n || 0);
  if (n === 0) return 'શૂન્ય';
  const ones = ['', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ',
    'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ'];
  const tens = ['', '', 'વીસ', 'ત્રીસ', 'ચાળીસ', 'પચાસ', 'સાઈઠ', 'સિત્તેર', 'એંસી', 'નેવું'];
  function conv(x) {
    if (x === 0) return '';
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
    if (x < 1000) return ones[Math.floor(x / 100)] + ' સો' + (x % 100 ? ' ' + conv(x % 100) : '');
    if (x < 100000) return conv(Math.floor(x / 1000)) + ' હજાર' + (x % 1000 ? ' ' + conv(x % 1000) : '');
    return conv(Math.floor(x / 100000)) + ' લાખ' + (x % 100000 ? ' ' + conv(x % 100000) : '');
  }
  return conv(n);
}

const RECEIPT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Hind Vadodara','Noto Sans Gujarati',Arial,sans-serif;font-weight:600;background:#f0ece4;display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;min-height:100vh;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
  .receipt{background:#fff;width:380px;border:3px solid #7B3F00;border-radius:4px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18)}
  .org-header{border-bottom:2px solid #7B3F00;padding:12px;text-align:center;background:#fff}
  .org-logo{font-size:30px;margin-bottom:2px;}
  .org-name{font-size:16px;font-weight:800;color:#7B3F00;line-height:1.3;margin-bottom:3px}
  .org-addr{font-size:11px;color:#333;line-height:1.4;margin-bottom:3px}
  .org-reg{font-size:9.5px;color:#444;line-height:1.4;border-top:1px solid #eee;padding-top:4px;margin-top:4px}
  .receipt-body{padding:12px}
  .receipt-no-line{font-size:12px;color:#333;margin-bottom:4px;}
  .receipt-title-main{display:flex;justify-content:space-between;align-items:center;color:#7B3F00;border:1.5px solid #7B3F00;padding:6px 8px;margin-bottom:8px;font-size:15px;font-weight:800;}
  .donor-box{background:#FCEEF3;border:1px solid #e8c6d4;border-radius:4px;padding:8px;margin-bottom:10px;}
  .row{display:flex;border-bottom:1px solid #e8d5b7;padding:4px 0;font-size:12.5px}
  .row:last-child{border-bottom:none}
  .row-label{color:#555;width:95px;flex-shrink:0;}
  .row-value{font-weight:700;color:#1a1a1a;flex:1;word-break:break-word;}
  .heads-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11.5px}
  .heads-table th{background:#7B3F00;color:#fff;padding:5px 5px;text-align:left;font-weight:700}
  .heads-table th:nth-child(3){text-align:right}
  .heads-table td{padding:5px 5px;border-bottom:1px solid #e8d5b7;vertical-align:top}
  .heads-table td:nth-child(3){text-align:right;font-weight:700;color:#7B3F00;white-space:nowrap}
  .heads-table tr:last-child td{border-bottom:none}
  .total-row{display:flex;justify-content:space-between;padding:8px 6px;background:#FDF6EC;border:1.5px solid #7B3F00;border-radius:3px;margin-bottom:6px;font-weight:700;font-size:14px}
  .total-row .val{color:#7B3F00;font-size:16px}
  .words-row{text-align:left;font-size:11.5px;color:#1a1a1a;font-style:italic;font-weight:600;margin-bottom:10px;padding:4px 6px;background:#FFF8F0;border-radius:3px}
  .pay-info{font-size:11px;color:#222;font-weight:600;margin-bottom:10px;padding:6px;background:#f9f9f9;border:1px solid #e8e8e8;border-radius:3px;line-height:1.7}
  .g80-note{text-align:center;font-size:10px;color:#444;font-style:italic;margin:8px 0;padding-top:6px;border-top:1px dashed #ccc;}
  .sys-note{text-align:center;font-size:10.5px;color:#555;font-weight:600;margin-top:10px;padding:6px 4px;border-top:1px dashed #ddd;line-height:1.6}
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

function buildPayInfoHTML(r) {
  if (r.payment_mode === 'online') {
    return `
      <div class="pay-info">
        <strong>ચૂકવણી:</strong> ઓનલાઇન
        <br><strong>ટ્રાન્જેક્શન/UPI નંબર:</strong> ${r.payment_ref || '—'}
        ${r.bank_name ? `<br><strong>બેંકનું નામ:</strong> ${r.bank_name}` : ''}
      </div>`;
  }
  if (r.payment_mode === 'cheque') {
    const chequeDateStr = r.cheque_date ? new Date(r.cheque_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    return `
      <div class="pay-info">
        <strong>ચૂકવણી:</strong> ચેક
        <br><strong>ચેક નંબર:</strong> ${r.cheque_no || '—'}
        <br><strong>ચેક ની તારીખ:</strong> ${chequeDateStr}
        ${r.bank_name ? `<br><strong>બેંકનું નામ:</strong> ${r.bank_name}` : ''}
      </div>`;
  }
  return `<div class="pay-info"><strong>ચૂકવણી:</strong> રોકડા</div>`;
}

function buildReceiptHTML(receipt, items, headsById, org) {
  const dateStr = new Date(receipt.receipt_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const total = parseFloat(receipt.total_amount);
  const tableRows = items.map((it, i) => `
    <tr>
      <td style="text-align:center;color:#888;">${i + 1}</td>
      <td>${(headsById[it.head_id] && headsById[it.head_id].name) || 'Head'}</td>
      <td>₹ ${parseFloat(it.amount).toLocaleString('en-IN')}</td>
      <td style="font-size:10.5px;color:#666;">${it.remark || ''}</td>
    </tr>`).join('');

  const pan = (receipt.donor_pan || '').toUpperCase();

  return `
<div class="receipt">
  <div class="org-header">
    <div class="org-logo">🐄</div>
    <div class="org-name">${org.org_name || 'શ્રી વડોદરા પાંજરાપોલ, બરોડા'}</div>
    ${org.org_address ? `<div class="org-addr">${org.org_address}</div>` : ''}
    <div class="org-reg">${org.org_phone ? 'ફોન: ' + org.org_phone + ' | ' : ''}PAN: ${org.org_pan || ''}</div>
  </div>
  <div class="receipt-body">
    <div class="receipt-no-line">પાવતી નંબર: <strong>${receipt.receipt_no}</strong></div>
    <div class="receipt-title-main"><span>દાનની રસીદ</span><span style="font-size:12px;font-weight:600;">તા. ${dateStr}</span></div>
    <div class="donor-box">
      <div class="row"><span class="row-label">દાતા શ્રી નું નામ:</span><span class="row-value">${receipt.donor_name}</span></div>
      <div class="row"><span class="row-label">મો. નં.:</span><span class="row-value">${receipt.donor_whatsapp}</span></div>
      <div class="row"><span class="row-label">શહેર:</span><span class="row-value">${receipt.donor_city}</span></div>
      ${receipt.donor_address ? `<div class="row"><span class="row-label">સરનામું:</span><span class="row-value">${receipt.donor_address}</span></div>` : ''}
      ${receipt.want_80g ? `<div class="row"><span class="row-label">PAN No.:</span><span class="row-value">${pan || '—'}</span></div>` : ''}
    </div>
    <table class="heads-table">
      <thead><tr><th style="width:20px;text-align:center;">અ.નં.</th><th>વિગત</th><th>રકમ</th><th>વિશેષ નોંધ</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="total-row"><span>કુલ</span><span class="val">₹ ${total.toLocaleString('en-IN')} /-</span></div>
    <div class="words-row">અંકે રૂપિયા ${numToGujaratiWords(total)} પૂરા</div>
    ${buildPayInfoHTML(receipt)}
    ${receipt.want_80g ? `<div class="g80-note">Donation given to Trust is Exempted under sub-section of Section 80G of the Income Tax Act.</div>` : ''}
    <div class="footer">🙏 આભાર 🙏</div>
    <div class="sys-note">આ કોમ્પ્યુટર જનરેટેડ રસીદ છે.<br>સહી ની જરૂર નથી.</div>
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
<html lang="gu">
<head>
<meta charset="UTF-8"/>
<title>Receipt No. ${receipt.receipt_no}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;600;700&display=swap" rel="stylesheet">
<style>${RECEIPT_CSS}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
</head>
<body>
${receiptHtml}
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
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  waBtn.textContent = '⏳ Preparing...'; waBtn.disabled = true;
  try {
    const blob = await captureBlob();

    if (isMobile) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        waBtn.textContent = '📲 WhatsApp'; waBtn.disabled = false;
        try {
          await navigator.share({ files: [file], title: 'Receipt ' + RECEIPT_NO, text: '🙏 Your donation receipt No. ' + RECEIPT_NO });
          return;
        } catch(e) { if (e.name === 'AbortError') { return; } }
      }
    }

    // Fallback path: the receipt image can't be auto-attached on this
    // device/browser, so download it and tell the clerk - with a BLOCKING
    // alert, not a banner that's easy to miss - exactly what to do before
    // WhatsApp opens, otherwise only the text line goes through and the
    // image gets left behind unnoticed.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    waBtn.textContent = '📲 WhatsApp'; waBtn.disabled = false;
    alert('Receipt image saved as "' + fileName + '".\\n\\nWhatsApp will open now with a text message only - tap the 📎 attach icon in WhatsApp and choose this image from your Downloads/Gallery before sending, or the donor will only get the text.');
    window.open(waUrl);
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
