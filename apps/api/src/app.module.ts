import { randomUUID } from 'crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BillingModule } from './billing/billing.module';
import { CareerCenterModule } from './career-center/career-center.module';
import { CareerIntelligenceModule } from './career-intelligence/career-intelligence.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { CompaniesModule } from './companies/companies.module';
import { CompanyTrackModule } from './company-track/company-track.module';
import configuration from './config/configuration';
import type { AppConfig } from './config/configuration';
import { CopilotModule } from './copilot/copilot.module';
import { EngagementModule } from './engagement/engagement.module';
import { ExecutionModule } from './execution/execution.module';
import { ExtensionModule } from './extension/extension.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GrowthModule } from './growth/growth.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InterviewsModule } from './interviews/interviews.module';
import { JobsModule } from './jobs/jobs.module';
import { LearningModule } from './learning/learning.module';
import { MarketModule } from './market/market.module';
import { MatchingModule } from './matching/matching.module';
import { ApiMetricsInterceptor } from './metrics/interceptors/api-metrics.interceptor';
import { MetricsModule } from './metrics/metrics.module';
import { NetworkingModule } from './networking/networking.module';
import { NlpModule } from './nlp/nlp.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { OptimizationModule } from './optimization/optimization.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { OutcomesModule } from './outcomes/outcomes.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PreferencesModule } from './preferences/preferences.module';
import { PreparationModule } from './preparation/preparation.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ProfileModule } from './profile/profile.module';
import { QueuesModule } from './queues/queues.module';
import { RecruiterModule } from './recruiter/recruiter.module';
import { RedisModule } from './redis/redis.module';
import { ResearchModule } from './research/research.module';
import { ResumeModule } from './resume/resume.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { ResumeStudioModule } from './resume-studio/resume-studio.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { SimulationModule } from './simulation/simulation.module';
import { SkillsModule } from './skills/skills.module';
// Phase 24 — Career Outcomes, Placement Intelligence & Workforce Analytics
// Phase 26 — Personalized Learning & Roadmaps
// Phase 28 — Career Command Center
// Phase 29 — SRE Operations & Monitoring
import { SystemModule } from './system/system.module';
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
    MarketModule,
    // Phase 20
    ResumeStudioModule,
    PortfolioModule,
    ExtensionModule,
    // Phase 22 — Recruiter Portal
    RecruiterModule,
    PrivacyModule,
    // Phase 24 — Career Outcomes, Placement Intelligence & Workforce Analytics
    OutcomesModule,
    // Phase 42 — Networking & Referrals
    NetworkingModule,
    // Phase 43 — Advanced Career Intelligence
    CareerIntelligenceModule,
    // Phase 44 — External Integrations & Data Ecosystem
    IntegrationsModule,
    // Phase 45 — AI Career Execution Engine
    ExecutionModule,
    // Phase 46 — Career Simulation & Opportunity Forecasting Engine
    SimulationModule,
    // Phase 47 — Autonomous Career Research & Opportunity Intelligence
    ResearchModule,
    // Phase 48 — Personal AI Career Copilot & Unified AI Orchestration
    CopilotModule,
    // Phase 49 — Autonomous Career Optimization & Continuous Learning
    OptimizationModule,
    // Phase 26 — Adaptive Learning & Roadmaps
    LearningModule,
    // Phase 28 — Career Command Center
    CareerCenterModule,
    // Phase 29 — SRE Operations & Monitoring
    SystemModule,
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
