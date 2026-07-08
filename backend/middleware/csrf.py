"""CSRF protection via the double-submit-cookie pattern.

On every response we ensure a non-HttpOnly ``csrf`` cookie exists (seeded if
absent). On state-changing requests (POST/PUT/PATCH/DELETE) we require the
``X-CSRF-Token`` header to match the ``csrf`` cookie value. SameSite=Lax on the
cookie plus the Origin check provides defense-in-depth; the header check is
the primary guard.

Exempt paths: the Stripe webhook (authenticated by HMAC signature, no CSRF
token possible) and the WS upgrade (auth is via a short-lived ticket, validated
in ws.py).
"""
from __future__ import annotations

import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from auth import CSRF_COOKIE
from config import settings

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
EXEMPT_PATHS = {"/webhook/stripe", "/ws/notifications"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Exempt the signature-authed webhook + the WS upgrade.
        path = request.url.path
        if path in EXEMPT_PATHS:
            return await call_next(request)

        if request.method not in SAFE_METHODS:
            cookie_val = request.cookies.get(CSRF_COOKIE)
            header_val = request.headers.get("x-csrf-token")
            if not cookie_val or not header_val or not _consttime_eq(cookie_val, header_val):
                return Response(
                    content='{"detail":"CSRF token missing or invalid"}',
                    status_code=403,
                    media_type="application/json",
                )

        response: Response = await call_next(request)

        # Seed the csrf cookie if the client doesn't already have one. This
        # means a GET (e.g. /api/auth/csrf) before a POST guarantees the client
        # has a token to echo back.
        if CSRF_COOKIE not in request.cookies:
            response.set_cookie(
                CSRF_COOKIE, secrets.token_urlsafe(24),
                httponly=False, secure=settings.COOKIE_SECURE,
                samesite=settings.COOKIE_SAMESITE,
                max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
                path="/", domain=settings.COOKIE_DOMAIN,
            )
        return response


def _consttime_eq(a: str, b: str) -> bool:
    """Constant-time string compare to avoid timing side-channels."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0