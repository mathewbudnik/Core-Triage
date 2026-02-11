from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Dict

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


 # Represents a single knowledge-base document (filename + full text)
@dataclass(frozen=True)
class DocChunk:
    source: str
    text: str


 # Load all markdown files from the KB directory into DocChunk objects
def load_kb(kb_dir: str = "kb") -> List[DocChunk]:
    chunks: List[DocChunk] = []
    # Iterate over all .md files in the KB folder (sorted for consistency)
    for p in sorted(Path(kb_dir).glob("*.md")):
        text = p.read_text(encoding="utf-8").strip()
        # Skip empty files to avoid noise in retrieval
        if not text:
            continue
        # Store filename as source for later citation
        chunks.append(DocChunk(source=p.name, text=text))
    return chunks


 # Simple TF-IDF based retriever used for lightweight RAG
class TfidfRetriever:
    def __init__(self, chunks: List[DocChunk]):
        # Store original document chunks for later lookup
        self.chunks = chunks
        # Convert text into TF-IDF vectors (limit features for speed)
        self.vectorizer = TfidfVectorizer(stop_words="english", max_features=8000)
        # Precompute document-term matrix for cosine similarity search
        self.matrix = self.vectorizer.fit_transform([c.text for c in chunks])

    # Return top-k most similar KB chunks for a given query string
    def query(self, q: str, k: int = 4) -> List[Tuple[DocChunk, float]]:
        # Guard against empty or whitespace-only queries
        if not q.strip():
            return []
        # Vectorize the user query using the same TF-IDF model
        qv = self.vectorizer.transform([q])
        # Compute cosine similarity between query and all KB docs
        sims = cosine_similarity(qv, self.matrix).flatten()
        # Get indices of top-k highest similarity scores
        idxs = sims.argsort()[::-1][:k]
        # Return matching DocChunk objects along with similarity score
        return [(self.chunks[i], float(sims[i])) for i in idxs]