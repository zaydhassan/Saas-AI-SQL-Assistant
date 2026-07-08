"""In-app notifications for the navbar bell (Phase 2).

Pure CRUD over the Notification model. Other services (alerts, anomaly,
briefing) call `create_notification` to push items into the bell.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models import Notification


def _serialize(n: Notification) -> dict[str, Any]:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "read": n.read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


def list_notifications(db: Session, user_id: int, limit: int = 30) -> list[dict[str, Any]]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_serialize(n) for n in rows]


def unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read.is_(False))
        .count()
    )

def mark_read(db: Session, user_id: int, notification_id: int) -> bool:
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not n:
        return False
    n.read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int) -> int:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read.is_(False))
        .all()
    )
    for n in rows:
        n.read = True
    db.commit()
    return len(rows)


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str | None = None,
    type: str = "info",
) -> Notification:
    n = Notification(user_id=user_id, type=type, title=title, body=body)
    db.add(n)
    db.commit()
    db.refresh(n)
    # Live-push to any open websocket for this user (best-effort; polling is
    # the fallback). Import lazily so this module stays usable without the ws
    # layer loaded (e.g. unit tests).
    try:
        import ws as ws_mod
        ws_mod.broadcast_sync(user_id, {
            "type": "notification",
            "notification": _serialize(n),
            "unread": unread_count(db, user_id),
        })
    except Exception:
        pass
    return n