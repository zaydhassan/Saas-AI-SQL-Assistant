"""AI Business Insight Engine (Feature 1).

After every successful SQL query, produce:
- `analysis`: deterministic statistics computed from the result rows with pandas
  (no LLM) — row count, per-numeric-column mean/max/min/sum, cardinality.
- `insights`: LLM-structured executive read-out — executive summary, trend,
  percentage growth, business meaning, risks, opportunities, recommendations.
- `explanation`: plain-language explanation of what the SQL does and what the
  answer means.

LLM calls are wrapped so a Gemini failure degrades gracefully (the query still
succeeds; insights fall back to a deterministic stub) — /ask never 500s because
of the insight step.
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

from services import ai_service

logger = logging.getLogger("insight_service")


# Strict schema for the structured LLM insight output.
INSIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "executive_summary": {"type": "string"},
        "trend_detection": {"type": "string"},
        "percentage_growth": {
            "type": "object",
            "properties": {
                "value": {"type": "number"},
                "direction": {"type": "string"},
                "metric": {"type": "string"},
            },
        },
        "business_meaning": {"type": "string"},
        "risks": {"type": "array", "items": {"type": "string"}},
        "opportunities": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "executive_summary",
        "trend_detection",
        "business_meaning",
        "risks",
        "opportunities",
        "recommendations",
    ],
}


def _safe_number(v: Any) -> Any:
    """JSON-safe rounding for numpy/pandas scalars."""
    if v is None:
        return None
    try:
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating,)):
            f = float(v)
            return None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
        if isinstance(v, float):
            return None if (np.isnan(v) or np.isinf(v)) else round(v, 4)
    except Exception:
        return None
    return v


def compute_analysis(rows: list[dict]) -> dict[str, Any]:
    """Deterministic statistical analysis of result rows (no LLM)."""
    row_count = len(rows) if isinstance(rows, list) else 0
    if row_count == 0:
        return {"rows": 0, "columns": [], "numeric_stats": [], "mean": None, "max": None}

    df = pd.DataFrame(rows)
    columns = []
    for col in df.columns:
        s = df[col]
        columns.append(
            {
                "name": str(col),
                "dtype": str(s.dtype),
                "cardinality": int(s.nunique(dropna=True)),
                "missing": int(s.isna().sum()),
                "missing_pct": round(float(s.isna().mean()) * 100, 2) if len(s) else 0.0,
            }
        )

    numeric_stats = []
    first_numeric = None
    for col in df.select_dtypes(include=[np.number]).columns:
        s = df[col].dropna()
        stat = {
            "column": str(col),
            "mean": _safe_number(s.mean()),
            "min": _safe_number(s.min()),
            "max": _safe_number(s.max()),
            "sum": _safe_number(s.sum()),
            "std": _safe_number(s.std()),
        }
        numeric_stats.append(stat)
        if first_numeric is None:
            first_numeric = stat

    # Backward-compatible top-level fields the existing AskPanel already reads.
    return {
        "rows": row_count,
        "columns": columns,
        "numeric_stats": numeric_stats,
        "mean": first_numeric["mean"] if first_numeric else None,
        "max": first_numeric["max"] if first_numeric else None,
    }


def _compact_summary(rows: list[dict], analysis: dict[str, Any], limit: int = 8) -> str:
    """Build a token-bounded summary of rows for the LLM prompt."""
    sample = rows[:limit]
    header = ", ".join(c["name"] for c in analysis.get("columns", [])[:12])
    lines = []
    for r in sample:
        vals = ", ".join(f"{k}={v}" for k, v in list(r.items())[:8])
        lines.append(vals)
    numeric = "; ".join(
        f"{s['column']}: mean={s['mean']}, max={s['max']}, min={s['min']}, sum={s['sum']}"
        for s in analysis.get("numeric_stats", [])[:6]
    )
    return f"Columns: {header}\nRow count: {analysis.get('rows')}\nNumeric stats: {numeric}\nSample rows:\n" + "\n".join(lines)


def _fallback_insights(question: str, analysis: dict[str, Any]) -> dict[str, Any]:
    mean = analysis.get("mean")
    mx = analysis.get("max")
    return {
        "executive_summary": f"Query '{question}' returned {analysis.get('rows')} rows.",
        "trend_detection": "Trend analysis unavailable (AI offline).",
        "percentage_growth": {"value": 0.0, "direction": "flat", "metric": "n/a"},
        "business_meaning": (
            f"Key metric averages {mean} with a maximum of {mx}." if mean is not None else "No numeric metric available."
        ),
        "risks": ["Insight engine temporarily unavailable — review data manually."],
        "opportunities": [],
        "recommendations": ["Re-run this query later to get full AI insights."],
    }


def generate_insights(
    question: str,
    sql: str,
    rows: list[dict],
    schema_desc: str,
) -> dict[str, Any]:
    """Return {analysis, explanation, insights}. Never raises."""
    analysis = compute_analysis(rows)

    try:
        summary = _compact_summary(rows, analysis)
        prompt = (
            "You are a senior business analyst AI embedded in a BI Copilot.\n"
            "Given a user's question, the SQL that answered it, the table schema, and a\n"
            "compact statistical summary of the result rows, produce an executive read-out.\n\n"
            f"User question: {question}\n"
            f"SQL: {sql}\n"
            f"Schema: {schema_desc}\n"
            f"Result summary:\n{summary}\n\n"
            "Be specific and quantitative. If growth can be inferred, give a percentage and\n"
            "direction (up/down/flat). Risks and opportunities must be concrete and tied to\n"
            "the data. Recommendations must be actionable business next-steps."
        )
        insights = ai_service.generate_insight_json(prompt, schema=INSIGHT_SCHEMA)
        # Normalise optional fields.
        insights.setdefault("percentage_growth", {"value": 0.0, "direction": "flat", "metric": "n/a"})
        insights.setdefault("risks", [])
        insights.setdefault("opportunities", [])
        insights.setdefault("recommendations", [])
    except Exception as exc:
        logger.warning("Insight LLM call failed (%s); using fallback.", exc)
        insights = _fallback_insights(question, analysis)

    # Short, separate explanation of the SQL + answer (cheap, text model via JSON).
    explanation = _generate_explanation(question, sql, analysis)

    return {"analysis": analysis, "explanation": explanation, "insights": insights}


def _generate_explanation(question: str, sql: str, analysis: dict[str, Any]) -> str:
    try:
        prompt = (
            "In 2-3 plain sentences, explain to a non-technical executive what this SQL does\n"
            "and what the result means in business terms. No jargon, no code.\n\n"
            f"Question: {question}\nSQL: {sql}\nRows returned: {analysis.get('rows')}\n"
        )
        out = ai_service.generate_insight_json(prompt)
        # generate_json returns a dict; pull a text field out if present.
        for k in ("explanation", "text", "summary", "answer"):
            if k in out and isinstance(out[k], str):
                return out[k]
        # If the model returned a single-string JSON, coerce.
        if len(out) == 1:
            return next(iter(out.values()))
        return " ".join(str(v) for v in out.values())[:400]
    except Exception as exc:
        logger.warning("Explanation LLM call failed (%s).", exc)
        return f"This query answers '{question}' and returned {analysis.get('rows')} rows."