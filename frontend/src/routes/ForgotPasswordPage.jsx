import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateEmail, validatePassword } from '@shared/validators.js';
import Loader from '../components/Loader.jsx';

function formatSeconds(s) {
  const sec = Math.max(0, Math.floor(s));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, resendForgotPassword, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState('request'); // request | verify
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Your password has been changed successfully.');
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

  const handleRequest = async (e) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    if (emailErr) {
      setStatus({ type: 'error', message: emailErr });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await forgotPassword(email);
      setStep('verify');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setExpiresIn(res?.expiresInSeconds || 0);
      setCanResend(false);

      setStatus({
        type: 'success',
        message: 'We sent a password reset code to your email.',
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err?.message || 'Failed to send reset code',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await resendForgotPassword(email);
      setExpiresIn(res?.expiresInSeconds || 0);
      setCanResend(false);
      setOtpCode('');
      setStatus({
        type: 'success',
        message: 'A new reset code has been sent.',
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err?.message || 'Failed to resend code',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();

    const clean = String(otpCode || '').trim();
    if (!/^\d{6}$/.test(clean)) {
      setStatus({ type: 'error', message: 'Please enter the 6-digit code.' });
      return;
    }

    const passErr = validatePassword(newPassword);
    if (passErr) {
      setStatus({ type: 'error', message: passErr });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

try {
  await resetPassword(email, clean, newPassword);

  setStatus(null);
  setShowSuccessModal(true);
} catch (err) {
      const msg = String(err?.message || 'Reset failed');
      setStatus({ type: 'error', message: msg });

      // თუ expired — resend გავააქტიუროთ
      const low = msg.toLowerCase();
      if (low.includes('expired')) {
        setExpiresIn(0);
        setCanResend(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page-center auth-page">
      <div className="auth-card">
        <h1>Forgot password</h1>

        {step === 'request' ? (
          <form onSubmit={handleRequest}>
            {submitting && <Loader />}

            <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
              Enter your email and we’ll send you a 6-digit code to reset your password.
            </p>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {status && (
              <p className={status.type === 'error' ? 'status-error' : 'status-success'}>
                {status.message}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send code'}
            </button>

            <p className="auth-switch" style={{ marginTop: 14 }}>
              Back to <Link to="/login">Login</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            {submitting && <Loader />}

            <p style={{ marginTop: 0 }}>
              Enter the 6-digit code we sent to <b>{email}</b>.
            </p>

            <label className="field">
              <span>Reset code</span>
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

            <label className="field" style={{ marginTop: 12 }}>
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Repeat new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {status && (
              <p className={status.type === 'error' ? 'status-error' : 'status-success'}>
                {status.message}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset password'}
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
                  setStep('request');
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

            <p className="auth-switch" style={{ marginTop: 14 }}>
              Back to <Link to="/login">Login</Link>
            </p>
          </form>
        )}
              {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#fff',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>
              Success
            </h3>

            <p style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>
              {successMsg}
            </p>

            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Log in
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}