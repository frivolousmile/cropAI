import React from "react";
import "../App.css";

function Contact() {
  return (
    <div className="page-container">
      <h1 className="page-title">Contact Us</h1>

      <div className="contact-card">

        <div className="contact-info">
          <p><strong>Email:</strong> support@karm.ai</p>
          <p><strong>Phone:</strong> +91 98765 43210</p>
          <p><strong>Location:</strong> India</p>
        </div>

        <div className="contact-form">
          <input type="text" placeholder="Your Name" />
          <input type="email" placeholder="Your Email" />
          <textarea placeholder="Your Message"></textarea>
          <button className="btn-primary">Send Message</button>
        </div>

      </div>
    </div>
  );
}

export default Contact;