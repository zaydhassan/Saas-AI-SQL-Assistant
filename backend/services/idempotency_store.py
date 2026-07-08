"""Idempotency store — caches mutating-request responses keyed by a
client-supplied ``Idempotency-Key`` header so a replayed request returns the
original result instead of double-executing.

The ``IdempotencyStore`` interface is the seam a Redis backend drops into later
(distributed lock + TTL). The in-DB impl persists to ``IdempotencyRecord`` and
prunes expired rows opportunistically.

Two integration points:
- ``get_cached_response(db, key, user_id, path)`` — dep used at the TOP of a
  route: if a cached response exists, it is returned directly (skipping the
  route body).
- ``save_response(...)`` — called by ``IdempotencyResponder`` (below) to persist
  the response the route produced, so the next replay hits the cache.

The ``IdempotencyResponder`` helper wraps a route's return value: the route runs
normally, and its (status, body) is persisted against the key. On replay, the
dep returns the cached (status, body) as a ``JSONResponse`` before the route runs.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Protocol

from fastapi import Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from db import get_db
from models import IdempotencyRecord, User

logger = logging.getLogger("idempotency")

IDEMPOTENCY_TTL_HOURS = 24


class IdempotencyStore(Protocol):
    def get(self, db: Session, key: str, user_id: int | None, path: str) -> dict[str, Any] | None: ...
    def save(
        self, db: Session, key: str, user_id: int | None, path: str, method: str,
        status_code: int, body: Any,
    ) -> None: ...
    def prune(self, db: Session) -> int: ...


class DbIdempotencyStore:
    """Persists idempotency records in the DB. Prunes expired rows lazily on
    each save (cheap; keeps the table bounded without a separate job)."""

    def get(self, db: Session, key: str, user_id: int | None, path: str) -> dict[str, Any] | None:
        rec = (
            db.query(IdempotencyRecord)
            .filter(
                IdempotencyRecord.key == key,
                IdempotencyRecord.path == path,
                IdempotencyRecord.user_id == (user_id if user_id is not None else None),
            )
            .first()
        )
        if not rec:
            return None
        if rec.expires_at and rec.expires_at <= datetime.utcnow():
            db.delete(rec)
            db.commit()
            return None
        return {
            "status_code": rec.status_code or 200,
            "body": rec.response_json,
        }

    def save(
        self, db: Session, key: str, user_id: int | None, path: str, method: str,
        status_code: int, body: Any,
    ) -> None:
        try:
            rec = IdempotencyRecord(
                key=key, user_id=user_id, path=path, method=method,
                status_code=status_code, response_json=body,
                expires_at=datetime.utcnow() + timedelta(hours=IDEMPOTENCY_TTL_HOURS),
            )
            db.add(rec)
            db.commit()
            # Opportunistic prune.
            self._prune(db)
        except Exception as exc:
            logger.warning("idempotency save failed for key=%s: %s", key, exc)
            db.rollback()

    def prune(self, db: Session) -> int:
        return self._prune(db)

    def _prune(self, db: Session) -> int:
        try:
            cutoff = datetime.utcnow()
            deleted = db.query(IdempotencyRecord).filter(
                IdempotencyRecord.expires_at is not None,
                IdempotencyRecord.expires_at <= cutoff,
            ).delete()
            db.commit()
            return deleted
        except Exception:
            db.rollback()
            return 0


# Singleton — swap to RedisIdempotencyStore() for distributed scale.
store: IdempotencyStore = DbIdempotencyStore()


def _extract_key(request: Request) -> str | None:
    # Validate shape: non-empty, reasonable length, no whitespace/control chars.
    raw = request.headers.get("idempotency-key")
    if not raw:
        return None
    key = raw.strip()
    if not key or len(key) > 200 or any(c.isspace() for c in key):
        raise HTTPException(status_code=400, detail="Invalid Idempotency-Key")
    return key


def idempotent(
    handler: Callable[..., Any],
) -> Callable[..., Any]:
    """Decorator for a POST route: if the request carries an ``Idempotency-Key``
    header, replay it from cache. The wrapped handler runs once and its result is
    persisted. Used on /api/ai-reports/generate, /api/forecasts/generate,
    /api/datasets/upload.

    Async-aware: works for both ``async def`` and ``def`` handlers. The handler
    must declare ``request: Request`` (so we can read the header + path), plus
    ``user`` and ``db`` deps; FastAPI resolves and passes them as keyword args.
    """
    import inspect
    from functools import wraps

    is_async = inspect.iscoroutinefunction(handler)

    @wraps(handler)
    async def wrapper(*args, **kwargs):
        request: Request | None = kwargs.get("request")
        user = kwargs.get("user")
        db: Session | None = kwargs.get("db")
        if request is None:
            # No request dep → idempotency is a no-op.
            return await handler(*args, **kwargs) if is_async else handler(*args, **kwargs)
        try:
            key = _extract_key(request)
        except HTTPException:
            raise
        if not key or db is None:
            return await handler(*args, **kwargs) if is_async else handler(*args, **kwargs)

        user_id = getattr(user, "id", None)
        path = request.url.path
        cached = store.get(db, key, user_id, path)
        if cached is not None:
            return JSONResponse(content=cached["body"], status_code=cached["status_code"])

        result = handler(*args, **kwargs)
        if inspect.iscoroutine(result):
            result = await result

        # Normalize a Response/JSONResponse to (status, body).
        if isinstance(result, Response):
            status_code = result.status_code
            body = None
            if isinstance(result, JSONResponse):
                try:
                    raw = result.body.decode("utf-8") if isinstance(result.body, (bytes, bytearray)) else result.body
                    import json
                    body = json.loads(raw) if raw else None
                except Exception:
                    body = None
        else:
            status_code = 200
            body = result
        store.save(db, key, user_id, path, request.method, status_code, body)
        return result

    return wrapper


__all__ = ["IdempotencyStore", "DbIdempotencyStore", "store", "idempotent"]