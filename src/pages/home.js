import React, { useState, useEffect } from "react";
import Chatbot from "../components/Chatbot";
import "../components/chatbot.css";

const Home = ({ lang }) => {
  const [mode, setMode] = useState('sensor');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [soilType, setSoilType] = useState('');
  const [location, setLocation] = useState('Enter Location');

  const [sensors, setSensors] = useState({
    temperature: 0, humidity: 0, soil_moisture: 0, timestamp: ''
  });

  const soilNPK = {
    'loamy': [90, 42, 43], 'clay': [25, 55, 35], 'sandy': [50, 55, 82],
    'black': [20, 65, 45], 'red': [15, 75, 30], 'alluvial': [106, 26, 60]
  };

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/sensors");
        if (response.ok) setSensors(await response.json());
      } catch (error) {}
    };
    fetchSensors();
    const interval = setInterval(fetchSensors, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mode === 'sensor') {
      fetchLatest();
      fetchHistory();
    }
  }, [mode]);

  const fetchLatest = async () => {
    try {
      const data = await (await fetch("http://localhost:5000/api/latest")).json();
      setLatestPrediction(data);
    } catch (error) {}
  };

  const fetchHistory = async () => {
    try {
      const data = await (await fetch("http://localhost:5000/api/history")).json();
      setHistory(data.slice(0, 10));
    } catch (error) {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const testSensors = async () => {
    setLoading(true);
    const tempC = sensors.temperature || 25;
    const humidity = sensors.humidity || 70;
    const soilMoisture = sensors.soil_moisture || 45;

    let recommendedCrop = "No recommendation", confidence = "50%", reason = "";

    if (tempC >= 20 && tempC <= 35) {
      if (soilMoisture >= 60 && humidity >= 70) {
        recommendedCrop = "Rice"; confidence = "92%"; reason = "High moisture paddy conditions";
      } else if (soilMoisture >= 45 && humidity >= 60) {
        recommendedCrop = "Maize"; confidence = "89%"; reason = "Moderate moisture conditions";
      } else if (soilMoisture >= 30 && humidity <= 65) {
        recommendedCrop = "Groundnut"; confidence = "87%"; reason = "Medium dry soil";
      } else {
        recommendedCrop = "Wheat"; confidence = "85%"; reason = "Dry soil conditions";
      }
    }

    const sensorData = {
      N: 0, P: 0, K: 0, temp: tempC, humidity, ph: 6.5, rainfall: 0,
      gps: `Live Sensors: ${tempC}°C/${humidity}%/${soilMoisture}%`,
      crop: recommendedCrop, confidence, mode: 'sensor_advisory', reason
    };

    try {
      await fetch("http://localhost:5000/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sensorData)
      });
      setLatestPrediction({ crop: recommendedCrop, confidence, gps: sensorData.gps, reason });
      fetchLatest(); fetchHistory();
      alert(`${recommendedCrop} (${confidence}) recommended`);
    } catch (error) {
      alert("Server error");
    }
    setLoading(false);
  };

  const handleManualPredict = async (e) => {
    e.preventDefault();
    if (!soilType) return alert("Select soil type");

    setLoading(true);
    const [N, P, K] = soilNPK[soilType] || [75, 40, 45];
    const predictionData = {
      N, P, K, temp: 25, humidity: 75, ph: 6.5, rainfall: 200,
      gps: `${soilType} soil - ${location}`, mode: 'manual_soil'
    };

    try {
      await fetch("http://localhost:5000/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(predictionData)
      });
      fetchLatest(); fetchHistory();
      alert("Prediction saved");
    } catch (error) {
      alert("Server error");
    }
    setLoading(false);
  };

  /* ── shared glass styles ── */
  const glassCard = {
    background: 'rgba(255, 255, 255, 0.13)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.28)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
  };

  const glassCardDark = {
    background: 'rgba(0, 0, 0, 0.32)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.38)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.9rem 1rem',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '10px',
    fontSize: '1rem',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  /* sensor metric definitions */
  const sensorMetrics = [
    {
      value: `${sensors.temperature || 0}°C`,
      label: 'Temperature',
      sub: 'DHT22 Sensor',
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.18)',
      border: 'rgba(251,146,60,0.45)',
    },
    {
      value: `${sensors.humidity || 0}%`,
      label: 'Humidity',
      sub: 'DHT22 Sensor',
      color: '#38bdf8',
      bg: 'rgba(56,189,248,0.18)',
      border: 'rgba(56,189,248,0.45)',
    },
    {
      value: `${sensors.soil_moisture || 0}%`,
      label: 'Soil Moisture',
      sub: 'Soil Probe',
      color: '#c084fc',
      bg: 'rgba(192,132,252,0.18)',
      border: 'rgba(192,132,252,0.45)',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      lineHeight: 1.6,
      color: '#fff',
      backgroundImage: `
        linear-gradient(
          to bottom,
          rgba(5, 40, 15, 0.74) 0%,
          rgba(10, 60, 25, 0.62) 40%,
          rgba(5, 30, 10, 0.82) 100%
        ),
        url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1800&auto=format&fit=crop&q=80')
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        ...glassCardDark,
        borderRadius: 0,
        borderLeft: 'none', borderRight: 'none', borderTop: 'none',
        padding: '1rem 0',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🌾</span>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                KARM Crop Advisor
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '-2px' }}>
                AI-Powered Agricultural Intelligence
              </div>
            </div>
          </div>
          <div style={{
            padding: '0.4rem 1rem',
            background: 'rgba(16,185,129,0.22)',
            border: '1px solid rgba(16,185,129,0.5)',
            borderRadius: '20px',
            fontSize: '0.82rem',
            color: '#6ee7b7',
            fontWeight: 600,
          }}>
            ● IoT + AI Active
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

        {/* ── HERO TAGLINE ── */}
        <div style={{ textAlign: 'center', padding: '2rem 0 2.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}>
            Smart Farming for Every Field
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
            Real-time sensor analysis • Soil intelligence • AI crop recommendations
          </p>
        </div>

        {/* ── MODE TABS ── */}
        <div style={{ ...glassCardDark, marginBottom: '2rem', overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => { setMode('sensor'); setLatestPrediction(null); }}
              style={{
                flex: 1, padding: '1.1rem', border: 'none',
                background: mode === 'sensor' ? 'rgba(16,185,129,0.38)' : 'transparent',
                color: '#fff',
                fontWeight: mode === 'sensor' ? 700 : 400,
                fontSize: '1rem', cursor: 'pointer',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                borderBottom: mode === 'sensor' ? '2px solid #10b981' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              📡 Live Sensor Monitoring
            </button>
            <button
              onClick={() => { setMode('manual'); setLatestPrediction(null); }}
              style={{
                flex: 1, padding: '1.1rem', border: 'none',
                background: mode === 'manual' ? 'rgba(59,130,246,0.38)' : 'transparent',
                color: '#fff',
                fontWeight: mode === 'manual' ? 700 : 400,
                fontSize: '1rem', cursor: 'pointer',
                borderBottom: mode === 'manual' ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              🌱 Soil Type Analysis
            </button>
          </div>
        </div>

        {/* ── SENSOR MODE ── */}
        {mode === 'sensor' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>

            {/* Live Sensor Cards */}
            <div style={{ ...glassCard, padding: '2rem', borderTop: '3px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
                  📡 Real-time Sensor Data
                </h2>
                <div style={{
                  padding: '0.35rem 0.9rem',
                  background: sensors.timestamp ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
                  border: `1px solid ${sensors.timestamp ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.55)'}`,
                  borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600,
                  color: sensors.timestamp ? '#6ee7b7' : '#fca5a5',
                }}>
                  {sensors.timestamp ? '● LIVE' : '● OFFLINE'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {sensorMetrics.map((s, i) => (
                  <div key={i} style={{
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '2.4rem',
                      fontWeight: 800,
                      color: s.color,
                      textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                    }}>
                      {s.value}
                    </div>
                    <div style={{ color: '#ffffff', fontWeight: 600, marginTop: '0.4rem' }}>
                      {s.label}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>
                      {s.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation Panel */}
            <div style={{ ...glassCard, padding: '2rem', borderTop: '3px solid #10b981' }}>
              <h2 style={{ margin: '0 0 1.5rem', color: '#6ee7b7', fontSize: '1.3rem', fontWeight: 700 }}>
                🎯 Recommended Crop
              </h2>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                  Processing sensor data...
                </div>
              ) : latestPrediction?.crop ? (
                <div style={{
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.45)',
                  borderRadius: '12px', padding: '2rem', textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '2.8rem', fontWeight: 800, color: '#6ee7b7',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    textShadow: '0 2px 10px rgba(0,0,0,0.4)',
                  }}>
                    {latestPrediction.crop}
                  </div>
                  <div style={{ fontSize: '1.2rem', color: '#a7f3d0', margin: '0.75rem 0 0.5rem' }}>
                    Confidence: <strong>{latestPrediction.confidence}</strong>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>
                    {latestPrediction.gps}
                  </div>
                  {latestPrediction.reason && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                      {latestPrediction.reason}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌱</div>
                  Click "Get Recommendation" to analyze your field conditions
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              ...glassCardDark, padding: '1.5rem',
              display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
            }}>
              <button onClick={fetchLatest} style={{
                padding: '0.9rem 2rem',
                background: 'rgba(59,130,246,0.28)',
                border: '1px solid rgba(59,130,246,0.6)',
                color: '#93c5fd', borderRadius: '10px', fontWeight: 600,
                cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s',
              }}>
                🔄 Refresh Data
              </button>
              <button onClick={testSensors} disabled={loading} style={{
                padding: '0.9rem 2rem',
                background: loading ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.32)',
                border: '1px solid rgba(16,185,129,0.6)',
                color: '#6ee7b7', borderRadius: '10px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
              }}>
                {loading ? '⏳ Analyzing...' : '🌾 Get Crop Recommendation'}
              </button>
            </div>

          </div>
        )}

        {/* ── MANUAL MODE ── */}
        {mode === 'manual' && (
          <div style={{ ...glassCard, padding: '2.5rem', borderTop: '3px solid #3b82f6', maxWidth: '560px', margin: '0 auto' }}>
            <h2 style={{ color: '#93c5fd', textAlign: 'center', fontSize: '1.4rem', marginBottom: '2rem' }}>
              🌱 Soil Type Based Analysis
            </h2>
            <form onSubmit={handleManualPredict}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                  Select Soil Type <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  required
                  style={{ ...inputStyle }}
                >
                  <option value="" style={{ background: '#0f2e18', color: '#fff' }}>Choose soil type...</option>
                  <option value="loamy" style={{ background: '#0f2e18', color: '#fff' }}>🌾 Loamy Soil</option>
                  <option value="clay" style={{ background: '#0f2e18', color: '#fff' }}>🏺 Clay Soil</option>
                  <option value="sandy" style={{ background: '#0f2e18', color: '#fff' }}>🏖️ Sandy Soil</option>
                  <option value="black" style={{ background: '#0f2e18', color: '#fff' }}>⚫ Black Soil</option>
                  <option value="red" style={{ background: '#0f2e18', color: '#fff' }}>🔴 Red Soil</option>
                  <option value="alluvial" style={{ background: '#0f2e18', color: '#fff' }}>🏔️ Alluvial Soil</option>
                </select>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                  Location / District
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter district/village..."
                  style={{ ...inputStyle }}
                />
              </div>

              <button type="submit" disabled={loading || !soilType} style={{
                width: '100%', padding: '1.1rem',
                background: loading || !soilType ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.38)',
                border: '1px solid rgba(59,130,246,0.6)',
                color: '#93c5fd', borderRadius: '10px',
                fontSize: '1.05rem', fontWeight: 600,
                cursor: loading || !soilType ? 'not-allowed' : 'pointer',
                opacity: loading || !soilType ? 0.6 : 1,
                transition: 'all 0.2s',
              }}>
                {loading ? 'Processing...' : '🚀 Get AI Recommendation'}
              </button>
            </form>
          </div>
        )}

        {/* ── HISTORY TABLE ── */}
        {history.length > 0 && (
          <div style={{ ...glassCardDark, marginTop: '2.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                📋 Recent Recommendations
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.07)' }}>
                    {['Crop', 'Confidence', 'Location', 'Date'].map(h => (
                      <th key={h} style={{
                        padding: '0.9rem 1.25rem', textAlign: 'left',
                        fontWeight: 600, color: 'rgba(255,255,255,0.55)',
                        fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((pred, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#6ee7b7' }}>{pred[8]}</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#a7f3d0' }}>{pred[9]}%</td>
                      <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.65)' }}>{pred[0]}</td>
                      <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.65)' }}>
                        {pred[11] ? new Date(pred[11]).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>{/* closes maxWidth div */}

      {/* ── FOOTER ── */}
      <div style={{
        ...glassCardDark,
        borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
        textAlign: 'center', padding: '1.5rem', marginTop: '4rem',
        fontSize: '0.85rem', color: 'rgba(255,255,255,0.42)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          © 2026 KARM Crop Advisory System &nbsp;|&nbsp; For Farmers, By Technology
        </div>
      </div>

      {/* ── CHATBOT ── */}
      <Chatbot
        mode={mode}
        latestPrediction={latestPrediction}
        history={history}
        location={location}
      />

    </div>
  );
};

export default Home;