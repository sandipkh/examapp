---
name: tdd
description: >
  Test-driven development workflow for backend logic. Use when building
  business-critical features — payment webhooks, quiz scoring, maker-checker
  transitions.
---

TDD cycle for the UPSC IAS Prep backend:

1. Write a failing test first in `backend/tests/`
2. Run: `uv run pytest backend/tests/<test_file>.py -v`
   Confirm it fails for the right reason
3. Write the minimum code to make it pass
4. Run again — confirm it passes
5. Refactor if needed, run again
6. Commit: `git commit -m "feat: description with tests"`

For payment webhooks specifically — write these tests:
- valid signature + payment.captured → user subscription activated
- invalid signature → 400, no DB change
- duplicate payment_id → 200 (idempotent), no double credit
- subscription.charged → expires_at extended
- subscription.payment_failed → grace period set
- subscription.cancelled → tier set to free at period end

For quiz scoring:
- correct answer → XP awarded (easy=10, medium=20, hard=30)
- streak maintained if quiz done today
- streak resets if last quiz was >1 day ago
- daily quiz only available once per calendar day (date-based, not attempted=false)
