<<<<<<< HEAD
# 🛡️ TruthLens — AI Fake News Detector

An AI-powered fake news detection web app using **Google Gemini API**, **Node.js + Express**, and a clean dark UI.

---

## 📁 Project Structure

```
fake-news-detector/
├── server.js          ← Express backend + Gemini API calls
├── package.json
├── .env.example       ← Copy to .env and add your API key
└── public/
    ├── index.html     ← Main UI
    ├── style.css      ← Dark editorial styles
    └── script.js      ← Frontend logic
```

---

## 🚀 Setup & Run

### 1. Install dependencies
=======
# 🛡️ Fake News Detector (AI Powered)

An AI-powered web application that analyzes news content and classifies it as **Real, Fake, or Misleading** using advanced language models.

---

## 🌐 Live Demo

👉 https://your-app-name.onrender.com

---

## 🚀 Features

* 🔍 Analyze any news text instantly
* 📊 Probability breakdown (Real / Fake / Misleading)
* 🧠 AI-generated reasoning
* ⚡ Fast and user-friendly interface
* 🌍 Accessible online (no setup required)

---

## 🧰 Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express
* **AI Integration:** OpenRouter API (LLMs)

---

## 📌 How It Works

1. User enters news content
2. Backend sends request to AI model
3. AI analyzes and returns structured response
4. Results are displayed with:

   * Verdict
   * Probability scores
   * Explanation

---

## ⚙️ Local Setup (for developers)

1. Clone the repository:

```bash
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

2. Install dependencies:

>>>>>>> fc83e67850e2fdca646cbaf19df07ce39b65fd41
```bash
npm install
```

<<<<<<< HEAD
### 2. Add your Gemini API key
Get a free key at https://aistudio.google.com/app/apikey

**Option A — .env file (recommended):**
```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```
Then install dotenv: `npm install dotenv`
And add `require('dotenv').config()` at the top of `server.js`.

**Option B — Inline in server.js:**
Open `server.js` and replace `YOUR_GEMINI_API_KEY_HERE` with your actual key.

**Option C — Environment variable:**
```bash
GEMINI_API_KEY=your_key_here node server.js
```

### 3. Start the server
```bash
npm start
# or for auto-reload during development:
npm run dev
```

### 4. Open in browser
Visit: **http://localhost:3000**

---

## 🎯 How It Works

1. User pastes news text into the textarea
2. Frontend sends POST `/analyze` to Express backend
3. Backend crafts a strict JSON-output prompt and calls Gemini API
4. Gemini returns verdict + probabilities + reasoning
5. Frontend renders animated results with progress bars

---

## ⚙️ API Response Format

```json
{
  "verdict": "Fake",
  "real_probability": 10,
  "fake_probability": 80,
  "misleading_probability": 10,
  "reason": "The article contains several unverified claims..."
}
=======
3. Create `.env` file:

```env
OPENROUTER_API_KEY=your_api_key_here
```

4. Run the app:

```bash
npm start
```

5. Open:

```
http://localhost:3000
>>>>>>> fc83e67850e2fdca646cbaf19df07ce39b65fd41
```

---

<<<<<<< HEAD
## 🔑 Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express server, `/analyze` endpoint, Gemini API call |
| `public/index.html` | UI structure |
| `public/style.css` | Dark theme, animations, responsive design |
| `public/script.js` | Input handling, fetch call, result rendering |

---

## ⚠️ Notes

- Requires Node.js 18+ (uses native `fetch`)
- Only dependency is `express`
- Always cross-verify results with trusted sources
=======
## ⚠️ Disclaimer

This tool uses AI for analysis and may not always be 100% accurate. Always verify important information from trusted sources.

---

## 📄 License

MIT License

---

## 👨‍💻 Author

**Rahul Yadav**

---

⭐ If you found this useful, give it a star!
>>>>>>> fc83e67850e2fdca646cbaf19df07ce39b65fd41
