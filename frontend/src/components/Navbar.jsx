// frontend/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Navbar({ theme, onToggleTheme, introActive }) {
  const {
    isAuthenticated,
    user,
    isAdmin,
    logout,
    hasNewBadge,
    markBadgesSeen,
  } = useAuth();
  const navigate = useNavigate();

  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ახალი ბეჯის მიღებაზე გავხსნათ დიდი მოდალი
  useEffect(() => {
    if (hasNewBadge && isAuthenticated) {
      setShowBadgeModal(true);
    }
  }, [hasNewBadge, isAuthenticated]);

  const handleCloseBadgeModal = async () => {
    await markBadgesSeen();
    setShowBadgeModal(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
<Link to="/" className="navbar-logo" aria-label="ActiVibe home">
  <span className="logo-slot" style={{ opacity: introActive ? 0 : 1 }}>
    <img
      src="/actilogo-static.svg"
      alt="ActiVibe"
      className="logo-img logo-img--light"
    />
    <img
      src="/actilogo-static-dark.svg"
      alt="ActiVibe"
      className="logo-img logo-img--dark"
    />
  </span>
</Link>



        <nav className="navbar-nav">
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
          {isAdmin && (
            <NavLink to="/admin" className="nav-link">
              Admin panel
            </NavLink>
          )}
        </nav>

        <div className="navbar-actions">
          {/* პატარა ბეჯი Upload-ს და theme switch-ს შორის */}
          {isAuthenticated && (
            <button
              type="button"
              className={`badge-button ${hasNewBadge ? 'badge-button-pulse' : ''}`}
              onClick={() => setShowBadgeModal(true)}
            >
              <img src="/badge.png" alt="Badges" className="badge-icon" />
              <span className="badge-count">{user?.badges ?? 0}</span>
            </button>
          )}

          {/* Theme switch */}
          <label className="switch theme-switch">
            <span className="sun">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g fill="#ffd43b">
                  <circle r="5" cy="12" cx="12"></circle>
                  <path d="m21 13h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm-17 0h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 0 2zm13.66-5.66a1 1 0 0 1-.66-.29 1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1-.75.29zm-12.02 12.02a1 1 0 0 1-.71-.29 1 1 0 0 1 0-1.41l.71-.66a1 1 0 0 1 1.41 1.41l-.71.71a1 1 0 0 1-.7.24zm6.36-14.36a1 1 0 0 1-1-1ვ-1a1 1 0 0 1 2 0ვ1a1 1 0 0 1-1 1zm0 17a1 1 0 0 1-1-1ვ-1a1 1 0 0 1 2 0ვ1a1 1 0 0 1-1 1zm-5.66-14.66a1 1 0 0 1-.7-.29l-.71-.71a1 1 0 0 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1-.71.29zm12.02 12.02a1 1 0 0 1-.7-.29l-.66-.71a1 1 0 0 1 1.36-1.36l.71.71a1 1 0 0 1 0 1.41 1 1 0 0 1-.71.24z"></path>
                </g>
              </svg>
            </span>
            <span className="moon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                <path d="m223.5 32c-123.5 0-223.5 100.3-223.5 224s100 224 223.5 224c60.6 0 115.5-24.2 155.8-63.4 5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6-96.9 0-175.5-78.8-175.5-176 0-65.8 36-123.1 89.3-153.3 6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z"></path>
              </svg>
            </span>

            <input
              type="checkbox"
              className="input"
              onChange={onToggleTheme}
            />

            <span className="slider"></span>
          </label>

          {isAuthenticated ? (
            <>
              <span className="navbar-user">
                {user?.username || user?.email}
              </span>
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

      {/* დიდი ბეჯის მოდალი */}
      {showBadgeModal && isAuthenticated && (
        <div className="badge-modal-backdrop">
          <div className="badge-modal">
            <div className="badge-modal-icon-wrap">
              <img src="/badge.png" alt="Badge" className="badge-modal-icon" />
            </div>
            <h2 className="badge-modal-title">Campaign approved!</h2>
            <p className="badge-modal-text">
              Admin approved your campaign. Thanks for contributing to ActiVibe!
            </p>
            <p className="badge-modal-counter">
              Total badges: <strong>{user?.badges ?? 0}</strong>
            </p>
            <button
              type="button"
              className="btn-primary badge-modal-close"
              onClick={handleCloseBadgeModal}
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
