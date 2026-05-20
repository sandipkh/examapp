# UPSC IAS Prep — Project Context

Full-stack UPSC exam prep platform. Three apps + supporting infra.

> Note: Claude Code auto-loads `CLAUDE.md` (uppercase). The companion live-status file is `progress.md`.

## Layout

```
examapp/
├── frontend/         # Expo SDK 54, React Native, TSX, NativeWind v4, React Query v5, Zustand, Expo Router v3, Firebase Auth
├── backend/          # FastAPI, Python 3.11, uv, SQLAlchemy 2.0 async, Alembic, Pydantic v2
├── admin/            # React + Vite + TypeScript + Tailwind + shadcn/ui
├── nginx/            # nginx reverse proxy
├── docker-compose.yml          # dev (volume-mounted code, --reload)
├── docker-compose.prod.yml     # prod (code baked into image, runs migrations on startup)
└── .claude/          # agents, skills, commands, hooks
```

## Hard rules

- **Backend**: `uv` exclusively. Never `pip install`. Add deps with `uv add <pkg>`. Run anything with `uv run <cmd>`.
- **Frontend**: TSX only — never JSX. NativeWind v4 utility classes — never `StyleSheet.create()`. React Query v5 hooks — never `useEffect` for data fetching.
- **Docker**: API service is named `api`, not `backend`. Run all docker commands from project root.
- **Alembic**: `uv run alembic upgrade head` from project root (not `/backend`).
- **Windows**: use `Select-String`, not `grep`. Use Git Bash for unix-style commands.

## Docker quick reference

| Stack | When to use | What it does |
|---|---|---|
| `docker-compose.yml` (dev) | Local development, running tests | Volume-mounts `./backend:/app`, uvicorn `--reload`, exposes api on `:8000`. Postgres on host port **5433** (avoids conflict with the `eduready-db` container from a separate project). |
| `docker-compose.prod.yml` (prod) | Realistic end-to-end testing | Bakes code into images, runs migrations via `start.sh`, only `nginx` is exposed on host (`:80`). No host code mount. |

Both compose files share the same project name (`examapp`) and service names. Either file manages the same containers. The dev and prod **postgres volumes are different** (`pgdata` vs `postgres_data`), so they hold different data.

### URLs (when prod stack is up)
- Frontend (student app): http://localhost/
- Admin panel: http://localhost/admin/
- API docs: http://localhost/docs
- API health: http://localhost/health

### Common gotchas
- **nginx caches upstream IPs**. After recreating `frontend`/`admin`/`api` containers, restart nginx (`docker restart examapp-nginx-1`) or you get 502s on the route to the recreated service.
- **Prod stack has no host code mount.** Files written on the host don't appear inside the prod api container until you rebuild the image.
- To run tests with hot file pickup: `docker compose up -d --no-deps api` swaps `examapp-api-1` to the dev image without disturbing the other prod containers.
- The dev `api` connects to whatever postgres is on the docker network at hostname `postgres` — which is whichever postgres container is currently running.

## Backend structure

```
backend/app/
├── main.py
├── core/        # config.py, security.py (JWT), deps.py (get_current_user, get_current_admin, require_role)
├── db/          # database.py (AsyncSessionLocal, get_db, Base)
├── models/      # models.py — all SQLAlchemy models in one file
├── schemas/     # schemas.py — all Pydantic v2 schemas in one file
└── routers/     # admin.py, analytics.py, attempts.py, auth.py, payments.py, questions.py
```

Note: routers live under `app/routers/`, **not** `app/api/` (a common assumption from generic templates).

## Domain notes (real, from code — not idealised)

### User auth
- Students: Firebase ID token → backend `/api/auth/verify-firebase-token` → mints app JWT (`JWT_SECRET`, 15 min access + 30 day refresh).
- Admins: separate `admin_users` table, email + password (bcrypt), `/api/admin/login`.
- No hardcoded email whitelist anywhere. If a Google account can't sign in to the student app, the block is on Google's side (OAuth consent screen in Testing mode → only listed test users allowed).

### Question model
- Options stored as **`option_a`, `option_b`, `option_c`, `option_d` columns** — not a JSON array.
- `correct_option` is `String(1)` containing `"A"`/`"B"`/`"C"`/`"D"` — not an integer index.
- Explanation field is named `rationale`, not `explanation`.
- Status flow: `draft → pending → published` (or `rejected`). Tracked via `created_by`, `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at`, `published_at`, `rejection_comment`.
- **No `expires_at` column** — there is no per-question expiry / current-affairs cutoff in the schema.

### Quiz / attempts
- `submit_attempt` only records `is_correct`, upserts `topic_performance`, increments `session.correct_count` if correct + session_id provided.
- **No XP awarded.** There is no `xp` column on `User`.
- **No streak tracked.** There is no `streak` column on `User`.
- Free-plan paywalls live in `GET /api/questions/next`:
  - Free user + topic/quick/full-test mode → 403 `"premium_feature"`
  - Free user past 10 questions in a day → 403 `"daily_limit_reached"`
- Daily reset is at **IST midnight** (`User.daily_reset_at`).
- Daily quiz excludes questions attempted **today**; other modes exclude attempts from the **last 7 days**.

### Roles
- `AdminUser.role` ∈ `{maker, checker, superadmin}`. Enforced by `require_role([...])` in `app/core/deps.py`.
- Maker: create/edit own draft, submit for review. Cannot approve.
- Checker: approve/reject pending questions. Cannot create.
- Superadmin: everything.

## Frontend notes

- Expo Router v3, file-based routes under `frontend/app/`.
- `(auth)` group: `login.tsx`, `otp.tsx`, `profile-setup.tsx`.
- `(tabs)` group: main tab navigator.
- Google OAuth uses `auth.expo.io/@sandipkh/upsc-ias-prep` — this is the **Expo project owner/slug**, not a user email restriction.
- `react-native-razorpay` is a native module: **EAS dev build only**, NOT Expo Go.

## Admin panel notes

- Vite + React. Uses **npm**, not uv.
- Auth: JWT in localStorage, sent as Bearer to `/api/admin/*`.
- Nav menu is role-keyed in `src/components/Layout.tsx`.

## How to run things

```bash
# Full prod stack up (everything via nginx on :80)
docker compose -f docker-compose.prod.yml up -d
docker restart examapp-nginx-1   # only if frontend/admin/api were recreated

# Dev API only, leaving prod stack alone
docker compose up -d --no-deps api

# Run backend tests
docker compose exec api uv run pytest tests/ -v --tb=short

# Migrations
docker compose exec api uv run alembic upgrade head
docker compose exec api uv run alembic revision --autogenerate -m "describe"

# Admin / frontend locally (without docker)
cd admin && npm run dev          # Vite on :5173
cd frontend && npm start         # Expo on :8081
```

## .claude/ artifacts

This repo ships with a `.claude/` folder containing 7 agents, 4 skills, 4 slash commands, and a pre-commit hook. See `.claude/settings.json` for the default agent (`fullstack-engineer`). Project-level agent definitions are not auto-spawnable in a session that started before they existed — start a new session to pick them up.
