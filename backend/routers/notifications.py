"""Notifications routes (Phase 2): navbar bell."""
from fastapi import APIRouter, Depends, HTTPException, Query as QueryParam
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from services import notifications_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    limit: int = QueryParam(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return notifications_service.list_notifications(db, user.id, limit=limit)


@router.get("/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"count": notifications_service.unread_count(db, user.id)}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not notifications_service.mark_read(db, user.id, notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.post("/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = notifications_service.mark_all_read(db, user.id)
    return {"success": True, "marked": n}