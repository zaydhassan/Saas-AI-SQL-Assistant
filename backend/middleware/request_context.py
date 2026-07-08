"""Request-correlation middleware (Phase 2 minimal; expanded in Phase 5).

Generates (or honors an inbound) ``X-Request-ID`` and stores it in a contextvar
so the global exception handler and log lines can attach it. The id is echoed on
every response header so a client/support can correlate a failing request.

Phase 5 adds structured JSON logging + an access log that consume this same
contextvar, so this is the foundational seam.
"""
from __future__ import annotations

import contextvars
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"
request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


def get_request_id() -> str | None:
    return request_id_ctx.get()


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get(REQUEST_ID_HEADER.lower()) or uuid.uuid4().hex
        token = request_id_ctx.set(rid)
        try:
            response: Response = await call_next(request)
            response.headers[REQUEST_ID_HEADER] = rid
            return response
        finally:
            request_id_ctx.reset(token)