import React, { useState, useEffect } from "react";

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
      setLatestPrediction({
        crop: recommendedCrop, confidence, gps: sensorData.gps, reason
      });
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

  return (
    <div style={{ 
      fontFamily: '"Helvetica Neue", Arial, sans-serif', lineHeight: 1.6, color: '#333',
      background: '#f5f7fa'
    }}>
      {/* HEADER - Government style */}
      <div style={{
        background: 'linear-gradient(90deg, #0f4c23 0%, #1a5f2e 50%, #0f4c23 100%)',
        color: 'white', padding: '1rem 0', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ 
              margin: 0, fontSize: '1.8rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #fff 0%, #e8f5e8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              🌾 KARM Crop Advisor
            </h1>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Powered by AI & IoT Sensors
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        
        {/* MODE TABS - Clean government style */}
        <div style={{
          background: 'white', border: '2px solid #e5e7eb', borderRadius: '12px',
          marginBottom: '2rem', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', background: '#f8fafc' }}>
            <button onClick={() => {setMode('sensor'); setLatestPrediction(null);}} 
              style={{
                flex: 1, padding: '1.2rem', border: 'none', background: mode === 'sensor' ? '#10b981' : 'transparent',
                color: mode === 'sensor' ? 'white' : '#374151', fontWeight: mode === 'sensor' ? 700 : 500,
                fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              📡 Live Sensor Monitoring
            </button>
            <button onClick={() => {setMode('manual'); setLatestPrediction(null);}} 
              style={{
                flex: 1, padding: '1.2rem', border: 'none', background: mode === 'manual' ? '#3b82f6' : 'transparent',
                color: mode === 'manual' ? 'white' : '#374151', fontWeight: mode === 'manual' ? 700 : 500,
                fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              🌱 Soil Type Analysis
            </button>
          </div>
        </div>

        {/* SENSOR MODE */}
        {mode === 'sensor' && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            
            {/* LIVE SENSORS */}
            <div style={{
              background: 'white', border: '2px solid #10b981', borderRadius: '12px',
              padding: '2rem', boxShadow: '0 8px 30px rgba(16,185,129,0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#065f46', fontSize: '1.5rem', fontWeight: 700 }}>
                  📡 Real-time Sensor Data
                </h2>
                <div style={{ 
                  padding: '0.5rem 1rem', background: sensors.timestamp ? '#dcfce7' : '#fee2e2',
                  color: sensors.timestamp ? '#166534' : '#dc2626', borderRadius: '20px', fontSize: '0.9rem'
                }}>
                  {sensors.timestamp ? 'LIVE' : 'OFFLINE'}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ea580c' }}>
                    {sensors.temperature || 0}°C
                  </div>
                  <div style={{ color: '#374151', fontWeight: 600 }}>Temperature</div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>DHT22 Sensor</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0891b2' }}>
                    {sensors.humidity || 0}%
                  </div>
                  <div style={{ color: '#374151', fontWeight: 600 }}>Humidity</div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>DHT22 Sensor</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#7c2d12' }}>
                    {sensors.soil_moisture || 0}%
                  </div>
                  <div style={{ color: '#374151', fontWeight: 600 }}>Soil Moisture</div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Soil Probe</div>
                </div>
              </div>
            </div>

            {/* RECOMMENDATION */}
            <div style={{
              background: 'white', borderRadius: '12px', padding: '2.5rem',
              borderTop: '5px solid #10b981', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ color: '#065f46', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                🎯 Recommended Crop
              </h2>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                  Processing sensor data...
                </div>
              ) : latestPrediction?.crop ? (
                <div style={{
                  background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '12px',
                  padding: '2rem', textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '3rem', fontWeight: 800, color: '#166534', marginBottom: '1rem',
                    textTransform: 'uppercase', letterSpacing: '0.1em'
                  }}>
                    {latestPrediction.crop}
                  </div>
                  <div style={{ fontSize: '1.3rem', color: '#047857', marginBottom: '0.5rem' }}>
                    Confidence: <strong>{latestPrediction.confidence}</strong>
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#374151' }}>
                    {latestPrediction.gps}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
                  Click "Get Recommendation" to analyze your field conditions
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div style={{
              background: 'white', padding: '2rem', borderRadius: '12px',
              border: '2px solid #e5e7eb', display: 'flex', gap: '1rem', justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button onClick={fetchLatest} style={{
                padding: '1rem 2rem', background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                fontSize: '1rem'
              }}>
                🔄 Refresh Data
              </button>
              <button onClick={testSensors} style={{
                padding: '1rem 2rem', background: '#10b981', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                fontSize: '1rem'
              }} disabled={loading}>
                {loading ? '⏳ Analyzing...' : '🌾 Get Crop Recommendation'}
              </button>
            </div>
          </div>
        )}

        {/* MANUAL MODE */}
        {mode === 'manual' && (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '2.5rem',
            border: '2px solid #3b82f6', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#1e40af', textAlign: 'center', fontSize: '1.6rem', marginBottom: '2rem' }}>
              Soil Type Based Analysis
            </h2>
            <form onSubmit={handleManualPredict} style={{ maxWidth: '500px', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                  Select Soil Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select value={soilType} onChange={(e) => setSoilType(e.target.value)} required
                  style={{
                    width: '100%', padding: '1rem', border: '2px solid #d1d5db',
                    borderRadius: '8px', fontSize: '1rem', background: 'white'
                  }}
                >
                  <option value="">Choose soil type...</option>
                  <option value="loamy">🌾 Loamy Soil</option>
                  <option value="clay">🏺 Clay Soil</option>
                  <option value="sandy">🏖️ Sandy Soil</option>
                  <option value="black">⚫ Black Soil</option>
                  <option value="red">🔴 Red Soil</option>
                  <option value="alluvial">🏔️ Alluvial Soil</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                  Location / District
                </label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter district/village..." 
                  style={{
                    width: '100%', padding: '1rem', border: '2px solid #d1d5db',
                    borderRadius: '8px', fontSize: '1rem', background: 'white'
                  }}
                />
              </div>

              <button type="submit" disabled={loading || !soilType} style={{
                width: '100%', padding: '1.2rem', background: '#3b82f6',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer'
              }}>
                {loading ? 'Processing...' : 'Get AI Recommendation'}
              </button>
            </form>
          </div>
        )}

        {/* HISTORY TABLE */}
        {history.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <div style={{
              background: 'white', borderRadius: '12px', overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '2px solid #e5e7eb'
            }}>
              <div style={{ 
                background: '#f8fafc', padding: '1.5rem', borderBottom: '2px solid #e5e7eb' 
              }}>
                <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.3rem', fontWeight: 700 }}>
                  📋 Recent Recommendations
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600 }}>Crop</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600 }}>Confidence</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600 }}>Location</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 600 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((pred, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#059669' }}>{pred[8]}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#10b981' }}>{pred[9]}%</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>{pred[0]}</td>
                        <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                          {pred[11] ? new Date(pred[11]).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        background: '#1f2937', color: '#d1d5db', textAlign: 'center',
        padding: '2rem', marginTop: '4rem', fontSize: '0.9rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          © 2026 KARM Crop Advisory System | For Farmers, By Technology
        </div>
      </div>
    </div>
  );
};

export default Home;
