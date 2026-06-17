require('dotenv').config();

const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");
const Parser = require("rss-parser");

const parser = new Parser();

async function fetchRSSNews(query) {
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
async function fetchRelatedNews(query) {

	try {

		const response = await fetch(
			`https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodeURIComponent(query)}`
		);

		const data = await response.json();

		// API limit khatam ho gayi ya koi error aaya
		if (data.status === "error") {

			console.log("NewsData API failed. Switching to RSS...");
			return await fetchRSSNews(query);
		}

		// Results mil gaye
		if (data.results && data.results.length > 0) {

			console.log("Using NewsData API");
			console.log(data.results[0]?.title);

			return data.results.slice(0, 5).map(item => ({
				title: item.title
			}));
		}

		// Results empty hain
		console.log("No NewsData results. Switching to RSS...");

		return await fetchRSSNews(query);

	} catch (err) {

		console.log("NewsData error. Switching to RSS...");

		return await fetchRSSNews(query);
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
Current year is 2026.
Today's date is June 2026.
You are an expert fact checker.

Claim:
${text}

Recent related headlines:
${headlines}

Instructions:
- Use headlines as primary evidence when available.
- If no headlines are available, use your own general knowledge.
- Do not invent recent events.
- If uncertain, classify as Misleading.
- The three probabilities must add up to exactly 100.
- Compare the claim with the headlines.
- If most headlines support the claim, classify as Real.
- Headlines do not need to match the claim word-for-word.
- If a headline conveys approximately the same meaning (around 80-90% semantic similarity), treat it as supporting evidence.
- Focus on entities, dates, events, and outcomes rather than exact wording.
- Ignore minor wording differences.
- If headlines partially support and partially contradict the claim, classify as Misleading.
- Unrelated headlines should be ignored completely.
- If no useful headlines are found, use your own general knowledge and reasoning.
- If evidence is mixed or insufficient, classify as Misleading.
- If the headlines mention that the event has not happened yet, classify as Fake.
- If headlines only discuss future matches, do not assume the claim is true.
- If no headline explicitly confirms the claim, classify as Fake.
- Ignore unrelated headlines.
- Headlines are only supporting evidence.
- If headlines are unrelated to the claim, ignore them completely.
- Use your own world knowledge for well-known historical events.
- Use your own knowledge only when the claim concerns scientific facts, geography, or universally established information.
- For sports results, elections, awards, and recent historical events, rely primarily on external evidence but in case of lack of evidence use your own knowledge.
- Do not treat absence of headlines as proof that a claim is false.
- Pay close attention to dates and timelines.
- If the claim refers to a past event, do not interpret it as a future event.
- If headlines mention upcoming matches while the claim states that the event already happened, treat this as contradictory evidence.
- Distinguish between "will happen", "is scheduled", and "has already happened".
- Never convert completed events into future events.
- Consider the year mentioned in the claim when evaluating evidence.
- If the claim contains a year earlier than the current year, assume the event is historical unless evidence indicates otherwise.
- Do not infer facts from partial matches.
- Extraordinary claims without direct evidence must be classified as Fake.
- Return ONLY JSON.
- Never add explanations outside JSON.
- Never change your answer after producing JSON.
- Never invent facts.

Return ONLY valid JSON:

{
	"verdict": "Real" | "Fake" | "Misleading",
	"real_probability": 0-100,
	"fake_probability": 0-100,
	"misleading_probability": 0-100
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
					model: "openai/gpt-oss-120b:free",
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
			const match = rawText.match(/\{[\s\S]*\}/);

if (!match) {
	throw new Error("No JSON found");
}

parsed = JSON.parse(match[0]);

let total =
	Number(parsed.real_probability) +
	Number(parsed.fake_probability) +
	Number(parsed.misleading_probability);

// Agar model ne 0.5, 0.3, 0.2 diya ho
if (total > 0) {

	parsed.real_probability = Math.round(
		(Number(parsed.real_probability) / total) * 100
	);

	parsed.fake_probability = Math.round(
		(Number(parsed.fake_probability) / total) * 100
	);

	parsed.misleading_probability =
		100 -
		parsed.real_probability -
		parsed.fake_probability;
}

// Agar model ne teeno 0 diye ho
if (
	parsed.real_probability === 0 &&
	parsed.fake_probability === 0 &&
	parsed.misleading_probability === 0
) {

	switch (parsed.verdict) {

		case "Real":
			parsed.real_probability = 100;
			parsed.fake_probability = 0;
			parsed.misleading_probability = 0;
			break;

		case "Fake":
			parsed.real_probability = 0;
			parsed.fake_probability = 100;
			parsed.misleading_probability = 0;
			break;

		default:
			parsed.real_probability = 0;
			parsed.fake_probability = 0;
			parsed.misleading_probability = 100;
	}
}

// Confidence score
parsed.confidence = Math.max(
	parsed.real_probability,
	parsed.fake_probability,
	parsed.misleading_probability
);

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
