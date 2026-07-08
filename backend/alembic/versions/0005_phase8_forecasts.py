"""phase8 forecasts

Revision ID: 0005_phase8_forecasts
Revises: 0004_phase7_reports
Create Date: 2026-07-06

Additive only — one new table for the AI Forecasting Engine (Feature 8).
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_phase8_forecasts"
down_revision = "0004_phase7_reports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "forecasts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True),
        sa.Column("metric", sa.String(), nullable=False),
        sa.Column("horizon", sa.Integer(), default=30),
        sa.Column("forecast_json", sa.JSON(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "metric", "horizon", name="uq_forecasts_user_metric_horizon"),
    )
    op.create_index("ix_forecasts_user_id", "forecasts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_forecasts_user_id", table_name="forecasts")
    op.drop_table("forecasts")