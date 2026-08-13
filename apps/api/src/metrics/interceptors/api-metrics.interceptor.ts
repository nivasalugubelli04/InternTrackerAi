import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Histogram, Counter } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ApiMetricsInterceptor implements NestInterceptor {
  private requestLatency: Histogram<string>;
  private errorCount: Counter<string>;

  constructor() {
    this.requestLatency = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });

    this.errorCount = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'error_type'],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = process.hrtime();

    // Normalize route to avoid high cardinality (e.g. /users/:id instead of /users/123)
    const route = req.route ? req.route.path : req.url.split('?')[0];

    return next.handle().pipe(
      tap({
        next: () => {
          const diff = process.hrtime(start);
          const time = diff[0] + diff[1] / 1e9;
          this.requestLatency.labels(req.method, route, res.statusCode.toString()).observe(time);
        },
        error: (err) => {
          const diff = process.hrtime(start);
          const time = diff[0] + diff[1] / 1e9;
          const status = err.status || 500;
          this.requestLatency.labels(req.method, route, status.toString()).observe(time);
          this.errorCount.labels(req.method, route, err.name || 'Unknown').inc();
        },
      }),
    );
  }
}
