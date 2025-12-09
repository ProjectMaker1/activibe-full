import React from "react";
import "./loader.css"; // აქ იქნება ის CSS რაც მოგეცი

export default function Loader() {
  return (
    <div className="loader-overlay">
      <div className="loader-center">
        <div className="🤚">
          <div className="👉"></div>
          <div className="👉"></div>
          <div className="👉"></div>
          <div className="👉"></div>
          <div className="🌴"></div>
          <div className="👍"></div>
        </div>
      </div>
    </div>
  );
}
