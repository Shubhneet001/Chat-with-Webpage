// Configuration
const API_BASE_URL = 'http://localhost:8000';

// State management with URL tracking
let state = {
  messages: {},  // Store messages per URL
  currentUrl: '',
  isLoaded: false,
  isProcessing: false,
  currentScreen: 'welcome' // welcome, loading, chat
};

// DOM elements
const welcomeScreen = document.getElementById('welcomeScreen');
const loadingScreen = document.getElementById('loadingScreen');
const chatInterface = document.getElementById('chatInterface');
const startBtn = document.getElementById('startBtn');
const reloadBtn = document.getElementById('reloadBtn');
const resetBtn = document.getElementById('resetBtn');
const themeToggle = document.getElementById('themeToggle');
const loadingText = document.getElementById('loadingText');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const currentPageTitle = document.getElementById('currentPageTitle');

// Load state from storage
async function loadState() {
  const stored = await chrome.storage.local.get(['chatState', 'theme']);
  if (stored.chatState) {
    state = { ...state, ...stored.chatState };
    
    // Check if we have messages for the current URL
    const currentUrl = await getCurrentTabUrl();
    if (state.messages[currentUrl] && state.messages[currentUrl].length > 0) {
      state.currentUrl = currentUrl;
      state.isLoaded = true;
      showScreen('chat');
      renderMessages();
      updatePageTitle();
    }
  }
  
  // Load theme preference
  if (stored.theme) {
    document.body.className = stored.theme;
  }
}

// Save theme preference
async function saveTheme(theme) {
  await chrome.storage.local.set({ theme });
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.body.classList.contains('dark-mode') ? 'dark-mode' : '';
  const newTheme = currentTheme === 'dark-mode' ? '' : 'dark-mode';
  
  document.body.className = newTheme;
  saveTheme(newTheme);
}

// Save state to storage
async function saveState() {
  await chrome.storage.local.set({ chatState: state });
}

// Show specific screen
function showScreen(screen) {
  welcomeScreen.style.display = 'none';
  loadingScreen.style.display = 'none';
  chatInterface.style.display = 'none';

  if (screen === 'welcome') {
    welcomeScreen.style.display = 'flex';
  } else if (screen === 'loading') {
    loadingScreen.style.display = 'flex';
  } else if (screen === 'chat') {
    chatInterface.style.display = 'flex';
  }
  
  state.currentScreen = screen;
}

// Get current tab URL
async function getCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || '';
}

// Validate if URL is loadable
function isValidUrl(url) {
  if (!url) return false;
  
  // Block chrome:// and other internal URLs
  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'file://',
    'view-source:',
    'data:',
    'javascript:'
  ];
  
  for (const prefix of invalidPrefixes) {
    if (url.startsWith(prefix)) {
      return false;
    }
  }
  
  // Must be http or https
  return url.startsWith('http://') || url.startsWith('https://');
}

// Update page title in header
async function updatePageTitle() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.title) {
    currentPageTitle.textContent = tab.title.length > 30 
      ? tab.title.substring(0, 30) + '...' 
      : tab.title;
  }
}

// Add message to state
function addMessage(content, isUser, url = state.currentUrl) {
  if (!state.messages[url]) {
    state.messages[url] = [];
  }
  state.messages[url].push({ 
    content, 
    isUser, 
    timestamp: Date.now() 
  });
  renderMessages();
  saveState();
}

// Render messages for current URL
function renderMessages() {
  const messages = state.messages[state.currentUrl] || [];
  
  if (messages.length === 0) {
    chatMessages.innerHTML = `
      <div class="empty-chat">
        <div class="empty-icon">💭</div>
        <p>Start a conversation about this page</p>
      </div>
    `;
    return;
  }

  chatMessages.innerHTML = '';
  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.isUser ? 'message-user' : 'message-bot'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (msg.isUser) {
      contentDiv.textContent = msg.content;
    } else {
      contentDiv.innerHTML = msg.content;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message message-bot';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="message-content typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingDiv = document.getElementById('typingIndicator');
  if (typingDiv) typingDiv.remove();
}

// Load webpage
async function loadWebpage() {
  const url = await getCurrentTabUrl();
  
  if (!url) {
    alert('❌ Could not get current tab URL');
    return;
  }
  
  if (!isValidUrl(url)) {
    alert('❌ Cannot load this page type.\n\nOnly HTTP/HTTPS webpages are supported.\n\nChrome internal pages (chrome://, chrome-extension://) and local files cannot be analyzed.');
    return;
  }
  
  if (state.isProcessing) return;

  state.isProcessing = true;
  state.currentUrl = url;
  showScreen('loading');

  const loadingMessages = [
    'Fetching webpage content...',
    'Analyzing structure...',
    'Processing information...',
    'Building knowledge base...',
    'Almost ready...'
  ];

  let messageIndex = 0;
  const messageInterval = setInterval(() => {
    if (messageIndex < loadingMessages.length) {
      loadingText.textContent = loadingMessages[messageIndex];
      messageIndex++;
    }
  }, 800);

  try {
    const response = await fetch(`${API_BASE_URL}/load_webpage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    clearInterval(messageInterval);

    if (response.ok && data.status === 'success') {
      state.isLoaded = true;
      
      // Initialize messages array for this URL if it doesn't exist
      if (!state.messages[url]) {
        state.messages[url] = [];
      }
      
      await updatePageTitle();
      showScreen('chat');
      renderMessages();
      messageInput.focus();
    } else {
      throw new Error(data.message || 'Failed to load webpage');
    }
  } catch (error) {
    clearInterval(messageInterval);
    loadingText.textContent = `Error: ${error.message}`;
    setTimeout(() => showScreen('welcome'), 3000);
  } finally {
    state.isProcessing = false;
    saveState();
  }
}

// Send message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || state.isProcessing || !state.isLoaded) return;

  state.isProcessing = true;
  sendBtn.disabled = true;
  messageInput.disabled = true;

  addMessage(message, true);
  messageInput.value = '';
  messageInput.style.height = 'auto';

  showTypingIndicator();

  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (response.ok && data.answer) {
      addMessage(data.answer, false);
    } else {
      throw new Error(data.error || 'Failed to get response');
    }
  } catch (error) {
    removeTypingIndicator();
    addMessage(`<p style="color: #dc2626;">❌ Error: ${error.message}</p>`, false);
  } finally {
    state.isProcessing = false;
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

// Reset chat history
async function resetChat() {
  if (!confirm('Reset conversation history? This will clear all messages for the current page.')) return;

  state.isProcessing = true;
  resetBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/reset_history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      // Clear messages for current URL
      state.messages[state.currentUrl] = [];
      renderMessages();
      saveState();
    } else {
      throw new Error(data.message || 'Failed to reset history');
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    state.isProcessing = false;
    resetBtn.disabled = false;
  }
}

// Reload current page
async function reloadCurrentPage() {
  const currentUrl = await getCurrentTabUrl();
  
  if (!isValidUrl(currentUrl)) {
    alert('❌ Cannot load this page type.\n\nOnly HTTP/HTTPS webpages are supported.');
    return;
  }
  
  // Check if we've switched tabs
  if (currentUrl !== state.currentUrl) {
    // Check if we have history for this URL
    if (state.messages[currentUrl] && state.messages[currentUrl].length > 0) {
      // Just switch to the existing conversation
      state.currentUrl = currentUrl;
      state.isLoaded = true;
      renderMessages();
      await updatePageTitle();
      return;
    }
  }
  
  // Load the current page
  loadWebpage();
}

// Event Listeners
startBtn.addEventListener('click', loadWebpage);
reloadBtn.addEventListener('click', reloadCurrentPage);
resetBtn.addEventListener('click', resetChat);
themeToggle.addEventListener('click', toggleTheme);
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (state.currentScreen === 'chat') {
    const newUrl = await getCurrentTabUrl();
    
    // If we have messages for this URL, show them
    if (state.messages[newUrl] && state.messages[newUrl].length > 0) {
      state.currentUrl = newUrl;
      state.isLoaded = true;
      renderMessages();
      await updatePageTitle();
    } else {
      // Different page without history - stay in chat but suggest reload
      await updatePageTitle();
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && state.currentScreen === 'chat') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab.id === tabId) {
      const newUrl = await getCurrentTabUrl();
      
      // If URL changed and we have messages, show them
      if (state.messages[newUrl] && state.messages[newUrl].length > 0) {
        state.currentUrl = newUrl;
        state.isLoaded = true;
        renderMessages();
        await updatePageTitle();
      } else if (newUrl !== state.currentUrl) {
        // Page changed - update title
        await updatePageTitle();
      }
    }
  }
});

// Initialize
async function init() {
  await loadState();
  
  // Check if current page is valid
  if (state.currentScreen === 'welcome') {
    const url = await getCurrentTabUrl();
    if (!isValidUrl(url)) {
      startBtn.disabled = true;
      startBtn.style.opacity = '0.5';
      startBtn.style.cursor = 'not-allowed';
      startBtn.innerHTML = `
        <span class="button-content">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Page Type Not Supported
        </span>
      `;
      
      // Add info message
      const infoDiv = document.createElement('div');
      infoDiv.style.cssText = 'margin-top: 20px; padding: 12px 20px; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 13px; color: white; max-width: 320px;';
      infoDiv.innerHTML = '⚠️ This extension only works with HTTP/HTTPS webpages. Navigate to a regular website to continue.';
      document.querySelector('.welcome-content').appendChild(infoDiv);
    }
  }
}

init();