"""SQL History routes — connect the History page to a real backend (Phase 1)."""
from fastapi import APIRouter, Depends, Query as QueryParam
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from services import analytics_service

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/queries")
def list_queries(
    page: int = QueryParam(1, ge=1),
    limit: int = QueryParam(20, ge=1, le=100),
    search: str | None = QueryParam(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return analytics_service.list_user_queries(db, user.id, page=page, limit=limit, search=search)