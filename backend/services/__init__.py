"""Scalable service layer for the AI BI Copilot.

Each module exposes pure functions that take a SQLAlchemy session (and user)
and return plain dicts, keeping route handlers thin and logic reusable across
features (insights, briefing, health, investigations, dashboards).
"""