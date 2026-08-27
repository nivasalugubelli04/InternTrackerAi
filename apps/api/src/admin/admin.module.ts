import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SCRAPE_QUEUE, EMBEDDING_QUEUE } from '../queues/queue.constants';
import { RedisModule } from '../redis/redis.module';
import { SystemModule } from '../system/system.module';

import { AdminBetaController } from './controllers/admin-beta.controller';
import { AdminCompaniesController } from './controllers/admin-companies.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminFeatureFlagsController } from './controllers/admin-feature-flags.controller';
import { AdminLogsController } from './controllers/admin-logs.controller';
import { AdminOperationsController } from './controllers/admin-operations.controller';
import { AdminRecommendationsController } from './controllers/admin-recommendations.controller';
import { AdminRecruiterController } from './controllers/admin-recruiter.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { PermissionGuard } from './guards/permission.guard';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminBetaService } from './services/admin-beta.service';
import { AdminCompaniesService } from './services/admin-companies.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminFeatureFlagsService } from './services/admin-feature-flags.service';
import { AdminNotesService } from './services/admin-notes.service';
import { AdminRecommendationsService } from './services/admin-recommendations.service';
import { AdminUsersService } from './services/admin-users.service';
import { AiOpsService } from './services/ai-ops.service';
import { JobOpsService } from './services/job-ops.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SystemModule,
    AiModule,
    BullModule.registerQueue({ name: SCRAPE_QUEUE }),
    BullModule.registerQueue({ name: EMBEDDING_QUEUE }),
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminCompaniesController,
    AdminLogsController,
    AdminFeatureFlagsController,
    AdminBetaController,
    AdminRecommendationsController,
    AdminRecruiterController,
    AdminOperationsController,
  ],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminUsersService,
    AdminCompaniesService,
    AdminFeatureFlagsService,
    AdminBetaService,
    AdminRecommendationsService,
    AdminNotesService,
    AiOpsService,
    JobOpsService,
    PermissionGuard,
  ],
  exports: [AdminAuditService, AdminNotesService, AiOpsService, JobOpsService, PermissionGuard],
})
export class AdminModule {}
