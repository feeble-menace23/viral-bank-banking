import React, { useState, useEffect } from 'react';
import styles from './TransferMoneyPage.module.css';


function TransferMoneyPage({ onTransfer, accounts = [] }) {
  const [form, setForm] = useState({
    from: accounts && accounts.length > 0 ? accounts[0].number : '',
    to: '',
    ifsc: '',
    amount: '',
    method: 'NEFT',
  });
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setForm(f => ({ ...f, from: accounts[0].number }));
    }
  }, [accounts]);
  const [confirmation, setConfirmation] = useState(null);
  const [message, setMessage] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    setConfirmation(form);
    setMessage('');
  };

  const handleConfirm = async () => {
    setMessage('');
    if (onTransfer) await onTransfer(confirmation);
    setConfirmation(null);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Transfer Money</h2>
      {!confirmation ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>From Account</label>
            <select name="from" value={form.from} onChange={handleChange} required>
              {accounts.map(acc => (
                <option key={acc.number} value={acc.number}>
                  {acc.type} ({acc.number}) - {acc.currency} {acc.balance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>To Account</label>
            <input name="to" value={form.to} onChange={handleChange} required placeholder="Recipient Account Number" />
          </div>
          <div className={styles.formGroup}>
            <label>IFSC Code</label>
            <input name="ifsc" value={form.ifsc} onChange={handleChange} required placeholder="Recipient IFSC" />
          </div>
          <div className={styles.formGroup}>
            <label>Amount</label>
            <input name="amount" type="number" value={form.amount} onChange={handleChange} required placeholder="Amount" />
          </div>
          <div className={styles.formGroup}>
            <label>Transfer Method</label>
            <select name="method" value={form.method} onChange={handleChange}>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
            </select>
          </div>
          <button className={styles.button} type="submit">Continue</button>
        </form>
      ) : (
        <div className={styles.confirmation}>
          <h3>Confirm Transfer</h3>
          <ul>
            <li><b>From:</b> {confirmation.from}</li>
            <li><b>To:</b> {confirmation.to}</li>
            <li><b>IFSC:</b> {confirmation.ifsc}</li>
            <li><b>Amount:</b> ${confirmation.amount}</li>
            <li><b>Method:</b> {confirmation.method}</li>
          </ul>
          <button className={styles.button} onClick={handleConfirm}>Confirm & Transfer</button>
          <button className={styles.button} style={{background: '#bdbdbd', color: '#222', marginLeft: '10px'}} onClick={() => setConfirmation(null)} type="button">Cancel</button>
        </div>
      )}
      {message && <div className={styles.message}>{message}</div>}
    </div>
  );
}

export default TransferMoneyPage;
