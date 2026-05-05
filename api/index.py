"""Vercel serverless entrypoint.

Vercel auto-detects this file as a Python function and routes incoming
requests to it (see vercel.json). The FastAPI app lives in backend/, so
we extend sys.path before importing it.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402  (import after sys.path tweak)

__all__ = ["app"]
