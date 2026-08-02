"""
main.py - AI-SOC backend API

FastAPI service exposing the detection engine, document/voice analysis,
and MARL network layer as REST endpoints, with persistent SQLite
logging and API-key authentication.

Run with: uvicorn main:app --host 0.0.0.0 --port 8000
(requires AI_SOC_API_KEY environment variable to be set - see auth.py)
"""

import time
import io
import os
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from auth import verify_api_key
from detection_engine import SemanticMatcher, analyze, CATEGORIES
from text_model import TextDefender
from synonym_expansion import find_synonym_matches

# ---------------------------------------------------------------------
# Startup/shutdown: load models once, shared across all requests.
# Uses the modern lifespan context manager, not the deprecated
# @app.on_event("startup") - that older API doesn't reliably fire under
# TestClient unless used as a context manager, which caused a real
# KeyError during testing before this fix.
# ---------------------------------------------------------------------
state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    # On memory-constrained deployments (e.g. Render's free 512MB tier),
    # loading sentence-transformers (which pulls in torch) can exceed
    # available memory before a single request even arrives. Setting
    # AI_SOC_LOW_MEMORY=true skips that and uses the lighter TF-IDF
    # fallback instead - a real trade-off (less accurate semantic
    # similarity), not a workaround that pretends nothing changed.
    low_memory = os.environ.get("AI_SOC_LOW_MEMORY", "false").lower() == "true"
    state["matcher"] = SemanticMatcher(force_fallback=low_memory)
    try:
        state["text_model"] = TextDefender("text_defender.npy", "vectorizer.pkl")
    except Exception:
        state["text_model"] = None
    state["defender"] = None
    state["graph_env"] = None
    yield
    state.clear()


app = FastAPI(title="AI-SOC API", version="1.0", lifespan=lifespan)

# CORS: allow the React frontend (adjust origins for your actual deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's actual domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    text: str
    source: str = "text"  # 'text' | 'demo' | 'challenge'


class AnalyzeResponse(BaseModel):
    classification: str
    threat_score: float
    confidence: float
    matched_category: Optional[str]
    matched_phrase: Optional[str]
    semantic_similarity: float
    regex_hits: dict
    obfuscation_flags: list
    semantic_backend: str
    trained_model_score: Optional[float]
    category_regex_score: float
    obfuscation_score: float
    synonym_score: float
    latency_ms: float


def _run_analysis(text: str, source: str) -> AnalyzeResponse:
    t0 = time.time()
    v = analyze(text, state["matcher"], trained_model=state["text_model"])
    latency_ms = (time.time() - t0) * 1000
    db.insert_log(source, text, v.matched_category, v.threat_score, v.confidence, v.classification, latency_ms)
    return AnalyzeResponse(
        classification=v.classification, threat_score=v.threat_score, confidence=v.confidence,
        matched_category=v.matched_category, matched_phrase=v.matched_phrase,
        semantic_similarity=v.semantic_similarity, regex_hits=v.regex_hits,
        obfuscation_flags=v.obfuscation_flags, semantic_backend=v.semantic_backend,
        trained_model_score=v.trained_model_score, category_regex_score=v.category_regex_score,
        obfuscation_score=v.obfuscation_score, synonym_score=v.synonym_score, latency_ms=latency_ms,
    )


# ---------------------------------------------------------------------
# Health check (no auth - for load balancers / uptime monitors)
# ---------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "text_model_loaded": state.get("text_model") is not None}


# ---------------------------------------------------------------------
# Core analysis endpoints
# ---------------------------------------------------------------------
@app.post("/analyze", response_model=AnalyzeResponse, dependencies=[Depends(verify_api_key)])
def analyze_text(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text cannot be empty")
    return _run_analysis(req.text, req.source)


@app.post("/analyze/document", response_model=AnalyzeResponse, dependencies=[Depends(verify_api_key)])
async def analyze_document(file: UploadFile = File(...)):
    from document_input import extract_text

    class _Wrapper:
        def __init__(self, name, content):
            self.name = name
            self._content = content
        def read(self):
            return self._content

    content = await file.read()
    try:
        text = extract_text(_Wrapper(file.filename, content))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from this file")
    return _run_analysis(text, "document")


@app.post("/analyze/voice", dependencies=[Depends(verify_api_key)])
async def analyze_voice(file: UploadFile = File(...)):
    from voice_input import transcribe_audio_bytes
    content = await file.read()
    try:
        transcript = transcribe_audio_bytes(content)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    if not transcript:
        raise HTTPException(status_code=422, detail="No speech detected in the recording")
    result = _run_analysis(transcript, "voice")
    return {"transcript": transcript, "analysis": result}


# ---------------------------------------------------------------------
# Compare modes
# ---------------------------------------------------------------------
@app.post("/compare", dependencies=[Depends(verify_api_key)])
def compare_modes(req: AnalyzeRequest):
    v = analyze(req.text, state["matcher"], trained_model=state["text_model"])
    keyword_only = max(v.category_regex_score, v.synonym_score, v.obfuscation_score)
    semantic_only = v.semantic_similarity * 0.9
    hybrid = v.threat_score

    def cls_for(score):
        return "blocked" if score >= 0.75 else ("suspicious" if score >= 0.4 else "safe")

    return {
        "keyword_only": {"score": keyword_only, "classification": cls_for(keyword_only)},
        "semantic_only": {"score": semantic_only, "classification": cls_for(semantic_only)},
        "hybrid": {"score": hybrid, "classification": cls_for(hybrid)},
    }


# ---------------------------------------------------------------------
# Logs & analytics
# ---------------------------------------------------------------------
@app.get("/logs", dependencies=[Depends(verify_api_key)])
def get_logs(limit: int = 200, offset: int = 0):
    return db.get_logs(limit=limit, offset=offset)


@app.get("/stats", dependencies=[Depends(verify_api_key)])
def get_stats():
    return db.get_stats()


@app.post("/logs/reset", dependencies=[Depends(verify_api_key)])
def reset_logs():
    db.reset_logs()
    return {"status": "reset"}


# ---------------------------------------------------------------------
# Threat intel / categories (static reference data)
# ---------------------------------------------------------------------
@app.get("/threat-intel", dependencies=[Depends(verify_api_key)])
def threat_intel():
    return {
        "categories": {cat: {"weight": spec["weight"], "pattern_count": len(spec["patterns"])}
                       for cat, spec in CATEGORIES.items()}
    }


# ---------------------------------------------------------------------
# MARL network defense layer
# NOTE: this is a single shared simulation across all API clients, same
# simplification as the Streamlit version - a real multi-tenant version
# would need per-session environments, which is a bigger scope.
# ---------------------------------------------------------------------
@app.post("/marl/upload", dependencies=[Depends(verify_api_key)])
async def marl_upload(file: UploadFile = File(...)):
    from marl_layer import QNet, GraphEnv
    content = await file.read()
    try:
        weights = np.load(io.BytesIO(content), allow_pickle=True).item()
        w1_shape = weights["W1"].shape
        if w1_shape[0] != 15:
            raise HTTPException(
                status_code=400,
                detail=f"Expected a 15-input defender model, got {w1_shape[0]} inputs. "
                       f"This looks like the wrong file (e.g. text_defender.npy instead of defender_final.npy)."
            )
        state["defender"] = QNet(weights)
        state["graph_env"] = GraphEnv(seed=7)
        return {"status": "loaded"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Couldn't load this file: {e}")


@app.get("/marl/state", dependencies=[Depends(verify_api_key)])
def marl_state():
    if state["defender"] is None:
        raise HTTPException(status_code=404, detail="No defender model loaded yet - upload one first")
    env = state["graph_env"]
    return {
        "isolated": list(env.isolated),
        "compromised_idx": env.compromised_idx,
        "injection": env.injection,
        "step": env.t,
        "n_devices": env.n,
    }


@app.post("/marl/tick", dependencies=[Depends(verify_api_key)])
def marl_tick():
    if state["defender"] is None:
        raise HTTPException(status_code=404, detail="No defender model loaded yet - upload one first")
    from marl_layer import tick
    action = tick(state["defender"], state["graph_env"], force_attack=False)
    return {"action": action, "state": marl_state()}
