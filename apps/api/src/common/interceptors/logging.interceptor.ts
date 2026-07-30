import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Request/Response logging interceptor.
 *
 * Architectural Decision:
 *  - Logs are emitted at INFO level for successful requests and WARN
 *    for slow requests (>1000 ms). This avoids log spam while still
 *    surfacing performance regressions.
 *  - We log method, path, status, and duration — the minimum required
 *    for operational observability without leaking sensitive payloads.
 */
const SLOW_REQUEST_THRESHOLD_MS = 1000;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const logFn = duration > SLOW_REQUEST_THRESHOLD_MS ? 'warn' : 'log';
          this.logger[logFn](
            { method, url, duration, slow: duration > SLOW_REQUEST_THRESHOLD_MS },
            `${method} ${url} — ${duration}ms`,
          );
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.logger.error({ method, url, duration }, `${method} ${url} — ${duration}ms (error)`);
        },
      }),
    );
  }
}
