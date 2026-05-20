---
name: db-migration
description: >
  Safely create and apply Alembic database migrations. Use whenever
  the SQLAlchemy models change and the DB schema needs updating.
---

Steps for a safe Alembic migration:

1. Make your changes to the SQLAlchemy model in `backend/app/models/`
2. From the PROJECT ROOT (not /backend), generate the migration:
   `uv run alembic revision --autogenerate -m "describe-your-change"`
   Good names: add-subscription-table, add-expires-at-to-questions
3. Open the generated file in `backend/alembic/versions/` and verify:
   - upgrade() contains the correct ADD COLUMN / CREATE TABLE statements
   - downgrade() correctly reverses the change
4. Apply the migration:
   `uv run alembic upgrade head`
5. Verify in the running container:
   `docker compose exec api uv run alembic current`

If you need to roll back:
`uv run alembic downgrade -1`

Rules:
- Never edit an already-applied migration — create a new one
- Never use `alembic stamp` to skip migrations in production
- For destructive changes (dropping columns): check if data needs preserving first
- Always run from project root — the alembic.ini path assumes this
