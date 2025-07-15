const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');


// Persistent NeDB database
const db = require('./db');

// Initialize database connections
const initializeDB = () => {
  // NeDB initialization removed
};

initializeDB();

// Use working Gmail credentials for all emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'saket314159@gmail.com',
    pass: 'lgda dgxf bnnl npgt '
  }
});

// In-memory store for 2FA codes (for demo; use Redis or DB for production)
const twoFACodes = {};

// Register new user (with optional 2FA and CAPTCHA)
router.post('/register', async (req, res) => {
  const { customerId, password, confirmPassword, email, enable2FA, captcha } = req.body;
  const speakeasy = require('speakeasy');

  // Simple CAPTCHA check (for demonstration, expects '12345')
  if (!captcha || captcha !== '12345') {
    return res.status(400).json({ success: false, message: 'Invalid CAPTCHA' });
  }

  try {
    // Validate input
    if (!customerId || !password || !confirmPassword || !email) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    // Check if customer ID already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE customerId = ?', [customerId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Customer ID already exists' });
    }

    // Generate unique account number
    const accountNumber = await db.generateUniqueAccountNumber();

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    let twoFASecret = null;
    let twoFAEnabled = false;
    if (enable2FA) {
      const secret = speakeasy.generateSecret();
      twoFASecret = secret.base32;
      twoFAEnabled = true;
    }
    const newUser = {
      customerId,
      accountNumber,
      password: hashedPassword,
      email,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      twoFAEnabled,
      twoFASecret
    };

    // Create initial account with $1000 balance
    const initialAccount = {
      type: 'Checking',
      number: accountNumber,
      balance: 1000,
      currency: 'USD',
      createdAt: new Date().toISOString()
    };

    // Insert user and account
    await Promise.all([
      new Promise((resolve, reject) => {
        db.run('INSERT INTO users (customerId, accountNumber, password, email, createdAt, failedLoginAttempts, lockoutUntil, twoFAEnabled, twoFASecret) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [customerId, accountNumber, hashedPassword, email, newUser.createdAt, newUser.failedLoginAttempts, newUser.lockoutUntil, newUser.twoFAEnabled, newUser.twoFASecret],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }),
      new Promise((resolve, reject) => {
        db.run('INSERT INTO accounts (type, number, balance, currency, createdAt) VALUES (?, ?, ?, ?, ?)',
          [initialAccount.type, initialAccount.number, initialAccount.balance, initialAccount.currency, initialAccount.createdAt],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      })
    ]);

    res.json({
      success: true,
      message: 'Registration successful',
      user: { customerId, accountNumber, twoFAEnabled, twoFASecret: twoFAEnabled ? twoFASecret : undefined }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login route (persistent) with account lockout, 2FA, and CAPTCHA
router.post('/login', async (req, res) => {
  const { customerId, password, twoFACode, captcha } = req.body;

  // Simple CAPTCHA check (for demonstration, expects '12345')
  if (!captcha || captcha !== '12345') {
    return res.status(400).json({ success: false, message: 'Invalid CAPTCHA' });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE customerId = ?', [customerId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Account lockout check
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      return res.status(403).json({ success: false, message: `Account locked. Try again after ${user.lockoutUntil}` });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockoutUntil = null;
      if (failedAttempts >= 5) {
        // Lock account for 15 minutes
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await new Promise((resolve, reject) => {
        db.run('UPDATE users SET failedLoginAttempts = ?, lockoutUntil = ? WHERE customerId = ?',
          [failedAttempts, lockoutUntil, customerId],
          function(err) {
            if (err) reject(err); else resolve();
          }
        );
      });
      return res.status(401).json({ success: false, message: lockoutUntil ? `Account locked due to multiple failed attempts. Try again after ${lockoutUntil}` : 'Invalid credentials' });
    }

    // Reset failed login attempts on success
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET failedLoginAttempts = 0, lockoutUntil = null WHERE customerId = ?',
        [customerId],
        function(err) {
          if (err) reject(err); else resolve();
        }
      );
    });

    // 2FA check if enabled (now via email)
    if (user.twoFAEnabled) {
      // If no code provided, generate and email it
      if (!twoFACode) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        twoFACodes[customerId] = { code, expires: Date.now() + 5 * 60 * 1000 };
        await transporter.sendMail({
          from: 'saket314159@gmail.com',
          to: user.email,
          subject: 'Your ViralBank 2FA Code',
          text: `Your 2FA code is: ${code}\nThis code is valid for 5 minutes.`
        });
        return res.status(200).json({ success: false, message: '2FA code sent to your email. Please enter the code to complete login.', require2FA: true });
      } else {
        // Validate code
        const entry = twoFACodes[customerId];
        if (!entry || entry.code !== twoFACode || Date.now() > entry.expires) {
          return res.status(401).json({ success: false, message: 'Invalid or expired 2FA code.' });
        }
        delete twoFACodes[customerId];
      }
    }

    // Send login notification email
    await transporter.sendMail({
      from: 'saket314159@gmail.com',
      to: user.email,
      subject: 'ViralBank Login Notification',
      text: `Dear Customer,\n\nYou have successfully logged in to your ViralBank account.\nTime: ${new Date().toLocaleString()}\nCustomer ID: ${customerId}\nAccount: ${user.accountNumber}\nIf this was not you, please contact support immediately.\n\n- ViralBank`
    });

    res.json({ success: true, message: 'Login successful', user: { customerId, accountNumber: user.accountNumber } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get account summary (persistent)
router.get('/accounts/:accountNumber', async (req, res) => {
  const { accountNumber } = req.params;

  try {
    // Verify user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE accountNumber = ?', [accountNumber], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch user's accounts, credit cards, fixed deposits, and transactions
    const [accounts, creditCards, fixedDeposits, transactions] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM accounts WHERE number = ?', [accountNumber], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM creditCards WHERE accountNumber = ?', [accountNumber], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM fixedDeposits WHERE accountNumber = ?', [accountNumber], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM transactions WHERE fromAccount = ? OR toAccount = ? ORDER BY date DESC', [accountNumber, accountNumber], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      })
    ]);

    res.json({
      success: true,
      accounts: accounts || [],
      creditCards: creditCards || [],
      fixedDeposits: fixedDeposits || [],
      transactions: transactions || []
    });

  } catch (error) {
    console.error('Error fetching account summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch account summary' });
  }
});

// Get transactions (persistent)
router.get('/transactions/:accountNumber', async (req, res) => {
  const { accountNumber } = req.params;

  try {
    // Verify user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE accountNumber = ?', [accountNumber], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch transactions where user is either sender or receiver
    const transactions = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM transactions WHERE fromAccount = ? OR toAccount = ? ORDER BY date DESC', [accountNumber, accountNumber], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      transactions: transactions || []
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// Helper to send transaction email
async function sendTransactionEmail(accountNumber, transaction) {
  // Fetch sender's email
  const sender = await new Promise((resolve, reject) => {
    db.get('SELECT email FROM users WHERE accountNumber = ?', [accountNumber], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  if (sender && sender.email) {
    // Compose email
    let mailOptions = {
      from: 'saket314159@gmail.com',
      to: sender.email,
      subject: 'Transaction Notification - Reference #' + transaction._id,
      text: `Dear Customer,\n\nA transaction has occurred on your account.\n\nType: ${transaction.type}\nAmount: $${transaction.amount}\nStatus: ${transaction.status}\nFrom: ${transaction.fromAccount}\nTo: ${transaction.toAccount}\nDate: ${transaction.date}\nReference Number: ${transaction._id}\n\nThank you for banking with us.\n\n- ViralBank`
    };
    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email send error:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  }
}

// Post a new transfer (persistent)
router.post('/transfer', async (req, res) => {
  const { fromAccount, toAccount, ifsc, amount, method } = req.body;
  
  try {
    // Input validation
    if (!fromAccount || !toAccount || !amount || !method) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Find source and destination accounts
    const [sourceAccount, destAccount] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM accounts WHERE number = ?', [fromAccount], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM accounts WHERE number = ?', [toAccount], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);

    // Validate accounts
    if (!sourceAccount) {
      return res.status(400).json({ success: false, message: 'Invalid source account' });
    }
    if (!destAccount) {
      return res.status(400).json({ success: false, message: 'Invalid destination account' });
    }
    if (sourceAccount.balance < transferAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient funds' });
    }

    // Perform transfer atomically
    await new Promise((resolve, reject) => {
      db.run('UPDATE accounts SET balance = balance - ? WHERE number = ?',
        [transferAmount, fromAccount],
        function(err) {
          if (err) reject(new Error('Failed to update source account'));
          else resolve();
        }
      );
    });

    try {
      await new Promise((resolve, reject) => {
        db.run('UPDATE accounts SET balance = balance + ? WHERE number = ?',
          [transferAmount, toAccount],
          function(err) {
            if (err) reject(new Error('Failed to update destination account'));
            else resolve();
          }
        );
      });
    } catch (error) {
      // Rollback source account if destination update fails
      await new Promise((resolve) => {
        db.run('UPDATE accounts SET balance = balance + ? WHERE number = ?',
          [transferAmount, fromAccount],
          function() {
            resolve();
          }
        );
      });
      throw error;
    }

    // Record transaction
    const newTxn = {
      date: new Date().toISOString(),
      amount: transferAmount,
      type: 'Transfer',
      status: 'Completed',
      fromAccount: fromAccount,
      toAccount: toAccount,
      method: method,
      description: `Transfer to ${toAccount} (${method})`,
    };

    const transaction = await new Promise((resolve, reject) => {
      db.run('INSERT INTO transactions (date, amount, type, status, fromAccount, toAccount, method, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [newTxn.date, newTxn.amount, newTxn.type, newTxn.status, newTxn.fromAccount, newTxn.toAccount, newTxn.method, newTxn.description],
        function(err) {
          if (err) reject(new Error('Failed to record transaction'));
          else resolve(this.lastID);
        }
      );
    });
    // Send transaction email
    await sendTransactionEmail(fromAccount, { _id: transaction, ...newTxn });

    // Fetch updated account information
    const [accounts, creditCards, fixedDeposits] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM accounts', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM creditCards', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM fixedDeposits', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      })
    ]);

    res.json({
      success: true,
      transaction,
      accounts,
      creditCards,
      fixedDeposits
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Transfer failed'
    });
  }
});

// Create a new credit card for a user
router.post('/creditcards', async (req, res) => {
  const { accountNumber, cardType } = req.body;
  if (!accountNumber || !cardType) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  try {
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE accountNumber = ?', [accountNumber], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Create card
    const cardNumber = '4' + Math.floor(100000000000000 + Math.random() * 900000000000000); // 16-digit
    const newCard = {
      accountNumber,
      cardType,
      cardNumber: cardNumber.toString(),
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO creditCards (accountNumber, cardType, cardNumber, status, createdAt) VALUES (?, ?, ?, ?, ?)',
        [newCard.accountNumber, newCard.cardType, newCard.cardNumber, newCard.status, newCard.createdAt],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    res.json({ success: true, card: newCard });
  } catch (error) {
    console.error('Credit card creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create credit card' });
  }
});

// Create a new fixed deposit for a user
router.post('/fixeddeposits', async (req, res) => {
  const { accountNumber, amount, term } = req.body;
  if (!accountNumber || !amount || !term) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  try {
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE accountNumber = ?', [accountNumber], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Generate unique FD number
    const fdNumber = await db.generateUniqueFDNumber();
    // Create fixed deposit
    const newFD = {
      accountNumber,
      number: fdNumber,
      amount: Number(amount),
      term: Number(term),
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO fixedDeposits (accountNumber, number, amount, term, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [newFD.accountNumber, newFD.number, newFD.amount, newFD.term, newFD.status, newFD.createdAt],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    res.json({ success: true, fixedDeposit: newFD });
  } catch (error) {
    console.error('Fixed deposit creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create fixed deposit' });
  }
});

module.exports = router;
