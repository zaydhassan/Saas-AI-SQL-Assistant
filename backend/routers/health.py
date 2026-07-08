"""Business Health Score routes (secret feature)."""
from fastapi import APIRouter, Depends, Query as QueryParam
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from services import health_service

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health-score")
def get_health_score(
    force: bool = QueryParam(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return health_service.compute_health(db, user.id, force=force)