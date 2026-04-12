require('dotenv').config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// POST /analyze - Analyze news text using OpenRouter
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
  "reason": "<clear 2-4 sentence explanation of your analysis>"
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
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("OpenRouter API error:", errData);
      return res.status(502).json({
        error: "Failed to reach AI service.",
      });
    }

    const data = await response.json();

    const rawText = data?.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed. Raw response:", rawText);
      return res.status(500).json({
        error: "AI returned invalid format.",
      });
    }

    return res.json(parsed);

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🛡️ Fake News Detector running at http://localhost:${PORT}`);
  console.log("🚀 OpenRouter API: Configured");
});