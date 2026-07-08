"""Auth service — brute-force lockout, audit logging, client-IP capture,
token issuance/rotation/revocation.

All token issuance funnels through ``issue_tokens`` so claims/cookies stay
consistent. Refresh-token rotation revokes the old refresh ``jti`` before
issuing a new pair. Logout revokes the access + refresh ``jti``.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import Request, Response
from sqlalchemy.orm import Session

from auth import (
    clear_auth_cookies, create_access_token, create_refresh_token,
    decode_token, set_auth_cookies, ACCESS_TYPE, REFRESH_TYPE,
)
from config import settings
from models import AuditLog, FailedLogin, User
from services.revocation_store import store as revocation_store

logger = logging.getLogger("auth_service")


# ---------------------------------------------------------------------------
# Client IP capture (trusted-proxy aware).
# ---------------------------------------------------------------------------

def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Leftmost is the original client (assuming a trusted proxy chain).
        return forwarded.split(",")[0].strip() or None
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip() or None
    if request.client:
        return request.client.host
    return None


def get_user_agent(request: Request) -> str | None:
    ua = request.headers.get("user-agent")
    return (ua[:300] if ua else None)  # cap length


# ---------------------------------------------------------------------------
# Audit logging.
# ---------------------------------------------------------------------------

def record_audit(
    db: Session,
    user_id: int | None,
    action: str,
    request: Request | None = None,
    entity: str | None = None,
    entity_id: str | int | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """Append an audit row. Best-effort: never raises into the request path."""
    try:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            ip=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            payload_json=payload,
        ))
        db.commit()
    except Exception as exc:
        logger.warning("audit record failed for %s: %s", action, exc)
        db.rollback()


# ---------------------------------------------------------------------------
# Brute-force lockout.
# ---------------------------------------------------------------------------

def record_failed_login(db: Session, email: str, ip: str | None) -> None:
    try:
        db.add(FailedLogin(email=email, ip=ip))
        db.commit()
    except Exception as exc:
        logger.warning("failed-login record failed: %s", exc)
        db.rollback()


def _recent_fail_count(db: Session, email: str, ip: str | None) -> int:
    since = datetime.utcnow() - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    q = db.query(FailedLogin).filter(FailedLogin.email == email, FailedLogin.attempted_at >= since)
    if ip:
        q = q.filter((FailedLogin.ip == ip) | (FailedLogin.ip.is_(None)))
    return q.count()


def is_locked(db: Session, email: str, ip: str | None) -> bool:
    return _recent_fail_count(db, email, ip) >= settings.LOGIN_MAX_ATTEMPTS


def clear_failed_logins(db: Session, email: str) -> None:
    try:
        db.query(FailedLogin).filter(FailedLogin.email == email).delete()
        db.commit()
    except Exception:
        db.rollback()


# ---------------------------------------------------------------------------
# Token issuance / rotation / revocation.
# ---------------------------------------------------------------------------

def issue_tokens(response: Response, user: User) -> dict[str, Any]:
    """Create an access+refresh pair, set them as HttpOnly cookies, and return
    a minimal public body (no tokens in the body)."""
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    set_auth_cookies(response, access, refresh)
    return {
        "user": {"id": user.id, "email": user.email},
        "access_expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    }


def rotate_refresh_token(db: Session, response: Response, refresh_token: str) -> dict[str, Any] | None:
    """Validate the refresh token, revoke its jti (single-use rotation), and
    issue a fresh pair. Returns None if the token is invalid/expired/revoked."""
    payload = decode_token(refresh_token, expected_type=REFRESH_TYPE)
    if not payload:
        return None
    jti = payload["jti"]
    if revocation_store.is_revoked(db, jti):
        # Reuse detected — do NOT issue a new token. Caller returns 401.
        return None
    # Revoke the old refresh jti (rotation).
    exp = payload.get("exp")
    exp_dt = datetime.utcfromtimestamp(exp) if exp else None
    revocation_store.revoke(db, jti, REFRESH_TYPE, exp_dt)

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    return issue_tokens(response, user)


def revoke_session(db: Session, response: Response, access_token: str | None, refresh_token: str | None) -> None:
    """Secure logout: revoke both jtis by their natural expiry, then clear cookies."""
    for token, kind in ((access_token, ACCESS_TYPE), (refresh_token, REFRESH_TYPE)):
        if not token:
            continue
        payload = decode_token(token, expected_type=kind)
        if not payload:
            continue
        exp = payload.get("exp")
        exp_dt = datetime.utcfromtimestamp(exp) if exp else None
        revocation_store.revoke(db, payload["jti"], kind, exp_dt)
    clear_auth_cookies(response)