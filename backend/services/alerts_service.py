"""Alerts (Phase 2): user-defined metric alerts with a trigger condition.

CRUD plus `evaluate_alerts`, which inspects the user's recent query results for
the alert's metric and fires an AlertEvent + Notification when the condition is
crossed. Evaluation is enqueued as a background task after each successful
/ask, so alerts feel live without coupling the query path to alert logic.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from models import Alert, AlertEvent, Query
from services import notifications_service

logger = logging.getLogger("alerts_service")

THROTTLE = timedelta(hours=1)


def _serialize(a: Alert) -> dict[str, Any]:
    return {
        "id": a.id,
        "name": a.name,
        "metric": a.metric,
        "condition": a.condition,
        "channel": a.channel,
        "active": a.active,
        "last_triggered": a.last_triggered.isoformat() if a.last_triggered else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def list_alerts(db: Session, user_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(Alert)
        .filter(Alert.user_id == user_id)
        .order_by(Alert.created_at.desc())
        .all()
    )
    return [_serialize(a) for a in rows]


def create_alert(db: Session, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    a = Alert(
        user_id=user_id,
        name=payload.get("name", "Untitled alert"),
        metric=payload.get("metric", "revenue"),
        condition=payload.get("condition", "drops > 10%"),
        channel=payload.get("channel", "in-app"),
        active=payload.get("active", True),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _serialize(a)


def update_alert(db: Session, user_id: int, alert_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if not a:
        return None
    for k in ("name", "metric", "condition", "channel", "active"):
        if k in payload:
            setattr(a, k, payload[k])
    db.commit()
    db.refresh(a)
    return _serialize(a)


def delete_alert(db: Session, user_id: int, alert_id: int) -> bool:
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if not a:
        return False
    db.delete(a)
    db.commit()
    return True


def list_events(db: Session, user_id: int, alert_id: int) -> list[dict[str, Any]] | None:
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if not a:
        return None
    rows = (
        db.query(AlertEvent)
        .filter(AlertEvent.alert_id == alert_id)
        .order_by(AlertEvent.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": e.id,
            "payload": e.payload,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in rows
    ]


# ---- evaluation ----------------------------------------------------------

_CONDITION_RE = re.compile(
    r"(drops|drop|decline|below|spike|rise|rises|above|increase)\D*(\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
_DOWN_WORDS = {"drops", "drop", "decline", "below"}


def _parse_condition(condition: str) -> tuple[str | None, float]:
    """Return (direction 'up'|'down'|None, threshold_pct)."""
    m = _CONDITION_RE.search(condition or "")
    if not m:
        return None, 0.0
    word, num = m.group(1).lower(), float(m.group(2))
    direction = "down" if word in _DOWN_WORDS else "up"
    return direction, num


def _latest_series_for_metric(db: Session, user_id: int, metric: str) -> list[float] | None:
    """Find a numeric column matching the metric in the user's recent successful
    queries and return its values as a series (most-recent-last)."""
    recent = (
        db.query(Query)
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .order_by(Query.created_at.desc())
        .limit(10)
        .all()
    )
    keyword = (metric or "").lower()
    for q in recent:
        rows = q.result_json if isinstance(q.result_json, list) else []
        if not rows:
            continue
        try:
            df = pd.DataFrame(rows)
        except Exception:
            continue
        # Prefer a numeric column whose name mentions the metric.
        numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        matches = [c for c in numeric_cols if keyword and keyword in str(c).lower()]
        col = matches[0] if matches else (numeric_cols[0] if numeric_cols else None)
        if col is None:
            continue
        series = pd.to_numeric(df[col], errors="coerce").dropna().tolist()
        if len(series) >= 2:
            return [float(v) for v in series]
    return None


def evaluate_alerts(db: Session, user_id: int) -> int:
    """Check every active alert; fire on threshold cross. Returns fire count."""
    fired = 0
    alerts = db.query(Alert).filter(Alert.user_id == user_id, Alert.active.is_(True)).all()
    if not alerts:
        return 0

    # Cache series per metric to avoid recomputing across alerts.
    series_cache: dict[str, list[float] | None] = {}

    for a in alerts:
        direction, threshold = _parse_condition(a.condition)
        if direction is None:
            continue

        if a.metric not in series_cache:
            series_cache[a.metric] = _latest_series_for_metric(db, user_id, a.metric)
        series = series_cache[a.metric]
        if not series or len(series) < 2:
            continue

        prev, latest = series[-2], series[-1]
        if prev == 0:
            continue
        pct = ((latest - prev) / abs(prev)) * 100.0  # +ve = up, -ve = down
        crossed = (direction == "up" and pct >= threshold) or (direction == "down" and pct <= -threshold)
        if not crossed:
            continue

        # Throttle: don't refire the same alert within THROTTLE.
        if a.last_triggered and (datetime.utcnow() - a.last_triggered.replace(tzinfo=None)) < THROTTLE:
            continue

        payload = {
            "alert_id": a.id,
            "alert_name": a.name,
            "metric": a.metric,
            "condition": a.condition,
            "previous": round(prev, 4),
            "latest": round(latest, 4),
            "delta_pct": round(pct, 2),
            "direction": direction,
        }
        db.add(AlertEvent(alert_id=a.id, payload=payload))
        a.last_triggered = datetime.utcnow()
        notifications_service.create_notification(
            db,
            user_id,
            title=f"Alert triggered: {a.name}",
            body=f"{a.metric} {direction} {abs(round(pct,2))}% (now {round(latest,2)}).",
            type="alert",
        )
        fired += 1

    if fired:
        db.commit()
    return fired


def run_background_evaluation(user_id: int) -> None:
    """Background-task entrypoint with its own session."""
    from db import SessionLocal
    db = SessionLocal()
    try:
        evaluate_alerts(db, user_id)
    except Exception as exc:
        logger.error("Background alert evaluation failed for user %s: %s", user_id, exc)
    finally:
        db.close()