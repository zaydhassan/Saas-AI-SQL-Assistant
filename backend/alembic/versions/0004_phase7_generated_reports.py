"""phase7 generated_reports

Revision ID: 0004_phase7_reports
Revises: 0003_phase6_smart
Create Date: 2026-07-06

Additive only — one new table for the AI Report Generator (Feature 7).
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_phase7_reports"
down_revision = "0003_phase6_smart"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "generated_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True),
        sa.Column("report_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(), default="ready"),
        sa.Column("schedule_cron", sa.String(), nullable=True),
        sa.Column("next_run", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_generated", sa.DateTime(timezone=True), nullable=True),
        sa.Column("share_token", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("share_token", name="uq_generated_reports_share_token"),
    )
    op.create_index("ix_generated_reports_user_id", "generated_reports", ["user_id"])
    op.create_index("ix_generated_reports_next_run", "generated_reports", ["next_run"])
    op.create_index("ix_generated_reports_share_token", "generated_reports", ["share_token"])


def downgrade() -> None:
    op.drop_index("ix_generated_reports_share_token", table_name="generated_reports")
    op.drop_index("ix_generated_reports_next_run", table_name="generated_reports")
    op.drop_index("ix_generated_reports_user_id", table_name="generated_reports")
    op.drop_table("generated_reports")