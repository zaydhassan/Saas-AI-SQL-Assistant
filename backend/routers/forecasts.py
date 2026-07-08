"""AI Forecasting Engine routes (Feature 8)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from schemas import ForecastGenerate
from services import forecast_service
from services.idempotency_store import idempotent

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])

logger = logging.getLogger("forecasts")


@router.get("")
def list_forecasts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return forecast_service.list_forecasts(db, user.id)


@router.post("/generate")
@idempotent
def generate_forecast(
    request: Request,
    payload: ForecastGenerate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return forecast_service.generate_forecast(
            db, user, payload.metric, payload.horizon, payload.dataset_id
        )
    except ValueError as exc:
        # Generic message; the detail is logged.
        logger.warning("forecast generate failed: %s", exc)
        raise HTTPException(status_code=400, detail="Unable to generate forecast")


@router.get("/{forecast_id}")
def get_forecast(
    forecast_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    res = forecast_service.get_forecast(db, user.id, forecast_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return res