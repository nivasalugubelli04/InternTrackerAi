import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { AppConfig } from './config/configuration';

/**
 * Bootstrap the NestJS application.
 *
 * Architectural Decisions:
 *  - Fastify is chosen over Express for its superior throughput and
 *    first-class schema validation support (useful for future OpenAPI
 *    integration with Zod/class-validator).
 *  - setGlobalPrefix pins all routes under /api/v1, making future API
 *    versioning a non-breaking change (introduce /api/v2 alongside).
 *  - CORS origins are read from config to allow per-environment
 *    customisation without code changes.
 *  - The Pino logger replaces NestJS's default logger to ensure every
 *    log line is structured JSON in production.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  // ── Structured logging ────────────────────────────────────────────────────
  const logger = app.get(Logger);
  app.useLogger(logger);

  // ── Config ────────────────────────────────────────────────────────────────
  const configService = app.get(ConfigService<AppConfig, true>);
  const appConfig = configService.get('app', { infer: true });
  const corsConfig = configService.get('cors', { infer: true });

  // ── API versioning ────────────────────────────────────────────────────────
  app.setGlobalPrefix(appConfig.prefix);

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsConfig.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Global filters & interceptors ─────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── Shutdown hooks ────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(appConfig.port, '0.0.0.0');

  logger.log(`🚀 ${appConfig.name} running on port ${appConfig.port}`, 'Bootstrap');
  logger.log(`📡 API prefix: /${appConfig.prefix}`, 'Bootstrap');
  logger.log(`🌍 Environment: ${appConfig.nodeEnv}`, 'Bootstrap');
}

void bootstrap();
