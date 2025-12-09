// frontend/src/routes/HomePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

function HomePage({ theme = "light" }) {
  const navigate = useNavigate();

  const handleAiClick = () => {
    navigate("/chatbot");
  };

  // theme-ის მიხედვით ავირჩიოთ ფოტო public-იდან
  const heroImageSrc =
    theme === "dark" ? "/hero-dark.png" : "/hero-light.png";

  return (
    <div className="page home-page">
      {/* --- HERO ბლოკი --- */}
      <section className="home-hero-image">
        <div className="hero-inner">
          <h1>ActiVibe – Vibe of Activism</h1>
          <p>
            Empowering young voices to shape change through creativity,
            community and peaceful movements.
          </p>
        </div>

        {/* ქვედა რიგი: მარცხნივ ფოტო, მარჯვნივ AI ღილაკი */}
        <div className="hero-bottom-row">
          <img
            src={heroImageSrc}
            alt="Young activists illustration"
            className="hero-illustration"
          />

          <button className="loader-wrapper" onClick={handleAiClick}>
            <span className="loader-letter">A</span>
            <span className="loader-letter">I</span>
            <span className="loader-letter"> </span>
            <span className="loader-letter">A</span>
            <span className="loader-letter">s</span>
            <span className="loader-letter">s</span>
            <span className="loader-letter">i</span>
            <span className="loader-letter">s</span>
            <span className="loader-letter">t</span>
            <span className="loader-letter">a</span>
            <span className="loader-letter">n</span>
            <span className="loader-letter">t</span>
            <div className="loader"></div>
          </button>
        </div>
      </section>

      {/* Why ActiVibe */}
      <section className="section why">
        <h2 className="section-title">Why ActiVibe?</h2>

        <div className="why-grid">
          <div className="why-card">
            <h3>Explore Global Activism</h3>
            <p>
              Discover campaigns from young activists across the globe and be
              inspired by real non-violent initiatives.
            </p>
          </div>

          <div className="why-card">
            <h3>Share Your Story Safely</h3>
            <p>
              Tell the world how you're making a difference — safely and
              privately.
            </p>
          </div>

          <div className="why-card">
            <h3>AI Chatbot Assistance</h3>
            <p>
              Plan actions, find resources and brainstorm ideas with our
              friendly AI assistant.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} ActiVibe</span>
          <div className="footer-links">
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
            <a href="#privacy">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
