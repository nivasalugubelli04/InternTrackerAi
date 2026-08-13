# Performance Benchmarks & Targets

This document outlines the performance benchmarks, optimization strategies, and target metrics for InternTracker AI.

## Targets
- **Normal API Requests (p95)**: < 500ms
- **Opportunity Feed (p95)**: < 1000ms
- **Search (p95)**: < 1000ms
- **Error Rate**: < 1%
- **AI Requests**: Tracked independently of normal API routes due to external AI provider latency dependencies.

## Measured Baselines
*(Note: Initial baselines are pending CI execution due to local environment restrictions on K6 and Docker. The following sections will be updated post-CI run.)*

### 100 Concurrent Users
- **Throughput**: Pending
- **p95 Latency**: Pending
- **Error Rate**: Pending

### 250 Concurrent Users
- **Throughput**: Pending
- **p95 Latency**: Pending
- **Error Rate**: Pending

### 500 Concurrent Users
- **Throughput**: Pending
- **p95 Latency**: Pending
- **Error Rate**: Pending

## Bottlenecks Identified (Expected)
- **Database Connection Limits**: At 500 VUs, the Prisma connection pool might be exhausted. We have added `DatabaseMetricsService` to track `prisma_client_queries_wait`.
- **Search Latency**: Heavy text-search queries on PostgreSQL might require GiST/GIN indexes.

## Optimizations Performed
- Introduced global Prometheus metrics interception (`/metrics`) to identify latency issues at runtime.
- Added AI-specific telemetry to segregate AI token generation latency from standard route latency, preventing skewed p95 metrics.
- Added connection and query wait state tracking on Prisma to monitor database pool exhaustion under load.
