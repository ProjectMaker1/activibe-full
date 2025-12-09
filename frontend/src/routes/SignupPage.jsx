// frontend/src/routes/SignupPage.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '@shared/validators.js';

import Select from 'react-select';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Name -> Username
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState(null);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ქვეყნების ლისტი – label/value უბრალო სტრინგებია, ამიტომ search ნორმალურად მუშაობს
  const countryOptions = useMemo(() => countryList().getData(), []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usernameErr = validateRequired(username, 'Username');
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    if (usernameErr || emailErr || passErr) {
      setStatus({
        type: 'error',
        message: usernameErr || emailErr || passErr,
      });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await signup(
        username,                 // 👈 პირველი არგუმენტი ახლა username
        email,
        password,
        country?.value || null    // ISO კოდი ( напр. "GE" )
      );
      navigate('/');
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Sign up failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-center auth-page">
      <div className="auth-card">
        <h1>Sign Up</h1>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

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
            <span>Country</span>
            <Select
              options={countryOptions}
              value={country}
              onChange={setCountry}
              placeholder="Select country"
              classNamePrefix="react-select"
              formatOptionLabel={(option) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`fi fi-${option.value.toLowerCase()}`} />
                  <span>{option.label}</span>
                </div>
              )}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {status && (
            <p
              className={
                status.type === 'error' ? 'status-error' : 'status-success'
              }
            >
              {status.message}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
