"""Executive Command Center routes (Feature 10)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from services import executive_service

router = APIRouter(prefix="/api", tags=["command-center"])


@router.get("/command-center")
def get_command_center(
    force: bool = Query(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return executive_service.compute_command_center(db, user, force=force)