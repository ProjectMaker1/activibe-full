import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '@shared/validators.js';

import Select from 'react-select';
import { getSignupCountries } from '../utils/countries.js';
import 'flag-icons/css/flag-icons.min.css';
import Loader from '../components/Loader.jsx';

function formatSeconds(s) {
  const sec = Math.max(0, Math.floor(s));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function SignupPage() {
  const { signup, verifyEmailCode, resendSignupCode } = useAuth();
  const navigate = useNavigate();

  // Name -> Username
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState(null);

  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // OTP step state
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // countries list
  const countryOptions = useMemo(() => getSignupCountries(), []);

  // countdown
  useEffect(() => {
    if (step !== 'verify') return;
    if (!expiresIn) return;

    setCanResend(false);

    const t = setInterval(() => {
      setExpiresIn((prev) => {
        const next = Math.max(0, (prev || 0) - 1);
        if (next === 0) setCanResend(true);
        return next;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [step, expiresIn]);

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
      const res = await signup(
        username,
        email,
        password,
        country?.value || null
      );

      // ✅ pending OTP step
      if (res?.pending) {
        setStep('verify');
        setOtpCode('');
        setExpiresIn(res.expiresInSeconds || 0);
        setCanResend(false);
        setStatus({
          type: 'success',
          message: 'We sent a verification code to your email.',
        });
        return;
      }

      // fallback (თუ ოდესმე backend პირდაპირ დააბრუნებს user/tokens)
      navigate('/');
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Sign up failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    const clean = String(otpCode || '').trim();
    if (!/^\d{6}$/.test(clean)) {
      setStatus({ type: 'error', message: 'Please enter the 6-digit code.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await verifyEmailCode(email, clean);
      navigate('/');
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Verification failed' });

      // თუ expired/too many attempts — resend გააქტიურდეს
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('expired')) {
        setExpiresIn(0);
        setCanResend(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await resendSignupCode(email);
      setExpiresIn(res?.expiresInSeconds || 0);
      setCanResend(false);
      setOtpCode('');
      setStatus({
        type: 'success',
        message: 'A new verification code has been sent.',
      });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to resend code' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-center auth-page">
      <div className="auth-card">
        <h1>Sign Up</h1>

        {step === 'form' ? (
          <form onSubmit={handleSubmit}>
            {submitting && <Loader />}

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
              <p className={status.type === 'error' ? 'status-error' : 'status-success'}>
                {status.message}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            {submitting && <Loader />}

            <p style={{ marginTop: 0 }}>
              Enter the 6-digit code we sent to <b>{email}</b>.
            </p>

            <label className="field">
              <span>Verification code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
              />
            </label>

            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>
              Code expires in <b>{formatSeconds(expiresIn)}</b>
            </p>

            <p style={{ margin: '10px 0 0', color: 'var(--text-muted)' }}>
              Didn’t see the email? Check <b>Spam/Junk</b>. If it’s there, mark it as <b>Not spam</b>
              so future emails arrive in your inbox.
            </p>

            {status && (
              <p className={status.type === 'error' ? 'status-error' : 'status-success'}>
                {status.message}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Verify'}
            </button>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting || !canResend}
                onClick={handleResend}
                style={{ opacity: submitting || !canResend ? 0.7 : 1 }}
              >
                Resend code
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={() => {
                  // დაბრუნება form-ზე (თუ შეცდომით შეიყვანა email და ა.შ.)
                  setStep('form');
                  setOtpCode('');
                  setExpiresIn(0);
                  setCanResend(false);
                  setStatus(null);
                }}
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                Change email
              </button>
            </div>
          </form>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;