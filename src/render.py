from __future__ import annotations

from typing import List, Tuple

from .triage import Intake


# Convert structured Intake data into a single text query for KB retrieval
def build_query(i: Intake) -> str:
    # Include all key intake fields so retrieval captures full context
    parts = [
        f"region: {i.region}",
        f"onset: {i.onset}",
        f"pain_type: {i.pain_type}",
        f"severity: {i.severity}/10",
        f"swelling: {i.swelling}",
        f"bruising: {i.bruising}",
        f"numbness: {i.numbness}",
        f"weakness: {i.weakness}",
        f"instability: {i.instability}",
        f"mechanism: {i.mechanism}",
        f"notes: {i.free_text}",
    ]
    # Join fields into one searchable string for TF-IDF matching
    return " | ".join(parts)


# Format retrieved DocChunk results into readable citation strings for the UI
def format_citations(results: List[Tuple[object, float]]) -> List[str]:
    # Each result contains a document chunk and its similarity score
    cites: List[str] = []
    for chunk, score in results:
        cites.append(f"{chunk.source} (relevance {score:.2f})")
    # Return list of citation strings (filename + relevance)
    return cites