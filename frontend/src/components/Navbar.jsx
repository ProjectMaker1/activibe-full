// frontend/src/components/Navbar.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Portal from "./Portal.jsx";
function Navbar({ theme, onToggleTheme, introActive }) {
  const {
    isAuthenticated,
    user,
    isAdmin,
    logout,
    hasNewReward,
    markRewardsSeen,
  } = useAuth();

  const navigate = useNavigate();

  const [showRewardModal, setShowRewardModal] = useState(false);
   const [showCertificateZoom, setShowCertificateZoom] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);

  const isIos = useCallback(() => {
    const ua = window.navigator.userAgent || '';
    const isApple = /iPad|iPhone|iPod/.test(ua);
    const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isApple || isIpadOS;
  }, []);

  const isStandalone = useCallback(() => {
    return (
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true
    );
  }, []);

  useEffect(() => {
    setStandalone(isStandalone());

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone]);

  useEffect(() => {
    if (hasNewReward && isAuthenticated) setShowRewardModal(true);
  }, [hasNewReward, isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCloseRewardModal = async () => {
    await markRewardsSeen();
    setShowRewardModal(false);
    setShowCertificateZoom(false);
  };

  const handleInstallClick = async () => {
    if (standalone) return;

    if (isIos()) {
      setShowIosInstall(true);
      return;
    }

    if (!deferredPrompt) {
      alert('Install is not available on this browser. Try Chrome on Android.');
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* LEFT: logo + primary nav */}
        <div className="navbar-left">
          <Link to="/" className="navbar-logo" aria-label="ActiVibe home">
<span className="logo-slot" style={{ opacity: introActive ? 0 : 1 }}>
  <img
    src="/actilogo-light.png"
    alt="ActiVibe"
    className="logo-img logo-img--light"
    draggable="false"
  />
  <img
    src="/actilogo-dark.png"
    alt="ActiVibe"
    className="logo-img logo-img--dark"
    draggable="false"
  />
</span>

          </Link>

          {/* 4 main links ALWAYS one line (scroll if needed) */}
          <nav className="navbar-nav" aria-label="Primary navigation">
            <NavLink to="/" className="nav-link">
              Home
            </NavLink>
            <NavLink to="/campaigns" className="nav-link">
              Campaigns
            </NavLink>
            <NavLink to="/chatbot" className="nav-link">
              ChatBot
            </NavLink>
            <NavLink to="/upload" className="nav-link">
              Upload
            </NavLink>
          </nav>

          {/* Admin can drop below on mobile (CSS handles it) */}
          {isAdmin && (
            <nav className="navbar-admin" aria-label="Admin navigation">
              <NavLink to="/admin" className="nav-link nav-link-admin">
                Admin panel
              </NavLink>
            </nav>
          )}
        </div>

        {/* RIGHT: actions */}
        <div className="navbar-actions">
          {isAuthenticated && (
            <button
              type="button"
              className={`badge-button ${hasNewReward ? 'badge-button-pulse' : ''}`}
              onClick={() => setShowRewardModal(true)}
              title="Rewards"
            >
              {user?.unpaidVoucherCount > 0 ? (
                <span style={{ fontWeight: 800, fontSize: 12 }}>€50</span>
              ) : (
                <img
                  src={user?.rewardStage === 'CERTIFICATE' ? '/Certificate.png' : '/badge.png'}
                  alt="Rewards"
                  className="badge-icon"
                />
              )}

                {user?.unpaidVoucherCount > 0 && (
                <span className="badge-count">{user.unpaidVoucherCount}</span>
              )}
            </button>
          )}
          {!standalone && (
            <button
              type="button"
              className="btn-outline btn-install btn-install-strong"
              onClick={handleInstallClick}
              disabled={!isIos() && !canInstall}
              title={
                isIos()
                  ? 'Install on iPhone/iPad'
                  : canInstall
                    ? 'Install app'
                    : 'Install not available'
              }
            >
              Install App
            </button>
          )}

          {/* Theme switch */}
          <label className="switch theme-switch" aria-label="Toggle theme">
            <span className="sun">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g fill="#ffd43b">
                  <circle r="5" cy="12" cx="12"></circle>
                  <path d="m21 13h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-17 0h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm13.66-5.66a1 1 0 0 1-.66-.29 1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1-.75.29zm-12.02 12.02a1 1 0 0 1-.71-.29 1 1 0 0 1 0-1.41l.71-.66a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1-.7.24zm6.36-14.36a1 1 0 0 1-1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1-1 1zm0 17a1 1 0 0 1-1-1v-1a1 1 0 0 1 2 0v1a1 1 0 0 1-1 1zm-5.66-14.66a1 1 0 0 1-.7-.29l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1-.71.29zm12.02 12.02a1 1 0 0 1-.7-.29l-.66-.71a1 1 0 0 1 1.36-1.36l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1-.71.24z"></path>
                </g>
              </svg>
            </span>
            <span className="moon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                <path d="m223.5 32c-123.5 0-223.5 100.3-223.5 224s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
              </svg>
            </span>

            <input type="checkbox" className="input" onChange={onToggleTheme} />
            <span className="slider"></span>
          </label>

          {isAuthenticated ? (
            <>
              <span className="navbar-user">{user?.username || user?.email}</span>
              <button className="btn-outline" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/signup" className="btn-primary">
                Sign Up
              </NavLink>
              <NavLink to="/login" className="btn-outline">
                Login
              </NavLink>
            </>
          )}
        </div>
      </div>

<Portal>
  {/* Badge modal */}
  {/* Reward modal */}
  {showRewardModal && isAuthenticated && (
    <div className="badge-modal-backdrop">
        {/* Certificate fullscreen viewer (only when CERTIFICATE) */}
  {showCertificateZoom && user?.rewardStage === 'CERTIFICATE' && (
    <div
      className="cert-zoom-backdrop"
      onClick={() => setShowCertificateZoom(false)}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="cert-zoom-close"
        onClick={(e) => {
          e.stopPropagation();
          setShowCertificateZoom(false);
        }}
        aria-label="Close"
        title="Close"
      >
        ×
      </button>

      <img
        src="/Certificate.png"
        alt="Certificate fullscreen"
        className="cert-zoom-img"
        onClick={(e) => e.stopPropagation()}
      />

      <style>{`
        .certificate-zoom-btn{
          border:0;
          background:transparent;
          padding:0;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          justify-content:center;
        }

        .cert-zoom-backdrop{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index: 99999;
          padding: 18px;
        }

        .cert-zoom-img{
          max-width: min(980px, 100%);
          max-height: 92vh;
          width: auto;
          height: auto;
          border-radius: 14px;
          box-shadow: 0 18px 55px rgba(0,0,0,0.45);
          background: white;
        }

        .cert-zoom-close{
          position: fixed;
          top: 16px;
          right: 16px;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 0;
          cursor: pointer;
          font-size: 28px;
          line-height: 44px;
          text-align: center;
          background: rgba(255,255,255,0.92);
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }
      `}</style>
    </div>
  )}
      <div className="badge-modal">
        <div className="badge-modal-icon-wrap">
          {user?.unpaidVoucherCount > 0 ? (
            <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>€50</div>
          ) : user?.rewardStage === 'CERTIFICATE' ? (
            <button
              type="button"
              onClick={() => setShowCertificateZoom(true)}
              className="certificate-zoom-btn"
              aria-label="Open certificate fullscreen"
              title="Open certificate fullscreen"
            >
              <img
                src="/Certificate.png"
                alt="Certificate"
                className="badge-modal-icon"
              />
            </button>
          ) : (
            <img
              src="/badge.png"
              alt="Badge"
              className="badge-modal-icon"
            />
          )}
        </div>

        {user?.unpaidVoucherCount > 0 ? (
          <>
            <h2 className="badge-modal-title">Congratulations!</h2>
            <p className="badge-modal-text">
              You have <strong>{user.unpaidVoucherCount}</strong> pending €50 voucher
              {user.unpaidVoucherCount === 1 ? '' : 's'}.
            </p>
            <p className="badge-modal-text">
              The ActiVibe team will contact you regarding the payment. Please check your email
              over the next few days for further details.
            </p>
          </>
        ) : user?.rewardStage === 'CERTIFICATE' ? (
          <>
            <h2 className="badge-modal-title">Certificate awarded!</h2>
            <p className="badge-modal-text">
              Your second approved campaign upgraded your reward to a <strong>Certificate</strong>.
            </p>
          </>
        ) : user?.rewardStage === 'BADGE' ? (
          <>
            <h2 className="badge-modal-title">Badge awarded!</h2>
            <p className="badge-modal-text">
              Your campaign has been approved and you received a <strong>Badge</strong>.
            </p>
          </>
        ) : (
          <>
            <h2 className="badge-modal-title">All set</h2>
            <p className="badge-modal-text">No new rewards right now.</p>
          </>
        )}

        <button
          type="button"
          className="btn-primary badge-modal-close"
          onClick={handleCloseRewardModal}
        >
          Awesome!
        </button>
      </div>
    </div>
  )}

  {/* iOS Install instructions */}
  {showIosInstall && (
    <div className="badge-modal-backdrop" onClick={() => setShowIosInstall(false)}>
      <div className="badge-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="badge-modal-title">Install ActiVibe</h2>
            <p className="badge-modal-text">To install on iPhone/iPad:</p>

            <div className="ios-install-steps">
              <div>
                1) Open this website in <strong>Safari</strong>
              </div>
              <div>
                2) Tap the <strong>Share</strong> button (⬆️)
              </div>
              <div>
                3) Select <strong>Add to Home Screen</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary badge-modal-close"
              onClick={() => setShowIosInstall(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      </Portal>
    </header>
  );
}

export default Navbar;
