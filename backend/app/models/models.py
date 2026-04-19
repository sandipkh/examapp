from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan: Mapped[str] = mapped_column(String(20), default="free", server_default="free")
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    daily_questions_used: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    daily_reset_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempts: Mapped[list["Attempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    bookmarks: Mapped[list["Bookmark"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    topic_performances: Mapped[list["TopicPerformance"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="maker", server_default="maker")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    subtopics: Mapped[list["Subtopic"]] = relationship(back_populates="topic")
    questions: Mapped[list["Question"]] = relationship(back_populates="topic")


class Subtopic(Base):
    __tablename__ = "subtopics"
    __table_args__ = (UniqueConstraint("topic_id", "slug", name="uq_subtopic_topic_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    topic: Mapped["Topic"] = relationship(back_populates="subtopics")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    statements: Mapped[list] = mapped_column(JSON, default=list, server_default="[]")
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    correct_option: Mapped[str] = mapped_column(String(1), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id"), nullable=False)
    subtopic_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subtopics.id"), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", server_default="medium")
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", server_default="draft")
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("admin_users.id"), nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("admin_users.id"), nullable=True)
    submitted_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("admin_users.id"), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    import_batch_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    topic: Mapped["Topic"] = relationship(back_populates="questions")
    subtopic: Mapped["Subtopic | None"] = relationship()


class TestSession(Base):
    __tablename__ = "test_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_type: Mapped[str] = mapped_column(String(50), nullable=False)
    topic_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("topics.id"), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), server_default="0")
    completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship()
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="session")


class Attempt(Base):
    __tablename__ = "attempts"
    __table_args__ = (Index("ix_attempts_user_attempted", "user_id", "attempted_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    session_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("test_sessions.id"), nullable=True)
    selected_option: Mapped[str] = mapped_column(String(1), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_taken_secs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="attempts")
    question: Mapped["Question"] = relationship()
    session: Mapped["TestSession | None"] = relationship(back_populates="attempts")


class TopicPerformance(Base):
    __tablename__ = "topic_performance"
    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", "subtopic_id", name="uq_topic_perf_user_topic_sub"),
        Index("ix_topic_perf_user_topic", "user_id", "topic_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id"), nullable=False)
    subtopic_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subtopics.id"), nullable=True)
    total_attempted: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_correct: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    accuracy: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), server_default="0")
    last_attempted: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship(back_populates="topic_performances")
    topic: Mapped["Topic"] = relationship()


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_bookmark_user_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="bookmarks")
    question: Mapped["Question"] = relationship()


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    razorpay_subscription_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plan_id: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="created", server_default="created")
    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", server_default="INR")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="subscriptions")
