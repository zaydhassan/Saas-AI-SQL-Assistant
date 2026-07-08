"""Business Health Score (the secret, everywhere-visible feature).

Five dimensions — Revenue, Growth, Inventory, Refunds, Retention — each scored
0-100 with a traffic-light status (Healthy >=85, Watch >=60, Critical <60).
The overall score is a weighted average. Computed deterministically from the
user's most recent query results and dataset profiles (no LLM call, so it is
fast and always available); dimensions with no signal fall back to a neutral
score so the widget always renders.

Cached in BusinessHealth with a 6-hour TTL.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from models import Query, DatasetProfile, BusinessHealth

logger = logging.getLogger("health_service")

CACHE_TTL = timedelta(hours=6)

# dimension -> keyword list used to locate relevant columns in query results.
DIMENSION_KEYWORDS = {
    "revenue": ["revenue", "sales", "amount", "price", "total", "income", "gmv"],
    "growth": ["growth", "change", "delta", "increase", "yoy", "mom"],
    "inventory": ["inventory", "stock", "quantity", "qty", "units", "level"],
    "refunds": ["refund", "return", "chargeback", "cancellation"],
    "retention": ["retention", "churn", "repeat", "loyalty", "customer", "active"],
}

DIMENSION_WEIGHTS = {
    "revenue": 0.30,
    "growth": 0.25,
    "inventory": 0.15,
    "refunds": 0.15,
    "retention": 0.15,
}

NEUTRAL_SCORE = 82.0  # fallback when a dimension has no data signal


def _status_for(score: float) -> str:
    if score >= 85:
        return "Healthy"
    if score >= 60:
        return "Watch"
    return "Critical"


def _dot_for(status: str) -> str:
    return {"Healthy": "green", "Watch": "amber", "Critical": "red"}.get(status, "amber")


def _score_from_values(values: list[float], invert: bool = False) -> float | None:
    """Map a numeric series to a 0-100 score via min/max scaling.

    `invert` flips the scale (e.g. refunds: higher is worse).
    Returns None if there's not enough signal.
    """
    if not values:
        return None
    try:
        arr = np.array([float(v) for v in values if v is not None], dtype=float)
    except Exception:
        return None
    arr = arr[np.isfinite(arr)]
    if arr.size == 0:
        return None
    lo, hi = float(arr.min()), float(arr.max())
    if hi - lo < 1e-9:
        # All equal — healthy if positive, neutral otherwise.
        return 80.0 if lo > 0 else 60.0
    latest = float(arr[-1])
    scaled = (latest - lo) / (hi - lo)  # 0..1
    if invert:
        scaled = 1.0 - scaled
    return round(60.0 + scaled * 40.0, 2)  # always lands in 60..100 band


def _dimension_score(name: str, df: pd.DataFrame) -> tuple[float, str, str]:
    keywords = DIMENSION_KEYWORDS[name]
    invert = name == "refunds"
    cols = [c for c in df.columns if any(k in str(c).lower() for k in keywords)]
    values: list[float] = []
    for c in cols:
        try:
            s = pd.to_numeric(df[c], errors="coerce").dropna()
            values.extend(s.tolist())
        except Exception:
            continue
    score = _score_from_values(values, invert=invert)
    if score is None:
        return NEUTRAL_SCORE, _status_for(NEUTRAL_SCORE), "No direct data — neutral estimate."
    return score, _status_for(score), f"Derived from {len(cols)} matching column(s)."


def _latest_result_frame(db: Session, user_id: int) -> pd.DataFrame | None:
    """Most recent successful query result for the user, as a DataFrame."""
    q = (
        db.query(Query)
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .order_by(Query.created_at.desc())
        .first()
    )
    if not q or not isinstance(q.result_json, list) or not q.result_json:
        return None
    try:
        return pd.DataFrame(q.result_json)
    except Exception:
        return None


def compute_health(db: Session, user_id: int, force: bool = False) -> dict[str, Any]:
    """Compute (or return cached) business health for a user."""
    cached = (
        db.query(BusinessHealth)
        .filter(BusinessHealth.user_id == user_id)
        .order_by(BusinessHealth.generated_at.desc())
        .first()
    )
    if cached and not force and (datetime.utcnow() - cached.generated_at.replace(tzinfo=None)) < CACHE_TTL:
        return _serialize(cached)

    df = _latest_result_frame(db, user_id)
    if df is None:
        df = pd.DataFrame()

    dimensions: dict[str, Any] = {}
    weighted_sum = 0.0
    total_weight = 0.0
    for name, weight in DIMENSION_WEIGHTS.items():
        if df is not None and not df.empty:
            score, status, detail = _dimension_score(name, df)
        else:
            score, status, detail = NEUTRAL_SCORE, _status_for(NEUTRAL_SCORE), "No data yet — neutral estimate."
        dimensions[name] = {
            "score": score,
            "status": status,
            "dot": _dot_for(status),
            "detail": detail,
        }
        weighted_sum += score * weight
        total_weight += weight

    overall = round(weighted_sum / total_weight, 2) if total_weight else NEUTRAL_SCORE
    overall_status = _status_for(overall)

    payload = {
        "user_id": user_id,
        "score": overall,
        "dimensions_json": dimensions,
        "overall_status": overall_status,
    }

    if cached:
        for k, v in payload.items():
            setattr(cached, k, v)
        db.commit()
        db.refresh(cached)
        row = cached
    else:
        row = BusinessHealth(**payload)
        db.add(row)
        db.commit()
        db.refresh(row)

    return _serialize(row)


def _serialize(row: BusinessHealth) -> dict[str, Any]:
    return {
        "id": row.id,
        "score": row.score,
        "dimensions": row.dimensions_json or {},
        "overall_status": row.overall_status,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
    }