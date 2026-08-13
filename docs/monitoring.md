# Monitoring & Alerting

InternTracker AI utilizes structured logging (`nestjs-pino`) and relies on Prometheus (`@willsoto/nestjs-prometheus`) for telemetry collection. A `/metrics` endpoint is exposed for Prometheus scraping, which is then typically visualized in Grafana.

## Available Metrics

The `/metrics` endpoint exposes:
- **API Metrics**: `http_request_duration_seconds`, `http_request_errors_total`
- **Database Metrics**: `prisma_client_queries_active`, `prisma_client_connections_idle`, `prisma_client_queries_wait`
- **Queue Metrics**: `bullmq_queue_waiting`, `bullmq_queue_active`, `bullmq_queue_completed`, `bullmq_queue_failed`
- **AI Metrics**: `ai_cost_usd_total`, `ai_tokens_total`, `ai_request_duration_seconds`

## Alerting Rules

You should configure the following CloudWatch Alarms:

1. **API Error Spikes (5xx)**
   - **Metric**: HTTP 5xx errors on Load Balancer or API Gateway.
   - **Threshold**: > 1% error rate over 5 minutes.
   - **Action**: Page On-Call.

2. **High Latency (p95)**
   - **Metric**: API response time.
   - **Threshold**: > 1000ms for p95 over 5 minutes.
   - **Action**: Alert Development Team.

3. **Database Availability / CPU**
   - **Metric**: RDS CPUUtilization or DatabaseConnections.
   - **Threshold**: CPU > 85% for 10 minutes OR Connections > 80% of max.
   - **Action**: Page On-Call / Trigger Auto-Scaling (if Aurora).

4. **Queue Backlog (BullMQ)**
   - **Metric**: Custom metric tracking pending jobs in Redis.
   - **Threshold**: > 5000 pending jobs for 15 minutes.
   - **Action**: Alert Development Team.

5. **Scraper Failure Spike**
   - **Metric**: Logs containing `"Scrape adapter timeout"` or `ScrapeJobStatus.FAILED`.
   - **Threshold**: > 10 occurrences in 15 minutes.
   - **Action**: Alert Data Engineering Team.

6. **AI Cost/Token Spikes**
   - **Metric**: Logs containing token counts or billing threshold alarms from AWS/GCP.
   - **Threshold**: > $50 spend per hour.
   - **Action**: Alert Product Team.
