import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { AppConfig } from './config/configuration';

/**
 * Bootstrap the NestJS application.
 *
 * Phase 1 additions:
 *  - Global ValidationPipe with whitelist + forbidNonWhitelisted enforces
 *    strict DTO validation — unknown fields are rejected at the network edge.
 *  - Swagger/OpenAPI docs at /api/v1/docs with Bearer auth support.
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

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global filters & interceptors ─────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  if (appConfig.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('InternTracker AI API')
      .setDescription(
        'Production-ready REST API for the InternTracker AI internship monitoring platform.\n\n' +
          '**Authentication:** Use the `/auth/login` endpoint to obtain an access token, then click "Authorize" and enter `Bearer <token>`.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'refresh-token',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Health', 'Infrastructure health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appConfig.prefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(
      `📚 Swagger docs: http://localhost:${appConfig.port}/${appConfig.prefix}/docs`,
      'Bootstrap',
    );
  }

  // ── Shutdown hooks ────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(appConfig.port, '0.0.0.0');

  logger.log(`🚀 ${appConfig.name} running on port ${appConfig.port}`, 'Bootstrap');
  logger.log(`📡 API prefix: /${appConfig.prefix}`, 'Bootstrap');
  logger.log(`🌍 Environment: ${appConfig.nodeEnv}`, 'Bootstrap');
}

void bootstrap();
