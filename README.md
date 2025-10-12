# Web Chatbot Assistant

A Chrome extension that allows users to **analyze and chat with any webpage** using AI.

---

## Overview

This project provides:
- A **Chrome side-panel extension** with a simple chat UI.
- A **FastAPI backend** that loads webpages, indexes content, and generates AI-based answers.
- Support for memory, contextual retrieval, and concise HTML-formatted responses.

---

## Project Structure

```

├── chrome-extension/
│   ├── background.js
│   ├── content.js
│   ├── icons/
│   ├── index.html
│   ├── manifest.json
│   └── styles.css
├── main.py
├── utils.py
├── requirements.txt
└── README.md

````

---

## Demo Images


<p align="center">
  <img src="https://github.com/user-attachments/assets/bac2aaaa-bb11-4b91-81e7-dd6269ff4d52" width="45%" />
  <img src="https://github.com/user-attachments/assets/7dc7e8c7-f1f3-42f3-b733-8a13dffae324" width="45%" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/5ec8d9f0-7cbf-48e3-8b69-eb260b2590bd" width="45%" />
  <img src="https://github.com/user-attachments/assets/0cddfc0b-507a-49ab-9c68-2e17aa17152f" width="45%" />
</p>

---

## Backend Setup (FastAPI)

### Prerequisites
- Python 3.11 or later  
- A [Hugging Face Access Token](https://huggingface.co/settings/tokens)

### Installation
```bash
git clone https://github.com/Shubhneet001/Chat-with-Webpage.git
cd Chat-with-webpage
python -m venv venv
venv\Scripts\activate     # or source venv/bin/activate on mac
pip install -r requirements.txt
````

### Environment Setup

Create a `.env` file:

```
HF_TOKEN=your_hf_api_token
```

### Run Server

```bash
uvicorn main:app --reload
```

API will be available at `http://127.0.0.1:8000`.

---

## API Endpoints

| Endpoint         | Method | Description                                                |
| ---------------- | ------ | ---------------------------------------------------------- |
| `/load_webpage`  | POST   | Loads and indexes a webpage (requires `"url"`).            |
| `/ask`           | POST   | Ask a question about the loaded page (requires `"query"`). |
| `/reset_history` | POST   | Clears the chatbot’s memory.                               |

Example:

```bash
curl -X POST "http://127.0.0.1:8000/load_webpage" \
-H "Content-Type: application/json" \
-d '{"url": "https://example.com"}'
```

---

## Chrome Extension Setup

1. Open **Chrome** → go to `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the `chrome-extension` folder
4. Ensure your FastAPI backend is running before using the extension

---

## Technical Overview

* **Web Scraping:** `WebBaseLoader` and `BeautifulSoup` for HTML cleaning
* **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2`
* **LLM:** `meta-llama/Llama-3.3-70B-Instruct` (via Hugging Face Endpoint)
* **Retrieval:** FAISS + MMR + MultiQueryRetriever
* **Memory:** Combined short-term (buffer) and long-term (vector) memory
