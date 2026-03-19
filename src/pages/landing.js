import React from "react";
import { Link } from "react-router-dom";
import "../App.css";
import heroImage from "./hero.jpeg"; // ✅ your image

function Landing() {
  return (
    <div className="premium-container">

      {/* LEFT SIDE */}
      <div className="premium-left">
        <div className="content">
          <h1>KARM</h1>
          <h2>AI-Powered Crop Advisory System</h2>

          <p>
            Farmers face challenges due to changing climate, soil diversity, and terrain differences.
            Our AI-powered system provides localized crop recommendations,
            yield prediction, and voice-based assistance for smarter farming decisions.
          </p>

          <div className="tags">
            <span> Smart Farming</span>
            <span> AI Insights</span>
            <span> Localized Data</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="premium-right"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="premium-card">
          <h2>Welcome to KARM</h2>

          <Link to="/home" className="btn-primary">
            Get Started
          </Link>

          <button className="btn-secondary">Login</button>
          <button className="btn-secondary">Sign Up</button>
        </div>
      </div>

    </div>
  );
}

export default Landing;