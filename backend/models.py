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

    profile_image = Column(String, nullable=True)  # ✅ profile avatar

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

    execution_time_ms = Column(Float, nullable=True)  # ✅ analytics

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
