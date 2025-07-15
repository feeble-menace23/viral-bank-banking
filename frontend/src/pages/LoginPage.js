
import React, { useState } from 'react';
import styles from './LoginPage.module.css';


function LoginPage({ onLoginSuccess }) {
  const [customerId, setCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [captcha, setCaptcha] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, password, captcha })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('customerId', customerId);
        localStorage.setItem('accountNumber', data.user.accountNumber);
        setMessage('Login successful!');
        setTimeout(() => {
          setMessage('');
          if (onLoginSuccess) onLoginSuccess();
          window.location.href = '/dashboard';
        }, 600);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage('Server error.');
    }
  };

  const handleRegisterClick = () => {
    window.location.href = '/register';
  };

  return (
    <>
      <div className={styles.loginBg} />
      <div className={styles.container}>
        <div className={styles.title}>Bank Login</div>
        <form onSubmit={handleLogin}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Customer ID</label>
            <input
              className={styles.input}
              type="text"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
              placeholder="Enter your Customer ID"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>CAPTCHA</label>
            <input
              className={styles.input}
              type="text"
              value={captcha}
              onChange={e => setCaptcha(e.target.value)}
              required
              placeholder="Enter CAPTCHA (12345)"
            />
          </div>
          <button className={styles.button} type="submit">Login</button>
          <div className={styles.registerContainer}>
            <span className={styles.registerText}>Don't have an account? </span>
            <button 
              type="button" 
              className={styles.registerButton}
              onClick={handleRegisterClick}
            >
              Register
            </button>
          </div>
        </form>
        {message && <div className={styles.message}>{message}</div>}
      </div>
    </>
  );
}

export default LoginPage;
