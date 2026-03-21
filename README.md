# CoreTriage

CoreTriage is an educational climbing injury triage and rehab guidance app. It helps climbers understand common injury patterns, screen for red flags, and get conservative load management guidance — without replacing a clinician.

Live at **[coretriage.com](https://coretriage.com)**

> Educational only. Not a medical diagnosis. Always seek professional evaluation if unsure.

---

## What It Does

- **Red flag screening** — flags symptoms that warrant professional evaluation (numbness, instability, sudden onset with bruising, etc.)
- **Injury pattern matching** — identifies common climbing injury patterns by body region and mechanism
- **Conservative plan** — region-aware return-to-climb guidance with load management principles
- **AI chat assistant** — ask questions grounded in the climbing-specific knowledge base
- **Session history** — save and review past triage sessions (requires account)
- **Exportable reports** — download a Markdown summary of any triage result

---

## Architecture

```
coretriage.com (Vercel)          coretriage.up.railway.app (Railway)
  React + Vite frontend    →      FastAPI backend
  Tailwind + Framer Motion →      psycopg2 + connection pool
                                  TF-IDF retriever (scikit-learn)
                                  OpenAI GPT-4o (optional)
                                  Ollama local LLM (optional)
                                        ↓
                                  Railway Postgres
```

### Backend — `main.py`
FastAPI app. Exposes REST endpoints for triage, chat, auth, and session history. KB and TF-IDF retriever are loaded once at startup and reused across requests.

### Triage logic — `src/triage.py`
- `Intake` dataclass — normalised injury input used across the app
- `red_flags()` — rule-based safety screen
- `bucket_possibilities()` — heuristic injury pattern matching by region + mechanism
- `conservative_plan()` — region-aware load management guidance template

Covers: Fingers, Wrist, Elbow, Shoulder, Knee, Hip, Lower Back

### Retrieval — `src/retriever.py`
TF-IDF vectorisation over markdown knowledge base files. Cosine similarity search returns the top-k most relevant chunks, which are passed as context to the chat assistant (RAG pattern).

### Database — `database.py`
Postgres helpers using psycopg2 with a `ThreadedConnectionPool` (1–10 connections). Handles `users` and `sessions` tables. Schema is created automatically on first run via `init_db()`.

### Knowledge base — `kb/`
Climbing-specific markdown documents covering common injury patterns, recovery timelines, red flags, and load management principles for each body region.

---

## Retrieval-Augmented Generation (RAG)

1. Intake is converted to a search query
2. TF-IDF retrieves the most relevant KB documents
3. Retrieved context is injected into the system prompt
4. Response is generated via GPT-4o, Ollama, or KB-only mode
5. Source filenames are cited for transparency

---

## Auth

JWT-based authentication (python-jose). Passwords hashed with bcrypt. Tokens stored in `localStorage` on the frontend and sent as `Authorization: Bearer` headers. Session history is scoped per user — users only see their own data.

---

## Running Locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your values, then:

```bash
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CORETRIAGE_DB_HOST` | Yes | Postgres host |
| `CORETRIAGE_DB_PORT` | Yes | Postgres port (default 5432) |
| `CORETRIAGE_DB_NAME` | Yes | Database name |
| `CORETRIAGE_DB_USER` | Yes | Database user |
| `CORETRIAGE_DB_PASSWORD` | Yes | Database password |
| `SECRET_KEY` | Yes | JWT signing secret (use a long random string) |
| `OPENAI_API_KEY` | No | Enables GPT-4o chat mode |

---

## Optional: Ollama (local LLM)

Install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull llama3.1:8b
```

The app auto-detects whether Ollama is running and enables the option in the chat tab.

---

## Deployment

- **Frontend** — Vercel. Set `VITE_API_URL` to your Railway backend URL.
- **Backend + DB** — Railway. Add all environment variables in the Variables tab. Schema migrations run automatically on startup.

---

## Disclaimer

CoreTriage does not provide medical diagnosis or treatment. It is an educational tool intended to promote conservative load management and appropriate medical referral when indicated.

If symptoms worsen, involve neurological signs, or follow significant trauma — seek professional evaluation.
