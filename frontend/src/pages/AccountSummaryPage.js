import React from 'react';
import styles from './AccountSummaryPage.module.css';
import { generateAccountStatementPDF } from './pdfUtils';

function AccountSummaryPage({ onQuickLink, accounts = [], creditCards = [], fixedDeposits = [] }) {
  // Validate and format account data with strict type checking
  const validAccounts = accounts.filter(acc => 
    acc && 
    typeof acc.balance === 'number' && 
    typeof acc.type === 'string' && 
    typeof acc.number === 'string' && 
    typeof acc.currency === 'string' && 
    !isNaN(acc.balance) && 
    acc.balance >= 0
  );

  const validCreditCards = creditCards.filter(card => 
    card && 
    typeof card.availableCredit === 'number' && 
    typeof card.limit === 'number' && 
    typeof card.number === 'string' && 
    typeof card.currency === 'string' && 
    !isNaN(card.availableCredit) && 
    !isNaN(card.limit) && 
    card.availableCredit >= 0 && 
    card.limit >= 0
  );

  const validFixedDeposits = fixedDeposits.filter(fd => 
    fd && 
    typeof fd.amount === 'number' && 
    typeof fd.number === 'string' && 
    typeof fd.maturity === 'string' && 
    typeof fd.currency === 'string' && 
    !isNaN(fd.amount) && 
    fd.amount >= 0 && 
    new Date(fd.maturity).toString() !== 'Invalid Date'
  );

  // Download statement as CSV (accounts, credit cards, fixed deposits)
  const handleDownloadStatement = () => {
    const sections = [];
    // Accounts
    sections.push('Accounts');
    sections.push('Type,Number,Balance');
    validAccounts.forEach(acc => {
      sections.push(`${acc.type},${acc.number},${acc.currency} ${acc.balance.toLocaleString()}`);
    });
    sections.push('');
    // Credit Cards
    sections.push('Credit Cards');
    sections.push('Number,Available Credit,Limit');
    validCreditCards.forEach(card => {
      sections.push(`${card.number},${card.currency} ${card.availableCredit.toLocaleString()},${card.currency} ${card.limit.toLocaleString()}`);
    });
    sections.push('');
    // Fixed Deposits
    sections.push('Fixed Deposits');
    sections.push('Number,Amount,Maturity');
    validFixedDeposits.forEach(fd => {
      sections.push(`${fd.number},${fd.currency} ${fd.amount.toLocaleString()},${fd.maturity}`);
    });
    const csvContent = sections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'account_statement.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download statement as PDF
  const handleDownloadPDF = () => {
    generateAccountStatementPDF({
      accounts: validAccounts,
      creditCards: validCreditCards,
      fixedDeposits: validFixedDeposits
    });
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Account Summary</h2>
      <div className={styles.section}>
        <h3>Accounts</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Type</th><th>Number</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {validAccounts.map(acc => (
              <tr key={acc.number}>
                <td>{acc.type}</td>
                <td>{acc.number}</td>
                <td>{acc.currency} {acc.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.section}>
        <h3>Credit Card</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Number</th><th>Available Credit</th><th>Limit</th></tr>
          </thead>
          <tbody>
            {validCreditCards.map(card => (
              <tr key={card.number}>
                <td>{card.number}</td>
                <td>{card.currency} {card.availableCredit.toLocaleString()}</td>
                <td>{card.currency} {card.limit.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.section}>
        <h3>Fixed Deposits</h3>
        <table className={styles.table}>
          <thead>
            <tr><th>Number</th><th>Amount</th><th>Maturity</th></tr>
          </thead>
          <tbody>
            {validFixedDeposits.map(fd => (
              <tr key={fd.number}>
                <td>{fd.number}</td>
                <td>{fd.currency} {fd.amount.toLocaleString()}</td>
                <td>{fd.maturity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.links}>
        <button className={styles.linkBtn} onClick={() => onQuickLink && onQuickLink('transactions')}>View Transactions</button>
        <button className={styles.linkBtn} onClick={handleDownloadStatement}>Download Statement (CSV)</button>
        <button className={styles.linkBtn} onClick={handleDownloadPDF}>Download Statement (PDF)</button>
        <button className={styles.linkBtn} onClick={() => onQuickLink && onQuickLink('transfer')}>Transfer Money</button>
      </div>
    </div>
  );
}

export default AccountSummaryPage;
