"""
Shared pytest fixtures for the UPSC IAS Prep backend.

Each test gets a fresh DB transaction that rolls back after the test.
Firebase token verification and Razorpay calls are mocked at the boundary —
never hit real external services in tests.

TODO: wire these fixtures to a test DB (e.g. an in-memory SQLite or a
separate test postgres). Skeleton only — fill in before the first
test is un-skipped.
"""

import pytest
import pytest_asyncio


@pytest_asyncio.fixture
async def db_session():
    """Provide an AsyncSession bound to a transaction that rolls back."""
    pytest.skip("db_session fixture not implemented — wire a test DB engine")


@pytest_asyncio.fixture
async def client(db_session):
    """httpx.AsyncClient configured against the FastAPI app with overridden get_db."""
    pytest.skip("client fixture not implemented — override get_db with db_session")


@pytest.fixture
def fake_firebase_token():
    """Return a payload that the Firebase verifier mock returns."""
    return {
        "uid": "test-firebase-uid",
        "email": "test@example.com",
        "name": "Test User",
        "picture": None,
    }


@pytest.fixture
def auth_headers():
    """Bearer header for an authenticated user — populated after login fixture."""
    return {"Authorization": "Bearer test-token"}
