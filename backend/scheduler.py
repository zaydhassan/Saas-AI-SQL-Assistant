"""APScheduler — periodic background jobs for the BI Copilot.

Started/stopped via a FastAPI lifespan context on `app`. Two recurring jobs:
- smart-alert scan every 10 minutes across all users with data.
- scheduled-report scan every 5 minutes (generates + emails due reports).

Both jobs swallow their own exceptions so a failure in one user's scan never
stops the scheduler. Keeps a module-level handle so main.py can start/stop it.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger("scheduler")

_scheduler: AsyncIOScheduler | None = None


def _scan_all_smart_alerts() -> None:
    """Periodic entrypoint: run smart-alert detection for every user."""
    try:
        from services import smart_alert_service
        smart_alert_service.scan_all_users()
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("smart-alert periodic scan failed: %s", exc)


def _run_due_reports() -> None:
    """Periodic entrypoint: generate + email due scheduled reports."""
    try:
        from services import report_service
        report_service.run_due_reports()
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("scheduled-report scan failed: %s", exc)


def _build() -> AsyncIOScheduler:
    sched = AsyncIOScheduler(timezone="UTC")
    sched.add_job(_scan_all_smart_alerts, "interval", minutes=10, id="smart-alert-scan")
    sched.add_job(_run_due_reports, "interval", minutes=5, id="scheduled-report-scan")
    return sched


@asynccontextmanager
async def lifespan(app):
    """FastAPI lifespan: start the scheduler on boot, stop on shutdown."""
    global _scheduler
    _scheduler = _build()
    _scheduler.start()
    logger.info("APScheduler started")
    try:
        yield
    finally:
        if _scheduler:
            _scheduler.shutdown(wait=False)
            logger.info("APScheduler stopped")
        _scheduler = None