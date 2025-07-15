
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    return localStorage.getItem('customerId') !== null;
  });

  const handleLoginSuccess = () => {
    setLoggedIn(true);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('customerId');
    localStorage.removeItem('accountNumber');
    setLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />} 
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/dashboard" 
          element={loggedIn ? 
            <Dashboard onLogout={handleLogout} /> : 
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
