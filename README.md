# CoreTriage

CoreTriage is an educational climbing injury triage and rehab guidance app built with Streamlit.

It combines:
- Structured injury intake (rule-based triage)
- Lightweight TF-IDF retrieval from a local knowledge base (RAG)
- Optional GPT-powered assistant (OpenAI API)
- Local LLM fallback (Ollama)
- Exportable Markdown reports and Postgres-backed session history

All output is educational only and intentionally non-diagnostic.

---

## Why This Project Exists

Climbers frequently deal with overuse injuries and acute tweaks. Many tools online are either:
- overly medical
- not climbing-specific
- or unsafe in how they present guidance

CoreTriage focuses on:
- conservative language
- safety flags
- load management principles
- transparency in retrieval and citations

---

## Architecture Overview

The project is intentionally modular:

**app.py**
- Streamlit UI
- Orchestrates intake, retrieval, chat routing, export, and persistence

**src/triage.py**
- Rule-based safety screen (red flags)
- Heuristic pattern buckets by region and mechanism (Fingers, Wrist, Elbow, Shoulder)
- Conservative load-management guidance template

**src/retriever.py**
- Loads markdown knowledge base files
- TF-IDF vectorization
- Cosine similarity search for top-k document retrieval

**src/render.py**
- Converts structured intake into a searchable query string
- Formats citations for UI display

**src/storage.py**
- Utility for converting Intake dataclass to dict (used in report export)

**database.py**
- Postgres persistence helpers (init, save, fetch, list, delete sessions)

**kb/**
- Domain-specific markdown documents used for retrieval grounding

---

## Retrieval-Augmented Generation (RAG)

When generating guidance or answering chat questions:

1. Structured intake is converted into a search query
2. TF-IDF similarity retrieves the most relevant KB documents
3. Retrieved context is passed to either:
   - GPT (OpenAI)
   - Ollama (local LLM)
   - or displayed directly (KB-only mode)
4. Source filenames are surfaced for transparency

This keeps responses grounded in climbing-specific material.

---

## Running Locally

Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the app:

```bash
streamlit run app.py
```

---

## Configuration

Copy `.env.example` to `.env` and fill in your values, or export variables directly.

### PostgreSQL (optional)

The app runs without a database — session history will simply be disabled. To enable it:

1. Create a Postgres database and user:

```sql
CREATE DATABASE coretriage_db;
CREATE USER coretriage WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE coretriage_db TO coretriage;
```

2. Set environment variables (or add to `.env`):

```bash
export CORETRIAGE_DB_HOST=localhost
export CORETRIAGE_DB_PORT=5432
export CORETRIAGE_DB_NAME=coretriage_db
export CORETRIAGE_DB_USER=coretriage
export CORETRIAGE_DB_PASSWORD=yourpassword
```

The table is created automatically on first run via `init_db()`.

### OpenAI GPT Mode (optional)

1. Create an API key at platform.openai.com.
2. Add it to `.streamlit/secrets.toml`:

```toml
OPENAI_API_KEY = "sk-..."
```

Or set as an environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

If no key is present, GPT mode returns a clear error rather than crashing.

### Ollama (optional)

Install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull llama3.1:8b
```

The app auto-detects whether Ollama is running and shows the option only when available.

---

## Features

- Region-specific injury pattern buckets (Fingers, Wrist, Elbow, Shoulder)
- Red flag safety screening
- Conservative return-to-climb guidance (region-aware)
- Markdown exportable reports
- Postgres-backed session history with delete support
- GPT-backed conversational assistant
- Local LLM fallback via Ollama

---

## Future Improvements

- Replace TF-IDF with embeddings + vector DB
- Token usage + cost tracking
- Inline source citations in GPT responses
- Deployment configuration for Streamlit Cloud
- User authentication for multi-user deployments

---

## Disclaimer

CoreTriage does not provide medical diagnosis or treatment. It is an educational tool intended to promote conservative load management and appropriate medical referral when indicated.

If symptoms worsen, involve neurological signs, or follow significant trauma, seek professional evaluation.
