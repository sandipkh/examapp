"""
Questions CRUD, maker-checker access control, and status transitions.

Source: backend/app/routers/questions.py     (student-facing)
        backend/app/routers/admin.py         (admin CRUD + review)

Status flow: draft → pending → published  (or → rejected → draft)
"""

import pytest


# ── Student-facing read ──────────────────────────────────

@pytest.mark.asyncio
async def test_student_only_sees_published_questions(client, auth_headers):
    """GET /questions never returns draft/pending/rejected rows."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_student_cannot_fetch_unpublished_by_id(client, auth_headers):
    """GET /questions/{id} for a non-published question → 404, not 200."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_expired_current_affairs_question_excluded(client, auth_headers):
    """expires_at in the past → excluded from student feed even if published."""
    pytest.skip("not implemented")


# ── Maker CRUD ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_maker_can_create_question_in_draft(client):
    """POST /admin/questions by a maker → status='draft', created_by=maker.id."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_maker_can_edit_own_draft(client):
    """Maker edits own draft → 200, fields updated."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_maker_cannot_edit_other_makers_draft(client):
    """Maker A tries to edit Maker B's draft → 403."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_maker_submits_question_for_review(client):
    """Submit transitions status draft → pending."""
    pytest.skip("not implemented")


# ── Maker-checker status transitions ────────────────────

@pytest.mark.asyncio
async def test_checker_can_approve_pending_question(client):
    """Approve → status='published', reviewed_by=checker.id."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_checker_can_reject_with_reason(client):
    """Reject → status='rejected', rejection_reason persisted."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_maker_cannot_approve_own_question(client):
    """Maker calls approve on their own pending question → 403."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_maker_cannot_approve_others_question(client):
    """Maker calls approve on another maker's pending question → 403 (role gate)."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_checker_cannot_approve_draft_question(client):
    """Only pending questions are approvable; approving a draft → 400."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_rejected_question_can_be_edited_back_to_draft(client):
    """Maker edits a rejected question → returns to draft status."""
    pytest.skip("not implemented")


# ── Superadmin override ──────────────────────────────────

@pytest.mark.asyncio
async def test_superadmin_can_publish_directly(client):
    """Superadmin bypasses the maker→checker flow → status='published'."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_superadmin_can_edit_any_question_regardless_of_status(client):
    """Superadmin edits a published question → 200."""
    pytest.skip("not implemented")


# ── Bulk operations ──────────────────────────────────────

@pytest.mark.asyncio
async def test_bulk_approve_only_affects_pending_questions(client):
    """Bulk approve over a mix of statuses only flips the pending ones."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_csv_import_creates_questions_in_draft(client):
    """CSV import → new rows with status='draft', created_by=current admin."""
    pytest.skip("not implemented")
