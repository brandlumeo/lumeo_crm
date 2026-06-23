# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy lockfiles first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile


# ─── Stage 2: Build Next.js production bundle ─────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The API URL is baked into the build for SSR and client-side fetches.
# Override via --build-arg or Docker Compose build.args in production.
ARG NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build


# ─── Stage 3: Production runtime (minimal) ────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup --system lumeo && adduser --system --ingroup lumeo lumeo

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy only the standalone Next.js server output (requires output: 'standalone' in next.config)
COPY --from=builder --chown=lumeo:lumeo /app/.next/standalone ./
COPY --from=builder --chown=lumeo:lumeo /app/.next/static ./.next/static
COPY --from=builder --chown=lumeo:lumeo /app/public ./public

USER lumeo

EXPOSE 3000

CMD ["node", "server.js"]
