"""auth hardening: failed logins, audit log, token revocation

Revision ID: 0009_auth_hardening
Revises: 0007_phase10_cc
Create Date: 2026-07-06

Additive only — three new tables for brute-force tracking, security audit
trail, and JWT revocation. No changes to existing tables.
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_auth_hardening"
down_revision = "0007_phase10_cc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "failed_logins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("ip", sa.String(), nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_failed_logins_email", "failed_logins", ["email"])
    op.create_index("ix_failed_logins_ip", "failed_logins", ["ip"])
    op.create_index("ix_failed_logins_attempted_at", "failed_logins", ["attempted_at"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entity", sa.String(), nullable=True),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("ip", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    op.create_table(
        "token_revocations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jti", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="access"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("jti", name="uq_token_revocations_jti"),
    )
    op.create_index("ix_token_revocations_jti", "token_revocations", ["jti"])
    op.create_index("ix_token_revocations_expires_at", "token_revocations", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_token_revocations_expires_at", table_name="token_revocations")
    op.drop_index("ix_token_revocations_jti", table_name="token_revocations")
    op.drop_table("token_revocations")

    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_failed_logins_attempted_at", table_name="failed_logins")
    op.drop_index("ix_failed_logins_ip", table_name="failed_logins")
    op.drop_index("ix_failed_logins_email", table_name="failed_logins")
    op.drop_table("failed_logins")