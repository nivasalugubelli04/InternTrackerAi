# Disaster Recovery Plan

This document outlines the disaster recovery procedures for InternTracker AI.

## RPO & RTO Objectives
- **RPO (Recovery Point Objective)**: 5 Minutes (Database), 0 Minutes (Redis/Ephemeral)
- **RTO (Recovery Time Objective)**: 15 Minutes (API), 30 Minutes (Database Restore)

## Scenarios

### 1. Database Failure (PostgreSQL)
- **Detection**: CloudWatch alarms for `DatabaseConnections` or `/metrics` indicating high `prisma_client_queries_wait`. API returns 500s.
- **Immediate Action**: Ensure automated Multi-AZ failover is triggered by AWS RDS.
- **Recovery**: If the primary cluster is corrupted, trigger Point-In-Time-Recovery (PITR) to a snapshot 5 minutes prior to the event.
- **Validation**: Verify `/health/ready` endpoint returns `HEALTHY` and user authentication is functional.
- **Escalation**: Data Engineering Team, DevOps Lead.

### 2. Redis Failure (ElastiCache)
- **Detection**: API timeouts, Background Jobs (BullMQ) stop processing. `bullmq_queue_active` metric drops to 0.
- **Immediate Action**: Reboot primary node. ElastiCache should promote the replica automatically.
- **Recovery**: If the cluster is destroyed, recreate it via Terraform. No persistent data is strictly required as Redis only holds ephemeral job state and caches.
- **Validation**: Verify `/health/ready` endpoint.

### 3. API or Worker Failure (ECS/Containers)
- **Detection**: Target Group 5xx errors > 1%. Health check failures.
- **Immediate Action**: ECS Auto-Scaling replaces unhealthy tasks automatically.
- **Recovery**: If crash-looping, revert to the previous Docker image tag via ECS redeployment (see `rollback.md`).
- **Validation**: Monitor HTTP 200 rates on the load balancer.

### 4. Scraper Failure / Unreliable Target
- **Detection**: Repeated `ScrapeJobStatus.FAILED` logs or high `bullmq_queue_failed` count.
- **Immediate Action**: The system's exponential backoff and circuit breaker isolate the failure.
- **Recovery**: Disable the specific company scraper in the Admin Dashboard until the adapter is updated.

### 5. AI Provider Outage (OpenAI/Gemini)
- **Detection**: High `ai_request_duration_seconds` or 5xx responses from the AI provider.
- **Immediate Action**: The Throttler and Timeout interceptors will fail the requests gracefully.
- **Recovery**: If prolonged, switch the `AI_PROVIDER` environment variable to a fallback provider (e.g., from `gpt-4o` to `gemini-1.5-pro`) and restart the API.
- **Validation**: Execute a test "Resume Analysis" to confirm completion.
