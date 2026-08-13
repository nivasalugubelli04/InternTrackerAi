import { randomUUID } from 'crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { BillingModule } from './billing/billing.module';
import { GrowthModule } from './growth/growth.module';
import { EngagementModule } from './engagement/engagement.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { CompaniesModule } from './companies/companies.module';
import { CompanyTrackModule } from './company-track/company-track.module';
import { FeedbackModule } from './feedback/feedback.module';
import configuration from './config/configuration';
import type { AppConfig } from './config/configuration';
import { HealthModule } from './health/health.module';
import { InterviewsModule } from './interviews/interviews.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { ApiMetricsInterceptor } from './metrics/interceptors/api-metrics.interceptor';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NlpModule } from './nlp/nlp.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { PreparationModule } from './preparation/preparation.module';
import { PreferencesModule } from './preferences/preferences.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';
import { ResumeModule } from './resume/resume.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
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
          genReqId: (req: any) =>
            req.headers['x-request-id'] || req.headers['x-correlation-id'] || randomUUID(),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.passwordConfirm',
              'req.body.token',
              'res.headers["set-cookie"]',
            ],
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
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const throttleConfig = configService.get('throttle', { infer: true });
        const aiLimits = configService.get('ai.rateLimits', { infer: true });
        return {
          throttlers: [
            {
              name: 'default',
              ttl: throttleConfig.default.ttl,
              limit: throttleConfig.default.limit,
            },
            { name: 'login', ttl: throttleConfig.login.ttl, limit: throttleConfig.login.limit },
            {
              name: 'register',
              ttl: throttleConfig.register.ttl,
              limit: throttleConfig.register.limit,
            },
            {
              name: 'forgot_password',
              ttl: throttleConfig.forgotPassword.ttl,
              limit: throttleConfig.forgotPassword.limit,
            },
            { name: 'admin', ttl: throttleConfig.admin.ttl, limit: throttleConfig.admin.limit },
            {
              name: 'scraper',
              ttl: throttleConfig.scraper.ttl,
              limit: throttleConfig.scraper.limit,
            },
            // AI limits
            { name: 'ai_chat', ttl: 3600000, limit: aiLimits.chatPerHour },
            { name: 'ai_resume', ttl: 86400000, limit: aiLimits.resumePerDay },
            { name: 'ai_cover_letter', ttl: 86400000, limit: aiLimits.coverLetterPerDay },
            { name: 'ai_interview', ttl: 86400000, limit: aiLimits.interviewPerDay },
          ],
        };
      },
    }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,
    MetricsModule,

    // ── Features ────────────────────────────────────────────────────────────
    HealthModule,
    AuthModule,
    // Phase 2 — Profile & Onboarding
    ProfileModule,
    SkillsModule,
    ResumeModule,
    ResumeBuilderModule,
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
    NlpModule,
    // Admin
    AdminModule,
    InterviewsModule,
    FeedbackModule,
    PreparationModule,
    BillingModule,
    GrowthModule,
    EngagementModule,
    OrganizationsModule,
    ApplicationsModule,
  ],

  providers: [
    // Global JWT guard — secure by default, use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting guard (custom)
    { provide: APP_GUARD, useClass: RateLimitGuard },
    // Global API metrics interceptor
    { provide: APP_INTERCEPTOR, useClass: ApiMetricsInterceptor },
  ],
})
export class AppModule {}
