# 🧠 Web Chatbot

An AI-powered Chrome extension that helps you **analyze and chat with any webpage** in real time.  
This project integrates a **FastAPI backend** (for webpage processing and AI responses) with a **Chrome side-panel extension** that provides a modern chat interface.

---

## 🚀 Features

- 🔗 **Load any webpage:** Scrape and process webpage content automatically.  
- 💬 **Ask questions:** Get concise, HTML-formatted answers from the AI using context from the page.  
- 🧠 **Persistent memory:** Maintains conversation history across queries for contextual answers.  
- 🧹 **Reset memory:** Start fresh with one click.  
- 🧩 **Chrome side panel:** Easy-to-use UI that works directly within the browser.

---

## 🧰 Project Structure

```

├── .gitignore
├── README.md
├── chrome-extension
│   ├── background.js
│   ├── content.js
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── index.html
│   ├── manifest.json
│   └── styles.css
├── experiments.ipynb
├── main.py
├── requirements.txt
└── utils.py

````

---

## ⚙️ Backend Setup (FastAPI)

### 1️⃣ Prerequisites
- Python 3.10+
- [Hugging Face Access Token](https://huggingface.co/settings/tokens)
- Internet connection (for Hugging Face model endpoints)

### 2️⃣ Installation

```bash
# Clone the repository
git clone https://github.com/Shubhneet001/Chat-with-Webpage.git
cd Chat-with-Webpage

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
````

### 3️⃣ Setup Environment

Create a `.env` file in the project root:

```
HF_TOKEN="hf_access_token"
```

### 4️⃣ Run the FastAPI server

```bash
uvicorn main:app --reload
```

By default, the API will run at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🧩 API Endpoints

| Endpoint         | Method | Description                                                              |
| ---------------- | ------ | ------------------------------------------------------------------------ |
| `/load_webpage`  | POST   | Loads and indexes a webpage. Requires `url` in JSON body.                |
| `/ask`           | POST   | Asks a question about the loaded webpage. Requires `query` in JSON body. |
| `/reset_history` | POST   | Clears the chatbot's memory.                                             |

### Example Request

```bash
curl -X POST "http://127.0.0.1:8000/load_webpage" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
```

---

## 🧱 Chrome Extension Setup

### 1️⃣ Open Chrome Extensions

* Go to `chrome://extensions/`
* Enable **Developer mode** (top right)
* Click **Load unpacked**
* Select the `chrome-extension` folder from this project

### 2️⃣ Run the Extension

* Click the **puzzle icon** → **Web Chatbot Assistant**
* The chatbot will appear in the **side panel**

### 3️⃣ Configuration

* Make sure your **FastAPI server is running**
* The extension’s JavaScript files should call the backend at `http://127.0.0.1:8000`

---

## 🧠 How It Works

1. **Webpage Loading:**
   The backend fetches the webpage using `WebBaseLoader`, cleans HTML using `BeautifulSoup`, and splits it into chunks.

2. **Vectorization:**
   Text chunks are converted into embeddings using `sentence-transformers/all-MiniLM-L6-v2` and stored in FAISS.

3. **Retrieval & Generation:**
   When you ask a question, relevant chunks are retrieved using **MMR retriever + MultiQueryRetriever**, and a **Llama-3.3-70B-Instruct** model (via Hugging Face Endpoint) generates a concise HTML-formatted answer.

4. **Memory:**
   The chatbot uses both **buffer memory** (for conversation history) and **vector store memory** (for semantic recall).

---

## 🧩 Technologies Used

**Backend:**

* FastAPI
* LangChain
* HuggingFace (Llama 3.3, Sentence Transformers)
* FAISS (Vector Database)
* BeautifulSoup (HTML Parsing)

**Frontend (Extension):**

* HTML, CSS, JavaScript
* Chrome Side Panel API
* REST API integration

---

## 📚 Example Workflow

1. Open the Chrome extension
2. Enter the webpage URL → `Load Webpage`
3. Ask: “Summarize this article” or “Who is the author?”
4. The AI will analyze and respond contextually.

---

## 🧩 Troubleshooting

| Issue                        | Possible Fix                                   |
| ---------------------------- | ---------------------------------------------- |
| ❌ `"Webpage not loaded yet"` | Call `/load_webpage` before `/ask`.            |
| ❌ `"Failed to answer query"` | Check if Hugging Face token is valid.          |
| ⚠️ CORS errors in Chrome     | Confirm CORS settings in `main.py`.            |
| 🕓 Slow responses            | Use smaller chunk sizes or a faster LLM model. |

---

## 🧑‍💻 Future Improvements

* 🔒 Authentication for backend access
* 🌐 Deploy FastAPI on Render / AWS
* 💾 Local caching of webpage vectors
* 🧠 Option to switch between LLMs (Llama, Mistral, etc.)

