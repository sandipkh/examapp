from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


# ── Auth ──────────────────────────────────────────────────

class FirebaseTokenRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    user: "UserOut"
    access_token: str
    refresh_token: str
    is_new_user: bool


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str


class ProfileUpdateRequest(BaseModel):
    name: str
    target_exam: str | None = None


# ── User ──────────────────────────────────────────────────

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    email: str | None
    phone: str | None
    avatar_url: str | None
    plan: str
    daily_questions_used: int
    created_at: datetime


# ── Topic ─────────────────────────────────────────────────

class TopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    icon: str | None
    sort_order: int
    is_active: bool


class SubtopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic_id: int
    name: str
    slug: str
    is_active: bool


class TopicWithSubtopics(TopicOut):
    subtopics: list[SubtopicOut] = []


# ── Question ──────────────────────────────────────────────

class QuestionOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    statements: list[str]
    options: QuestionOptions
    topic_name: str
    subtopic_name: str | None
    difficulty: str
    source_label: str | None


class QuestionWithAnswer(QuestionOut):
    correct_option: str
    rationale: str | None


class QuestionCreate(BaseModel):
    question_text: str
    statements: list[str] = []
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: Literal["A", "B", "C", "D"]
    rationale: str | None = None
    topic_slug: str
    subtopic_name: str | None = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    year: int | None = None
    source_label: str | None = None


class QuestionUpdate(BaseModel):
    question_text: str | None = None
    statements: list[str] | None = None
    option_a: str | None = None
    option_b: str | None = None
    option_c: str | None = None
    option_d: str | None = None
    correct_option: Literal["A", "B", "C", "D"] | None = None
    rationale: str | None = None
    topic_slug: str | None = None
    subtopic_name: str | None = None
    difficulty: Literal["easy", "medium", "hard"] | None = None
    year: int | None = None
    source_label: str | None = None


class QuestionAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_text: str
    statements: list[str]
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    rationale: str | None
    topic_id: int
    subtopic_id: int | None
    difficulty: str
    year: int | None
    source_label: str | None
    status: str
    created_by: int | None
    reviewed_by: int | None
    submitted_by: int | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    rejection_comment: str | None
    published_at: datetime | None
    import_batch_id: str | None
    created_at: datetime
    updated_at: datetime
    created_by_name: str | None = None
    submitted_by_name: str | None = None
    reviewed_by_name: str | None = None
    topic_name: str | None = None


# ── Attempt ───────────────────────────────────────────────

class SubmitAttemptRequest(BaseModel):
    question_id: int
    session_id: int | None = None
    selected_option: Literal["A", "B", "C", "D"]
    time_taken_secs: int | None = None


class SubmitAttemptResponse(BaseModel):
    is_correct: bool
    correct_option: str
    rationale: str | None
    source_label: str | None


class AttemptHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: QuestionWithAnswer
    session_id: int | None
    selected_option: str
    is_correct: bool
    time_taken_secs: int | None
    attempted_at: datetime
    bookmarked: bool


class PaginatedAttempts(BaseModel):
    attempts: list[AttemptHistoryItem]
    total: int
    page: int
    has_more: bool


# ── Session ───────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    session_type: str
    topic_id: int | None = None
    total_questions: int


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_type: str
    topic_id: int | None
    total_questions: int
    correct_count: int
    score: float
    completed: bool
    started_at: datetime


# ── Analytics ─────────────────────────────────────────────

class TopicHeatmapItem(BaseModel):
    topic: str
    slug: str
    icon: str | None
    accuracy: float | None
    total_attempted: int
    strength: str


class HeatmapResponse(BaseModel):
    topics: list[TopicHeatmapItem]


class StatsResponse(BaseModel):
    total_attempted: int
    total_correct: int
    overall_accuracy: float
    current_streak: int
    longest_streak: int


# ── Payment ───────────────────────────────────────────────

class CreateSubscriptionRequest(BaseModel):
    plan_id: str


class CreateSubscriptionResponse(BaseModel):
    subscription_id: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


# ── Admin ─────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    role: str
    name: str


class BulkImportResponse(BaseModel):
    imported: int
    failed: int
    errors: list[str]
    batch_id: str


class RejectRequest(BaseModel):
    comment: str


class BulkApproveRequest(BaseModel):
    ids: list[int]


class BulkRejectRequest(BaseModel):
    ids: list[int]
    comment: str


class AdminUserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: Literal["maker", "checker", "superadmin"]


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    created_at: datetime


class AdminOverviewResponse(BaseModel):
    total_users: int
    active_today: int
    total_questions: int
    published_questions: int
    total_subscriptions: int
    active_subscriptions: int
