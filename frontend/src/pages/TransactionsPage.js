import React, { useState } from 'react';
import styles from './TransactionsPage.module.css';
import { generateTransactionsPDF } from './pdfUtils';


function TransactionsPage({ transactions }) {
  const [filter, setFilter] = useState({ type: '', status: '', startDate: '', endDate: '' });
  const [selectedTxn, setSelectedTxn] = useState(null);

  const filtered = (transactions || []).filter(t => {
    const matchesType = !filter.type || t.type === filter.type;
    const matchesStatus = !filter.status || t.status === filter.status;
    const matchesStart = !filter.startDate || new Date(t.date) >= new Date(filter.startDate);
    const matchesEnd = !filter.endDate || new Date(t.date) <= new Date(filter.endDate);
    return matchesType && matchesStatus && matchesStart && matchesEnd;
  });

  // CSV download logic
  const handleDownloadCSV = () => {
    const header = ['Date', 'Description', 'Type', 'Amount', 'Status'];
    const rows = filtered.map(txn => [
      txn.date,
      txn.description,
      txn.type,
      (txn.type === 'Debit' ? '-' : '+') + txn.amount,
      txn.status
    ]);
    const csvContent = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // PDF download logic
  const handleDownloadPDF = () => {
    generateTransactionsPDF(filtered);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Recent Transactions</h2>
      <div className={styles.filters}>
        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
        </select>
        <input type="date" value={filter.startDate} onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))} placeholder="Start Date" />
        <input type="date" value={filter.endDate} onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))} placeholder="End Date" />
        <button className={styles.downloadBtn} onClick={handleDownloadCSV}>Download CSV</button>
        <button className={styles.downloadBtn} onClick={handleDownloadPDF}>Download PDF</button>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(txn => (
            <tr key={txn.id} style={{cursor:'pointer'}} onClick={() => setSelectedTxn(txn)}>
              <td>{txn.date}</td>
              <td>{txn.description}</td>
              <td>{txn.type}</td>
              <td>{txn.type === 'Debit' ? '-' : '+'}${txn.amount.toLocaleString()}</td>
              <td>{txn.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedTxn && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setSelectedTxn(null)}>
          <div style={{background:'#fff',padding:'32px 28px',borderRadius:'12px',minWidth:'320px',boxShadow:'0 4px 24px rgba(0,0,0,0.18)',position:'relative'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0,marginBottom:'18px',color:'#1a237e'}}>Transaction Details</h3>
            <ul style={{listStyle:'none',padding:0,lineHeight:'2'}}>
              <li><b>Date:</b> {selectedTxn.date}</li>
              <li><b>Description:</b> {selectedTxn.description}</li>
              <li><b>Type:</b> {selectedTxn.type}</li>
              <li><b>Amount:</b> {selectedTxn.type === 'Debit' ? '-' : '+'}${selectedTxn.amount.toLocaleString()}</li>
              <li><b>Status:</b> {selectedTxn.status}</li>
              {selectedTxn.fromAccount && <li><b>From Account:</b> {selectedTxn.fromAccount}</li>}
              {selectedTxn.toAccount && <li><b>To Account:</b> {selectedTxn.toAccount}</li>}
              {selectedTxn.method && <li><b>Method:</b> {selectedTxn.method}</li>}
              {selectedTxn.ifsc && <li><b>IFSC:</b> {selectedTxn.ifsc}</li>}
              {selectedTxn.id && <li><b>Transaction ID:</b> {selectedTxn.id}</li>}
            </ul>
            <button style={{marginTop:'18px',background:'#3949ab',color:'#fff',border:'none',borderRadius:'6px',padding:'10px 22px',fontWeight:500,cursor:'pointer'}} onClick={()=>setSelectedTxn(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsPage;
