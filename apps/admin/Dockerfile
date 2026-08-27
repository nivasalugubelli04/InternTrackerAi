# =============================================================================
# InternTracker AI – Admin Dashboard Production Dockerfile
#
# Build stages:
#   1. builder  – install dependencies and build static assets
#   2. runner   – minimal NGINX image to serve static files
#
# Architectural Decision:
#   - NGINX is used to serve the Vite SPA efficiently and handle client-side
#     routing (SPA fallback to index.html).
#   - Multi-stage build ensures source code and node_modules are NOT in the
#     final production image.
# =============================================================================

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root configurations (if using workspaces, package.json from root is needed)
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/

# Install dependencies (workspaces support)
RUN npm install --ignore-scripts

# Copy source files
COPY apps/admin ./apps/admin

# Build the admin application
WORKDIR /app/apps/admin
RUN npm run build

# ── Stage 2: Runner (NGINX) ──────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy compiled assets from builder
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Provide a custom NGINX configuration for SPA routing
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
