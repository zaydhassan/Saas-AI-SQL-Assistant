"""phase1 bi copilot tables: query_insights, dataset_profiles, business_health

Revision ID: 0001_phase1_bi
Revises:
Create Date: 2026-07-06

Additive only — creates three new cache tables for the AI BI Copilot. Does not
touch users/datasets/queries/reports/saved_reports. Base.metadata.create_all
remains as an idempotent safety net; this migration is the canonical path.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_phase1_bi"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "query_insights",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("query_id", sa.Integer(), sa.ForeignKey("queries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("insights_json", sa.JSON(), nullable=False),
        sa.Column("analysis_json", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_query_insights_query_id", "query_insights", ["query_id"], unique=True)

    op.create_table(
        "dataset_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_json", sa.JSON(), nullable=False),
        sa.Column("data_quality_score", sa.Float(), nullable=True),
        sa.Column("dataset_health_score", sa.Float(), nullable=True),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_dataset_profiles_dataset_id", "dataset_profiles", ["dataset_id"], unique=True)

    op.create_table(
        "business_health",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("dimensions_json", sa.JSON(), nullable=False),
        sa.Column("overall_status", sa.String(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_business_health_user_id", "business_health", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_business_health_user_id", table_name="business_health")
    op.drop_table("business_health")
    op.drop_index("ix_dataset_profiles_dataset_id", table_name="dataset_profiles")
    op.drop_table("dataset_profiles")
    op.drop_index("ix_query_insights_query_id", table_name="query_insights")
    op.drop_table("query_insights")