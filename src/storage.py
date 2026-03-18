from dataclasses import asdict
from typing import Any, Dict

from src.triage import Intake


# Convert Intake dataclass into a plain dictionary for JSON export/reporting
def intake_to_dict(intake: Intake) -> Dict[str, Any]:
    return asdict(intake)
