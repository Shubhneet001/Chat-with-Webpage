const API_BASE = "http://127.0.0.1:8000";

const statusEl = document.getElementById("status");
const statusIndicator = document.getElementById("statusIndicator");
const messagesEl = document.getElementById("messages");
const queryInput = document.getElementById("query");
const sendBtn = document.getElementById("sendBtn");
const loadPageBtn = document.getElementById("loadPageBtn");
const loadBtnText = document.getElementById("loadBtnText");
const resetBtn = document.getElementById("resetBtn");
const darkModeBtn = document.getElementById("darkModeBtn");
const typingIndicator = document.getElementById("typingIndicator");

let currentTabUrl = "";
let isPageLoaded = false;

// Load saved state from chrome.storage
chrome.storage.local.get(['chatMessages', 'pageLoaded', 'pageUrl', 'darkMode'], (result) => {
  // Restore dark mode
  if (result.darkMode) {
    document.body.classList.add('dark-mode');
    updateDarkModeIcon(true);
  }
  
  // Restore chat state
  if (result.chatMessages && result.pageLoaded && result.pageUrl) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTabUrl = tabs[0].url;
      
      // Only restore if it's the same page
      if (currentTabUrl === result.pageUrl) {
        isPageLoaded = true;
        loadPageBtn.classList.add("loaded");
        loadBtnText.textContent = "Page Loaded ✓";
        updateStatus("Connected - Ready to chat", "connected");
        queryInput.disabled = false;
        sendBtn.disabled = false;
        
        // Restore messages
        messagesEl.innerHTML = result.chatMessages;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      } else {
        updateStatus("Ready to load page", "default");
        queryInput.disabled = true;
      }
    });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        currentTabUrl = tabs[0].url;
        updateStatus("Ready to load page", "default");
        queryInput.disabled = true;
      }
    });
  }
});

// Save chat state
function saveChatState() {
  chrome.storage.local.set({
    chatMessages: messagesEl.innerHTML,
    pageLoaded: isPageLoaded,
    pageUrl: currentTabUrl
  });
}

// Update dark mode icon
function updateDarkModeIcon(isDark) {
  const sunIcon = darkModeBtn.querySelector('.sun-icon');
  const moonIcon = darkModeBtn.querySelector('.moon-icon');
  
  if (isDark) {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

// Dark mode toggle
darkModeBtn.addEventListener("click", () => {
  const isDark = document.body.classList.toggle('dark-mode');
  updateDarkModeIcon(isDark);
  chrome.storage.local.set({ darkMode: isDark });
});

// Update status display
function updateStatus(message, type = "default") {
  statusEl.textContent = message;
  statusIndicator.className = "status-indicator";
  
  if (type === "connected") {
    statusIndicator.classList.add("connected");
  } else if (type === "loading") {
    statusIndicator.classList.add("loading");
  } else if (type === "error") {
    statusIndicator.classList.add("error");
  }
}

// Clear welcome message
function clearWelcomeMessage() {
  const welcomeMsg = messagesEl.querySelector(".welcome-message");
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
}

// Append message to chat
function appendMessage(text, type) {
  clearWelcomeMessage();
  
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  
  // Handle HTML content from bot
  if (type === "bot") {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }
  
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  
  // Save state after adding message
  saveChatState();
}

// Show/hide typing indicator
function setTypingIndicator(show) {
  typingIndicator.style.display = show ? "flex" : "none";
  if (show) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

// Get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentTabUrl = tabs[0].url;
    updateStatus("Page detected. Ready to load.", "default");
    queryInput.disabled = true;
  }
});

// Load current webpage
loadPageBtn.addEventListener("click", async () => {
  if (!currentTabUrl) {
    updateStatus("No active tab detected", "error");
    return;
  }
  
  // Update button state
  loadPageBtn.classList.add("loading");
  loadBtnText.textContent = "Loading Page...";
  updateStatus("Loading webpage...", "loading");
  queryInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/load_webpage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentTabUrl })
    });

    const data = await res.json();
    
    if (data.status === "success") {
      isPageLoaded = true;
      loadPageBtn.classList.remove("loading");
      loadPageBtn.classList.add("loaded");
      loadBtnText.textContent = "Page Loaded ✓";
      updateStatus("Connected - Ready to chat", "connected");
      queryInput.disabled = false;
      sendBtn.disabled = false;
      queryInput.focus();
      
      clearWelcomeMessage();
      appendMessage("Page loaded successfully! You can now ask questions about this webpage.", "success");
      
      // Save state after loading page
      saveChatState();
    } else {
      throw new Error(data.message || "Failed to load page");
    }
  } catch (err) {
    console.error(err);
    loadPageBtn.classList.remove("loading");
    loadBtnText.textContent = "Load Current Page";
    updateStatus("Connection failed", "error");
    appendMessage("Failed to connect to backend. Make sure the FastAPI server is running on port 8000.", "error");
  }
});

// Send query
async function sendQuery() {
  const query = queryInput.value.trim();
  if (!query || !isPageLoaded) return;

  appendMessage(query, "user");
  queryInput.value = "";
  queryInput.disabled = true;
  sendBtn.disabled = true;
  updateStatus("Thinking...", "loading");
  setTypingIndicator(true);

  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    setTypingIndicator(false);
    
    if (res.ok) {
      appendMessage(data.answer, "bot");
      updateStatus("Connected - Ready to chat", "connected");
    } else {
      throw new Error(data.detail || "Error from server");
    }
  } catch (err) {
    console.error(err);
    setTypingIndicator(false);
    appendMessage("Failed to get response. Please try again.", "error");
    updateStatus("Error occurred", "error");
  } finally {
    queryInput.disabled = false;
    sendBtn.disabled = false;
    queryInput.focus();
  }
}

sendBtn.addEventListener("click", sendQuery);

// Send on Enter key
queryInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !queryInput.disabled) {
    sendQuery();
  }
});

// Enable/disable send button based on input
queryInput.addEventListener("input", () => {
  sendBtn.disabled = !queryInput.value.trim() || !isPageLoaded;
});

// Reset conversation
resetBtn.addEventListener("click", async () => {
  if (!confirm("Reset conversation history? This will clear all messages.")) {
    return;
  }
  
  updateStatus("Resetting...", "loading");
  
  try {
    const res = await fetch(`${API_BASE}/reset_history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    const data = await res.json();
    
    if (data.status === "success") {
      messagesEl.innerHTML = "";
      appendMessage("Conversation history cleared successfully!", "success");
      updateStatus("Connected - Ready to chat", "connected");
      
      // Clear saved state
      chrome.storage.local.remove(['chatMessages']);
    } else {
      throw new Error(data.message || "Failed to reset");
    }
  } catch (err) {
    console.error(err);
    appendMessage("Failed to reset conversation.", "error");
    updateStatus("Error occurred", "error");
  }
});