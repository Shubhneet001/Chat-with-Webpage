# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from utils import WebChatBot

app = FastAPI(title="Web Chatbot API", version="1.0")
bot = WebChatBot()


class URLRequest(BaseModel):
    url: str


class QueryRequest(BaseModel):
    query: str


@app.post("/load_webpage")
def load_webpage(request: URLRequest):
    result = bot.load_webpage(request.url)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@app.post("/ask")
def ask(request: QueryRequest):
    result = bot.ask(request.query)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.post("/reset_history")
def reset_history():
    result = bot.reset_history()
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result
