require('dotenv').config();

const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");

// 👇 fetch fix (important)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// trust proxy (Render ke liye useful)
app.set('trust proxy', 1);

// 🔥 Rate limiter apply
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// POST /analyze
app.post("/analyze", async (req, res) => {

  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "No text provided for analysis." });
  }

  if (text.trim().length < 20) {
    return res.status(400).json({ error: "Text is too short. Please provide more content." });
  }

  const prompt = `You are an expert fact-checker and misinformation analyst. Analyze the following news text and determine if it is Real, Fake, or Misleading.

NEWS TEXT:
"""
${text.trim()}
"""

Respond ONLY with a valid JSON object. No markdown, no explanation outside the JSON. Use this exact structure:
{
  "verdict": "Real" | "Fake" | "Misleading",
  "real_probability": <number 0-100>,
  "fake_probability": <number 0-100>,
  "misleading_probability": <number 0-100>,
  "reason": "<clear 2-4 sentence explanation>"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    // API error handle
    if (!response.ok) {
      const textData = await response.text();
      console.error("API Error:", textData);
      return res.status(502).json({
        error: "Failed to reach AI service."
      });
    }

    const textData = await response.text();

    let data;
    try {
      data = JSON.parse(textData);
    } catch {
      console.error("Invalid JSON from API:", textData);
      return res.status(500).json({
        error: "AI returned invalid format."
      });
    }

    const rawText = data?.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Final parse failed:", rawText);
      return res.status(500).json({
        error: "AI response parsing failed."
      });
    }

    return res.json(parsed);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Frontend serve
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🛡️ Server running on port ${PORT}`);
  console.log("🚀 OpenRouter API ready");
});