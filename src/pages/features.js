import React from "react";
import "../App.css";

function Features() {
  return (
    <div className="page-container">
      <h1 className="page-title">Powerful Features</h1>

      <div className="features-grid">

        <div className="feature-card">
          <h3>🌱 Smart Crop Recommendation</h3>
          <p>
            Get AI-based crop suggestions based on soil type, location,
            and environmental conditions for maximum yield.
          </p>
        </div>

        <div className="feature-card">
          <h3>📊 Yield Prediction</h3>
          <p>
            Predict crop yield using machine learning models and
            make better farming decisions ahead of time.
          </p>
        </div>

        <div className="feature-card">
          <h3>📍 Location Intelligence</h3>
          <p>
            Automatically detect your location and provide
            region-specific agricultural insights.
          </p>
        </div>

        <div className="feature-card">
          <h3>🧪 Soil Analysis</h3>
          <p>
            Analyze soil conditions like moisture, pH, and temperature
            to recommend the best crops.
          </p>
        </div>

        <div className="feature-card">
          <h3>🎤 Voice Assistance</h3>
          <p>
            Interact with the system using voice commands,
            making it accessible for all farmers.
          </p>
        </div>

        <div className="feature-card">
          <h3>📱 Simple Interface</h3>
          <p>
            Clean and easy-to-use UI designed for farmers
            with minimal technical knowledge.
          </p>
        </div>

      </div>
    </div>
  );
}

export default Features;