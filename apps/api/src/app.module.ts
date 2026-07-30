import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

/**
 * AppModule — root module of the InternTracker API.
 *
 * Architectural Decision:
 *  - ConfigModule is loaded globally (isGlobal: true) and marked as
 *    expandVariables: true so that .env references like ${VAR} work.
 *  - LoggerModule (nestjs-pino) is configured at the root level so that
 *    every NestJS logger instance produces structured JSON automatically.
 *    In development, pino-pretty provides human-readable output.
 *  - Infrastructure modules (PrismaModule, RedisModule) are imported here
 *    and marked @Global inside their own files so they don't need to be
 *    imported in feature modules.
 */
@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      expandVariables: true,
      envFilePath: ['.env'],
      cache: true,
    }),

    // ── Logging ─────────────────────────────────────────────────────────────
    LoggerModule.forRootAsync({
      useFactory: () => {
        const usePretty = process.env['LOG_PRETTY'] === 'true';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pinoHttp: Record<string, any> = {
          level: process.env['LOG_LEVEL'] ?? 'info',
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie'],
            remove: true,
          },
        };
        if (usePretty) {
          pinoHttp['transport'] = {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: false },
          };
        }
        return { pinoHttp };
      },
    }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Features ────────────────────────────────────────────────────────────
    HealthModule,
  ],
})
export class AppModule {}
