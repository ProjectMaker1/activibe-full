import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateEmail, validatePassword } from '@shared/validators.js';
import Loader from '../components/Loader.jsx';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  if (submitting) {
    return <Loader />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr || passErr) {
      setStatus({ type: 'error', message: emailErr || passErr });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Login failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-center auth-page">
      <div className="auth-card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {status && (
            <p className={status.type === 'error' ? 'status-error' : 'status-success'}>
              {status.message}
            </p>
          )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          Login
        </button>

        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
