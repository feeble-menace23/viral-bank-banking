// --- Modal & Loading Overlay ---
function showModal(message, opts = {}) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = message;
  modal.style.display = 'flex';
  document.getElementById('modalClose').onclick = () => (modal.style.display = 'none');
  if (opts.autoClose) setTimeout(() => (modal.style.display = 'none'), opts.autoClose);
}
function hideModal() {
  document.getElementById('modal').style.display = 'none';
}
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// --- Session Management ---
function setSession(accountNumber) {
  localStorage.setItem('accountNumber', accountNumber);
}
function getSession() {
  return localStorage.getItem('accountNumber');
}
function clearSession() {
  localStorage.removeItem('accountNumber');
}

// --- API Helpers ---
const API_BASE = 'http://localhost:5001/api';

async function apiRequest(url, options = {}) {
  showLoading();
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    hideLoading();
    return data;
  } catch (e) {
    hideLoading();
    return { success: false, message: 'Network error' };
  }
}

// --- UI Sections ---
function dashboardSection(accounts) {
  if (!accounts || !accounts.length) return '<section class="card"><h2>Dashboard</h2><p>No accounts found.</p></section>';
  return `<section class="card"><h2>Dashboard</h2>
    <p>Welcome! Here is your account summary:</p>
    <ul>
      ${accounts.map(acc => `<li><b>${acc.type}:</b> $${acc.balance} (${acc.currency})</li>`).join('')}
    </ul>
  </section>`;
}

function formatCardNumber(cardNumber) {
  if (!cardNumber) return 'N/A';
  return cardNumber.toString().replace(/(\d{4})(?=\d)/g, '$1 ');
}

function accountsSection(accounts, creditCards, fixedDeposits) {
  return `<section class="card"><h2>Account Summary</h2>
    <h3>Accounts</h3>
    <ul>${accounts.map(acc => `<li>${acc.type}: $${acc.balance} (${acc.currency})<br><span style='font-size:0.95em;color:#555;'>Account Number: <b>${acc.number || 'N/A'}</b></span></li>`).join('')}</ul>
    <h3>Credit Cards</h3>
    <ul>${creditCards.map(card => `<li>${formatCardNumber(card.cardNumber) || 'N/A'} - ${card.status || ''}<br><span style='font-size:0.95em;color:#555;'>Card Number: <b>${formatCardNumber(card.cardNumber) || 'N/A'}</b></span></li>`).join('') || 'None'}</ul>
    <h3>Fixed Deposits</h3>
    <ul>${fixedDeposits.map(fd => `<li>${fd.amount || ''} (${fd.status || ''})<br><span style='font-size:0.95em;color:#555;'>FD Number: <b>${fd.number || 'N/A'}</b></span></li>`).join('') || 'None'}</ul>
  </section>`;
}

function transactionsSection(transactions) {
  if (!transactions || !transactions.length) return '<section class="card"><h2>Transactions</h2><p>No transactions found.</p></section>';
  const accountNumber = getSession();
  return `<section class="card"><h2>Transactions</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <span></span>
      <div>
        <button class="button-primary" id="downloadCSV">Download CSV</button>
        <button class="button-secondary" id="downloadPDF">Download PDF</button>
      </div>
    </div>
    <div style="overflow-x:auto;">
    <table class="txn-table">
      <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>From</th><th>To</th></tr></thead>
      <tbody>
        ${transactions.map(txn => {
          const isReceived = txn.toAccount === accountNumber;
          const amountClass = isReceived ? 'txn-received' : 'txn-sent';
          return `<tr>
            <td>${new Date(txn.date).toLocaleString()}</td>
            <td>${txn.type}</td>
            <td class="${amountClass}">${isReceived ? '+' : '-'}$${txn.amount}</td>
            <td>${txn.status}</td>
            <td>${txn.fromAccount}</td>
            <td>${txn.toAccount}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
  </section>`;
}

function downloadCSV(transactions) {
  const header = ['Date', 'Type', 'Amount', 'Status', 'From', 'To'];
  const rows = transactions.map(txn => [
    new Date(txn.date).toLocaleString(),
    txn.type,
    txn.amount,
    txn.status,
    txn.fromAccount,
    txn.toAccount
  ]);
  let csv = header.join(',') + '\n';
  csv += rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPDF(transactions) {
  // Simple PDF using window.print (for now, for pure JS)
  const win = window.open('', '', 'width=800,height=600');
  win.document.write('<html><head><title>Transactions PDF</title></head><body>');
  win.document.write('<h2>Transaction History</h2>');
  win.document.write('<table border="1" style="width:100%;border-collapse:collapse;">');
  win.document.write('<thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>From</th><th>To</th></tr></thead><tbody>');
  transactions.forEach(txn => {
    win.document.write(`<tr><td>${new Date(txn.date).toLocaleString()}</td><td>${txn.type}</td><td>$${txn.amount}</td><td>${txn.status}</td><td>${txn.fromAccount}</td><td>${txn.toAccount}</td></tr>`);
  });
  win.document.write('</tbody></table></body></html>');
  win.document.close();
  win.print();
}

function transferSection(accountNumber) {
  return `<section class="card"><h2>Transfer Money</h2>
    <form class="form-container" id="transferForm">
      <label for='to'>To Account</label>
      <input class='input-field' id='to' name='to' type='text' placeholder='Recipient Account' required>
      <label for='amount'>Amount</label>
      <input class='input-field' id='amount' name='amount' type='number' placeholder='Amount' required>
      <label for='method'>Method</label>
      <select class='input-field' id='method' name='method' required>
        <option value='NEFT'>NEFT</option>
        <option value='RTGS'>RTGS</option>
        <option value='IMPS'>IMPS</option>
      </select>
      <input class='input-field' id='ifsc' name='ifsc' type='text' placeholder='IFSC (optional)'>
      <button class='button-primary' type='submit'>Transfer</button>
      <div id='transferMsg' style='margin-top:8px;'></div>
    </form>
  </section>`;
}

function showTransferConfirmation(details, onConfirm, onCancel) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <h3>Confirm Transfer</h3>
    <div style="margin-bottom:18px;">
      <div><b>To Account:</b> ${details.to}</div>
      <div><b>Amount:</b> $${details.amount}</div>
      <div><b>Method:</b> ${details.method}</div>
      ${details.ifsc ? `<div><b>IFSC:</b> ${details.ifsc}</div>` : ''}
    </div>
    <div style="display:flex;gap:16px;justify-content:flex-end;">
      <button class="button-secondary" id="cancelTransfer">Cancel</button>
      <button class="button-primary" id="confirmTransfer">Confirm</button>
    </div>
  `;
  modal.style.display = 'flex';
  document.getElementById('cancelTransfer').onclick = () => {
    modal.style.display = 'none';
    if (onCancel) onCancel();
  };
  document.getElementById('confirmTransfer').onclick = () => {
    modal.style.display = 'none';
    if (onConfirm) onConfirm();
  };
}

function loginSection(show2FA) {
  return `<section class="card"><h2>Login</h2>
    <form class="form-container" id="loginForm">
      <label for='customerid'>Customer ID</label>
      <input class='input-field' id='customerid' name='customerId' type='text' placeholder='Customer ID' required>
      <label for='pass'>Password</label>
      <input class='input-field' id='pass' name='password' type='password' placeholder='Password' required>
      <label for='captcha'>CAPTCHA (enter 12345)</label>
      <input class='input-field' id='captcha' name='captcha' type='text' placeholder='12345' required>
      ${show2FA ? `<label for='twofa'>2FA Code</label><input class='input-field' id='twofa' name='twoFACode' type='text' placeholder='2FA Code' required>` : ''}
      <button class='button-primary' type='submit'>Login</button>
      <div id='loginMsg' style='margin-top:8px;'></div>
    </form>
  </section>`;
}

function registerSection() {
  return `<section class="card"><h2>Register</h2>
    <form class="form-container" id="registerForm">
      <label for='newcustomerid'>Customer ID</label>
      <input class='input-field' id='newcustomerid' name='customerId' type='text' placeholder='Customer ID' required>
      <label for='email'>Email</label>
      <input class='input-field' id='email' name='email' type='email' placeholder='Email' required>
      <label for='newpass'>Password</label>
      <input class='input-field' id='newpass' name='password' type='password' placeholder='Password' required>
      <label for='confirmpass'>Confirm Password</label>
      <input class='input-field' id='confirmpass' name='confirmPassword' type='password' placeholder='Confirm Password' required>
      <label><input type='checkbox' id='enable2FA' name='enable2FA'> Enable 2FA</label>
      <label for='captcha'>CAPTCHA (enter 12345)</label>
      <input class='input-field' id='captcha' name='captcha' type='text' placeholder='12345' required>
      <button class='button-primary' type='submit'>Register</button>
      <div id='registerMsg' style='margin-top:8px;'></div>
    </form>
  </section>`;
}

function heroSection() {
  return `<section class="hero" id="hero">
    <h1>Banking for Brands That Want to Grow</h1>
    <p>Modern, secure, and lightning-fast banking for the digital age. <br> No bloat. No hassle. Just results.</p>
    <button class="button-primary" id="heroGetStarted">Get Started</button>
    <button class="button-secondary">View Features</button>
  </section>`;
}

function creditCardsSection(creditCards) {
  return `<section class="card"><h2>Credit Cards</h2>
    <ul>${creditCards && creditCards.length ? creditCards.map(card => `<li>${card.cardNumber || 'N/A'} - ${card.status || 'Active'}</li>`).join('') : 'No credit cards found.'}</ul>
    <form class="form-container" id="applyCardForm" style="margin-top:24px;">
      <h3>Apply for a New Credit Card</h3>
      <label for='cardType'>Card Type</label>
      <select class='input-field' id='cardType' name='cardType' required>
        <option value='Standard'>Standard</option>
        <option value='Gold'>Gold</option>
        <option value='Platinum'>Platinum</option>
      </select>
      <button class='button-primary' type='submit'>Apply</button>
    </form>
  </section>`;
}

function fixedDepositsSection(fixedDeposits) {
  return `<section class="card"><h2>Fixed Deposits</h2>
    <ul>${fixedDeposits && fixedDeposits.length ? fixedDeposits.map(fd => `<li>Amount: $${fd.amount || ''} - Status: ${fd.status || 'Active'} - Opened: ${fd.createdAt ? new Date(fd.createdAt).toLocaleDateString() : ''}</li>`).join('') : 'No fixed deposits found.'}</ul>
    <form class="form-container" id="openFDForm" style="margin-top:24px;">
      <h3>Open a New Fixed Deposit</h3>
      <label for='fdAmount'>Amount</label>
      <input class='input-field' id='fdAmount' name='fdAmount' type='number' placeholder='Amount' required>
      <label for='fdTerm'>Term (months)</label>
      <input class='input-field' id='fdTerm' name='fdTerm' type='number' placeholder='Term in months' required>
      <div id='fdMaturityInfo' style='margin:10px 0 0 0; color:#1a237e; font-weight:500;'></div>
      <button class='button-primary' type='submit'>Open Fixed Deposit</button>
    </form>
  </section>`;
}

// Add this function to calculate maturity amount based on brackets
function calculateFDMaturity(amount, months) {
  // Example brackets (can be adjusted as needed)
  // < 6 months: 4% p.a., 6-12 months: 5% p.a., 12-24 months: 6% p.a., >24 months: 6.5% p.a.
  let rate;
  if (months < 6) rate = 0.04;
  else if (months < 12) rate = 0.05;
  else if (months < 24) rate = 0.06;
  else rate = 0.065;
  // Simple interest for demonstration: maturity = P * (1 + r * t), t in years
  const years = months / 12;
  const maturity = amount * (1 + rate * years);
  return { maturity: Math.round(maturity * 100) / 100, rate };
}

// --- Render Logic ---
const main = document.querySelector('main.container');
const navLinks = document.querySelectorAll('.nav-links a');
const header = document.querySelector('.header');

async function showSection(section, opts = {}) {
  const accountNumber = getSession();
  if (section === 'dashboard') {
    if (!accountNumber) return showSection('login');
    const data = await apiRequest(`${API_BASE}/accounts/${accountNumber}`);
    if (data.success) main.innerHTML = dashboardSection(data.accounts);
    else main.innerHTML = `<section class='card'><h2>Dashboard</h2><p>${data.message}</p></section>`;
  } else if (section === 'accounts') {
    if (!accountNumber) return showSection('login');
    const data = await apiRequest(`${API_BASE}/accounts/${accountNumber}`);
    if (data.success) main.innerHTML = accountsSection(data.accounts, data.creditCards, data.fixedDeposits);
    else main.innerHTML = `<section class='card'><h2>Account Summary</h2><p>${data.message}</p></section>`;
  } else if (section === 'transactions') {
    if (!accountNumber) return showSection('login');
    const data = await apiRequest(`${API_BASE}/transactions/${accountNumber}`);
    if (data.success) {
      main.innerHTML = transactionsSection(data.transactions);
      if (data.transactions && data.transactions.length) {
        document.getElementById('downloadCSV').onclick = () => downloadCSV(data.transactions);
        document.getElementById('downloadPDF').onclick = () => downloadPDF(data.transactions);
      }
    } else main.innerHTML = `<section class='card'><h2>Transactions</h2><p>${data.message}</p></section>`;
  } else if (section === 'transfer') {
    if (!accountNumber) return showSection('login');
    main.innerHTML = transferSection(accountNumber);
    document.getElementById('transferForm').onsubmit = function(e) {
      e.preventDefault();
      const to = this.to.value;
      const amount = this.amount.value;
      const method = this.method.value;
      const ifsc = this.ifsc.value;
      showTransferConfirmation(
        { to, amount, method, ifsc },
        async () => {
          const res = await apiRequest(`${API_BASE}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromAccount: accountNumber, toAccount: to, amount, method, ifsc })
          });
          if (res.success) {
            showModal('Transfer successful!', { autoClose: 2000 });
            this.reset();
          } else {
            showModal(res.message || 'Transfer failed.', { autoClose: 3000 });
          }
        },
        () => {} // onCancel does nothing
      );
    };
  } else if (section === 'login') {
    let show2FA = opts.show2FA || false;
    main.innerHTML = loginSection(show2FA);
    document.getElementById('loginForm').onsubmit = async function(e) {
      e.preventDefault();
      const customerId = this.customerId.value;
      const password = this.pass.value;
      const captcha = this.captcha.value;
      const twoFACode = show2FA ? this.twofa.value : undefined;
      const body = { customerId, password, captcha };
      if (show2FA) body.twoFACode = twoFACode;
      const res = await apiRequest(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.success) {
        setSession(res.user.accountNumber); // still use accountNumber for session
        showModal('Login successful! Redirecting...', { autoClose: 1200 });
        setTimeout(() => { showSection('dashboard'); updateNav(); }, 1200);
      } else if (res.message && res.message.toLowerCase().includes('2fa')) {
        showSection('login', { show2FA: true });
        showModal('2FA required. Please enter your 2FA code.', { autoClose: 3000 });
      } else if (res.message && res.message.toLowerCase().includes('locked')) {
        showModal(res.message, { autoClose: 4000 });
      } else {
        showModal(res.message || 'Login failed.', { autoClose: 3000 });
      }
    };
  } else if (section === 'register') {
    main.innerHTML = registerSection();
    document.getElementById('registerForm').onsubmit = async function(e) {
      e.preventDefault();
      const customerId = this.customerId.value;
      const email = this.email.value;
      const password = this.newpass.value;
      const confirmPassword = this.confirmpass.value;
      const captcha = this.captcha.value;
      const enable2FA = this.enable2FA.checked;
      const res = await apiRequest(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, email, password, confirmPassword, captcha, enable2FA })
      });
      if (res.success) {
        if (res.user && res.user.twoFAEnabled && res.user.twoFASecret) {
          showModal(`Registration successful!<br>2FA Secret: <b>${res.user.twoFASecret}</b><br>Save this in your authenticator app.<br>Redirecting to login...`, { autoClose: 6000 });
        } else {
          showModal('Registration successful! Please login.', { autoClose: 2000 });
        }
        setTimeout(() => showSection('login'), 2000);
      } else {
        showModal(res.message || 'Registration failed.', { autoClose: 3000 });
      }
    };
  } else if (section === 'creditcards') {
    if (!accountNumber) return showSection('login');
    const data = await apiRequest(`${API_BASE}/accounts/${accountNumber}`);
    main.innerHTML = creditCardsSection(data.creditCards);
    document.getElementById('applyCardForm').onsubmit = async function(e) {
      e.preventDefault();
      const cardType = this.cardType.value;
      const res = await apiRequest(`${API_BASE}/creditcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, cardType })
      });
      if (res.success) {
        showModal('Credit card application submitted and card created!', { autoClose: 2500 });
        setTimeout(() => showSection('creditcards'), 1000);
      } else {
        showModal(res.message || 'Failed to create credit card.', { autoClose: 3000 });
      }
      this.reset();
    };
  } else if (section === 'fixeddeposits') {
    if (!accountNumber) return showSection('login');
    const data = await apiRequest(`${API_BASE}/accounts/${accountNumber}`);
    main.innerHTML = fixedDepositsSection(data.fixedDeposits);
    // Add real-time maturity calculation
    const fdAmountInput = document.getElementById('fdAmount');
    const fdTermInput = document.getElementById('fdTerm');
    const fdMaturityInfo = document.getElementById('fdMaturityInfo');
    function updateFDMaturityInfo() {
      const amount = parseFloat(fdAmountInput.value);
      const months = parseInt(fdTermInput.value);
      if (!isNaN(amount) && amount > 0 && !isNaN(months) && months > 0) {
        const { maturity, rate } = calculateFDMaturity(amount, months);
        fdMaturityInfo.textContent = `Maturity Amount: $${maturity} (Interest Rate: ${(rate*100).toFixed(2)}% p.a.)`;
      } else {
        fdMaturityInfo.textContent = '';
      }
    }
    fdAmountInput.addEventListener('input', updateFDMaturityInfo);
    fdTermInput.addEventListener('input', updateFDMaturityInfo);
    document.getElementById('openFDForm').onsubmit = async function(e) {
      e.preventDefault();
      const amount = this.fdAmount.value;
      const term = this.fdTerm.value;
      const res = await apiRequest(`${API_BASE}/fixeddeposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, amount, term })
      });
      if (res.success) {
        showModal('Fixed deposit opened successfully!', { autoClose: 2500 });
        setTimeout(() => showSection('fixeddeposits'), 1000);
      } else {
        showModal(res.message || 'Failed to open fixed deposit.', { autoClose: 3000 });
      }
      this.reset();
      fdMaturityInfo.textContent = '';
    };
  } else {
    main.innerHTML = heroSection();
    const btn = document.getElementById('heroGetStarted');
    if (btn) btn.onclick = () => showSection('register');
  }
}

function updateNav() {
  const accountNumber = getSession();
  const nav = document.querySelector('.nav-links');
  nav.innerHTML = accountNumber ? `
    <a href="#dashboard">Dashboard</a>
    <a href="#accounts">Accounts</a>
    <a href="#transactions">Transactions</a>
    <a href="#transfer">Transfer Money</a>
    <a href="#creditcards">Credit Cards</a>
    <a href="#fixeddeposits">Fixed Deposits</a>
    <a href="#logout" id="logoutLink">Logout</a>
  ` : `
    <a href="#dashboard">Dashboard</a>
    <a href="#accounts">Accounts</a>
    <a href="#transactions">Transactions</a>
    <a href="#transfer">Transfer Money</a>
    <a href="#creditcards">Credit Cards</a>
    <a href="#fixeddeposits">Fixed Deposits</a>
    <a href="#login">Login</a>
    <a href="#register">Register</a>
  `;
  // Re-attach listeners
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.getAttribute('href').replace('#', '');
      if (section === 'logout') {
        clearSession();
        updateNav();
        showSection('login');
      } else {
        showSection(section);
      }
    });
  });
}

// Modal close on outside click
window.onclick = function(event) {
  const modal = document.getElementById('modal');
  if (event.target === modal) modal.style.display = 'none';
};

// Cursor-following animated background
(function() {
  const cursorBg = document.querySelector('.cursor-bg');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let visible = false;

  function moveBg(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorBg.style.left = mouseX + 'px';
    cursorBg.style.top = mouseY + 'px';
    cursorBg.style.opacity = '0.22';
    cursorBg.style.width = '340px';
    cursorBg.style.height = '340px';
    visible = true;
  }
  function fadeBg() {
    cursorBg.style.opacity = '0.10';
    cursorBg.style.width = '260px';
    cursorBg.style.height = '260px';
    visible = false;
  }
  window.addEventListener('mousemove', moveBg);
  window.addEventListener('mouseleave', fadeBg);
  // Initialize at center
  cursorBg.style.left = mouseX + 'px';
  cursorBg.style.top = mouseY + 'px';
  fadeBg();
})();

// Interactive background blobs that respond to cursor
(function() {
  const blobs = [
    { el: document.getElementById('blob1'), base: { x: 0.12, y: 0.18, w: 160, h: 160 }, color: '#00cfff', strength: 0.25 },
    { el: document.getElementById('blob2'), base: { x: 0.90, y: 0.12, w: 120, h: 120 }, color: '#7f3cff', strength: 0.20 },
    { el: document.getElementById('blob3'), base: { x: 0.18, y: 0.90, w: 100, h: 100 }, color: '#10B981', strength: 0.18 },
    { el: document.getElementById('blob4'), base: { x: 0.84, y: 0.84, w: 90, h: 90 }, color: '#EF4444', strength: 0.15 }
  ];
  let mouse = { x: window.innerWidth/2, y: window.innerHeight/2 };

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function animateBlobs() {
    const now = Date.now();
    const cx = window.innerWidth/2;
    const cy = window.innerHeight/2;
    blobs.forEach((blob, i) => {
      // Parallax offset from center
      const bx = blob.base.x * window.innerWidth;
      const by = blob.base.y * window.innerHeight;
      const offsetX = (mouse.x - cx) * blob.strength;
      const offsetY = (mouse.y - cy) * blob.strength;
      // Gentle floating
      const t = now/1200 + i*1.3;
      const floatX = Math.sin(t) * 10;
      const floatY = Math.cos(t) * 10;
      const tx = bx + offsetX + floatX;
      const ty = by + offsetY + floatY;
      blob.el.style.left = tx + 'px';
      blob.el.style.top = ty + 'px';
    });
    requestAnimationFrame(animateBlobs);
  }
  animateBlobs();
})();

// Initial load
updateNav();
showSection(getSession() ? 'dashboard' : 'hero');