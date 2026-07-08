"""AI Forecasting Engine (Feature 8).

Predicts Revenue / Sales / Profit / Demand / Inventory / Customer Growth /
Churn / Subscriptions / Cash Flow for a configurable horizon, with a
confidence interval, prediction accuracy (MAPE backtest), historical
comparison, trend, a plain-language business explanation, and recommended
actions.

The numeric core is Holt's linear trend (level + trend recursion) implemented
in numpy — no statsmodels dependency. The series is built from the user's
recent successful query results: a date column is detected with the same
\\d{4}-\\d{2} heuristic ChartRenderer uses, and the metric column by keyword
match (reusing briefing_service's KPI keyword catalog). Falls back to an
index series when no date column is present.

Results are cached in the `forecasts` table with a ~1h TTL. All numpy scalars
are coerced to native Python before storage (psycopg2 misreads np.float64).
The Gemini explanation degrades to a deterministic stub on failure.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from models import Forecast, Query, User
from services import ai_service, notifications_service
from services.briefing_service import KPI_METRICS

logger = logging.getLogger("forecast_service")

TTL = timedelta(hours=1)
_DATE_RE = re.compile(r"\d{4}-\d{2}")

FORECAST_SCHEMA = {
    "type": "object",
    "properties": {
        "trend": {"type": "string"},                 # up / down / flat
        "business_explanation": {"type": "string"},
        "recommended_actions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["business_explanation", "recommended_actions"],
}

METRIC_KEYWORDS = {
    k: kw for k, _, kw in KPI_METRICS
}


def _safe_float(v: Any) -> float | None:
    try:
        if v is None:
            return None
        f = float(v)
        if not np.isfinite(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _to_native(v: Any) -> Any:
    """JSON-safe coercion for numpy/pandas scalars."""
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if not np.isfinite(f) else round(f, 4)
    if isinstance(v, float):
        return None if not np.isfinite(v) else round(v, 4)
    return v


def _keyword_for(metric: str) -> list[str]:
    m = (metric or "").lower()
    for key, kws in METRIC_KEYWORDS.items():
        if key == m or m in key:
            return kws
    return [m] if m else []


def _series_for_metric(db: Session, user_id: int, metric: str) -> tuple[list[str], list[float]] | None:
    """Return (dates, values) most-recent-last from recent successful queries.

    Dates are best-effort ISO strings (or synthetic index labels when no date
    column exists). Values are the metric's numeric series.
    """
    recent = (
        db.query(Query)
        .filter(Query.user_id == user_id, Query.execution_time_ms.isnot(None))
        .order_by(Query.created_at.desc())
        .limit(12)
        .all()
    )
    keywords = _keyword_for(metric)
    for q in recent:
        rows = q.result_json if isinstance(q.result_json, list) else []
        if not rows:
            continue
        try:
            df = pd.DataFrame(rows)
        except Exception:
            continue
        numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        col = next((c for c in numeric if any(k in str(c).lower() for k in keywords)), None)
        if col is None and numeric:
            col = numeric[0]
        if col is None:
            continue
        vals = pd.to_numeric(df[col], errors="coerce").dropna().tolist()
        if len(vals) < 4:
            continue
        # Date column: first object/string column whose sample matches a date.
        date_col = None
        for c in df.columns:
            if c == col:
                continue
            sample = df[c].dropna().astype(str).head(3).tolist()
            if any(_DATE_RE.search(s) for s in sample):
                date_col = c
                break
        if date_col is not None:
            dates = df[date_col].astype(str).tolist()
            # Align: keep rows where value is non-null.
            pairs = [(d, float(v)) for d, v in zip(dates, vals) if v is not None and not (isinstance(v, float) and not np.isfinite(v))]
            if len(pairs) >= 4:
                pairs.sort(key=lambda p: p[0])
                return [p[0] for p in pairs], [p[1] for p in pairs]
        # Fallback: synthetic index labels.
        return [f"t{i}" for i in range(len(vals))], [float(v) for v in vals]
    return None


def _holts_trend(series: list[float], horizon: int) -> dict[str, Any]:
    """Fit Holt's linear trend and project `horizon` points.

    Returns dict with: forecast points (value, lower, upper), residual std,
    in-sample fit, and backtest MAPE. Pure numpy.
    """
    y = np.asarray(series, dtype=float)
    n = len(y)
    if n < 4:
        raise ValueError("Need at least 4 points to forecast")

    # Initialise level/trend from the first two observations.
    level = y[0]
    trend = y[1] - y[0]
    alpha, beta = 0.6, 0.3  # smoothing constants; responsive but stable
    fitted = np.empty(n)
    for i in range(n):
        fitted[i] = level + trend
        prev_level = level
        level = alpha * y[i] + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend

    residuals = y - fitted
    sigma = float(np.std(residuals)) if n > 2 else 0.0
    z = 1.96

    # Project forward.
    points = []
    last_level, last_trend = float(level), float(trend)
    for h in range(1, horizon + 1):
        val = last_level + h * last_trend
        band = z * sigma * np.sqrt(h)
        points.append({
            "step": h,
            "value": _to_native(val),
            "lower": _to_native(val - band),
            "upper": _to_native(val + band),
        })

    # Backtest MAPE on the last 20% (refit on the first 80%).
    split = max(2, int(n * 0.8))
    train = y[:split]
    test = y[split:]
    mape = None
    if len(test) > 0:
        l, t = train[0], train[1] - train[0]
        for i in range(len(train)):
            pl = l
            l = alpha * train[i] + (1 - alpha) * (l + t)
            t = beta * (l - pl) + (1 - beta) * t
        preds = [l + (h + 1) * t for h in range(len(test))]
        apes = []
        for actual, pred in zip(test, preds):
            if actual != 0:
                apes.append(abs((actual - pred) / actual) * 100.0)
        mape = round(float(np.mean(apes)), 2) if apes else None

    return {
        "points": points,
        "sigma": _to_native(sigma),
        "mape": _to_native(mape),
        "last_actual": _to_native(float(y[-1])),
        "first_forecast": points[0]["value"] if points else None,
        "final_forecast": points[-1]["value"] if points else None,
    }


def _trend_direction(series: list[float], final_forecast: float | None) -> str:
    if final_forecast is None or len(series) < 2:
        return "flat"
    last = float(series[-1])
    if final_forecast > last * 1.02:
        return "up"
    if final_forecast < last * 0.98:
        return "down"
    return "flat"


def _explain(metric: str, horizon: int, stats: dict[str, Any], series: list[float]) -> dict[str, Any]:
    trend = _trend_direction(series, stats.get("final_forecast"))
    last = stats.get("last_actual")
    final = stats.get("final_forecast")
    mape = stats.get("mape")
    delta_pct = None
    if last and final and last != 0:
        delta_pct = round(((final - last) / abs(last)) * 100, 1)
    framing = (
        f"Metric: {metric}. Forecast horizon: {horizon} periods. "
        f"Latest actual: {last}, forecast at end of horizon: {final} ({'+' if delta_pct and delta_pct>0 else ''}{delta_pct}%). "
        f"Backtest MAPE: {mape}%. Trend: {trend}."
    )
    try:
        prompt = (
            "You are an AI BI analyst producing a forecast read-out for an executive.\n"
            f"{framing}\n\n"
            "Return JSON with: trend (up|down|flat), a 2-3 sentence business_explanation (what the forecast means "
            "for the business, in plain language), and 3-4 concrete recommended_actions the operator should take."
        )
        out = ai_service.generate_insight_json(prompt, schema=FORECAST_SCHEMA)
        out.setdefault("trend", trend)
        out.setdefault("business_explanation", framing)
        out.setdefault("recommended_actions", [])
        t = (out.get("trend") or trend).lower()
        if t not in ("up", "down", "flat"):
            t = trend
        out["trend"] = t
        if not isinstance(out.get("recommended_actions"), list):
            out["recommended_actions"] = []
        return out
    except Exception as exc:
        logger.warning("Forecast LLM explanation failed (%s); using stub.", exc)
        return {
            "trend": trend,
            "business_explanation": f"{metric} is forecast to trend {trend} over the next {horizon} periods. {framing}",
            "recommended_actions": [
                "Monitor the metric weekly and compare actuals to the forecast band.",
                "Set a smart alert so you're notified if the metric deviates from the forecast.",
            ],
        }


def _historical_comparison(series: list[float], stats: dict[str, Any]) -> dict[str, Any]:
    last = stats.get("last_actual")
    final = stats.get("final_forecast")
    delta_pct = None
    if last is not None and final is not None and last != 0:
        delta_pct = round(((final - last) / abs(last)) * 100, 1)
    return {
        "last_actual": last,
        "forecast_end": final,
        "delta_pct": delta_pct,
        "history_min": _to_native(min(series)) if series else None,
        "history_max": _to_native(max(series)) if series else None,
        "history_points": len(series),
    }


def generate_forecast(
    db: Session,
    user: User | None,
    metric: str,
    horizon: int = 30,
    dataset_id: int | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    """Generate (or return cached) forecast for a metric. Returns a dict."""
    uid = user_id if user_id is not None else (user.id if user is not None else None)
    if uid is None:
        raise ValueError("user or user_id required")
    horizon = max(3, min(int(horizon or 30), 180))

    # Cache check (TTL).
    cached = (
        db.query(Forecast)
        .filter(Forecast.user_id == uid, Forecast.metric == metric, Forecast.horizon == horizon)
        .order_by(Forecast.generated_at.desc())
        .first()
    )
    if cached and (datetime.utcnow() - (cached.generated_at.replace(tzinfo=None) if cached.generated_at else datetime.utcnow())) < TTL:
        return _serialize(cached)

    series_pair = _series_for_metric(db, uid, metric)
    if not series_pair:
        raise ValueError(f"Not enough data to forecast '{metric}'. Ask a few questions about this metric first.")
    dates, series = series_pair

    stats = _holts_trend(series, horizon)
    explanation = _explain(metric, horizon, stats, series)
    hist = _historical_comparison(series, stats)

    payload = {
        "metric": metric,
        "horizon": horizon,
        "history": [{"label": d, "value": _to_native(v)} for d, v in zip(dates, series)],
        "points": stats["points"],
        "confidence_interval": {"sigma": stats["sigma"], "z": 1.96},
        "accuracy_mape": stats["mape"],
        "historical_comparison": hist,
        "trend": explanation["trend"],
        "business_explanation": explanation["business_explanation"],
        "recommended_actions": explanation["recommended_actions"],
        "last_actual": stats["last_actual"],
        "final_forecast": stats["final_forecast"],
    }

    # Persist / update cache row.
    if cached:
        cached.forecast_json = payload
        cached.generated_at = datetime.utcnow()
        db.commit()
        db.refresh(cached)
        row = cached
    else:
        row = Forecast(
            user_id=uid, dataset_id=dataset_id, metric=metric, horizon=horizon,
            forecast_json=payload,
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    try:
        notifications_service.create_notification(
            db, uid, title=f"Forecast ready: {metric}",
            body=(payload.get("business_explanation") or "")[:160], type="info",
        )
    except Exception:
        pass

    return _serialize(row)


def _serialize(f: Forecast) -> dict[str, Any]:
    return {
        "id": f.id,
        "metric": f.metric,
        "horizon": f.horizon,
        "forecast": f.forecast_json or {},
        "generated_at": f.generated_at.isoformat() if f.generated_at else None,
    }


def list_forecasts(db: Session, user_id: int) -> list[dict[str, Any]]:
    # Most recent per (metric, horizon).
    rows = (
        db.query(Forecast)
        .filter(Forecast.user_id == user_id)
        .order_by(Forecast.generated_at.desc())
        .limit(30)
        .all()
    )
    seen = set()
    out = []
    for r in rows:
        key = (r.metric, r.horizon)
        if key in seen:
            continue
        seen.add(key)
        out.append(_serialize(r))
    return out


def get_forecast(db: Session, user_id: int, forecast_id: int) -> dict[str, Any] | None:
    r = db.query(Forecast).filter(Forecast.id == forecast_id, Forecast.user_id == user_id).first()
    return _serialize(r) if r else None


def list_recent_forecasts(db: Session, user_id: int) -> list[dict[str, Any]]:
    """Recent forecasts (newest per metric) — used by report_service."""
    rows = list_forecasts(db, user_id)
    out = []
    for r in rows:
        fc = r.get("forecast") or {}
        out.append({
            "metric": r.get("metric"),
            "horizon": r.get("horizon"),
            "trend": fc.get("trend"),
            "last_actual": fc.get("last_actual"),
            "final_forecast": fc.get("final_forecast"),
            "accuracy_mape": fc.get("accuracy_mape"),
            "business_explanation": fc.get("business_explanation"),
        })
    return out


def run_background_forecast(user_id: int, metric: str, horizon: int = 30) -> None:
    from db import SessionLocal
    db = SessionLocal()
    try:
        generate_forecast(db, user=None, metric=metric, horizon=horizon, user_id=user_id)
    except Exception as exc:
        logger.error("Background forecast failed for user %s metric %s: %s", user_id, metric, exc)
    finally:
        db.close()