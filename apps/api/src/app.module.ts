import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CompaniesModule } from './companies/companies.module';
import { CompanyTrackModule } from './company-track/company-track.module';
import configuration from './config/configuration';
import type { AppConfig } from './config/configuration';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ApplicationsModule } from './applications/applications.module';
import { AdminModule } from './admin/admin.module';
import { PreferencesModule } from './preferences/preferences.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';
import { ResumeModule } from './resume/resume.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { SkillsModule } from './skills/skills.module';

/**
 * AppModule — root module of the InternTracker API.
 *
 * Phase 1: ThrottlerModule, JwtAuthGuard, ThrottlerGuard, AuthModule.
 * Phase 2: ProfileModule, SkillsModule, ResumeModule, PreferencesModule.
 * Phase 3: CompaniesModule, CompanyTrackModule.
 * Phase 4: ScrapersModule, QueuesModule, JobsModule.
 * Phase 5: MatchingModule (AI Matching Engine).
 * Phase 6: NotificationsModule (Notification Intelligence Engine).
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
    // Phase 2 — Profile & Onboarding
    ProfileModule,
    SkillsModule,
    ResumeModule,
    PreferencesModule,
    CompaniesModule,
    CompanyTrackModule,
    // Phase 4 — Internship Collection Engine
    ScrapersModule,
    QueuesModule,
    JobsModule,
    // Phase 5 — AI Matching Engine
    MatchingModule,
    // Phase 6 — Notification Intelligence Engine
    NotificationsModule,
    // Phase 7 — AI Career Copilot
    AiModule,
    // Phase 8 — Opportunity Feed, Search & Discovery
    OpportunitiesModule,
    // Phase 9 — Application Tracking
    ApplicationsModule,
    // Admin
    AdminModule,
  ],

  providers: [
    // Global JWT guard — secure by default, use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
