"""
CoreTriage FastAPI backend.
Run with: uvicorn main:app --reload
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import bcrypt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from openai import OpenAI
from pydantic import BaseModel

from database import (
    create_user,
    delete_session,
    get_active_plan,
    get_or_create_thread,
    get_profile,
    get_session,
    get_thread_by_user,
    get_thread_messages,
    get_training_logs,
    get_user_by_email,
    init_db,
    list_coach_threads,
    list_sessions,
    log_training,
    save_plan,
    save_profile,
    save_session,
    send_coach_message,
)
from dataclasses import asdict

from src.render import build_query, format_citations
from src.retriever import TfidfRetriever, load_kb
from src.triage import (
    Intake,
    bucket_possibilities,
    classify_severity,
    conservative_plan,
    get_return_to_climbing_protocol,
    get_training_modifications,
    red_flags,
)

# ---------------------------------------------------------------------------
# Auth config
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30
COACH_EMAIL = os.getenv("COACH_EMAIL", "mathewbudnik@gmail.com")

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": int(payload["sub"]), "email": payload["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

db_ready = False
db_error = ""
_kb = None
_retriever = None
_openai_client = None
_chat_system_prompt = ""


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_ready, db_error, _kb, _retriever, _openai_client, _chat_system_prompt
    try:
        init_db()
        db_ready = True
    except Exception as e:
        db_error = str(e)
    _kb = load_kb("kb")
    _retriever = TfidfRetriever(_kb)
    _chat_system_prompt = (
        open("src/prompts/chat_system.txt").read().strip()
    )
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        _openai_client = OpenAI(api_key=api_key)
    yield


app = FastAPI(title="CoreTriage API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://mathewbudnik-core-triage.vercel.app",
        "https://*.vercel.app",
        "https://coretriage.com",
        "https://www.coretriage.com",
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
    k: int = 4


class SaveSessionRequest(BaseModel):
    injury_area: str
    pain_level: int
    pain_type: str
    onset: str


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileRequest(BaseModel):
    experience_level: str
    years_climbing: int
    primary_discipline: str
    max_grade_boulder: str = ""
    max_grade_route: str = ""
    days_per_week: int
    session_length_min: int
    equipment: List[str] = []
    weaknesses: List[str] = []
    primary_goal: str
    goal_grade: str = ""


class GeneratePlanRequest(BaseModel):
    use_injury_data: bool = True


class TrainingLogRequest(BaseModel):
    date: Optional[str] = None
    session_type: str
    duration_min: int
    intensity: int
    grades_sent: str = ""
    notes: str = ""


class CoachMessageRequest(BaseModel):
    content: str


class CoachReplyRequest(BaseModel):
    thread_id: int
    content: str


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------


@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if get_user_by_email(req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in req.password):
        raise HTTPException(status_code=400, detail="Password must include at least one symbol")
    password_hash = hash_password(req.password)
    user_id = create_user(req.email, password_hash)
    token = create_token(user_id, req.email)
    return {"token": token, "user": {"id": user_id, "email": req.email}}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user[2]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user[0], user[1])
    return {"token": token, "user": {"id": user[0], "email": user[1]}}


@app.get("/api/auth/me")
def me(user: Dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"]}


# ---------------------------------------------------------------------------
# Public endpoints
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

    try:
        flags = red_flags(intake)
        buckets = bucket_possibilities(intake)
        plan = conservative_plan(intake)
        severity = classify_severity(intake)
        training_mods = get_training_modifications(intake)
        return_protocol = get_return_to_climbing_protocol(intake)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Triage processing error: {exc}") from exc

    try:
        q = build_query(intake)
        retrieved = _retriever.query(q, k=req.k)
        citations = format_citations(retrieved)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Retrieval error: {exc}") from exc

    return {
        "intake": asdict(intake),
        "red_flags": flags,
        "severity": severity,
        "buckets": [{"title": t, "why": w} for t, w in buckets],
        "plan": plan,
        "training_modifications": training_mods,
        "return_protocol": return_protocol,
        "citations": citations,
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    hits = _retriever.query(req.message, k=req.k)
    citations = format_citations(hits)
    ctx_parts = [f"SOURCE: {chunk.source}\n{chunk.text}" for chunk, _ in hits]
    ctx = "\n\n---\n\n".join(ctx_parts)

    system_prompt = _chat_system_prompt + f"\n\nKNOWLEDGE BASE CONTEXT:\n{ctx}"

    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    text = ""
    if req.mode == "gpt":
        if not _openai_client:
            return {"response": "OPENAI_API_KEY not set.", "citations": citations}
        try:
            response = _openai_client.chat.completions.create(
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
    else:
        # KB-only mode: present the retrieved chunk content directly.
        # The previous code only listed filenames; this now shows the actual text.
        parts = []
        for chunk, score in hits:
            if score < 0.05:
                continue
            content = chunk.text.strip()
            if len(content) > 2000:
                content = content[:2000] + "\n\n*(content truncated — see full file for details)*"
            parts.append(f"**{chunk.source}** *(relevance {score:.2f})*\n\n{content}")

        if parts:
            text = "\n\n---\n\n".join(parts)
            text += (
                "\n\n---\n\n*Educational only — not a medical diagnosis. "
                "Safety: if worsening, severe pain at rest, numbness/tingling, "
                "significant weakness, instability, major swelling/bruising, "
                "or trauma — seek professional evaluation.*"
            )
        else:
            text = "No relevant content found in the knowledge base for your query."

    if citations and req.mode == "gpt":
        text = text.strip() + "\n\nSources used: " + ", ".join([c.split(" (")[0] for c in citations[:5]])

    return {"response": text, "citations": citations}


# ---------------------------------------------------------------------------
# Session endpoints (require auth)
# ---------------------------------------------------------------------------


@app.get("/api/sessions")
def get_sessions(limit: int = 50, user: Dict = Depends(get_current_user)):
    if not db_ready:
        raise HTTPException(status_code=503, detail=db_error or "Database not ready")
    rows = list_sessions(user["id"], limit)
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
def create_session(req: SaveSessionRequest, user: Dict = Depends(get_current_user)):
    if not db_ready:
        raise HTTPException(status_code=503, detail=db_error or "Database not ready")
    sid = save_session(
        {
            "user_id": user["id"],
            "injury_area": req.injury_area,
            "pain_level": req.pain_level,
            "pain_type": req.pain_type,
            "onset": req.onset,
        }
    )
    return {"id": sid}


@app.get("/api/sessions/{session_id}")
def fetch_session(session_id: int, user: Dict = Depends(get_current_user)):
    if not db_ready:
        raise HTTPException(status_code=503, detail="Database not ready")
    r = get_session(session_id)
    if not r:
        raise HTTPException(status_code=404, detail="Session not found")
    if r[6] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "id": r[0],
        "injury_area": r[1],
        "pain_level": r[2],
        "pain_type": r[3],
        "onset": r[4],
        "created_at": str(r[5]),
    }


@app.delete("/api/sessions/{session_id}")
def remove_session(session_id: int, user: Dict = Depends(get_current_user)):
    if not db_ready:
        raise HTTPException(status_code=503, detail="Database not ready")
    delete_session(session_id, user["id"])
    return {"ok": True}


@app.get("/api/kb")
def kb_files():
    return {"files": [c.source for c in _kb]}


# ---------------------------------------------------------------------------
# Profile endpoints (require auth)
# ---------------------------------------------------------------------------


@app.post("/api/profile")
def upsert_profile(req: ProfileRequest, user: Dict = Depends(get_current_user)):
    save_profile(
        user["id"],
        {
            "experience_level": req.experience_level,
            "years_climbing": req.years_climbing,
            "primary_discipline": req.primary_discipline,
            "max_grade_boulder": req.max_grade_boulder,
            "max_grade_route": req.max_grade_route,
            "days_per_week": req.days_per_week,
            "session_length_min": req.session_length_min,
            "equipment": req.equipment,
            "weaknesses": req.weaknesses,
            "primary_goal": req.primary_goal,
            "goal_grade": req.goal_grade,
        },
    )
    return {"ok": True}


@app.get("/api/profile")
def fetch_profile(user: Dict = Depends(get_current_user)):
    profile = get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not set up yet")
    return profile


# ---------------------------------------------------------------------------
# Plan endpoints (require auth)
# ---------------------------------------------------------------------------


@app.post("/api/plans/generate")
def generate_plan_endpoint(req: GeneratePlanRequest, user: Dict = Depends(get_current_user)):
    from src.coach import generate_plan

    profile = get_profile(user["id"])
    if not profile:
        raise HTTPException(status_code=400, detail="Complete your profile before generating a plan")

    injury_flags: List[str] = []
    if req.use_injury_data:
        rows = list_sessions(user["id"], limit=5)
        injury_flags = [r[1] for r in rows]  # injury_area column

    try:
        plan = generate_plan(profile, injury_flags, openai_client=_openai_client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Plan generation error: {exc}") from exc

    plan_id = save_plan(user["id"], plan)
    return {"id": plan_id, "plan": plan}


@app.get("/api/plans/active")
def get_plan(user: Dict = Depends(get_current_user)):
    plan = get_active_plan(user["id"])
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan")
    return plan


# ---------------------------------------------------------------------------
# Training log endpoints (require auth)
# ---------------------------------------------------------------------------


@app.post("/api/training")
def log_session(req: TrainingLogRequest, user: Dict = Depends(get_current_user)):
    log_id = log_training(
        user["id"],
        {
            "date": req.date,
            "session_type": req.session_type,
            "duration_min": req.duration_min,
            "intensity": req.intensity,
            "grades_sent": req.grades_sent,
            "notes": req.notes,
        },
    )
    return {"id": log_id}


@app.get("/api/training")
def fetch_training_logs(limit: int = 30, user: Dict = Depends(get_current_user)):
    return get_training_logs(user["id"], limit)


# ---------------------------------------------------------------------------
# Coach messaging endpoints (require auth)
# ---------------------------------------------------------------------------


def require_coach(user: Dict = Depends(get_current_user)) -> Dict:
    if user["email"] != COACH_EMAIL:
        raise HTTPException(status_code=403, detail="Coach access only")
    return user


@app.post("/api/coach/message")
def user_send_message(req: CoachMessageRequest, user: Dict = Depends(get_current_user)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    thread_id = get_or_create_thread(user["id"])
    msg_id = send_coach_message(thread_id, "user", req.content.strip())
    return {"id": msg_id, "thread_id": thread_id}


@app.get("/api/coach/thread")
def user_get_thread(user: Dict = Depends(get_current_user)):
    thread = get_thread_by_user(user["id"])
    if not thread:
        return {"messages": [], "thread": None}
    messages = get_thread_messages(thread["id"])
    return {"messages": messages, "thread": thread}


@app.get("/api/admin/coach/threads")
def admin_list_threads(_coach: Dict = Depends(require_coach)):
    return list_coach_threads()


@app.get("/api/admin/coach/threads/{thread_id}/messages")
def admin_get_messages(thread_id: int, _coach: Dict = Depends(require_coach)):
    return get_thread_messages(thread_id)


@app.post("/api/admin/coach/reply")
def admin_reply(req: CoachReplyRequest, _coach: Dict = Depends(require_coach)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    msg_id = send_coach_message(req.thread_id, "coach", req.content.strip())
    return {"id": msg_id}
