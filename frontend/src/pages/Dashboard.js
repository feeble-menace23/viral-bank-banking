import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountSummaryPage from './AccountSummaryPage';
import TransactionsPage from './TransactionsPage';
import TransferMoneyPage from './TransferMoneyPage';
import styles from './Dashboard.module.css';

function Dashboard({ onLogout }) {
  const [currentSection, setCurrentSection] = useState('summary');
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const customerId = localStorage.getItem('customerId');
  const accountNumber = localStorage.getItem('accountNumber');

  useEffect(() => {
    if (!customerId) {
      navigate('/');
      return;
    }
    fetchAccountData();
  }, [customerId, navigate]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/accounts/${accountNumber}`);
      const data = await response.json();
      
      if (data.success) {
        setAccountData(data);
      } else {
        setError(data.message || 'Failed to fetch account data');
      }
    } catch (err) {
      setError('Server error while fetching account data');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (transferData) => {
    try {
      const response = await fetch('http://localhost:5001/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccount: transferData.from,
          toAccount: transferData.to,
          amount: parseFloat(transferData.amount),
          method: transferData.method,
          ifsc: transferData.ifsc
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh account data after successful transfer
        await fetchAccountData();
        setCurrentSection('transactions');
      } else {
        alert(data.message || 'Transfer failed');
      }
    } catch (err) {
      alert('Server error during transfer');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleQuickLink = (section) => {
    setCurrentSection(section);
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>{error}</div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>ViralBank Dashboard</h1>
        <div className={styles.userInfo}>
          <span>Customer ID: {customerId}</span>
          <span>Account: {accountNumber}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <nav className={styles.navigation}>
        <button 
          className={`${styles.navBtn} ${currentSection === 'summary' ? styles.active : ''}`}
          onClick={() => setCurrentSection('summary')}
        >
          Account Summary
        </button>
        <button 
          className={`${styles.navBtn} ${currentSection === 'transactions' ? styles.active : ''}`}
          onClick={() => setCurrentSection('transactions')}
        >
          Transactions
        </button>
        <button 
          className={`${styles.navBtn} ${currentSection === 'transfer' ? styles.active : ''}`}
          onClick={() => setCurrentSection('transfer')}
        >
          Transfer Money
        </button>
      </nav>

      <main className={styles.main}>
        {currentSection === 'summary' && (
          <AccountSummaryPage 
            accounts={accountData?.accounts || []}
            creditCards={accountData?.creditCards || []}
            fixedDeposits={accountData?.fixedDeposits || []}
            onQuickLink={handleQuickLink}
          />
        )}
        {currentSection === 'transactions' && (
          <TransactionsPage 
            transactions={accountData?.transactions || []}
            onQuickLink={handleQuickLink}
          />
        )}
        {currentSection === 'transfer' && (
          <TransferMoneyPage 
            accounts={accountData?.accounts || []}
            onTransfer={handleTransfer}
            onQuickLink={handleQuickLink}
          />
        )}
      </main>
    </div>
  );
}

export default Dashboard; 