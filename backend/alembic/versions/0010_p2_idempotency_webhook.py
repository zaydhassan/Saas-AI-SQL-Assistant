"""phase 2: idempotency records + stripe event dedupe

Revision ID: 0010_p2_idempotency_webhook
Revises: 0009_auth_hardening
Create Date: 2026-07-06

Additive only — two new tables: ``idempotency_records`` (caches mutating-request
responses keyed by client-supplied Idempotency-Key) and ``stripe_events``
(dedupes processed Stripe webhook events by event id). No changes to existing
tables.
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_p2_idempotency_webhook"
down_revision = "0009_auth_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("path", sa.String(), nullable=False),
        sa.Column("method", sa.String(), nullable=False, server_default="POST"),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("response_json", sa.JSON(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("key", name="uq_idempotency_key"),
    )
    op.create_index("ix_idempotency_records_key", "idempotency_records", ["key"])
    op.create_index("ix_idempotency_records_user_id", "idempotency_records", ["user_id"])
    op.create_index("ix_idempotency_records_expires_at", "idempotency_records", ["expires_at"])
    op.create_index("ix_idempotency_records_created_at", "idempotency_records", ["created_at"])

    op.create_table(
        "stripe_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=True),
        sa.Column("processed", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("event_id", name="uq_stripe_event_id"),
    )
    op.create_index("ix_stripe_events_event_id", "stripe_events", ["event_id"])
    op.create_index("ix_stripe_events_event_type", "stripe_events", ["event_type"])
    op.create_index("ix_stripe_events_created_at", "stripe_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_stripe_events_created_at", table_name="stripe_events")
    op.drop_index("ix_stripe_events_event_type", table_name="stripe_events")
    op.drop_index("ix_stripe_events_event_id", table_name="stripe_events")
    op.drop_table("stripe_events")

    op.drop_index("ix_idempotency_records_created_at", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_expires_at", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_user_id", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_key", table_name="idempotency_records")
    op.drop_table("idempotency_records")