import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import Attempt, Question, TestSession, Topic, TopicPerformance, User
from app.schemas.schemas import QuestionOptions, QuestionOut

router = APIRouter()

IST_OFFSET = timezone(timedelta(hours=5, minutes=30))


def _today_midnight_ist() -> datetime:
    now_ist = datetime.now(IST_OFFSET)
    midnight = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight


@router.get("/next", response_model=QuestionOut)
async def get_next_question(
    topic_slug: str | None = Query(None),
    difficulty: str | None = Query(None),
    session_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Look up session type if provided
    session_type: str | None = None
    if session_id is not None:
        sess_result = await db.execute(
            select(TestSession).where(
                and_(TestSession.id == session_id, TestSession.user_id == current_user.id)
            )
        )
        session = sess_result.scalar_one_or_none()
        if session:
            session_type = session.session_type

    is_daily_quiz = session_type == "daily_quiz"

    # Free plan restrictions (daily quiz is always free)
    if current_user.plan == "free" and not is_daily_quiz:
        # Topic practice, quick practice, and full mock are paywalled
        if topic_slug or session_type in ("quick_practice", "full_test", "topic_practice"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="premium_feature",
            )

    # Daily limit check for free users (applies even to daily quiz)
    if current_user.plan == "free":
        today_midnight = _today_midnight_ist()
        if current_user.daily_reset_at is None or current_user.daily_reset_at < today_midnight:
            current_user.daily_questions_used = 0
            current_user.daily_reset_at = today_midnight
        if current_user.daily_questions_used >= 10:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="daily_limit_reached")

    # Exclude recently attempted questions:
    # - Daily quiz: only exclude questions attempted today (re-serve yesterday's questions)
    # - Other modes: exclude questions attempted in the last 7 days
    if is_daily_quiz:
        cutoff = _today_midnight_ist()
    else:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent_result = await db.execute(
        select(Attempt.question_id).where(
            and_(Attempt.user_id == current_user.id, Attempt.attempted_at >= cutoff)
        )
    )
    recent_ids = {row[0] for row in recent_result.all()}

    selected_question: Question | None = None

    if topic_slug:
        # Filter to specific topic
        topic_result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
        topic = topic_result.scalar_one_or_none()
        if topic is None:
            raise HTTPException(status_code=404, detail="Topic not found")

        query = select(Question).where(
            and_(Question.topic_id == topic.id, Question.status == "published", Question.id.notin_(recent_ids))
        )
        if difficulty:
            query = query.where(Question.difficulty == difficulty)
        query = query.options(joinedload(Question.topic), joinedload(Question.subtopic))

        result = await db.execute(query)
        candidates = list(result.scalars().all())
        if candidates:
            selected_question = random.choice(candidates)
    else:
        # Adaptive selection using topic weights
        perf_result = await db.execute(
            select(TopicPerformance).where(TopicPerformance.user_id == current_user.id)
        )
        performances = {p.topic_id: p for p in perf_result.scalars().all()}

        topics_result = await db.execute(select(Topic).where(Topic.is_active == True).order_by(Topic.sort_order))
        all_topics = list(topics_result.scalars().all())

        weighted_topics: list[Topic] = []
        for t in all_topics:
            perf = performances.get(t.id)
            if perf is None or perf.total_attempted == 0 or float(perf.accuracy) < 40:
                weight = 3
            elif float(perf.accuracy) <= 70:
                weight = 2
            else:
                weight = 1
            weighted_topics.extend([t] * weight)

        random.shuffle(weighted_topics)

        tried_topic_ids: set[int] = set()
        for topic in weighted_topics:
            if topic.id in tried_topic_ids:
                continue
            tried_topic_ids.add(topic.id)

            query = select(Question).where(
                and_(Question.topic_id == topic.id, Question.status == "published", Question.id.notin_(recent_ids))
            )
            if difficulty:
                query = query.where(Question.difficulty == difficulty)
            query = query.options(joinedload(Question.topic), joinedload(Question.subtopic))

            result = await db.execute(query)
            candidates = list(result.scalars().all())
            if candidates:
                selected_question = random.choice(candidates)
                break

    if selected_question is None:
        raise HTTPException(status_code=404, detail="No questions available")

    # Increment daily usage
    current_user.daily_questions_used += 1

    return QuestionOut(
        id=selected_question.id,
        question_text=selected_question.question_text,
        statements=selected_question.statements or [],
        options=QuestionOptions(
            A=selected_question.option_a,
            B=selected_question.option_b,
            C=selected_question.option_c,
            D=selected_question.option_d,
        ),
        topic_name=selected_question.topic.name,
        subtopic_name=selected_question.subtopic.name if selected_question.subtopic else None,
        difficulty=selected_question.difficulty,
        source_label=selected_question.source_label,
    )


@router.get("/session/{session_id}")
async def get_session_attempts(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt)
        .where(and_(Attempt.session_id == session_id, Attempt.user_id == current_user.id))
        .options(joinedload(Attempt.question).joinedload(Question.topic))
        .order_by(Attempt.attempted_at)
    )
    attempts = result.scalars().all()

    items = []
    for a in attempts:
        q = a.question
        items.append(
            {
                "id": a.id,
                "question": {
                    "id": q.id,
                    "question_text": q.question_text,
                    "statements": q.statements or [],
                    "options": {"A": q.option_a, "B": q.option_b, "C": q.option_c, "D": q.option_d},
                    "topic_name": q.topic.name,
                    "subtopic_name": q.subtopic.name if q.subtopic else None,
                    "difficulty": q.difficulty,
                    "source_label": q.source_label,
                    "correct_option": q.correct_option,
                    "rationale": q.rationale,
                },
                "selected_option": a.selected_option,
                "is_correct": a.is_correct,
                "time_taken_secs": a.time_taken_secs,
                "attempted_at": a.attempted_at.isoformat(),
            }
        )
    return items
