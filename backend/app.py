from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import sqlite3
from datetime import datetime
import random  # 🔥 Added for fake data

app = Flask(__name__)
CORS(app)

# Load ML model
with open("model.pkl", "rb") as f:
    model = pickle.load(f)

# Initialize database
def init_db():
    conn = sqlite3.connect('farmers.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS predictions 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  gps TEXT,
                  N REAL, P REAL, K REAL,
                  temp REAL, humidity REAL, ph REAL, rainfall REAL,
                  crop TEXT, confidence REAL,
                  mode TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

# 🔥 NEW: Sensor Dashboard Endpoint (Fake data for now)
@app.route("/api/sensors", methods=["GET"])
def get_sensors():
    """Returns live sensor data (fake for now, Arduino tomorrow)"""
    return jsonify({
        'temperature': round(random.uniform(25, 35), 1),
        'humidity': round(random.uniform(40, 80), 1),
        'soil_moisture': round(random.uniform(60, 95), 1),
        'timestamp': datetime.now().strftime('%H:%M:%S')
    })

# Your existing routes (unchanged)
@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()
    
    features = [data["N"], data["P"], data["K"], data["temp"], 
                data["humidity"], data["ph"], data["rainfall"]]
    features = np.array(features).reshape(1, -1)
    
    crop = model.predict(features)[0]
    confidence = model.predict_proba(features)[0].max() * 100
    
    conn = sqlite3.connect('farmers.db')
    c = conn.cursor()
    c.execute("INSERT INTO predictions (gps, N, P, K, temp, humidity, ph, rainfall, crop, confidence, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              (data.get("gps", "unknown"), data["N"], data["P"], data["K"], 
               data["temp"], data["humidity"], data["ph"], data["rainfall"], 
               crop, confidence, data.get("mode", "sensor")))
    conn.commit()
    conn.close()
    
    return jsonify({
        "crop": crop,
        "confidence": f"{confidence:.1f}%",
        "gps": data.get("gps", "unknown")
    })

@app.route("/api/predict-manual", methods=["POST"])
def predict_manual():
    try:
        soil_npk = {
            'loamy': [80, 40, 45],      
            'clay': [60, 50, 35],       
            'sandy': [70, 30, 50],      
            'black': [65, 45, 40],      
            'red': [75, 35, 42],        
            'alluvial': [85, 42, 48],   
            'laterite': [55, 25, 60],   
            'peaty': [45, 60, 30]       
        }

        soil_type = request.form['soil_type']
        location = request.form.get('location', 'Delhi, India')
        
        N, P, K = soil_npk.get(soil_type, [75, 40, 45])
        
        features = [N, P, K, 25.0, 75.0, 6.5, 200.0]
        features = np.array(features).reshape(1, -1)
        crop = model.predict(features)[0]
        confidence = model.predict_proba(features)[0].max() * 100
        
        conn = sqlite3.connect('farmers.db')
        c = conn.cursor()
        c.execute("INSERT INTO predictions (gps, N, P, K, temp, humidity, ph, rainfall, crop, confidence, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  (location, N, P, K, 25.0, 75.0, 6.5, 200.0, crop, confidence, 'manual_image'))
        conn.commit()
        conn.close()
        
        return jsonify({
            "crop": crop,
            "confidence": f"{confidence:.1f}%",
            "gps": location
        })
    except Exception as e:
        return jsonify({"error": "Soil analysis failed"}), 400

@app.route("/api/latest", methods=["GET"])
def get_latest():
    conn = sqlite3.connect('farmers.db')
    c = conn.cursor()
    c.execute("SELECT gps, N, P, K, temp, humidity, ph, rainfall, crop, confidence, mode, timestamp FROM predictions ORDER BY timestamp DESC LIMIT 1")
    latest = c.fetchone()
    conn.close()
    
    if latest:
        return jsonify({
            "gps": latest[0],
            "crop": latest[8],
            "confidence": f"{latest[9]:.1f}%",
            "mode": latest[10],
            "timestamp": latest[11]
        })
    return jsonify({"message": "No data yet", "status": "waiting"})

@app.route("/api/history", methods=["GET"])
def get_history():
    conn = sqlite3.connect('farmers.db')
    c = conn.cursor()
    c.execute("SELECT gps, N, P, K, temp, humidity, ph, rainfall, crop, confidence, mode, timestamp FROM predictions ORDER BY timestamp DESC LIMIT 10")
    history = c.fetchall()
    conn.close()
    return jsonify(history)

if __name__ == "__main__":
    app.run(debug=True, port=5000, host='0.0.0.0')
