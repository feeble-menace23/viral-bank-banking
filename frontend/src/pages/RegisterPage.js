import React, { useState } from 'react';
import styles from './LoginPage.module.css';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [customerId, setCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [captcha, setCaptcha] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (!email) {
      setMessage('Email is required');
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, password, confirmPassword, email, captcha })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(`Registration successful! Your account number is: ${data.user.accountNumber}. Redirecting to login...`);
        setTimeout(() => navigate('/'), 3000);
      } else {
        setMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      setMessage('Server error during registration');
    }
  };

  return (
    <>
      <div className={styles.loginBg} />
      <div className={styles.container}>
        <div className={styles.title}>Create Account</div>
        <form onSubmit={handleRegister}>
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
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Email Address"
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
            <label className={styles.label}>Confirm Password</label>
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm Password"
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
          <button className={styles.button} type="submit">Register</button>
          {message && <div className={styles.message}>{message}</div>}
          <div className={styles.registerContainer}>
            <span className={styles.registerText}>Already have an account? </span>
            <button 
              type="button" 
              className={styles.registerButton}
              onClick={() => navigate('/')}
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default RegisterPage;