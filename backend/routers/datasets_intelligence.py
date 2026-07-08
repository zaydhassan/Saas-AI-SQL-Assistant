"""AI Dataset Intelligence routes (Feature 2)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import Dataset, User
from services import dataset_intelligence_service

router = APIRouter(prefix="/api/datasets", tags=["dataset-intelligence"])


def _own_dataset(db: Session, dataset_id: int, user: User) -> Dataset:
    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id, Dataset.user_id == user.id)
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/{dataset_id}/intelligence")
def get_intelligence(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = dataset_intelligence_service.get_cached_profile(db, dataset_id)
    if not profile:
        raise HTTPException(status_code=404, detail="No intelligence profile yet. Call POST /analyze.")
    return profile


@router.post("/{dataset_id}/analyze")
def analyze_dataset(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = _own_dataset(db, dataset_id, user)
    return dataset_intelligence_service.analyze_dataset(db, dataset)