import React, { useState, useEffect } from "react";

const Home = ({ lang }) => {
  const [mode, setMode] = useState('sensor');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [soilType, setSoilType] = useState('');
  const [location, setLocation] = useState('Delhi, India');

  // Auto-refresh SENSOR mode only
  useEffect(() => {
    if (mode === 'sensor') {
      fetchLatest();
      fetchHistory();
      const interval = setInterval(() => {
        fetchLatest();
        fetchHistory();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const fetchLatest = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/latest");
      const data = await response.json();
      setLatestPrediction(data);
    } catch (error) {
      console.log("Backend not running");
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/history");
      const data = await response.json();
      setHistory(data.slice(0, 10));
    } catch (error) {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const testSensors = async () => {
    setLoading(true);
    const sensorData = {
      N: 90, P: 42, K: 43,
      temp: 25.5, humidity: 78,
      ph: 6.5, rainfall: 203,
      gps: "28.6139,77.2090 (Delhi)"
    };
    
    try {
      await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sensorData)
      });
      fetchLatest();
      fetchHistory();
      alert("✅ ESP32 simulation complete!");
    } catch (error) {
      alert("❌ Backend not running!");
    }
    setLoading(false);
  };

  const handleManualPredict = async (e) => {
    e.preventDefault();
    if (!image || !soilType) return alert("Upload image + soil type!");
    
    setLoading(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('soil_type', soilType);
    formData.append('location', location);

    try {
      const response = await fetch("http://localhost:5000/api/predict-manual", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setLatestPrediction(data);
      fetchHistory();
      alert("✅ Manual prediction complete!");
    } catch (error) {
      alert("❌ Backend error!");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      
      {/* HERO SECTION */}
      <div style={{ 
        textAlign: 'center', padding: '40px 20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', borderRadius: '16px', marginBottom: '30px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🌾 KARM Live Dashboard</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          {mode === 'sensor' ? 'Real-time crop recommendations from ESP32 sensors' : 'Manual crop prediction with image analysis'}
        </p>
      </div>

      {/* MODE TOGGLE */}
      <div style={{
        textAlign: 'center', padding: '15px', background: 'white',
        borderRadius: '12px', marginBottom: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setMode('sensor')}
            style={{
              padding: '10px 20px', fontSize: '15px', fontWeight: 'bold',
              background: mode === 'sensor' ? '#4caf50' : '#f0f0f0',
              color: mode === 'sensor' ? 'white' : '#333',
              border: '2px solid #4caf50', borderRadius: '25px', cursor: 'pointer'
            }}
          >
            📡 Sensor Mode
          </button>
          <button 
            onClick={() => setMode('manual')}
            style={{
              padding: '10px 20px', fontSize: '15px', fontWeight: 'bold',
              background: mode === 'manual' ? '#2196f3' : '#f0f0f0',
              color: mode === 'manual' ? 'white' : '#333',
              border: '2px solid #2196f3', borderRadius: '25px', cursor: 'pointer'
            }}
          >
            🖼️ Manual Mode
          </button>
        </div>
      </div>

      {/* SENSOR MODE */}
      {mode === 'sensor' && (
        <>
          <div style={{ 
            background: 'white', padding: '30px', borderRadius: '16px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '30px'
          }}>
            <h2 style={{ color: '#2d5a2d', marginBottom: '20px' }}>📡 Latest Sensor Reading</h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
                ⏳ Waiting for ESP32 sensor data... (Auto-refreshes every 30s)
              </div>
            ) : latestPrediction?.crop ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#e8f5e8', 
                borderRadius: '12px', border: '3px solid #4caf50' }}>
                <h3 style={{ fontSize: '2.5rem', color: '#2d5a2d', margin: '0 0 15px 0' }}>
                  ✅ {latestPrediction.crop?.toUpperCase()}
                </h3>
                <p style={{ fontSize: '1.3rem', margin: '10px 0' }}>
                  Confidence: <strong>{latestPrediction.confidence}</strong>
                </p>
                <p style={{ fontSize: '1.1rem', margin: '10px 0', opacity: 0.8 }}>
                  📍 {latestPrediction.gps}
                </p>
                <p style={{ fontSize: '1rem', margin: '5px 0', opacity: 0.7 }}>
                  🕒 {latestPrediction.timestamp ? new Date(latestPrediction.timestamp).toLocaleString() : 'Just now'}
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '18px' }}>
                No sensor data yet. ESP32 will send automatically.
              </div>
            )}
          </div>

          <div style={{ 
            background: 'white', padding: '30px', borderRadius: '16px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '30px' 
          }}>
            <h2 style={{ color: '#2d5a2d', marginBottom: '20px' }}>📊 Recent Predictions (Last 10)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '15px 10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Crop</th>
                    <th style={{ padding: '15px 10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Confidence</th>
                    <th style={{ padding: '15px 10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Location</th>
                    <th style={{ padding: '15px 10px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((pred, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{pred[9]}</td>
                      <td style={{ padding: '12px 10px' }}>{pred[10]}%</td>
                      <td style={{ padding: '12px 10px', fontSize: '13px' }}>{pred[1]}</td>
                      <td style={{ padding: '12px 10px', fontSize: '13px' }}>
                        {pred[12] ? new Date(pred[12]).toLocaleString() : 'Loading...'}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>
                        No predictions yet<br/><small>Click "Simulate ESP32" to test</small>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ 
            textAlign: 'center', padding: '20px',
            display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap'
          }}>
            <button onClick={fetchLatest} style={{
              padding: '12px 24px', background: '#007bff', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer'
            }}>
              🔄 Refresh Dashboard
            </button>
            <button onClick={testSensors} style={{
              padding: '12px 24px', background: '#ff9800', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold'
            }}>
              🧪 SIMULATE ESP32 SENSORS
            </button>
          </div>
        </>
      )}

      {/* 🔥 FIXED MANUAL MODE - BEAUTIFUL GRADIENT CONTAINER */}
      {mode === 'manual' && (
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px', borderRadius: '20px', 
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)', marginBottom: '30px', 
          position: 'relative', zIndex: 10
        }}>
          <div style={{
            background: 'white', padding: '40px', borderRadius: '20px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)', maxWidth: '700px', margin: '0 auto'
          }}>
            <h2 style={{ color: '#2196f3', marginBottom: '30px', textAlign: 'center', fontSize: '2rem' }}>
              🖼️ Manual Crop Prediction
            </h2>
            
            <form onSubmit={handleManualPredict} style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Image Upload */}
              <div style={{ marginBottom: '25px', textAlign: 'center', padding: '25px', 
                border: '3px dashed #2196f3', borderRadius: '16px', background: '#f8fbff' }}>
                <label style={{ display: 'block', marginBottom: '15px', fontSize: '18px', 
                  fontWeight: 'bold', color: '#2196f3' }}>
                  📸 Upload Plant/Soil Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                  style={{
                    padding: '15px', border: '2px solid #ddd', borderRadius: '10px', 
                    width: '100%', background: 'white', fontSize: '16px'
                  }}
                  required
                />
                {image && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#e3f2fd', 
                    borderRadius: '8px', fontSize: '15px', color: '#1976d2' }}>
                    ✅ {image.name} selected ({(image.size/1024/1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {/* Soil Type */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                  🌱 Soil Type <span style={{ color: '#666', fontSize: '14px' }}>(Required)</span>
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  style={{
                    width: '100%', padding: '18px', border: '2px solid #ddd', borderRadius: '10px', 
                    fontSize: '16px', background: 'white', cursor: 'pointer'
                  }}
                  required
                >
                  <option value="">Select soil type...</option>
                  <option value="loamy">🌾 Loamy (Best for Rice, Wheat)</option>
                  <option value="clay">🏺 Clay (Good for Pulses)</option>
                  <option value="sandy">🏖️ Sandy (Millets, Groundnut)</option>
                  <option value="black">⚫ Black (Cotton, Soybean)</option>
                  <option value="red">🔴 Red (Groundnut, Millets)</option>
                  <option value="alluvial">🏔️ Alluvial (Rice, Sugarcane)</option>
                </select>
              </div>

              {/* Location */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                  📍 Location <span style={{ color: '#666', fontSize: '14px' }}>(City/Region)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Delhi, India"
                  style={{
                    width: '100%', padding: '18px', border: '2px solid #ddd', borderRadius: '10px', 
                    fontSize: '16px', background: 'white'
                  }}
                />
              </div>

              {/* Predict Button */}
              <button 
                type="submit" 
                disabled={loading || !image || !soilType}
                style={{
                  width: '100%', padding: '20px', background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', 
                  color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', 
                  fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase',
                  opacity: loading || !image || !soilType ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Analyzing Image + Soil...' : '🚀 Get Crop Recommendation'}
              </button>
            </form>

            {/* Result */}
            {latestPrediction && latestPrediction.crop && (
              <div style={{ 
                marginTop: '40px', padding: '30px', background: '#e3f2fd', 
                borderRadius: '16px', border: '3px solid #2196f3', textAlign: 'center' 
              }}>
                <h3 style={{ fontSize: '2.5rem', color: '#2196f3', margin: '0 0 20px 0' }}>
                  ✅ {latestPrediction.crop?.toUpperCase()}
                </h3>
                <p style={{ fontSize: '1.4rem', margin: '12px 0' }}>
                  Confidence: <strong>{latestPrediction.confidence}</strong>
                </p>
                <p style={{ fontSize: '1.2rem', margin: '12px 0' }}>
                  Soil: <strong>{latestPrediction.soil_type}</strong>
                </p>
                <p style={{ fontSize: '1.1rem', margin: '8px 0', opacity: 0.9 }}>
                  📍 {latestPrediction.gps}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px', marginTop: '40px', textAlign: 'center'
      }}>
        <div style={{ padding: '25px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', fontSize: '2.5rem', margin: '0 0 10px 0' }}>99.55%</h3>
          <p>Model Accuracy</p>
        </div>
        <div style={{ padding: '25px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', fontSize: '2.5rem', margin: '0 0 10px 0' }}>2200+</h3>
          <p>Samples Trained</p>
        </div>
        <div style={{ padding: '25px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#667eea', fontSize: '2.5rem', margin: '0 0 10px 0' }}>22</h3>
          <p>Crop Types</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
