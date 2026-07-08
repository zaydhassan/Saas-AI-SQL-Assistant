"""phase10 command center

Revision ID: 0007_phase10_cc
Revises: 0006_phase9_rec
Create Date: 2026-07-06

Additive only — one new table for the Executive Command Center (Feature 10).
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_phase10_cc"
down_revision = "0006_phase9_rec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "command_center",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("weather_status", sa.String(), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_command_center_user"),
    )
    op.create_index("ix_command_center_user_id", "command_center", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_command_center_user_id", table_name="command_center")
    op.drop_table("command_center")