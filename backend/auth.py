"""Authentication primitives: password hashing (Argon2 + legacy bcrypt),
JWT access/refresh tokens with jti/iat/iss/aud claims, refresh-token rotation,
revocation, and HTTPOnly cookie helpers.

Hardening (Phase H1):
- Argon2id is the default scheme; legacy bcrypt hashes verify transparently and
  are rehashed to Argon2 on the next successful login (see ``auth_service``).
- JWTs are short-lived access (15 min) + long-lived refresh (7 d), each with a
  unique ``jti`` so they can be individually revoked. Refresh tokens are
  rotated: the old ``jti`` is revoked on use.
- Tokens travel in HTTPOnly Secure SameSite cookies, never in the JSON body or
  localStorage. Cookies are set/cleared via ``set_auth_cookies`` /
  ``clear_auth_cookies``.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta
from typing import Any

from jose import jwt, JWTError
from passlib.context import CryptContext

from config import settings

logger = logging.getLogger("auth")

ALGORITHM = "HS256"
ISSUER = "ai-bi-copilot"
AUDIENCE = "ai-bi-copilot-users"

ACCESS_TYPE = "access"
REFRESH_TYPE = "refresh"

# Argon2 first (new hashes), bcrypt kept for transparent verification of
# pre-hardening hashes. ``deprecated="auto"`` marks bcrypt as deprecated so
# ``pwd_context.needs_update(bcrypt_hash)`` returns True → rehash on login.
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    """True if the stored hash is a deprecated scheme (bcrypt) and should be
    upgraded to Argon2 on the next successful login."""
    try:
        return pwd_context.needs_update(hashed)
    except Exception:
        return False


def _create_token(sub: str, token_type: str, expires_delta: timedelta, jti: str | None = None) -> str:
    now = datetime.utcnow()
    payload: dict[str, Any] = {
        "sub": sub,
        "iat": now,
        "exp": now + expires_delta,
        "jti": jti or secrets.token_urlsafe(16),
        "iss": ISSUER,
        "aud": AUDIENCE,
        "type": token_type,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(sub: str, jti: str | None = None) -> str:
    return _create_token(
        sub, ACCESS_TYPE,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        jti=jti,
    )


def create_refresh_token(sub: str, jti: str | None = None) -> str:
    return _create_token(
        sub, REFRESH_TYPE,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        jti=jti,
    )


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any] | None:
    """Decode + validate a JWT. Returns the payload on success, or ``None`` on
    any failure (expired, tampered, bad iss/aud/type). If ``expected_type`` is
    given, the token's ``type`` claim must match."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY,
            algorithms=[ALGORITHM], audience=AUDIENCE, issuer=ISSUER,
        )
    except JWTError:
        return None
    if expected_type and payload.get("type") != expected_type:
        return None
    if "sub" not in payload or "jti" not in payload:
        return None
    return payload


# ---------------------------------------------------------------------------
# Cookie helpers — the only place tokens touch an HTTP response.
# ---------------------------------------------------------------------------

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf"


def _cookie_kwargs(max_age: int) -> dict[str, Any]:
    return {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "max_age": max_age,
        "path": "/",
        "domain": settings.COOKIE_DOMAIN,
    }


def set_auth_cookies(response, access: str, refresh: str, csrf: str | None = None) -> None:
    """Attach access + refresh (HttpOnly) and csrf (readable by JS) cookies."""
    response.set_cookie(ACCESS_COOKIE, access, **_cookie_kwargs(
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    response.set_cookie(REFRESH_COOKIE, refresh, **_cookie_kwargs(
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600))
    # CSRF double-submit token: non-HttpOnly so the SPA can read it and echo it
    # back as the X-CSRF-Token header. SameSite keeps it scoped.
    response.set_cookie(
        CSRF_COOKIE, csrf or secrets.token_urlsafe(24),
        httponly=False, secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/", domain=settings.COOKIE_DOMAIN,
    )


def clear_auth_cookies(response) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(
            name, path="/", domain=settings.COOKIE_DOMAIN,
            samesite=settings.COOKIE_SAMESITE, secure=settings.COOKIE_SECURE,
        )