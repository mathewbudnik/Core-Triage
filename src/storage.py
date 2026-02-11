import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from src.triage import Intake

# Directory where generated session summaries are stored as JSON files
HISTORY_DIR = Path("history")


# Persist a generated triage summary to disk (timestamped JSON file)
def save_session(payload: Dict[str, Any]) -> str:
    # Ensure the history folder exists before writing
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    # Use timestamp to create unique, sortable filenames
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"session_{ts}.json"
    # Serialize payload to pretty-printed JSON for readability
    (HISTORY_DIR / fname).write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return fname


# Load a previously saved session JSON file
def load_session(filename: str) -> Dict[str, Any]:
    return json.loads((HISTORY_DIR / filename).read_text(encoding="utf-8"))


# Return all saved session filenames (newest first)
def list_sessions() -> List[str]:
    # If no history folder yet, return empty list
    if not HISTORY_DIR.exists():
        return []
    return sorted([p.name for p in HISTORY_DIR.glob("session_*.json")], reverse=True)


# Convert Intake dataclass into a plain dictionary for JSON storage
def intake_to_dict(intake: Intake) -> Dict[str, Any]:
    return asdict(intake)