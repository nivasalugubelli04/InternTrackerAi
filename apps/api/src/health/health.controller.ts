import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { HealthService } from './health.service';
import type { HealthReport } from './health.service';

/**
 * HealthController — GET /api/v1/health
 *
 * Returns the health status of the API and its infrastructure dependencies.
 * This endpoint is intentionally unauthenticated so that load balancers,
 * Kubernetes liveness/readiness probes, and monitoring tools can reach it
 * without credentials.
 *
 * HTTP status codes:
 *  - 200  status === "ok"
 *  - 200  status === "degraded"  (still serving, but monitor closely)
 *
 * Response shape:
 * {
 *   "status": "ok" | "degraded",
 *   "timestamp": "<ISO8601>",
 *   "uptime": <seconds>,
 *   "components": {
 *     "api":      { "status": "ok" },
 *     "database": { "status": "ok", "latencyMs": 2 },
 *     "redis":    { "status": "ok", "latencyMs": 1 }
 *   }
 * }
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<HealthReport> {
    return this.healthService.getHealth();
  }
}
