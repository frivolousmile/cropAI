import React from "react";
import "../App.css";

function About() {
  return (
    <div className="page-container">
      <h1 className="page-title">About KARM</h1>

      <div className="about-card">
        <p>
          KARM is an AI-powered crop advisory system designed to empower farmers
          with intelligent insights. Agriculture today faces challenges due to
          climate change, soil diversity, and unpredictable weather patterns.
        </p>

        <p>
          Our platform leverages Artificial Intelligence to provide personalized
          crop recommendations, yield predictions, and real-time assistance.
          By combining technology with agriculture, we aim to increase productivity
          and promote sustainable farming practices.
        </p>

        <p>
          Our mission is simple — make smart farming accessible to every farmer.
        </p>
      </div>

      <div className="about-highlights">
        <div>🌍 Sustainable Farming</div>
        <div>🤖 AI Driven</div>
        <div>📈 Better Yield</div>
      </div>
    </div>
  );
}

export default About;