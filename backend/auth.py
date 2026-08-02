"""
auth.py

Simple API-key authentication. Not a full user/OAuth system - that's a
bigger scope than this project needs right now - but real: requests
without a valid key are rejected, not just decoratively checked.

The key is read from an environment variable so it's never hardcoded
into source control. Generate one with:
    python3 -c "import secrets; print(secrets.token_hex(32))"
and set it as the AI_SOC_API_KEY environment variable before running
the server.
"""

import os
from fastapi import Header, HTTPException

API_KEY = os.environ.get("AI_SOC_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "AI_SOC_API_KEY environment variable is not set. Generate one with:\n"
        "  python3 -c \"import secrets; print(secrets.token_hex(32))\"\n"
        "then set it before starting the server, e.g.:\n"
        "  export AI_SOC_API_KEY=<your generated key>   (Linux/Mac)\n"
        "  set AI_SOC_API_KEY=<your generated key>       (Windows cmd)\n"
        "  $env:AI_SOC_API_KEY=\"<your generated key>\"    (PowerShell)"
    )


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return True
