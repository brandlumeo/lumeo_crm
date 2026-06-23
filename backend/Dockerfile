# ─── Stage 1: Python dependency builder ──────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools needed for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# ─── Stage 2: Production runtime ─────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Create a non-root application user
RUN groupadd --system lumeo && useradd --system --gid lumeo lumeo

# Install only libpq runtime (not dev headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pre-built wheels from builder stage and install
COPY --from=builder /wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy application source
COPY . .

# Collect static files (WhiteNoise will serve these in production)
RUN python manage.py collectstatic --noinput

# Chown everything to the app user
RUN chown -R lumeo:lumeo /app

USER lumeo

# Gunicorn: 2 workers per CPU core is the standard starting point
# Configured via env vars for flexibility
ENV GUNICORN_WORKERS=4
ENV GUNICORN_THREADS=2
ENV GUNICORN_PORT=8000

EXPOSE 8000

CMD ["sh", "-c", \
     "gunicorn config.wsgi:application \
      --bind 0.0.0.0:${GUNICORN_PORT} \
      --workers ${GUNICORN_WORKERS} \
      --threads ${GUNICORN_THREADS} \
      --timeout 120 \
      --log-level info \
      --access-logfile - \
      --error-logfile -"]
