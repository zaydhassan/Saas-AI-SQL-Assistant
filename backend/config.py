"""Centralized environment configuration & startup validation.

Replaces the scattered ``os.getenv`` + ad-hoc ``RuntimeError``/``ValueError``
checks across ``db.py``, ``auth.py``, ``gemini_client.py``, ``stripe_webhook.py``,
``main.py`` with a single pydantic-settings model that fails fast at import with
a clear message if a required secret is missing or weak.

Importing ``settings`` triggers validation; a missing/weak setting raises
``ValidationError`` (logged before the app can boot). Every module that needs a
secret reads it from here instead of ``os.getenv``.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=True)

    # --- database ---
    DATABASE_URL: str
    # Optional read-only DSN (Phase 3); falls back to DATABASE_URL.
    DATABASE_URL_RO: str | None = None

    # --- auth ---
    JWT_SECRET_KEY: str = Field(min_length=32)
    # Separate secret for cookie/CSRF signing. Falls back to JWT_SECRET_KEY.
    SESSION_SECRET: str | None = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Cookies are only Secure in production (dev is http://localhost).
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"  # "lax" | "strict" | "none"
    COOKIE_DOMAIN: str | None = None

    # --- AI ---
    GEMINI_API_KEY: str
    GEMINI_TEXT_MODEL: str = "gemini-2.5-flash"
    GEMINI_JSON_MODEL: str = "gemini-2.5-flash"
    GEMINI_STREAM_MODEL: str = "gemini-2.5-flash"

    # --- Stripe ---
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_PRO_PRICE_ID: str

    # --- frontend / CORS ---
    FRONTEND_URL: str = "http://localhost:3000"
    # Comma-separated extra allowed CORS origins.
    EXTRA_CORS_ORIGINS: str = ""

    # --- rate limiting / lockout ---
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    @field_validator("COOKIE_SAMESITE")
    @classmethod
    def _samesite(cls, v: str) -> str:
        v = (v or "lax").lower()
        if v not in ("lax", "strict", "none"):
            raise ValueError("COOKIE_SAMESITE must be lax|strict|none")
        return v

    @property
    def cors_origins(self) -> list[str]:
        origins = [o.strip() for o in (self.FRONTEND_URL or "").split(",") if o.strip()]
        extra = [o.strip() for o in (self.EXTRA_CORS_ORIGINS or "").split(",") if o.strip()]
        # De-duplicate, keep order.
        seen: set[str] = set()
        out: list[str] = []
        for o in origins + extra:
            if o not in seen:
                seen.add(o)
                out.append(o)
        return out

    @property
    def session_secret(self) -> str:
        return self.SESSION_SECRET or self.JWT_SECRET_KEY


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # validated at first access


# Eager singleton: validates at import time so misconfiguration fails the boot.
settings = get_settings()