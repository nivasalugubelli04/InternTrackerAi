<div align="center">

# 🎯 InternTracker AI

### Mobile-First Internship Monitoring Platform

[![Phase](https://img.shields.io/badge/Phase-0%20%E2%80%93%20Foundation-7c3aed?style=for-the-badge)]()
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

This repository contains **Phase 0** — the production-ready foundation:

| Layer | Technology | Purpose |
|---|---|---|
| Mobile | React Native (Expo 51) | iOS & Android app |
| API | NestJS 10 + Fastify | REST backend |
| Database | PostgreSQL 16 + Prisma | Relational data store |
| Cache / Queue | Redis 7 + BullMQ | Caching & background jobs |
| Containerisation | Docker + Compose | Local & production environments |

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

## Roadmap

| Phase | Description |
|---|---|
| ✅ **Phase 0** | Foundation — monorepo, infra, health endpoint, logging |
| 🔜 Phase 1 | Authentication — JWT + refresh tokens, user model |
| Phase 2 | Core entities — Intern, Company, Application models |
| Phase 3 | AI Matching — embedding-based recommendation engine |
| Phase 4 | Notifications — push notifications, email (BullMQ) |
| Phase 5 | Analytics — dashboard, reporting, data export |

---

<div align="center">

Made with ♥ by the InternTracker AI team

</div>
