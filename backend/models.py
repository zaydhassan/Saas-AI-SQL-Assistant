from sqlalchemy import Boolean, Column, Integer, String, Text, ForeignKey, DateTime, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime, timedelta
import time

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)

    profile_image = Column(String, nullable=True) 

    is_pro = Column(Boolean, default=False)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    datasets = relationship("Dataset", back_populates="owner")
    queries = relationship("Query", back_populates="user")

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="datasets")
    queries = relationship("Query", back_populates="dataset")
class Query(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    question = Column(String, nullable=False)
    sql = Column(String, nullable=False)
    result_json = Column(JSON, nullable=False)

    execution_time_ms = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="queries")
    dataset = relationship("Dataset", back_populates="queries")
class SavedReport(Base):
    __tablename__ = "saved_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(Text, nullable=False)
    sql_query = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    sql = Column(Text, nullable=False)
    execution_time_ms = Column(Float)
    status = Column(String, default="success")
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# AI BI Copilot tables (additive — never alter existing tables above).
# These cache LLM-heavy results so we don't re-call Gemini on every request.
# ---------------------------------------------------------------------------

class QueryInsight(Base):
    """Caches the AI Insight Engine output for a single executed query.

    Stored in its own table (keyed by query_id) rather than as a new column on
    `queries`, so the existing queries schema is untouched.
    """
    __tablename__ = "query_insights"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("queries.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    insights_json = Column(JSON, nullable=False)   # LLM: executive summary, trends, risks, opportunities, recommendations
    analysis_json = Column(JSON, nullable=False)   # deterministic pandas analysis: rows/mean/max/min/sum/cardinality
    explanation = Column(Text, nullable=True)       # plain-language explanation of the SQL/answer
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


class DatasetProfile(Base):
    """Caches AI Dataset Intelligence output for an uploaded dataset."""
    __tablename__ = "dataset_profiles"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    profile_json = Column(JSON, nullable=False)            # full profile: columns, entities, relationships, suggestions
    data_quality_score = Column(Float, nullable=True)      # 0-100
    dataset_health_score = Column(Float, nullable=True)    # 0-100
    row_count = Column(Integer, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


class BusinessHealth(Base):
    """Caches the Business Health Score for a user (refreshed on demand)."""
    __tablename__ = "business_health"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)              # 0-100 overall
    dimensions_json = Column(JSON, nullable=False)    # per-dimension {score, status, detail}
    overall_status = Column(String, nullable=True)    # Healthy / Watch / Critical
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 2 — Daily Briefing, Alerts, Notifications (additive).
# ---------------------------------------------------------------------------

class Briefing(Base):
    """Caches the AI Daily Briefing for a user, one row per date."""
    __tablename__ = "briefings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False)  # day bucket (unique per user)
    briefing_json = Column(JSON, nullable=False)
    health_score = Column(Float, nullable=True)
    data_quality_score = Column(Float, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    """A user-defined alert over a metric with a trigger condition."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    metric = Column(String, nullable=False)           # e.g. revenue, refunds, orders
    condition = Column(String, nullable=False)        # e.g. "drops > 10%"
    channel = Column(String, default="in-app")        # email / in-app
    active = Column(Boolean, default=True)
    last_triggered = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AlertEvent(Base):
    """Log of alert firings (drives notifications + alert history)."""
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    """In-app notification for the navbar bell."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, default="info")             # info / alert / anomaly / briefing
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 6 — Smart Alert Engine (additive). AI-detected business alerts with
# severity, root cause, confidence, recommended action, and a timeline.
# ---------------------------------------------------------------------------

class SmartAlert(Base):
    """An AI-detected business alert (revenue drop, churn up, etc.)."""
    __tablename__ = "smart_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String, nullable=False)
    metric = Column(String, nullable=False)
    severity = Column(String, default="warning", index=True)   # critical / warning / info
    business_impact = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    recommended_action = Column(Text, nullable=True)
    status = Column(String, default="open", index=True)        # open / resolved / archived
    assigned_to = Column(String, nullable=True)
    pinned = Column(Boolean, default=False)
    muted = Column(Boolean, default=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SmartAlertEvent(Base):
    """Timeline event for a smart alert (detected/escalated/resolved/...)."""
    __tablename__ = "smart_alert_events"

    id = Column(Integer, primary_key=True, index=True)
    smart_alert_id = Column(Integer, ForeignKey("smart_alerts.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String, nullable=False)        # detected / escalated / resolved / commented / assigned
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 7 — AI Report Generator (additive). Generated/scheduled business reports.
# ---------------------------------------------------------------------------

class GeneratedReport(Base):
    """An AI-generated business report (daily/weekly/investor/finance/...)."""
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True, index=True)
    report_type = Column(String, nullable=False)     # daily/weekly/.../investor/finance/...
    title = Column(String, nullable=False)
    content_json = Column(JSON, nullable=False)      # exec summary, kpis, charts, insights, root_causes, forecasts, recommendations
    status = Column(String, default="ready")
    schedule_cron = Column(String, nullable=True)
    next_run = Column(DateTime(timezone=True), nullable=True, index=True)
    last_generated = Column(DateTime(timezone=True), nullable=True)
    share_token = Column(String, nullable=True, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 8 — AI Forecasting Engine (additive). Cached metric forecasts.
# ---------------------------------------------------------------------------

class Forecast(Base):
    """A cached AI forecast for a metric (Holt's trend + Gemini explanation)."""
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True, index=True)
    metric = Column(String, nullable=False)
    horizon = Column(Integer, default=30)
    forecast_json = Column(JSON, nullable=False)     # points, confidence_interval, accuracy_mape, historical_comparison, trend, business_explanation, recommended_actions
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 9 — AI Recommendation Engine (additive). AI-suggested actions with
# business reason, expected impact, confidence, priority, ROI, difficulty.
# ---------------------------------------------------------------------------

class Recommendation(Base):
    """An AI-recommended business action (accept/dismiss/save/track + history)."""
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True, index=True)       # inventory/pricing/marketing/customers/operations/...
    business_reason = Column(Text, nullable=True)
    expected_impact = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    priority = Column(String, default="medium", index=True)    # critical/high/medium/low
    estimated_roi = Column(Float, nullable=True)               # percent, e.g. 12.5
    difficulty = Column(String, default="medium")             # easy/medium/hard
    status = Column(String, default="pending", index=True)    # pending/accepted/dismissed/saved/tracked
    outcome = Column(Text, nullable=True)                     # filled on track
    source = Column(String, nullable=True)                    # alert/forecast/insight/health/...
    tracked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 10 — Executive Command Center (additive). Cached aggregated snapshot
# of the whole business, served as the post-login homepage.
# ---------------------------------------------------------------------------

class CommandCenter(Base):
    """Cached Executive Command Center snapshot for a user (~5 min TTL)."""
    __tablename__ = "command_center"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    payload_json = Column(JSON, nullable=False)        # full aggregated snapshot
    weather_status = Column(String, nullable=True)     # Healthy/Stable/Warning/Critical
    ai_confidence = Column(Float, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase H1 — Auth & session hardening (additive). Failed-login tracking,
# security audit log, JWT revocation list. All additive; no legacy table
# changes.
# ---------------------------------------------------------------------------

class FailedLogin(Base):
    """Failed login attempts per (email, ip), driving brute-force lockout."""
    __tablename__ = "failed_logins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    ip = Column(String, nullable=True, index=True)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AuditLog(Base):
    """Security & business audit trail. Auth events, password changes,
    webhook events, admin actions, etc. `user_id` is nullable for events that
    happen before a user is resolved (failed login, webhook)."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)        # login.success, login.failed, password.change, logout, ...
    entity = Column(String, nullable=True)                     # table/subject name
    entity_id = Column(String, nullable=True)                  # stringified id
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    payload_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class TokenRevocation(Base):
    """Revoked JWT jti values (logout / refresh-token rotation). Rows are kept
    only until the token would have naturally expired; a cleanup job trims them.
    Backed by the RevocationStore interface (in-DB now, Redis-ready)."""
    __tablename__ = "token_revocations"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, nullable=False, unique=True, index=True)
    kind = Column(String, default="access")           # access / refresh
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Phase 2: idempotency + Stripe webhook event dedupe.
# ---------------------------------------------------------------------------
class IdempotencyRecord(Base):
    """Caches the response of a mutating request keyed by the client-supplied
    Idempotency-Key, so a replayed request returns the original result instead
    of double-executing (e.g. double-charging a report generation). Backed by
    the IdempotencyStore interface (in-DB now, Redis-ready)."""
    __tablename__ = "idempotency_records"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False, unique=True, index=True)  # the Idempotency-Key
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    path = Column(String, nullable=False)                            # request path (scope)
    method = Column(String, nullable=False, default="POST")
    status_code = Column(Integer, nullable=True)
    response_json = Column(JSON, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class StripeEvent(Base):
    """Dedupes processed Stripe webhook events by event id. A replayed webhook
    (Stripe retries on non-2xx, or a manual redelivery) is skipped so a
    subscription isn't flipped twice. Unique constraint on event_id."""
    __tablename__ = "stripe_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, nullable=False, unique=True, index=True)  # evt_...
    event_type = Column(String, nullable=True, index=True)               # checkout.session.completed, ...
    processed = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)