from dotenv import load_dotenv
load_dotenv()

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)
from db import get_db, engine
from models import Dataset, Query, Report, User
from stripe_webhook import router as stripe_router
from gemini_client import model
import pandas as pd
import uuid
import json
from db import Base, engine
import stripe
import os
import time
from datetime import datetime, timedelta
from db import Base

app = FastAPI(title="AI SQL Assistant Backend")

os.makedirs("uploads/avatars", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL")
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID")

app.include_router(stripe_router)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_id = int(payload["sub"])
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

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

@app.post("/auth/register")
def register(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"success": True}


@app.post("/auth/login")
def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
        },
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form("Untitled Dataset"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    table_name = f"dataset_{uuid.uuid4().hex[:8]}"

    try:
        df = pd.read_csv(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {e}")

    try:
        df.to_sql(
            table_name,
            engine,
            index=False,
            if_exists="fail",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create table: {e}")

    dataset = Dataset(
        user_id=user.id,
        name=name,
        table_name=table_name,
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return {
        "id": dataset.id,
        "name": dataset.name,
        "table_name": dataset.table_name,
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"success": True}

@app.post("/api/datasets/{dataset_id}/ask")
async def ask_dataset(
    dataset_id: int,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    question = payload.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

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

    sql = model.generate_content(prompt).text.replace("```sql", "").replace("```", "").strip()

    banned = ["delete ", "update ", "insert ", "drop ", "alter ", "truncate "]
    if any(b in sql.lower() for b in banned):
        raise HTTPException(status_code=400, detail="Unsafe SQL generated")

    start = time.time()
    df = pd.read_sql_query(sql, engine)
    execution_time_ms = round((time.time() - start) * 1000, 2)

    q = Query(
        dataset_id=dataset.id,
        user_id=user.id,
        question=question,
        sql=sql,
        result_json=json.loads(df.to_json(orient="records")),
        execution_time_ms=execution_time_ms,
    )

    db.add(q)
    db.commit()
    db.refresh(q)

    return {
        "query_id": q.id,
        "sql": sql,
        "rows": q.result_json,
        "execution_time_ms": execution_time_ms,
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