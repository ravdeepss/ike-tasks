import React, { useState, useEffect } from 'react';

export default function LoginPage({ onLogin, onRegister, error, onClearError, needsSetup }) {
  const [isRegister, setIsRegister] = useState(needsSetup);

  // Sync isRegister with needsSetup when it changes (e.g., after health check completes)
  useEffect(() => {
    if (needsSetup) {
      setIsRegister(true);
    }
  }, [needsSetup]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (isRegister) {
      await onRegister(username, password, displayName || username);
    } else {
      await onLogin(username, password);
    }
    setSubmitting(false);
  };

  const toggleMode = () => {
    onClearError();
    setIsRegister(!isRegister);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Task Dashboard</h1>
        <p className="login-subtitle">
          {needsSetup ? 'Create your account to get started' : isRegister ? 'Create an account' : 'Sign in to continue'}
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
              autoFocus
              required
              minLength={2}
              autoComplete="username"
            />
          </label>
          {isRegister && (
            <label className="login-label">
              Display Name
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="login-input"
                placeholder="Optional"
                autoComplete="name"
              />
            </label>
          )}
          <label className="login-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
              minLength={6}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        {!needsSetup && (
          <p className="login-toggle">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className="login-toggle-btn" onClick={toggleMode}>
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
