#!/bin/bash
# UPSC IAS Prep App — pre-commit hook
# Runs on every commit to catch obvious issues early

echo "Running pre-commit checks..."

# 1. Check for accidentally committed secrets
if git diff --cached --name-only | xargs grep -l "rzp_live_\|RAZORPAY_KEY_SECRET=\|SECRET_KEY=" 2>/dev/null; then
  echo "ERROR: Possible secret detected in staged files. Remove before committing."
  exit 1
fi

# 2. Check for .env files being committed
if git diff --cached --name-only | grep -E "^\.env$|^backend/\.env$|^frontend/\.env$|^admin/\.env$"; then
  echo "ERROR: .env file is staged. Add to .gitignore and unstage it."
  exit 1
fi

# 3. Frontend TypeScript check (fast check — only changed .tsx/.ts files)
CHANGED_TS=$(git diff --cached --name-only | grep -E "\.(ts|tsx)$" | head -5)
if [ -n "$CHANGED_TS" ]; then
  echo "Changed TypeScript files detected — running tsc check on frontend..."
  cd frontend && npx tsc --noEmit 2>&1 | head -20
  if [ $? -ne 0 ]; then
    echo "TypeScript errors found in frontend. Fix before committing."
    exit 1
  fi
  cd ..
fi

echo "✓ Pre-commit checks passed"
exit 0
