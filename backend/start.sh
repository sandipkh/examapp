#!/bin/bash
set -e
export PYTHONPATH=/app
echo "Running database migrations..."
uv run alembic upgrade head
echo "Starting server..."
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
