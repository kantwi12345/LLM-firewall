# AI-SOC — Production Architecture

A FastAPI backend + React frontend rebuild of the Streamlit AI-SOC
prototype, built for you to keep developing after your defense. Same
real, tested detection logic underneath — different, more
production-shaped architecture around it.

## Architecture

```
frontend/  React + Vite, dark SOC theme, talks to the backend over HTTP
backend/   FastAPI, wraps detection_engine.py / text_model.py /
           marl_layer.py / document_input.py / voice_input.py
           (the same modules from the Streamlit version)
           + SQLite for persistent logging
           + API-key authentication
```

## Quick start (local development, no Docker)

**Backend:**
```
cd backend
pip install -r requirements.txt
python3 -c "import secrets; print(secrets.token_hex(32))"   # generate a key
export AI_SOC_API_KEY=<paste the generated key>              # Linux/Mac
# $env:AI_SOC_API_KEY="<paste the generated key>"            # PowerShell
uvicorn main:app --reload --port 8000
```

**Frontend** (separate terminal):
```
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173), paste your
API key into the sidebar, and it's live.

## Quick start (Docker)

```
cp .env.example .env
# edit .env: paste in a generated API key
docker compose up --build
```

Frontend on http://localhost, backend on http://localhost:8000.

**Honest caveat**: I could not test the actual `docker build` /
`docker compose up` process in this environment — Docker itself isn't
available here. Both Dockerfiles use standard, carefully-reviewed
patterns, and the underlying Python/React code is fully tested (see
below), but the Docker layer specifically hasn't been run end-to-end.
**Test this yourself early**, before you're relying on it for anything
important - if something's off, it's most likely a small Dockerfile
path/permission issue, not the underlying application logic.

## What's genuinely tested, and how

**Backend (18/18 automated checks pass)**, via `backend/test_api.py`
using FastAPI's official TestClient:
- Auth rejection (missing key, wrong key)
- Text analysis (malicious, safe, empty input, synonym-expansion catch, OS command injection)
- Document analysis (a real generated PDF with a hidden injected instruction)
- Compare modes, logs, stats, reset, threat intel
- MARL upload validation (wrong file correctly rejected with a clear error)

**Full stack, real browser (9/9 checks pass)**, via
`integration_test.py` using Playwright - this is not a unit test, it's
an actual headless Chromium browser loading the real page, typing into
real text boxes, clicking real buttons, and reading real results off
the screen, talking to a real running backend the whole way through:
- Page loads, API key entry works
- Live Firewall: malicious prompt correctly blocked, safe prompt
  correctly verified, Clear button empties the textarea
- Demo mode, Compare Modes, Analytics, and Threat Intel tabs all load
  and render without errors
- Zero browser console errors across the entire session

Rerun both any time you change something:
```
cd backend && python3 test_api.py
python3 integration_test.py   # needs both backend and a running frontend (see below)
```

To rerun the integration test manually:
```
cd backend && AI_SOC_API_KEY=test-key uvicorn main:app --port 8000 &
cd frontend && npm run build && npx vite preview --port 4173 &
python3 integration_test.py
```

## Two real bugs found and fixed while building this

1. **FastAPI's deprecated `@app.on_event("startup")`** doesn't reliably
   fire under TestClient unless used as a context manager - caused a
   real `KeyError` during testing. Fixed by switching to the modern
   `lifespan` context manager pattern.
2. **`document_input.py`'s PDF reading** passed the raw uploaded-file
   object directly to `PdfReader`, which needs `.seek()` - this worked
   by accident with Streamlit's `UploadedFile` (which happens to
   support seek) but broke immediately with a plain file-like wrapper
   in the API context. Fixed by wrapping bytes in `io.BytesIO()`
   properly - and backported the same fix to the Streamlit version,
   which had the identical latent fragility.

## What's different from the Streamlit version (and why it matters)

- **Persistent logging** (SQLite) instead of in-memory session state -
  logs now survive a restart and aren't tied to one browser tab.
- **Real authentication** - the Streamlit version had none; this
  rejects any request without a valid API key.
- **Separated concerns** - the detection logic is now callable
  independently of any UI, meaning you could point a completely
  different frontend (or a real LLM/IoT pipeline) at the same API.
- **CORS configured but wide open** (`allow_origins=["*"]`) - fine for
  development, but tighten this to your actual frontend's domain
  before any real deployment (see the comment in `main.py`).

## What this still isn't

Same honest caveat as the Streamlit version: this remains a research
prototype's detection logic wrapped in more production-shaped
infrastructure. Real production deployment would still need: a
stronger base classifier (this project's own testing showed the
current TF-IDF classifier generalizes to genuinely novel phrasing only
~64-71% of the time), independent red-teaming, rate limiting (not yet
implemented), and testing against real (not synthetic) traffic. The
infrastructure around the detection logic is now real; the detection
logic's own accuracy ceiling hasn't changed.

## Generating a new API key later

```
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Update `AI_SOC_API_KEY` wherever it's set (`.env` for Docker, your
shell environment for local dev) and restart the backend.
