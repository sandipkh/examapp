import csv
import io
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_admin, require_role
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.models import (
    AdminUser,
    Attempt,
    Question,
    Subscription,
    Subtopic,
    Topic,
    User,
)
from app.schemas.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminOverviewResponse,
    AdminUserCreate,
    AdminUserOut,
    BulkApproveRequest,
    BulkImportResponse,
    BulkRejectRequest,
    QuestionAdminOut,
    QuestionCreate,
    QuestionUpdate,
    RejectRequest,
    TopicWithSubtopics,
)

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────

async def _enrich_question(q: Question, db: AsyncSession) -> QuestionAdminOut:
    """Convert Question ORM to QuestionAdminOut with admin names and topic name."""
    out = QuestionAdminOut.model_validate(q)

    # Resolve admin names
    admin_ids = {aid for aid in [q.created_by, q.submitted_by, q.reviewed_by] if aid}
    if admin_ids:
        result = await db.execute(select(AdminUser).where(AdminUser.id.in_(admin_ids)))
        admins = {a.id: a.name for a in result.scalars().all()}
        out.created_by_name = admins.get(q.created_by)
        out.submitted_by_name = admins.get(q.submitted_by)
        out.reviewed_by_name = admins.get(q.reviewed_by)

    # Resolve topic name
    if q.topic_id:
        topic_result = await db.execute(select(Topic.name).where(Topic.id == q.topic_id))
        out.topic_name = topic_result.scalar_one_or_none()

    return out


async def _resolve_topic_subtopic(
    topic_slug: str, subtopic_name: str | None, db: AsyncSession
) -> tuple[int, int | None]:
    topic_result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
    topic = topic_result.scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=400, detail=f"Topic '{topic_slug}' not found")

    subtopic_id = None
    if subtopic_name:
        sub_result = await db.execute(
            select(Subtopic).where(
                and_(Subtopic.topic_id == topic.id, Subtopic.name == subtopic_name)
            )
        )
        subtopic = sub_result.scalar_one_or_none()
        if subtopic is None:
            subtopic = Subtopic(
                topic_id=topic.id,
                name=subtopic_name,
                slug=subtopic_name.lower().replace(" ", "-"),
            )
            db.add(subtopic)
            await db.flush()
        subtopic_id = subtopic.id

    return topic.id, subtopic_id


# ── Auth ─────────────────────────────────────────────────

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    admin = result.scalar_one_or_none()
    if admin is None or not verify_password(body.password, admin.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(admin.id), "role": admin.role})
    return AdminLoginResponse(access_token=token, role=admin.role, name=admin.name)


@router.post("/create-first-admin")
async def create_first_admin(body: dict, db: AsyncSession = Depends(get_db)):
    if body.get("secret_key") != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid secret key")

    existing = await db.execute(select(func.count(AdminUser.id)))
    count = existing.scalar() or 0
    if count > 0:
        raise HTTPException(status_code=400, detail="Admin already exists")

    admin = AdminUser(
        name=body["name"],
        email=body["email"],
        hashed_password=hash_password(body["password"]),
        role="superadmin",
    )
    db.add(admin)
    await db.flush()
    return {"message": "First admin created successfully", "id": admin.id}


# ── User Management (superadmin only) ───────────────────

@router.post("/users", response_model=AdminUserOut)
async def create_admin_user(
    body: AdminUserCreate,
    admin: AdminUser = Depends(require_role(["superadmin"])),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    new_admin = AdminUser(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(new_admin)
    await db.flush()
    return AdminUserOut.model_validate(new_admin)


@router.get("/users", response_model=list[AdminUserOut])
async def list_admin_users(
    admin: AdminUser = Depends(require_role(["superadmin"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).order_by(AdminUser.created_at.desc()))
    return [AdminUserOut.model_validate(u) for u in result.scalars().all()]


# ── Questions CRUD (maker / superadmin) ──────────────────

@router.get("/questions")
async def list_questions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status"),
    topic_slug: str | None = Query(None),
    search: str | None = Query(None),
    submitted_by: int | None = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Question)

    # Makers only see their own questions
    if admin.role == "maker":
        query = query.where(Question.created_by == admin.id)

    if status_filter:
        query = query.where(Question.status == status_filter)
    if topic_slug:
        query = query.join(Topic, Question.topic_id == Topic.id).where(Topic.slug == topic_slug)
    if search:
        query = query.where(Question.question_text.ilike(f"%{search}%"))
    if submitted_by:
        query = query.where(Question.submitted_by == submitted_by)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    data_query = query.order_by(Question.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(data_query)
    questions = result.scalars().all()

    enriched = [await _enrich_question(q, db) for q in questions]

    return {
        "questions": enriched,
        "total": total,
        "page": page,
        "has_more": (offset + limit) < total,
    }


@router.post("/questions", response_model=QuestionAdminOut)
async def create_question(
    body: QuestionCreate,
    admin: AdminUser = Depends(require_role(["superadmin", "maker"])),
    db: AsyncSession = Depends(get_db),
):
    topic_id, subtopic_id = await _resolve_topic_subtopic(body.topic_slug, body.subtopic_name, db)

    question = Question(
        question_text=body.question_text,
        statements=body.statements,
        option_a=body.option_a,
        option_b=body.option_b,
        option_c=body.option_c,
        option_d=body.option_d,
        correct_option=body.correct_option,
        rationale=body.rationale,
        topic_id=topic_id,
        subtopic_id=subtopic_id,
        difficulty=body.difficulty,
        year=body.year,
        source_label=body.source_label,
        status="draft",
        created_by=admin.id,
    )
    db.add(question)
    await db.flush()
    return await _enrich_question(question, db)


@router.put("/questions/{question_id}", response_model=QuestionAdminOut)
async def update_question(
    question_id: int,
    body: QuestionUpdate,
    admin: AdminUser = Depends(require_role(["superadmin", "maker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    # Only draft or rejected questions can be edited
    if question.status not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail="Can only edit draft or rejected questions")

    # Makers can only edit their own questions
    if admin.role == "maker" and question.created_by != admin.id:
        raise HTTPException(status_code=403, detail="Cannot edit another maker's question")

    update_data = body.model_dump(exclude_unset=True)

    if "topic_slug" in update_data:
        topic_slug = update_data.pop("topic_slug")
        topic_result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
        topic = topic_result.scalar_one_or_none()
        if topic:
            question.topic_id = topic.id

    if "subtopic_name" in update_data:
        sub_name = update_data.pop("subtopic_name")
        if sub_name:
            sub_result = await db.execute(
                select(Subtopic).where(
                    and_(Subtopic.topic_id == question.topic_id, Subtopic.name == sub_name)
                )
            )
            subtopic = sub_result.scalar_one_or_none()
            if subtopic is None:
                subtopic = Subtopic(
                    topic_id=question.topic_id,
                    name=sub_name,
                    slug=sub_name.lower().replace(" ", "-"),
                )
                db.add(subtopic)
                await db.flush()
            question.subtopic_id = subtopic.id
        else:
            question.subtopic_id = None

    for key, value in update_data.items():
        setattr(question, key, value)

    # Reset to draft if was rejected and being edited
    if question.status == "rejected":
        question.status = "draft"
        question.rejection_comment = None

    return await _enrich_question(question, db)


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    admin: AdminUser = Depends(require_role(["superadmin", "maker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.status not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail="Can only delete draft or rejected questions")

    if admin.role == "maker" and question.created_by != admin.id:
        raise HTTPException(status_code=403, detail="Cannot delete another maker's question")

    question.status = "archived"
    return {"message": "Question archived"}


# ── Maker Submit for Review ──────────────────────────────

@router.post("/questions/{question_id}/submit", response_model=QuestionAdminOut)
async def submit_for_review(
    question_id: int,
    admin: AdminUser = Depends(require_role(["superadmin", "maker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.status not in ("draft",):
        raise HTTPException(status_code=400, detail="Only draft questions can be submitted for review")

    if admin.role == "maker" and question.created_by != admin.id:
        raise HTTPException(status_code=403, detail="Cannot submit another maker's question")

    question.status = "pending_review"
    question.submitted_by = admin.id
    question.submitted_at = datetime.now(timezone.utc)
    question.rejection_comment = None

    return await _enrich_question(question, db)


# ── Checker Approve / Reject ────────────────────────────

@router.post("/questions/{question_id}/approve", response_model=QuestionAdminOut)
async def approve_question(
    question_id: int,
    admin: AdminUser = Depends(require_role(["superadmin", "checker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.status != "pending_review":
        raise HTTPException(status_code=400, detail="Only pending_review questions can be approved")

    question.status = "published"
    question.reviewed_by = admin.id
    question.reviewed_at = datetime.now(timezone.utc)
    question.published_at = datetime.now(timezone.utc)

    return await _enrich_question(question, db)


@router.post("/questions/{question_id}/reject", response_model=QuestionAdminOut)
async def reject_question(
    question_id: int,
    body: RejectRequest,
    admin: AdminUser = Depends(require_role(["superadmin", "checker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if question.status != "pending_review":
        raise HTTPException(status_code=400, detail="Only pending_review questions can be rejected")

    question.status = "rejected"
    question.rejection_comment = body.comment
    question.reviewed_by = admin.id
    question.reviewed_at = datetime.now(timezone.utc)

    return await _enrich_question(question, db)


# ── Bulk Approve / Reject ───────────────────────────────

@router.post("/questions/bulk-approve")
async def bulk_approve(
    body: BulkApproveRequest,
    admin: AdminUser = Depends(require_role(["superadmin", "checker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Question).where(
            and_(Question.id.in_(body.ids), Question.status == "pending_review")
        )
    )
    questions = result.scalars().all()

    now = datetime.now(timezone.utc)
    for q in questions:
        q.status = "published"
        q.reviewed_by = admin.id
        q.reviewed_at = now
        q.published_at = now

    return {"approved": len(questions), "skipped": len(body.ids) - len(questions)}


@router.post("/questions/bulk-reject")
async def bulk_reject(
    body: BulkRejectRequest,
    admin: AdminUser = Depends(require_role(["superadmin", "checker"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Question).where(
            and_(Question.id.in_(body.ids), Question.status == "pending_review")
        )
    )
    questions = result.scalars().all()

    now = datetime.now(timezone.utc)
    for q in questions:
        q.status = "rejected"
        q.rejection_comment = body.comment
        q.reviewed_by = admin.id
        q.reviewed_at = now

    return {"rejected": len(questions), "skipped": len(body.ids) - len(questions)}


# ── CSV Upload ──────────────────────────────────────────

@router.post("/questions/upload-csv", response_model=BulkImportResponse)
async def upload_csv(
    file: UploadFile,
    admin: AdminUser = Depends(require_role(["superadmin", "maker"])),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    batch_id = str(uuid4())
    imported = 0
    failed = 0
    errors: list[str] = []

    # Pre-fetch all topics
    topics_result = await db.execute(select(Topic))
    topics_map = {t.slug: t for t in topics_result.scalars().all()}

    for i, row in enumerate(reader, start=2):
        try:
            topic_slug = row.get("topic_slug", row.get("topic", "")).strip()
            topic = topics_map.get(topic_slug)
            if topic is None:
                raise ValueError(f"Unknown topic: {topic_slug}")

            correct = row.get("correct_option", "").strip().upper()
            if correct not in ("A", "B", "C", "D"):
                raise ValueError(f"Invalid correct_option: {correct}")

            statements_raw = row.get("statements", "").strip()
            statements = [s.strip() for s in statements_raw.split("|") if s.strip()] if statements_raw else []

            subtopic_id = None
            subtopic_name = row.get("subtopic_name", "").strip()
            if subtopic_name:
                sub_result = await db.execute(
                    select(Subtopic).where(
                        and_(Subtopic.topic_id == topic.id, Subtopic.name == subtopic_name)
                    )
                )
                subtopic = sub_result.scalar_one_or_none()
                if subtopic is None:
                    subtopic = Subtopic(
                        topic_id=topic.id,
                        name=subtopic_name,
                        slug=subtopic_name.lower().replace(" ", "-"),
                    )
                    db.add(subtopic)
                    await db.flush()
                subtopic_id = subtopic.id

            question = Question(
                question_text=row.get("question_text", "").strip(),
                statements=statements,
                option_a=row.get("option_a", "").strip(),
                option_b=row.get("option_b", "").strip(),
                option_c=row.get("option_c", "").strip(),
                option_d=row.get("option_d", "").strip(),
                correct_option=correct,
                rationale=row.get("rationale", "").strip() or None,
                topic_id=topic.id,
                subtopic_id=subtopic_id,
                difficulty=row.get("difficulty", "medium").strip() or "medium",
                year=int(row["year"]) if row.get("year", "").strip() else None,
                source_label=row.get("source_label", "").strip() or None,
                status="draft",
                created_by=admin.id,
                import_batch_id=batch_id,
            )
            db.add(question)
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {i}: {str(e)}")

    return BulkImportResponse(imported=imported, failed=failed, errors=errors, batch_id=batch_id)


# ── Topics ──────────────────────────────────────────────

@router.get("/topics", response_model=list[TopicWithSubtopics])
async def list_topics(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Topic).options(selectinload(Topic.subtopics)).order_by(Topic.sort_order)
    )
    topics = result.scalars().all()
    return [TopicWithSubtopics.model_validate(t) for t in topics]


# ── Analytics / Dashboard ───────────────────────────────

@router.get("/analytics/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users_r = await db.execute(select(func.count(User.id)))
    total_users = total_users_r.scalar() or 0

    active_today_r = await db.execute(
        select(func.count(func.distinct(Attempt.user_id))).where(Attempt.attempted_at >= today_start)
    )
    active_today = active_today_r.scalar() or 0

    total_q_r = await db.execute(select(func.count(Question.id)))
    total_questions = total_q_r.scalar() or 0

    pub_q_r = await db.execute(
        select(func.count(Question.id)).where(Question.status == "published")
    )
    published_questions = pub_q_r.scalar() or 0

    total_subs_r = await db.execute(select(func.count(Subscription.id)))
    total_subscriptions = total_subs_r.scalar() or 0

    active_subs_r = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    )
    active_subscriptions = active_subs_r.scalar() or 0

    return AdminOverviewResponse(
        total_users=total_users,
        active_today=active_today,
        total_questions=total_questions,
        published_questions=published_questions,
        total_subscriptions=total_subscriptions,
        active_subscriptions=active_subscriptions,
    )
