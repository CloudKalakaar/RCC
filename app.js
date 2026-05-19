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
const MOCK_PLAYERS = [
  { id: 'p1', name: 'Rahul Dravid', number: 19, role: 'Batsman', batting: 'Right-hand bat', bowling: 'Right-arm offbreak', blood: 'O+', featured: true, whatsapp: '9876543210' },
  { id: 'p2', name: 'Virat Kohli', number: 18, role: 'Batsman', batting: 'Right-hand bat', bowling: 'Right-arm medium', blood: 'B+', whatsapp: '9876543211' },
  { id: 'p3', name: 'Rohit Sharma', number: 45, role: 'Batsman', batting: 'Right-hand bat', bowling: 'Right-arm offbreak', blood: 'A+', whatsapp: '9876543212' },
  { id: 'p4', name: 'MS Dhoni', number: 7, role: 'Wicketkeeper-Batsman', batting: 'Right-hand bat', bowling: 'Right-arm medium', blood: 'O+', whatsapp: '9876543213' },
  { id: 'p5', name: 'Hardik Pandya', number: 33, role: 'All-rounder', batting: 'Right-hand bat', bowling: 'Right-arm fast-medium', blood: 'AB+', whatsapp: '9876543214' },
  { id: 'p6', name: 'Jasprit Bumrah', number: 93, role: 'Bowler', batting: 'Right-hand bat', bowling: 'Right-arm fast', blood: 'O-', whatsapp: '9876543215' },
  { id: 'p7', name: 'Ravindra Jadeja', number: 8, role: 'All-rounder', batting: 'Left-hand bat', bowling: 'Left-arm orthodox', blood: 'A-', whatsapp: '9876543216' },
  { id: 'p8', name: 'Ravichandran Ashwin', number: 99, role: 'Bowler', batting: 'Right-hand bat', bowling: 'Right-arm offbreak', blood: 'B-', whatsapp: '9876543217' }
];

const MOCK_PAYMENTS = [
  // March 2026: All paid
  { id: 'pay1', playerId: 'p1', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-05' },
  { id: 'pay2', playerId: 'p2', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-04' },
  { id: 'pay3', playerId: 'p3', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-10' },
  { id: 'pay4', playerId: 'p4', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-02' },
  { id: 'pay5', playerId: 'p5', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-06' },
  { id: 'pay6', playerId: 'p6', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-08' },
  { id: 'pay7', playerId: 'p7', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-05' },
  { id: 'pay8', playerId: 'p8', month: '2026-03', status: 'Paid', amount: 500, date: '2026-03-07' },
  
  // April 2026: Some paid, some pending
  { id: 'pay9', playerId: 'p1', month: '2026-04', status: 'Paid', amount: 500, date: '2026-04-05' },
  { id: 'pay10', playerId: 'p2', month: '2026-04', status: 'Paid', amount: 500, date: '2026-04-03' },
  { id: 'pay11', playerId: 'p3', month: '2026-04', status: 'Pending', amount: 0, date: '' },
  { id: 'pay12', playerId: 'p4', month: '2026-04', status: 'Paid', amount: 500, date: '2026-04-01' },
  { id: 'pay13', playerId: 'p5', month: '2026-04', status: 'Pending', amount: 0, date: '' },
  { id: 'pay14', playerId: 'p6', month: '2026-04', status: 'Paid', amount: 500, date: '2026-04-12' },
  { id: 'pay15', playerId: 'p7', month: '2026-04', status: 'Paid', amount: 500, date: '2026-04-05' },
  { id: 'pay16', playerId: 'p8', month: '2026-04', status: 'Pending', amount: 0, date: '' },

  // May 2026: Mostly pending (Initial state)
  { id: 'pay17', playerId: 'p1', month: '2026-05', status: 'Paid', amount: 500, date: '2026-05-02' },
  { id: 'pay18', playerId: 'p4', month: '2026-05', status: 'Paid', amount: 500, date: '2026-05-01' }
];

const MOCK_ATTENDANCE = [
  // Yesterday's entry
  { date: getPastDateString(1), playerId: 'p1', time: '06:15 AM' },
  { date: getPastDateString(1), playerId: 'p2', time: '06:30 AM' },
  { date: getPastDateString(1), playerId: 'p3', time: '06:20 AM' },
  { date: getPastDateString(1), playerId: 'p4', time: '06:10 AM' },
  { date: getPastDateString(1), playerId: 'p7', time: '06:45 AM' },
  { date: getPastDateString(1), playerId: 'p8', time: '06:35 AM' }
];

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

// Database state
let players = [];
let payments = [];
let attendance = [];
let currentRole = null; // 'admin' or 'guest'

// Initialize Database
function initDatabase(forceReset = false) {
  if (forceReset || !localStorage.getItem('rcc_players')) {
    localStorage.setItem('rcc_players', JSON.stringify(MOCK_PLAYERS));
    localStorage.setItem('rcc_payments', JSON.stringify(MOCK_PAYMENTS));
    localStorage.setItem('rcc_attendance', JSON.stringify(MOCK_ATTENDANCE));
    showToast('Database reset to initial squad defaults.', 'success');
  }

  players = JSON.parse(localStorage.getItem('rcc_players'));
  payments = JSON.parse(localStorage.getItem('rcc_payments'));
  attendance = JSON.parse(localStorage.getItem('rcc_attendance'));
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
  
  // Set current date on attendance view
  document.getElementById('attendance-date').value = getTodayDateString();
  
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

  // Attendance Date Change Handler
  document.getElementById('attendance-date').addEventListener('change', () => {
    renderAttendance();
  });

  // Attendance Search Filter
  document.getElementById('attendance-search').addEventListener('input', () => {
    renderAttendance();
  });

  // Dashboard Reset Database Button
  document.getElementById('dash-reset-db').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all players, payments, and attendance to default values? This clears manual entries.')) {
      initDatabase(true);
      const activeTab = document.querySelector('.nav-item.active').dataset.tab;
      renderView(activeTab);
    }
  });

  // Dashboard Pending Search Filter
  document.getElementById('pending-search-input').addEventListener('input', () => {
    renderDashboardPending();
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
  
  // Payment Status Toggle Visibility of Amount/Date Fields
  document.getElementById('payment-status').addEventListener('change', (e) => {
    const fields = document.getElementById('payment-details-fields');
    if (e.target.value === 'Paid') {
      fields.style.display = 'block';
    } else {
      fields.style.display = 'none';
    }
  });
}

// -------------------------------------------------------------
// TAB NAVIGATION LOGIC
// -------------------------------------------------------------
function switchTab(tabId) {
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
      renderPayments();
      break;
    case 'attendance':
      renderAttendance();
      break;
  }
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
// DASHBOARD VIEW RENDERING
// -------------------------------------------------------------
function renderDashboard() {
  // Set total squad size
  document.getElementById('dash-total-members').textContent = players.length;
  
  // Calculate collection for May 2026
  const mayPayments = payments.filter(p => p.month === '2026-05' && p.status === 'Paid');
  const totalMayCash = mayPayments.reduce((sum, p) => sum + p.amount, 0);
  document.getElementById('dash-total-funds').textContent = `₹${totalMayCash}`;
  
  // Calculate today present
  const todayStr = getTodayDateString();
  const todayPresent = attendance.filter(a => a.date === todayStr);
  document.getElementById('dash-attendance-today').textContent = todayPresent.length;

  // Calculate pending counts across current and past months
  // Count how many players have a pending payment in May 2026
  const pendingPlayersCount = getPendingPlayersForMonth('2026-05').length;
  document.getElementById('dash-pending-funds-count').textContent = pendingPlayersCount;
  
  // Render pending lists
  renderDashboardPending();
}

function getPendingPlayersForMonth(monthVal) {
  // A player is pending if they do not have a payment log with 'Paid' for this month
  const pendingList = [];
  players.forEach(p => {
    const payLog = payments.find(pay => pay.playerId === p.id && pay.month === monthVal);
    if (!payLog || payLog.status !== 'Paid') {
      // Find other months pending too
      const otherMonthsPending = [];
      const pastMonths = ['2026-01', '2026-02', '2026-03', '2026-04'];
      pastMonths.forEach(m => {
        const pastPayLog = payments.find(pay => pay.playerId === p.id && pay.month === m);
        if (!pastPayLog || pastPayLog.status !== 'Paid') {
          otherMonthsPending.push(m.split('-')[1]); // get month number e.g. "04"
        }
      });
      pendingList.push({ player: p, otherMonths: otherMonthsPending });
    }
  });
  return pendingList;
}

function renderDashboardPending() {
  const container = document.getElementById('pending-funds-list');
  const searchVal = document.getElementById('pending-search-input').value.toLowerCase();
  container.innerHTML = '';
  
  // We check for May 2026 (the current active tracking month)
  const pendingList = getPendingPlayersForMonth('2026-05');
  
  // Filter by search
  const filtered = pendingList.filter(item => {
    return item.player.name.toLowerCase().includes(searchVal) || 
           item.player.number.toString().includes(searchVal);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = '<li class="text-gray" style="text-align: center; padding: 16px; list-style:none;">No pending payments found!</li>';
    return;
  }
  
  filtered.forEach(item => {
    const p = item.player;
    const monthsStr = item.otherMonths.length > 0 
      ? `+ Owe: ${item.otherMonths.map(m => getMonthNameByNum(m)).join(', ')}`
      : 'Current month only';
      
    const li = document.createElement('li');
    li.className = 'pending-item';
    
    // Check if current user is admin to show collect action
    const actionHtml = currentRole === 'admin' 
      ? `<button class="pending-action-btn" onclick="quickCollectPayment('${p.id}', '2026-05')">Collect</button>`
      : `<span class="pending-months-badge">Due</span>`;

    const nudgeText = `Hi ${p.name}, this is a friendly reminder from RCC regarding your pending subscription fee of ₹500 for ${getMonthNameByNum('05')} 2026. Please clear it at your convenience. Thanks!`;
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
          <span class="text-gray" style="font-size: 10px;">${monthsStr}</span>
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
  
  // Validation: unique jersey number
  const duplicateNum = players.find(p => p.number === number && p.id !== id);
  if (duplicateNum) {
    showToast(`Jersey #${number} is already taken by ${duplicateNum.name}!`, 'danger');
    return;
  }

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
      id: 'p_' + Date.now(),
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
  
  // Compute target amount: target is ₹500 per player
  const targetAmount = players.length * 500;
  
  // Fetch logs for this month
  const monthPayments = payments.filter(p => p.month === monthVal && p.status === 'Paid');
  const collectedAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = targetAmount - collectedAmount;

  // Render Stats
  document.getElementById('payment-target-amount').textContent = `₹${targetAmount}`;
  document.getElementById('payment-collected-amount').textContent = `₹${collectedAmount}`;
  document.getElementById('payment-pending-amount').textContent = `₹${pendingAmount}`;

  // Filter players by search
  const filteredPlayers = players.filter(p => {
    return p.name.toLowerCase().includes(searchVal) || p.number.toString().includes(searchVal);
  });

  if (filteredPlayers.length === 0) {
    listContainer.innerHTML = '<div class="text-gray" style="text-align: center; padding: 20px;">No players match filters.</div>';
    return;
  }

  filteredPlayers.forEach(p => {
    // Find payment record
    const payLog = payments.find(pay => pay.playerId === p.id && pay.month === monthVal);
    const isPaid = payLog && payLog.status === 'Paid';
    
    const row = document.createElement('div');
    row.className = `payment-row ${isPaid ? 'paid' : 'pending'}`;
    
    const badgeText = isPaid ? `Paid ₹${payLog.amount}` : 'Pending';
    const badgeClass = isPaid ? 'payment-status-badge paid' : 'payment-status-badge pending';
    const datePaidText = isPaid ? `On ${formatDateDisplay(payLog.date)}` : 'Fees due';

    // Click handler only triggers modal if Admin
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
      <span class="${badgeClass}">${badgeText}</span>
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

// Log Payment Modal management
function openPaymentModal(playerId, monthVal) {
  const modal = document.getElementById('payment-modal');
  const p = players.find(p => p.id === playerId);
  
  document.getElementById('payment-player-id').value = playerId;
  document.getElementById('payment-month-val').value = monthVal;
  
  document.getElementById('payment-player-name').textContent = p.name;
  document.getElementById('payment-player-number').textContent = `Jersey #${p.number}`;
  
  // Format Month header display e.g. "2026-05" -> "May 2026"
  const parts = monthVal.split('-');
  const monthName = getMonthNameByNum(parts[1]);
  document.getElementById('payment-month-txt').textContent = `${monthName} ${parts[0]}`;

  // Find existing log
  const payLog = payments.find(pay => pay.playerId === playerId && pay.month === monthVal);
  const statusSelect = document.getElementById('payment-status');
  const amountInput = document.getElementById('payment-amount');
  const dateInput = document.getElementById('payment-date');
  const fields = document.getElementById('payment-details-fields');
  
  if (payLog) {
    statusSelect.value = payLog.status;
    amountInput.value = payLog.amount || 500;
    dateInput.value = payLog.date || getTodayDateString();
  } else {
    statusSelect.value = 'Paid';
    amountInput.value = 500;
    dateInput.value = getTodayDateString();
  }
  
  if (statusSelect.value === 'Paid') {
    fields.style.display = 'block';
  } else {
    fields.style.display = 'none';
  }

  modal.classList.remove('hidden');
}

function savePaymentForm() {
  const playerId = document.getElementById('payment-player-id').value;
  const month = document.getElementById('payment-month-val').value;
  const status = document.getElementById('payment-status').value;
  const amount = parseInt(document.getElementById('payment-amount').value) || 0;
  const date = document.getElementById('payment-date').value;

  const player = players.find(p => p.id === playerId);
  
  // Find or create record
  const logIndex = payments.findIndex(pay => pay.playerId === playerId && pay.month === month);
  
  if (logIndex > -1) {
    payments[logIndex] = { ...payments[logIndex], status, amount: status === 'Paid' ? amount : 0, date: status === 'Paid' ? date : '' };
  } else {
    payments.push({
      id: 'pay_' + Date.now(),
      playerId,
      month,
      status,
      amount: status === 'Paid' ? amount : 0,
      date: status === 'Paid' ? date : ''
    });
  }

  saveData('rcc_payments', payments);
  document.getElementById('payment-modal').classList.add('hidden');
  
  // Refresh views
  const activeTab = document.querySelector('.nav-item.active').dataset.tab;
  renderView(activeTab);
  showToast(`Payment updated for ${player.name}`, 'success');
}

// -------------------------------------------------------------
// ATTENDANCE VIEW LOGIC
// -------------------------------------------------------------
let selectedPlayerForClock = null;

function renderAttendance() {
  const dateVal = document.getElementById('attendance-date').value;
  const listContainer = document.getElementById('attendance-list');
  const searchVal = document.getElementById('attendance-search').value.toLowerCase();
  
  listContainer.innerHTML = '';
  
  // Today present count
  const presentLogs = attendance.filter(a => a.date === dateVal);
  const presentCount = presentLogs.length;
  
  // Render stats
  document.getElementById('attendance-stats-text').textContent = `Present: ${presentCount} / ${players.length} Players`;
  const pct = players.length > 0 ? (presentCount / players.length) * 100 : 0;
  document.getElementById('attendance-progress-fill').style.width = `${pct}%`;

  // Filter players
  const filteredPlayers = players.filter(p => {
    return p.name.toLowerCase().includes(searchVal) || p.number.toString().includes(searchVal);
  });

  if (filteredPlayers.length === 0) {
    listContainer.innerHTML = '<div class="text-gray" style="text-align: center; padding: 20px;">No players match filter.</div>';
    return;
  }

  filteredPlayers.forEach(p => {
    // Find attendance log for this date and player
    const log = attendance.find(a => a.date === dateVal && a.playerId === p.id);
    const isPresent = !!log;
    
    const row = document.createElement('div');
    row.className = `attendance-row ${isPresent ? 'present' : 'absent'}`;
    
    let rightColHtml = '';
    
    if (isPresent) {
      // Marked present: Show entry time
      const deleteBtn = currentRole === 'admin' 
        ? `<button class="icon-btn margin-right-xs" onclick="deleteAttendance('${p.id}', '${dateVal}')"><i class="fa-solid fa-trash text-danger" style="font-size: 12px;"></i></button>`
        : '';
        
      rightColHtml = `
        <div class="flex-row">
          ${deleteBtn}
          <span class="attendance-time-badge"><i class="fa-solid fa-check"></i> ${log.time}</span>
        </div>
      `;
    } else {
      // Absent / Not marked: Show action buttons if admin, else show Absent label
      if (currentRole === 'admin') {
        rightColHtml = `
          <div class="attendance-actions">
            <button class="btn-now" onclick="markAttendanceNow('${p.id}', '${dateVal}')">Now</button>
            <button class="btn-manual" onclick="openClockPicker('${p.id}', '${dateVal}')">Manual</button>
          </div>
        `;
      } else {
        rightColHtml = `<span class="text-gray" style="font-size: 12px; font-weight:600; padding: 4px 10px; border:1px solid var(--border-color); border-radius:6px;">Absent</span>`;
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
  
  // Round minutes to nearest 5 for snapping
  let m = now.getMinutes();
  clockMinute = Math.round(m / 5) * 5;
  if (clockMinute === 60) clockMinute = 0;

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
    angle = (clockMinute / 5) * 30; // 360 / 12 = 30 deg per 5 min segment
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
    // Snap to nearest 5 minutes
    let seg = Math.round(deg / 30);
    let minute = seg * 5;
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
