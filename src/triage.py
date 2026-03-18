from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


# Normalized injury intake used across the app (UI -> triage -> retrieval)
@dataclass(frozen=True)
class Intake:
    region: str
    onset: str
    pain_type: str
    severity: int
    # Key symptom flags (used for safety checks)
    swelling: str
    bruising: str
    numbness: str
    weakness: str
    instability: str
    # Context about what triggered it (helps narrow common patterns)
    mechanism: str
    free_text: str


# Simple safety screen: returns reasons to seek evaluation based on common red flags
def red_flags(i: Intake) -> List[str]:
    flags: List[str] = []
    # Each check is intentionally conservative (educational only, not diagnostic)

    if i.numbness == "Yes":
        flags.append("Numbness/tingling can indicate nerve involvement.")
    if i.weakness == "Significant":
        flags.append("Significant weakness warrants evaluation, especially if sudden.")
    if i.instability == "Yes":
        flags.append("Instability (feels like slipping/dislocating) warrants evaluation.")
    if i.bruising == "Yes" and i.onset == "Sudden":
        flags.append("Sudden onset with bruising can indicate a more significant tissue injury.")
    if i.swelling == "Yes" and i.severity >= 7:
        flags.append("High pain with swelling may need evaluation.")
    if "pop" in i.free_text.lower() or "snap" in i.free_text.lower():
        flags.append("Reported pop/snap during injury is a red flag to consider evaluation.")
    # Wrist-specific: fall on outstretched hand with snuffbox pain is a scaphoid red flag
    if "wrist" in i.region.lower() and i.onset == "Sudden":
        flags.append(
            "Sudden wrist injury — if there is tenderness at the base of the thumb (anatomical snuffbox), "
            "seek evaluation to rule out scaphoid fracture before returning to climbing."
        )

    return flags


# Heuristic buckets: likely patterns given the region + mechanism (not a diagnosis)
def bucket_possibilities(i: Intake) -> List[Tuple[str, str]]:
    # Normalize for simple substring checks
    region = i.region.lower()
    out: List[Tuple[str, str]] = []

    # Region-specific common climbing overuse/acute irritation patterns
    if "finger" in region:
        if i.mechanism in {"Hard crimp", "Dynamic catch", "Pocket"}:
            out.append(("Pulley strain/irritation (common)", "Often pain on palm-side of finger, worse with crimping."))
        out.append(("Flexor tendon irritation (common)", "Often tender along tendon, aggravated by repetitive gripping."))
        out.append(("Joint capsule irritation (possible)", "Pain near joint line, may feel stiff."))
    elif "wrist" in region:
        if i.mechanism in {"Hard crimp", "High volume pulling", "Dynamic catch"}:
            out.append(("Wrist flexor tendinopathy (common)", "Overuse from high-volume gripping; tender along wrist crease."))
        out.append(("TFCC irritation (possible)", "Ulnar-side wrist pain, often from rotation, side-pulls, or gastons."))
        out.append(("ECU / extensor tendinopathy (possible)", "Dorsal ulnar wrist pain; aggravated by resisted wrist extension."))
    elif "elbow" in region:
        if i.mechanism in {"High volume pulling", "Steep climbing/board", "Campusing"}:
            out.append(("Elbow tendinopathy-type irritation (common)", "Overuse pattern, worse with gripping/pulling."))
        out.append(("Nerve irritation (possible)", "Consider if tingling/numbness present."))
    elif "shoulder" in region:
        out.append(("Rotator cuff / tendon overload (common)", "Often related to high tension lock-offs and volume."))
        out.append(("Impingement-like irritation (possible)", "Painful arc, overhead discomfort."))
        if i.instability == "Yes":
            out.append(("Instability-related issue (possible)", "History of dislocation or slipping sensations."))
    else:
        out.append(("Overuse / load spike pattern (common)", "Often driven by sudden increases in intensity/volume."))

    # If symptoms are severe and sudden, surface a higher-concern bucket first
    if i.onset == "Sudden" and i.severity >= 7:
        out.insert(0, ("Acute tissue injury (consider evaluation)", "High pain sudden onset can indicate more significant injury."))

    # Keep output short and readable in the UI
    return out[:4]


# Conservative guidance template grouped into UI sections (load management focus)
def conservative_plan(i: Intake) -> Dict[str, List[str]]:
    region = i.region.lower()
    plan: Dict[str, List[str]] = {}

    # Region-specific avoidance cue inserted into the generic plan
    if "finger" in region:
        avoid_specific = "Avoid full crimping, pockets, and dynamic catches on the affected finger(s)."
    elif "wrist" in region:
        avoid_specific = "Avoid side-pulls, gastons, and twisting loads that aggravate wrist symptoms."
    elif "elbow" in region:
        avoid_specific = "Avoid full lock-offs, campus moves, and high-volume pulling that load the elbow."
    elif "shoulder" in region:
        avoid_specific = "Avoid overhead reaching, high lock-offs, and steep/inverted climbing that reproduces pain."
    else:
        avoid_specific = "Avoid movements or grip styles that reproduce your symptoms."

    plan["Immediate next 7–10 days"] = [
        "Reduce climbing intensity and volume; avoid moves that reproduce sharp pain.",
        "Keep pain during activity low (commonly <= 3/10) and avoid pushing through sharp pain.",
        avoid_specific,
        "If symptoms worsen day-to-day despite reduction, consider evaluation.",
    ]

    plan["Return to climbing (progression)"] = [
        "Start with easy sessions that keep symptoms mild during and after.",
        "Increase only one variable at a time (volume OR intensity OR frequency).",
        "If pain spikes or persists >24–48 hours after a session, step back.",
    ]

    plan["What to avoid for now"] = [
        avoid_specific,
        "Max efforts, limit boulders, and repeated high-intensity attempts on the aggravating move.",
        "High-volume steep pulling if elbow or shoulder symptoms are present.",
    ]

    plan["When to get checked"] = [
        "Any red flags (numbness, significant weakness, instability, major bruising/swelling).",
        "Symptoms not improving after ~2–3 weeks of load reduction.",
        "Pain that is severe at rest or progressively worsening.",
    ]

    return plan
