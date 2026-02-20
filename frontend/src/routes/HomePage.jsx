import React from "react";
import { useNavigate, Link } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();

  const handleAiClick = () => {
    navigate("/chatbot");
  };

  return (
    <div className="home-page">
      <section className="home-hero">
        {/* EVERYTHING stays within .page width (same as footer) */}
        <div className="page">
          {/* 1) Header */}
          <header className="home-hero-header">
            <h1>ActiVibe – The Vibe of Activism</h1>
            <p>Explore campaigns. Connect with activists. Take peaceful action.</p>
          </header>

          {/* 2) Media (separate block, bigger) */}
<div className="home-hero-media" aria-hidden="true">
  <img
    className="home-hero-img home-hero-img--light"
    src="/hero-light.webp"
    alt="ActiVibe hero"
  />
  <img
    className="home-hero-img home-hero-img--dark"
    src="/hero-dark.webp"
    alt="ActiVibe hero"
  />

  {/* ✅ AI bubble ON IMAGE (bottom-right) */}
  <button
    type="button"
    className="loader-wrapper ai-bubble ai-bubble--home"
    onClick={handleAiClick}
    aria-label="Open AI Assistant"
  >
    <span className="loader-text">AI</span>
    <div className="loader" />
  </button>
</div>

        </div>
      </section>

      {/* Rest of the page (same width) */}
      <div className="page">
        <section className="section why">
          <h2 className="section-title">Why ActiVibe?</h2>

          <div className="why-grid">
            <div className="why-card">
              <h3>🌍 Discover What Matters</h3>
              <p>Find peaceful campaigns that match your values and interests.</p>
            </div>

            <div className="why-card">
              <h3>💬 Share Your Journey</h3>
              <p>Tell your story and inspire others — safely and confidently.</p>
            </div>

            <div className="why-card">
              <h3>🤖 Turn Ideas into Action</h3>
              <p>Receive simple, smart suggestions for your next step.</p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-inner">
            <span>© {new Date().getFullYear()} ActiVibe</span>
            <div className="footer-links">
              <Link to="/about">About Us</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default HomePage;