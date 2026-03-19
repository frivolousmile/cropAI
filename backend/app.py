from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import sqlite3
from datetime import datetime
import random  # 🔥 Added for fake data

app = Flask(__name__)
CORS(app)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get("message", "").lower()

    # 🌱 Smart farming responses
    if "nitrogen" in user_msg:
        response = "🌱 Your soil is low in Nitrogen.\n\n👉 Grow: Peas, Beans\n👉 Add: Urea, Compost, Green manure"

    elif "phosphorus" in user_msg:
        response = "🌱 Low Phosphorus detected.\n\n👉 Grow: Legumes\n👉 Add: DAP, Bone meal"

    elif "potassium" in user_msg:
        response = "🌱 Low Potassium soil.\n\n👉 Grow: Potato, Tomato\n👉 Add: Potash, Wood ash"

    elif "soil" in user_msg and "low" in user_msg:
        response = "⚠️ Please tell which nutrient is low:\nNitrogen / Phosphorus / Potassium"

    elif "hello" in user_msg:
        response = "👋 Hello farmer! Ask me about soil nutrients, crops, or fertilizers."

    else:
        response = "🌾 I can help with:\n• Crop recommendations\n• Soil nutrients\n• Fertilizers\n\nTry asking: 'Low nitrogen soil crops'"

    return jsonify({"reply": response})


if __name__ == "__main__":
    app.run(debug=True)