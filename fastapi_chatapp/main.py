# fastapi_chatapp/main.py
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Optional, Dict, Any, List

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# OpenAI SDK（既存 /chat 用）
from openai import OpenAI

# LangChain（/chat_rag 用）
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
from langchain.schema.runnable import RunnableLambda

# -----------------------------
# 基本設定
# -----------------------------
load_dotenv()  # OPENAI_API_KEY, OPENAI_MODEL, QA_XLSX_PATH, HIKITSUGI_MD_PATH を読む
app = FastAPI(title="fastapi-chatapp")


def _load_allowed_origins() -> list[str]:
    """環境変数 CORS_ALLOW_ORIGINS（カンマ区切り）を優先し、デフォルト値を補完する。"""
    defaults = [
        "http://localhost:5173",
        "https://fastapi-chat-ui.vercel.app",
    ]
    raw = os.getenv("CORS_ALLOW_ORIGINS", "")
    extras = [item.strip() for item in raw.split(",") if item.strip()]
    combined = defaults + extras
    seen: set[str] = set()
    result: list[str] = []
    for origin in combined:
        if origin not in seen:
            seen.add(origin)
            result.append(origin)
    return result


cors_kwargs: dict[str, Any] = dict(
    allow_origins=_load_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX")
if origin_regex:
    cors_kwargs["allow_origin_regex"] = origin_regex

# CORS（Render や Vercel デプロイ時は環境変数で上書き）
app.add_middleware(CORSMiddleware, **cors_kwargs)

# ルート/ヘルス
@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/ping")
def ping():
    return {"pong": True}

# -----------------------------
# 既存の /chat エンドポイント（OpenAI SDK直叩き）
# -----------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

このあと、支援者として次にすべき問い返し案を評価の高い順に3つ出力してください。
各案は以下の形式で出力してください：
1. [評価:5] 問い返し: ... | 理由: ...
2. [評価:4] 問い返し: ... | 理由: ...
3. [評価:3] 問い返し: ... | 理由: ...
"""
    resp = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[{"role": "user", "content": prompt}],
    )
    reply = resp.choices[0].message.content.strip()
    return {"response": reply}

# -----------------------------
# LangChain + RAG 準備（/chat_rag 用）
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent        # fastapi_chatapp/
ROOT_DIR = BASE_DIR.parent                        # プロジェクト直下
CHROMA_DIR = str(ROOT_DIR / ".chroma")            # ベクトルDB保存先

def _resolve_path(env_key: str, candidates: List[Path]) -> str:
    """環境変数が有効ならそれを、無ければ候補のうち先に存在するパスを返す"""
    p = os.getenv(env_key)
    if p and Path(p).exists():
        return p
    for c in candidates:
        if c.exists():
            return str(c)
    return str(candidates[0])  # 最後の手段（存在しなくても返す）

QA_XLSX_PATH = _resolve_path(
    "QA_XLSX_PATH",
    [ROOT_DIR / "data" / "QAset.xlsx", BASE_DIR / "data" / "QAset.xlsx"],
)
HIKITSUGI_MD_PATH = _resolve_path(
    "HIKITSUGI_MD_PATH",
    [ROOT_DIR / "data" / "hikitsugi.md", BASE_DIR / "data" / "hikitsugi.md"],
)

def _extract_docs_from_df(df: pd.DataFrame, sheet_name: str) -> tuple[list[str], list[dict]]:
    """1 シート分の DataFrame から RAG 用ドキュメントを生成する。"""
    if df.empty:
        return [], []

    df = df.dropna(how="all")
    if df.empty:
        return [], []

    columns = list(df.columns)
    if not columns:
        return [], []

    cols_lower = {str(c).lower(): c for c in columns}

    qcol = "Q" if "Q" in columns else cols_lower.get("q") or cols_lower.get("question") or columns[0]

    if "回答" in columns:
        acol = "回答"
    elif "A" in columns:
        acol = "A"
    else:
        acol = cols_lower.get("a") or cols_lower.get("answer") or (columns[1] if len(columns) > 1 else columns[0])

    use_aux_A = ("A" in columns) and (acol != "A")

    kcol_candidates = ["kadai_type", "課題タイプ", "カテゴリ", "category", "type"]
    kcol = next((c for c in kcol_candidates if c in columns), None)

    texts, metas = [], []
    for _, row in df.iterrows():
        q = str(row.get(qcol, "")).strip()
        a = str(row.get(acol, "")).strip()
        aux = str(row.get("A", "")).strip() if use_aux_A else ""
        kt = str(row.get(kcol, "未指定")).strip() if kcol else "未指定"

        if not q and not a and not aux:
            continue

        text = f"課題タイプ: {kt}\nQ: {q}\nA: {a}"
        if aux:
            text += f"\n補足A: {aux}"
        texts.append(text)
        metas.append({"kadai_type": kt, "sheet": sheet_name})

    return texts, metas


def _build_docs_from_excel(xlsx_path: str) -> tuple[list[str], list[dict]]:
    """
    QAset.xlsx (複数シート対応) を 1行=1ドキュメントのリストへ変換する。
    各シートを順に読み込み、Q/回答/A/課題タイプ列を推定してメタ情報にシート名を付与する。
    """
    path = Path(xlsx_path)
    if not path.exists():
        return ["(QAset.xlsx が見つかりませんでした)"], [{}]

    workbook = pd.read_excel(path, sheet_name=None)
    if isinstance(workbook, pd.DataFrame):
        workbook = {"Sheet1": workbook}

    texts, metas = [], []
    for sheet_name, df in workbook.items():
        sheet_texts, sheet_metas = _extract_docs_from_df(df, sheet_name)
        texts.extend(sheet_texts)
        metas.extend(sheet_metas)

    print(f"[QA Loader] sheets={len(workbook)}, docs={len(texts)}")

    if not texts:
        return ["(QAset.xlsx に有効な行がありませんでした)"], [{}]

    return texts, metas

def _load_hikitsugi(md_path: str) -> str:
    p = Path(md_path)
    if p.exists():
        return p.read_text(encoding="utf-8")
    return "(hikitsugi.md が見つかりませんでした)"


def _normalize_recommendations(raw_text: str, limit: int = 3) -> str:
    """
    モデル応答から最初の limit 件の提案ブロックを抜き出し、UI が期待する形式に整形する。
    """
    pattern = re.compile(r"(^\s*\d+\..*?)(?=^\s*\d+\.|\Z)", re.MULTILINE | re.DOTALL)
    matches = list(pattern.finditer(raw_text))
    if not matches:
        return raw_text.strip()

    suggestions: list[str] = []
    for idx, match in enumerate(matches[:limit]):
        block_raw = match.group(0)
        block = re.sub(r"[*_`]", "", block_raw)
        lines = [line.strip() for line in block.splitlines() if line.strip()]

        rank_match = re.match(r"(\d+)", lines[0]) if lines else None
        rank = rank_match.group(1) if rank_match else str(idx + 1)

        score = "3"
        question_parts: list[str] = []
        reason = ""

        for line in lines:
            if "順位" in line:
                continue

            if "評価" in line:
                digit = re.search(r"(\d+)", line)
                if digit:
                    score = digit.group(1)
                    continue

            lower_line = line.lower()
            if "問い返し" in lower_line:
                _, _, content = line.partition("：")
                if not content:
                    _, _, content = line.partition(":")
                question_parts.append(content.strip() or line)
                continue

            if "支援者の声かけ例" in lower_line or "理由" in lower_line:
                _, _, content = line.partition("：")
                if not content:
                    _, _, content = line.partition(":")
                reason = content.strip() or line
                continue

            if question_parts:
                question_parts.append(line)

        question = " ".join(question_parts).strip() if question_parts else block.strip()
        question_clean = re.sub(r"\s+", " ", question)
        reason_clean = re.sub(r"\s+", " ", reason)

        line = f"{rank}. [評価:{score}] 問い返し: {question_clean}"
        if reason_clean:
            line += f" | 理由: {reason_clean}"
        suggestions.append(line)

    return "\n".join(suggestions)

@app.on_event("startup")
def _startup():
    # 1) ベクトルDB 初期化
    embeddings = OpenAIEmbeddings()
    vs = Chroma(
        collection_name="qa_kb",
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )

    # 2) 初回のみインデックス作成
    try:
        count = vs._collection.count()  # internal but handy
    except Exception:
        count = 0

    if count == 0:
        texts, metas = _build_docs_from_excel(QA_XLSX_PATH)
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks, chunk_metas = [], []
        for t, m in zip(texts, metas):
            for ch in splitter.split_text(t):
                chunks.append(ch)
                chunk_metas.append(m)
        if chunks:
            vs.add_texts(chunks, metadatas=chunk_metas)
            vs.persist()

    # 3) 方針テキスト
    hikitsugi_text = _load_hikitsugi(HIKITSUGI_MD_PATH)[:2000]  # 長過ぎ防止で抜粋

    # 4) RAGチェーン（課題タイプでフィルタ可能）
    llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.3)

    SYSTEM_TMPL = """あなたは、障害のある当事者を支援する面談サポートAIです。制約:
- 役割: 支援者の「問い返し」を支援するコーチ
- 相手の名前: {user_name}
- 課題タイプ: {kadai_type}
- 出力: 評価の高い順に3つの「問い返し」案を列挙し、各案に評価(1-5)と支援者の声かけ例を1つ付けること。
- 並べ順: 評価が最も高いものから順に番号付きで示すこと。
- 参考方針（抜粋）:
{hikitsugi}

【参考コンテキスト（検索結果）】
{context}
"""
    prompt = ChatPromptTemplate.from_messages(
        [("system", SYSTEM_TMPL), ("human", "{query}")]
    )

    def retrieve_to_context(inputs: Dict[str, Any]) -> str:
        q = inputs.get("query", "")
        kt = inputs.get("kadai_type", "")
        flt = {"kadai_type": kt} if kt and kt != "未指定" else None
        docs = vs.similarity_search(q, k=4, filter=flt) if flt else vs.similarity_search(q, k=4)
        context = "\n\n".join(d.page_content for d in docs)
        print("RAG context:\n", context)  # デバッグ用途：検索結果を確認
        return context

    def append_context(inputs: Dict[str, Any]) -> Dict[str, Any]:
        return {**inputs, "context": retrieve_to_context(inputs)}

    chain = (
        RunnableLambda(append_context)
        | prompt
        | llm
        | StrOutputParser()
    )

    # 共有状態に保存
    app.state.vectorstore = vs
    app.state.hikitsugi = hikitsugi_text
    app.state.chain = chain

# -----------------------------
# /chat_rag（LangChain + RAG）
# -----------------------------
class RAGChatRequest(BaseModel):
    message: str
    kadai_type: Optional[str] = "未指定"
    user_name: Optional[str] = "対象者"

@app.post("/chat_rag")
async def chat_rag(req: RAGChatRequest):
    query = (
        f"対象者の発言：{req.message}\n"
        "支援者として次にすべき問い返し案を評価の高い順に3つ出力してください。\n"
        "各案には評価(1-5)と対応する支援者の声かけ例を1つ添えてください。"
    )
    vars = {
        "query": query,
        "kadai_type": req.kadai_type or "未指定",
        "user_name": req.user_name or "対象者",
        "hikitsugi": app.state.hikitsugi,
    }
    text = await app.state.chain.ainvoke(vars)
    normalized = _normalize_recommendations(text, limit=3)
    return {"response": normalized}
