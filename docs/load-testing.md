# Load Testing Strategy

InternTracker AI uses **k6** for performance testing, validating that the platform can sustain concurrent users without degrading below target latency metrics (p95 < 500ms).

## K6 Scripts

Load testing scripts are located in `tests/load/load-test.js`. They simulate realistic user flows:
1. Health & Readiness checks
2. Authentication (Login / Register)
3. Opportunity Feed scrolling
4. Search queries

## Running Tests

Since K6 is written in Go, it requires the binary to be installed on your machine or executed via Docker.

**Option 1: Using Docker (Recommended)**
```bash
# From the apps/api directory
npm run test:load
```
*This uses `grafana/k6` docker image to execute the test script.*

**Option 2: Native K6 execution**
If you have `k6` installed locally on your PATH:
```bash
k6 run tests/load/load-test.js
```

## Performance Targets
- **p95 Latency**: < 500ms for most endpoints.
- **Feed / Search**: < 1 second.
- **Error Rate**: < 1% under load.

*Note: Since the local environment does not have `docker` or `k6` binaries, please run these scripts on the CI runner or your local development machine once provisioned.*
