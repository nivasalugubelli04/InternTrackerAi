# Production Runbook

This document contains standard operating procedures for managing the InternTracker AI production environment.

## Managing Services

### Start/Stop/Restart API
If running via ECS:
- **Restart**: `aws ecs update-service --cluster interntracker-prod --service api-service --force-new-deployment`

If running via Docker Compose (Single Node):
- **Start**: `docker-compose -f docker-compose.prod.yml up -d`
- **Stop**: `docker-compose -f docker-compose.prod.yml down`
- **Restart**: `docker-compose -f docker-compose.prod.yml restart api`

### Restart Workers
Workers handle scraping and notifications. If queues are stuck:
- `docker-compose -f docker-compose.prod.yml restart worker`

## Health Checks

### Check System Health
- `curl -f http://api.domain.com/health/ready`
Should return `{"status":"ok","details":{"database":{"status":"up"},"redis":{"status":"up"}}}`

### Check Database Health
- Log into PostgreSQL and check active connections:
  `SELECT count(*) FROM pg_stat_activity;`
- Or view `/metrics` for `prisma_client_queries_active`.

### Check Queues (BullMQ)
- Use the `/metrics` endpoint to monitor `bullmq_queue_waiting` and `bullmq_queue_failed`.
- If `failed` is growing rapidly, check worker logs for exceptions.

### Check Scraper Health
- Query the `ScrapeJob` table in the Admin Dashboard or database.
- If a scraper is continuously failing, verify if the target site's DOM has changed.

### Check AI Health
- Monitor the `ai_cost_usd_total` metric. If it spikes unexpectedly, verify the logs for anomalous usage.
- If AI requests are timing out, check the OpenAI/Gemini status page.

## Emergency Shutdown
If a critical security breach is detected or a catastrophic database corruption occurs:
1. Scale the API ECS service to 0 tasks.
2. Terminate all Worker containers.
3. Restrict database security groups to prevent external access.
