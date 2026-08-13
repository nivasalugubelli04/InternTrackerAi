# Rollback Procedures

This document defines how to safely roll back changes in InternTracker AI across different components.

## Triggers for Rollback
- Critical security vulnerabilities found in production (e.g., via `npm audit`).
- API Error Spikes (5xx > 1%) post-deployment.
- Broken Core User Journeys (Authentication, Search, Feed).
- Deployment timeouts.

## 1. Backend / API Rollback
Since deployments are containerized, rolling back the API or Workers involves reverting to the previous known-good Docker image.

**Procedure:**
1. Identify the previous stable Docker image tag (e.g., `interntracker-api:v1.0.42`).
2. Update the ECS Task Definition or Kubernetes Deployment to use the stable image.
3. Force a redeployment.
4. Verify `/health/ready` returns `HEALTHY`.

## 2. Database Migration Rollback
Rolling back database migrations is dangerous if data has been written using the new schema.

**Procedure:**
1. **If safe (no data loss):** Use `npx prisma migrate resolve --rolled-back "migration_name"` and manually apply the down migration script.
2. **If unsafe (data loss imminent):** Do NOT roll back the database. Roll back the backend code and write an emergency patch to handle the new database schema safely (Feature Flagging).

## 3. Feature Flag Rollback
If a new feature is causing issues but doesn't crash the container, disable it via environment variables or the Admin Dashboard.
- **AI Features**: Set `AI_ENABLED=false` or disable specific sub-features in the DB.
- **Scraping**: Disable unreliable scrapers in the Admin panel.

## 4. Admin Privileges
- **Who can trigger a rollback?**: Any On-Call SRE or DevOps Engineer.
- **Verification**: Rollback success is verified by checking CloudWatch metrics for a return to baseline 200 OK rates and a drop in 5xx errors.
