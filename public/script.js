// script.js - TruthLens Frontend Logic

// ── DOM References ──
const newsInput    = document.getElementById("newsInput");
const analyzeBtn   = document.getElementById("analyzeBtn");
const charCount    = document.getElementById("charCount");
const clearBtn     = document.getElementById("clearBtn");
const errorBox     = document.getElementById("errorBox");
const results      = document.getElementById("results");

// Result elements
const verdictBadge   = document.getElementById("verdictBadge");
const realVal        = document.getElementById("realVal");
const fakeVal        = document.getElementById("fakeVal");
const misleadVal     = document.getElementById("misleadVal");
const realBar        = document.getElementById("realBar");
const fakeBar        = document.getElementById("fakeBar");
const misleadBar     = document.getElementById("misleadBar");
const reasonText     = document.getElementById("reasonText");
const confidenceMeter = document.getElementById("confidenceMeter");

// ── Character Counter ──
newsInput.addEventListener("input", () => {
  const len = newsInput.value.length;
  charCount.textContent = `${len.toLocaleString()} character${len !== 1 ? "s" : ""}`;
  // Clear error when user types
  hideError();
});

// ── Clear Button ──
clearBtn.addEventListener("click", () => {
  newsInput.value = "";
  charCount.textContent = "0 characters";
  hideError();
  hideResults();
  newsInput.focus();
});

// ── Analyze Button Click ──
analyzeBtn.addEventListener("click", analyzeNews);

// Also allow Ctrl+Enter to analyze
newsInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    analyzeNews();
  }
});

// ── Main Analyze Function ──
async function analyzeNews() {
  const text = newsInput.value.trim();

  // Validate input
  if (!text) {
    showError("⚠️ Please paste some news text before analyzing.");
    newsInput.focus();
    return;
  }

  if (text.length < 20) {
    showError("⚠️ The text is too short. Please provide at least a sentence or two.");
    return;
  }

  // Set loading state
  setLoading(true);
  hideError();
  hideResults();

  try {
    // Call backend API
    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Server returned an error
      showError(`❌ ${data.error || "Something went wrong. Please try again."}`);
      return;
    }

    // Render results
    renderResults(data);

  } catch (err) {
    console.error("Fetch error:", err);
    showError("❌ Could not reach the server. Make sure the backend is running.");
  } finally {
    setLoading(false);
  }
}

// ── Render Results ──
function renderResults(data) {
  const { verdict, real_probability, fake_probability, misleading_probability, reason } = data;

  const realP    = Number(real_probability)    || 0;
  const fakeP    = Number(fake_probability)    || 0;
  const misleadP = Number(misleading_probability) || 0;

  // ─ Verdict Badge ─
  const verdictNorm = (verdict || "").toLowerCase().trim();
  verdictBadge.textContent = verdict || "Unknown";
  verdictBadge.className = "verdict-badge";
  if (verdictNorm === "real") verdictBadge.classList.add("verdict-real");
  else if (verdictNorm === "fake") verdictBadge.classList.add("verdict-fake");
  else verdictBadge.classList.add("verdict-misleading");

  // ─ Probability Values ─
  realVal.textContent    = `${realP}%`;
  fakeVal.textContent    = `${fakeP}%`;
  misleadVal.textContent = `${misleadP}%`;

  // ─ Animate Progress Bars (brief delay for visual effect) ─
  // Set to 0 first, then animate
  realBar.style.width    = "0%";
  fakeBar.style.width    = "0%";
  misleadBar.style.width = "0%";

  requestAnimationFrame(() => {
    setTimeout(() => {
      realBar.style.width    = `${realP}%`;
      fakeBar.style.width    = `${fakeP}%`;
      misleadBar.style.width = `${misleadP}%`;
    }, 50);
  });

  // ─ Reason ─
  reasonText.textContent = reason || "No reasoning provided.";

  // ─ Confidence Meter (pips) ─
  renderConfidencePips(realP, fakeP, misleadP);

  // ─ Show results section ─
  results.classList.add("visible");

  // Smooth scroll to results
  setTimeout(() => {
    results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 100);
}

// ── Confidence Pips ──
// Shows how decisive/confident the AI result is (max probability = confidence)
function renderConfidencePips(real, fake, mislead) {
  const maxProb = Math.max(real, fake, mislead);
  const pipCount = 8;
  const activePips = Math.round((maxProb / 100) * pipCount);

  // Clear existing pips
  confidenceMeter.innerHTML = "";

  for (let i = 0; i < pipCount; i++) {
    const pip = document.createElement("div");
    pip.className = "confidence-pip" + (i < activePips ? " active" : "");
    confidenceMeter.appendChild(pip);
  }

  // Add percentage text
  const val = document.createElement("span");
  val.className = "confidence-value";
  val.style.marginLeft = "8px";
  val.textContent = `${maxProb}%`;
  confidenceMeter.appendChild(val);
}

// ── UI Helpers ──

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.classList.toggle("loading", isLoading);
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add("visible");
}

function hideError() {
  errorBox.classList.remove("visible");
  errorBox.textContent = "";
}

function hideResults() {
  results.classList.remove("visible");
}
