"""Executive Command Center (Feature 10).

The premium post-login homepage: a single aggregated snapshot of the whole
business. Reuses every prior phase — Business Health, KPI deltas, Smart Alerts,
Forecasts, Recommendations, Generated Reports, Dataset Intelligence — and
condenses them into scores, a weather-like status, a live activity timeline,
and an AI executive summary.

Cached in the `command_center` table with a ~5 min TTL. The AI summary uses
`ai_service.generate_insight_json` (or `generate_text`) and degrades to a
deterministic stub on Gemini failure (429/timeout) so the endpoint never 500s.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from models import (
    CommandCenter, DatasetProfile, GeneratedReport, Query, Recommendation,
    SmartAlert, SmartAlertEvent, User,
)
from services import (
    ai_service, briefing_service, forecast_service, health_service,
    recommendation_service, smart_alert_service,
)

logger = logging.getLogger("executive_service")

TTL = timedelta(minutes=5)

SUMMARY_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},          # 2-3 sentence executive read-out
        "headline": {"type": "string"},          # one-line status
    },
    "required": ["summary", "headline"],
}


# ---------------------------------------------------------------------------
# Score derivation
# ---------------------------------------------------------------------------

def _dim_score(health: dict[str, Any], name: str) -> float | None:
    dim = (health.get("dimensions") or {}).get(name)
    if isinstance(dim, dict) and isinstance(dim.get("score"), (int, float)):
        return round(float(dim["score"]), 1)
    return None


def _risk_score(health: dict[str, Any], critical_alerts: int, weak_dims: int) -> float:
    """0-100; higher = more risk."""
    base = 0.0
    for name in ("refunds", "retention", "inventory"):
        s = _dim_score(health, name)
        if s is not None:
            base += max(0.0, (70 - s)) * 0.4
    base += critical_alerts * 12
    base += weak_dims * 6
    return round(min(100.0, base), 1)


def _weather(health_score: float | None, critical_alerts: int) -> str:
    h = health_score if health_score is not None else 50
    if h < 50 or critical_alerts >= 3:
        return "Critical"
    if h < 65 or critical_alerts >= 1:
        return "Warning"
    if h < 80:
        return "Stable"
    return "Healthy"


WEATHER_STYLE = {
    "Healthy": {"color": "#22c55e", "label": "Healthy"},
    "Stable": {"color": "#3b82f6", "label": "Stable"},
    "Warning": {"color": "#f59e0b", "label": "Warning"},
    "Critical": {"color": "#ef4444", "label": "Critical"},
}


# ---------------------------------------------------------------------------
# Aggregations
# ---------------------------------------------------------------------------

def _critical_alerts(db: Session, user_id: int) -> list[dict[str, Any]]:
    try:
        alerts = smart_alert_service.list_smart_alerts(db, user_id, {"status": "open"})
    except Exception as exc:
        logger.warning("smart alerts gather failed: %s", exc)
        alerts = []
    # Rank by severity.
    sev_rank = {"critical": 0, "warning": 1, "info": 2}
    alerts = sorted(alerts, key=lambda a: sev_rank.get((a.get("severity") or "").lower(), 3))
    critical = [a for a in alerts if a.get("severity") == "critical"]
    return critical[:3] or alerts[:3]


def _forecast_summary(db: Session, user_id: int) -> list[dict[str, Any]]:
    try:
        return forecast_service.list_recent_forecasts(db, user_id)
    except Exception as exc:
        logger.warning("forecast gather failed: %s", exc)
        return []


def _recommendation_summary(db: Session, user_id: int) -> dict[str, Any]:
    pending: list[dict[str, Any]] = []
    accepted: list[dict[str, Any]] = []
    try:
        pending = recommendation_service.list_recommendations(db, user_id, {"status": "pending"})
        accepted = recommendation_service.history(db, user_id)
    except Exception as exc:
        logger.warning("recommendation gather failed: %s", exc)
    return {
        "pending": pending[:4],
        "recently_accepted": accepted[:3],
        "pending_count": len(pending),
    }


def _recent_reports(db: Session, user_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(GeneratedReport)
        .filter(GeneratedReport.user_id == user_id)
        .order_by(desc(GeneratedReport.created_at))
        .limit(3)
        .all()
    )
    out = []
    for r in rows:
        content = r.content_json or {}
        out.append({
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "share_token": r.share_token,
            "executive_summary": (content.get("executive_summary") or "")[:200],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return out


def _dataset_status(db: Session, user_id: int) -> list[dict[str, Any]]:
    from models import Dataset
    datasets = (
        db.query(Dataset)
        .filter(Dataset.user_id == user_id)
        .order_by(desc(Dataset.created_at))
        .limit(6)
        .all()
    )
    out = []
    for d in datasets:
        prof = (
            db.query(DatasetProfile)
            .filter(DatasetProfile.dataset_id == d.id)
            .first()
        )
        out.append({
            "id": d.id,
            "name": d.name,
            "health_score": prof.dataset_health_score if prof else None,
            "quality_score": prof.data_quality_score if prof else None,
            "row_count": prof.row_count if prof else None,
            "profiled": prof is not None,
        })
    return out


def _activity_timeline(db: Session, user_id: int, limit: int = 15) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []

    # Queries
    for q in (db.query(Query).filter(Query.user_id == user_id)
            .order_by(desc(Query.created_at)).limit(10).all()):
        events.append({
            "type": "query",
            "title": q.question,
            "detail": "Asked the copilot",
            "at": q.created_at.isoformat() if q.created_at else None,
            "ts": q.created_at.replace(tzinfo=None).timestamp() if q.created_at else 0,
        })

    # Smart alert events
    for ev in (
        db.query(SmartAlertEvent)
        .join(SmartAlert, SmartAlert.id == SmartAlertEvent.smart_alert_id)
        .filter(SmartAlert.user_id == user_id)
        .order_by(desc(SmartAlertEvent.created_at))
        .limit(10)
        .all()
    ):
        events.append({
            "type": "alert_event",
            "title": f"Alert {ev.kind}",
            "detail": (ev.payload or {}).get("note") if isinstance(ev.payload, dict) else None,
            "at": ev.created_at.isoformat() if ev.created_at else None,
            "ts": ev.created_at.replace(tzinfo=None).timestamp() if ev.created_at else 0,
        })

    # Reports
    for r in (db.query(GeneratedReport).filter(GeneratedReport.user_id == user_id)
            .order_by(desc(GeneratedReport.created_at)).limit(5).all()):
        events.append({
            "type": "report",
            "title": f"Report: {r.title}",
            "detail": r.report_type,
            "at": r.created_at.isoformat() if r.created_at else None,
            "ts": r.created_at.replace(tzinfo=None).timestamp() if r.created_at else 0,
        })

    # Recommendations
    for rec in (db.query(Recommendation).filter(Recommendation.user_id == user_id)
            .order_by(desc(Recommendation.created_at)).limit(5).all()):
        events.append({
            "type": "recommendation",
            "title": rec.title,
            "detail": f"{rec.priority} priority · {rec.source or 'ai'}",
            "at": rec.created_at.isoformat() if rec.created_at else None,
            "ts": rec.created_at.replace(tzinfo=None).timestamp() if rec.created_at else 0,
        })

    events.sort(key=lambda e: e["ts"], reverse=True)
    return events[:limit]


def _ai_summary(brief: str) -> dict[str, Any]:
    try:
        out = ai_service.generate_insight_json(
            "You are an executive BI advisor. In 2-3 sentences, summarize the current state of this business "
            "for a CEO, and give a one-line headline status. Return JSON {summary, headline}.\n\nData:\n" + brief,
            schema=SUMMARY_SCHEMA,
        )
        if isinstance(out, dict) and out.get("summary"):
            return {"summary": str(out["summary"]), "headline": str(out.get("headline") or "")}
    except Exception as exc:
        logger.warning("command-center AI summary failed (%s); using stub.", exc)
    return {"summary": "", "headline": ""}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_command_center(db: Session, user: User | None, force: bool = False, user_id: int | None = None) -> dict[str, Any]:
    uid = user_id if user_id is not None else (user.id if user is not None else None)
    if uid is None:
        raise ValueError("user or user_id required")

    cached = db.query(CommandCenter).filter(CommandCenter.user_id == uid).first()
    if cached and not force and cached.generated_at:
        age = datetime.utcnow() - cached.generated_at.replace(tzinfo=None)
        if age < TTL:
            return _serialize(cached)

    # --- Gather (each defensive) ---
    health = {}
    try:
        health = health_service.compute_health(db, uid)
    except Exception as exc:
        logger.warning("health gather failed: %s", exc)
    health_score = health.get("score") if isinstance(health.get("score"), (int, float)) else None
    health_status = health.get("overall_status")

    kpis: list[dict[str, Any]] = []
    kpi_hits = 0
    try:
        kpis, kpi_hits = briefing_service._kpi_deltas(db, uid)
    except Exception as exc:
        logger.warning("kpi gather failed: %s", exc)

    critical = _critical_alerts(db, uid)
    critical_count = sum(1 for a in critical if a.get("severity") == "critical")
    weak_dims = sum(
        1 for d in (health.get("dimensions") or {}).values()
        if isinstance(d, dict) and (str(d.get("status") or "").lower() in ("watch", "critical")
            or (isinstance(d.get("score"), (int, float)) and d["score"] < 70))
    )

    revenue_score = _dim_score(health, "revenue")
    growth_score = _dim_score(health, "growth")
    risk_score = _risk_score(health, critical_count, weak_dims)
    weather = _weather(health_score, critical_count)

    ai_conf = 0.6
    try:
        ai_conf = float(briefing_service._ai_confidence(db, uid, kpi_hits, True, health_score is not None))
    except Exception:
        ai_conf = 0.6 if kpi_hits else 0.3

    forecasts = _forecast_summary(db, uid)
    recs = _recommendation_summary(db, uid)
    reports = _recent_reports(db, uid)
    datasets = _dataset_status(db, uid)
    timeline = _activity_timeline(db, uid)

    # --- AI summary (condensed brief, LLM-degradable) ---
    brief_parts = [
        f"Business health score: {health_score} ({health_status}).",
        f"Weather status: {weather}.",
        f"Open critical alerts: {critical_count}.",
        f"KPIs: " + "; ".join(f"{k.get('label')} {k.get('value')} ({k.get('direction')})" for k in kpis[:4]) or "no KPI data",
        f"Forecasts: " + "; ".join(f"{f.get('metric')} {f.get('trend')}" for f in forecasts[:3]) or "no forecasts",
        f"Pending recommendations: {recs.get('pending_count')}.",
    ]
    ai = _ai_summary("\n".join(brief_parts))
    if not ai["summary"]:
        ai = {
            "summary": (
                f"Your business is currently {weather.lower()}. "
                f"Business health scores {health_score or '—'}/100. "
                f"There {'is' if critical_count == 1 else 'are'} {critical_count} critical alert"
                f"{'s' if critical_count != 1 else ''} needing attention, and "
                f"{recs.get('pending_count')} recommendation{'s' if recs.get('pending_count') != 1 else ''} pending."
            ),
            "headline": f"{weather} — health {health_score or '—'}/100",
        }

    payload = {
        "weather": {
            "status": weather,
            "label": WEATHER_STYLE[weather]["label"],
            "color": WEATHER_STYLE[weather]["color"],
        },
        "scores": {
            "business_health": health_score,
            "overall_status": health_status,
            "revenue": revenue_score,
            "growth": growth_score,
            "risk": risk_score,
            "ai_confidence": round(ai_conf, 3),
        },
        "health_dimensions": health.get("dimensions") or {},
        "critical_alerts": critical,
        "forecasts": forecasts,
        "recommendations": recs,
        "recent_reports": reports,
        "live_kpis": kpis,
        "dataset_status": datasets,
        "activity_timeline": timeline,
        "ai_summary": ai["summary"],
        "ai_headline": ai["headline"],
        "generated_at": datetime.utcnow().isoformat(),
    }

    # Persist / update cache.
    if cached:
        cached.payload_json = payload
        cached.weather_status = weather
        cached.ai_confidence = round(ai_conf, 3)
        cached.generated_at = datetime.utcnow()
        db.commit()
        db.refresh(cached)
        row = cached
    else:
        row = CommandCenter(
            user_id=uid, payload_json=payload, weather_status=weather,
            ai_confidence=round(ai_conf, 3),
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return _serialize(row)


def _serialize(c: CommandCenter) -> dict[str, Any]:
    payload = c.payload_json or {}
    payload = {**payload, "cached_at": c.generated_at.isoformat() if c.generated_at else None}
    return payload


def run_background_refresh(user_id: int) -> None:
    from db import SessionLocal
    db = SessionLocal()
    try:
        compute_command_center(db, user=None, force=True, user_id=user_id)
    except Exception as exc:
        logger.error("Background command-center refresh failed for user %s: %s", user_id, exc)
    finally:
        db.close()