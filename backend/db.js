const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'bank.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
const initSql = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId TEXT UNIQUE NOT NULL,
    accountNumber TEXT UNIQUE NOT NULL,
    password TEXT,
    email TEXT,
    createdAt TEXT,
    failedLoginAttempts INTEGER DEFAULT 0,
    lockoutUntil TEXT,
    twoFAEnabled INTEGER DEFAULT 0,
    twoFASecret TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    number TEXT,
    balance REAL,
    currency TEXT,
    createdAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    amount REAL,
    type TEXT,
    status TEXT,
    fromAccount TEXT,
    toAccount TEXT,
    method TEXT,
    description TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS creditcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountNumber TEXT,
    cardType TEXT,
    cardNumber TEXT,
    status TEXT,
    createdAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS fixeddeposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountNumber TEXT,
    amount REAL,
    term INTEGER,
    status TEXT,
    createdAt TEXT
  )`
];

initSql.forEach(sql => db.run(sql));

// Function to generate unique account number
function generateAccountNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

// Function to check if account number exists
function accountNumberExists(accountNumber) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users WHERE accountNumber = ?', [accountNumber], (err, row) => {
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}

// Function to generate unique account number
async function generateUniqueAccountNumber() {
  let accountNumber;
  let exists = true;
  while (exists) {
    accountNumber = generateAccountNumber();
    exists = await accountNumberExists(accountNumber);
  }
  return accountNumber;
}

// Export the function for use in routes
db.generateUniqueAccountNumber = generateUniqueAccountNumber;

// Function to generate unique FD number
function generateFDNumber() {
  return 'FD' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function fdNumberExists(fdNumber) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM fixeddeposits WHERE number = ?', [fdNumber], (err, row) => {
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}

async function generateUniqueFDNumber() {
  let fdNumber;
  let exists = true;
  while (exists) {
    fdNumber = generateFDNumber();
    exists = await fdNumberExists(fdNumber);
  }
  return fdNumber;
}
db.generateUniqueFDNumber = generateUniqueFDNumber;

// Automatic NeDB-to-SQLite migration (runs only if tables are empty)
function migrateIfNeeded() {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return;
    if (row.count === 0 && fs.existsSync(path.join(__dirname, 'users.db'))) {
      // Migrate users
      const users = fs.readFileSync(path.join(__dirname, 'users.db'), 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
      users.forEach(u => {
        // Generate customer ID for existing users
        const customerId = 'CUST' + Math.floor(100000 + Math.random() * 900000);
        db.run('INSERT OR IGNORE INTO users (customerId, accountNumber, password, email, createdAt, failedLoginAttempts, lockoutUntil, twoFAEnabled, twoFASecret) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [customerId, u.accountNumber, u.password, u.email || null, u.createdAt, u.failedLoginAttempts || 0, u.lockoutUntil || null, u.twoFAEnabled ? 1 : 0, u.twoFASecret || null]);
      });
    }
  });
  db.get('SELECT COUNT(*) as count FROM accounts', (err, row) => {
    if (err) return;
    if (row.count === 0 && fs.existsSync(path.join(__dirname, 'accounts.db'))) {
      const accounts = fs.readFileSync(path.join(__dirname, 'accounts.db'), 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
      accounts.forEach(a => {
        db.run('INSERT INTO accounts (type, number, balance, currency, createdAt) VALUES (?, ?, ?, ?, ?)',
          [a.type, a.number, a.balance, a.currency, a.createdAt]);
      });
    }
  });
  db.get('SELECT COUNT(*) as count FROM transactions', (err, row) => {
    if (err) return;
    if (row.count === 0 && fs.existsSync(path.join(__dirname, 'transactions.db'))) {
      const txns = fs.readFileSync(path.join(__dirname, 'transactions.db'), 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
      txns.forEach(t => {
        db.run('INSERT INTO transactions (date, amount, type, status, fromAccount, toAccount, method, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [t.date, t.amount, t.type, t.status, t.fromAccount, t.toAccount, t.method, t.description]);
      });
    }
  });
  db.get('SELECT COUNT(*) as count FROM creditcards', (err, row) => {
    if (err) return;
    if (row.count === 0 && fs.existsSync(path.join(__dirname, 'creditcards.db'))) {
      const cards = fs.readFileSync(path.join(__dirname, 'creditcards.db'), 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
      cards.forEach(c => {
        db.run('INSERT INTO creditcards (accountNumber, cardType, cardNumber, status, createdAt) VALUES (?, ?, ?, ?, ?)',
          [c.accountNumber, c.cardType, c.cardNumber, c.status, c.createdAt]);
      });
    }
  });
  db.get('SELECT COUNT(*) as count FROM fixeddeposits', (err, row) => {
    if (err) return;
    if (row.count === 0 && fs.existsSync(path.join(__dirname, 'fixeddeposits.db'))) {
      const fds = fs.readFileSync(path.join(__dirname, 'fixeddeposits.db'), 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
      fds.forEach(fd => {
        db.run('INSERT INTO fixeddeposits (accountNumber, amount, term, status, createdAt) VALUES (?, ?, ?, ?, ?)',
          [fd.accountNumber, fd.amount, fd.term, fd.status, fd.createdAt]);
      });
    }
  });
}
migrateIfNeeded();

// Utility: Clear all users and accounts (run once, then remove/comment out)
function clearAllUsersAndAccounts() {
  db.run('DELETE FROM users');
  db.run('DELETE FROM accounts');
}
clearAllUsersAndAccounts();

// Set dummy balances for test accounts
function setDummyBalances() {
  db.run("UPDATE accounts SET balance = 5000 WHERE number = '1111111111'");
  db.run("UPDATE accounts SET balance = 5000 WHERE number = '2222222222'");
}
setTimeout(setDummyBalances, 1000); // Delay to ensure accounts exist

module.exports = db;
