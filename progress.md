# Progress Log

> Live status. Tomorrow's session: read this first, then `CLAUDE.md` for steady-state context.

## Last session: 2026-05-15

### What got done
1. **Docker port conflict resolved** — `docker-compose.yml` postgres host port changed `5432:5432` → `5433:5432` to avoid clashing with another project's `eduready-db` container.
2. **Full prod stack brought up** — `examapp-{api,postgres,redis,frontend,admin,nginx}` all running. Health checks pass (`/`, `/admin/`, `/health`, `/docs` all 200). Restarted nginx once after recreating frontend so it re-resolved the upstream IP.
3. **Investigated login bug** — user reported `pegatutorial@gmail.com` couldn't log in to the student app while `sandip.khangembam@gmail.com` could. Confirmed **no hardcoded email** anywhere in the code (backend, frontend, admin all clean). Strings like `@sandipkh/upsc-ias-prep` in `frontend/lib/firebase.ts` are the Expo project owner/slug, not a user filter. Cause is almost certainly the **Google Cloud OAuth consent screen in Testing mode** — only listed test users can sign in. Fix: add the email under APIs & Services → OAuth consent screen → Test users, or publish the app.
4. **Created the full `.claude/` folder** — 17 new files: `settings.json`, 7 agents, 4 skills, 4 commands, and an executable pre-commit hook. Existing `settings.local.json` left intact.
5. **Created backend test skeletons** — 49 `pytest.skip("not implemented")` tests across:
   - `backend/tests/__init__.py`
   - `backend/tests/conftest.py` (two fixture stubs)
   - `backend/tests/test_auth.py` — 17 skeletons
   - `backend/tests/test_questions.py` — 16 skeletons
   - `backend/tests/test_quiz.py` — 16 skeletons
6. **Switched `examapp-api-1` to the dev image** (`docker compose up -d --no-deps api`) so the `./backend:/app` host mount picks up the new test files. Tests now collect/skip cleanly via `docker compose exec api uv run pytest tests/ -v --tb=short`.

### Where we paused
About to **wire the two fixtures in `conftest.py`** (`db_session`, `client`) and start implementing real tests, starting with `test_auth.py`. User flagged the work was bigger than expected and asked to defer.

## Tomorrow — pick up here

### Before writing test code, fix the skeleton-vs-reality gap
The test-engineer agent spec (in `.claude/agents/test-engineer.md`) and the skeletons assume features the codebase **does not have**. Adjust or delete these before implementing:

| Skeleton test | Reality | Action |
|---|---|---|
| `test_xp_award_*` (4 tests in `test_quiz.py`) | No `xp` column on `User` | Delete or `@pytest.mark.xfail(reason="XP not implemented in schema")` |
| `test_streak_*` (3 tests in `test_quiz.py`) | No `streak` column on `User` | Delete or `xfail` |
| `test_expired_current_affairs_question_excluded` (in `test_questions.py`) | No `expires_at` on `Question` | Delete |
| Any test using a numeric `correct_answer` index | `Question.correct_option` is `String(1)` `"A"`/`"B"`/`"C"`/`"D"` | Update assertions |
| Any test using `explanation` | Field is named `rationale` | Update |
| Any test using `rejection_reason` | Field is named `rejection_comment` | Update |

After trim/adjust, you'll have roughly **35 implementable tests** (down from 49).

### Fixture plan (decided, not yet written)
1. **`db_session`** in `conftest.py`:
   ```python
   from app.db.database import engine
   from sqlalchemy.ext.asyncio import AsyncSession

   @pytest_asyncio.fixture
   async def db_session():
       async with engine.connect() as conn:
           trans = await conn.begin()
           session = AsyncSession(bind=conn, expire_on_commit=False)
           try:
               yield session
           finally:
               await session.close()
               await trans.rollback()
   ```
   Connection-level transaction with rollback per test against the live dev postgres on the docker network. Tests stay isolated; no DB pollution.

2. **`client`** in `conftest.py`:
   ```python
   import httpx
   from app.main import app
   from app.db.database import get_db

   @pytest_asyncio.fixture
   async def client(db_session):
       async def _override(): yield db_session
       app.dependency_overrides[get_db] = _override
       transport = httpx.ASGITransport(app=app)
       async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
           yield ac
       app.dependency_overrides.clear()
   ```

3. **Firebase mock**: monkeypatch `firebase_admin.auth.verify_id_token` in tests that hit `/api/auth/verify-firebase-token` so we never touch real Firebase.

### Then implement in priority order
1. `test_auth.py` first — simplest, validates the fixtures work end-to-end (Firebase mock, JWT, refresh, admin login, role gates).
2. `test_quiz.py` second — submit-attempt happy/wrong/404 paths, free-plan paywalls, daily-limit, IST midnight reset.
3. `test_questions.py` third — admin CRUD + maker-checker transitions. Largest payoff for the business workflow.

Run after each file: `docker compose exec api uv run pytest tests/<file> -v --tb=short`. Report passed/failed/errors.

## Open questions for tomorrow
- Should the `test_xp_*` and `test_streak_*` skeletons be **deleted** outright, or kept as `xfail` markers to remind us the features are wanted? (User's call.)
- Test DB: keep using the live dev postgres with rollback, or stand up a separate `upsc_test` database? (Rollback is simpler; separate DB is more isolated.)
- For the pegatutorial login issue: did the user check the Google Cloud OAuth consent screen yet, or is that still pending?

## Container state at pause
```
examapp-api-1        — DEV image (host mount, --reload, port 8000 exposed)
examapp-postgres-1   — PROD postgres (untouched)
examapp-redis-1      — PROD redis (untouched)
examapp-frontend-1   — PROD nginx-static
examapp-admin-1      — PROD nginx-static
examapp-nginx-1      — PROD reverse proxy on :80
```
The dev api shares the docker network with the prod containers and reaches postgres at hostname `postgres` like the prod api did.

## Things to do later (not in scope tomorrow)
- Wire `.claude/hooks/pre-commit.sh` into actual git pre-commit (currently just sits in `.claude/hooks/`). Either symlink to `.git/hooks/pre-commit` or set up `husky`/`pre-commit` framework.
- Rebuild the prod api image once the test files are stable, so prod runs include them.
- Confirm pegatutorial OAuth fix worked.

-test github checkin
