"""Shared FastAPI dependencies.

``get_current_user`` reads the access token from the HTTPOnly ``access_token``
cookie (Phase H1 cookie transport). A fallback Bearer header is still honored
so non-browser clients (curl, tests) can mint a token via /auth/login-cookie
or use a Bearer token without a cookie jar. ``get_current_user_refresh``
resolves the refresh cookie for the rotation flow.
"""
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth import ACCESS_COOKIE, REFRESH_COOKIE, decode_token
from db import get_db
from models import User
from services.revocation_store import store as revocation_store


def _user_from_token(db: Session, token: str | None, expected_type: str) -> User | None:
    if not token:
        return None
    payload = decode_token(token, expected_type=expected_type)
    if not payload:
        return None
    if revocation_store.is_revoked(db, payload["jti"]):
        return None
    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None
    return db.query(User).filter(User.id == user_id).first()


def _access_token(request: Request) -> str | None:
    # Cookie first (browser); Authorization: Bearer second (API clients/tests).
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        return token
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1]
    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = _access_token(request)
    user = _user_from_token(db, token, expected_type="access")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Attach for downstream rate-limit keying (user_or_ip_key).
    request.state.user = user
    return user


def get_current_user_refresh(
    request: Request,
    db: Session = Depends(get_db),
) -> str | None:
    """Return the raw refresh cookie (the rotation endpoint decodes it)."""
    return request.cookies.get(REFRESH_COOKIE)