"""
embedding_text_model.py

Drop-in replacement for text_model.TextDefender, using real sentence
embeddings instead of TF-IDF. Matches the exact same interface
(predict_proba(text) -> float) so it plugs into detection_engine.py's
analyze() function with zero changes needed there - just swap which
object gets passed in as trained_model.

Requires text_defender_embed.npy (produced by embed_train.py, run on a
machine with internet access - see that file's docstring).
"""

import numpy as np


class EmbeddingTextDefender:
    def __init__(self, npy_path="text_defender_embed.npy"):
        weights = np.load(npy_path, allow_pickle=True).item()
        self.W1 = weights["W1"]
        self.b1 = weights["b1"]
        self.W2 = weights["W2"]
        self.b2 = weights["b2"]
        self.embedding_model_name = weights["embedding_model"]

        from sentence_transformers import SentenceTransformer
        self.embedder = SentenceTransformer(self.embedding_model_name)

    def _forward(self, x):
        h = np.maximum(0, x @ self.W1 + self.b1)
        out = h @ self.W2 + self.b2
        return 1 / (1 + np.exp(-out[0]))

    def predict_proba(self, text: str) -> float:
        x = self.embedder.encode([text], convert_to_numpy=True)[0]
        return float(self._forward(x))
