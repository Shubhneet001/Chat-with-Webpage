const API_BASE = "http://127.0.0.1:8000";  // FastAPI backend URL

const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");
const queryInput = document.getElementById("query");
const sendBtn = document.getElementById("sendBtn");
const loadPageBtn = document.getElementById("loadPageBtn");

let currentTabUrl = "";

// Get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTabUrl = tabs[0].url;
  statusEl.textContent = "Page detected. Ready to load.";
});

// Load current webpage into backend
loadPageBtn.addEventListener("click", async () => {
  if (!currentTabUrl) return;
  statusEl.textContent = "Loading webpage... ⏳";

  try {
    const res = await fetch(`${API_BASE}/load_webpage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentTabUrl })
    });

    const data = await res.json();
    if (data.status === "success") {
      statusEl.textContent = "Webpage loaded ✅";
    } else {
      statusEl.textContent = "Error loading page ❌";
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to connect to backend ❌";
  }
});

// Send query to chatbot
sendBtn.addEventListener("click", async () => {
  const query = queryInput.value.trim();
  if (!query) return;

  appendMessage("You", query, "user");
  queryInput.value = "";
  statusEl.textContent = "Thinking... 🤔";

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    if (res.ok) {
      appendMessage("Bot", data.answer, "bot");
      statusEl.textContent = "Connected ✅";
    } else {
      appendMessage("Bot", data.detail || "Error from server", "bot");
      statusEl.textContent = "Error ❌";
    }
  } catch (err) {
    console.error(err);
    appendMessage("Bot", "Failed to reach backend.", "bot");
    statusEl.textContent = "Connection error ❌";
  }
});

// Helper to show messages
function appendMessage(sender, text, type) {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.textContent = `${sender}: ${text}`;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
