from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import sqlite3
import serial
import threading
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ─── CONFIG ───────────────────────────────────────────────
PORT     = 'COM3'   # ← Change to your port tomorrow (COM5, /dev/ttyUSB0, etc.)
BAUDRATE = 9600
DB_PATH  = 'crops.db'
MODEL_PATH = 'model.pkl'

# ─── SHARED SENSOR STATE ──────────────────────────────────
sensor_data = {
    "temperature": 0.0,
    "humidity": 0.0,
    "soil_moisture": 0.0,
    "timestamp": ""
}

# ─── LOAD ML MODEL ────────────────────────────────────────
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    print("✅ ML model loaded")
except Exception as e:
    model = None
    print(f"⚠️  Model not found: {e} — predictions will use rule-based fallback")

# ─── SQLITE SETUP ─────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            gps       TEXT,
            N         REAL, P REAL, K REAL,
            temp      REAL,
            humidity  REAL,
            ph        REAL,
            rainfall  REAL,
            crop      TEXT,
            confidence TEXT,
            mode      TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ─── SERIAL READER (runs in background thread) ────────────
def read_serial():
    while True:
        try:
            ser = serial.Serial(PORT, BAUDRATE, timeout=1)
            print(f"✅ Serial connected on {PORT}")
            while True:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                # Only parse the CSV line: "temp,humidity,soil_moisture"
                if line.count(',') == 2:
                    parts = line.split(',')
                    try:
                        sensor_data["temperature"]  = float(parts[0])
                        sensor_data["humidity"]      = float(parts[1])
                        sensor_data["soil_moisture"] = float(parts[2])
                        sensor_data["timestamp"]     = datetime.now().isoformat()
                        print(f"📡 Sensor: T={parts[0]}°C  H={parts[1]}%  S={parts[2]}%")
                    except ValueError:
                        pass  # skip malformed lines
        except serial.SerialException as e:
            print(f"❌ Serial not available ({e}) — plug in Arduino and restart Flask")
            # Don't crash — just wait. Sensor values stay at last known / 0.
            import time
            time.sleep(5)

# Start serial thread (daemon=True so it dies when Flask stops)
threading.Thread(target=read_serial, daemon=True).start()

# ─── RULE-BASED CROP FALLBACK ─────────────────────────────
def rule_based_crop(temp, humidity, soil_moisture):
    if 20 <= temp <= 35:
        if soil_moisture >= 60 and humidity >= 70:
            return "Rice", "92%", "High moisture paddy conditions"
        elif soil_moisture >= 45 and humidity >= 60:
            return "Maize", "89%", "Moderate moisture conditions"
        elif soil_moisture >= 30 and humidity <= 65:
            return "Groundnut", "87%", "Medium dry soil"
        else:
            return "Wheat", "85%", "Dry soil conditions"
    return "No recommendation", "50%", "Temperature out of optimal range"

# ═══════════════════════════════════════════════════════════
#  API ROUTES
# ═══════════════════════════════════════════════════════════

# ── 1. Live sensor data ────────────────────────────────────
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    return jsonify(sensor_data)

# ── 2. Save a prediction ──────────────────────────────────
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    N         = data.get('N', 0)
    P         = data.get('P', 0)
    K         = data.get('K', 0)
    temp      = data.get('temp', sensor_data['temperature'])
    humidity  = data.get('humidity', sensor_data['humidity'])
    ph        = data.get('ph', 6.5)
    rainfall  = data.get('rainfall', 0)
    gps       = data.get('gps', '')
    mode      = data.get('mode', 'manual')

    # Use ML model if available, else rule-based
    if model and N > 0:
        try:
            features = np.array([[N, P, K, temp, humidity, ph, rainfall]])
            crop       = model.predict(features)[0]
            proba      = model.predict_proba(features)[0]
            confidence = f"{round(max(proba) * 100)}%"
            reason     = "ML model prediction"
        except Exception as e:
            print(f"Model error: {e}")
            crop, confidence, reason = rule_based_crop(temp, humidity, data.get('soil_moisture', 0))
    else:
        soil_moisture = data.get('soil_moisture', sensor_data['soil_moisture'])
        crop, confidence, reason = rule_based_crop(temp, humidity, soil_moisture)

    # Save to DB
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        INSERT INTO predictions (gps,N,P,K,temp,humidity,ph,rainfall,crop,confidence,mode,timestamp)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (gps, N, P, K, temp, humidity, ph, rainfall, crop, confidence, mode,
          datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return jsonify({"crop": crop, "confidence": confidence, "reason": reason, "gps": gps})

# ── 3. Latest prediction ───────────────────────────────────
@app.route('/api/latest', methods=['GET'])
def latest():
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        'SELECT gps,crop,confidence,timestamp FROM predictions ORDER BY id DESC LIMIT 1'
    ).fetchone()
    conn.close()
    if row:
        return jsonify({"gps": row[0], "crop": row[1], "confidence": row[2], "timestamp": row[3]})
    return jsonify({})

# ── 4. History (last 10) ───────────────────────────────────
@app.route('/api/history', methods=['GET'])
def history():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        'SELECT gps,N,P,K,temp,humidity,ph,rainfall,crop,confidence,mode,timestamp FROM predictions ORDER BY id DESC LIMIT 10'
    ).fetchall()
    conn.close()
    return jsonify([list(r) for r in rows])

# ── 5. Chatbot ────────────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
def chat():
    data     = request.json
    user_msg = data.get("message", "").lower()

    # Current sensor context
    t  = sensor_data['temperature']
    h  = sensor_data['humidity']
    s  = sensor_data['soil_moisture']
    has_live = sensor_data['timestamp'] != ""

    # ── Sensor status ──
    if any(w in user_msg for w in ["sensor", "live", "reading", "temperature", "humidity", "moisture"]):
        if has_live:
            response = (f"📡 Live Sensor Readings:\n\n"
                        f"🌡️ Temperature: {t}°C\n"
                        f"💧 Humidity: {h}%\n"
                        f"🌱 Soil Moisture: {s}%\n\n"
                        f"Last updated: {sensor_data['timestamp'][:19]}")
        else:
            response = "⚠️ Sensors offline. Connect your Arduino and restart Flask."

    # ── Nutrients ──
    elif "nitrogen" in user_msg or " n " in user_msg:
        response = "🌱 Low Nitrogen soil:\n\n👉 Best crops: Peas, Beans, Lentils\n👉 Add: Urea, Compost, Green manure\n👉 Tip: Legumes fix atmospheric nitrogen naturally!"

    elif "phosphorus" in user_msg:
        response = "🌱 Low Phosphorus soil:\n\n👉 Best crops: Legumes, Sunflower\n👉 Add: DAP (Di-ammonium phosphate), Bone meal\n👉 Tip: Phosphorus helps root development."

    elif "potassium" in user_msg:
        response = "🌱 Low Potassium soil:\n\n👉 Best crops: Potato, Tomato, Banana\n👉 Add: MOP (Muriate of Potash), Wood ash\n👉 Tip: Potassium improves fruit quality."

    # ── Soil types ──
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

    # ── Crop season ──
    elif "kharif" in user_msg:
        response = "🌧️ Kharif crops (sown in monsoon, June–July):\nRice, Maize, Cotton, Soybean, Groundnut, Jowar, Bajra"

    elif "rabi" in user_msg:
        response = "❄️ Rabi crops (sown in winter, Oct–Nov):\nWheat, Barley, Mustard, Gram, Peas, Lentil"

    elif "zaid" in user_msg:
        response = "☀️ Zaid crops (summer, March–June):\nWatermelon, Cucumber, Muskmelon, Bitter gourd"

    # ── Greetings ──
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


# ─── RUN ──────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
    # use_reloader=False prevents the serial thread from starting twice