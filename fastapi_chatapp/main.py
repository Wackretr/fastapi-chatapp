from fastapi import FastAPI
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from openai import OpenAI

# .env ファイルから OPENAI_API_KEY を読み込む
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# OpenAI クライアントを初期化
client = OpenAI(api_key=api_key)

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "https://fastapi-chat-ui.vercel.app",  # ← 追加
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    user_input = req.message

    prompt = f"""
あなたは問題行動を起こした若者の支援者です。
以下のように問い返してください：

Q なぜ万引きした？
→ わからない
A 万引きという言葉はわかる？

以下、対象者の発言です：
「{user_input}」

このあと、支援者として次にすべき問い返しを1つ出力してください。
"""

    # ChatGPTに問い合わせ
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    reply = response.choices[0].message.content.strip()
    return {"response": reply}
