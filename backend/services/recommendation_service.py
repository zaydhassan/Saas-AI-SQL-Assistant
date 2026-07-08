"""AI Recommendation Engine (Feature 9).

Turns the system's accumulated signals — AI insights, weak Business Health
dimensions, open Smart Alerts, and declining Forecasts — into concrete,
prioritized business actions. Each recommendation carries a business reason,
expected impact, confidence, priority, estimated ROI, and difficulty, and is
lifecycle-managed (accept / dismiss / save / track + history).

Signal gathering reuses the existing services (`briefing_service._kpi_deltas`,
`health_service.compute_health`, `smart_alert_service.list_smart_alerts`,
`forecast_service.list_recent_forecasts`, `QueryInsight.recommendations`). The
LLM call uses `ai_service.generate_insight_json` with `RECOMMENDATION_SCHEMA`
and degrades to a deterministic heuristic stub on Gemini failure so no endpoint
ever 500s.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from models import Query, QueryInsight, Recommendation, User
from services import ai_service, notifications_service
from services import health_service, smart_alert_service, forecast_service

logger = logging.getLogger("recommendation_service")

RECOMMENDATION_SCHEMA = {
    "type": "object",
    "properties": {
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "category": {"type": "string"},            # inventory/pricing/marketing/customers/operations/...
                    "business_reason": {"type": "string"},
                    "expected_impact": {"type": "string"},
                    "confidence": {"type": "number"},          # 0-1
                    "priority": {"type": "string"},            # critical/high/medium/low
                    "estimated_roi": {"type": "number"},      # percent (nullable in DB, 0-100 here)
                    "difficulty": {"type": "string"},          # easy/medium/hard
                },
                "required": ["title", "business_reason", "expected_impact", "priority"],
            },
        }
    },
    "required": ["recommendations"],
}

VALID_STATUS = {"pending", "accepted", "dismissed", "saved", "tracked"}
VALID_PRIORITY = {"critical", "high", "medium", "low"}
VALID_DIFFICULTY = {"easy", "medium", "hard"}


# ---------------------------------------------------------------------------
# Signal gathering
# ---------------------------------------------------------------------------

def _recent_insight_recs(db: Session, user_id: int) -> list[str]:
    """Pull recommendation strings from the user's most recent query insights."""
    rows = (
        db.query(QueryInsight)
        .join(Query, Query.id == QueryInsight.query_id)
        .filter(Query.user_id == user_id)
        .order_by(QueryInsight.generated_at.desc())
        .limit(6)
        .all()
    )
    out: list[str] = []
    for ins in rows:
        recs = (ins.insights_json or {}).get("recommendations") if ins.insights_json else None
        if isinstance(recs, list):
            for r in recs:
                if isinstance(r, str) and r.strip():
                    out.append(r.strip())
    return out


def _weak_health_dimensions(db: Session, user_id: int) -> list[dict[str, Any]]:
    """Health dimensions in Watch/Critical state — the most actionable gaps."""
    try:
        health = health_service.compute_health(db, user_id)
    except Exception as exc:
        logger.warning("health_service.compute_health failed: %s", exc)
        return []
    dims = health.get("dimensions") or {}
    weak = []
    for name, d in dims.items():
        if not isinstance(d, dict):
            continue
        status = (d.get("status") or "").lower()
        score = d.get("score")
        if status in ("watch", "critical") or (isinstance(score, (int, float)) and score < 70):
            weak.append({
                "dimension": name,
                "status": d.get("status"),
                "score": score,
                "detail": d.get("detail"),
            })
    return weak


def _open_alerts(db: Session, user_id: int) -> list[dict[str, Any]]:
    try:
        return [a for a in smart_alert_service.list_smart_alerts(db, user_id, {"status": "open"})
                if a.get("status") == "open"]
    except Exception as exc:
        logger.warning("smart_alert_service.list_smart_alerts failed: %s", exc)
        return []


def _declining_forecasts(db: Session, user_id: int) -> list[dict[str, Any]]:
    try:
        recents = forecast_service.list_recent_forecasts(db, user_id)
    except Exception as exc:
        logger.warning("forecast_service.list_recent_forecasts failed: %s", exc)
        return []
    return [f for f in recents if (f.get("trend") or "").lower() == "down"]


def _signal_brief(db: Session, user_id: int) -> str:
    """Compress all signals into a text brief the LLM can reason over."""
    recs = _recent_insight_recs(db, user_id)
    weak = _weak_health_dimensions(db, user_id)
    alerts = _open_alerts(db, user_id)
    decl = _declining_forecasts(db, user_id)

    parts: list[str] = []
    if recs:
        parts.append("Prior AI insights suggested these actions:\n- " + "\n- ".join(recs[:8]))
    if weak:
        parts.append("Weak business dimensions needing attention: " +
                     ", ".join(f"{w['dimension']} ({w.get('status')}, score {w.get('score')})" for w in weak))
    if alerts:
        parts.append("Open smart alerts: " +
                     "; ".join(f"{a.get('name')} [{a.get('severity')}] — {a.get('recommended_action') or a.get('business_impact')}"
                               for a in alerts[:5]))
    if decl:
        parts.append("Declining forecasts: " +
                     ", ".join(f"{f.get('metric')} trending down (last {f.get('last_actual')} → {f.get('final_forecast')})"
                               for f in decl))
    if not parts:
        return "No specific signals available yet. Generate 3-4 broadly applicable, high-impact business actions for an operator running a data-driven business."
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# LLM enrichment
# ---------------------------------------------------------------------------

def _normalize_item(item: dict[str, Any], idx: int) -> dict[str, Any]:
    """Coerce one LLM-produced recommendation into a DB-safe dict."""
    title = (str(item.get("title") or "").strip() or f"Recommended action {idx + 1}")
    priority = str(item.get("priority") or "medium").lower()
    if priority not in VALID_PRIORITY:
        priority = "medium"
    difficulty = str(item.get("difficulty") or "medium").lower()
    if difficulty not in VALID_DIFFICULTY:
        difficulty = "medium"
    confidence = item.get("confidence")
    try:
        confidence = float(confidence) if confidence is not None else 0.5
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))
    roi = item.get("estimated_roi")
    try:
        roi = round(float(roi), 2) if roi is not None else None
    except (TypeError, ValueError):
        roi = None
    category = (str(item.get("category") or "").strip().lower() or "operations") or None
    return {
        "title": title[:200],
        "category": category,
        "business_reason": str(item.get("business_reason") or "").strip() or None,
        "expected_impact": str(item.get("expected_impact") or "").strip() or None,
        "confidence": round(confidence, 3),
        "priority": priority,
        "estimated_roi": roi,
        "difficulty": difficulty,
        "source": "ai",
    }


def _fallback_recommendations(db: Session, user_id: int) -> list[dict[str, Any]]:
    """Deterministic recommendations built from raw signals when Gemini is down."""
    items: list[dict[str, Any]] = []
    for w in _weak_health_dimensions(db, user_id)[:3]:
        items.append({
            "title": f"Address {w['dimension']} gap",
            "category": w["dimension"],
            "business_reason": f"{w['dimension']} is {w.get('status') or 'weak'} (score {w.get('score')}). {w.get('detail') or ''}".strip(),
            "expected_impact": f"Raising {w['dimension']} to a Healthy score improves overall business health.",
            "confidence": 0.7,
            "priority": "high" if (w.get("status") or "").lower() == "critical" else "medium",
            "estimated_roi": None,
            "difficulty": "medium",
            "source": "health",
        })
    for a in _open_alerts(db, user_id)[:3]:
        items.append({
            "title": f"Resolve alert: {a.get('name')}",
            "category": (a.get("metric") or "operations"),
            "business_reason": a.get("business_impact") or a.get("root_cause") or "An open alert needs attention.",
            "expected_impact": a.get("recommended_action") or "Reduces risk and restores the affected metric.",
            "confidence": float(a.get("confidence") or 0.6),
            "priority": "critical" if a.get("severity") == "critical" else ("high" if a.get("severity") == "warning" else "medium"),
            "estimated_roi": None,
            "difficulty": "medium",
            "source": "alert",
        })
    for f in _declining_forecasts(db, user_id)[:2]:
        items.append({
            "title": f"Counter the declining {f.get('metric')} trend",
            "category": f.get("metric") or "operations",
            "business_reason": f"{f.get('metric')} is forecast to trend down over the next {f.get('horizon')} periods.",
            "expected_impact": "Stabilizing this metric protects projected revenue/engagement.",
            "confidence": 0.65,
            "priority": "high",
            "estimated_roi": None,
            "difficulty": "hard",
            "source": "forecast",
        })
    for r in _recent_insight_recs(db, user_id)[:3]:
        items.append({
            "title": r[:200],
            "category": "operations",
            "business_reason": "Surfaced by the AI insight engine from recent query analysis.",
            "expected_impact": "Acting on data-driven findings improves outcomes.",
            "confidence": 0.55,
            "priority": "medium",
            "estimated_roi": None,
            "difficulty": "easy",
            "source": "insight",
        })
    if not items:
        items.append({
            "title": "Ask the copilot about your key business metrics",
            "category": "operations",
            "business_reason": "There isn't enough analyzed data yet to generate specific recommendations.",
            "expected_impact": "Building query history unlocks tailored, high-ROI recommendations.",
            "confidence": 0.5,
            "priority": "low",
            "estimated_roi": None,
            "difficulty": "easy",
            "source": "ai",
        })
    return [_normalize_item(it, i) for i, it in enumerate(items)]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_recommendations(
    db: Session,
    user: User | None,
    dataset_id: int | None = None,
    user_id: int | None = None,
) -> list[dict[str, Any]]:
    """Generate + persist fresh recommendations. Returns the serialized list."""
    uid = user_id if user_id is not None else (user.id if user is not None else None)
    if uid is None:
        raise ValueError("user or user_id required")

    brief = _signal_brief(db, uid)
    items: list[dict[str, Any]] = []
    try:
        prompt = (
            "You are an AI business advisor. Given the signals below, produce 4-6 concrete, "
            "high-impact business actions an operator should take. Each must be specific and "
            "actionable, with a clear business_reason, expected_impact, a 0-1 confidence, a "
            "priority (critical/high/medium/low), an estimated_roi (percent, may be 0), and a "
            "difficulty (easy/medium/hard). Vary the category across inventory/pricing/marketing/"
            "customers/operations/refunds/discounts.\n\nSignals:\n" + brief
        )
        out = ai_service.generate_insight_json(prompt, schema=RECOMMENDATION_SCHEMA)
        raw = out.get("recommendations") if isinstance(out, dict) else None
        if isinstance(raw, list):
            items = [_normalize_item(it, i) for i, it in enumerate(raw) if isinstance(it, dict)]
    except Exception as exc:
        logger.warning("Recommendation LLM failed (%s); using signal-derived fallback.", exc)

    if not items:
        items = _fallback_recommendations(db, uid)

    created: list[Recommendation] = []
    for it in items:
        row = Recommendation(
            user_id=uid,
            dataset_id=dataset_id,
            title=it["title"],
            category=it["category"],
            business_reason=it["business_reason"],
            expected_impact=it["expected_impact"],
            confidence=it["confidence"],
            priority=it["priority"],
            estimated_roi=it["estimated_roi"],
            difficulty=it["difficulty"],
            status="pending",
            source=it.get("source") or "ai",
        )
        db.add(row)
        created.append(row)
    db.commit()
    for r in created:
        db.refresh(r)

    try:
        notifications_service.create_notification(
            db, uid, title=f"{len(created)} new recommendations ready",
            body=created[0].title if created else "", type="info",
        )
    except Exception:
        pass

    return [_serialize(r) for r in created]


def list_recommendations(
    db: Session,
    user_id: int,
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    f = filters or {}
    q = db.query(Recommendation).filter(Recommendation.user_id == user_id)

    status = f.get("status")
    if status and status != "all":
        q = q.filter(Recommendation.status == status)
    category = f.get("category")
    if category and category != "all":
        q = q.filter(Recommendation.category == category)
    priority = f.get("priority")
    if priority and priority != "all":
        q = q.filter(Recommendation.priority == priority)
    search = (f.get("search") or "").strip()
    if search:
        like = f"%{search}%"
        q = q.filter(Recommendation.title.ilike(like) | Recommendation.business_reason.ilike(like))

    rows = q.order_by(
        Recommendation.status != "pending",      # pending first
        Recommendation.created_at.desc(),
    ).limit(100).all()
    return [_serialize(r) for r in rows]


def stats(db: Session, user_id: int) -> dict[str, Any]:
    base = db.query(Recommendation).filter(Recommendation.user_id == user_id)
    pending = base.filter(Recommendation.status == "pending").count()
    accepted = base.filter(Recommendation.status == "accepted").count()
    dismissed = base.filter(Recommendation.status == "dismissed").count()
    tracked = base.filter(Recommendation.status == "tracked").count()
    high = base.filter(Recommendation.status == "pending",
                       Recommendation.priority.in_(["critical", "high"])).count()
    return {"pending": pending, "accepted": accepted, "dismissed": dismissed,
            "tracked": tracked, "high_priority": high}


def update_recommendation(
    db: Session,
    user_id: int,
    rec_id: int,
    patch: dict[str, Any],
) -> dict[str, Any] | None:
    row = db.query(Recommendation).filter(
        Recommendation.id == rec_id, Recommendation.user_id == user_id
    ).first()
    if not row:
        return None

    status = patch.get("status")
    if status and status in VALID_STATUS:
        row.status = status
        if status == "tracked":
            row.tracked_at = datetime.utcnow()
            if patch.get("outcome"):
                row.outcome = str(patch["outcome"])[:1000]
    # Allow free-form outcome update without a status change.
    if patch.get("outcome") is not None:
        row.outcome = str(patch["outcome"])[:1000] or None

    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _serialize(row)


def history(db: Session, user_id: int) -> list[dict[str, Any]]:
    """Accepted + tracked recommendations (the 'acted-on' history)."""
    rows = (
        db.query(Recommendation)
        .filter(Recommendation.user_id == user_id,
                Recommendation.status.in_(["accepted", "tracked"]))
        .order_by(Recommendation.updated_at.desc())
        .limit(50)
        .all()
    )
    return [_serialize(r) for r in rows]


def _serialize(r: Recommendation) -> dict[str, Any]:
    return {
        "id": r.id,
        "title": r.title,
        "category": r.category,
        "business_reason": r.business_reason,
        "expected_impact": r.expected_impact,
        "confidence": r.confidence,
        "priority": r.priority,
        "estimated_roi": r.estimated_roi,
        "difficulty": r.difficulty,
        "status": r.status,
        "outcome": r.outcome,
        "source": r.source,
        "tracked_at": r.tracked_at.isoformat() if r.tracked_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def run_background_recommendations(user_id: int) -> None:
    """Background-friendly generation (own session)."""
    from db import SessionLocal
    db = SessionLocal()
    try:
        generate_recommendations(db, user=None, user_id=user_id)
    except Exception as exc:
        logger.error("Background recommendations failed for user %s: %s", user_id, exc)
    finally:
        db.close()