from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import Attempt, Bookmark, Question, TestSession, Topic, User
from app.schemas.schemas import (
    AttemptHistoryItem,
    CreateSessionRequest,
    PaginatedAttempts,
    QuestionOptions,
    QuestionWithAnswer,
    SessionOut,
    SubmitAttemptRequest,
    SubmitAttemptResponse,
)

router = APIRouter()


@router.post("/submit", response_model=SubmitAttemptResponse)
async def submit_attempt(
    body: SubmitAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == body.question_id))
    question = result.scalar_one_or_none()
    if question is None or question.status != "published":
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = body.selected_option == question.correct_option

    attempt = Attempt(
        user_id=current_user.id,
        question_id=question.id,
        session_id=body.session_id,
        selected_option=body.selected_option,
        is_correct=is_correct,
        time_taken_secs=body.time_taken_secs,
    )
    db.add(attempt)

    # Upsert topic_performance using raw SQL ON CONFLICT DO UPDATE
    now = datetime.now(timezone.utc)
    correct_int = 1 if is_correct else 0
    subtopic_id_val = question.subtopic_id if question.subtopic_id else None

    await db.execute(
        text("""
            INSERT INTO topic_performance (user_id, topic_id, subtopic_id, total_attempted, total_correct, accuracy, last_attempted, updated_at)
            VALUES (:user_id, :topic_id, :subtopic_id, 1, :correct, :correct * 100, :now, :now)
            ON CONFLICT ON CONSTRAINT uq_topic_perf_user_topic_sub
            DO UPDATE SET
                total_attempted = topic_performance.total_attempted + 1,
                total_correct = topic_performance.total_correct + :correct,
                accuracy = ROUND(((topic_performance.total_correct + :correct)::numeric / (topic_performance.total_attempted + 1)) * 100, 2),
                last_attempted = :now,
                updated_at = :now
        """),
        {
            "user_id": current_user.id,
            "topic_id": question.topic_id,
            "subtopic_id": subtopic_id_val,
            "correct": correct_int,
            "now": now,
        },
    )

    # Update session correct_count if session provided
    if body.session_id and is_correct:
        session_result = await db.execute(
            select(TestSession).where(TestSession.id == body.session_id)
        )
        session = session_result.scalar_one_or_none()
        if session:
            session.correct_count += 1

    return SubmitAttemptResponse(
        is_correct=is_correct,
        correct_option=question.correct_option,
        rationale=question.rationale,
        source_label=question.source_label,
    )


@router.get("/history", response_model=PaginatedAttempts)
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    filter: str = Query("all"),
    topic_slug: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Attempt).where(Attempt.user_id == current_user.id)

    if filter == "correct":
        base_query = base_query.where(Attempt.is_correct == True)
    elif filter == "incorrect":
        base_query = base_query.where(Attempt.is_correct == False)
    elif filter == "bookmarked":
        base_query = base_query.join(
            Bookmark,
            and_(Bookmark.user_id == current_user.id, Bookmark.question_id == Attempt.question_id),
        )

    if topic_slug:
        base_query = base_query.join(Question, Attempt.question_id == Question.id).join(
            Topic, Question.topic_id == Topic.id
        ).where(Topic.slug == topic_slug)

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * limit
    data_query = (
        base_query.options(
            joinedload(Attempt.question).joinedload(Question.topic),
            joinedload(Attempt.question).joinedload(Question.subtopic),
        )
        .order_by(Attempt.attempted_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(data_query)
    attempts = result.scalars().unique().all()

    # Get bookmarked question IDs for this user
    bookmark_result = await db.execute(
        select(Bookmark.question_id).where(Bookmark.user_id == current_user.id)
    )
    bookmarked_ids = {row[0] for row in bookmark_result.all()}

    items = []
    for a in attempts:
        q = a.question
        items.append(
            AttemptHistoryItem(
                id=a.id,
                question=QuestionWithAnswer(
                    id=q.id,
                    question_text=q.question_text,
                    statements=q.statements or [],
                    options=QuestionOptions(A=q.option_a, B=q.option_b, C=q.option_c, D=q.option_d),
                    topic_name=q.topic.name,
                    subtopic_name=q.subtopic.name if q.subtopic else None,
                    difficulty=q.difficulty,
                    source_label=q.source_label,
                    correct_option=q.correct_option,
                    rationale=q.rationale,
                ),
                session_id=a.session_id,
                selected_option=a.selected_option,
                is_correct=a.is_correct,
                time_taken_secs=a.time_taken_secs,
                attempted_at=a.attempted_at,
                bookmarked=q.id in bookmarked_ids,
            )
        )

    return PaginatedAttempts(
        attempts=items,
        total=total,
        page=page,
        has_more=(offset + limit) < total,
    )


@router.post("/sessions", response_model=SessionOut)
async def create_session(
    body: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = TestSession(
        user_id=current_user.id,
        session_type=body.session_type,
        topic_id=body.topic_id,
        total_questions=body.total_questions,
    )
    db.add(session)
    await db.flush()
    return SessionOut.model_validate(session)


@router.put("/sessions/{session_id}/complete", response_model=SessionOut)
async def complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TestSession).where(
            and_(TestSession.id == session_id, TestSession.user_id == current_user.id)
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    session.completed = True
    session.completed_at = datetime.now(timezone.utc)
    if session.total_questions > 0:
        session.score = round((session.correct_count / session.total_questions) * 100, 2)

    return SessionOut.model_validate(session)


@router.post("/bookmarks/{question_id}")
async def toggle_bookmark(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Bookmark).where(
            and_(Bookmark.user_id == current_user.id, Bookmark.question_id == question_id)
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        return {"bookmarked": False}
    else:
        bookmark = Bookmark(user_id=current_user.id, question_id=question_id)
        db.add(bookmark)
        return {"bookmarked": True}
