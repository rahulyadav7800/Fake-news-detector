require('dotenv').config();

const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");
const Parser = require("rss-parser");

const parser = new Parser();

async function fetchRelatedNews(query) {
	try {
		const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

		const feed = await parser.parseURL(url);

		return feed.items.slice(0, 10).map(item => ({
			title: item.title
		}));
	} catch (err) {
		console.error("RSS Error:", err);
		return [];
	}
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 500
});

app.use(limiter);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/analyze", async (req, res) => {

	const { text } = req.body;

	if (!text || text.trim().length === 0) {
		return res.status(400).json({
			error: "No text provided for analysis."
		});
	}

	if (text.trim().length < 20) {
		return res.status(400).json({
			error: "Text is too short. Please provide more content."
		});
	}

	let headlines = "No related headlines found.";

try {
	const relatedNews = await fetchRelatedNews(text);

	headlines = relatedNews.length > 0
		? relatedNews.map((item, index) =>
			`${index + 1}. ${item.title}`
		).join("\n")
		: "No related headlines found.";

} catch (err) {
	console.log("Skipping RSS...");
}

	const prompt = `
You are an expert fact checker.

Claim:
${text}

Recent related headlines:
${headlines}

Instructions:
- Compare the claim with the headlines.
- If most headlines support the claim, classify as Real.
- If most headlines contradict the claim, classify as Fake.
- If evidence is mixed or insufficient, classify as Misleading.
- If the headlines mention that the event has not happened yet, classify as Fake.
- If headlines only discuss future matches, do not assume the claim is true.
- If no headline explicitly confirms the claim, classify as Fake.
- Never invent facts.

Return ONLY valid JSON:

{
	"verdict": "Real" | "Fake" | "Misleading",
	"real_probability": 0,
	"fake_probability": 0,
	"misleading_probability": 0,
	"reason": ""
}
`;

	try {

		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: "Bearer " + process.env.OPENROUTER_API_KEY,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					model: "liquid/lfm-2.5-1.2b-thinking:free",
					messages: [
						{
							role: "user",
							content: prompt
						}
					]
				})
			}
		);

		if (!response.ok) {
			const errorText = await response.text();

			console.error("OpenRouter Status:", response.status);
			console.error("OpenRouter Error:", errorText);

			return res.status(response.status).json({
				error: errorText
			});
		}

		const data = await response.json();

		const rawText =
			data?.choices?.[0]?.message?.content || "";

		let parsed;

		try {
			const cleaned = rawText
				.replace(/```json|```/gi, "")
				.trim();

			parsed = JSON.parse(cleaned);
			console.log(parsed);
		} catch {
			console.error("Final parse failed:", rawText);

			return res.status(500).json({
				error: "AI response parsing failed."
			});
		}

		return res.json(parsed);

	} catch (err) {

		console.error("Server error:", err);

		return res.status(500).json({
			error: "Internal server error."
		});
	}
});

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
	console.log(`🛡️ Server running on port ${PORT}`);
	console.log("🚀 OpenRouter API ready");
});
