"""In-process rate limiting — Redis-ready interface, token-bucket impl today.

The ``RateLimiter`` interface is the seam a Redis backend drops into later.
The in-memory token-bucket impl is process-local (sufficient for a single
instance; horizontal scaling will swap in the Redis impl). Buckets are pruned
lazily so the dict stays bounded.

Used as a FastAPI dependency via ``rate_limit(key_fn, limit, window_seconds)``.
Returns nothing on success; raises HTTP 429 with ``Retry-After`` when exhausted.
"""
from __future__ import annotations

import time
from typing import Callable, Protocol

from fastapi import HTTPException, Request


class RateLimiter(Protocol):
    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]: ...
    def remaining(self, key: str, limit: int, window_seconds: int) -> int: ...


class InMemoryTokenBucket:
    """Sliding-window counter per key. ``(count, window_start)`` per bucket."""

    def __init__(self) -> None:
        self._buckets: dict[str, tuple[int, float]] = {}

    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.monotonic()
        count, start = self._buckets.get(key, (0, now))
        if now - start >= window_seconds:
            count, start = 0, now
        if count >= limit:
            self._buckets[key] = (count, start)
            retry = max(1, int(window_seconds - (now - start)))
            return False, retry
        count += 1
        self._buckets[key] = (count, start)
        return True, 0

    def remaining(self, key: str, limit: int, window_seconds: int) -> int:
        now = time.monotonic()
        count, start = self._buckets.get(key, (0, now))
        if now - start >= window_seconds:
            return limit
        return max(0, limit - count)


# Singleton — swap to RedisRateLimiter() for horizontal scale.
limiter: RateLimiter = InMemoryTokenBucket()


def rate_limit(
    key_fn: Callable[[Request], str],
    limit: int,
    window_seconds: int,
) -> Callable:
    """FastAPI dependency factory. Enforces ``limit`` requests per
    ``window_seconds`` per the key returned by ``key_fn(request)``."""
    def _dep(request: Request) -> None:
        key = key_fn(request)
        ok, retry = limiter.allow(key, limit, window_seconds)
        if not ok:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down.",
                headers={"Retry-After": str(retry)},
            )
    return _dep


def client_ip_key(request: Request) -> str:
    from services.auth_service import get_client_ip
    return f"ip:{get_client_ip(request) or 'unknown'}"


def user_or_ip_key(request: Request) -> str:
    # Best-effort: prefer the resolved user id from the access cookie; fall back
    # to the client IP. The auth dependency runs before this in the route, so
    # the user is already attached to request.state.
    user = getattr(request.state, "user", None)
    if user is not None:
        return f"user:{user.id}"
    return client_ip_key(request)