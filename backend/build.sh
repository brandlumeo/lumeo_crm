#!/usr/bin/env bash
# Render build script — runs on every deploy.
# NOTE: This replaces Render's default build steps, so pip install must be here.
#
# In Render Settings → Build & Deploy:
#   Build Command:  cd backend && bash build.sh
#   Start Command:  cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
#
set -e   # Exit immediately on any error

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Applying database migrations ==="
python manage.py migrate --noinput

echo "=== Build complete ==="
