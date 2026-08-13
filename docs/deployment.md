# Deployment Guide

This document outlines the procedures for deploying InternTracker AI to production.
**WARNING:** Do not include real credentials in this file.

## Prerequisites
- Docker & Docker Compose installed on deployment target.
- Access to the target environment's secrets management (e.g., AWS Secrets Manager).
- CI/CD pipeline access for automated deployments.

## Environment Setup
- Ensure the production environment has sufficient resources (minimum 2 vCPU, 4GB RAM).
- Setup IAM roles and security groups allowing traffic on port 80/443 and restricting DB/Redis ports internally.

## Secrets Setup
- Pull secrets from AWS Secrets Manager or secure vault.
- Ensure `.env.prod` is populated via the CI/CD pipeline using securely stored GitHub Actions secrets.
- Required secrets include `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `SENDGRID_API_KEY`.

## Build
- The CI pipeline (`pr.yml`) automatically lints and typechecks the code.
- Run `npm run build` for both API and Admin apps.

## Docker Images
- Use the multi-stage `Dockerfile` to build the `runner` image.
- Tag images with the specific `<git-hash>`.
- Push images to ECR (Elastic Container Registry).

## Database Migration
- Run `npx prisma migrate deploy` inside a temporary ECS task or CI runner.
- Never run `--down` migrations in production. Ensure migrations are backwards compatible.

## API Deployment
- Update the ECS Task Definition for the API service with the new ECR image tag.
- Trigger an ECS rolling update.

## Worker Deployment
- Workers run in the same container as the API (NestJS BullMQ integration).
- The rolling update for the API will automatically cycle the workers.
- Ensure grace periods allow BullMQ to drain active jobs before termination.

## Admin Deployment
- Admin is built as a static SPA via Vite.
- Upload the `dist/` output to an S3 bucket fronted by CloudFront.
- Invalidate the CloudFront cache.

## Health Validation
- Poll the `/api/v1/health` endpoint until it returns 200 OK.
- Verify `health/live` and `health/ready` endpoints.

## Smoke Testing
- Perform a manual login using a test account.
- Verify the opportunity feed loads.
- Ensure no 500 errors appear in the browser console.

## Monitoring Verification
- Check CloudWatch / Datadog dashboards to ensure metrics are being ingested.
- Verify latency is nominal.

## Rollback
- If health validation fails, execute the rollback procedure (see `docs/rollback.md`).
