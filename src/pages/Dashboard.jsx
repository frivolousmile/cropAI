import React, { useState, useEffect } from 'react';
import '../Dashboard.css'
function Dashboard() {
  const [data, setData] = useState({});

  useEffect(() => {
    const getData = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/sensors');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.log('API error');
      }
    };

    getData();
    const id = setInterval(getData, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dashboard">
      <h1>🚜 Live Sensor Dashboard</h1>
      <div className="cards">
        <div className="card">
          <div className="icon">🌡️</div>
          <h2>Temperature</h2>
          <h1>{data.temperature || 0}°C</h1>
        </div>
        <div className="card">
          <div className="icon">💧</div>
          <h2>Humidity</h2>
          <h1>{data.humidity || 0}%</h1>
        </div>
        <div className="card">
          <div className="icon">🌱</div>
          <h2>Soil Moisture</h2>
          <h1>{data.soil_moisture || 0}%</h1>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
