"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── topics ────────────────────────────────────────────
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("sort_order", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
    )

    op.bulk_insert(
        sa.table(
            "topics",
            sa.column("id", sa.Integer),
            sa.column("name", sa.String),
            sa.column("slug", sa.String),
            sa.column("icon", sa.String),
            sa.column("sort_order", sa.Integer),
        ),
        [
            {"id": 1, "name": "Polity", "slug": "polity", "icon": "\u2696\ufe0f", "sort_order": 1},
            {"id": 2, "name": "History", "slug": "history", "icon": "\U0001f3db\ufe0f", "sort_order": 2},
            {"id": 3, "name": "Geography", "slug": "geography", "icon": "\U0001f30d", "sort_order": 3},
            {"id": 4, "name": "Economy", "slug": "economy", "icon": "\U0001f4c8", "sort_order": 4},
            {"id": 5, "name": "Environment", "slug": "environment", "icon": "\U0001f33f", "sort_order": 5},
            {"id": 6, "name": "Science & Tech", "slug": "science-tech", "icon": "\U0001f52c", "sort_order": 6},
            {"id": 7, "name": "International Relations", "slug": "ir", "icon": "\U0001f310", "sort_order": 7},
            {"id": 8, "name": "Art & Culture", "slug": "art-culture", "icon": "\U0001f3a8", "sort_order": 8},
            {"id": 9, "name": "Government Schemes", "slug": "schemes", "icon": "\U0001f4cb", "sort_order": 9},
            {"id": 10, "name": "Current Affairs", "slug": "current", "icon": "\U0001f4f0", "sort_order": 10},
        ],
    )

    # ── subtopics ─────────────────────────────────────────
    op.create_table(
        "subtopics",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("topic_id", sa.Integer, sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.UniqueConstraint("topic_id", "slug", name="uq_subtopic_topic_slug"),
    )

    # ── admin_users ───────────────────────────────────────
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.Text, nullable=False),
        sa.Column("role", sa.String(20), server_default="editor"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── users ─────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=True),
        sa.Column("firebase_uid", sa.String(128), unique=True, nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("plan", sa.String(20), server_default="free"),
        sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("daily_questions_used", sa.Integer, server_default="0"),
        sa.Column("daily_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── questions ─────────────────────────────────────────
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("statements", sa.JSON, server_default="[]"),
        sa.Column("option_a", sa.Text, nullable=False),
        sa.Column("option_b", sa.Text, nullable=False),
        sa.Column("option_c", sa.Text, nullable=False),
        sa.Column("option_d", sa.Text, nullable=False),
        sa.Column("correct_option", sa.String(1), nullable=False),
        sa.Column("rationale", sa.Text, nullable=True),
        sa.Column("topic_id", sa.Integer, sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("subtopic_id", sa.Integer, sa.ForeignKey("subtopics.id"), nullable=True),
        sa.Column("difficulty", sa.String(20), server_default="medium"),
        sa.Column("year", sa.Integer, nullable=True),
        sa.Column("source_label", sa.String(255), nullable=True),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("reviewed_by", sa.Integer, sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("import_batch_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── test_sessions ─────────────────────────────────────
    op.create_table(
        "test_sessions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_type", sa.String(50), nullable=False),
        sa.Column("topic_id", sa.Integer, sa.ForeignKey("topics.id"), nullable=True),
        sa.Column("total_questions", sa.Integer, nullable=False),
        sa.Column("correct_count", sa.Integer, server_default="0"),
        sa.Column("score", sa.Numeric(5, 2), server_default="0"),
        sa.Column("completed", sa.Boolean, server_default="false"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── attempts ──────────────────────────────────────────
    op.create_table(
        "attempts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("test_sessions.id"), nullable=True),
        sa.Column("selected_option", sa.String(1), nullable=False),
        sa.Column("is_correct", sa.Boolean, nullable=False),
        sa.Column("time_taken_secs", sa.Integer, nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_attempts_user_attempted", "attempts", ["user_id", "attempted_at"])

    # ── topic_performance ─────────────────────────────────
    op.create_table(
        "topic_performance",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic_id", sa.Integer, sa.ForeignKey("topics.id"), nullable=False),
        sa.Column("subtopic_id", sa.Integer, sa.ForeignKey("subtopics.id"), nullable=True),
        sa.Column("total_attempted", sa.Integer, server_default="0"),
        sa.Column("total_correct", sa.Integer, server_default="0"),
        sa.Column("accuracy", sa.Numeric(5, 2), server_default="0"),
        sa.Column("last_attempted", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "topic_id", "subtopic_id", name="uq_topic_perf_user_topic_sub"),
    )
    op.create_index("ix_topic_perf_user_topic", "topic_performance", ["user_id", "topic_id"])

    # ── bookmarks ─────────────────────────────────────────
    op.create_table(
        "bookmarks",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "question_id", name="uq_bookmark_user_question"),
    )

    # ── subscriptions ─────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("razorpay_subscription_id", sa.String(255), unique=True, nullable=False),
        sa.Column("razorpay_payment_id", sa.String(255), nullable=True),
        sa.Column("plan_id", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), server_default="created"),
        sa.Column("amount", sa.Integer, nullable=True),
        sa.Column("currency", sa.String(10), server_default="INR"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_table("bookmarks")
    op.drop_index("ix_topic_perf_user_topic", table_name="topic_performance")
    op.drop_table("topic_performance")
    op.drop_index("ix_attempts_user_attempted", table_name="attempts")
    op.drop_table("attempts")
    op.drop_table("test_sessions")
    op.drop_table("questions")
    op.drop_table("users")
    op.drop_table("admin_users")
    op.drop_table("subtopics")
    op.drop_table("topics")
