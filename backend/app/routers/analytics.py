from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import Integer, and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import Attempt, Topic, TopicPerformance, User
from app.schemas.schemas import HeatmapResponse, StatsResponse, TopicHeatmapItem

router = APIRouter()


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    topics_result = await db.execute(
        select(Topic).where(Topic.is_active == True).order_by(Topic.sort_order)
    )
    topics = list(topics_result.scalars().all())

    perf_result = await db.execute(
        select(TopicPerformance).where(TopicPerformance.user_id == current_user.id)
    )
    perf_map = {p.topic_id: p for p in perf_result.scalars().all()}

    items = []
    for t in topics:
        perf = perf_map.get(t.id)
        if perf is None or perf.total_attempted == 0:
            strength = "unattempted"
            accuracy = None
            total_attempted = 0
        else:
            accuracy = float(perf.accuracy)
            total_attempted = perf.total_attempted
            if accuracy < 40:
                strength = "weak"
            elif accuracy <= 70:
                strength = "moderate"
            else:
                strength = "strong"

        items.append(
            TopicHeatmapItem(
                topic=t.name,
                slug=t.slug,
                icon=t.icon,
                accuracy=accuracy,
                total_attempted=total_attempted,
                strength=strength,
            )
        )

    return HeatmapResponse(topics=items)


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total attempted and correct
    counts_result = await db.execute(
        select(
            func.count(Attempt.id),
            func.coalesce(func.sum(case((Attempt.is_correct == True, 1), else_=0)), 0),
        ).where(Attempt.user_id == current_user.id)
    )
    row = counts_result.one()
    total_attempted = row[0]
    total_correct = row[1]

    overall_accuracy = round((total_correct / total_attempted) * 100, 1) if total_attempted > 0 else 0.0

    # Streak calculation: consecutive days with attempts going back from today
    today = datetime.now(timezone.utc).date()

    distinct_dates_result = await db.execute(
        select(func.distinct(func.date(Attempt.attempted_at)))
        .where(Attempt.user_id == current_user.id)
        .order_by(func.date(Attempt.attempted_at).desc())
    )
    attempt_dates = sorted({row[0] for row in distinct_dates_result.all()}, reverse=True)

    current_streak = 0
    check_date = today
    for d in attempt_dates:
        if d == check_date:
            current_streak += 1
            check_date -= timedelta(days=1)
        elif d < check_date:
            break

    # Longest streak
    longest_streak = 0
    if attempt_dates:
        sorted_asc = sorted(attempt_dates)
        streak = 1
        for i in range(1, len(sorted_asc)):
            if sorted_asc[i] - sorted_asc[i - 1] == timedelta(days=1):
                streak += 1
            else:
                longest_streak = max(longest_streak, streak)
                streak = 1
        longest_streak = max(longest_streak, streak)

    return StatsResponse(
        total_attempted=total_attempted,
        total_correct=total_correct,
        overall_accuracy=overall_accuracy,
        current_streak=current_streak,
        longest_streak=longest_streak,
    )
