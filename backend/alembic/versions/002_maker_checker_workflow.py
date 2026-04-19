"""Maker-checker workflow

Revision ID: 002
Revises: 001
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to questions table
    op.add_column(
        "questions",
        sa.Column("submitted_by", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=True),
    )
    op.add_column(
        "questions",
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "questions",
        sa.Column("reviewed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "questions",
        sa.Column("rejection_comment", sa.Text(), nullable=True),
    )

    # Change default role from 'editor' to 'maker' on admin_users
    op.alter_column(
        "admin_users",
        "role",
        server_default="maker",
    )


def downgrade() -> None:
    # Revert default role back to 'editor'
    op.alter_column(
        "admin_users",
        "role",
        server_default="editor",
    )

    # Drop added columns from questions table
    op.drop_column("questions", "rejection_comment")
    op.drop_column("questions", "reviewed_at")
    op.drop_column("questions", "submitted_at")
    op.drop_column("questions", "submitted_by")
