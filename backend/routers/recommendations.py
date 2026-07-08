"""AI Recommendation Engine routes (Feature 9)."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from schemas import RecommendationGenerate, RecommendationUpdate
from services import recommendation_service
from services.idempotency_store import idempotent

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("")
def list_recs(
    status: str | None = Query(None),
    category: str | None = Query(None),
    priority: str | None = Query(None),
    search: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return recommendation_service.list_recommendations(
        db, user.id, {"status": status, "category": category, "priority": priority, "search": search}
    )


@router.get("/stats")
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return recommendation_service.stats(db, user.id)


@router.post("/generate")
@idempotent
def generate(
    request: Request,
    payload: RecommendationGenerate | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset_id = payload.dataset_id if payload else None
    return recommendation_service.generate_recommendations(db, user, dataset_id=dataset_id)


@router.get("/history")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return recommendation_service.history(db, user.id)


@router.patch("/{rec_id}")
def update_rec(
    rec_id: int,
    payload: RecommendationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = recommendation_service.update_recommendation(db, user.id, rec_id, payload.model_dump(exclude_unset=True))
    if res is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return res