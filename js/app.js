// ==========================================
// PANJRAPOLE - App Controller
// ==========================================

let activeTab = '';

async function initApp() {
  const badge = document.getElementById('user-role-badge');
  badge.textContent = isAdmin() ? 'Admin' : 'Clerk';
  buildNav();
  loadTab('entry');
}

function buildNav() {
  const nav = document.getElementById('nav-tabs');
  nav.innerHTML = '';

  const adminTabs = [
    { id: 'entry', label: '💰 Donation Entry' },
    { id: 'live', label: '🔴 Live Totals' },
    { id: 'receipts', label: '🧾 Receipts' },
    { id: 'heads', label: '📋 Heads' },
    { id: 'clerks', label: '👤 Clerks' },
    { id: 'reports', label: '📊 Reports' },
    { id: 'settings', label: '⚙ Settings' },
  ];
  const clerkTabs = [
    { id: 'entry', label: '💰 Donation Entry' },
  ];

  const tabs = isAdmin() ? adminTabs : clerkTabs;
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'nav-tab';
    el.textContent = tab.label;
    el.dataset.tab = tab.id;
    el.onclick = () => loadTab(tab.id);
    nav.appendChild(el);
  });
}

async function loadTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));

  const content = document.getElementById('page-content');
  content.innerHTML = '';

  switch (tabId) {
    case 'entry': await renderEntry(); break;
    case 'live': await renderLive(); break;
    case 'receipts': await renderReceipts(); break;
    case 'heads': await renderHeads(); break;
    case 'clerks': await renderClerks(); break;
    case 'reports': await renderReports(); break;
    case 'settings': await renderSettings(); break;
  }
}

// Switches to the Donation Entry tab and loads a specific receipt into the
// edit form - used by the admin Receipts tab, which lives on a different
// tab than the form itself.
async function openReceiptForEdit(receiptId) {
  await loadTab('entry');
  await editReceipt(receiptId);
}

// ========== TOAST ==========
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, type === 'error' ? 8000 : 3000);
}

// ========== MODAL ==========
function showModal(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// ========== UTILS ==========
function formatAmount(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
