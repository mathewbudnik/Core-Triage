"""
CoreTriage main application entry point.

Controls the Streamlit UI and overall flow:
- structured injury intake
- rule-based triage logic
- local knowledge-base retrieval
- optional LLM-backed chat assistant
- session export + persistence

All output is educational-only and intentionally non-diagnostic.
"""

# UI framework
import streamlit as st
# HTTP client (Ollama local LLM)
import requests
import os
# OpenAI API client (hosted GPT)
from openai import OpenAI

# Project modules (triage logic, retrieval, formatting, persistence)
from src.triage import Intake, red_flags, bucket_possibilities, conservative_plan
from src.retriever import load_kb, TfidfRetriever
from src.render import build_query, format_citations
from src.storage import save_session, list_sessions, load_session, intake_to_dict


# Build retrieval context from the local KB (RAG) using TF-IDF similarity
def _mk_context(kb_chunks, user_text: str, k: int) -> tuple[str, list[str]]:
    retriever = TfidfRetriever(kb_chunks)
    # Top-k most relevant KB chunks for the user's text
    hits = retriever.query(user_text, k=int(k))
    citations = format_citations(hits)
    ctx_parts = []
    # Format chunks into a single context string for the assistant
    for chunk, score in hits:
        ctx_parts.append(f"SOURCE: {chunk.source}\n{chunk.text}")
    return "\n\n---\n\n".join(ctx_parts), citations

# Send chat requests to a locally running Ollama model
# Used only if the user selects the Ollama mode in the Chat tab
def _ollama_chat(system_prompt: str, messages: list[dict], model: str = "llama3.1:8b") -> str:
    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": False,
    }
    # Ollama's local REST API returns a chat-style JSON response
    r = requests.post("http://localhost:11434/api/chat", json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    return data.get("message", {}).get("content", "")


# OpenAI GPT chat wrapper with basic key and error handling
# Reads OPENAI_API_KEY from env or Streamlit secrets and returns a single assistant message
def _openai_chat(system_prompt: str, messages: list[dict], model: str = "gpt-4o") -> str:
    api_key = os.getenv("OPENAI_API_KEY") or st.secrets.get("OPENAI_API_KEY", None)
    if not api_key:
        return "OPENAI_API_KEY not set. Add it to .streamlit/secrets.toml or set it as an environment variable."

    client = OpenAI(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system_prompt}] + messages,
            temperature=0.2,
            max_tokens=600,
        )
        return response.choices[0].message.content
    except Exception as e:
        msg = str(e)
        if "insufficient_quota" in msg or "exceeded your current quota" in msg:
            return (
                "OpenAI API quota/billing issue: your API project has no available quota. "
                "Add a payment method and credits / increase your usage limits in the OpenAI Platform Billing settings, "
                "or switch Assistant mode to Local (KB-only)."
            )
        if "401" in msg or "invalid_api_key" in msg or "Incorrect API key" in msg:
            return "OpenAI API auth error: the API key is invalid or not authorized for this project."
        return f"OpenAI API error: {msg}"

# Detect whether Ollama is running locally so we can hide the option if unavailable
def _ollama_available() -> bool:
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=1.5)
        return r.status_code == 200
    except Exception:
        return False

# Streamlit app configuration and global styling
st.set_page_config(page_title="CoreTriage", layout="wide")

# CSS theme to differentiate the project visually (outdoor-inspired palette)
st.markdown(
    """
<style>
:root {
  --bg: #0b1220;            /* deep navy */
  --panel: #121b2e;         /* slightly lighter */
  --panel2: #0f172a;
  --text: #e8eefc;
  --muted: #a9b7d0;

  /* outdoor-inspired accents (Patagonia/Cotopaxi-ish without copying) */
  --accent: #14b8a6;        /* teal */
  --accent2: #fb7185;       /* coral */
  --accent3: #fbbf24;       /* warm gold */
  --outline: rgba(232, 238, 252, 0.12);
}

html, body, .stApp {
  background: radial-gradient(1200px 800px at 20% 0%, rgba(20,184,166,0.12), transparent 45%),
              radial-gradient(900px 600px at 80% 10%, rgba(251,113,133,0.10), transparent 45%),
              radial-gradient(800px 500px at 50% 100%, rgba(251,191,36,0.08), transparent 45%),
              var(--bg);
  color: var(--text);
}

/* Sidebar */
section[data-testid="stSidebar"] {
  background: linear-gradient(180deg, rgba(18,27,46,0.92), rgba(15,23,42,0.92));
  border-right: 1px solid var(--outline);
}
section[data-testid="stSidebar"] * {
  color: var(--text) !important;
}

/* Headings */
h1, h2, h3 {
  letter-spacing: -0.02em;
}

/* Tabs: give a colorful indicator */
button[data-baseweb="tab"] {
  color: var(--muted) !important;
}
button[data-baseweb="tab"][aria-selected="true"] {
  color: var(--text) !important;
}
button[data-baseweb="tab"][aria-selected="true"] > div {
  border-bottom: 2px solid var(--accent) !important;
}

/* Inputs */
div[data-baseweb="select"] > div,
div[data-baseweb="input"] > div,
textarea {
  background: rgba(18,27,46,0.75) !important;
  border: 1px solid var(--outline) !important;
  color: var(--text) !important;
}

/* Slider accent */
div[data-testid="stSlider"] [role="slider"] {
  background: var(--accent2) !important;
}

/* Primary button */
button[kind="primary"] {
  background: linear-gradient(135deg, var(--accent2), var(--accent3)) !important;
  color: #0b1220 !important;
  border: 0 !important;
  font-weight: 700 !important;
}
button[kind="primary"]:hover {
  filter: brightness(1.05);
}

/* Secondary buttons */
.stDownloadButton button,
.stButton button {
  background: rgba(18,27,46,0.70) !important;
  color: var(--text) !important;
  border: 1px solid var(--outline) !important;
}
.stDownloadButton button:hover,
.stButton button:hover {
  border-color: rgba(20,184,166,0.45) !important;
}

/* Info/warn/success boxes polish */
div[data-testid="stAlert"] {
  border: 1px solid var(--outline);
  background: rgba(18,27,46,0.70);
}
</style>
    """,
    unsafe_allow_html=True,
)

st.title("CoreTriage")
st.markdown("<div style='color:#a9b7d0;margin-top:-8px'>Outdoor-inspired triage + rehab guidance • local knowledge base • exportable reports</div>", unsafe_allow_html=True)
st.caption("Educational climbing injury triage + rehab guidance. Not a medical diagnosis.")

# Sidebar controls: safety disclaimer + retrieval depth
with st.sidebar:
    st.subheader("Safety")
    st.write("If severe symptoms, neurological symptoms, or major trauma: seek professional evaluation.")
    k = st.slider("How many knowledge-base sources to retrieve", 2, 6, 4)

# Tabs separate the main flows: intake triage, chat assistant, history, and about
tab1, tab2, tab3, tab4 = st.tabs(["Triage", "Chat", "History", "About / Sources"])

with tab1:
    st.subheader("Quick intake")

    col1, col2, col3 = st.columns(3)

    with col1:
        region = st.selectbox("Injury area", ["Fingers", "Elbow", "Shoulder"])
        onset = st.selectbox("Onset", ["Gradual", "Sudden"])
        mechanism = st.selectbox(
            "What triggered it most?",
            [
                "Hard crimp",
                "Dynamic catch",
                "Pocket",
                "High volume pulling",
                "Steep climbing/board",
                "Campusing",
                "Unknown/other",
            ],
        )

    with col2:
        pain_type = st.selectbox("Pain type", ["Dull/ache", "Sharp", "Burning", "Tingling"])
        severity = st.slider("Pain severity (0–10)", 0, 10, 4)
        swelling = st.selectbox("Swelling", ["No", "Yes"])

    with col3:
        bruising = st.selectbox("Bruising", ["No", "Yes"])
        numbness = st.selectbox("Numbness/tingling", ["No", "Yes"])
        weakness = st.selectbox("Weakness", ["None", "Mild", "Significant"])
        instability = st.selectbox("Instability (slipping/dislocating feeling)", ["No", "Yes"])

    free_text = st.text_area("Optional: describe what happened in your own words", height=100)

    # Generate triggers triage + retrieval + report building
    generate = st.button("Generate guidance", type="primary")

    if generate:
        # Normalize UI inputs into a typed Intake object
        intake = Intake(
            region=region,
            onset=onset,
            pain_type=pain_type,
            severity=int(severity),
            swelling=swelling,
            bruising=bruising,
            numbness=numbness,
            weakness=weakness,
            instability=instability,
            mechanism=mechanism,
            free_text=free_text or "",
        )

        flags = red_flags(intake)
        buckets = bucket_possibilities(intake)
        plan = conservative_plan(intake)

        # Retrieve supporting snippets from the local knowledge base (RAG)
        kb = load_kb("kb")
        retriever = TfidfRetriever(kb)
        q = build_query(intake)
        retrieved = retriever.query(q, k=int(k))
        citations = format_citations(retrieved)

        summary = {
            "intake": intake_to_dict(intake),
            "red_flags": flags,
            "buckets": [{"title": t, "why": w} for t, w in buckets],
            "plan": plan,
            "citations": citations,
        }

        # Persist the last generated summary for later saving
        st.session_state["last_summary"] = summary

        # Build an exportable Markdown report for downloads / sharing
        md_lines = []
        md_lines.append("# CoreTriage Summary (Educational)\n\n")
        md_lines.append("## Intake\n")
        for k2, v2 in summary["intake"].items():
            md_lines.append(f"- **{k2}**: {v2}\n")

        md_lines.append("\n## Red flags\n")
        if flags:
            for f in flags:
                md_lines.append(f"- {f}\n")
        else:
            md_lines.append("- None detected from this intake (still educational only)\n")

        md_lines.append("\n## Common possibility buckets (not a diagnosis)\n")
        for b in summary["buckets"]:
            md_lines.append(f"- **{b['title']}** — {b['why']}\n")

        md_lines.append("\n## Conservative plan\n")
        for section, items in plan.items():
            md_lines.append(f"\n### {section}\n")
            for it in items:
                md_lines.append(f"- {it}\n")

        md_lines.append("\n## Knowledge base sources used\n")
        if citations:
            for c in citations:
                md_lines.append(f"- {c}\n")
        else:
            md_lines.append("- None\n")

        md_lines.append("\n---\n")
        md_lines.append("This tool is educational only and does not provide medical diagnosis or treatment.\n")

        md_text = "".join(md_lines)

        # Export and persistence controls
        export_col, save_col = st.columns(2)
        with export_col:
            st.download_button(
                "Download summary (Markdown)",
                data=md_text.encode("utf-8"),
                file_name="coretriage_summary.md",
                mime="text/markdown",
            )
        with save_col:
            if st.button("Save this session to history"):
                if "last_summary" in st.session_state:
                    fname = save_session(st.session_state["last_summary"])
                    st.success(f"Saved session: {fname}")
                else:
                    st.warning("No session to save yet. Generate guidance first.")

        if flags:
            st.error("Red flags detected (consider evaluation):")
            for f in flags:
                st.write(f"• {f}")
        else:
            st.success("No major red flags detected from this intake (still educational only).")

        st.subheader("Common possibility buckets (not a diagnosis)")
        for title, why in buckets:
            st.write(f"• **{title}** — {why}")

        st.subheader("Conservative plan")
        for section, items in plan.items():
            with st.expander(section, expanded=(section == "Immediate next 7–10 days")):
                for it in items:
                    st.write(f"• {it}")

        st.subheader("Knowledge base sources used")
        if citations:
            for c in citations:
                st.write(f"• {c}")
        else:
            st.write("No sources retrieved.")

        st.caption("Educational tool only. This does not diagnose, treat, or replace a clinician/PT.")

with tab2:
    st.subheader("CoreTriage Assistant")
    st.caption("Chat is educational only. No diagnosis. If severe symptoms or red flags, seek evaluation.")

    ollama_ok = _ollama_available()
    modes = ["Local (KB-only)", "GPT (OpenAI)"] + (["Ollama (local LLM)"] if ollama_ok else [])
    mode = st.radio("Assistant mode", modes, horizontal=True)

    if not ollama_ok:
        st.info("Ollama not detected on this machine. Install/start Ollama to enable local LLM mode.")

    ollama_model = "llama3.1:8b"
    if mode == "Ollama (local LLM)":
        ollama_model = st.text_input(
            "Ollama model name",
            value="llama3.1:8b",
            help="Requires Ollama running locally. Example: llama3.1:8b",
        )

    # Persist chat history across reruns
    if "chat_messages" not in st.session_state:
        st.session_state["chat_messages"] = []

    for m in st.session_state["chat_messages"]:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])

    user_msg = st.chat_input("Ask about symptoms, training load, return-to-climb, or rehab basics…")

    if user_msg:
        st.session_state["chat_messages"].append({"role": "user", "content": user_msg})
        with st.chat_message("user"):
            st.markdown(user_msg)

        # Ground the assistant with top-k KB chunks (RAG context)
        kb = load_kb("kb")
        ctx, cites = _mk_context(kb, user_msg, k=int(k))

        # System prompt enforces safety constraints and conservative language
        system_prompt = (
            "You are CoreTriage Assistant, an educational climbing injury triage and rehab guidance helper. "
            "Do NOT diagnose. Use conservative language (possible, common patterns). "
            "Always include a short safety note: if worsening, severe pain at rest, numbness/tingling, significant weakness, instability, major swelling/bruising, or trauma—seek evaluation. "
            "Prefer actionable, low-risk guidance: load reduction, symptom monitoring, progression rules. "
            "When you use the provided knowledge base context, cite the source filenames at the end.\n\n"
            f"KNOWLEDGE BASE CONTEXT:\n{ctx}"
        )

        # Route to the selected backend (GPT, Ollama, or KB-only fallback)
        assistant_text = ""
        if mode == "GPT (OpenAI)":
            assistant_text = _openai_chat(system_prompt, st.session_state["chat_messages"], model="gpt-4o")
        elif mode == "Ollama (local LLM)":
            try:
                assistant_text = _ollama_chat(system_prompt, st.session_state["chat_messages"], model=ollama_model)
            except Exception as e:
                assistant_text = (
                    "Could not reach Ollama at http://localhost:11434. "
                    "Switch to GPT (OpenAI) or Local mode.\n\n"
                    f"Error: {e}"
                )
        else:
            bullets = [
                "Here are the most relevant knowledge-base notes I found (educational only):",
            ]
            for c in cites[:5]:
                bullets.append(f"- {c}")
            bullets.append(
                "\nSafety: If worsening, severe pain at rest, numbness/tingling, significant weakness, instability, major swelling/bruising, or trauma—seek evaluation."
            )
            assistant_text = "\n".join(bullets)

        # Append source filenames for transparency (when available)
        if cites and mode in {"GPT (OpenAI)", "Ollama (local LLM)"}:
            assistant_text = assistant_text.strip() + "\n\nSources used: " + ", ".join([c.split(" (")[0] for c in cites[:5]])

        st.session_state["chat_messages"].append({"role": "assistant", "content": assistant_text})
        with st.chat_message("assistant"):
            st.markdown(assistant_text)

with tab3:
    # Sessions are stored as JSON files under ./history
    st.subheader("Saved sessions")
    sessions = list_sessions()
    if not sessions:
        st.info("No saved sessions yet. Generate guidance and click 'Save this session to history'.")
    else:
        chosen = st.selectbox("Select a session", sessions)
        if chosen:
            data = load_session(chosen)
            st.write("### Intake")
            st.json(data.get("intake", {}))
            st.write("### Red flags")
            st.json(data.get("red_flags", []))
            st.write("### Buckets")
            st.json(data.get("buckets", []))
            st.write("### Plan")
            st.json(data.get("plan", {}))
            st.write("### Citations")
            st.json(data.get("citations", []))

with tab4:
    # Show which KB files are available locally (useful for debugging/demo)
    st.subheader("About")
    st.write(
        "CoreTriage is an educational triage and rehab guidance tool. It uses a structured intake, "
        "rule-based safety checks, and retrieval from a local knowledge base to produce conservative guidance."
    )
    st.subheader("Included knowledge base files")
    kb_files = sorted(load_kb("kb"), key=lambda c: c.source)
    st.write("Files in /kb:")
    for c in kb_files:
        st.write(f"• {c.source}")