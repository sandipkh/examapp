---
name: security-review
description: Run the security-reviewer agent on recently changed files
---

Use the security-reviewer agent to review the current changes:
1. Identify all modified files (check git diff or recently edited files)
2. For each file, run through the security checklist:
   - Auth dependency present on all protected endpoints?
   - All DB queries filtered by user_id from JWT (not from input)?
   - Razorpay webhook signature verified before processing?
   - No secrets or API keys in source code?
   - Admin endpoints checking role (not just auth)?
   - Error messages safe for clients?
3. Report any issues found with file name and line number
4. Flag CRITICAL issues (auth bypass, data leakage) separately from warnings
