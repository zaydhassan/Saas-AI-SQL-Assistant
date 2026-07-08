"""Alerts routes (Phase 2): CRUD + firing history."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from schemas import AlertCreate, AlertUpdate
from services import alerts_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def list_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return alerts_service.list_alerts(db, user.id)


@router.post("")
def create_alert(
    payload: AlertCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return alerts_service.create_alert(db, user.id, payload.model_dump())


@router.put("/{alert_id}")
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = alerts_service.update_alert(db, user.id, alert_id, payload.model_dump(exclude_unset=True))
    if res is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return res


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not alerts_service.delete_alert(db, user.id, alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.get("/{alert_id}/events")
def alert_events(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = alerts_service.list_events(db, user.id, alert_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return res