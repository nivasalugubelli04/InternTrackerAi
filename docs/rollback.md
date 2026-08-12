# Rollback Procedures

## Backend Rollback
1. Identify the previously stable Docker image tag (e.g., `git-hash-xyz`).
2. Update the ECS Service to deploy the previous task definition revision.
3. ECS will drain the bad containers and spin up the old ones automatically.

## Frontend Rollback
- Update the Admin CDN / S3 bucket to point to the previous build artifact directory.

## Database Migration Rollback
1. If a deployment included a bad Prisma migration, you MUST NOT blindly drop data.
2. Manually connect to the DB and execute the `--down` SQL if provided, OR roll forward with a new migration fixing the issue.
3. Prisma does not support automated down migrations in production. Always write non-destructive migrations.

## Emergency Feature Shutdown
Use the Admin Dashboard -> Feature Flags to instantly disable:
- Scrapers
- AI capabilities
- Push Notifications
