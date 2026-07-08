"""JWT revocation store — Redis-ready interface, in-DB implementation today.

Tracks revoked ``jti`` values (logout + refresh-token rotation). The interface
(``RevocationStore``) is the seam a Redis backend drops into later without
touching callers. The in-DB impl persists to ``TokenRevocation`` and prunes
rows past their natural expiry on read.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Protocol

from sqlalchemy.orm import Session

from models import TokenRevocation

logger = logging.getLogger("revocation_store")


class RevocationStore(Protocol):
    def revoke(self, db: Session, jti: str, kind: str, expires_at: datetime | None) -> None: ...
    def is_revoked(self, db: Session, jti: str) -> bool: ...


class DbRevocationStore:
    """Persists revoked jti rows; prunes expired ones opportunistically."""

    def revoke(self, db: Session, jti: str, kind: str, expires_at: datetime | None) -> None:
        existing = db.query(TokenRevocation).filter(TokenRevocation.jti == jti).first()
        if existing:
            return
        db.add(TokenRevocation(jti=jti, kind=kind, expires_at=expires_at))
        db.commit()

    def is_revoked(self, db: Session, jti: str) -> bool:
        row = db.query(TokenRevocation).filter(TokenRevocation.jti == jti).first()
        if not row:
            return False
        # Opportunistic prune: if the token would have expired naturally, drop
        # the row so the table stays bounded.
        if row.expires_at:
            try:
                if datetime.utcnow() > row.expires_at.replace(tzinfo=None):
                    db.delete(row)
                    db.commit()
                    return False
            except Exception:
                pass
        return True


# Singleton used by deps + auth_service. Swap to RedisRevocationStore() later.
store: RevocationStore = DbRevocationStore()