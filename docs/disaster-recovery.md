# Disaster Recovery

## Database Failure
If the primary RDS PostgreSQL instance fails:
1. Multi-AZ (if enabled) will automatically failover in ~60-120 seconds.
2. If the entire cluster is lost, follow the PITR restore procedure in `database-backups.md`.

## Redis Failure
If ElastiCache Redis fails:
1. All background jobs in BullMQ will pause.
2. Multi-AZ (if enabled) will auto-failover.
3. Cache misses will occur, resulting in higher DB load. Monitor DB connections.

## Queue / Worker Failure
If scraper or notification workers fail:
1. BullMQ handles automatic retries with exponential backoff (configured in `queues.module.ts`).
2. If jobs repeatedly fail, they are sent to the Dead Letter Queue (DLQ).
3. The Admin Dashboard (Bull Board) can be used to manually inspect and retry DLQ jobs.

## LLM Provider Failure (Gemini/OpenAI)
If the AI provider is down or rate-limiting heavily:
1. `AiController` endpoints will return 503 or 429.
2. Fallback: Administrators can toggle off AI features via the Admin Dashboard feature flags.
