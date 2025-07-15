// Utility to generate PDF for account statement and transactions
import jsPDF from 'jspdf';

export function generateAccountStatementPDF({ accounts = [], creditCards = [], fixedDeposits = [] }) {
  const doc = new jsPDF();
  let y = 10;
  doc.setFontSize(16);
  doc.text('Account Statement', 10, y);
  y += 10;
  doc.setFontSize(12);

  // Accounts
  doc.text('Accounts:', 10, y);
  y += 8;
  accounts.forEach(acc => {
    doc.text(`${acc.type} (${acc.number}): ${acc.currency} ${acc.balance.toLocaleString()}`, 12, y);
    y += 7;
  });
  y += 5;

  // Credit Cards
  doc.text('Credit Cards:', 10, y);
  y += 8;
  creditCards.forEach(card => {
    doc.text(`Card ${card.number}: Available ${card.currency} ${card.availableCredit.toLocaleString()} / Limit ${card.currency} ${card.limit.toLocaleString()}`, 12, y);
    y += 7;
  });
  y += 5;

  // Fixed Deposits
  doc.text('Fixed Deposits:', 10, y);
  y += 8;
  fixedDeposits.forEach(fd => {
    doc.text(`FD ${fd.number}: ${fd.currency} ${fd.amount.toLocaleString()} (Maturity: ${fd.maturity})`, 12, y);
    y += 7;
  });

  doc.save('account_statement.pdf');
}

export function generateTransactionsPDF(transactions = []) {
  const doc = new jsPDF();
  let y = 10;
  doc.setFontSize(16);
  doc.text('Transaction Statement', 10, y);
  y += 10;
  doc.setFontSize(12);
  const header = ['Date', 'Description', 'Type', 'Amount', 'Status'];
  doc.text(header.join(' | '), 10, y);
  y += 8;
  transactions.forEach(txn => {
    const row = [txn.date, txn.description, txn.type, (txn.type === 'Debit' ? '-' : '+') + txn.amount, txn.status];
    doc.text(row.join(' | '), 10, y);
    y += 7;
    if (y > 280) { doc.addPage(); y = 10; }
  });
  doc.save('transactions.pdf');
}
