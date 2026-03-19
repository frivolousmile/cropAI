import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 Put your OpenAI API Key here
const OPENAI_API_KEY = "YOUR_API_KEY_HERE";

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an agriculture expert helping farmers with soil nutrients, fertilizers, and crop recommendations."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      reply: data.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Error connecting to AI" });
  }
});

app.listen(5000, () => console.log("✅ AI Server running on port 5000"));