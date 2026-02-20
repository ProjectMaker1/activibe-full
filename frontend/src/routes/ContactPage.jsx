// frontend/src/routes/ContactPage.jsx
import React from "react";

export default function ContactPage() {
  return (
    <div className="page static-page">
      <div className="container">
        <h1>Contact Us</h1>

        <p>We’d love to hear from you.</p>

        <h3>Whether you are:</h3>
        <ul>
          <li>A young person looking for guidance</li>
          <li>An activist or organisation wanting to collaborate</li>
          <li>A school or NGO interested in partnership</li>
          <li>A supporter who wants to help us grow</li>
        </ul>

        <p>Reach out to us:</p>

        <p><strong>Email:</strong> support@activibe.net</p>
        <p><strong>Website:</strong> www.activibe.net</p>

        <p>We aim to respond within 3–5 working days.</p>
      </div>
    </div>
  );
}