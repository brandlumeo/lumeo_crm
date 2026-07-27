#!/usr/bin/env bash
# Render build script — runs on every deploy
# Set this as your Render "Build Command":
#   cd backend && pip install -r requirements.txt && bash build.sh
# And your "Start Command":
#   cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
set -e   # Exit immediately on any error

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Applying database migrations ==="
python manage.py migrate --noinput

echo "=== Build complete ==="
