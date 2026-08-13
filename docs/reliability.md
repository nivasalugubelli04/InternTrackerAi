# Reliability Guide

## BullMQ Resilience
- Jobs use exponential backoff to handle transient upstream failures (e.g., API limits, temporary network issues).
- Critical scheduled jobs and manual triggers use deterministic `jobId` hashes (e.g. `scrape-{id}-{date}`) to guarantee idempotency.
- Failing jobs that exhaust retries are captured by `DeadLetterListener` (DLQ) in `queues.module.ts` for monitoring and later re-processing.

## Error Handling
- A global `GlobalExceptionFilter` guarantees consistent JSON envelopes and ensures stack traces and internal logic details are stripped in production to prevent information disclosure.
