---
name: new-feature
description: Scaffold a new feature following the UPSC IAS Prep app patterns
---

To add a new feature to the app:
1. Identify which service(s) this touches: backend, frontend, admin, or all three
2. Check existing models in `backend/app/models/` — do we need a migration?
3. If migration needed: use the `db-migration` skill
4. Write Pydantic v2 schemas in `backend/app/schemas/`
5. Write the FastAPI endpoint following the `api-design` skill pattern
6. Test the endpoint works: `docker compose exec api uv run pytest`
7. Build the frontend screen or admin page
8. Wire up React Query hooks to the new endpoint
9. Run /run-checks to verify nothing is broken
10. Run /security-review if the feature touches auth, payments, or user data
