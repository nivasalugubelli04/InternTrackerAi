import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Global HTTP exception filter.
 *
 * Architectural Decision:
 *  - All unhandled errors are normalised into a consistent JSON envelope:
 *    { statusCode, message, error, timestamp, path }
 *  - Unknown errors (non-HttpException) are mapped to 500 and their
 *    internal details are NOT exposed to clients (security-first).
 *  - The Logger call ensures every error appears in structured logs
 *    with the request path for easy tracing.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;
        message = (body['message'] as string | string[]) ?? exception.message;
        error = (body['error'] as string) ?? exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else {
      // Unknown / unhandled error — log full details server-side, hide from client
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'InternalServerError';

      this.logger.error(
        {
          err: exception,
          path: request.url,
          method: request.method,
        },
        'Unhandled exception',
      );
    }

    const responsePayload = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(
      { statusCode, path: request.url, method: request.method },
      `HTTP ${statusCode}`,
    );

    void reply.status(statusCode).send(responsePayload);
  }
}
