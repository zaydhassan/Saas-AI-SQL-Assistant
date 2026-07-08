"""WebSocket connection manager + the /ws/notifications endpoint.

Authenticates the upgrade via a **short-lived single-use ticket** obtained
from ``POST /api/auth/ws-ticket`` (which requires an authenticated session).
The ticket is redeemed exactly once and lives ~30 seconds. This replaces the
old ``?token=<jwt>`` flow, which leaked long-lived access tokens into URLs
(access logs, proxy logs, browser history).

Keeps a per-user set of connections so ``notifications_service`` can broadcast
a live event to a user's open tabs. Falls back gracefully to plain in-app
notifications when no socket is connected — the bell polling still works.
"""
from __future__ import annotations

import logging
import secrets
import time
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from config import settings
from db import get_db
from deps import get_current_user
from models import User
from services.auth_service import record_audit

logger = logging.getLogger("ws")

# user_id -> set of open websockets. Tolerates multiple tabs per user.
_connections: dict[int, set[WebSocket]] = {}

# Single-use WS tickets: ticket -> (user_id, expires_at_monotonic).
_TICKET_TTL_SECONDS = 30
_tickets: dict[str, tuple[int, float]] = {}


def mint_ticket(user_id: int) -> str:
    """Issue a short-lived, single-use ticket that authenticates one WS upgrade."""
    ticket = secrets.token_urlsafe(24)
    _tickets[ticket] = (user_id, time.monotonic() + _TICKET_TTL_SECONDS)
    # Opportunistic prune of expired tickets to keep the dict bounded.
    _prune_tickets()
    return ticket


def _prune_tickets() -> None:
    now = time.monotonic()
    expired = [t for t, (_, exp) in _tickets.items() if exp <= now]
    for t in expired:
        _tickets.pop(t, None)


def redeem_ticket(ticket: str | None) -> int | None:
    """Consume a ticket. Returns the user_id on success, None if
    missing/expired/already-used. A ticket is valid for exactly one redemption."""
    if not ticket:
        return None
    entry = _tickets.pop(ticket, None)
    if entry is None:
        return None
    user_id, exp = entry
    if exp <= time.monotonic():
        return None
    return user_id


def connect(user_id: int, ws: WebSocket) -> None:
    _connections.setdefault(user_id, set()).add(ws)


def disconnect(user_id: int, ws: WebSocket) -> None:
    conns = _connections.get(user_id)
    if conns and ws in conns:
        conns.remove(ws)
        if not conns:
            _connections.pop(user_id, None)


async def broadcast(user_id: int, event: dict[str, Any]) -> None:
    """Push an event JSON to every open socket for the user. Best-effort."""
    conns = list(_connections.get(user_id, set()))
    for ws in conns:
        try:
            await ws.send_json(event)
        except Exception as exc:
            logger.debug("ws broadcast to user %s failed: %s", user_id, exc)


def broadcast_sync(user_id: int, event: dict[str, Any]) -> None:
    """Fire-and-forget broadcast from a sync context (service layer).

    Schedules the coroutine on the running event loop if there is one; if no
    loop is running (e.g. a background thread without the loop), it silently
    no-ops — the persisted Notification row is still delivered via polling.
    """
    import asyncio

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No running loop in this thread — skip live push; polling covers it.
        return
    try:
        asyncio.ensure_future(broadcast(user_id, event))
    except Exception as exc:  # pragma: no cover - defensive
        logger.debug("broadcast_sync scheduling failed: %s", exc)


def register_ws(app: FastAPI) -> None:
    """Attach the /ws/notifications endpoint + the /api/auth/ws-ticket minter."""

    @app.post("/api/auth/ws-ticket")
    def mint_ws_ticket(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # Auth-gated: only an authenticated session can mint a WS ticket.
        record_audit(db, user.id, "ws.ticket.minted", entity="user", entity_id=user.id)
        return {"ticket": mint_ticket(user.id), "expires_in": _TICKET_TTL_SECONDS}

    @app.websocket("/ws/notifications")
    async def ws_notifications(websocket: WebSocket, ticket: str | None = None):
        user_id = redeem_ticket(ticket)
        if user_id is None:
            await websocket.close(code=4401)
            return

        await websocket.accept()
        connect(user_id, websocket)
        # Send an immediate hello so the client knows the link is live.
        await websocket.send_json({"type": "hello", "user_id": user_id})
        try:
            # We don't expect client messages; just keep the socket open and
            # discard anything received until the client disconnects.
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            disconnect(user_id, websocket)


# Exposed for the auth router (main.py) — kept here so the ticket store is the
# single source of truth for WS auth.
ws_ticket_router = APIRouter()