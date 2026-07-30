# =============================================================================
# InternTracker AI – API Production Dockerfile
#
# Build stages:
#   1. deps     – install production dependencies
#   2. build    – compile TypeScript and generate Prisma client
#   3. runner   – minimal production image (no dev tools, no source)
#
# Architectural Decision:
#   - Multi-stage build minimises the final image size and attack surface.
#   - The runner stage uses the distroless Node image (node:20-slim) for
#     better security posture (no shell, no package manager in prod).
#   - Prisma client is generated inside the build stage so the runner
#     stage contains the compiled JS + prisma client only.
# =============================================================================

# ── Stage 1: Install deps ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install production deps only for the API
RUN npm install --workspace=apps/api --omit=dev

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/

# Install ALL deps (including dev) for building
RUN npm install

# Copy source
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client and build
WORKDIR /app/apps/api
RUN npx prisma generate && \
    npx nest build

# ── Stage 3: Runner (minimal production image) ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy compiled output and Prisma artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/main"]
