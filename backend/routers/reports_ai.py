"""AI Report Generator routes (Feature 7).

Prefix /api/ai-reports (distinct from the legacy POST /api/reports in main.py
which just logs a saved SQL report — that stays untouched).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from db import get_db
from deps import get_current_user
from models import User
from schemas import ReportEmail, ReportGenerate, ReportSchedule
from services import report_service
from services.idempotency_store import idempotent

router = APIRouter(prefix="/api/ai-reports", tags=["ai-reports"])


@router.get("")
def list_reports(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.list_reports(db, user.id)


@router.post("/generate")
@idempotent
def generate_report(
    request: Request,
    payload: ReportGenerate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.generate_report(db, user, payload.report_type, payload.dataset_id)


@router.get("/{report_id}")
def get_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = report_service.get_report(db, user.id, report_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return res


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not report_service.delete_report(db, user.id, report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    return {"success": True}


@router.post("/{report_id}/share")
def share_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = report_service.share_report(db, user.id, report_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return res


@router.post("/{report_id}/schedule")
def schedule_report(
    report_id: int,
    payload: ReportSchedule,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = report_service.schedule_report(db, user.id, report_id, payload.cadence)
    if res is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return res


@router.delete("/{report_id}/schedule")
def unschedule_report(
    report_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = report_service.unschedule_report(db, user.id, report_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return res


@router.get("/{report_id}/export")
def export_report(
    report_id: int,
    format: str = Query("pdf"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    out = report_service.export_report_bytes(db, user.id, report_id, format)
    if out is None:
        raise HTTPException(status_code=404, detail="Report not found")
    data, filename = out
    media_types = {
        "pdf": "application/pdf",
        "csv": "text/csv",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    media = media_types.get((format or "").lower(), "application/octet-stream")
    return StreamingResponse(io.BytesIO(data), media_type=media,
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("/{report_id}/email")
def email_report(
    report_id: int,
    payload: ReportEmail,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_service.email_report(db, user.id, report_id, payload.to)


@router.get("/shared/{token}")
def shared_report(
    token: str,
    db: Session = Depends(get_db),
):
    """Public: read a shared report by its token (no auth)."""
    res = report_service.get_shared(db, token)
    if res is None:
        raise HTTPException(status_code=404, detail="Shared report not found")
    return res