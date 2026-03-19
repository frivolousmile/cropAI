from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import pandas as pd
import sqlite3
import serial
import threading
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ─── CONFIG — only change PORT tomorrow after plugging Arduino ─────────────
PORT       = 'COM3'      # ← Change to your port e.g. COM5, COM7, /dev/ttyUSB0
BAUDRATE   = 9600
DB_PATH    = 'crops.db'
MODEL_PATH = 'model.pkl'

# ─── SENSOR STATE ─────────────────────────────────────────────────────────
sensor_data = {
    "temperature":  0.0,
    "humidity":     0.0,
    "soil_moisture": 0.0,
    "timestamp":    ""
}

# ─── LOAD ML MODEL ────────────────────────────────────────────────────────
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    print("✅ ML model loaded successfully")
    # Print what the model expects so we can verify
    if hasattr(model, 'feature_names_in_'):
        print(f"📋 Model expects features: {list(model.feature_names_in_)}")
except Exception as e:
    model = None
    print(f"⚠️  Model load failed: {e}")

# ─── SQLITE SETUP ─────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            gps         TEXT,
            N           REAL, P REAL, K REAL,
            temp        REAL,
            humidity    REAL,
            ph          REAL,
            rainfall    REAL,
            crop        TEXT,
            confidence  TEXT,
            mode        TEXT,
            timestamp   TEXT
        )
    ''')
    conn.commit()
    conn.close()
    print("✅ Database ready")

init_db()

# ─── ML PREDICTION — uses exact column names from train_model.py ──────────
def predict_with_model(N, P, K, temperature, humidity, ph, rainfall):
    """
    Train_model.py used: ["N","P","K","temperature","humidity","ph","rainfall"]
    We must pass a DataFrame with the same column names and order.
    """
    try:
        features_df = pd.DataFrame([[N, P, K, temperature, humidity, ph, rainfall]],
                                    columns=["N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
        crop = model.predict(features_df)[0]
        proba = model.predict_proba(features_df)[0]
        confidence = f"{round(max(proba) * 100)}%"
        return crop, confidence, "ML model prediction"
    except Exception as e:
        print(f"❌ Model prediction error: {e}")
        return None, None, None

# ─── RULE-BASED FALLBACK ──────────────────────────────────────────────────
def rule_based_crop(temp, humidity, soil_moisture):
    if 20 <= temp <= 35:
        if soil_moisture >= 60 and humidity >= 70:
            return "Rice",      "92%", "High moisture paddy conditions"
        elif soil_moisture >= 45 and humidity >= 60:
            return "Maize",     "89%", "Moderate moisture conditions"
        elif soil_moisture >= 30 and humidity <= 65:
            return "Groundnut", "87%", "Medium dry soil"
        else:
            return "Wheat",     "85%", "Dry soil conditions"
    return "No recommendation", "50%", "Temperature out of optimal range"

# ─── SOIL TYPE → NPK mapping (matches soilNPK in Home.js) ─────────────────
SOIL_NPK = {
    'loamy':    (90,  42, 43),
    'clay':     (25,  55, 35),
    'sandy':    (50,  55, 82),
    'black':    (20,  65, 45),
    'red':      (15,  75, 30),
    'alluvial': (106, 26, 60),
}

# ─── SERIAL READER ────────────────────────────────────────────────────────
def read_serial():
    while True:
        try:
            ser = serial.Serial(PORT, BAUDRATE, timeout=1)
            print(f"✅ Arduino connected on {PORT}")
            while True:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                # Only process the CSV line: "27.5,64.2,48"
                # Emoji debug lines have 0 commas, separator lines have 0 commas
                if line.count(',') == 2:
                    parts = line.split(',')
                    try:
                        t = float(parts[0])
                        h = float(parts[1])
                        s = float(parts[2])
                        # Basic sanity check — reject garbage values
                        if -10 <= t <= 60 and 0 <= h <= 100 and 0 <= s <= 100:
                            sensor_data["temperature"]   = t
                            sensor_data["humidity"]      = h
                            sensor_data["soil_moisture"] = s
                            sensor_data["timestamp"]     = datetime.now().isoformat()
                            print(f"📡 Live: T={t}°C  H={h}%  Soil={s}%")
                    except ValueError:
                        pass
        except serial.SerialException as e:
            print(f"⏳ Arduino not connected ({e}) — retrying in 5s...")
            time.sleep(5)

threading.Thread(target=read_serial, daemon=True).start()

# ═══════════════════════════════════════════════════════════════════════════
#  API ROUTES
# ═══════════════════════════════════════════════════════════════════════════

# ── 1. Live sensor readings ────────────────────────────────────────────────
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    return jsonify(sensor_data)

# ── 2. Predict crop ───────────────────────────────────────────────────────
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        mode = data.get('mode', 'manual')
        gps  = data.get('gps', '')

        # ── SENSOR MODE: use live Arduino readings ──────────────────────
        if mode == 'sensor_advisory':
            temp         = sensor_data['temperature']  or data.get('temp', 25)
            humidity     = sensor_data['humidity']     or data.get('humidity', 70)
            soil_moisture= sensor_data['soil_moisture']or data.get('soil_moisture', 45)

            crop, confidence, reason = rule_based_crop(temp, humidity, soil_moisture)

        # ── MANUAL SOIL MODE: use model with soil NPK ───────────────────
        elif mode == 'manual_soil':
            soil_type = data.get('soil_type', '')
            N, P, K   = SOIL_NPK.get(soil_type, (75, 40, 45))
            temp      = data.get('temp', 25)
            humidity  = data.get('humidity', 75)
            ph        = data.get('ph', 6.5)
            rainfall  = data.get('rainfall', 200)

            if model:
                crop, confidence, reason = predict_with_model(N, P, K, temp, humidity, ph, rainfall)
                if crop is None:  # model failed, use fallback
                    crop, confidence, reason = rule_based_crop(temp, humidity, 50)
            else:
                crop, confidence, reason = rule_based_crop(temp, humidity, 50)

            soil_moisture = 50  # default for DB storage in manual mode

        # ── GENERIC / NPK mode ──────────────────────────────────────────
        else:
            N        = data.get('N', 75)
            P        = data.get('P', 40)
            K        = data.get('K', 45)
            temp     = data.get('temp', 25)
            humidity = data.get('humidity', 75)
            ph       = data.get('ph', 6.5)
            rainfall = data.get('rainfall', 200)
            soil_moisture = data.get('soil_moisture', 50)

            if model and N > 0:
                crop, confidence, reason = predict_with_model(N, P, K, temp, humidity, ph, rainfall)
                if crop is None:
                    crop, confidence, reason = rule_based_crop(temp, humidity, soil_moisture)
            else:
                crop, confidence, reason = rule_based_crop(temp, humidity, soil_moisture)

        # ── Save to DB ──────────────────────────────────────────────────
        N = data.get('N', 0)
        P = data.get('P', 0)
        K = data.get('K', 0)
        conn = sqlite3.connect(DB_PATH)
        conn.execute('''
            INSERT INTO predictions
              (gps, N, P, K, temp, humidity, ph, rainfall, crop, confidence, mode, timestamp)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ''', (gps, N, P, K,
              data.get('temp', 25),
              data.get('humidity', 75),
              data.get('ph', 6.5),
              data.get('rainfall', 200),
              crop, confidence, mode,
              datetime.now().isoformat()))
        conn.commit()
        conn.close()

        return jsonify({"crop": crop, "confidence": confidence, "reason": reason, "gps": gps})

    except Exception as e:
        print(f"❌ Predict route error: {e}")
        return jsonify({"error": str(e)}), 500

# ── 3. Latest prediction ──────────────────────────────────────────────────
@app.route('/api/latest', methods=['GET'])
def latest():
    try:
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute(
            'SELECT gps,crop,confidence,timestamp FROM predictions ORDER BY id DESC LIMIT 1'
        ).fetchone()
        conn.close()
        if row:
            return jsonify({"gps": row[0], "crop": row[1], "confidence": row[2], "timestamp": row[3]})
        return jsonify({})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── 4. History ────────────────────────────────────────────────────────────
@app.route('/api/history', methods=['GET'])
def history():
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            '''SELECT gps,N,P,K,temp,humidity,ph,rainfall,crop,confidence,mode,timestamp
               FROM predictions ORDER BY id DESC LIMIT 10'''
        ).fetchall()
        conn.close()
        return jsonify([list(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── 5. Chatbot ────────────────────────────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
def chat():
    data     = request.json
    user_msg = data.get("message", "").lower()

    t        = sensor_data['temperature']
    h        = sensor_data['humidity']
    s        = sensor_data['soil_moisture']
    has_live = sensor_data['timestamp'] != ""

    if any(w in user_msg for w in ["sensor", "live", "reading", "temperature", "humidity", "moisture"]):
        if has_live:
            response = (f"📡 Live Sensor Readings:\n\n"
                        f"🌡️ Temperature: {t}°C\n"
                        f"💧 Humidity: {h}%\n"
                        f"🌱 Soil Moisture: {s}%\n\n"
                        f"Last updated: {sensor_data['timestamp'][:19]}")
        else:
            response = "⚠️ Sensors offline. Connect your Arduino and the readings will appear automatically."

    elif "nitrogen" in user_msg:
        response = "🌱 Low Nitrogen soil:\n\n👉 Best crops: Peas, Beans, Lentils\n👉 Add: Urea, Compost, Green manure\n👉 Tip: Legumes fix atmospheric nitrogen naturally!"
    elif "phosphorus" in user_msg:
        response = "🌱 Low Phosphorus soil:\n\n👉 Best crops: Legumes, Sunflower\n👉 Add: DAP, Bone meal\n👉 Tip: Phosphorus helps root development."
    elif "potassium" in user_msg:
        response = "🌱 Low Potassium soil:\n\n👉 Best crops: Potato, Tomato, Banana\n👉 Add: MOP (Muriate of Potash), Wood ash\n👉 Tip: Potassium improves fruit quality."
    elif "loamy" in user_msg:
        response = "🌾 Loamy soil — best for:\nWheat, Maize, Sugarcane, Cotton\n\nRich in nutrients, good drainage. Ideal for most crops!"
    elif "clay" in user_msg:
        response = "🌾 Clay soil — best for:\nRice, Jute\n\nHolds water well but drains slowly. Good for paddy crops."
    elif "sandy" in user_msg:
        response = "🌾 Sandy soil — best for:\nGroundnut, Carrot, Watermelon\n\nDrains fast, warms quickly. Add organic matter to improve."
    elif "black" in user_msg:
        response = "🌾 Black soil (Regur) — best for:\nCotton, Soybean, Sorghum\n\nHighly moisture retentive. Great for dry regions."
    elif "red" in user_msg:
        response = "🌾 Red soil — best for:\nGroundnut, Pulses, Millet\n\nLow in nitrogen, add organic matter regularly."
    elif "alluvial" in user_msg:
        response = "🌾 Alluvial soil — best for:\nWheat, Rice, Sugarcane, Maize\n\nMost fertile soil type. Found near river plains."
    elif "kharif" in user_msg:
        response = "🌧️ Kharif crops (June–July):\nRice, Maize, Cotton, Soybean, Groundnut, Jowar, Bajra"
    elif "rabi" in user_msg:
        response = "❄️ Rabi crops (Oct–Nov):\nWheat, Barley, Mustard, Gram, Peas, Lentil"
    elif "zaid" in user_msg:
        response = "☀️ Zaid crops (March–June):\nWatermelon, Cucumber, Muskmelon, Bitter gourd"
    elif any(w in user_msg for w in ["hello", "hi", "hey", "namaste"]):
        response = "👋 Namaste Farmer! I am KARM AI Assistant.\n\nAsk me about:\n• Soil nutrients (nitrogen, phosphorus, potassium)\n• Soil types (loamy, clay, sandy, black, red, alluvial)\n• Crop seasons (kharif, rabi, zaid)\n• Live sensor readings"
    else:
        response = ("🌾 I can help with:\n\n"
                    "• Soil nutrients → 'low nitrogen'\n"
                    "• Soil types → 'loamy soil crops'\n"
                    "• Seasons → 'kharif crops'\n"
                    "• Sensors → 'live reading'\n\n"
                    "What would you like to know?")

    return jsonify({"reply": response})


# ─── RUN ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)