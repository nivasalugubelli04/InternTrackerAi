# Queue Architecture

InternTracker AI uses BullMQ and Redis for queueing and background tasks.

## Queues
1. `scrape` - Manages ATS scraping jobs.
2. `parser` - Post-processes scraped data (future abstraction).
3. `cleanup` - Housekeeping tasks.
4. `health` - Heartbeat and system checks.

## Idempotency
- Manual scrape jobs: `jobId: scrape-{id}-{date}`
- Periodic scrape jobs: `jobId: periodic-scrape-{id}-{date}`
- Notifications: `jobId: notify-{id}`

## Dead Letter Queue (DLQ)
When jobs fail after 3 retries, they emit a `failed` event. The `DeadLetterListener` intercepts this and logs the failure details allowing administrators to manually inspect or script an automated replay mechanism.
