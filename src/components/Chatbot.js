// src/components/Chatbot.js
import React, { useState, useRef, useEffect } from "react";

const Chatbot = ({ mode, latestPrediction, history, location }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "🌾 Hi! I'm your AI assistant. How can I help you with crop advisory today?", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.log("SpeechRecognition not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-IN";

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error);
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (userMessage) => {
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes("yellow") || lowerMsg.includes("leaf")) {
      return "Yellow leaves usually indicate nitrogen deficiency. Mix about 20g urea in 1 liter of water and spray on leaves every 3 days.";
    }
    if (lowerMsg.includes("pest") || lowerMsg.includes("insect")) {
      return "For pests, use neem oil: 5ml neem oil mixed in 1 liter of water. Spray every 7 days in the morning.";
    }
    if (lowerMsg.includes("rice")) {
      return "Rice grows best in loamy soil with pH 6–7. Apply NPK roughly 120:60:60 kg per hectare.";
    }
    if (lowerMsg.includes("wheat")) {
      return "Wheat also prefers loamy soil with pH 6.5–7.5. Typical seed rate is about 100 kg per hectare.";
    }
    if (lowerMsg.includes("soil")) {
      return "Test your soil NPK if possible. Loamy soil is best for most crops. Use compost or manure to improve soil quality.";
    }
    if (mode === "sensor" && latestPrediction?.crop) {
      if (lowerMsg.includes("latest") || lowerMsg.includes("current")) {
        return `Latest sensor recommendation: ✅ ${latestPrediction.crop.toUpperCase()} (Confidence: ${latestPrediction.confidence}). Location: ${latestPrediction.gps || location}`;
      }
    }
    if (history.length > 0) {
      if (lowerMsg.includes("history") || lowerMsg.includes("recent")) {
        return `Recent predictions: ${history.slice(0, 3).map(h => `${h[9]} (${h[10]}%)`).join(", ")}`;
      }
    }
    if (lowerMsg.includes("mode")) {
      return mode === "sensor"
        ? "You're in 📡 Sensor Mode (auto‑refreshing every 30s)."
        : "You're in 🖼️ Manual Mode (upload image + soil).";
    }

    const responses = [
      "Try asking: 'What's the latest prediction?', 'Show history', 'Soil types?', 'pests', 'yellow leaves', or 'rice/wheat care'.",
      "In Sensor Mode, data auto‑refreshes. In Manual Mode, upload plant image + soil type!",
      "KARM uses ML models trained on over 2200 samples for 22 crop types with 99.55% accuracy. 🌾"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        text: getBotResponse(input),
        sender: "bot"
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 800);
  };

  const toggleMicrophone = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    if (!isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  };

  const CHAT_WINDOW_HEIGHT = 490;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        width: isOpen ? 380 : 60,
        height: isOpen ? CHAT_WINDOW_HEIGHT : 60,
        background: "white",
        borderRadius: isOpen ? 20 : "50%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        overflow: "hidden",
        zIndex: 9999,
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* HEADER / TOGGLE */}
      {!isOpen ? (
        // COLLAPSED: Round circular robot button
        <div
          onClick={() => setIsOpen(true)}
          style={{
            width: 60,
            height: 60,
            background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 28,
            boxShadow: "0 8px 25px rgba(76,175,80,0.4)",
            userSelect: "none"
          }}
        >
          🤖
        </div>
      ) : (
        // EXPANDED: Full header bar
        <div
          onClick={() => setIsOpen(false)}
          style={{
            height: 60,
            minHeight: 60,
            background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: "20px 20px 0 0",
            userSelect: "none"
          }}
        >
          <span>🌾 KARM Chat</span>
          <span style={{ fontSize: 22 }}>−</span>
        </div>
      )}

      {/* MESSAGES */}
      {isOpen && (
        <>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "15px 15px 10px 15px",
              background: "#f8f9fa",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius: 18,
                    background: msg.sender === "user"
                      ? "linear-gradient(135deg, #2196f3, #1976d2)"
                      : "white",
                    color: msg.sender === "user" ? "white" : "#333",
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    border: msg.sender === "bot" ? "1px solid #e0e0e0" : "none"
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT BAR */}
          <form
            onSubmit={handleSend}
            style={{
              minHeight: 70,
              padding: "10px 12px",
              background: "white",
              borderTop: "2px solid #e8f5e9",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "🎤 Listening..." : "Ask about crops, pests, soil..."}
              style={{
                flex: 1,
                padding: "11px 16px",
                border: isListening ? "2px solid #f44336" : "2px solid #c8e6c9",
                borderRadius: 25,
                fontSize: 13,
                outline: "none",
                background: isListening ? "#fff3f3" : "white",
                color: "#333",
                transition: "border 0.2s"
              }}
            />

            {/* MIC BUTTON */}
            <button
              type="button"
              onClick={toggleMicrophone}
              title={isListening ? "Stop listening" : "Click to speak"}
              style={{
                width: 42,
                height: 42,
                minWidth: 42,
                border: "none",
                background: isListening
                  ? "linear-gradient(135deg, #f44336, #d32f2f)"
                  : "linear-gradient(135deg, #66bb6a, #43a047)",
                color: "white",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isListening
                  ? "0 0 0 3px rgba(244,67,54,0.3)"
                  : "0 2px 8px rgba(76,175,80,0.3)",
                transition: "all 0.2s"
              }}
            >
              🎤
            </button>

            {/* SEND BUTTON */}
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                width: 42,
                height: 42,
                minWidth: 42,
                border: "none",
                background: input.trim()
                  ? "linear-gradient(135deg, #4caf50, #388e3c)"
                  : "#ccc",
                color: "white",
                borderRadius: "50%",
                cursor: input.trim() ? "pointer" : "not-allowed",
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: input.trim() ? "0 2px 8px rgba(76,175,80,0.3)" : "none",
                transition: "all 0.2s"
              }}
            >
              ➤
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default Chatbot;