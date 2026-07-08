"""Smart Alert Engine routes (Feature 6)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from schemas import SmartAlertUpdate
from services import smart_alert_service

router = APIRouter(prefix="/api/smart-alerts", tags=["smart-alerts"])


@router.get("")
def list_smart_alerts(
    severity: str | None = Query(None),
    status: str | None = Query(None),
    assigned_to: str | None = Query(None),
    pinned: bool | None = Query(None),
    search: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return smart_alert_service.list_smart_alerts(db, user.id, {
        "severity": severity, "status": status, "assigned_to": assigned_to,
        "pinned": pinned, "search": search,
    })


@router.get("/stats")
def smart_alert_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return smart_alert_service.stats(db, user.id)


@router.post("/detect")
def detect_smart_alerts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = smart_alert_service.detect_smart_alerts(db, user.id)
    return {"created": count}


@router.patch("/{alert_id}")
def update_smart_alert(
    alert_id: int,
    payload: SmartAlertUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = smart_alert_service.update_smart_alert(db, user.id, alert_id, payload.model_dump(exclude_unset=True))
    if res is None:
        raise HTTPException(status_code=404, detail="Smart alert not found")
    return res


@router.get("/{alert_id}/timeline")
def smart_alert_timeline(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = smart_alert_service.timeline(db, user.id, alert_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Smart alert not found")
    return res