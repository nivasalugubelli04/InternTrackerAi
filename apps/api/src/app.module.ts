import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import configuration from './config/configuration';
import type { AppConfig } from './config/configuration';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

/**
 * AppModule — root module of the InternTracker API.
 *
 * Phase 1 additions:
 *  - ThrottlerModule provides global rate limiting.
 *  - APP_GUARD binds JwtAuthGuard globally — all routes require auth by
 *    default; use @Public() decorator to opt out.
 *  - APP_GUARD also binds ThrottlerGuard globally for rate limiting.
 *  - AuthModule contains the full authentication feature set.
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

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        throttlers: [
          {
            ttl: configService.get('throttle', { infer: true }).ttl,
            limit: configService.get('throttle', { infer: true }).limit,
          },
        ],
      }),
    }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Features ────────────────────────────────────────────────────────────
    HealthModule,
    AuthModule,
  ],
  providers: [
    // Global JWT guard — secure by default, use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
