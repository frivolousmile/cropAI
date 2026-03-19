import React, { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";

import Landing from "./pages/landing";
import Home from "./pages/home";
import Features from "./pages/features";
import About from "./pages/about";
import Contact from "./pages/contact";
import Dashboard from './pages/Dashboard';  // ✅ Import fixed

function App() {
  const [lang, setLang] = useState("en");

  return (
    <div>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">KARM</div>
        <div className="nav-center">
          <Link to="/">Overview</Link>
          <Link to="/home">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/dashboard">Dashboard</Link>  {/* 🔥 NEW NAV LINK */}
        </div>
        <button
          className="lang-btn"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
        >
          {lang === "en" ? "हिंदी" : "English"}
        </button>
      </nav>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home lang={lang} />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<Dashboard />} />  {/* 🔥 ADDED HERE */}
      </Routes>

      {/* FOOTER */}
      <footer className="footer">
        <h2>KARM</h2>
        <p>AI-powered crop advisory system for smarter farming decisions.</p>
        <div className="footer-links">
          <Link to="/">Landing</Link>
          <Link to="/home">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/dashboard">Dashboard</Link>  {/* 🔥 NEW FOOTER LINK */}
        </div>
        <p>© 2026 KARM</p>
      </footer>
    </div>
  );
}

export default App;
