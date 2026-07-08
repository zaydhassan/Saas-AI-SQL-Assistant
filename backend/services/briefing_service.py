"""AI Daily Briefing (Feature 3) — the "AI CEO Dashboard" shown on login.

Generates a once-per-day executive brief for the user:
- Greeting ("Good morning, {name}") based on local hour.
- Yesterday's KPI deltas (revenue, orders, refunds, customers) derived from the
  user's recent query results, each with a value + ↑/↓/flat change.
- Top alert (most recent firing, else most recent active alert).
- Today's recommendations (pulled from the latest AI insight, fallback generic).
- Business Health Score (reuses health_service).
- Data Quality Score (reuses the latest DatasetProfile).
- AI confidence (heuristic from data coverage).

Cached in Briefing by date; regenerated once per day or on force=true.
"""
from __future__ import annotations

import logging
from datetime import datetime, date
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from models import (
    User, Query, QueryInsight, DatasetProfile, Alert, AlertEvent, Briefing,
)
from services import health_service
from services import ai_service

logger = logging.getLogger("briefing_service")

KPI_METRICS = [
    ("revenue", "Revenue", ["revenue", "sales", "amount", "total", "income", "gmv"]),
    ("orders", "Orders", ["orders", "order_count", "transactions", "qty", "units"]),
    ("refunds", "Refunds", ["refund", "return", "chargeback"]),
    ("customers", "Customers", ["customer", "users", "active", "retention"]),
]


def _greeting(name: str | None) -> str:
    h = datetime.now().hour
    if h < 12:
        period = "Good morning"
    elif h < 18:
        period = "Good afternoon"
    else:
        period = "Good evening"
    return f"{period}, {name or 'there'}"


def _kpi_deltas(db: Session, user_id: int) -> tuple[list[dict[str, Any]], int]:
    """Build KPI delta cards from recent query results. Returns (kpis, hits)."""
    recent = (
        db.query(Query)
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .order_by(Query.created_at.desc())
        .limit(12)
        .all()
    )

    kpis: list[dict[str, Any]] = []
    hits = 0
    for key, label, keywords in KPI_METRICS:
        value = None
        delta = None
        direction = "flat"
        for q in recent:
            rows = q.result_json if isinstance(q.result_json, list) else []
            if not rows:
                continue
            try:
                df = pd.DataFrame(rows)
            except Exception:
                continue
            numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
            col = next((c for c in numeric if any(k in str(c).lower() for k in keywords)), None)
            if col is None:
                continue
            series = pd.to_numeric(df[col], errors="coerce").dropna().tolist()
            if not series:
                continue
            # Use the most recent value; if a series exists, delta vs previous.
            latest = float(series[-1])
            value = round(latest, 2)
            if len(series) >= 2 and series[-2] != 0:
                pct = ((latest - float(series[-2])) / abs(float(series[-2]))) * 100.0
                delta = round(pct, 1)
                direction = "up" if pct > 0.5 else "down" if pct < -0.5 else "flat"
            hits += 1
            break

        kpis.append({
            "key": key,
            "label": label,
            "value": value,
            "delta": delta,
            "direction": direction,
            "has_data": value is not None,
        })
    return kpis, hits


def _top_alert(db: Session, user_id: int) -> dict[str, Any] | None:
    evt = (
        db.query(AlertEvent, Alert)
        .join(Alert, AlertEvent.alert_id == Alert.id)
        .filter(Alert.user_id == user_id)
        .order_by(AlertEvent.created_at.desc())
        .first()
    )
    if evt:
        e, a = evt
        return {
            "name": a.name,
            "metric": a.metric,
            "condition": a.condition,
            "payload": e.payload,
            "fired_at": e.created_at.isoformat() if e.created_at else None,
        }
    a = db.query(Alert).filter(Alert.user_id == user_id, Alert.active.is_(True)).order_by(Alert.created_at.desc()).first()
    if a:
        return {"name": a.name, "metric": a.metric, "condition": a.condition, "payload": None, "fired_at": None}
    return None


def _recommendations(db: Session, user_id: int) -> list[str]:
    ins = (
        db.query(QueryInsight)
        .join(Query, QueryInsight.query_id == Query.id)
        .filter(Query.user_id == user_id)
        .order_by(QueryInsight.generated_at.desc())
        .first()
    )
    if ins and isinstance(ins.insights_json, dict):
        recs = ins.insights_json.get("recommendations") or []
        if isinstance(recs, list) and recs:
            return [str(r) for r in recs[:4]]
    return [
        "Review your top-performing segments and double down on what's working.",
        "Check data quality scores on your datasets and clean any flagged columns.",
        "Set up an alert on your key metric so you're notified of sudden changes.",
    ]


def _ai_confidence(db: Session, user_id: int, kpi_hits: int, has_profile: bool, health_from_data: bool) -> float:
    conf = 0.55
    queries_with_data = (
        db.query(Query)
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .count()
    )
    if has_profile:
        conf += 0.1
    conf += min(kpi_hits, 4) * 0.05
    if queries_with_data >= 5:
        conf += 0.08
    if health_from_data:
        conf += 0.05
    return round(min(conf, 0.97), 2)


def _briefing_text(kpis: list[dict[str, Any]], top_alert: dict[str, Any] | None) -> str:
    parts = []
    for k in kpis:
        if k["has_data"]:
            arrow = {"up": "up", "down": "down", "flat": "flat"}[k["direction"]]
            d = f"{('+' if k['delta'] and k['delta'] > 0 else '')}{k['delta']}% {arrow}" if k["delta"] is not None else "flat"
            parts.append(f"{k['label']} is {k['value']} ({d})")
    if top_alert:
        parts.append(f"Top alert: {top_alert['name']}")
    if not parts:
        return "Connect a dataset and ask your first question to unlock your daily brief."
    return "Here's your business at a glance — " + ", ".join(parts[:3]) + "."


def generate_briefing(db: Session, user: User, force: bool = False) -> dict[str, Any]:
    today = date.today()
    cached = (
        db.query(Briefing)
        .filter(Briefing.user_id == user.id, Briefing.date == today)
        .first()
    )
    # Serve cache unless forced. (date bucket == today => same-day cache is fine)
    if cached and not force:
        return _serialize(cached, user)

    kpis, hits = _kpi_deltas(db, user.id)
    top_alert = _top_alert(db, user.id)
    recommendations = _recommendations(db, user.id)

    # Health (reuses cached health with TTL; force only if no data yet).
    try:
        health = health_service.compute_health(db, user.id)
    except Exception:
        health = {"score": None, "dimensions": {}, "overall_status": None}
    health_from_data = any(
        "No direct data" not in (d.get("detail") or "") and "No data yet" not in (d.get("detail") or "")
        for d in (health.get("dimensions") or {}).values()
    )

    # Latest data quality score (user's most recent dataset profile).
    from models import Dataset
    latest_profile = (
        db.query(DatasetProfile)
        .join(Dataset, DatasetProfile.dataset_id == Dataset.id)
        .filter(Dataset.user_id == user.id)
        .order_by(DatasetProfile.generated_at.desc())
        .first()
    )
    data_quality_score = latest_profile.data_quality_score if latest_profile else None

    ai_confidence = _ai_confidence(db, user.id, hits, latest_profile is not None, health_from_data)
    summary = _briefing_text(kpis, top_alert)

    briefing_payload = {
        "greeting": _greeting(user.name),
        "summary": summary,
        "kpis": kpis,
        "top_alert": top_alert,
        "recommendations": recommendations,
        "health_score": health.get("score"),
        "health_overall_status": health.get("overall_status"),
        "health_dimensions": health.get("dimensions"),
        "data_quality_score": data_quality_score,
        "ai_confidence": ai_confidence,
        "date": today.isoformat(),
    }

    if cached:
        cached.briefing_json = briefing_payload
        cached.health_score = health.get("score")
        cached.data_quality_score = data_quality_score
        cached.ai_confidence = ai_confidence
        db.commit()
        db.refresh(cached)
        row = cached
    else:
        row = Briefing(
            user_id=user.id,
            date=datetime.combine(today, datetime.min.time()),
            briefing_json=briefing_payload,
            health_score=health.get("score"),
            data_quality_score=data_quality_score,
            ai_confidence=ai_confidence,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    # Push a briefing notification once per day (idempotent: only when freshly generated).
    if not cached:
        try:
            from services import notifications_service
            notifications_service.create_notification(
                db, user.id, title="Your daily briefing is ready",
                body=summary[:160], type="briefing",
            )
        except Exception:
            pass

    return _serialize(row, user)


def _serialize(row: Briefing, user: User) -> dict[str, Any]:
    payload = row.briefing_json or {}
    return {
        "id": row.id,
        "greeting": payload.get("greeting", _greeting(user.name)),
        "summary": payload.get("summary"),
        "kpis": payload.get("kpis", []),
        "top_alert": payload.get("top_alert"),
        "recommendations": payload.get("recommendations", []),
        "health_score": row.health_score if row.health_score is not None else payload.get("health_score"),
        "health_overall_status": payload.get("health_overall_status"),
        "health_dimensions": payload.get("health_dimensions"),
        "data_quality_score": row.data_quality_score if row.data_quality_score is not None else payload.get("data_quality_score"),
        "ai_confidence": row.ai_confidence if row.ai_confidence is not None else payload.get("ai_confidence"),
        "date": payload.get("date"),
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
    }