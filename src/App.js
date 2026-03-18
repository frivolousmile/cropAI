import React, { useState } from "react";
import "./App.css";
import heroImage from "./assets/hero.jpeg";

function App() {
  const [lang, setLang] = useState("en");
  const [location, setLocation] = useState("");
  const [soil, setSoil] = useState("");
  const [result, setResult] = useState("");
  const [sensor, setSensor] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const text = {
    en: {
      title: "Smart Crop Assistant",
      subtitle: "AI + IoT Powered Farming",
      location: "Enter Location",
      detect: "📍 Detect",
      soil: "Select Soil Type",
      button: "Get Recommendation",
      simulate: "Sensor Data",
      result: "Recommended Crop",
      lang: "हिंदी",
    },
    hi: {
      title: "स्मार्ट फसल सहायक",
      subtitle: "एआई + आईओटी आधारित खेती",
      location: "स्थान दर्ज करें",
      detect: "📍 लोकेशन",
      soil: "मिट्टी चुनें",
      button: "सुझाव प्राप्त करें",
      simulate: "सेंसर डेटा",
      result: "सुझाई गई फसल",
      lang: "English",
    },
  };

  const predictSoil = () => {
    if (!sensor) return "Loamy";
    if (sensor.moisture < 30) return "Sandy";
    if (sensor.moisture > 70) return "Clay";
    return "Loamy";
  };

  const getCrop = (soilType) => {
    if (soilType === "Sandy") return lang === "en" ? "Groundnut" : "मूंगफली";
    if (soilType === "Clay") return lang === "en" ? "Rice" : "चावल";
    if (soilType === "Black") return lang === "en" ? "Cotton" : "कपास";
    if (soilType === "Red") return lang === "en" ? "Millets" : "बाजरा";
    return lang === "en" ? "Wheat" : "गेहूं";
  };

  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
      setLocation(coords);
    });
  };

  const simulateSensor = () => {
    setSensor({
      moisture: Math.floor(Math.random() * 100),
      temp: (25 + Math.random() * 10).toFixed(1),
      ph: (5 + Math.random() * 3).toFixed(1),
    });
  };

  const handleSubmit = () => {
    const finalSoil = soil || predictSoil();
    setSoil(finalSoil);
    setResult(getCrop(finalSoil));
    setShowResult(true);
  };

  return (
    <div>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">🌾 KARM </div>

        <div className="nav-center">
          <span>Home</span>
          <span>Features</span>
          <span>About</span>
        </div>

        <button
          className="lang-btn"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
        >
          {text[lang].lang}
        </button>
      </nav>

      {/* HERO */}
      <section
        className="hero"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="overlay">
          <h1>{text[lang].title}</h1>
          <p>{text[lang].subtitle}</p>

          {/* SIDE-BY-SIDE INPUT + OUTPUT */}
          <div className="main-layout">

            {/* INPUT CARD */}
            <div className="hero-form">

              <div className="location-row">
                <input
                  placeholder={text[lang].location}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <button onClick={detectLocation}>
                  {text[lang].detect}
                </button>
              </div>

              <select
                value={soil}
                onChange={(e) => setSoil(e.target.value)}
              >
                <option value="">{text[lang].soil}</option>
                <option>Sandy</option>
                <option>Clay</option>
                <option>Loamy</option>
                <option>Black</option>
                <option>Red</option>
              </select>

              <button onClick={simulateSensor}>
                {text[lang].simulate}
              </button>

              <button className="main-btn" onClick={handleSubmit}>
                {text[lang].button}
              </button>

            </div>

            {/* OUTPUT CARD */}
            {showResult && (
              <div className="result-side">

                <h2>{text[lang].result}</h2>

                <div className="result-grid">

                  {sensor && (
                    <div className="card">
                      <h3>Sensor</h3>
                      <p>🌡 {sensor.temp}°C</p>
                      <p>💧 {sensor.moisture}%</p>
                      <p>🧪 pH {sensor.ph}</p>
                    </div>
                  )}

                  <div className="card highlight">
                    <h3>{result}</h3>
                    <p>{text[lang].soil}: {soil}</p>
                    <p>📍 {location}</p>
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>
      </section>
    </div>
  );
}

export default App;