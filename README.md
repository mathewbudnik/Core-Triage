# CoreTriage

CoreTriage is an educational climbing injury triage and rehab guidance app built with Streamlit.

It combines:
- Structured injury intake (rule-based triage)
- Lightweight TF-IDF retrieval from a local knowledge base (RAG)
- Optional GPT-powered assistant (OpenAI API)
- Local LLM fallback (Ollama)
- Exportable reports and session history

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

app.py
- Streamlit UI
- Orchestrates intake, retrieval, chat routing, export, and persistence

src/triage.py
- Rule-based safety screen (red flags)
- Heuristic pattern buckets by region and mechanism
- Conservative load-management guidance template

src/retriever.py
- Loads markdown knowledge base files
- TF-IDF vectorization
- Cosine similarity search for top-k document retrieval

src/render.py
- Converts structured intake into a searchable query string
- Formats citations for UI display

src/storage.py
- Persists session summaries as timestamped JSON
- Loads and lists previous sessions

kb/
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

## Using GPT Mode

1. Create an OpenAI API key in the OpenAI Platform.
2. Add it to:

```
.streamlit/secrets.toml
```

With:

```toml
OPENAI_API_KEY = "sk-..."
```

Or set as an environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

If no key is present, GPT mode is disabled automatically.

---

## Features

- Region-specific injury pattern buckets
- Red flag safety screening
- Conservative return-to-climb guidance
- Markdown exportable reports
- Session history (JSON-based persistence)
- GPT-backed conversational assistant
- Local LLM fallback via Ollama

---

## Future Improvements

- Replace TF-IDF with embeddings + vector DB
- Token usage + cost tracking
- Inline source citations in GPT responses
- Deployment configuration for Streamlit Cloud

---

## Disclaimer

CoreTriage does not provide medical diagnosis or treatment. It is an educational tool intended to promote conservative load management and appropriate medical referral when indicated.

If symptoms worsen, involve neurological signs, or follow significant trauma, seek professional evaluation.