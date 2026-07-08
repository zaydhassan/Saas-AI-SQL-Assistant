"""phase6 smart_alerts, smart_alert_events

Revision ID: 0003_phase6_smart
Revises: 0002_phase2_brief
Create Date: 2026-07-06

Additive only — two new tables for the AI Smart Alert Engine (Feature 6).
Does not touch any existing table.
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_phase6_smart"
down_revision = "0002_phase2_brief"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "smart_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("metric", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), default="warning"),
        sa.Column("business_impact", sa.Text(), nullable=True),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), default=0.0),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), default="open"),
        sa.Column("assigned_to", sa.String(), nullable=True),
        sa.Column("pinned", sa.Boolean(), default=False),
        sa.Column("muted", sa.Boolean(), default=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_smart_alerts_user_id", "smart_alerts", ["user_id"])
    op.create_index("ix_smart_alerts_severity", "smart_alerts", ["severity"])
    op.create_index("ix_smart_alerts_status", "smart_alerts", ["status"])

    op.create_table(
        "smart_alert_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("smart_alert_id", sa.Integer(), sa.ForeignKey("smart_alerts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_smart_alert_events_smart_alert_id", "smart_alert_events", ["smart_alert_id"])


def downgrade() -> None:
    op.drop_index("ix_smart_alert_events_smart_alert_id", table_name="smart_alert_events")
    op.drop_table("smart_alert_events")
    op.drop_index("ix_smart_alerts_status", table_name="smart_alerts")
    op.drop_index("ix_smart_alerts_severity", table_name="smart_alerts")
    op.drop_index("ix_smart_alerts_user_id", table_name="smart_alerts")
    op.drop_table("smart_alerts")