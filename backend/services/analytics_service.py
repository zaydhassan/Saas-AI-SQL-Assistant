"""Reusable analytics helpers over the Query model.

Extracted so new BI features (briefing, health, history, dashboards) share one
implementation instead of duplicating the inline queries in main.py. The
existing main.py analytics routes are left untouched.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Query, Dataset


def compute_overview(db: Session, user_id: int) -> dict[str, Any]:
    total = db.query(func.count(Query.id)).filter(Query.user_id == user_id).scalar() or 0
    failed = (
        db.query(func.count(Query.id))
        .filter(Query.user_id == user_id, Query.execution_time_ms.is_(None))
        .scalar()
        or 0
    )
    avg_time = (
        db.query(func.avg(Query.execution_time_ms))
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .scalar()
    )
    return {
        "total_queries": total,
        "failed_queries": failed,
        "avg_execution_time": round(avg_time or 0, 2),
    }


def query_volume(db: Session, user_id: int, days: int = 7) -> list[dict[str, Any]]:
    since = datetime.utcnow() - timedelta(days=days - 1)
    rows = (
        db.query(
            func.date(Query.created_at).label("day"),
            func.count(Query.id).label("count"),
        )
        .filter(Query.user_id == user_id, Query.created_at >= since)
        .group_by(func.date(Query.created_at))
        .order_by(func.date(Query.created_at))
        .all()
    )
    return [{"day": r.day.strftime("%a"), "queries": r.count} for r in rows]


def performance_buckets(db: Session, user_id: int) -> list[dict[str, Any]]:
    buckets = {"<100ms": 0, "100–300ms": 0, ">300ms": 0}
    times = (
        db.query(Query.execution_time_ms)
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .all()
    )
    for (t,) in times:
        if t is None:
            continue
        if t < 100:
            buckets["<100ms"] += 1
        elif t <= 300:
            buckets["100–300ms"] += 1
        else:
            buckets[">300ms"] += 1
    return [{"bucket": k, "count": v} for k, v in buckets.items()]


def recent_queries(db: Session, user_id: int, limit: int = 5) -> list[dict[str, Any]]:
    queries = (
        db.query(Query)
        .filter(Query.user_id == user_id)
        .order_by(Query.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": q.id,
            "sql": q.sql,
            "question": q.question,
            "dataset_id": q.dataset_id,
            "execution_time_ms": q.execution_time_ms,
            "status": "Success" if q.execution_time_ms is not None else "Failed",
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in queries
    ]


def list_user_queries(
    db: Session,
    user_id: int,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
) -> dict[str, Any]:
    """Paginated query history across all of a user's datasets, with dataset name.

    Used by the SQL History page (Phase 1) and by the briefing/health services.
    """
    q = db.query(Query, Dataset.name.label("dataset_name")).join(
        Dataset, Query.dataset_id == Dataset.id
    ).filter(Query.user_id == user_id)

    if search:
        like = f"%{search}%"
        q = q.filter(Query.question.ilike(like))

    total = q.count()
    rows = (
        q.order_by(Query.created_at.desc())
        .offset(max(page - 1, 0) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for row in rows:
        q_obj, dataset_name = row
        result = q_obj.result_json if isinstance(q_obj.result_json, list) else []
        items.append(
            {
                "id": q_obj.id,
                "question": q_obj.question,
                "sql": q_obj.sql,
                "dataset_id": q_obj.dataset_id,
                "dataset_name": dataset_name,
                "rows_count": len(result) if isinstance(result, list) else 0,
                "execution_time_ms": q_obj.execution_time_ms,
                "status": "Success" if q_obj.execution_time_ms is not None else "Failed",
                "created_at": q_obj.created_at.isoformat() if q_obj.created_at else None,
            }
        )

    return {"items": items, "total": total, "page": page, "limit": limit}