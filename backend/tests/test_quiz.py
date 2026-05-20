"""
Quiz scoring, XP, streak, and daily-reset logic.

Source: backend/app/routers/attempts.py
        backend/app/routers/questions.py (daily quiz endpoint)
"""

import pytest


# ── Scoring ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_correct_answer_marks_attempt_is_correct_true(client, auth_headers):
    """Submitting the correct option returns is_correct=true."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_wrong_answer_marks_attempt_is_correct_false(client, auth_headers):
    """Submitting a wrong option returns is_correct=false."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_submit_attempt_records_time_taken(client, auth_headers):
    """time_taken_secs is persisted on the Attempt row."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_submit_attempt_for_unpublished_question_returns_404(client, auth_headers):
    """Draft/pending/rejected questions cannot be answered — 404."""
    pytest.skip("not implemented")


# ── XP calculation ───────────────────────────────────────

@pytest.mark.asyncio
async def test_xp_award_easy_question_correct():
    """Easy + correct → +10 XP (per agent spec)."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_xp_award_medium_question_correct():
    """Medium + correct → +20 XP."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_xp_award_hard_question_correct():
    """Hard + correct → +30 XP."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_xp_not_awarded_for_wrong_answer():
    """Wrong answer → 0 XP, regardless of difficulty."""
    pytest.skip("not implemented")


# ── Streak ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_streak_increments_when_quiz_taken_today():
    """First quiz today after a quiz yesterday → streak += 1."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_streak_unchanged_for_second_quiz_same_day():
    """Multiple quizzes in one day → streak stays the same."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_streak_resets_when_gap_exceeds_one_day():
    """Last quiz >1 day ago → streak resets to 1 on next quiz."""
    pytest.skip("not implemented")


# ── Daily quiz reset ─────────────────────────────────────

@pytest.mark.asyncio
async def test_daily_quiz_filters_by_today_not_attempted_flag(client, auth_headers):
    """
    Bug guard: daily quiz must filter by today's date, NOT by attempted=false.
    Otherwise a user who answered yesterday's daily can't get today's.
    """
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_daily_quiz_returns_same_question_set_within_same_day(client, auth_headers):
    """Two requests on the same calendar day return the same daily quiz."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_daily_quiz_rolls_over_at_midnight(client, auth_headers):
    """After UTC midnight, a fresh daily quiz becomes available."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_free_user_daily_questions_used_increments(client, auth_headers):
    """Free tier: user.daily_questions_used += 1 per attempt (plan gating)."""
    pytest.skip("not implemented")
