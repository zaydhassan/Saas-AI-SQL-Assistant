"""AI Daily Briefing routes (Feature 3)."""
from fastapi import APIRouter, Depends, Query as QueryParam
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from services import briefing_service

router = APIRouter(prefix="/api", tags=["briefing"])


@router.get("/briefing")
def get_briefing(
    force: bool = QueryParam(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return briefing_service.generate_briefing(db, user, force=force)