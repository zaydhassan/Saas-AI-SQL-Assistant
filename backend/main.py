from dotenv import load_dotenv
load_dotenv()

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    BackgroundTasks,
    Request,
    Response,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from auth import (
    hash_password,
    verify_password,
    needs_rehash,
)
from config import settings
from db import get_db, engine, Base
from models import Dataset, Query, Report, User, QueryInsight
from deps import get_current_user, get_current_user_refresh, _access_token
from services.auth_service import (
    issue_tokens,
    rotate_refresh_token,
    revoke_session,
    record_failed_login,
    clear_failed_logins,
    is_locked,
    get_client_ip,
    record_audit,
)
from services.rate_limiter import rate_limit, client_ip_key, user_or_ip_key
from middleware.csrf import CSRFMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from middleware.request_context import RequestContextMiddleware, get_request_id
from services.idempotency_store import idempotent
from schemas import (
    AskRequest, ReportSaveRequest, ProfileUpdateRequest, PasswordChangeRequest,
)
from stripe_webhook import router as stripe_router
from gemini_client import generate_text
from routers import (
    datasets_intelligence as datasets_intelligence_router,
    health as health_router,
    history as history_router,
    briefings as briefings_router,
    alerts as alerts_router,
    notifications as notifications_router,
    smart_alerts as smart_alerts_router,
    reports_ai as reports_ai_router,
    forecasts as forecasts_router,
    recommendations as recommendations_router,
    command_center as command_center_router,
)
from services import (
    insight_service,
    dataset_intelligence_service,
    alerts_service,
    smart_alert_service,
)
import ws as ws_mod
from scheduler import lifespan
import logging
import os
import pandas as pd
import uuid
import json
import stripe
import time
from datetime import datetime, timedelta

logger = logging.getLogger("main")

app = FastAPI(title="AI SQL Assistant Backend", lifespan=lifespan)

os.makedirs("uploads/avatars", exist_ok=True)

# NOTE: /uploads is mounted publicly for now (avatars). Phase 3 hardens this to
# an auth-gated route (GET /api/profile/avatar/{filename}). Kept here so existing
# avatar URLs keep resolving during the transition.
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

stripe.api_key = settings.STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID = settings.STRIPE_PRO_PRICE_ID
FRONTEND_URL = settings.FRONTEND_URL

# ---------------------------------------------------------------------------
# Middleware — order = reverse of add order, so the LAST added is OUTERMOST
# (runs first on request). We want request-id set before anything else, and
# security headers applied to every response (incl. CSRF 403s).
#   request flow: RequestContext -> SecurityHeaders -> CSRF -> CORS -> app
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,  # required now that auth travels via cookies
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)


# ---------------------------------------------------------------------------
# Global exception handlers (Phase 2): no raw error leakage to clients.
# ---------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # 422 with a structured, safe body. Pydantic's errors describe the bad input
    # shape (field names + reasons) but never internal state.
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
        headers={"X-Request-ID": get_request_id() or ""},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the full stack trace server-side; return a generic message + the
    # request id so support can correlate. NEVER echo str(exc) to the client.
    logger.exception("unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": get_request_id()},
        headers={"X-Request-ID": get_request_id() or ""},
    )

app.include_router(stripe_router)
# BI Copilot routers (Phase 1+). Thin delegators over services/.
app.include_router(datasets_intelligence_router.router)
app.include_router(health_router.router)
app.include_router(history_router.router)
app.include_router(briefings_router.router)
app.include_router(alerts_router.router)
app.include_router(notifications_router.router)
app.include_router(smart_alerts_router.router)
app.include_router(reports_ai_router.router)
app.include_router(forecasts_router.router)
app.include_router(recommendations_router.router)
app.include_router(command_center_router.router)

# WebSocket endpoint for live notifications (Feature 6).
ws_mod.register_ws(app)

Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Password policy (Phase 1: was none — any string accepted).
# ---------------------------------------------------------------------------
def _validate_password(password: str) -> None:
    """Enforce a minimal password policy at registration + password change.
    Raises 400 with a generic message on failure."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="Password is too long")
    # Require at least two character classes to block trivial passwords.
    classes = sum([
        any(c.islower() for c in password),
        any(c.isupper() for c in password),
        any(c.isdigit() for c in password),
        any(not c.isalnum() for c in password),
    ])
    if classes < 2:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least two of: uppercase, lowercase, digits, symbols",
        )


@app.post("/stripe/checkout")
def create_checkout(user: User = Depends(get_current_user)):
    if not STRIPE_PRO_PRICE_ID or not FRONTEND_URL:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=user.email,
        line_items=[{
            "price": STRIPE_PRO_PRICE_ID,
            "quantity": 1,
        }],
        success_url=f"{FRONTEND_URL}/pricing?success=true",
        cancel_url=f"{FRONTEND_URL}/pricing?canceled=true",
        metadata={
            "user_id": str(user.id),
        },
    )

    return {"url": session.url}

@app.get("/me")
def get_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "is_pro": user.is_pro,
    }

# ---------------------------------------------------------------------------
# Auth endpoints — cookie transport, CSRF, brute-force lockout, audit.
# (Phase 1: was token-in-body with no lockout/audit/rate-limit.)
# ---------------------------------------------------------------------------
@app.post("/auth/register", status_code=201)
def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(client_ip_key, limit=5, window_seconds=3600)),
):
    """Register a new user. Does NOT establish a session — no auth cookies are
    issued; the user must log in separately. Rate-limited per IP to deter
    enumeration/abuse. Generic error on duplicate email to avoid enumeration."""
    _validate_password(password)

    if db.query(User).filter(User.email == email).first():
        # Generic message to avoid account enumeration. Do not reveal existence.
        raise HTTPException(status_code=400, detail="Unable to register with those credentials")

    user = User(
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit(db, user.id, "auth.register", request, entity="user", entity_id=user.id)
    return {"user": {"id": user.id, "email": user.email}}


@app.post("/auth/login")
def login(
    request: Request,
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(client_ip_key, limit=20, window_seconds=60)),
):
    """Login with brute-force lockout + audit. On success issues access+refresh
    as HttpOnly cookies (no tokens in the body). On failure records a failed
    login attempt and returns a generic 401 (never reveals which of email vs
    password was wrong)."""
    ip = get_client_ip(request)

    if is_locked(db, email, ip):
        # Do not reveal that the account exists or is locked — generic 401.
        record_audit(db, None, "auth.login.locked", request, entity="email", payload={"email": email})
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        record_failed_login(db, email, ip)
        record_audit(db, user.id if user else None, "auth.login.failed", request, entity="email", payload={"email": email})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Success — clear the failed-login counter for this email.
    clear_failed_logins(db, email)

    # Transparent bcrypt→Argon2 rehash on first successful login after hardening.
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        db.commit()
        record_audit(db, user.id, "auth.password.rehashed", request, entity="user", entity_id=user.id)

    record_audit(db, user.id, "auth.login.success", request, entity="user", entity_id=user.id)
    return issue_tokens(response, user)


@app.post("/auth/refresh")
def refresh(
    request: Request,
    response: Response,
    refresh_token: str | None = Depends(get_current_user_refresh),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(client_ip_key, limit=30, window_seconds=60)),
):
    """Rotate the refresh token: the old refresh jti is revoked and a fresh
    access+refresh pair is issued. Reuse of an already-rotated refresh token is
    treated as a potential theft → 401 (and the caller should log out)."""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    result = rotate_refresh_token(db, response, refresh_token)
    if result is None:
        record_audit(db, None, "auth.refresh.reuse", request)
        raise HTTPException(status_code=401, detail="Not authenticated")
    record_audit(db, None, "auth.refresh.success", request)
    return result


@app.post("/auth/logout")
def logout(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    refresh_token: str | None = Depends(get_current_user_refresh),
    db: Session = Depends(get_db),
):
    """Secure logout: revoke the access + refresh jtis (so a stolen cookie is
    useless) and clear the auth cookies."""
    access_token = _access_token(request)
    revoke_session(db, response, access_token, refresh_token)
    record_audit(db, user.id, "auth.logout", request, entity="user", entity_id=user.id)
    return {"success": True}


@app.get("/api/auth/csrf")
def get_csrf():
    """GET that seeds the csrf cookie (the CSRF middleware sets it on the
    response if absent). The frontend calls this once on boot to obtain a
    token to echo back as X-CSRF-Token on mutations."""
    return {"ok": True}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/datasets/upload")
@idempotent
async def upload_dataset(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form("Untitled Dataset"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(user_or_ip_key, limit=20, window_seconds=60)),
):
    table_name = f"dataset_{uuid.uuid4().hex[:8]}"

    try:
        df = pd.read_csv(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    try:
        df.to_sql(
            table_name,
            engine,
            index=False,
            if_exists="fail",
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create table")

    dataset = Dataset(
        user_id=user.id,
        name=name,
        table_name=table_name,
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Enqueue AI Dataset Intelligence analysis (Feature 2) — runs after the
    # response is sent so upload latency is unaffected. Uses its own session.
    background_tasks.add_task(
        dataset_intelligence_service.run_background_analysis, dataset.id
    )

    return {
        "id": dataset.id,
        "name": dataset.name,
        "table_name": dataset.table_name,
        "profile_pending": True,
    }

@app.get("/api/datasets/{dataset_id}/queries")
def get_query_history(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    queries = (
        db.query(Query)
        .filter(
            Query.dataset_id == dataset_id,
            Query.user_id == user.id,
        )
        .order_by(Query.created_at.desc())
        .all()
    )

    return [
        {
            "id": q.id,
            "question": q.question,
            "sql": q.sql,
            "created_at": q.created_at.isoformat(),
        }
        for q in queries
    ]

@app.post("/api/queries/{query_id}/replay")
def replay_query(
    query_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Query)
        .filter(Query.id == query_id, Query.user_id == user.id)
        .first()
    )

    if not q:
        raise HTTPException(status_code=404, detail="Query not found")

    df = pd.read_sql_query(q.sql, engine)

    return {
        "query_id": q.id,
        "sql": q.sql,
        "rows": df.to_dict(orient="records"),
    }

@app.get("/api/datasets")
def list_datasets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    datasets = (
        db.query(Dataset)
        .filter(Dataset.user_id == user.id)
        .order_by(Dataset.created_at.desc())
        .all()
    )

    return [
        {
            "id": d.id,
            "name": d.name,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in datasets
    ]

@app.get("/api/datasets/{dataset_id}")
def get_dataset(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == user.id,
        )
        .first()
    )

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {
        "id": dataset.id,
        "name": dataset.name,
        "created_at": dataset.created_at.isoformat() if dataset.created_at else None,
    }


@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dataset = (
        db.query(Dataset)
        .filter(
            Dataset.id == dataset_id,
            Dataset.user_id == user.id,
        )
        .first()
    )

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        db.execute(text(f'DROP TABLE IF EXISTS "{dataset.table_name}"'))
        db.delete(dataset)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete dataset")

    return {"success": True}

@app.post("/api/datasets/{dataset_id}/ask")
async def ask_dataset(
    dataset_id: int,
    payload: AskRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rl: None = Depends(rate_limit(user_or_ip_key, limit=30, window_seconds=60)),
):
    question = payload.question

    dataset = (
        db.query(Dataset)
        .filter(Dataset.id == dataset_id, Dataset.user_id == user.id)
        .first()
    )
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    table_name = dataset.table_name

    sample_df = pd.read_sql_query(
        f'SELECT * FROM "{table_name}" LIMIT 5',
        engine,
    )

    schema_desc = ", ".join(
        f"{col} ({dtype})"
        for col, dtype in zip(sample_df.columns, sample_df.dtypes)
    )

    prompt = f"""
You are an expert PostgreSQL SQL generator.

Table name: "{table_name}"
Columns:
{schema_desc}

Rules:
- Only SELECT queries
- No DELETE, UPDATE, INSERT, DROP
- Use double quotes for identifiers

User question: "{question}"
"""

    sql = generate_text(prompt).replace("```sql", "").replace("```", "").strip()

    banned = ["delete ", "update ", "insert ", "drop ", "alter ", "truncate "]
    if any(b in sql.lower() for b in banned):
        raise HTTPException(status_code=400, detail="Unsafe SQL generated")

    # Execute the generated SQL with proper error handling. On failure we
    # persist the attempt as a failed Query (execution_time_ms=None, a sanitized
    # error_code in result_json — never the raw DB message, which can leak
    # schema/internal state) and return a generic 400.
    start = time.time()
    try:
        df = pd.read_sql_query(sql, engine)
        execution_time_ms = round((time.time() - start) * 1000, 2)
        rows = json.loads(df.to_json(orient="records"))
    except Exception as exc:
        # Log the real detail server-side; store only a code client-side.
        logger.warning("ask SQL execution failed for dataset %s: %s", dataset_id, exc)
        failed = Query(
            dataset_id=dataset.id,
            user_id=user.id,
            question=question,
            sql=sql,
            result_json={"error_code": "sql_execution_failed"},
            execution_time_ms=None,
        )
        db.add(failed)
        db.commit()
        raise HTTPException(status_code=400, detail="SQL execution failed")

    q = Query(
        dataset_id=dataset.id,
        user_id=user.id,
        question=question,
        sql=sql,
        result_json=rows,
        execution_time_ms=execution_time_ms,
    )

    db.add(q)
    db.commit()
    db.refresh(q)

    # AI Business Insight Engine (Feature 1) — runs after the query is saved.
    # Wrapped defensively so a Gemini hiccup never breaks /ask; the query
    # result is returned regardless, and insights are simply absent on failure.
    insight_payload = {"analysis": None, "explanation": None, "insights": None}
    try:
        insight_payload = insight_service.generate_insights(
            question=question, sql=sql, rows=rows, schema_desc=schema_desc
        )
        existing_insight = (
            db.query(QueryInsight).filter(QueryInsight.query_id == q.id).first()
        )
        if existing_insight:
            existing_insight.insights_json = insight_payload["insights"]
            existing_insight.analysis_json = insight_payload["analysis"]
            existing_insight.explanation = insight_payload["explanation"]
        else:
            db.add(
                QueryInsight(
                    query_id=q.id,
                    insights_json=insight_payload["insights"],
                    analysis_json=insight_payload["analysis"],
                    explanation=insight_payload["explanation"],
                )
            )
        db.commit()
    except Exception as exc:
        # Insight failure is non-fatal; logged but not surfaced as an error.
        logger.warning("insight_engine non-fatal failure for query %s: %s", q.id, exc)

    # Evaluate the user's active alerts against fresh query data (Phase 2).
    # Runs in the background so /ask latency is unaffected; on a threshold
    # cross it logs an AlertEvent and pushes an in-app Notification.
    background_tasks.add_task(alerts_service.run_background_evaluation, user.id)

    # Smart Alert Engine (Feature 6) — AI continuously monitors business metrics
    # and surfaces prioritized, explained alerts. Runs in the background so
    # /ask latency is unaffected; on a threshold cross it persists a SmartAlert
    # + timeline event and pushes a live notification (ws + bell).
    background_tasks.add_task(smart_alert_service.run_background_smart_scan, user.id)

    return {
        "query_id": q.id,
        "sql": sql,
        "rows": q.result_json,
        "execution_time_ms": execution_time_ms,
        # Additive fields (frontend guards these with &&, so existing callers
        # that ignore them are unaffected).
        "explanation": insight_payload.get("explanation"),
        "analysis": insight_payload.get("analysis"),
        "insights": insight_payload.get("insights"),
    }

@app.get("/api/analytics/overview")
def analytics_overview(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_queries = db.query(func.count(Query.id))\
        .filter(Query.user_id == user.id).scalar()

    failed_queries = db.query(func.count(Query.id))\
        .filter(
            Query.user_id == user.id,
            Query.execution_time_ms.is_(None)
        ).scalar()

    avg_time = db.query(func.avg(Query.execution_time_ms))\
        .filter(
            Query.user_id == user.id,
            Query.execution_time_ms.isnot(None)
        ).scalar()

    return {
        "total_queries": total_queries or 0,
        "failed_queries": failed_queries or 0,
        "avg_execution_time": round(avg_time or 0, 2),
    }


@app.get("/api/analytics/query-volume")
def query_volume(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    last_7_days = datetime.utcnow() - timedelta(days=6)

    rows = (
        db.query(
            func.date(Query.created_at).label("day"),
            func.count(Query.id).label("count"),
        )
        .filter(
            Query.user_id == user.id,
            Query.created_at >= last_7_days,
        )
        .group_by(func.date(Query.created_at))
        .order_by(func.date(Query.created_at))
        .all()
    )

    return [{"day": r.day.strftime("%a"), "queries": r.count} for r in rows]


@app.get("/api/analytics/performance")
def performance_distribution(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buckets = {"<100ms": 0, "100–300ms": 0, ">300ms": 0}

    times = db.query(Query.execution_time_ms)\
        .filter(Query.user_id == user.id, Query.execution_time_ms.isnot(None))\
        .all()

    for (t,) in times:
        if t < 100:
            buckets["<100ms"] += 1
        elif t <= 300:
            buckets["100–300ms"] += 1
        else:
            buckets[">300ms"] += 1

    return [{"bucket": k, "count": v} for k, v in buckets.items()]


@app.get("/api/analytics/recent-queries")
def recent_queries(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    queries = (
        db.query(Query)
        .filter(Query.user_id == user.id)
        .order_by(Query.created_at.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "sql": q.sql,
            "time": f"{q.execution_time_ms} ms" if q.execution_time_ms else "—",
            "status": "Success" if q.execution_time_ms else "Failed",
        }
        for q in queries
    ]

@app.post("/api/reports")
def save_report(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = Report(
        user_id=user.id,
        sql=payload["sql"],
        execution_time_ms=payload.get("execution_time_ms"),
        status=payload.get("status", "success"),
    )

    db.add(report)
    db.commit()

    return {"ok": True}

@app.get("/api/profile")
def get_profile(user: User = Depends(get_current_user)):
    return {
        "email": user.email,
        "name": user.name,
        "profile_image": user.profile_image,
    }

@app.put("/api/profile")
def update_profile(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.name = payload.get("name", user.name)
    user.profile_image = payload.get("profile_image", user.profile_image)

    db.commit()
    return {"success": True}

@app.put("/api/profile/password")
def change_password(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload["current_password"], user.password_hash):
        raise HTTPException(status_code=400, detail="Wrong password")

    _validate_password(payload["new_password"])
    user.password_hash = hash_password(payload["new_password"])
    db.commit()

    return {"success": True}

@app.post("/api/profile/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid image type")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"uploads/avatars/{filename}"

    with open(path, "wb") as f:
        f.write(file.file.read())

    user.profile_image = f"/uploads/avatars/{filename}"
    db.commit()

    return {"profile_image": user.profile_image}