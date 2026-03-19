import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Chatbot from "../components/Chatbot";
import "../components/chatbot.css";

const MAX_POINTS = 20; // keep last 20 readings on the graph

const Home = ({ lang }) => {
  const [mode, setMode] = useState('sensor');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soilType, setSoilType] = useState('');
  const [location, setLocation] = useState('');
  const [graphData, setGraphData] = useState([]); // ← live chart data
  const tickRef = useRef(0);

  const [sensors, setSensors] = useState({
    temperature: 0, humidity: 0, soil_moisture: 0, timestamp: ''
  });

  // ── Poll sensors every 2s ──────────────────────────────────────────────
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/sensors");
        if (res.ok) {
          const data = await res.json();
          setSensors(data);

          // Only add to graph if Arduino is live (has timestamp)
          if (data.timestamp) {
            tickRef.current += 1;
            const label = new Date(data.timestamp).toLocaleTimeString();
            setGraphData(prev => {
              const next = [...prev, {
                time:         label,
                Temperature:  parseFloat(data.temperature.toFixed(1)),
                Humidity:     parseFloat(data.humidity.toFixed(1)),
                "Soil Moisture": parseFloat(data.soil_moisture.toFixed(1)),
              }];
              return next.slice(-MAX_POINTS); // keep last 20
            });
          }
        }
      } catch (_) {}
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
    } catch (_) {}
  };

  const fetchHistory = async () => {
    try {
      const data = await (await fetch("http://localhost:5000/api/history")).json();
      setHistory(data.slice(0, 10));
    } catch (_) {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // ── SENSOR MODE prediction ─────────────────────────────────────────────
  const handleSensorPredict = async () => {
    setLoading(true);
    const payload = {
      mode:          'sensor_advisory',
      temp:           sensors.temperature   || 25,
      humidity:       sensors.humidity      || 70,
      soil_moisture:  sensors.soil_moisture || 45,
      gps: `Live Sensors: ${sensors.temperature}°C / ${sensors.humidity}% / ${sensors.soil_moisture}%`,
    };
    try {
      const res = await fetch("http://localhost:5000/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.error) alert("Server error: " + result.error);
      else { setLatestPrediction(result); fetchHistory(); }
    } catch (e) {
      alert("Cannot reach server. Is Flask running?");
    }
    setLoading(false);
  };

  // ── MANUAL SOIL MODE prediction ────────────────────────────────────────
  const handleManualPredict = async (e) => {
    e.preventDefault();
    if (!soilType) return alert("Please select a soil type");
    setLoading(true);
    const payload = {
      mode: 'manual_soil', soil_type: soilType,
      temp: 25, humidity: 75, ph: 6.5, rainfall: 200,
      gps: `${soilType} soil - ${location || 'Unknown location'}`,
    };
    try {
      const res = await fetch("http://localhost:5000/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.error) alert("Server error: " + result.error);
      else {
        setLatestPrediction(result);
        fetchLatest(); fetchHistory();
        alert(`✅ ${result.crop} (${result.confidence}) recommended for ${soilType} soil`);
      }
    } catch (e) {
      alert("Cannot reach server. Is Flask running?");
    }
    setLoading(false);
  };

  /* ── styles ── */
  const glassCard = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.28)',
    borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
  };
  const glassCardDark = {
    background: 'rgba(0,0,0,0.32)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.38)',
  };
  const inputStyle = {
    width: '100%', padding: '0.9rem 1rem',
    border: '1px solid rgba(255,255,255,0.35)',
    borderRadius: '10px', fontSize: '1rem',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', boxSizing: 'border-box',
  };

  const sensorMetrics = [
    { value: `${sensors.temperature  || 0}°C`, label: 'Temperature',   sub: 'DHT22 Sensor', color: '#fb923c', bg: 'rgba(251,146,60,0.18)',  border: 'rgba(251,146,60,0.45)' },
    { value: `${sensors.humidity     || 0}%`,  label: 'Humidity',      sub: 'DHT22 Sensor', color: '#38bdf8', bg: 'rgba(56,189,248,0.18)',  border: 'rgba(56,189,248,0.45)' },
    { value: `${sensors.soil_moisture|| 0}%`,  label: 'Soil Moisture', sub: 'Soil Probe',   color: '#c084fc', bg: 'rgba(192,132,252,0.18)', border: 'rgba(192,132,252,0.45)' },
  ];

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>{label}</div>
          {payload.map((p, i) => (
            <div key={i} style={{ color: p.color, fontWeight: 600 }}>
              {p.name}: {p.value}{p.name === 'Temperature' ? '°C' : '%'}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      lineHeight: 1.6, color: '#fff',
      backgroundImage: `
        linear-gradient(to bottom,rgba(5,40,15,0.74) 0%,rgba(10,60,25,0.62) 40%,rgba(5,30,10,0.82) 100%),
        url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1800&auto=format&fit=crop&q=80')
      `,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>

      {/* ── HEADER ── */}
      <div style={{ ...glassCardDark, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', padding: '1rem 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>🌾</span>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>KARM Crop Advisor</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '-2px' }}>AI-Powered Agricultural Intelligence</div>
            </div>
          </div>
          <div style={{ padding: '0.4rem 1rem', background: sensors.timestamp ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)', border: `1px solid ${sensors.timestamp ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`, borderRadius: '20px', fontSize: '0.82rem', color: sensors.timestamp ? '#6ee7b7' : '#fca5a5', fontWeight: 600 }}>
            {sensors.timestamp ? '● Arduino Live' : '● Arduino Offline'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

        {/* ── HERO ── */}
        <div style={{ textAlign: 'center', padding: '2rem 0 2.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}>Smart Farming for Every Field</h2>
          <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>Real-time sensor analysis • Soil intelligence • AI crop recommendations</p>
        </div>

        {/* ── MODE TABS ── */}
        <div style={{ ...glassCardDark, marginBottom: '2rem', overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'sensor', label: '📡 Live Sensor Monitoring', color: '#10b981' },
              { key: 'manual', label: '🌱 Soil Type Analysis',     color: '#3b82f6' },
            ].map(tab => (
              <button key={tab.key} onClick={() => { setMode(tab.key); setLatestPrediction(null); }} style={{
                flex: 1, padding: '1.1rem', border: 'none',
                background: mode === tab.key ? `${tab.color}40` : 'transparent',
                color: '#fff', fontWeight: mode === tab.key ? 700 : 400,
                fontSize: '1rem', cursor: 'pointer',
                borderRight: tab.key === 'sensor' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                borderBottom: mode === tab.key ? `2px solid ${tab.color}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* ══ SENSOR MODE ══ */}
        {mode === 'sensor' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>

            {/* Live sensor cards */}
            <div style={{ ...glassCard, padding: '2rem', borderTop: '3px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>📡 Real-time Sensor Data</h2>
                <div style={{ padding: '0.35rem 0.9rem', background: sensors.timestamp ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)', border: `1px solid ${sensors.timestamp ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.55)'}`, borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, color: sensors.timestamp ? '#6ee7b7' : '#fca5a5' }}>
                  {sensors.timestamp ? '● LIVE' : '● OFFLINE'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                {sensorMetrics.map((s, i) => (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: s.color, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{s.value}</div>
                    <div style={{ color: '#fff', fontWeight: 600, marginTop: '0.4rem' }}>{s.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              {!sensors.timestamp && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '0.9rem', color: '#fca5a5', textAlign: 'center' }}>
                  ⚠️ Arduino not connected — plug in USB cable and set correct COM port in app.py
                </div>
              )}
            </div>

            {/* ── LIVE SENSOR GRAPH ── */}
            <div style={{ ...glassCard, padding: '2rem', borderTop: '3px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>📈 Live Sensor Trends</h2>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                  {graphData.length > 0 ? `${graphData.length} readings` : 'Waiting for Arduino...'}
                </div>
              </div>

              {graphData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.35)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                  Graph will appear automatically once Arduino is connected
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={graphData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', paddingTop: '1rem' }}
                    />
                    <Line type="monotone" dataKey="Temperature"    stroke="#fb923c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Humidity"       stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Soil Moisture"  stroke="#c084fc" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recommendation panel */}
            <div style={{ ...glassCard, padding: '2rem', borderTop: '3px solid #10b981' }}>
              <h2 style={{ margin: '0 0 1.5rem', color: '#6ee7b7', fontSize: '1.3rem', fontWeight: 700 }}>🎯 Recommended Crop</h2>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.6)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>Processing sensor data...
                </div>
              ) : latestPrediction?.crop ? (
                <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.45)', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.1em', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>{latestPrediction.crop}</div>
                  <div style={{ fontSize: '1.2rem', color: '#a7f3d0', margin: '0.75rem 0 0.5rem' }}>Confidence: <strong>{latestPrediction.confidence}</strong></div>
                  {latestPrediction.reason && <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{latestPrediction.reason}</div>}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌱</div>
                  Click "Get Crop Recommendation" to analyze your field conditions
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ ...glassCardDark, padding: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={fetchLatest} style={{ padding: '0.9rem 2rem', background: 'rgba(59,130,246,0.28)', border: '1px solid rgba(59,130,246,0.6)', color: '#93c5fd', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
                🔄 Refresh Data
              </button>
              <button onClick={handleSensorPredict} disabled={loading} style={{ padding: '0.9rem 2rem', background: loading ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.32)', border: '1px solid rgba(16,185,129,0.6)', color: '#6ee7b7', borderRadius: '10px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: loading ? 0.6 : 1 }}>
                {loading ? '⏳ Analyzing...' : '🌾 Get Crop Recommendation'}
              </button>
            </div>

          </div>
        )}

        {/* ══ MANUAL SOIL MODE ══ */}
        {mode === 'manual' && (
          <div style={{ ...glassCard, padding: '2.5rem', borderTop: '3px solid #3b82f6', maxWidth: '560px', margin: '0 auto' }}>
            <h2 style={{ color: '#93c5fd', textAlign: 'center', fontSize: '1.4rem', marginBottom: '2rem' }}>🌱 Soil Type Based Analysis</h2>
            <form onSubmit={handleManualPredict}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
                  Select Soil Type <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select value={soilType} onChange={e => setSoilType(e.target.value)} required style={{ ...inputStyle }}>
                  <option value=""         style={{ background: '#0f2e18', color: '#fff' }}>Choose soil type...</option>
                  <option value="loamy"    style={{ background: '#0f2e18', color: '#fff' }}>🌾 Loamy Soil</option>
                  <option value="clay"     style={{ background: '#0f2e18', color: '#fff' }}>🏺 Clay Soil</option>
                  <option value="sandy"    style={{ background: '#0f2e18', color: '#fff' }}>🏖️ Sandy Soil</option>
                  <option value="black"    style={{ background: '#0f2e18', color: '#fff' }}>⚫ Black Soil</option>
                  <option value="red"      style={{ background: '#0f2e18', color: '#fff' }}>🔴 Red Soil</option>
                  <option value="alluvial" style={{ background: '#0f2e18', color: '#fff' }}>🏔️ Alluvial Soil</option>
                </select>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>Location / District</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Enter district/village..." style={{ ...inputStyle }} />
              </div>

              {soilType && (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#93c5fd' }}>
                  {{ loamy:'N:90 P:42 K:43', clay:'N:25 P:55 K:35', sandy:'N:50 P:55 K:82', black:'N:20 P:65 K:45', red:'N:15 P:75 K:30', alluvial:'N:106 P:26 K:60' }[soilType]} → sending to ML model
                </div>
              )}

              <button type="submit" disabled={loading || !soilType} style={{ width: '100%', padding: '1.1rem', background: loading || !soilType ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.38)', border: '1px solid rgba(59,130,246,0.6)', color: '#93c5fd', borderRadius: '10px', fontSize: '1.05rem', fontWeight: 600, cursor: loading || !soilType ? 'not-allowed' : 'pointer', opacity: loading || !soilType ? 0.6 : 1 }}>
                {loading ? 'Processing...' : '🚀 Get AI Recommendation'}
              </button>
            </form>

            {latestPrediction?.crop && (
              <div style={{ marginTop: '1.5rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.45)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase' }}>{latestPrediction.crop}</div>
                <div style={{ color: '#a7f3d0', marginTop: '0.5rem' }}>Confidence: <strong>{latestPrediction.confidence}</strong></div>
                {latestPrediction.reason && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', marginTop: '0.25rem' }}>{latestPrediction.reason}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TABLE ── */}
        {history.length > 0 && (
          <div style={{ ...glassCardDark, marginTop: '2.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>📋 Recent Recommendations</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.07)' }}>
                    {['Crop', 'Confidence', 'Location', 'Mode', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((pred, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#6ee7b7' }}>{pred[8]}</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#a7f3d0' }}>{pred[9]}</td>
                      <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>{pred[0]}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: pred[10] === 'sensor_advisory' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', color: pred[10] === 'sensor_advisory' ? '#6ee7b7' : '#93c5fd' }}>
                          {pred[10] === 'sensor_advisory' ? '📡 Sensor' : '🌱 Manual'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
                        {pred[11] ? new Date(pred[11]).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ ...glassCardDark, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', textAlign: 'center', padding: '1.5rem', marginTop: '4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.42)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          © 2026 KARM Crop Advisory System &nbsp;|&nbsp; For Farmers, By Technology
        </div>
      </div>

      {/* ── CHATBOT ── */}
      <Chatbot mode={mode} latestPrediction={latestPrediction} history={history} location={location} />

    </div>
  );
};

export default Home;