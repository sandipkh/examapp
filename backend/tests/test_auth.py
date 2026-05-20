"""
JWT validation, Firebase token verification, and role checks.

Source: backend/app/routers/auth.py
        backend/app/core/deps.py
        backend/app/core/security.py
"""

import pytest


# ── Firebase token verification ──────────────────────────

@pytest.mark.asyncio
async def test_verify_firebase_token_valid_creates_new_user(client, fake_firebase_token):
    """First-time login with a valid Firebase token creates a User row and returns is_new_user=true."""
    pytest.skip("not implemented — mock firebase_admin.auth.verify_id_token")


@pytest.mark.asyncio
async def test_verify_firebase_token_valid_returns_existing_user(client, fake_firebase_token):
    """Existing user re-login returns is_new_user=false and the same user row."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_verify_firebase_token_invalid_returns_401(client):
    """Any exception from firebase_admin.auth.verify_id_token → 401."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_verify_firebase_token_response_includes_access_and_refresh(client, fake_firebase_token):
    """AuthResponse must include both access_token and refresh_token."""
    pytest.skip("not implemented")


# ── JWT access token validation ──────────────────────────

@pytest.mark.asyncio
async def test_protected_endpoint_without_token_returns_401(client):
    """Missing Authorization header → 401."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_protected_endpoint_with_expired_token_returns_401(client):
    """Token past its exp claim → 401 'Invalid or expired token'."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_protected_endpoint_with_tampered_signature_returns_401(client):
    """Modified token → signature check fails → 401."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_protected_endpoint_with_token_for_deleted_user_returns_401(client):
    """User row deleted while token still valid → 401 'User not found'."""
    pytest.skip("not implemented")


# ── Refresh token flow ───────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_with_valid_refresh_token_returns_new_pair(client):
    """POST /api/auth/refresh with valid refresh → new access + refresh tokens."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_refresh_with_invalid_refresh_token_returns_401(client):
    """Invalid/expired refresh token → 401."""
    pytest.skip("not implemented")


# ── Admin login (email + password) ───────────────────────

@pytest.mark.asyncio
async def test_admin_login_correct_credentials_returns_token(client):
    """Valid admin email + password → 200 with access_token, role, name."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_admin_login_wrong_password_returns_401(client):
    """Right email, wrong password → 401 'Invalid credentials'."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_admin_login_unknown_email_returns_401(client):
    """Email not in AdminUser table → 401 (same message, no enumeration leak)."""
    pytest.skip("not implemented")


# ── Role checks (require_role) ───────────────────────────

@pytest.mark.asyncio
async def test_maker_cannot_access_superadmin_endpoint(client):
    """Maker hits a superadmin-only endpoint (e.g. /users) → 403."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_checker_cannot_create_questions(client):
    """Checker hits POST /admin/questions (maker/superadmin only) → 403."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_superadmin_can_access_all_admin_endpoints(client):
    """Superadmin has access to maker- AND checker-restricted endpoints."""
    pytest.skip("not implemented")


@pytest.mark.asyncio
async def test_user_jwt_does_not_work_on_admin_endpoint(client):
    """A regular User-issued JWT must not be accepted on /admin/* routes."""
    pytest.skip("not implemented")
