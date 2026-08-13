# Docker Architecture

InternTracker AI utilizes Docker for consistent execution environments from development to production.

## Images

### 1. API Image (`apps/api/Dockerfile`)
The API image is a multi-stage build:
- **Deps Stage**: Installs production-only dependencies.
- **Builder Stage**: Compiles TypeScript and generates Prisma client.
- **Runner Stage**: Uses `node:20-alpine` (minimal image), copies over only required files, runs as a non-root `nestjs` user for security, and sets `NODE_ENV=production`.
- **Health Check**: Configured to ping `/api/v1/health` at regular intervals.

### 2. Admin Image (`apps/admin/Dockerfile`)
The Admin image also uses a multi-stage build:
- **Builder Stage**: Uses Vite to compile React assets into static files.
- **Runner Stage**: Uses `nginx:alpine` to serve static assets efficiently with appropriate caching headers, falling back to `index.html` for client-side routing.

## Build Optimization
- `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.env`, and other non-essential files, significantly reducing the build context size.
- Multi-stage builds ensure intermediate build tools do not end up in the final image, reducing image size and the attack surface.

## Running Locally

**Development Mode**:
```bash
docker compose up
```

**Production Mode (Local)**:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -build
```
