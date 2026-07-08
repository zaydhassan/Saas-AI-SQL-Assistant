"""AI Dataset Intelligence (Feature 2).

Runs immediately after a dataset is uploaded (enqueued as a background task)
and on demand via POST /api/datasets/{id}/analyze. Produces:
- pandas-computed column profiles (dtype, missing %, duplicates, outliers via
  IQR, cardinality), an inferred primary-key candidate, and quality/health
  scores (0-100).
- LLM-structured intelligence: column descriptions, business entities, inferred
  relationships / FK candidates, and suggested KPIs / dashboards / charts /
  questions / metrics.

Result is cached in DatasetProfile (one row per dataset, upserted).
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from db import engine
from models import Dataset, DatasetProfile
from services import ai_service

logger = logging.getLogger("dataset_intelligence_service")

PROFILE_SAMPLE_LIMIT = 5000

DATASET_INTELLIGENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "column_descriptions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "column": {"type": "string"},
                    "description": {"type": "string"},
                    "business_entity": {"type": "string"},
                },
            },
        },
        "business_entities": {"type": "array", "items": {"type": "string"}},
        "relationships": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "from_column": {"type": "string"},
                    "to_entity": {"type": "string"},
                    "confidence": {"type": "string"},
                },
            },
        },
        "suggested_kpis": {"type": "array", "items": {"type": "string"}},
        "suggested_dashboards": {"type": "array", "items": {"type": "string"}},
        "suggested_charts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "type": {"type": "string"},
                    "x": {"type": "string"},
                    "y": {"type": "string"},
                },
            },
        },
        "suggested_questions": {"type": "array", "items": {"type": "string"}},
        "suggested_metrics": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "summary",
        "column_descriptions",
        "business_entities",
        "suggested_kpis",
        "suggested_dashboards",
        "suggested_charts",
        "suggested_questions",
        "suggested_metrics",
    ],
}


def _safe_float(v: Any) -> float:
    try:
        f = float(v)
        if np.isnan(f) or np.isinf(f):
            return 0.0
        return f
    except Exception:
        return 0.0


def _to_native(obj: Any) -> Any:
    """Recursively convert numpy scalars to native Python types so the dict is
    JSON-serializable for SQLAlchemy's JSON column (json.dumps can't handle
    np.float64/np.int64 and psycopg2 misreads `np` as a schema name)."""
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_native(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        f = float(obj)
        return None if (np.isnan(f) or np.isinf(f)) else f
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


def _profile_columns(df: pd.DataFrame) -> list[dict[str, Any]]:
    n = len(df)
    out = []
    for col in df.columns:
        s = df[col]
        missing = int(s.isna().sum())
        missing_pct = round((missing / n) * 100, 2) if n else 0.0
        unique = int(s.nunique(dropna=True))
        entry: dict[str, Any] = {
            "name": str(col),
            "dtype": str(s.dtype),
            "missing": missing,
            "missing_pct": missing_pct,
            "unique": unique,
            "cardinality_ratio": round(unique / n, 4) if n else 0.0,
            "is_numeric": pd.api.types.is_numeric_dtype(s),
        }
        if pd.api.types.is_numeric_dtype(s):
            clean = s.dropna()
            entry.update(
                {
                    "min": _safe_float(clean.min()) if len(clean) else None,
                    "max": _safe_float(clean.max()) if len(clean) else None,
                    "mean": round(_safe_float(clean.mean()), 4) if len(clean) else None,
                    "std": round(_safe_float(clean.std()), 4) if len(clean) else None,
                }
            )
            # IQR outliers
            if len(clean) >= 4:
                q1, q3 = clean.quantile(0.25), clean.quantile(0.75)
                iqr = q3 - q1
                lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                entry["outliers"] = int(((clean < lower) | (clean > upper)).sum())
            else:
                entry["outliers"] = 0
        else:
            entry["top_values"] = (
                s.value_counts().head(5).astype(str).to_dict()
            )
        out.append(entry)
    return out


def _infer_pk(columns: list[dict[str, Any]], row_count: int) -> str | None:
    for c in columns:
        if c.get("missing", 1) == 0 and c["unique"] == row_count and row_count > 0:
            return c["name"]
    # Fallback: a unique, non-missing integer-ish column named like an id.
    for c in columns:
        name = c["name"].lower()
        if name.endswith("id") and c.get("missing", 1) == 0:
            return c["name"]
    return None


def _score_quality(df: pd.DataFrame, columns: list[dict[str, Any]]) -> tuple[float, float]:
    n = len(df)
    if n == 0:
        return 0.0, 0.0
    # Missing penalty: average missing pct across columns.
    avg_missing = float(np.mean([c["missing_pct"] for c in columns])) if columns else 0.0
    duplicate_pct = (df.duplicated().sum() / n) * 100.0
    # Outlier penalty: average outlier ratio across numeric columns.
    numeric = [c for c in columns if c.get("is_numeric")]
    avg_outlier = (
        float(np.mean([(c.get("outliers", 0) / max(n, 1)) * 100 for c in numeric]))
        if numeric
        else 0.0
    )
    data_quality_score = max(0.0, 100.0 - avg_missing * 1.2 - duplicate_pct * 0.8 - avg_outlier * 0.4)

    # Type cleanliness: fraction of columns whose dtype is well-defined (not object
    # holding mixed data) — approximate by ratio of non-object columns.
    object_ratio = sum(1 for c in columns if c["dtype"].startswith("object")) / max(len(columns), 1)
    completeness = 100.0 - avg_missing
    dataset_health_score = max(
        0.0,
        0.5 * data_quality_score + 0.3 * completeness + 0.2 * (100.0 - object_ratio * 100.0),
    )
    # Coerce to native float — np.float64 is not JSON/psycopg2 serializable and
    # Postgres misreads the `np` prefix as a schema name.
    return float(round(data_quality_score, 2)), float(round(dataset_health_score, 2))


def _fallback_intelligence(columns: list[dict[str, Any]], df: pd.DataFrame) -> dict[str, Any]:
    numeric = [c["name"] for c in columns if c.get("is_numeric")]
    categorical = [c["name"] for c in columns if not c.get("is_numeric")]
    return {
        "summary": f"Dataset with {len(df)} rows and {len(columns)} columns. AI enrichment offline.",
        "column_descriptions": [
            {"column": c["name"], "description": f"Column of type {c['dtype']}", "business_entity": "unknown"}
            for c in columns
        ],
        "business_entities": [],
        "relationships": [],
        "suggested_kpis": numeric[:5] or [],
        "suggested_dashboards": [],
        "suggested_charts": [
            {"title": f"{c} distribution", "type": "bar", "x": c, "y": "count"} for c in categorical[:3]
        ],
        "suggested_questions": [
            f"What is the total {n}?" for n in numeric[:3]
        ],
        "suggested_metrics": numeric[:5],
    }


def analyze_dataset(db: Session, dataset: Dataset) -> dict[str, Any]:
    """Profile + AI-enrich a dataset, upsert the DatasetProfile, return it."""
    table_name = dataset.table_name

    with engine.connect() as conn:
        row_count = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar() or 0
        df = pd.read_sql_query(f'SELECT * FROM "{table_name}" LIMIT {PROFILE_SAMPLE_LIMIT}', conn)

    columns = _profile_columns(df)
    pk = _infer_pk(columns, int(row_count))
    duplicate_rows = int(df.duplicated().sum())
    data_quality_score, dataset_health_score = _score_quality(df, columns)

    numeric = [c for c in columns if c.get("is_numeric")]
    categorical = [c for c in columns if not c.get("is_numeric")]

    try:
        schema_brief = ", ".join(f"{c['name']} ({c['dtype']})" for c in columns[:40])
        sample = df.head(3).to_dict(orient="records")
        prompt = (
            "You are an AI data steward. Analyze this dataset and describe it for a business user.\n\n"
            f"Dataset name: {dataset.name}\n"
            f"Rows: {row_count}\n"
            f"Columns: {schema_brief}\n"
            f"Numeric columns: {', '.join(c['name'] for c in numeric[:20])}\n"
            f"Categorical columns: {', '.join(c['name'] for c in categorical[:20])}\n"
            f"Sample rows: {sample}\n\n"
            "Provide a concise summary, a plain-language description for each column, the business\n"
            "entities this dataset represents, likely relationships/foreign keys, and suggested\n"
            "KPIs, dashboards, charts, natural-language questions, and metrics. Be specific."
        )
        intelligence = ai_service.generate_insight_json(prompt, schema=DATASET_INTELLIGENCE_SCHEMA)
    except Exception as exc:
        logger.warning("Dataset intelligence LLM failed (%s); using fallback.", exc)
        intelligence = _fallback_intelligence(columns, df)

    profile = _to_native({
        "summary": intelligence.get("summary", ""),
        "row_count": int(row_count),
        "column_count": len(columns),
        "columns": columns,
        "primary_key_candidate": pk,
        "duplicate_rows": duplicate_rows,
        "numeric_columns": [c["name"] for c in numeric],
        "categorical_columns": [c["name"] for c in categorical],
        "column_descriptions": intelligence.get("column_descriptions", []),
        "business_entities": intelligence.get("business_entities", []),
        "relationships": intelligence.get("relationships", []),
        "suggested_kpis": intelligence.get("suggested_kpis", []),
        "suggested_dashboards": intelligence.get("suggested_dashboards", []),
        "suggested_charts": intelligence.get("suggested_charts", []),
        "suggested_questions": intelligence.get("suggested_questions", []),
        "suggested_metrics": intelligence.get("suggested_metrics", []),
        "data_quality_score": data_quality_score,
        "dataset_health_score": dataset_health_score,
    })

    # Upsert the cached profile.
    existing = (
        db.query(DatasetProfile)
        .filter(DatasetProfile.dataset_id == dataset.id)
        .first()
    )
    payload = {
        "profile_json": profile,
        "data_quality_score": data_quality_score,
        "dataset_health_score": dataset_health_score,
        "row_count": int(row_count),
    }
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        row = existing
    else:
        row = DatasetProfile(dataset_id=dataset.id, **payload)
        db.add(row)
        db.commit()
        db.refresh(row)

    return {"id": row.id, "dataset_id": dataset.id, **profile}


def get_cached_profile(db: Session, dataset_id: int) -> dict[str, Any] | None:
    row = db.query(DatasetProfile).filter(DatasetProfile.dataset_id == dataset_id).first()
    if not row:
        return None
    return {
        "id": row.id,
        "dataset_id": dataset_id,
        "data_quality_score": row.data_quality_score,
        "dataset_health_score": row.dataset_health_score,
        "row_count": row.row_count,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
        **(row.profile_json or {}),
    }


def run_background_analysis(dataset_id: int) -> None:
    """Background-task entrypoint: opens its own session (no request session)."""
    from db import SessionLocal
    db = SessionLocal()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset:
            analyze_dataset(db, dataset)
    except Exception as exc:
        logger.error("Background dataset analysis failed for %s: %s", dataset_id, exc)
    finally:
        db.close()