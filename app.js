// =============================================================
// RCC - Rahul Cricketers Club App JS
// Local Storage Persistence, Role Access, Custom Circular Clock,
// and Touch-Enabled Swipe-Down Hard Refresh Update System.
// =============================================================

// -------------------------------------------------------------
// PWA SERVICE WORKER REGISTRATION
// -------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('[Service Worker] Registered', reg.scope))
      .catch((err) => console.log('[Service Worker] Registration failed', err));
  });
}

// -------------------------------------------------------------
// SEED DATA & DATABASE (LOCAL STORAGE)
// -------------------------------------------------------------
const MOCK_PLAYERS = [];
const MOCK_PAYMENTS = [];
const MOCK_ATTENDANCE = [];

// Helper to format date strings
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

function getPastDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

// Helper to format WhatsApp API link
function getWhatsAppLink(phone, playerName, text = '') {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  let url = `https://wa.me/${formattedPhone}`;
  if (text) {
    url += `?text=${encodeURIComponent(text)}`;
  }
  return url;
}

function getLatestSundayDateString() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const latestSunday = new Date(now);
  
  if (dayOfWeek >= 3) {
    latestSunday.setDate(now.getDate() + (7 - dayOfWeek));
  } else {
    latestSunday.setDate(now.getDate() - dayOfWeek);
  }
  
  const year = latestSunday.getFullYear();
  const month = String(latestSunday.getMonth() + 1).padStart(2, '0');
  const day = String(latestSunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Database state
let players = [];
let payments = [];
let attendance = [];
let spends = [];
let currentRole = null; // 'admin' or 'guest'
let cutoffTime = localStorage.getItem('rcc_cutoff_time') || '06:30 AM';

// Initialize Database
function initDatabase(forceReset = false) {
  // One-time migration: clear legacy mock data (IDs were single-letter like 'p1','p2')
  // Real player IDs are timestamped like 'rcc_p_1716XXXXXXXXX' so we only purge single-char IDs
  if (localStorage.getItem('rcc_players')) {
    try {
      const localPlayers = JSON.parse(localStorage.getItem('rcc_players'));
      const hasLegacyMock = localPlayers.some(p => /^p\d+$/.test(p.id));
      if (hasLegacyMock) {
        localStorage.removeItem('rcc_players');
        localStorage.removeItem('rcc_payments');
        localStorage.removeItem('rcc_attendance');
        localStorage.removeItem('rcc_spends');
      }
    } catch (e) {
      localStorage.removeItem('rcc_players');
      localStorage.removeItem('rcc_payments');
      localStorage.removeItem('rcc_attendance');
      localStorage.removeItem('rcc_spends');
    }
  }

  if (forceReset || !localStorage.getItem('rcc_players')) {
    localStorage.setItem('rcc_players', JSON.stringify(MOCK_PLAYERS));
    localStorage.setItem('rcc_payments', JSON.stringify(MOCK_PAYMENTS));
    localStorage.setItem('rcc_attendance', JSON.stringify(MOCK_ATTENDANCE));
    localStorage.setItem('rcc_spends', JSON.stringify([]));
    if (forceReset) {
      showToast('Database reset to empty defaults.', 'success');
    }
  }

  players = JSON.parse(localStorage.getItem('rcc_players')) || [];
  payments = JSON.parse(localStorage.getItem('rcc_payments')) || [];
  attendance = JSON.parse(localStorage.getItem('rcc_attendance')) || [];
  spends = JSON.parse(localStorage.getItem('rcc_spends')) || [];
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// -------------------------------------------------------------
// APP INITIALIZATION & ROLE HANDLERS
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initDatabase();
  checkRoleAccess();
  setupEventListeners();
  setupSwipeDownToRefresh();
  
  // Populate month dropdowns dynamically (last 12 months)
  populateMonthDropdowns();

  // Populate Sunday dropdown for attendance
  populateSundayDropdown();
  
  // Set cutoff time field value
  const cutoffInput = document.getElementById('settings-cutoff-time');
  if (cutoffInput) {
    cutoffInput.value = cutoffTime;
  }
  
  // Load Default Tab View
  switchTab('dashboard');
});

// Check if user has selected a role
function checkRoleAccess() {
  const savedRole = localStorage.getItem('rcc_role');
  const roleModal = document.getElementById('role-selection-modal');
  const appShell = document.getElementById('app-shell');
  
  if (savedRole === 'admin' || savedRole === 'guest') {
    currentRole = savedRole;
    roleModal.classList.add('hidden');
    appShell.classList.remove('hidden');
    updateRoleUI();
  } else {
    // Show role selection screen
    roleModal.classList.remove('hidden');
    appShell.classList.add('hidden');
  }
}

// Update UI elements based on selected role
function updateRoleUI() {
  const badge = document.getElementById('role-badge');
  const roleText = document.getElementById('current-role-txt');
  
  if (currentRole === 'admin') {
    badge.className = 'badge badge-admin';
    roleText.textContent = 'Admin Mode';
    document.body.classList.add('is-admin');
    document.body.classList.remove('is-guest');
  } else {
    badge.className = 'badge badge-guest';
    roleText.textContent = 'Guest Mode';
    document.body.classList.add('is-guest');
    document.body.classList.remove('is-admin');
    
    // Redirect if guest is currently on the settings tab
    const activeTabItem = document.querySelector('.nav-item.active');
    if (activeTabItem && activeTabItem.dataset.tab === 'settings') {
      switchTab('dashboard');
    }
  }
  
  // Toggle admin-only elements
  document.querySelectorAll('.admin-only').forEach(el => {
    if (currentRole === 'admin') {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function selectRole(role) {
  localStorage.setItem('rcc_role', role);
  currentRole = role;
  document.getElementById('role-selection-modal').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  updateRoleUI();
  
  // Reload current view
  const activeTab = document.querySelector('.nav-item.active').dataset.tab;
  renderView(activeTab);
  showToast(`Logged in as ${role === 'admin' ? 'Club Admin' : 'Guest Viewer'}`, 'success');
}

// -------------------------------------------------------------
// EVENT LISTENERS CONFIGURATION
// -------------------------------------------------------------
function setupEventListeners() {
  // Role Selector Click Handlers
  document.getElementById('select-admin-btn').addEventListener('click', () => selectRole('admin'));
  document.getElementById('select-guest-btn').addEventListener('click', () => selectRole('guest'));
  
  // Header Switch Role Click Handler
  document.getElementById('switch-role-btn').addEventListener('click', () => {
    localStorage.removeItem('rcc_role');
    checkRoleAccess();
  });

  // Bottom Navigation Click Handlers
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', (e) => {
      const tabId = e.currentTarget.dataset.tab;
      switchTab(tabId);
    });
  });

  // Financial Overview Year Select Change
  document.getElementById('fin-year-select').addEventListener('change', () => {
    renderDashboardFinancials();
  });

  // Roster Search Input Filter
  document.getElementById('roster-search').addEventListener('input', () => {
    renderRoster();
  });

  // Payments Month Select Change Handler
  document.getElementById('payment-month-select').addEventListener('change', () => {
    renderPayments();
  });

  // Payments Search Filter
  document.getElementById('payment-search').addEventListener('input', () => {
    renderPayments();
  });

  // Spends Year Select Change
  document.getElementById('spends-year-select').addEventListener('change', () => {
    renderSpends();
  });

  // Matrix Year Select Change
  document.getElementById('matrix-year-select').addEventListener('change', () => {
    renderMatrix();
  });

  // Toggle Contributions / Spends / Matrix
  document.getElementById('btn-show-contributions').addEventListener('click', (e) => {
    togglePaymentSubTab('contributions', e.currentTarget);
  });
  document.getElementById('btn-show-spends').addEventListener('click', (e) => {
    togglePaymentSubTab('spends', e.currentTarget);
  });
  document.getElementById('btn-show-matrix').addEventListener('click', (e) => {
    togglePaymentSubTab('matrix', e.currentTarget);
  });

  // Add Spend Button Trigger
  document.getElementById('add-spend-btn').addEventListener('click', () => {
    if (currentRole !== 'admin') return;
    openSpendModal();
  });

  // Close Spend Modal Buttons
  document.querySelectorAll('.close-spend-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('spend-modal').classList.add('hidden');
    });
  });

  // Spend Form Submission handler
  document.getElementById('spend-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSpendForm();
  });

  // Download matrix image button click handler
  document.getElementById('download-matrix-img-btn').addEventListener('click', downloadMatrixAsImage);

  // Attendance Date Change Handler
  document.getElementById('attendance-date').addEventListener('change', () => {
    renderAttendance();
  });

  // Attendance Search Filter
  document.getElementById('attendance-search').addEventListener('input', () => {
    renderAttendance();
  });

  // Settings Save Cutoff Time
  const saveCutoffBtn = document.getElementById('settings-save-cutoff-btn');
  if (saveCutoffBtn) {
    saveCutoffBtn.addEventListener('click', () => {
      const timeVal = document.getElementById('settings-cutoff-time').value.trim();
      const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM|am|pm)$/i;
      if (!timeRegex.test(timeVal)) {
        showToast('Invalid time format. Please use HH:MM AM/PM (e.g., 06:30 AM)', 'danger');
        return;
      }
      cutoffTime = timeVal.toUpperCase();
      localStorage.setItem('rcc_cutoff_time', cutoffTime);
      showToast('Cutoff time saved successfully!', 'success');
      renderAttendance();
    });
  }

  // Dashboard Pending Month Select Change
  document.getElementById('pending-month-select').addEventListener('change', () => {
    renderDashboardPending();
  });

  // Dashboard Pending Search Filter
  document.getElementById('pending-search-input').addEventListener('input', () => {
    renderDashboardPending();
  });

  // Download backup button click handler
  document.getElementById('download-backup-btn').addEventListener('click', downloadBackup);

  // Upload restore button click handler
  document.getElementById('upload-restore-btn').addEventListener('click', restoreBackup);

  // Settings database reset button click handler
  document.getElementById('settings-reset-db-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all players, payments, attendance, and spends? This will completely wipe all manual entries.')) {
      initDatabase(true);
      switchTab('dashboard');
    }
  });

  // --- MODALS TOGGLERS ---
  
  // Add Player Modal Triggers
  document.getElementById('add-player-btn').addEventListener('click', () => {
    if (currentRole !== 'admin') return;
    openPlayerModal();
  });

  // Close modals buttons
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('player-modal').classList.add('hidden');
    });
  });

  document.querySelectorAll('.close-payment-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('payment-modal').classList.add('hidden');
    });
  });

  document.querySelectorAll('.close-clock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('clock-picker-modal').classList.add('hidden');
    });
  });

  // Player Form Submission handler
  document.getElementById('player-form').addEventListener('submit', (e) => {
    e.preventDefault();
    savePlayerForm();
  });

  // Payment Form Submission handler
  document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    savePaymentForm();
  });

  // Re-load details when month is changed in payment modal
  document.getElementById('payment-month-select-modal').addEventListener('change', (e) => {
    const playerId = document.getElementById('payment-player-id').value;
    const newMonth = e.target.value;
    loadPaymentLogForModal(playerId, newMonth);
  });
  
  // Payment Status Toggle Visibility of Amount/Date Fields
  document.getElementById('payment-status').addEventListener('change', (e) => {
    const fields = document.getElementById('payment-details-fields');
    const amtGroup = document.getElementById('payment-amount-group');
    const dateGroup = document.getElementById('payment-date-group');
    if (e.target.value === 'Paid') {
      fields.style.display = 'block';
      amtGroup.style.display = 'block';
      dateGroup.style.display = 'block';
    } else if (e.target.value === 'Food') {
      fields.style.display = 'block';
      amtGroup.style.display = 'none';
      dateGroup.style.display = 'block';
    } else {
      fields.style.display = 'none';
    }
  });
}

// -------------------------------------------------------------
// TAB NAVIGATION LOGIC
// -------------------------------------------------------------
function switchTab(tabId) {
  // If a guest tries to access settings, redirect to dashboard
  if (tabId === 'settings' && currentRole !== 'admin') {
    switchTab('dashboard');
    return;
  }

  // Update active state in bottom nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update active view
  document.querySelectorAll('.tab-view').forEach(view => {
    if (view.id === `${tabId}-view`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Render view components
  renderView(tabId);
}

function renderView(tabId) {
  switch (tabId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'roster':
      renderRoster();
      break;
    case 'payments':
      // Determine which sub-tab is active
      const activeSub = document.querySelector('#btn-show-contributions').classList.contains('btn-primary')
        ? 'contributions'
        : document.querySelector('#btn-show-spends').classList.contains('btn-primary')
          ? 'spends'
          : 'matrix';
      
      if (activeSub === 'contributions') {
        document.getElementById('contributions-container').style.display = 'block';
        document.getElementById('spends-container').style.display = 'none';
        document.getElementById('matrix-container').style.display = 'none';
        renderPayments();
      } else if (activeSub === 'spends') {
        document.getElementById('contributions-container').style.display = 'none';
        document.getElementById('spends-container').style.display = 'block';
        document.getElementById('matrix-container').style.display = 'none';
        renderSpends();
      } else {
        document.getElementById('contributions-container').style.display = 'none';
        document.getElementById('spends-container').style.display = 'none';
        document.getElementById('matrix-container').style.display = 'block';
        renderMatrix();
      }
      break;
    case 'attendance':
      renderAttendance();
      break;
    case 'settings':
      // Settings view is static, no dynamic rendering logic needed
      break;
  }
}

// -------------------------------------------------------------
// BACKUP & RESTORE UTILITIES
// -------------------------------------------------------------
function downloadBackup() {
  const data = {
    players: JSON.parse(localStorage.getItem('rcc_players')) || [],
    payments: JSON.parse(localStorage.getItem('rcc_payments')) || [],
    attendance: JSON.parse(localStorage.getItem('rcc_attendance')) || [],
    spends: JSON.parse(localStorage.getItem('rcc_spends')) || []
  };
  
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10);
  a.href = url;
  a.download = `rcc_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Backup file downloaded successfully!', 'success');
}

function restoreBackup() {
  const fileInput = document.getElementById('restore-file-input');
  const file = fileInput.files[0];
  
  if (!file) {
    showToast('Please select a JSON backup file first.', 'warning');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format');
      }
      if (!Array.isArray(data.players) || !Array.isArray(data.payments) || !Array.isArray(data.attendance)) {
        throw new Error('Missing players, payments, or attendance arrays');
      }
      
      // Save to localStorage
      localStorage.setItem('rcc_players', JSON.stringify(data.players));
      localStorage.setItem('rcc_payments', JSON.stringify(data.payments));
      localStorage.setItem('rcc_attendance', JSON.stringify(data.attendance));
      localStorage.setItem('rcc_spends', JSON.stringify(data.spends || []));
      
      // Reload in-memory databases and global variables
      players = data.players;
      payments = data.payments;
      attendance = data.attendance;
      spends = data.spends || [];
      
      // Clear file input
      fileInput.value = '';
      
      showToast('Database restored successfully!', 'success');
      
      // Redirect to dashboard and refresh it
      switchTab('dashboard');
    } catch (err) {
      showToast('Restore failed: ' + err.message, 'danger');
    }
  };
  reader.readAsText(file);
}

// -------------------------------------------------------------
// TOAST ALERTS SYSTEM
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === 'danger') icon = '<i class="fa-solid fa-circle-xmark"></i>';
  if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);
  
  // Remove toast from DOM after animation completes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// -------------------------------------------------------------
// HELPERS: Month & Sunday Dropdown Populators
// -------------------------------------------------------------
function populateMonthDropdowns() {
  const now = new Date();
  const selectors = ['payment-month-select', 'payment-month-select-modal', 'pending-month-select'];
  
  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${month}`;
      const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      if (i === 0) opt.selected = true;
      sel.appendChild(opt);
    }
  });
}

function populateSundayDropdown() {
  const sel = document.getElementById('attendance-date');
  if (!sel) return;
  sel.innerHTML = '';

  const latestSundayStr = getLatestSundayDateString();
  const parts = latestSundayStr.split('-');
  const latestSunday = new Date(parts[0], parts[1] - 1, parts[2]);

  for (let i = 0; i < 12; i++) {
    const d = new Date(latestSunday);
    d.setDate(latestSunday.getDate() - (i * 7));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const val = `${year}-${month}-${day}`;
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }
}

// -------------------------------------------------------------
// DASHBOARD VIEW RENDERING
// -------------------------------------------------------------
function renderDashboard() {
  // Set total squad size
  document.getElementById('dash-total-members').textContent = players.length;
  
  // Calculate collection for the selected pending month
  const pendingMonthSel = document.getElementById('pending-month-select');
  const activeMonth = pendingMonthSel ? pendingMonthSel.value : getCurrentMonthVal();
  const monthPayments = payments.filter(p => p.month === activeMonth && p.status === 'Paid');
  const totalFunds = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  document.getElementById('dash-total-funds').textContent = `₹${totalFunds}`;

  // Dynamically update the stat-label to show which month
  const collLabel = document.querySelector('#dash-total-funds')?.closest('.stat-card')?.querySelector('.stat-label');
  if (collLabel) collLabel.textContent = `Collection (${getMonthNameByNum(activeMonth.split('-')[1])})`;
  
  // Calculate present this Sunday
  const sundayStr = getLatestSundayDateString();
  const sundayPresent = attendance.filter(a => a.date === sundayStr);
  document.getElementById('dash-attendance-today').textContent = sundayPresent.length;

  // Fund pending count for selected month
  const pendingPlayersCount = getPendingPlayersForMonth(activeMonth).length;
  document.getElementById('dash-pending-funds-count').textContent = pendingPlayersCount;
  
  // Render pending lists
  renderDashboardPending();

  // Render financial overview stats card
  renderDashboardFinancials();
}

function renderDashboardFinancials() {
  const finYearSelect = document.getElementById('fin-year-select');
  if (!finYearSelect) return;
  const selectedYear = finYearSelect.value;
  
  // Total contributions (Paid only, Food is 0/not counted)
  const yearPayments = payments.filter(p => p.month.startsWith(selectedYear) && p.status === 'Paid');
  const totalContribs = yearPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Total spends
  const yearSpends = spends.filter(s => s.date.startsWith(selectedYear));
  const totalSpent = yearSpends.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  
  const balance = totalContribs - totalSpent;
  
  document.getElementById('fin-total-contribs').textContent = `₹${totalContribs.toLocaleString('en-IN')}`;
  document.getElementById('fin-total-spends').textContent = `₹${totalSpent.toLocaleString('en-IN')}`;
  document.getElementById('fin-total-balance').textContent = `₹${balance.toLocaleString('en-IN')}`;
}

function getCurrentMonthVal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Simplified getPendingPlayersForMonth - only checks the given month
function getPendingPlayersForMonth(monthVal) {
  const pendingList = [];
  players.forEach(p => {
    const payLog = payments.find(pay => pay.playerId === p.id && pay.month === monthVal);
    if (!payLog || (payLog.status !== 'Paid' && payLog.status !== 'Food')) {
      pendingList.push({ player: p });
    }
  });
  return pendingList;
}

function renderDashboardPending() {
  const container = document.getElementById('pending-funds-list');
  const searchVal = document.getElementById('pending-search-input').value.toLowerCase();
  const selectedMonth = document.getElementById('pending-month-select')?.value || getCurrentMonthVal();
  container.innerHTML = '';
  
  const pendingList = getPendingPlayersForMonth(selectedMonth);
  
  // Filter by search
  const filtered = pendingList.filter(item => {
    return item.player.name.toLowerCase().includes(searchVal) || 
           item.player.number.toString().includes(searchVal);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = '<li class="text-gray" style="text-align: center; padding: 16px; list-style:none;">All members have contributed! 🎉</li>';
    return;
  }
  
  const selMonthParts = selectedMonth.split('-');
  const selMonthLabel = `${getMonthNameByNum(selMonthParts[1])} ${selMonthParts[0]}`;

  filtered.forEach(item => {
    const p = item.player;
    const li = document.createElement('li');
    li.className = 'pending-item';
    
    const actionHtml = currentRole === 'admin' 
      ? `<button class="pending-action-btn" onclick="quickCollectPayment('${p.id}', '${selectedMonth}')">Collect</button>`
      : `<span class="pending-months-badge">Due</span>`;

    const nudgeText = `Hi ${p.name}, this is a friendly reminder from RCC regarding your pending club fund contribution for ${selMonthLabel}. Please send your contribution at your convenience. Thanks! 🏁`;
    const whatsappHtml = p.whatsapp 
      ? `<a href="${getWhatsAppLink(p.whatsapp, p.name, nudgeText)}" target="_blank" class="pending-whatsapp-btn" title="Nudge on WhatsApp">
          <i class="fa-brands fa-whatsapp text-success"></i>
         </a>`
      : '';

    li.innerHTML = `
      <div class="pending-item-left">
        <span class="jersey">${p.number}</span>
        <div class="flex-col">
          <div class="name-row" style="display: flex; align-items: center; gap: 8px;">
            <span class="name">${p.name}</span>
            ${whatsappHtml}
          </div>
          <span class="text-gray" style="font-size: 10px;">No contribution for ${selMonthLabel}</span>
        </div>
      </div>
      <div class="pending-item-right">
        ${actionHtml}
      </div>
    `;
    
    container.appendChild(li);
  });
}

function getMonthNameByNum(monthNum) {
  const months = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };
  return months[monthNum] || monthNum;
}

function quickCollectPayment(playerId, month) {
  openPaymentModal(playerId, month);
}

// -------------------------------------------------------------
// ROSTER / MEMBERS VIEW LOGIC
// -------------------------------------------------------------
function renderRoster() {
  const grid = document.getElementById('roster-grid');
  const searchVal = document.getElementById('roster-search').value.toLowerCase();
  grid.innerHTML = '';
  
  const filteredPlayers = players.filter(p => {
    return p.name.toLowerCase().includes(searchVal) ||
           p.number.toString().includes(searchVal) ||
           p.role.toLowerCase().includes(searchVal) ||
           p.batting.toLowerCase().includes(searchVal) ||
           p.bowling.toLowerCase().includes(searchVal) ||
           (p.blood && p.blood.toLowerCase().includes(searchVal));
  });

  if (filteredPlayers.length === 0) {
    grid.innerHTML = '<div class="text-gray" style="text-align: center; padding: 24px;">No players found in team roster.</div>';
    return;
  }

  filteredPlayers.forEach(p => {
    const card = document.createElement('div');
    card.className = `player-card ${p.featured ? 'featured' : ''}`;
    
    // Create icons depending on role
    let roleIcon = '🏏';
    if (p.role === 'Bowler') roleIcon = '🥎';
    if (p.role === 'All-rounder') roleIcon = '🏆';
    if (p.role === 'Wicketkeeper-Batsman') roleIcon = '🧤';

    const bloodBadgeHtml = p.blood ? `<span class="blood-badge">${p.blood}</span>` : '';
    
    const adminActionsHtml = currentRole === 'admin' 
      ? `<div class="admin-actions">
          <button class="icon-btn" onclick="editPlayer('${p.id}')"><i class="fa-solid fa-pen-to-square text-gold"></i></button>
          <button class="icon-btn" onclick="deletePlayer('${p.id}')"><i class="fa-solid fa-trash text-danger"></i></button>
         </div>`
      : '';

    const whatsappHtml = p.whatsapp 
      ? `<a href="${getWhatsAppLink(p.whatsapp, p.name, `Hello ${p.name}, hope you are doing well!`)}" target="_blank" class="icon-btn whatsapp-link" title="Message on WhatsApp">
          <i class="fa-brands fa-whatsapp text-success" style="font-size: 20px;"></i>
         </a>`
      : '';

    card.innerHTML = `
      <div class="player-card-left">
        <div class="jersey-circle">${p.number}</div>
        <div class="player-info-meta">
          <div class="player-name-row">
            <h4>${p.name}</h4>
            ${bloodBadgeHtml}
          </div>
          <span class="player-role-badge">${roleIcon} ${p.role}</span>
          <span class="player-styles">${p.batting} | ${p.bowling}</span>
        </div>
      </div>
      <div class="player-card-right" style="display: flex; align-items: center; gap: 10px;">
        ${whatsappHtml}
        ${adminActionsHtml}
      </div>
    `;
    
    grid.appendChild(card);
  });
}

// Open Form to Add or Edit Player
function openPlayerModal(playerId = null) {
  const modal = document.getElementById('player-modal');
  const title = document.getElementById('player-modal-title');
  const form = document.getElementById('player-form');
  
  form.reset();
  
  if (playerId) {
    title.textContent = 'Edit Player Details';
    const p = players.find(p => p.id === playerId);
    document.getElementById('edit-player-id').value = p.id;
    document.getElementById('player-name').value = p.name;
    document.getElementById('player-number').value = p.number;
    document.getElementById('player-whatsapp').value = p.whatsapp || '';
    document.getElementById('player-role').value = p.role;
    document.getElementById('player-blood').value = p.blood || '';
    document.getElementById('player-batting').value = p.batting;
    document.getElementById('player-bowling').value = p.bowling || 'None';
  } else {
    title.textContent = 'Add New Player';
    document.getElementById('edit-player-id').value = '';
    document.getElementById('player-whatsapp').value = '';
  }
  
  modal.classList.remove('hidden');
}

function savePlayerForm() {
  const id = document.getElementById('edit-player-id').value;
  const name = document.getElementById('player-name').value.trim();
  const number = parseInt(document.getElementById('player-number').value);
  const whatsapp = document.getElementById('player-whatsapp').value.trim();
  const role = document.getElementById('player-role').value;
  const blood = document.getElementById('player-blood').value;
  const batting = document.getElementById('player-batting').value;
  const bowling = document.getElementById('player-bowling').value;
  
  // Allowed duplicate jersey numbers per user request

  if (id) {
    // Edit Player
    players = players.map(p => {
      if (p.id === id) {
        return { ...p, name, number, whatsapp, role, blood, batting, bowling };
      }
      return p;
    });
    showToast(`Player ${name} updated successfully.`, 'success');
  } else {
    // Add Player
    const newPlayer = {
      id: 'rcc_p_' + Date.now(),
      name,
      number,
      whatsapp,
      role,
      blood,
      batting,
      bowling
    };
    players.push(newPlayer);
    showToast(`New player ${name} added to squad.`, 'success');
  }
  
  saveData('rcc_players', players);
  document.getElementById('player-modal').classList.add('hidden');
  renderRoster();
}

// Global hook references for onclick handlers
window.editPlayer = function(id) {
  openPlayerModal(id);
};

window.deletePlayer = function(id) {
  if (confirm('Are you sure you want to remove this player from the roster? This deletes all associated logs.')) {
    const player = players.find(p => p.id === id);
    // Delete player
    players = players.filter(p => p.id !== id);
    saveData('rcc_players', players);
    
    // Delete payments
    payments = payments.filter(pay => pay.playerId !== id);
    saveData('rcc_payments', payments);
    
    // Delete attendance
    attendance = attendance.filter(a => a.playerId !== id);
    saveData('rcc_attendance', attendance);
    
    showToast(`Removed ${player.name} from squad.`, 'success');
    renderRoster();
  }
};

// -------------------------------------------------------------
// PAYMENTS VIEW LOGIC
// -------------------------------------------------------------
function renderPayments() {
  const monthVal = document.getElementById('payment-month-select').value;
  const listContainer = document.getElementById('payments-list');
  const searchVal = document.getElementById('payment-search').value.toLowerCase();
  
  listContainer.innerHTML = '';
  
  const monthPayments = payments.filter(p => p.month === monthVal && (p.status === 'Paid' || p.status === 'Food'));
  const collectedAmount = payments.filter(p => p.month === monthVal && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const notContributedCount = players.filter(p => {
    const log = payments.find(pay => pay.playerId === p.id && pay.month === monthVal);
    return !log || (log.status !== 'Paid' && log.status !== 'Food');
  }).length;

  document.getElementById('payment-target-amount').textContent = `${notContributedCount} players`;
  document.getElementById('payment-collected-amount').textContent = `₹${collectedAmount}`;
  document.getElementById('payment-pending-amount').textContent = `${notContributedCount} pending`;

  const filteredPlayers = players.filter(p => {
    return p.name.toLowerCase().includes(searchVal) || p.number.toString().includes(searchVal);
  });

  if (filteredPlayers.length === 0) {
    listContainer.innerHTML = '<div class="text-gray" style="text-align: center; padding: 20px;">No players match filters.</div>';
    return;
  }

  filteredPlayers.forEach(p => {
    const payLog = payments.find(pay => pay.playerId === p.id && pay.month === monthVal);
    const isContributed = payLog && (payLog.status === 'Paid' || payLog.status === 'Food');
    const isFood = payLog && payLog.status === 'Food';
    const isPaid = payLog && payLog.status === 'Paid';
    
    const row = document.createElement('div');
    row.className = `payment-row ${isContributed ? 'paid' : 'pending'}`;
    
    let badgeText = 'Not Contributed';
    if (isContributed) {
      badgeText = isFood ? 'Food' : `₹${payLog.amount}`;
    }
    const badgeClass = isContributed ? 'payment-status-badge paid' : 'payment-status-badge pending';
    
    let extraStyle = '';
    if (isFood) {
      extraStyle = 'background: rgba(59, 130, 246, 0.15); border-color: var(--primary); color: var(--primary);';
    }
    
    const datePaidText = isContributed ? `On ${formatDateDisplay(payLog.date)}` : 'No fund for month';

    row.addEventListener('click', () => {
      if (currentRole === 'admin') {
        openPaymentModal(p.id, monthVal);
      } else {
        showToast('Only Admins can log or edit payments.', 'warning');
      }
    });

    row.innerHTML = `
      <div class="payment-row-left">
        <span class="jersey">${p.number}</span>
        <div class="payment-row-info">
          <span class="name">${p.name}</span>
          <span class="details text-gray">${datePaidText}</span>
        </div>
      </div>
      <span class="${badgeClass}" style="${extraStyle}">${badgeText}</span>
    `;
    
    listContainer.appendChild(row);
  });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const options = { day: 'numeric', month: 'short' };
  return d.toLocaleDateString('en-IN', options);
}

function loadPaymentLogForModal(playerId, monthVal) {
  const payLog = payments.find(pay => pay.playerId === playerId && pay.month === monthVal);
  const statusSelect = document.getElementById('payment-status');
  const amountInput = document.getElementById('payment-amount');
  const dateInput = document.getElementById('payment-date');
  const fields = document.getElementById('payment-details-fields');
  const amtGroup = document.getElementById('payment-amount-group');
  const dateGroup = document.getElementById('payment-date-group');
  
  if (payLog) {
    statusSelect.value = payLog.status;
    amountInput.value = payLog.amount || '';
    dateInput.value = payLog.date || getTodayDateString();
  } else {
    statusSelect.value = 'Paid';
    amountInput.value = '';
    dateInput.value = getTodayDateString();
  }
  
  if (statusSelect.value === 'Paid') {
    fields.style.display = 'block';
    amtGroup.style.display = 'block';
    dateGroup.style.display = 'block';
  } else if (statusSelect.value === 'Food') {
    fields.style.display = 'block';
    amtGroup.style.display = 'none';
    dateGroup.style.display = 'block';
  } else {
    fields.style.display = 'none';
  }
}

function openPaymentModal(playerId, monthVal) {
  const modal = document.getElementById('payment-modal');
  const p = players.find(p => p.id === playerId);
  
  document.getElementById('payment-player-id').value = playerId;
  document.getElementById('payment-month-select-modal').value = monthVal;
  
  document.getElementById('payment-player-name').textContent = p.name;
  document.getElementById('payment-player-number').textContent = `Jersey #${p.number}`;
  
  loadPaymentLogForModal(playerId, monthVal);

  modal.classList.remove('hidden');
}

function savePaymentForm() {
  const playerId = document.getElementById('payment-player-id').value;
  const month = document.getElementById('payment-month-select-modal').value;
  const status = document.getElementById('payment-status').value;
  const amountRaw = parseFloat(document.getElementById('payment-amount').value);
  const date = document.getElementById('payment-date').value;

  if (status === 'Paid' && (!amountRaw || amountRaw <= 0)) {
    showToast('Please enter a valid fund amount.', 'danger');
    return;
  }

  const amount = status === 'Paid' ? amountRaw : 0;
  const player = players.find(p => p.id === playerId);
  
  const logIndex = payments.findIndex(pay => pay.playerId === playerId && pay.month === month);
  
  if (logIndex > -1) {
    payments[logIndex] = { ...payments[logIndex], status, amount, date: (status === 'Paid' || status === 'Food') ? date : '' };
  } else {
    payments.push({
      id: 'pay_' + Date.now(),
      playerId,
      month,
      status,
      amount,
      date: (status === 'Paid' || status === 'Food') ? date : ''
    });
  }

  saveData('rcc_payments', payments);
  document.getElementById('payment-modal').classList.add('hidden');
  
  const activeTab = document.querySelector('.nav-item.active').dataset.tab;
  renderView(activeTab);
  const parts = month.split('-');
  const monthLabel = `${getMonthNameByNum(parts[1])} ${parts[0]}`;
  const msg = status === 'Paid'
    ? `₹${amount} fund recorded for ${player.name} (${monthLabel})`
    : status === 'Food'
      ? `Marked ${player.name} as contributed via direct food for ${monthLabel}`
      : `Marked ${player.name} as not contributed for ${monthLabel}`;
  showToast(msg, 'success');
}

function togglePaymentSubTab(tab, element) {
  const buttons = element.parentNode.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  });
  element.classList.remove('btn-secondary');
  element.classList.add('btn-primary');

  document.getElementById('contributions-container').style.display = 'none';
  document.getElementById('spends-container').style.display = 'none';
  document.getElementById('matrix-container').style.display = 'none';

  if (tab === 'contributions') {
    document.getElementById('contributions-container').style.display = 'block';
    renderPayments();
  } else if (tab === 'spends') {
    document.getElementById('spends-container').style.display = 'block';
    renderSpends();
  } else if (tab === 'matrix') {
    document.getElementById('matrix-container').style.display = 'block';
    renderMatrix();
  }
}

function renderSpends() {
  const selectedYear = document.getElementById('spends-year-select').value;
  const listContainer = document.getElementById('spends-list');
  const totalLabel = document.getElementById('spends-total-year');
  
  if (!listContainer) return;
  listContainer.innerHTML = '';
  
  const yearSpends = spends.filter(s => s.date.startsWith(selectedYear));
  const total = yearSpends.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  
  if (totalLabel) totalLabel.textContent = `₹${total.toLocaleString('en-IN')}`;
  
  if (yearSpends.length === 0) {
    listContainer.innerHTML = '<div class="text-gray" style="text-align: center; padding: 20px;">No spends logged in this year.</div>';
    return;
  }
  
  yearSpends.sort((a, b) => b.date.localeCompare(a.date));
  
  yearSpends.forEach(s => {
    const row = document.createElement('div');
    row.className = 'payment-row pending';
    row.style.borderLeft = '4px solid var(--danger)';
    
    const categoryIcon = getCategoryIcon(s.category);
    
    const deleteBtn = currentRole === 'admin'
      ? `<button class="icon-btn text-danger" onclick="deleteSpend('${s.id}')" style="margin-left: 8px; border:none; background:none; font-size:14px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`
      : '';
      
    row.innerHTML = `
      <div class="payment-row-left">
        <span class="jersey" style="background: rgba(239, 68, 68, 0.1); border-color: var(--danger); color: var(--danger); font-size: 14px;">${categoryIcon}</span>
        <div class="payment-row-info">
          <span class="name">${s.description}</span>
          <span class="details text-gray">${s.category} | ${formatDateDisplay(s.date)}</span>
        </div>
      </div>
      <div class="flex-row" style="display:flex; align-items:center;">
        <span class="payment-status-badge pending" style="background: rgba(239, 68, 68, 0.15); border-color: var(--danger); color: var(--danger);">₹${s.amount}</span>
        ${deleteBtn}
      </div>
    `;
    listContainer.appendChild(row);
  });
}

function getCategoryIcon(category) {
  switch (category) {
    case 'Equipment': return '🏏';
    case 'Ground/Maintenance': return '🌱';
    case 'Tournament': return '🏆';
    case 'Refreshments': return '🥤';
    default: return '💸';
  }
}

window.deleteSpend = function(id) {
  if (confirm('Are you sure you want to delete this spend/expense entry?')) {
    spends = spends.filter(s => s.id !== id);
    saveData('rcc_spends', spends);
    renderSpends();
    renderDashboardFinancials();
  }
};

function openSpendModal() {
  const modal = document.getElementById('spend-modal');
  document.getElementById('spend-form').reset();
  document.getElementById('spend-id').value = '';
  document.getElementById('spend-date').value = getTodayDateString();
  modal.classList.remove('hidden');
}

function saveSpendForm() {
  const description = document.getElementById('spend-description').value.trim();
  const amount = parseFloat(document.getElementById('spend-amount').value);
  const date = document.getElementById('spend-date').value;
  const category = document.getElementById('spend-category').value;
  
  if (!description || !amount || amount <= 0 || !date) {
    showToast('Please fill in all required fields.', 'danger');
    return;
  }
  
  const newSpend = {
    id: 'spend_' + Date.now(),
    description,
    amount,
    date,
    category
  };
  
  spends.push(newSpend);
  saveData('rcc_spends', spends);
  
  document.getElementById('spend-modal').classList.add('hidden');
  showToast('Spend logged successfully.', 'success');
  
  renderSpends();
  renderDashboardFinancials();
}

function renderMatrix() {
  const selectedYear = document.getElementById('matrix-year-select').value;
  document.getElementById('matrix-title-year').textContent = `YEAR ${selectedYear}`;
  
  const tbody = document.getElementById('matrix-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="text-gray" style="text-align: center; padding: 20px;">No players in roster.</td></tr>';
    return;
  }
  
  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
  
  sortedPlayers.forEach(p => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
    
    const tdPlayer = document.createElement('td');
    tdPlayer.style.textAlign = 'left';
    tdPlayer.style.padding = '8px';
    tdPlayer.style.fontWeight = '600';
    tdPlayer.style.color = '#ffffff';
    tdPlayer.innerHTML = `<span style="color: var(--gold-bright); font-weight: bold; margin-right: 6px;">#${p.number}</span> ${p.name}`;
    tr.appendChild(tdPlayer);
    
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const monthVal = `${selectedYear}-${monthStr}`;
      
      const payLog = payments.find(pay => pay.playerId === p.id && pay.month === monthVal);
      const tdMonth = document.createElement('td');
      tdMonth.style.padding = '6px 2px';
      tdMonth.style.textAlign = 'center';
      
      let cellClass = 'pending';
      let cellText = '✖';
      
      if (payLog) {
        if (payLog.status === 'Paid') {
          cellClass = 'paid';
          cellText = '✔';
        } else if (payLog.status === 'Food') {
          cellClass = 'food';
          cellText = '🍲';
        }
      }
      
      tdMonth.innerHTML = `<span class="matrix-cell ${cellClass}">${cellText}</span>`;
      tr.appendChild(tdMonth);
    }
    
    tbody.appendChild(tr);
  });
}

function downloadMatrixAsImage() {
  if (typeof html2canvas === 'undefined') {
    showToast('Loading image generator, please wait...', 'info');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => {
      generateMatrixImage();
    };
    document.body.appendChild(script);
  } else {
    generateMatrixImage();
  }
}

function generateMatrixImage() {
  const element = document.getElementById('matrix-capture-area');
  html2canvas(element, {
    backgroundColor: '#03080f',
    scale: 2,
    logging: false,
    useCORS: true
  }).then(canvas => {
    const link = document.createElement('a');
    const year = document.getElementById('matrix-year-select').value;
    link.download = `rcc_contributions_matrix_${year}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Matrix grid image downloaded!', 'success');
  }).catch(err => {
    showToast('Failed to generate image: ' + err.message, 'danger');
  });
}

// -------------------------------------------------------------
// ATTENDANCE VIEW LOGIC
// -------------------------------------------------------------
let selectedPlayerForClock = null;

function isLate(attendanceTime, cutoffTimeStr) {
  if (!attendanceTime || !cutoffTimeStr) return false;
  
  const timeParts = attendanceTime.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i);
  if (!timeParts) return false;
  
  let hours = parseInt(timeParts[1]);
  const minutes = parseInt(timeParts[2]);
  const ampm = timeParts[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const attendanceMinutes = hours * 60 + minutes;
  
  const cutoffParts = cutoffTimeStr.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i);
  if (!cutoffParts) return false;
  
  let cutHours = parseInt(cutoffParts[1]);
  const cutMinutes = parseInt(cutoffParts[2]);
  const cutAmPm = cutoffParts[3].toUpperCase();
  
  if (cutAmPm === 'PM' && cutHours < 12) cutHours += 12;
  if (cutAmPm === 'AM' && cutHours === 12) cutHours = 0;
  
  const cutoffMinutes = cutHours * 60 + cutMinutes;
  
  return attendanceMinutes > cutoffMinutes;
}

function renderAttendance() {
  const dateVal = document.getElementById('attendance-date').value;
  const listContainer = document.getElementById('attendance-list');
  const searchVal = document.getElementById('attendance-search').value.toLowerCase();
  
  listContainer.innerHTML = '';
  
  // Logs for selected sunday
  const presentLogs = attendance.filter(a => a.date === dateVal);
  const presentCount = presentLogs.length;
  
  // Update stats bar
  document.getElementById('attendance-stats-text').textContent = `Present: ${presentCount} / ${players.length} Players`;
  const pct = players.length > 0 ? (presentCount / players.length) * 100 : 0;
  document.getElementById('attendance-progress-fill').style.width = `${pct}%`;

  // Split into On-Time and Late
  const onTimeLogs = presentLogs.filter(log => !isLate(log.time, cutoffTime));
  const lateLogs = presentLogs.filter(log => isLate(log.time, cutoffTime));
  const absentPlayers = players.filter(p => !presentLogs.some(log => log.playerId === p.id));

  // Render 'Who Was Present' chips panel
  const presentPanel = document.getElementById('attendance-present-panel');
  const presentChips = document.getElementById('present-chips');
  const presentPanelCount = document.getElementById('present-panel-count');

  presentChips.innerHTML = '';
  presentPanelCount.textContent = onTimeLogs.length;

  if (onTimeLogs.length > 0) {
    presentPanel.style.display = 'block';
    onTimeLogs.forEach(log => {
      const player = players.find(p => p.id === log.playerId);
      if (!player) return;
      const chip = document.createElement('div');
      chip.className = 'present-chip';
      chip.innerHTML = `
        <span class="chip-jersey">${player.number}</span>
        <span class="chip-name">${player.name.split(' ')[0]}</span>
        <span class="chip-time">${log.time}</span>
      `;
      presentChips.appendChild(chip);
    });
  } else {
    presentPanel.style.display = 'none';
  }

  // Render 'Late Comers' chips panel
  const latePanel = document.getElementById('attendance-late-panel');
  const lateChips = document.getElementById('late-chips');
  const latePanelCount = document.getElementById('late-panel-count');

  lateChips.innerHTML = '';
  latePanelCount.textContent = lateLogs.length;

  if (lateLogs.length > 0) {
    latePanel.style.display = 'block';
    lateLogs.forEach(log => {
      const player = players.find(p => p.id === log.playerId);
      if (!player) return;
      const chip = document.createElement('div');
      chip.className = 'late-chip';
      chip.innerHTML = `
        <span class="chip-jersey">${player.number}</span>
        <span class="chip-name">${player.name.split(' ')[0]}</span>
        <span class="chip-time">${log.time}</span>
      `;
      lateChips.appendChild(chip);
    });
  } else {
    latePanel.style.display = 'none';
  }

  // Render 'Absentees' chips panel
  const absentPanel = document.getElementById('attendance-absent-panel');
  const absentChips = document.getElementById('absent-chips');
  const absentPanelCount = document.getElementById('absent-panel-count');

  absentChips.innerHTML = '';
  absentPanelCount.textContent = absentPlayers.length;

  // Display absentees if there are any absentees
  if (absentPlayers.length > 0) {
    absentPanel.style.display = 'block';
    absentPlayers.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'absent-chip';
      chip.innerHTML = `
        <span class="chip-jersey">${p.number}</span>
        <span class="chip-name">${p.name.split(' ')[0]}</span>
        <span class="chip-time" style="color: var(--danger);">Absent</span>
      `;
      absentChips.appendChild(chip);
    });
  } else {
    absentPanel.style.display = 'none';
  }

  // Filter players for the roster list
  const filteredPlayers = players.filter(p => {
    return p.name.toLowerCase().includes(searchVal) || p.number.toString().includes(searchVal);
  });

  if (filteredPlayers.length === 0) {
    listContainer.innerHTML = '<div class="text-gray" style="text-align: center; padding: 20px;">No players match filter.</div>';
    return;
  }

  // Sort: present first, then absent
  filteredPlayers.sort((a, b) => {
    const aPresent = !!attendance.find(l => l.date === dateVal && l.playerId === a.id);
    const bPresent = !!attendance.find(l => l.date === dateVal && l.playerId === b.id);
    return bPresent - aPresent;
  });

  filteredPlayers.forEach(p => {
    const log = attendance.find(a => a.date === dateVal && a.playerId === p.id);
    const isPresent = !!log;
    
    const row = document.createElement('div');
    row.className = `attendance-row ${isPresent ? 'present' : 'absent'}`;
    
    let rightColHtml = '';
    
    if (isPresent) {
      const deleteBtn = currentRole === 'admin' 
        ? `<button class="icon-btn margin-right-xs" onclick="deleteAttendance('${p.id}', '${dateVal}')"><i class="fa-solid fa-trash text-danger" style="font-size: 12px;"></i></button>`
        : '';
      
      const isPlayerLate = isLate(log.time, cutoffTime);
      const badgeClass = isPlayerLate ? 'late' : '';
      const iconClass = isPlayerLate ? 'fa-clock' : 'fa-check';
        
      rightColHtml = `
        <div class="flex-row">
          ${deleteBtn}
          <span class="attendance-time-badge ${badgeClass}"><i class="fa-solid ${iconClass}"></i> ${log.time}</span>
        </div>
      `;
    } else {
      if (currentRole === 'admin') {
        rightColHtml = `
          <div class="attendance-actions">
            <button class="btn-now" onclick="markAttendanceNow('${p.id}', '${dateVal}')">Now</button>
            <button class="btn-manual" onclick="openClockPicker('${p.id}', '${dateVal}')">Manual</button>
          </div>
        `;
      } else {
        rightColHtml = `<span class="attendance-absent-badge">Absent</span>`;
      }
    }

    row.innerHTML = `
      <div class="attendance-row-left">
        <span class="jersey">${p.number}</span>
        <div class="attendance-row-info">
          <span class="name">${p.name}</span>
          <span class="role">${p.role}</span>
        </div>
      </div>
      <div class="attendance-row-right">
        ${rightColHtml}
      </div>
    `;
    
    listContainer.appendChild(row);
  });
}

window.markAttendanceNow = function(playerId, dateVal) {
  // Format current local time e.g., "06:30 AM"
  const d = new Date();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  let minutes = d.getMinutes();
  minutes = minutes < 10 ? '0' + minutes : minutes;
  const timeStr = `${hours < 10 ? '0' + hours : hours}:${minutes} ${ampm}`;

  // Log attendance
  attendance.push({
    date: dateVal,
    playerId: playerId,
    time: timeStr
  });
  
  saveData('rcc_attendance', attendance);
  renderAttendance();
  
  const player = players.find(p => p.id === playerId);
  showToast(`${player.name} marked Present at ${timeStr}`, 'success');
};

window.deleteAttendance = function(playerId, dateVal) {
  if (currentRole !== 'admin') return;
  const player = players.find(p => p.id === playerId);
  
  attendance = attendance.filter(a => !(a.playerId === playerId && a.date === dateVal));
  saveData('rcc_attendance', attendance);
  renderAttendance();
  showToast(`Attendance removed for ${player.name}`, 'warning');
};

// -------------------------------------------------------------
// CIRCULAR CLOCK PICKER LOGIC
// -------------------------------------------------------------
let clockHour = 6;
let clockMinute = 30;
let clockAmPm = 'AM';
let clockMode = 'hours'; // 'hours' or 'minutes'
let clockDateVal = '';

window.openClockPicker = function(playerId, dateVal) {
  selectedPlayerForClock = playerId;
  clockDateVal = dateVal;
  
  // Set default picker state
  const now = new Date();
  let h = now.getHours();
  clockAmPm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  clockHour = h ? h : 12;
  
  // Set default minutes as absolute current minutes
  clockMinute = now.getMinutes();

  clockMode = 'hours';
  
  // Render clock layout
  updateClockDisplay();
  buildClockNumbers();
  rotateClockHand();
  
  // Show modal
  document.getElementById('clock-picker-modal').classList.remove('hidden');
};

// Update AM/PM & Hour/Minute display text in clock header
function updateClockDisplay() {
  const hText = document.getElementById('clock-display-hours');
  const mText = document.getElementById('clock-display-minutes');
  
  hText.textContent = clockHour < 10 ? '0' + clockHour : clockHour;
  mText.textContent = clockMinute < 10 ? '0' + clockMinute : clockMinute;
  
  if (clockMode === 'hours') {
    hText.classList.add('active');
    mText.classList.remove('active');
    document.getElementById('clock-mode-hours').classList.add('active');
    document.getElementById('clock-mode-minutes').classList.remove('active');
  } else {
    mText.classList.add('active');
    hText.classList.remove('active');
    document.getElementById('clock-mode-minutes').classList.add('active');
    document.getElementById('clock-mode-hours').classList.remove('active');
  }

  // AM/PM button active states
  const amBtn = document.getElementById('clock-ampm-am');
  const pmBtn = document.getElementById('clock-ampm-pm');
  if (clockAmPm === 'AM') {
    amBtn.classList.add('active');
    pmBtn.classList.remove('active');
  } else {
    pmBtn.classList.add('active');
    amBtn.classList.remove('active');
  }
}

// Generate the clock numbers (1 to 12) positioned circular
function buildClockNumbers() {
  const container = document.getElementById('clock-numbers');
  container.innerHTML = '';
  
  const faceRadius = 88; // radius of number positioning (within 210px face)
  const centerCoord = 105; // 210 / 2
  
  if (clockMode === 'hours') {
    // 12 numbers
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) * Math.PI / 180;
      const x = centerCoord + faceRadius * Math.sin(angle);
      const y = centerCoord - faceRadius * Math.cos(angle);
      
      const numDiv = document.createElement('div');
      numDiv.className = `clock-number ${clockHour === i ? 'active' : ''}`;
      numDiv.style.left = `${x}px`;
      numDiv.style.top = `${y}px`;
      numDiv.textContent = i;
      
      // Select hour on click
      numDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        clockHour = i;
        updateClockDisplay();
        rotateClockHand();
        // Auto transition to minute selection
        setTimeout(() => {
          clockMode = 'minutes';
          updateClockDisplay();
          buildClockNumbers();
          rotateClockHand();
        }, 300);
      });
      
      container.appendChild(numDiv);
    }
  } else {
    // Minutes: multiples of 5
    for (let i = 0; i < 12; i++) {
      const val = i * 5;
      const displayVal = val < 10 ? '0' + val : val;
      const angle = (i * 30) * Math.PI / 180;
      const x = centerCoord + faceRadius * Math.sin(angle);
      const y = centerCoord - faceRadius * Math.cos(angle);
      
      const numDiv = document.createElement('div');
      numDiv.className = `clock-number ${clockMinute === val ? 'active' : ''}`;
      numDiv.style.left = `${x}px`;
      numDiv.style.top = `${y}px`;
      numDiv.textContent = displayVal;
      
      numDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        clockMinute = val;
        updateClockDisplay();
        rotateClockHand();
      });
      
      container.appendChild(numDiv);
    }
  }
}

// Adjust clock pointer hand angle
function rotateClockHand() {
  const hand = document.getElementById('clock-hand-element');
  let angle = 0;
  
  if (clockMode === 'hours') {
    angle = clockHour * 30; // 360 / 12 = 30 deg per hour
  } else {
    angle = clockMinute * 6; // 360 / 60 = 6 deg per minute
  }
  
  hand.style.transform = `rotate(${angle}deg)`;
}

// Handle Drag/Touch selection on Clock Face
function handleClockTouch(clientX, clientY) {
  const face = document.getElementById('clock-face-element');
  const rect = face.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  
  const dx = clientX - cx;
  const dy = clientY - cy;
  
  // Math.atan2 gives angle in rad from -PI to PI
  // Convert to degrees where 0 deg is at 12 o'clock (top)
  let angleRad = Math.atan2(dy, dx);
  let deg = (angleRad * 180 / Math.PI) + 90;
  if (deg < 0) deg += 360;
  
  if (clockMode === 'hours') {
    // Snap to nearest 30 degrees (hours 1-12)
    let hour = Math.round(deg / 30);
    if (hour === 0) hour = 12;
    if (hour > 12) hour = 12;
    clockHour = hour;
  } else {
    // Snap to absolute minutes (360 degrees / 60 segments = 6 deg per minute)
    let minute = Math.round(deg / 6);
    if (minute === 60) minute = 0;
    clockMinute = minute;
  }
  
  updateClockDisplay();
  rotateClockHand();
  
  // Highlight active number
  const numbers = document.querySelectorAll('.clock-number');
  const currentVal = clockMode === 'hours' ? clockHour : clockMinute;
  
  numbers.forEach(num => {
    const numVal = parseInt(num.textContent);
    if (clockMode === 'hours') {
      if (numVal === currentVal) num.classList.add('active');
      else num.classList.remove('active');
    } else {
      if (numVal === currentVal) num.classList.add('active');
      else num.classList.remove('active');
    }
  });
}

// Clock Face Input Listeners (Click + Drag)
const clockFace = document.getElementById('clock-face-element');
let isClockDragging = false;

clockFace.addEventListener('mousedown', (e) => {
  isClockDragging = true;
  handleClockTouch(e.clientX, e.clientY);
});

window.addEventListener('mousemove', (e) => {
  if (isClockDragging) {
    handleClockTouch(e.clientX, e.clientY);
  }
});

window.addEventListener('mouseup', () => {
  isClockDragging = false;
});

// Mobile touch support for Clock Face dragging
clockFace.addEventListener('touchstart', (e) => {
  isClockDragging = true;
  const touch = e.touches[0];
  handleClockTouch(touch.clientX, touch.clientY);
});

clockFace.addEventListener('touchmove', (e) => {
  if (isClockDragging) {
    const touch = e.touches[0];
    handleClockTouch(touch.clientX, touch.clientY);
  }
});

clockFace.addEventListener('touchend', () => {
  isClockDragging = false;
});

// Mode selectors header toggles
document.getElementById('clock-display-hours').addEventListener('click', () => {
  clockMode = 'hours';
  updateClockDisplay();
  buildClockNumbers();
  rotateClockHand();
});

document.getElementById('clock-display-minutes').addEventListener('click', () => {
  clockMode = 'minutes';
  updateClockDisplay();
  buildClockNumbers();
  rotateClockHand();
});

document.getElementById('clock-mode-hours').addEventListener('click', () => {
  clockMode = 'hours';
  updateClockDisplay();
  buildClockNumbers();
  rotateClockHand();
});

document.getElementById('clock-mode-minutes').addEventListener('click', () => {
  clockMode = 'minutes';
  updateClockDisplay();
  buildClockNumbers();
  rotateClockHand();
});

// AM/PM toggles
document.getElementById('clock-ampm-am').addEventListener('click', () => {
  clockAmPm = 'AM';
  updateClockDisplay();
});

document.getElementById('clock-ampm-pm').addEventListener('click', () => {
  clockAmPm = 'PM';
  updateClockDisplay();
});

// Clock Confirm Button
document.getElementById('clock-btn-confirm').addEventListener('click', () => {
  if (!selectedPlayerForClock) return;
  
  const hStr = clockHour < 10 ? '0' + clockHour : clockHour;
  const mStr = clockMinute < 10 ? '0' + clockMinute : clockMinute;
  const timeStr = `${hStr}:${mStr} ${clockAmPm}`;

  // Log attendance
  attendance.push({
    date: clockDateVal,
    playerId: selectedPlayerForClock,
    time: timeStr
  });
  
  saveData('rcc_attendance', attendance);
  document.getElementById('clock-picker-modal').classList.add('hidden');
  renderAttendance();
  
  const player = players.find(p => p.id === selectedPlayerForClock);
  showToast(`${player.name} marked Present at ${timeStr}`, 'success');
  selectedPlayerForClock = null;
});

// Clock "Set to Now" Button inside dialog
document.getElementById('clock-btn-now').addEventListener('click', () => {
  if (!selectedPlayerForClock) return;
  document.getElementById('clock-picker-modal').classList.add('hidden');
  markAttendanceNow(selectedPlayerForClock, clockDateVal);
  selectedPlayerForClock = null;
});

// -------------------------------------------------------------
// SWIPE DOWN TO REFRESH & HARD REFRESH SYSTEM
// -------------------------------------------------------------
function setupSwipeDownToRefresh() {
  let touchStart = 0;
  let touchDelta = 0;
  const ptrEl = document.getElementById('pull-to-refresh');
  const seamEl = ptrEl.querySelector('.cricket-ball-seam');
  const txtEl = document.getElementById('ptr-text');
  
  // Track pull only if scrolling container is at absolute top
  const scrollContainer = document.querySelector('main.app-content');
  
  window.addEventListener('touchstart', (e) => {
    // Only engage if container is scrolled to the absolute top
    if (scrollContainer.scrollTop === 0) {
      touchStart = e.touches[0].pageY;
      touchDelta = 0;
      ptrEl.style.transition = 'none';
    } else {
      touchStart = 0;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (touchStart === 0) return;
    
    const currentY = e.touches[0].pageY;
    touchDelta = currentY - touchStart;
    
    // Check if dragging downwards
    if (touchDelta > 0) {
      // Dampen the scroll effect so it pulls slowly
      const pullDist = Math.min(touchDelta * 0.45, 100);
      ptrEl.style.transform = `translateY(calc(-100% + ${pullDist}px))`;
      
      // Spin the seam dynamically as user pulls
      if (seamEl) {
        seamEl.style.transform = `rotate(${pullDist * 4}deg)`;
      }
      
      // Update text helper
      if (pullDist > 70) {
        txtEl.textContent = 'Release to update app...';
        txtEl.style.color = 'var(--gold-bright)';
      } else {
        txtEl.textContent = 'Pull to hard refresh';
        txtEl.style.color = 'var(--text-secondary)';
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (touchStart === 0) return;
    
    const finalPull = Math.min(touchDelta * 0.45, 100);
    ptrEl.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    if (finalPull > 70) {
      // Trigger Hard Update!
      ptrEl.style.transform = 'translateY(0)';
      txtEl.textContent = 'Updating...';
      
      setTimeout(() => {
        executeHardUpdate();
      }, 500);
    } else {
      // Snap back hidden
      ptrEl.style.transform = 'translateY(-100%)';
    }
    
    touchStart = 0;
    touchDelta = 0;
  });
}

// Completely bypass service worker, clear browser cache, and fetch fresh code
function executeHardUpdate() {
  // Show loading screen overlay
  document.getElementById('update-loading-overlay').classList.remove('hidden');
  
  // 1. Unregister all service workers
  const unregisterSW = new Promise((resolve) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          const promises = registrations.map(reg => {
            console.log('[Update Log] Unregistering service worker:', reg.scope);
            return reg.unregister();
          });
          Promise.all(promises).then(() => resolve(true));
        })
        .catch((err) => {
          console.error('[Update Log] Error unregistering service workers:', err);
          resolve(false);
        });
    } else {
      resolve(true);
    }
  });

  // 2. Clear all cache storage caches
  const clearCaches = new Promise((resolve) => {
    if ('caches' in window) {
      caches.keys()
        .then((keys) => {
          const promises = keys.map(key => {
            console.log('[Update Log] Deleting cache storage:', key);
            return caches.delete(key);
          });
          Promise.all(promises).then(() => resolve(true));
        })
        .catch((err) => {
          console.error('[Update Log] Error clearing caches:', err);
          resolve(false);
        });
    } else {
      resolve(true);
    }
  });

  // 3. Force page reload from server bypassing cache
  Promise.all([unregisterSW, clearCaches]).then(() => {
    console.log('[Update Log] Cache & workers cleared! Reloading page from server.');
    setTimeout(() => {
      // Reload page and bypass browser cache (forced reload)
      window.location.reload(true);
    }, 800); // 800ms to allow animations/overlay to sit naturally
  });
}
