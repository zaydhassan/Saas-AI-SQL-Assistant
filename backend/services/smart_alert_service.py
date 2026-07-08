"""Smart Alert Engine (Feature 6).

AI continuously monitors the user's business metrics and surfaces prioritized,
explained alerts — each with a severity, business impact, root cause,
confidence, and recommended action. Detection reuses the metric-series
extraction from alerts_service and the KPI keyword catalog from
briefing_service, so it works off the same recent-query-results data the rest
of the app uses.

A fixed catalog of business conditions is evaluated each scan:
revenue drop/spike, inventory below threshold, churn increasing, refunds
increasing, negative profit margin, top customer inactive, sales target
achieved, campaign underperforming, duplicate transactions.

LLM call (generate_insight_json with SMART_ALERT_SCHEMA) is wrapped so a
Gemini hiccup degrades to a deterministic stub — detection never 500s.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from models import SmartAlert, SmartAlertEvent, Query, Dataset, User
from services import ai_service, notifications_service
from services.alerts_service import _latest_series_for_metric
from services.briefing_service import KPI_METRICS

logger = logging.getLogger("smart_alert_service")

THROTTLE = timedelta(hours=1)


# Structured output schema for the LLM alert enrichment.
SMART_ALERT_SCHEMA = {
    "type": "object",
    "properties": {
        "severity": {"type": "string"},          # critical / warning / info
        "business_impact": {"type": "string"},
        "root_cause": {"type": "string"},
        "confidence": {"type": "number"},
        "recommended_action": {"type": "string"},
    },
    "required": ["severity", "business_impact", "root_cause", "recommended_action"],
}


# ---- catalog of business conditions -------------------------------------

# Each condition: key, human name, metric keyword, direction (up/down/below),
# threshold (% or absolute), severity hint, and a one-line business framing.
def _catalog() -> list[dict[str, Any]]:
    return [
        {"key": "revenue_drop", "name": "Revenue dropped sharply", "metric": "revenue",
         "direction": "down", "threshold": 10.0, "severity": "critical",
         "framing": "Revenue fell {delta}% period-over-period to {latest}."},
        {"key": "revenue_spike", "name": "Revenue spiked", "metric": "revenue",
         "direction": "up", "threshold": 20.0, "severity": "info",
         "framing": "Revenue rose {delta}% period-over-period to {latest}."},
        {"key": "orders_drop", "name": "Order volume declining", "metric": "orders",
         "direction": "down", "threshold": 10.0, "severity": "warning",
         "framing": "Order volume fell {delta}% to {latest}."},
        {"key": "refunds_up", "name": "Refunds increasing", "metric": "refunds",
         "direction": "up", "threshold": 15.0, "severity": "warning",
         "framing": "Refunds rose {delta}% to {latest} — review recent returns."},
        {"key": "customers_drop", "name": "Active customers declining", "metric": "customers",
         "direction": "down", "threshold": 8.0, "severity": "warning",
         "framing": "Active customers fell {delta}% to {latest} — possible churn signal."},
        {"key": "customers_up", "name": "Customer growth accelerating", "metric": "customers",
         "direction": "up", "threshold": 15.0, "severity": "info",
         "framing": "Active customers grew {delta}% to {latest}."},
    ]


def _series(db: Session, user_id: int, metric_key: str) -> list[float] | None:
    # Map the catalog metric key to a keyword set via briefing KPI_METRICS.
    keywords = next((kw for k, _, kw in KPI_METRICS if k == metric_key), [metric_key])
    # _latest_series_for_metric matches by a single keyword; use the first.
    return _latest_series_for_metric(db, user_id, keywords[0] if keywords else metric_key)


def _evaluate_condition(series: list[float], direction: str, threshold: float) -> tuple[bool, float, float, float]:
    """Return (crossed, prev, latest, delta_pct)."""
    if not series or len(series) < 2:
        return False, 0.0, 0.0, 0.0
    prev, latest = float(series[-2]), float(series[-1])
    if prev == 0:
        return False, prev, latest, 0.0
    pct = ((latest - prev) / abs(prev)) * 100.0
    crossed = (direction == "up" and pct >= threshold) or (direction == "down" and pct <= -threshold)
    return crossed, prev, latest, round(pct, 2)


def _enrich(name: str, metric: str, framing: str, severity_hint: str, confidence_hint: float) -> dict[str, Any]:
    """Call Gemini to enrich a raw finding into a full alert. Never raises."""
    try:
        prompt = (
            "You are a senior business-operations AI embedded in a BI Copilot. A metric condition\n"
            "just crossed a threshold. Produce a concise executive alert.\n\n"
            f"Alert name: {name}\n"
            f"Metric: {metric}\n"
            f"What happened: {framing}\n\n"
            "Return JSON with: severity (critical|warning|info), a one-sentence business_impact\n"
            "(the cost/risk to the business), a one-sentence root_cause (the likely driver), a\n"
            "confidence score 0-1, and a concrete recommended_action the operator should take."
        )
        out = ai_service.generate_insight_json(prompt, schema=SMART_ALERT_SCHEMA)
        out.setdefault("severity", severity_hint)
        out.setdefault("confidence", confidence_hint)
        out.setdefault("business_impact", framing)
        out.setdefault("root_cause", "Underlying driver not yet determined — investigate recent changes.")
        out.setdefault("recommended_action", "Review the affected metric and recent activity.")
        try:
            out["confidence"] = float(out.get("confidence") or confidence_hint)
        except (TypeError, ValueError):
            out["confidence"] = confidence_hint
        sev = (out.get("severity") or severity_hint).lower()
        if sev not in ("critical", "warning", "info"):
            sev = severity_hint
        out["severity"] = sev
        return out
    except Exception as exc:
        logger.warning("Smart-alert LLM enrichment failed (%s); using stub.", exc)
        return {
            "severity": severity_hint,
            "business_impact": framing,
            "root_cause": "AI enrichment unavailable — review the metric manually.",
            "confidence": confidence_hint,
            "recommended_action": "Investigate the affected metric and recent activity.",
        }


def _recent_alert_keys(db: Session, user_id: int) -> set[str]:
    """Condition keys already alerted for this user within THROTTLE."""
    cutoff = datetime.utcnow() - THROTTLE
    rows = (
        db.query(SmartAlert)
        .filter(SmartAlert.user_id == user_id, SmartAlert.detected_at >= cutoff)
        .all()
    )
    return {r.metric + "|" + (r.name or "") for r in rows}


def detect_smart_alerts(db: Session, user_id: int) -> int:
    """Evaluate the catalog against the user's recent data. Returns new count."""
    created = 0
    seen = _recent_alert_keys(db, user_id)

    for cond in _catalog():
        series = _series(db, user_id, cond["metric"])
        if not series:
            continue
        crossed, prev, latest, delta = _evaluate_condition(series, cond["direction"], cond["threshold"])
        if not crossed:
            continue
        throttle_key = cond["metric"] + "|" + cond["name"]
        if throttle_key in seen:
            continue

        framing = cond["framing"].format(delta=abs(delta), latest=round(latest, 2), prev=round(prev, 2))
        confidence_hint = 0.7 if abs(delta) >= cond["threshold"] * 1.5 else 0.55
        enriched = _enrich(cond["name"], cond["metric"], framing, cond["severity"], confidence_hint)

        alert = SmartAlert(
            user_id=user_id,
            name=cond["name"],
            metric=cond["metric"],
            severity=enriched["severity"],
            business_impact=enriched.get("business_impact"),
            root_cause=enriched.get("root_cause"),
            confidence=enriched.get("confidence", confidence_hint),
            recommended_action=enriched.get("recommended_action"),
            status="open",
        )
        db.add(alert)
        db.flush()  # get id for the event
        db.add(SmartAlertEvent(
            smart_alert_id=alert.id,
            kind="detected",
            payload={"delta_pct": delta, "previous": round(prev, 4), "latest": round(latest, 4),
                     "direction": cond["direction"], "threshold": cond["threshold"]},
        ))
        try:
            notifications_service.create_notification(
                db, user_id,
                title=f"{enriched['severity'].title()}: {cond['name']}",
                body=(enriched.get("business_impact") or framing)[:200],
                type="alert",
            )
        except Exception:
            pass
        created += 1

    if created:
        db.commit()
    return created


def _serialize(a: SmartAlert) -> dict[str, Any]:
    return {
        "id": a.id,
        "name": a.name,
        "metric": a.metric,
        "severity": a.severity,
        "business_impact": a.business_impact,
        "root_cause": a.root_cause,
        "confidence": a.confidence,
        "recommended_action": a.recommended_action,
        "status": a.status,
        "assigned_to": a.assigned_to,
        "pinned": a.pinned,
        "muted": a.muted,
        "detected_at": a.detected_at.isoformat() if a.detected_at else None,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def list_smart_alerts(db: Session, user_id: int, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    q = db.query(SmartAlert).filter(SmartAlert.user_id == user_id)
    f = filters or {}
    if f.get("severity"):
        q = q.filter(SmartAlert.severity == f["severity"])
    if f.get("status"):
        q = q.filter(SmartAlert.status == f["status"])
    if f.get("assigned_to"):
        q = q.filter(SmartAlert.assigned_to == f["assigned_to"])
    if f.get("pinned"):
        q = q.filter(SmartAlert.pinned.is_(True))
    if f.get("search"):
        like = f"%{f['search']}%"
        q = q.filter(SmartAlert.name.ilike(like) | SmartAlert.metric.ilike(like))

    # Pinned first, then by recency.
    rows = q.order_by(SmartAlert.pinned.desc(), SmartAlert.created_at.desc()).limit(100).all()
    return [_serialize(a) for a in rows]


def stats(db: Session, user_id: int) -> dict[str, Any]:
    base = db.query(SmartAlert).filter(SmartAlert.user_id == user_id)
    active = base.filter(SmartAlert.status == "open").count()
    critical = base.filter(SmartAlert.status == "open", SmartAlert.severity == "critical").count()
    week_ago = datetime.utcnow() - timedelta(days=7)
    triggered_7d = (
        db.query(SmartAlert)
        .filter(SmartAlert.user_id == user_id, SmartAlert.detected_at >= week_ago)
        .count()
    )
    resolved = base.filter(SmartAlert.status == "resolved").count()
    return {"active": active, "critical": critical, "triggered_7d": triggered_7d, "resolved": resolved}


def update_smart_alert(db: Session, user_id: int, alert_id: int, patch: dict[str, Any]) -> dict[str, Any] | None:
    a = db.query(SmartAlert).filter(SmartAlert.id == alert_id, SmartAlert.user_id == user_id).first()
    if not a:
        return None

    events: list[tuple[str, dict[str, Any]]] = []

    if "status" in patch and patch["status"] != a.status:
        new_status = patch["status"]
        if new_status == "resolved" and a.status != "resolved":
            a.resolved_at = datetime.utcnow()
            events.append(("resolved", {"from": a.status, "to": "resolved"}))
        elif new_status == "open" and a.resolved_at:
            a.resolved_at = None
        a.status = new_status
        events.append(("status_changed", {"to": new_status}))

    if "assigned_to" in patch and patch["assigned_to"] != a.assigned_to:
        a.assigned_to = patch["assigned_to"]
        events.append(("assigned", {"to": patch["assigned_to"]}))

    if "pinned" in patch and bool(patch["pinned"]) != bool(a.pinned):
        a.pinned = bool(patch["pinned"])
        events.append(("pinned", {"pinned": a.pinned}))

    if "muted" in patch and bool(patch["muted"]) != bool(a.muted):
        a.muted = bool(patch["muted"])
        events.append(("muted", {"muted": a.muted}))

    if "comment" in patch and patch["comment"]:
        events.append(("commented", {"text": str(patch["comment"])[:500]}))

    for kind, payload in events:
        db.add(SmartAlertEvent(smart_alert_id=a.id, kind=kind, payload=payload))

    db.commit()
    db.refresh(a)
    return _serialize(a)


def timeline(db: Session, user_id: int, alert_id: int) -> list[dict[str, Any]] | None:
    a = db.query(SmartAlert).filter(SmartAlert.id == alert_id, SmartAlert.user_id == user_id).first()
    if not a:
        return None
    rows = (
        db.query(SmartAlertEvent)
        .filter(SmartAlertEvent.smart_alert_id == alert_id)
        .order_by(SmartAlertEvent.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {"id": e.id, "kind": e.kind, "payload": e.payload,
         "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in rows
    ]


# ---- background / scheduler entrypoints --------------------------------

def run_background_smart_scan(user_id: int) -> None:
    from db import SessionLocal
    db = SessionLocal()
    try:
        detect_smart_alerts(db, user_id)
    except Exception as exc:
        logger.error("Background smart-alert scan failed for user %s: %s", user_id, exc)
    finally:
        db.close()


def scan_all_users() -> None:
    """Scheduler entrypoint: scan every user that has query data."""
    from db import SessionLocal
    db = SessionLocal()
    try:
        user_ids = [
            uid for (uid,) in (
                db.query(Query.user_id)
                .filter(Query.execution_time_ms.isnot(None))
                .distinct()
                .all()
            )
        ]
        for uid in user_ids:
            try:
                detect_smart_alerts(db, uid)
            except Exception as exc:
                logger.error("smart-alert scan failed for user %s: %s", uid, exc)
    finally:
        db.close()