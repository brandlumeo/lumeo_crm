#!/usr/bin/env bash
# Render build script — runs on every deploy AFTER pip install.
#
# In Render Settings → Build & Deploy:
#   Build Command:  cd backend && bash build.sh
#   Start Command:  cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
#
set -e   # Exit immediately on any error

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Applying database migrations ==="
python manage.py migrate --noinput

echo "=== Build complete ==="
