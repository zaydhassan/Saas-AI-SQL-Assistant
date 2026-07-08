"""Security response headers (Phase 2).

Applies a baseline set of security headers to every response, including static
asset responses (avatars served from /uploads). Content-Security-Policy is
emitted in report-only style here is intentionally avoided — we enforce it for
API responses (which carry no markup) so a browser rendering a JSON blob or a
downloaded file cannot run untrusted script. The frontend's own CSP is set by
Next.js headers() in next.config (Phase 7) for HTML responses; this middleware
covers the API + uploads surface.

HSTS is only sent when the request arrived over HTTPS (so dev on http://localhost
isn't pinned). X-Frame-Options DENY prevents clickjacking; we don't frame the app.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Permissions-Policy: deny everything we don't explicitly use.
_PERMISSIONS_POLICY = (
    "geolocation=(), microphone=(), camera=(), payment=(), "
    "usb=(), magnetometer=(), gyroscope=(), accelerometer=(), "
    "interest-cohort=()"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        # Defense-in-depth headers. CSP for the API surface: block everything,
        # allow only same-origin connects (the SPA talks to this same origin in
        # prod; dev uses a separate origin handled by CORS + the frontend's own
        # CSP via Next).
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = _PERMISSIONS_POLICY
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'",
        )
        # HSTS only on TLS — never over plain HTTP (would pin a broken cert).
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return response