---
name: run-checks
description: Run all checks — TypeScript, Python types, and tests
---

Run the full check suite in order:

1. Backend type check:
   `docker compose exec api uv run mypy app/ --ignore-missing-imports`
   Report any type errors.

2. Backend tests:
   `uv run pytest backend/tests/ -v --tb=short`
   Report: total, passed, failed. Show failing test names and errors.

3. Admin panel TypeScript check:
   `cd admin && npx tsc --noEmit`
   Report first 5 errors if any.

4. Frontend TypeScript check:
   `cd frontend && npx tsc --noEmit`
   Report first 5 errors if any.

If all pass: report "All checks green ✓"
If any fail: stop and fix before continuing.
