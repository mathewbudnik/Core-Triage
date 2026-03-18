"""
CoreTriage FastAPI backend.
Run with: uvicorn main:app --reload
"""

import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import requests as http_requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

from database import delete_session, get_session, init_db, list_sessions, save_session
from src.render import build_query, format_citations
from src.retriever import TfidfRetriever, load_kb
from src.storage import intake_to_dict
from src.triage import Intake, bucket_possibilities, conservative_plan, red_flags

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

db_ready = False
db_error = ""


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_ready, db_error
    try:
        init_db()
        db_ready = True
    except Exception as e:
        db_error = str(e)
    yield


app = FastAPI(title="CoreTriage API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://mathewbudnik-core-triage.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class IntakeRequest(BaseModel):
    region: str
    onset: str
    pain_type: str
    severity: int
    swelling: str
    bruising: str
    numbness: str
    weakness: str
    instability: str
    mechanism: str
    free_text: str = ""
    k: int = 4


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    mode: str = "kb"
    model: str = "llama3.1:8b"
    k: int = 4


class SaveSessionRequest(BaseModel):
    injury_area: str
    pain_level: int
    pain_type: str
    onset: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health():
    return {"ok": True, "db_ready": db_ready, "db_error": db_error}


@app.post("/api/triage")
def triage(req: IntakeRequest):
    intake = Intake(
        region=req.region,
        onset=req.onset,
        pain_type=req.pain_type,
        severity=req.severity,
        swelling=req.swelling,
        bruising=req.bruising,
        numbness=req.numbness,
        weakness=req.weakness,
        instability=req.instability,
        mechanism=req.mechanism,
        free_text=req.free_text,
    )

    flags = red_flags(intake)
    buckets = bucket_possibilities(intake)
    plan = conservative_plan(intake)

    kb = load_kb("kb")
    retriever = TfidfRetriever(kb)
    q = build_query(intake)
    retrieved = retriever.query(q, k=req.k)
    citations = format_citations(retrieved)

    return {
        "intake": intake_to_dict(intake),
        "red_flags": flags,
        "buckets": [{"title": t, "why": w} for t, w in buckets],
        "plan": plan,
        "citations": citations,
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    kb = load_kb("kb")
    retriever = TfidfRetriever(kb)
    hits = retriever.query(req.message, k=req.k)
    citations = format_citations(hits)
    ctx_parts = [f"SOURCE: {chunk.source}\n{chunk.text}" for chunk, _ in hits]
    ctx = "\n\n---\n\n".join(ctx_parts)

    system_prompt = (
        "You are CoreTriage Assistant, an educational climbing injury triage and rehab guidance helper. "
        "Do NOT diagnose. Use conservative language (possible, common patterns). "
        "Always include a short safety note: if worsening, severe pain at rest, numbness/tingling, "
        "significant weakness, instability, major swelling/bruising, or trauma—seek evaluation. "
        "Prefer actionable, low-risk guidance: load reduction, symptom monitoring, progression rules. "
        "When you use the provided knowledge base context, cite the source filenames at the end.\n\n"
        f"KNOWLEDGE BASE CONTEXT:\n{ctx}"
    )

    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    text = ""
    if req.mode == "gpt":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {"response": "OPENAI_API_KEY not set.", "citations": citations}
        try:
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + messages,
                temperature=0.2,
                max_tokens=600,
            )
            text = response.choices[0].message.content
        except Exception as e:
            msg = str(e)
            if "insufficient_quota" in msg or "exceeded your current quota" in msg:
                text = "OpenAI quota issue: add credits in the OpenAI Platform Billing settings."
            elif "401" in msg or "invalid_api_key" in msg:
                text = "OpenAI auth error: the API key is invalid."
            else:
                text = f"OpenAI error: {msg}"
    elif req.mode == "ollama":
        try:
            payload = {
                "model": req.model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "stream": False,
            }
            r = http_requests.post("http://localhost:11434/api/chat", json=payload, timeout=60)
            r.raise_for_status()
            text = r.json().get("message", {}).get("content", "")
        except Exception as e:
            text = f"Could not reach Ollama at http://localhost:11434. Error: {e}"
    else:
        bullets = ["Here are the most relevant knowledge-base notes I found (educational only):"]
        for c in citations[:5]:
            bullets.append(f"- {c}")
        bullets.append(
            "\nSafety: If worsening, severe pain at rest, numbness/tingling, significant weakness, "
            "instability, major swelling/bruising, or trauma—seek evaluation."
        )
        text = "\n".join(bullets)

    if citations and req.mode in {"gpt", "ollama"}:
        text = text.strip() + "\n\nSources used: " + ", ".join([c.split(" (")[0] for c in citations[:5]])

    return {"response": text, "citations": citations}


@app.get("/api/ollama/status")
def ollama_status():
    try:
        r = http_requests.get("http://localhost:11434/api/tags", timeout=1.5)
        return {"available": r.status_code == 200}
    except Exception:
        return {"available": False}


@app.get("/api/sessions")
def get_sessions(limit: int = 50):
    if not db_ready:
        raise HTTPException(status_code=503, detail=db_error or "Database not ready")
    rows = list_sessions(limit)
    return [
        {
            "id": r[0],
            "injury_area": r[1],
            "pain_level": r[2],
            "pain_type": r[3],
            "onset": r[4],
            "created_at": str(r[5]),
        }
        for r in rows
    ]


@app.post("/api/sessions")
def create_session(req: SaveSessionRequest):
    if not db_ready:
        raise HTTPException(status_code=503, detail=db_error or "Database not ready")
    sid = save_session(
        {
            "injury_area": req.injury_area,
            "pain_level": req.pain_level,
            "pain_type": req.pain_type,
            "onset": req.onset,
        }
    )
    return {"id": sid}


@app.get("/api/sessions/{session_id}")
def fetch_session(session_id: int):
    if not db_ready:
        raise HTTPException(status_code=503, detail="Database not ready")
    r = get_session(session_id)
    if not r:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": r[0],
        "injury_area": r[1],
        "pain_level": r[2],
        "pain_type": r[3],
        "onset": r[4],
        "created_at": str(r[5]),
    }


@app.delete("/api/sessions/{session_id}")
def remove_session(session_id: int):
    if not db_ready:
        raise HTTPException(status_code=503, detail="Database not ready")
    delete_session(session_id)
    return {"ok": True}


@app.get("/api/kb")
def kb_files():
    kb = load_kb("kb")
    return {"files": [c.source for c in kb]}
