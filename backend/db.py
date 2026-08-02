"""
db.py

Persistent SQLite storage for analysis logs - replaces the Streamlit
app's in-memory session state (which reset on every browser refresh).
Uses Python's built-in sqlite3, no extra dependency needed.
"""

import sqlite3
import os
import time
from contextlib import contextmanager

DB_PATH = os.environ.get("AI_SOC_DB_PATH", "ai_soc.db")


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                source TEXT NOT NULL,           -- 'text' | 'document' | 'voice' | 'demo' | 'challenge'
                prompt TEXT NOT NULL,
                category TEXT,
                threat_score REAL NOT NULL,
                confidence REAL NOT NULL,
                decision TEXT NOT NULL,
                latency_ms REAL NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp)")


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def insert_log(source, prompt, category, threat_score, confidence, decision, latency_ms):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO logs (timestamp, source, prompt, category, threat_score, confidence, decision, latency_ms) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (time.time(), source, prompt[:2000], category, threat_score, confidence, decision, latency_ms),
        )


def get_logs(limit=200, offset=0):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM logs ORDER BY timestamp DESC LIMIT ? OFFSET ?", (limit, offset)
        ).fetchall()
        return [dict(r) for r in rows]


def get_stats():
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) c FROM logs").fetchone()["c"]
        by_decision = {
            r["decision"]: r["c"]
            for r in conn.execute("SELECT decision, COUNT(*) c FROM logs GROUP BY decision").fetchall()
        }
        avg_conf = conn.execute("SELECT AVG(confidence) a FROM logs").fetchone()["a"] or 0
        avg_latency = conn.execute("SELECT AVG(latency_ms) a FROM logs").fetchone()["a"] or 0
        by_category = {
            r["category"]: r["c"]
            for r in conn.execute(
                "SELECT category, COUNT(*) c FROM logs WHERE category IS NOT NULL AND category != '' "
                "GROUP BY category ORDER BY c DESC"
            ).fetchall()
        }
        return {
            "total": total,
            "safe": by_decision.get("safe", 0),
            "suspicious": by_decision.get("suspicious", 0),
            "blocked": by_decision.get("blocked", 0),
            "avg_confidence": round(avg_conf, 4),
            "avg_latency_ms": round(avg_latency, 1),
            "by_category": by_category,
        }


def reset_logs():
    with get_conn() as conn:
        conn.execute("DELETE FROM logs")
