"""phase9 recommendations

Revision ID: 0006_phase9_rec
Revises: 0005_phase8_forecasts
Create Date: 2026-07-06

Additive only — one new table for the AI Recommendation Engine (Feature 9).
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_phase9_rec"
down_revision = "0005_phase8_forecasts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("business_reason", sa.Text(), nullable=True),
        sa.Column("expected_impact", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), default=0.0),
        sa.Column("priority", sa.String(), default="medium"),
        sa.Column("estimated_roi", sa.Float(), nullable=True),
        sa.Column("difficulty", sa.String(), default="medium"),
        sa.Column("status", sa.String(), default="pending"),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("tracked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_recommendations_user_id", "recommendations", ["user_id"])
    op.create_index("ix_recommendations_status", "recommendations", ["status"])
    op.create_index("ix_recommendations_priority", "recommendations", ["priority"])
    op.create_index("ix_recommendations_category", "recommendations", ["category"])


def downgrade() -> None:
    op.drop_index("ix_recommendations_category", table_name="recommendations")
    op.drop_index("ix_recommendations_priority", table_name="recommendations")
    op.drop_index("ix_recommendations_status", table_name="recommendations")
    op.drop_index("ix_recommendations_user_id", table_name="recommendations")
    op.drop_table("recommendations")