"""Pydantic request/response DTOs (Phase 2 API-surface hardening).

Replaces the previous ``payload: dict`` pattern on representative mutating
endpoints so malformed/unknown inputs are rejected with a structured 422
instead of a 500 (or silent misbehavior). Each model uses ``extra="forbid"`` so
unexpected fields are rejected — callers must send exactly the documented
contract, which closes the door to mass-assignment / typos silently being
persisted via the old ``payload.get(...)`` defaults.

Patch models (AlertUpdate, SmartAlertUpdate, RecommendationUpdate) make every
field optional; ``model_dump(exclude_unset=True)`` yields only the fields the
caller actually sent, preserving the partial-update semantics the services
already implement.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# main.py endpoints
# ---------------------------------------------------------------------------
class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(..., min_length=1, max_length=1000)


class ReportSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sql: str = Field(..., min_length=1, max_length=10000)
    execution_time_ms: float | None = None
    status: str = "success"


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(None, max_length=120)
    profile_image: str | None = Field(None, max_length=500)


class PasswordChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# alerts router
# ---------------------------------------------------------------------------
class AlertCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field("Untitled alert", max_length=200)
    metric: str = Field("revenue", max_length=120)
    condition: str = Field("drops > 10%", max_length=200)
    channel: str = Field("in-app", max_length=60)
    active: bool = True


class AlertUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(None, max_length=200)
    metric: str | None = Field(None, max_length=120)
    condition: str | None = Field(None, max_length=200)
    channel: str | None = Field(None, max_length=60)
    active: bool | None = None


# ---------------------------------------------------------------------------
# forecasts router
# ---------------------------------------------------------------------------
class ForecastGenerate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    metric: str = Field("revenue", max_length=120)
    horizon: int = Field(30, ge=1, le=365)
    dataset_id: int | None = None


# ---------------------------------------------------------------------------
# recommendations router
# ---------------------------------------------------------------------------
class RecommendationGenerate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dataset_id: int | None = None


class RecommendationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # status is validated against VALID_STATUS in the service; keep loose here
    # so the service owns the enum (single source of truth) and returns a clear
    # error on an unknown value.
    status: str | None = Field(None, max_length=20)
    outcome: str | None = Field(None, max_length=1000)


# ---------------------------------------------------------------------------
# ai-reports router
# ---------------------------------------------------------------------------
class ReportGenerate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    report_type: str = Field("daily", max_length=60)
    dataset_id: int | None = None


class ReportSchedule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cadence: str = Field("daily", max_length=60)

    @field_validator("cadence")
    @classmethod
    def _cadence_in(cls, v: str) -> str:
        allowed = {"daily", "weekly", "monthly"}
        if v not in allowed:
            raise ValueError("cadence must be one of daily|weekly|monthly")
        return v


class ReportEmail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    to: EmailStr


# ---------------------------------------------------------------------------
# smart-alerts router
# ---------------------------------------------------------------------------
class SmartAlertUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["open", "resolved", "acknowledged", "snoozed"] | None = None
    assigned_to: str | None = Field(None, max_length=120)
    pinned: bool | None = None
    muted: bool | None = None
    comment: str | None = Field(None, max_length=500)


__all__ = [
    "AskRequest", "ReportSaveRequest", "ProfileUpdateRequest",
    "PasswordChangeRequest", "AlertCreate", "AlertUpdate", "ForecastGenerate",
    "RecommendationGenerate", "RecommendationUpdate", "ReportGenerate",
    "ReportSchedule", "ReportEmail", "SmartAlertUpdate",
]