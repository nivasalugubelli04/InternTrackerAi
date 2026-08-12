<div align="center">

# 🎯 InternTracker AI

### Mobile-First Internship Monitoring Platform

[![Phase](https://img.shields.io/badge/Phase-1%20%E2%80%93%20Authentication-7c3aed?style=for-the-badge)]()
[![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?style=for-the-badge&logo=nestjs)]()
[![Expo](https://img.shields.io/badge/Expo-51-000020?style=for-the-badge&logo=expo)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)]()
[![Redis](https://img.shields.io/badge/Redis-7-dc382d?style=for-the-badge&logo=redis)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%20Strict-3178c6?style=for-the-badge&logo=typescript)]()

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start — Docker (Recommended)](#quick-start--docker-recommended)
- [Quick Start — Local Development](#quick-start--local-development)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Tooling & Code Quality](#tooling--code-quality)
- [Architectural Decisions](#architectural-decisions)
- [Roadmap](#roadmap)

---

## Overview

InternTracker AI is a **mobile-first platform** that helps organisations monitor, manage, and optimise their internship programmes using AI-driven insights.

This repository contains **Phase 0 + Phase 1** — the production-ready foundation with a complete authentication system:

| Layer | Technology | Purpose |
|---|---|---|
| Mobile | React Native (Expo 51) | iOS & Android app |
| API | NestJS 10 + Fastify | REST backend |
| Auth | JWT (access + refresh) | Stateless authentication |
| Database | PostgreSQL 16 + Prisma | Relational data store |
| Cache / Queue | Redis 7 + BullMQ | Caching & background jobs |
| Containerisation | Docker + Compose | Local & production environments |
| Docs | Swagger / OpenAPI | Interactive API documentation |

---

## 🔐 Phase 1 & 2 — Authentication & Profile API

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| **Auth** | | | |
| `POST` | `/auth/register` | ❌ | Register new account |
| `POST` | `/auth/login` | ❌ | Login → access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh Token | Rotate refresh token |
| `POST` | `/auth/logout` | ✅ Access Token | Revoke refresh token |
| `GET` | `/auth/me` | ✅ Access Token | Get current user |
| **Profile** | | | |
| `GET` | `/profile` | ✅ Access Token | Get profile + skills + completion |
| `POST` | `/profile` | ✅ Access Token | Create profile (Onboarding) |
| `PATCH` | `/profile` | ✅ Access Token | Update profile |
| `POST` | `/profile/complete-onboarding`| ✅ Access Token | Mark onboarding as complete |
| **Skills** | | | |
| `GET` | `/skills` | ✅ Access Token | Search global skills catalog |
| `POST` | `/profile/skills` | ✅ Access Token | Add skill to profile |
| `DELETE` | `/profile/skills/:id` | ✅ Access Token | Remove skill from profile |
| **Resume** | | | |
| `POST` | `/resume/upload` | ✅ Access Token | Upload/upsert resume metadata |
| `GET` | `/resume` | ✅ Access Token | Get current user's resume |
| `DELETE` | `/resume` | ✅ Access Token | Delete resume |
| **Preferences** | | | |
| `GET` | `/preferences` | ✅ Access Token | Get all preferences (career + notification) |
| `PUT` | `/preferences/career` | ✅ Access Token | Update career preferences |
| **Phase 4 — Scrapers & Jobs Engine** | | | |
| `GET` | `/scrapers/status` | Internal/Admin | System health, success rates, active telemetry |
| `GET` | `/scrapers/history` | Internal/Admin | Historical scrape execution logs |
| `POST` | `/scrapers/run/:companyId` | Internal/Admin | Trigger scrape job for single company |
| `POST` | `/scrapers/run-all` | Internal/Admin | Trigger batch scrape jobs for all active companies |
| `GET` | `/jobs/raw` | Internal/Admin | Query raw JSON/HTML snapshots |
| `GET` | `/jobs/normalized` | Internal/Admin | Query normalized, deduplicated internship listings |

### Swagger UI

```
http://localhost:3000/api/v1/docs
```

### Security Features

- 🔒 **bcrypt** password hashing (configurable rounds)
- 🔄 **Refresh token rotation** — old token revoked on every refresh
- 🔑 **SHA-256 token hashing** — raw tokens never stored in DB
- 🚫 **Account lockout** after N failed login attempts
- ⏱ **Rate limiting** via `@nestjs/throttler` (global)
- 📧 **Email verification** with 24h expiry
- 🔐 **Separate JWT secrets** for access vs refresh tokens
- 🛡 **Secure by default** — all routes require auth; use `@Public()` to opt out

### Running the Migration

```bash
# Start Docker services first
docker compose up -d postgres redis

# Run migration (creates auth, company, and scraper tables)
npm run prisma:migrate --workspace=apps/api
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Mobile App                          │
│              React Native / Expo (iOS + Android)         │
└─────────────────────────┬────────────────────────────────┘
                          │  HTTPS / REST
                          ▼
┌──────────────────────────────────────────────────────────┐
│                    NestJS API (Fastify)                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ HealthModule│  │ PrismaModule │  │  RedisModule   │  │
│  │  GET /health│  │  (Global)    │  │  (Global)      │  │
│  └─────────────┘  └──────┬───────┘  └───────┬────────┘  │
│                          │                   │           │
│  ┌───────────────────────▼───────────────────▼────────┐  │
│  │          GlobalExceptionFilter + LoggingInterceptor│  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────┬──────────────────────┬─────────────┘
                      │                      │
          ┌───────────▼──────┐    ┌──────────▼──────────┐
          │  PostgreSQL 16   │    │      Redis 7         │
          │  (Prisma ORM)    │    │  (ioredis / BullMQ) │
          └──────────────────┘    └─────────────────────┘
```

### Request Lifecycle

```
Incoming Request
      │
      ▼
 [Fastify Router]
      │
      ▼
 [LoggingInterceptor] ← records start time
      │
      ▼
 [Controller] → [Service] → [Prisma / Redis]
      │
      ▼
 [LoggingInterceptor] → logs method + URL + duration
      │
      ▼  (on error)
 [GlobalExceptionFilter] → normalises error JSON
      │
      ▼
 JSON Response
```

---

## Project Structure

```
intern-tracker-ai/                ← Monorepo root (Yarn Workspaces)
│
├── apps/
│   ├── api/                      ← NestJS Backend
│   │   ├── prisma/
│   │   │   └── schema.prisma     ← Prisma schema (Phase 0: no tables)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── configuration.ts   ← Centralised env-var factory
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   └── interceptors/
│   │   │   │       └── logging.interceptor.ts
│   │   │   ├── health/
│   │   │   │   ├── health.controller.ts
│   │   │   │   ├── health.module.ts
│   │   │   │   └── health.service.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── redis/
│   │   │   │   ├── redis.module.ts
│   │   │   │   └── redis.service.ts
│   │   │   ├── app.module.ts     ← Root module
│   │   │   └── main.ts           ← Application entrypoint
│   │   ├── .env                  ← Local dev env (not committed)
│   │   ├── Dockerfile            ← Production multi-stage build
│   │   ├── Dockerfile.dev        ← Development hot-reload build
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                   ← React Native / Expo App
│       ├── src/
│       │   ├── screens/
│       │   │   └── WelcomeScreen.tsx
│       │   └── theme/
│       │       └── index.ts       ← Design tokens
│       ├── App.tsx               ← App root
│       ├── app.json              ← Expo configuration
│       ├── babel.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                     ← Shared packages (future: types, utils)
│
├── .commitlintrc.js              ← Conventional Commits enforcement
├── .dockerignore
├── .env.example                  ← Environment variable template
├── .eslintrc.js                  ← Shared ESLint rules
├── .gitignore
├── .prettierrc                   ← Prettier formatting
├── docker-compose.yml            ← Local dev (DB + Redis + API)
├── docker-compose.prod.yml       ← Production overrides
├── lint-staged.config.js
├── package.json                  ← Workspace root
├── README.md
└── tsconfig.base.json            ← Strict TS base config
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20.0.0 | [nodejs.org](https://nodejs.org) |
| Yarn | ≥ 1.22 | `npm install -g yarn` |
| Docker | ≥ 24.0 | [docker.com](https://www.docker.com) |
| Docker Compose | ≥ 2.20 | Included with Docker Desktop |
| Expo CLI | ≥ 0.18 | `npm install -g expo-cli` (optional) |

---

## Quick Start — Docker (Recommended)

The fastest way to get everything running:

```bash
# 1. Clone and navigate
git clone <repo-url> intern-tracker-ai
cd intern-tracker-ai

# 2. Copy the API env file (defaults work out-of-the-box with Docker)
cp .env.example apps/api/.env

# 3. Start the entire stack (PostgreSQL + Redis + API)
docker compose up

# 4. Verify the health endpoint
curl http://localhost:3000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12.34,
  "components": {
    "api":      { "status": "ok" },
    "database": { "status": "ok", "latencyMs": 2 },
    "redis":    { "status": "ok", "latencyMs": 1 }
  }
}
```

### Useful Docker Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f postgres

# Stop and wipe all data
docker compose down -v

# Rebuild the API image after package.json changes
docker compose build api

# Run Prisma migrations (once business tables are added)
docker compose exec api npx prisma migrate dev
```

---

## Quick Start — Local Development

Running the services locally (PostgreSQL and Redis must be available):

### 1. Install dependencies

```bash
yarn install
```

### 2. Start infrastructure

```bash
# Start only DB and Redis via Docker, run API locally
docker compose up postgres redis -d
```

### 3. Configure environment

```bash
cp .env.example apps/api/.env
# Edit apps/api/.env with your local credentials if needed
```

### 4. Generate Prisma client

```bash
yarn api prisma:generate
```

### 5. Start the API

```bash
yarn api start:dev
```

### 6. Start the Mobile App

```bash
# Install Expo Go on your phone first
yarn mobile start

# Then scan the QR code with Expo Go (iOS) or the Camera app (Android)
```

---

## API Reference

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Reports API, database, and Redis health |

### GET /api/v1/health

**Response schema:**

```typescript
{
  status: "ok" | "degraded";
  timestamp: string;           // ISO 8601
  uptime: number;              // seconds since process start
  components: {
    api:      { status: "ok" | "down" };
    database: { status: "ok" | "down"; latencyMs: number };
    redis:    { status: "ok" | "down"; latencyMs: number };
  };
}
```

**HTTP status codes:**
- `200` — status is `"ok"` or `"degraded"` (still serving)

---

## Environment Variables

Copy `.env.example` to `apps/api/.env` and adjust values:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `APP_PORT` | `3000` | Port the API listens on |
| `APP_NAME` | `InternTrackerAPI` | Application name in logs |
| `API_PREFIX` | `api/v1` | Global API route prefix |
| `POSTGRES_HOST` | `localhost` | PostgreSQL hostname |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `intern_user` | Database user |
| `POSTGRES_PASSWORD` | — | **Required** — set a strong password |
| `POSTGRES_DB` | `intern_tracker_db` | Database name |
| `DATABASE_URL` | — | Full Prisma connection string |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis AUTH password (leave empty if none) |
| `LOG_LEVEL` | `info` | Pino log level (`fatal`/`error`/`warn`/`info`/`debug`/`trace`) |
| `LOG_PRETTY` | `true` | Pretty-print logs in development |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed CORS origins |

> **Security**: Never commit `apps/api/.env` to version control. The `.gitignore` already excludes it.

---

## Tooling & Code Quality

### Linting

```bash
yarn lint          # Check all TypeScript files
yarn lint:fix      # Auto-fix fixable issues
```

### Formatting

```bash
yarn format        # Format all files
yarn format:check  # Check without writing
```

### Type Checking

```bash
yarn typecheck     # Run tsc --noEmit across all packages
```

### Git Hooks (Husky)

Hooks are installed automatically after `yarn install` (via the `prepare` script):

| Hook | Action |
|---|---|
| `pre-commit` | Runs lint-staged (ESLint + Prettier on staged files) |
| `commit-msg` | Validates commit message against Conventional Commits |

### Commit Message Format

```
<type>(<scope>): <subject>

Examples:
  feat(api): add JWT authentication middleware
  fix(health): handle Redis timeout gracefully
  chore(deps): upgrade NestJS to v11
  docs: update setup instructions
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

---

## Architectural Decisions

### ADR-001: Yarn Workspaces Monorepo
**Decision**: Single repository for API and mobile app.  
**Rationale**: Shared TypeScript types, consistent tooling, atomic cross-package commits, simplified CI.

### ADR-002: NestJS + Fastify (not Express)
**Decision**: `@nestjs/platform-fastify` instead of the default Express adapter.  
**Rationale**: Fastify benchmarks 20-30% higher throughput. Schema serialisation support will be valuable for input validation in Phase 1.

### ADR-003: Centralised Configuration Factory
**Decision**: All `process.env` reads happen in `configuration.ts` only.  
**Rationale**: Typed configuration, single place to audit env-var usage, fail-fast on misconfiguration.

### ADR-004: Global PrismaModule and RedisModule
**Decision**: Both infrastructure modules are `@Global()`.  
**Rationale**: Database and cache clients are true application-wide singletons. Global modules prevent repeated imports in feature modules while keeping the DI graph clean.

### ADR-005: Independent Health Checks (Promise.allSettled)
**Decision**: DB and Redis checks run concurrently and independently.  
**Rationale**: A failing DB check must not hide Redis status and vice versa. `Promise.allSettled` guarantees both results are always reported.

### ADR-006: Non-Root Docker User
**Decision**: Production Docker image runs as `nestjs:nodejs` (UID 1001).  
**Rationale**: Security best practice — container compromise gives attacker non-root access only.

### ADR-007: Structured Logging (Pino)
**Decision**: `nestjs-pino` replaces NestJS's default `ConsoleLogger`.  
**Rationale**: JSON-structured logs are machine-parseable by log aggregators (Datadog, CloudWatch, Loki). Pino is the fastest Node.js logger.

### ADR-008: UUID Primary Keys (Future Tables)
**Decision**: Business entities will use `String @db.Uuid @default(dbgenerated("gen_random_uuid()"))`.  
**Rationale**: UUIDs avoid sequential ID enumeration attacks, support multi-region data generation, and are portable across databases.

---

## 🔔 Phase 6 — Notification Intelligence Engine

Implements a scalable, intelligent notification delivery platform that integrates with the Phase 5 Recommendation Engine.

### Notification API Endpoints

All endpoints are prefixed with `/api/v1`. JWT Bearer token required.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | Paginated list of user's notifications |
| `GET` | `/notifications/:id` | Single notification with delivery events |
| `PATCH` | `/notifications/read` | Bulk mark as read |
| `GET` | `/notifications/history` | Delivery history with attempt details |
| `POST` | `/notifications/test` | Send a test notification |
| `GET` | `/preferences/notifications` | Get notification preferences |
| `PATCH` | `/preferences/notifications` | Update notification preferences |

### Decision Engine Guards

Every recommendation passes through 7 guards before delivery:

1. **Channel Enabled?** — User has at least one notification channel active
2. **Score Threshold?** — Match score ≥ 50 (digest min) to proceed
3. **Duplicate Check?** — Not notified for same job in last 7 days (Redis TTL)
4. **Not Dismissed?** — Recommendation not marked as dismissed
5. **Quiet Hours?** — Push/SMS suppressed during configured quiet window; rescheduled for after
6. **Frequency Limit?** — Within daily total and instant alert limits (downgrades to digest)
7. **Channel Filter?** — Final channel list filtered by user preferences

### Score → Channel Routing

| Match Score | Delivery Mode |
|---|---|
| ≥ 90 | Instant Push **+** Email |
| 80–89 | Instant Push only |
| 70–79 | Instant Email only |
| 50–69 | Daily Digest |
| < 50 | Skip |

### Digest Schedule

| Digest | Schedule |
|---|---|
| Daily | Mon–Fri, 17:00 (server time) |
| Weekly | Sunday, 18:00 (server time) |

### Queue Architecture

```
notification-queue   → main fan-out router
email-queue          → EmailProcessor (SendGrid SMTP)
push-queue           → PushProcessor (FCM v1 REST)
sms-queue            → SmsProcessor (Twilio — feature-flagged OFF)
digest-queue         → DigestProcessor (aggregated HTML email)
dead-letter-queue    → Failed jobs after max retries
```

### New Environment Variables (Phase 6)

| Variable | Default | Description |
|---|---|---|
| `SENDGRID_API_KEY` | — | SendGrid API key (or any SMTP) |
| `FCM_PROJECT_ID` | — | Firebase project ID |
| `FCM_PRIVATE_KEY` | — | Firebase service account private key |
| `FCM_CLIENT_EMAIL` | — | Firebase service account email |
| `TWILIO_ENABLED` | `false` | Enable SMS via Twilio |
| `NOTIF_THRESHOLD_INSTANT_PUSH_EMAIL` | `90` | Score for Push + Email |
| `NOTIF_THRESHOLD_PUSH_ONLY` | `80` | Score for Push only |
| `NOTIF_THRESHOLD_EMAIL_ONLY` | `70` | Score for Email only |
| `NOTIF_THRESHOLD_DIGEST_ONLY` | `50` | Score for Digest |
| `NOTIF_MAX_PER_DAY` | `10` | Global daily notification limit |
| `NOTIF_MAX_INSTANT_PER_DAY` | `5` | Global instant alert limit |
| `NOTIF_MAX_RETRIES` | `3` | Max delivery retry attempts |

---

## Roadmap

| Phase | Description |
|---|---|
| ✅ **Phase 0** | Foundation — monorepo, infra, health endpoint, logging |
| ✅ **Phase 1** | Authentication — JWT + refresh tokens, user model |
| ✅ **Phase 2** | Core Profiles & Onboarding — Profile, Skills, Resume, Preferences |
| ✅ **Phase 3** | Company Intelligence & Tracking |
| ✅ **Phase 4** | Internship Collection Engine (BullMQ scrapers) |
| ✅ **Phase 5** | AI Matching & Recommendation Engine |
| ✅ **Phase 6** | Notification Intelligence Engine (Email/Push/SMS/Digest) |
| Phase 7 | Analytics Dashboard & Reporting |

---

<div align="center">

Made with ♥ by the InternTracker AI team

</div>
