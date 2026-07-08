"""Thin wrappers over gemini_client so domain services stay Gemini-agnostic.

`generate_sql` reuses the legacy `generate_text` (model gemini-pro) so the
existing /ask SQL-generation behaviour is byte-identical. New structured /
streaming features go through generate_json / generate_text_stream.
"""
from __future__ import annotations

from typing import Optional

import gemini_client


# Keywords that must never appear in generated SQL (mirrors the /ask guard).
_BANNED = ["delete ", "update ", "insert ", "drop ", "alter ", "truncate ", "create "]


def generate_sql(prompt: str) -> str:
    """Generate a SQL string from a prompt using the legacy text model.

    Strips markdown code fences exactly like the original /ask path.
    Raises ValueError if the generated SQL contains a banned keyword.
    """
    sql = gemini_client.generate_text(prompt).replace("```sql", "").replace("```", "").strip()
    if any(b in sql.lower() for b in _BANNED):
        raise ValueError("Unsafe SQL generated")
    return sql


def generate_insight_json(prompt: str, schema: Optional[dict] = None) -> dict:
    """Structured JSON generation for insight/health/briefing/dataset reports."""
    return gemini_client.generate_json(prompt, schema=schema)


async def generate_stream(prompt: str):
    """Streaming text generation (async generator)."""
    async for chunk in gemini_client.generate_text_stream(prompt):
        yield chunk